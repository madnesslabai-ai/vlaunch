/**
 * Refinement orchestrator.
 *
 * Reads an existing asset from disk, combines it with user/agent feedback,
 * calls an AI provider to produce a revised version, validates the output
 * using the asset's existing parser, and writes only on success.
 *
 * Brand anchors (product name, audience, proof language) are checked after
 * refinement and the output is rejected if anchors were silently dropped
 * without the feedback explicitly requesting the change.
 *
 * The original file is preserved if refinement fails.
 */

import * as path from "path";
import { readFile, writeFile, assetsDir, vlaunchDir } from "../fs";
import { readContext } from "../config";
import { AIProvider } from "./provider";
import { ScanContext } from "../../types";

export interface BrandAnchors {
  productName: string | null;
  audience: string | null;
  proofLanguage: string[];
}

export interface AnchorCheckResult {
  passed: boolean;
  preserved: string[];
  dropped: string[];
}

export interface RefineResult {
  asset: string;
  status: "refined" | "failed";
  reason?: string;
  anchors?: AnchorCheckResult;
}

export interface RefineContract {
  /** Asset identifier for logging and provenance */
  assetName: string;
  /** Filename under .vlaunch/assets/ */
  filename: string;
  /** Build the refinement system prompt */
  systemPrompt: string;
  /** Build the user prompt from context, current asset, and feedback */
  buildUserPrompt(context: ScanContext, currentContent: string, feedback: string): string;
  /** Validate and parse the refined output — reuses the existing asset parser */
  parseResponse(raw: string): string | null;
}

/**
 * Load brand anchors from the launch manifest's normalized baseline,
 * falling back to scan context if no manifest exists.
 */
function loadBrandAnchors(): BrandAnchors {
  const manifestPath = path.join(vlaunchDir(), "launch-manifest.json");
  const manifestContent = readFile(manifestPath);

  if (manifestContent) {
    try {
      const manifest = JSON.parse(manifestContent);
      const baseline = manifest.normalized_baseline;
      if (baseline) {
        return {
          productName: baseline.product_name || null,
          audience: baseline.core_audience || null,
          proofLanguage: baseline.core_proof_claim_language || [],
        };
      }
    } catch {}
  }

  // Fallback to scan context
  const context = readContext();
  return {
    productName: null,
    audience: context?.targetAudience || null,
    proofLanguage: [],
  };
}

/**
 * Extract the text content of a markdown section by heading name.
 */
export function extractMarkdownSection(content: string, heading: string): string | null {
  const pattern = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Check whether brand anchors from the original are preserved in the refined output.
 * Only checks anchors that were present in the original content.
 * For positioning assets, additionally checks that the product name appears in the one-liner.
 */
export function checkAnchors(
  original: string,
  refined: string,
  anchors: BrandAnchors,
  feedback: string,
  assetName: string,
): AnchorCheckResult {
  const preserved: string[] = [];
  const dropped: string[] = [];
  const feedbackLower = feedback.toLowerCase();

  const nameTargeted = anchors.productName
    ? (feedbackLower.includes("product name")
      || feedbackLower.includes("remove " + anchors.productName.toLowerCase())
      || feedbackLower.includes("rename")
      || feedbackLower.includes("drop " + anchors.productName.toLowerCase()))
    : false;

  // Check product name in the whole document
  if (anchors.productName) {
    const name = anchors.productName;
    const nameLower = name.toLowerCase();
    const originalHasName = original.toLowerCase().includes(nameLower);
    const refinedHasName = refined.toLowerCase().includes(nameLower);

    if (originalHasName && refinedHasName) {
      preserved.push(`product name "${name}"`);
    } else if (originalHasName && !refinedHasName) {
      if (!nameTargeted) {
        dropped.push(`product name "${name}"`);
      }
    }
  }

  // For positioning: check product name in the one-liner specifically
  if (assetName === "positioning" && anchors.productName && !nameTargeted) {
    const originalOneLiner = extractMarkdownSection(original, "One-liner");
    const refinedOneLiner = extractMarkdownSection(refined, "One-liner");
    const nameLower = anchors.productName.toLowerCase();

    if (originalOneLiner && originalOneLiner.toLowerCase().includes(nameLower)) {
      // Original one-liner had the product name — refined must too
      if (refinedOneLiner && !refinedOneLiner.toLowerCase().includes(nameLower)) {
        dropped.push(`product name "${anchors.productName}" in one-liner`);
      } else if (refinedOneLiner && refinedOneLiner.toLowerCase().includes(nameLower)) {
        preserved.push(`product name "${anchors.productName}" in one-liner`);
      }
    } else if (originalOneLiner && !originalOneLiner.toLowerCase().includes(nameLower)) {
      // Original one-liner didn't have the product name — still require it for positioning
      if (refinedOneLiner && !refinedOneLiner.toLowerCase().includes(nameLower)) {
        dropped.push(`product name "${anchors.productName}" in one-liner (required for positioning)`);
      } else if (refinedOneLiner && refinedOneLiner.toLowerCase().includes(nameLower)) {
        preserved.push(`product name "${anchors.productName}" in one-liner`);
      }
    }
  }

  // Check audience reference
  if (anchors.audience) {
    // Extract first two significant words from audience for matching
    const audienceWords = anchors.audience.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const significantWords = audienceWords.slice(0, 3);
    const originalLower = original.toLowerCase();
    const refinedLower = refined.toLowerCase();

    const originalHasAudience = significantWords.some(w => originalLower.includes(w));
    const refinedHasAudience = significantWords.some(w => refinedLower.includes(w));

    if (originalHasAudience && refinedHasAudience) {
      preserved.push(`audience ("${anchors.audience}")`);
    } else if (originalHasAudience && !refinedHasAudience) {
      const audienceTargeted = feedbackLower.includes("audience")
        || feedbackLower.includes("target")
        || feedbackLower.includes("who it's for");
      if (!audienceTargeted) {
        dropped.push(`audience ("${anchors.audience}")`);
      }
    }
  }

  // Check proof/claim language
  if (anchors.proofLanguage.length > 0) {
    const originalLower = original.toLowerCase();
    const refinedLower = refined.toLowerCase();

    // Only check proof terms that were in the original
    const relevantTerms = anchors.proofLanguage.filter(t => originalLower.includes(t.toLowerCase()));
    const keptTerms = relevantTerms.filter(t => refinedLower.includes(t.toLowerCase()));
    const lostTerms = relevantTerms.filter(t => !refinedLower.includes(t.toLowerCase()));

    if (keptTerms.length > 0) {
      preserved.push(`proof language (${keptTerms.join(", ")})`);
    }

    // Only flag as dropped if feedback didn't target proof/claim language
    if (lostTerms.length > 0) {
      const proofTargeted = feedbackLower.includes("proof")
        || feedbackLower.includes("claim")
        || feedbackLower.includes("evidence")
        || feedbackLower.includes("verification")
        || lostTerms.some(t => feedbackLower.includes(t.toLowerCase()));
      if (!proofTargeted) {
        dropped.push(`proof language (${lostTerms.join(", ")})`);
      }
    }
  }

  return {
    passed: dropped.length === 0,
    preserved,
    dropped,
  };
}

/**
 * Refine a single asset using feedback.
 */
export async function refineAsset(
  provider: AIProvider,
  contract: RefineContract,
  feedback: string,
): Promise<RefineResult> {
  const context = readContext();
  if (!context) {
    return { asset: contract.assetName, status: "failed", reason: "No scan context found" };
  }

  const filePath = path.join(assetsDir(), contract.filename);
  const currentContent = readFile(filePath);
  if (!currentContent) {
    return { asset: contract.assetName, status: "failed", reason: `Asset not found: ${contract.filename}` };
  }

  console.log(`[refine] Refining ${contract.assetName}...`);
  console.log(`[refine] Feedback: "${feedback}"`);

  // Build prompt
  const system = contract.systemPrompt;
  const user = contract.buildUserPrompt(context, currentContent, feedback);

  // Call provider
  let raw: string;
  try {
    raw = await provider.generate(system, user);
  } catch (err: any) {
    const message = err?.message || String(err);
    console.error(`[refine] ${contract.assetName}: provider error — ${message}`);
    return { asset: contract.assetName, status: "failed", reason: message };
  }

  // Parse and validate structure
  const refined = contract.parseResponse(raw);
  if (!refined) {
    console.warn(`[refine] ${contract.assetName}: refined output did not pass validation, keeping original`);
    return { asset: contract.assetName, status: "failed", reason: "Response failed validation" };
  }

  // Check brand anchors
  const anchors = loadBrandAnchors();
  const anchorCheck = checkAnchors(currentContent, refined, anchors, feedback, contract.assetName);

  if (!anchorCheck.passed) {
    console.warn(`[refine] ${contract.assetName}: brand anchors were silently dropped — rejecting refinement`);
    for (const d of anchorCheck.dropped) {
      console.warn(`[refine]   dropped: ${d}`);
    }
    console.warn(`[refine] To change these, mention them explicitly in the feedback.`);
    return {
      asset: contract.assetName,
      status: "failed",
      reason: `Brand anchors dropped: ${anchorCheck.dropped.join(", ")}`,
      anchors: anchorCheck,
    };
  }

  // Write only on success
  writeFile(filePath, refined);
  console.log(`[refine] ${contract.assetName}: refined successfully`);

  return { asset: contract.assetName, status: "refined", anchors: anchorCheck };
}
