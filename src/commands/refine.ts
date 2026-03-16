import * as path from "path";
import { readFile, assetsDir, vlaunchDir } from "../lib/fs";
import { RefineContract, refineAsset, RefineResult } from "../lib/ai/refine";
import { ScanContext } from "../types";
import { generateManifest } from "./manifest";

// ─── Refinement contracts per asset ─────────────────

function positioningContext(_context: ScanContext): string {
  return ""; // positioning is the root — no extra context needed
}

function downstreamContext(context: ScanContext): string {
  const positioning = readFile(path.join(assetsDir(), "positioning.md"));
  if (!positioning) return "";
  return `\n## Current Positioning (for voice and framing)\n${positioning}`;
}

function loadAnchorBlock(): string {
  const manifestPath = path.join(vlaunchDir(), "launch-manifest.json");
  const content = readFile(manifestPath);
  if (!content) return "";

  try {
    const manifest = JSON.parse(content);
    const b = manifest.normalized_baseline;
    if (!b) return "";

    const lines: string[] = [];
    if (b.product_name) lines.push(`- Product name: ${b.product_name}`);
    if (b.core_audience) lines.push(`- Core audience: ${b.core_audience}`);
    if (b.core_proof_claim_language?.length > 0) {
      lines.push(`- Core proof language: ${b.core_proof_claim_language.join(", ")}`);
    }

    if (lines.length === 0) return "";
    return `\n\nBrand anchors (MUST be preserved unless feedback explicitly asks to change them):\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}

function makeSystemPrompt(assetLabel: string, structureRules: string): string {
  const anchorBlock = loadAnchorBlock();

  return `You are a launch copy editor. You revise a single ${assetLabel} based on specific feedback.

Rules:
- Output ONLY the final revised markdown document. No commentary, no preamble, no explanation.
- ${structureRules}
- Apply the feedback precisely. Change what the feedback asks for. Do not rewrite sections the feedback does not mention.
- Preserve URLs, product names, and factual claims unless the feedback explicitly asks to change them.
- CRITICAL: The product name must appear in the output if it appeared in the input, unless the feedback explicitly asks to remove or rename it.
- CRITICAL: References to the target audience must be preserved unless the feedback explicitly asks to change them.
- CRITICAL: Proof/evidence language (e.g. "verified", "track record", "published") must not be silently dropped. These terms define the product's identity.
- Do not add superlatives ("best", "most accurate", "revolutionary") unless they come from the product's own metadata.
- Do not add filler phrases ("game-changer", "cutting-edge", "in today's world").
- Keep the same markdown heading structure as the input.${anchorBlock}`;
}

function makeUserPrompt(
  assetLabel: string,
  context: ScanContext,
  currentContent: string,
  feedback: string,
  extraContext: string,
): string {
  return `Revise this ${assetLabel} based on the feedback below.

## Scan Context
- URL: ${context.url}
- CLI description: ${context.description}
- Target audience: ${context.targetAudience}
- Detected category: ${context.category || "general"}
${extraContext}

## Current ${assetLabel} (revise this)
${currentContent}

## Feedback
${feedback}`;
}

// ─── Import existing parsers ────────────────────────

function loadParser(promptModule: string): (raw: string) => string | null {
  const mod = require(`../lib/ai/prompts/${promptModule}`);
  // Each prompt module exports a <name>Prompt object with parseResponse
  const contract = Object.values(mod).find((v: any) => v && typeof v.parseResponse === "function") as any;
  if (!contract) throw new Error(`No parseResponse found in ${promptModule}`);
  return (raw: string) => contract.parseResponse(raw);
}

// ─── Asset registry ─────────────────────────────────

const ASSET_CONFIGS: Record<string, {
  filename: string;
  label: string;
  promptModule: string;
  structureRules: string;
  contextFn: (ctx: ScanContext) => string;
}> = {
  positioning: {
    filename: "positioning.md",
    label: "positioning document",
    promptModule: "positioning",
    structureRules: "Preserve the markdown structure: # Positioning, then ## One-liner, ## Tagline, ## Short Description, ## Long Description, ## Problem, ## Solution, ## Why Now. CRITICAL: The ## One-liner MUST include the product name (e.g. 'ProductName — ...' or 'ProductName: ...'). The one-liner is the brand's primary identifier — do not drop the product name from it unless the feedback explicitly asks to remove it.",
    contextFn: positioningContext,
  },
  producthunt: {
    filename: "producthunt.md",
    label: "Product Hunt draft",
    promptModule: "producthunt",
    structureRules: "Preserve the markdown structure: # Product Hunt Draft, then ## Name, ## Tagline, ## Short Pitch, ## First Comment, ## Launch Checklist. Copy the Launch Checklist EXACTLY from the input — do not modify it.",
    contextFn: downstreamContext,
  },
  medium: {
    filename: "medium-draft.md",
    label: "Medium draft",
    promptModule: "medium",
    structureRules: "Preserve the markdown structure: # Medium Draft, then ## Title, ## Subtitle, ## Intro, ## The Problem, ## What We Built, ## Why Now, ## What's Next. Keep the product URL.",
    contextFn: downstreamContext,
  },
  routing: {
    filename: "routing-plan.md",
    label: "routing plan",
    promptModule: "routing",
    structureRules: "Preserve the markdown structure: # Routing Plan, then ## Primary channels, ## Secondary channels, ## Launch sequence, ## Avoid, ## Platform-specific notes.",
    contextFn: downstreamContext,
  },
  affiliate: {
    filename: "affiliate.md",
    label: "affiliate draft",
    promptModule: "affiliate",
    structureRules: "Preserve the markdown structure: # Affiliate Draft, then ## Program Headline, ## Why Promote This Product, ## Ideal Affiliate Partner, ## Suggested Commission Structure, ## Outreach Template.",
    contextFn: downstreamContext,
  },
};

// ─── Main command ───────────────────────────────────

export async function refineProject(asset: string, feedback: string): Promise<void> {
  const config = ASSET_CONFIGS[asset];
  if (!config) {
    const supported = Object.keys(ASSET_CONFIGS).join(", ");
    console.error(`Unknown asset "${asset}". Supported: ${supported}`);
    process.exit(1);
  }

  const parser = loadParser(config.promptModule);

  const contract: RefineContract = {
    assetName: asset,
    filename: config.filename,
    systemPrompt: makeSystemPrompt(config.label, config.structureRules),
    buildUserPrompt(context: ScanContext, currentContent: string, fb: string): string {
      const extra = config.contextFn(context);
      return makeUserPrompt(config.label, context, currentContent, fb, extra);
    },
    parseResponse: parser,
  };

  // Load provider
  const { createProvider } = require("../lib/ai/provider");
  const provider = createProvider();

  const result = await refineAsset(provider, contract, feedback);

  printRefineSummary(result, config.label);

  // Update manifest and provenance
  const enhancementResults = result.status === "refined"
    ? [{ asset, status: "enhanced" as const }]
    : [];

  generateManifest({
    mode: "ai",
    commandScope: "refine",
    enhancementResults,
  });
}

// ─── From-review apply ──────────────────────────────

export async function refineFromReview(revisionIndex: number): Promise<void> {
  const planContent = readFile(path.join(assetsDir(), "refinement-plan.json"));
  if (!planContent) {
    console.error("No refinement plan found. Run `vlaunch review` first.");
    process.exit(1);
  }

  let plan: any;
  try {
    plan = JSON.parse(planContent);
  } catch {
    console.error("Failed to parse refinement-plan.json.");
    process.exit(1);
  }

  const revision = plan.revisions?.find((r: any) => r.index === revisionIndex);
  if (!revision) {
    const available = (plan.revisions || []).map((r: any) => r.index).join(", ");
    console.error(`Revision ${revisionIndex} not found. Available: ${available}`);
    process.exit(1);
  }

  // Use primary_target_asset if available (new schema), fall back to asset (backward compat)
  const targetAsset = revision.primary_target_asset || revision.asset;

  console.log(`[from-review] Applying revision ${revision.index}: ${targetAsset}`);
  console.log(`[from-review] Priority: ${revision.priority}`);
  console.log(`[from-review] Feedback: "${revision.suggested_feedback}"`);

  if (revision.fixable_by_refine === false) {
    console.log(`[from-review] Warning: This revision targets "${targetAsset}" which may not be auto-refineable.`);
    console.log(`[from-review] Suggested action: ${revision.suggested_feedback}`);
    return;
  }

  await refineProject(targetAsset, revision.suggested_feedback);
}

// ─── Summary ────────────────────────────────────────

function printRefineSummary(result: RefineResult, label: string): void {
  console.log("\n--- Refinement Summary ---");

  if (result.status === "refined") {
    console.log(`✓ ${label} refined successfully`);
  } else {
    console.log(`✗ ${label} refinement failed: ${result.reason}`);
    console.log("  Original asset preserved.");
  }

  if (result.anchors) {
    if (result.anchors.preserved.length > 0) {
      console.log("\nBrand anchors preserved:");
      for (const p of result.anchors.preserved) {
        console.log(`  ✓ ${p}`);
      }
    }
    if (result.anchors.dropped.length > 0) {
      console.log("\nBrand anchors dropped:");
      for (const d of result.anchors.dropped) {
        console.log(`  ✗ ${d}`);
      }
      if (result.status === "failed") {
        console.log("\n  To change these, mention them explicitly in the --feedback.");
      }
    }
  }
}
