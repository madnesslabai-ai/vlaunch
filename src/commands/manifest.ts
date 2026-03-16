import * as path from "path";
import { readContext } from "../lib/config";
import { readFile, writeFile, fileExists, fileMtime, assetsDir, vlaunchDir } from "../lib/fs";
import { inferProductName } from "../lib/text";

// ─── Types ───────────────────────────────────────────

type GenerationMode = "ai-enhanced" | "deterministic" | "fallback-preserved" | "unknown";

interface AssetEntry {
  asset_name: string;
  path: string;
  exists: boolean;
  status: "success" | "skipped" | "failed" | null;
  last_known_generation_mode: GenerationMode | null;
  last_updated_at: string | null;
  touched_in_current_command: boolean;
}

// ─── Provenance ─────────────────────────────────────

interface AssetProvenance {
  generation_mode: GenerationMode;
  updated_at: string;
}

type ProvenanceMap = Record<string, AssetProvenance>;

interface StalenessInfo {
  is_stale: boolean;
  stale_reason?: string;
  stale_since?: string;
}

interface ConsistencySummary {
  exists: boolean;
  staleness: StalenessInfo;
  consistency_rate: number | null;
  checks_passed: number | null;
  checks_total: number | null;
  major_findings_count: number;
  minor_findings_count: number;
}

interface ReadinessSummary {
  staleness: StalenessInfo;
  launch_readiness_status: string | null;
  readiness_level: "not-ready" | "soft-launch-ready" | "launch-ready" | null;
  readiness_score: number | null;
  top_blockers: string[];
  recommended_next_actions: string[];
}

interface NormalizedBaseline {
  product_name: string | null;
  core_one_liner: string | null;
  core_tagline: string | null;
  core_audience: string | null;
  core_proof_claim_language: string[];
}

type PackageCompleteness = "full" | "partial" | "incomplete";
type IntegrityStatus = "full" | "partial" | "degraded";

interface LaunchManifest {
  schema_version: string;
  project: {
    product_name: string | null;
    url: string;
    audience: string;
    detected_category: string;
    generated_at: string;
  };
  run: {
    mode: "deterministic" | "ai";
    command_scope: string;
    success: boolean;
    integrity: IntegrityStatus;
    integrity_reason?: string;
  };
  assets_expected: number;
  assets_present: number;
  package_completeness: PackageCompleteness;
  assets: AssetEntry[];
  consistency: ConsistencySummary;
  readiness: ReadinessSummary;
  normalized_baseline: NormalizedBaseline;
}

// ─── Asset Definitions ───────────────────────────────

const MANIFEST_ASSETS = [
  { name: "positioning", file: "positioning.md" },
  { name: "producthunt", file: "producthunt.md" },
  { name: "medium-draft", file: "medium-draft.md" },
  { name: "routing-plan", file: "routing-plan.md" },
  { name: "directories", file: "directories.json" },
  { name: "affiliate", file: "affiliate.md" },
  { name: "checklist", file: "checklist.md" },
  { name: "consistency-report", file: "consistency-report.md" },
];

// ─── Enhancement Result (passed from pipeline) ──────

export interface EnhancementRecord {
  asset: string;
  status: "enhanced" | "skipped" | "failed";
}

// ─── Main ────────────────────────────────────────────

export function generateManifest(options: {
  mode: "deterministic" | "ai";
  commandScope: string;
  enhancementResults?: EnhancementRecord[];
}): void {
  const context = readContext();
  if (!context || !context.url) {
    console.error("No scan context found. Cannot generate manifest.");
    return;
  }

  const dir = assetsDir();
  const { fetched } = context;
  const now = new Date().toISOString();

  // Product name
  const productName = inferProductName(context.url, context.description, fetched?.title) || null;

  // Load existing provenance, then update it with this command's results
  const provenance = loadProvenance();
  const touchedAssets = new Set<string>();

  if (options.enhancementResults) {
    for (const result of options.enhancementResults) {
      touchedAssets.add(result.asset);
      let mode: GenerationMode;
      if (result.status === "enhanced") {
        mode = "ai-enhanced";
      } else if (result.status === "skipped") {
        mode = "fallback-preserved";
      } else {
        mode = "fallback-preserved";
      }
      provenance[result.asset] = { generation_mode: mode, updated_at: now };
    }
  }

  // For commands that generate deterministic assets, record provenance
  const deterministicScopes: Record<string, string[]> = {
    position: ["positioning"],
    route: ["routing-plan"],
    package: ["producthunt", "medium-draft", "directories", "affiliate"],
    checklist: ["checklist"],
    check: ["consistency-report"],
    run: ["positioning", "producthunt", "medium-draft", "routing-plan", "directories", "affiliate", "checklist", "consistency-report"],
  };

  const scopeAssets = deterministicScopes[options.commandScope] || [];
  for (const assetName of scopeAssets) {
    // Only update provenance if the asset file actually exists on disk
    // This prevents a narrow scope command from marking assets it didn't touch
    const assetDef = MANIFEST_ASSETS.find((a) => a.name === assetName);
    const assetExists = assetDef && fileExists(path.join(dir, assetDef.file));

    if (!assetExists) continue;

    touchedAssets.add(assetName);
    // Only set deterministic provenance if not already updated by enhancement results above
    if (!options.enhancementResults?.find((r) => r.asset === assetName)) {
      provenance[assetName] = { generation_mode: "deterministic", updated_at: now };
    }
  }

  saveProvenance(provenance);

  // Build asset entries
  const assets: AssetEntry[] = MANIFEST_ASSETS.map((def) => {
    const filePath = path.join(dir, def.file);
    const exists = fileExists(filePath);

    let status: AssetEntry["status"] = null;
    let lastKnownMode: GenerationMode | null = null;
    let lastUpdatedAt: string | null = null;

    if (exists) {
      status = "success";

      // Read provenance
      const prov = provenance[def.name];
      if (prov) {
        lastKnownMode = prov.generation_mode;
        lastUpdatedAt = prov.updated_at;
      } else {
        lastKnownMode = "unknown";
      }

      // Check enhancement results for status overrides
      if (options.enhancementResults) {
        const result = options.enhancementResults.find((r) => r.asset === def.name);
        if (result) {
          if (result.status === "skipped") status = "skipped";
          else if (result.status === "failed") status = "failed";
        }
      }
    }

    return {
      asset_name: def.name,
      path: `.vlaunch/assets/${def.file}`,
      exists,
      status: exists ? status : null,
      last_known_generation_mode: exists ? lastKnownMode : null,
      last_updated_at: exists ? lastUpdatedAt : null,
      touched_in_current_command: touchedAssets.has(def.name),
    };
  });

  // Parse consistency report
  const consistency = parseConsistencyReport(dir);

  // Parse checklist for readiness
  const readiness = parseReadiness(dir);

  // Parse normalized baseline from consistency report
  const baseline = parseBaseline(dir);

  const allAssetsOk = assets.filter((a) => a.exists).every((a) => a.status === "success" || a.status === "skipped");

  // Compute package completeness and integrity
  const assetsExpected = MANIFEST_ASSETS.length;
  const assetsPresent = assets.filter((a) => a.exists).length;
  let packageCompleteness: PackageCompleteness;
  if (assetsPresent === assetsExpected) {
    packageCompleteness = "full";
  } else if (assetsPresent >= Math.ceil(assetsExpected * 0.5)) {
    packageCompleteness = "partial";
  } else {
    packageCompleteness = "incomplete";
  }

  // Integrity reflects whether the manifest data can be trusted as a full-package view
  let integrity: IntegrityStatus;
  let integrityReason: string | undefined;
  if (packageCompleteness === "full" && consistency.exists && readiness.launch_readiness_status !== null) {
    integrity = "full";
  } else if (packageCompleteness === "incomplete") {
    integrity = "degraded";
    const reasons: string[] = [];
    if (assetsPresent < Math.ceil(assetsExpected * 0.5)) reasons.push(`only ${assetsPresent}/${assetsExpected} assets present`);
    if (!consistency.exists) reasons.push("no consistency report");
    if (readiness.launch_readiness_status === null) reasons.push("no readiness data");
    integrityReason = reasons.join("; ");
  } else {
    integrity = "partial";
    const reasons: string[] = [];
    if (assetsPresent < assetsExpected) reasons.push(`${assetsPresent}/${assetsExpected} assets present`);
    if (!consistency.exists) reasons.push("no consistency report");
    if (readiness.launch_readiness_status === null) reasons.push("no readiness data");
    integrityReason = reasons.length > 0 ? reasons.join("; ") : undefined;
  }

  const manifest: LaunchManifest = {
    schema_version: "1.0.0",
    project: {
      product_name: productName,
      url: context.url,
      audience: context.targetAudience,
      detected_category: context.category || "general",
      generated_at: now,
    },
    run: {
      mode: options.mode,
      command_scope: options.commandScope,
      success: allAssetsOk,
      integrity,
      integrity_reason: integrityReason,
    },
    assets_expected: assetsExpected,
    assets_present: assetsPresent,
    package_completeness: packageCompleteness,
    assets,
    consistency,
    readiness,
    normalized_baseline: baseline,
  };

  const outputPath = path.join(vlaunchDir(), "launch-manifest.json");
  writeFile(outputPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log("Generated .vlaunch/launch-manifest.json");
}

// ─── Provenance persistence ─────────────────────────

function provenancePath(): string {
  return path.join(vlaunchDir(), "asset-provenance.json");
}

function loadProvenance(): ProvenanceMap {
  const content = readFile(provenancePath());
  if (!content) return {};
  try {
    return JSON.parse(content) as ProvenanceMap;
  } catch {
    return {};
  }
}

function saveProvenance(provenance: ProvenanceMap): void {
  writeFile(provenancePath(), JSON.stringify(provenance, null, 2) + "\n");
}

// ─── Staleness Detection ────────────────────────────

/** Source assets that the consistency report depends on. */
const CONSISTENCY_SOURCES = [
  "positioning.md", "producthunt.md", "medium-draft.md",
  "routing-plan.md", "directories.json", "checklist.md",
];

/** Source assets that the checklist/readiness depends on (generated from scan context + assets). */
const READINESS_SOURCES = ["checklist.md"];

/**
 * Check if a derived file is stale relative to its source files.
 * Returns staleness info with the earliest source that is newer.
 */
function checkStaleness(
  derivedPath: string,
  sourceDir: string,
  sourceFiles: string[],
): StalenessInfo {
  const derivedMtime = fileMtime(derivedPath);
  if (derivedMtime === null) {
    return { is_stale: false }; // doesn't exist — not stale, just missing
  }

  const newerSources: string[] = [];
  let latestSourceMtime = 0;

  for (const file of sourceFiles) {
    const srcMtime = fileMtime(path.join(sourceDir, file));
    if (srcMtime !== null && srcMtime > derivedMtime) {
      newerSources.push(file);
      if (srcMtime > latestSourceMtime) latestSourceMtime = srcMtime;
    }
  }

  if (newerSources.length === 0) {
    return { is_stale: false };
  }

  return {
    is_stale: true,
    stale_reason: `Source asset(s) modified after last generation: ${newerSources.join(", ")}`,
    stale_since: new Date(derivedMtime).toISOString(),
  };
}

// ─── Parsers ─────────────────────────────────────────

function parseConsistencyReport(dir: string): ConsistencySummary {
  const reportPath = path.join(dir, "consistency-report.md");
  const content = readFile(reportPath);
  if (!content) {
    return { exists: false, staleness: { is_stale: false }, consistency_rate: null, checks_passed: null, checks_total: null, major_findings_count: 0, minor_findings_count: 0 };
  }

  const staleness = checkStaleness(reportPath, dir, CONSISTENCY_SOURCES);

  // Parse "**Consistency rate: 90%** (9/10 checks passed)"
  let consistencyRate: number | null = null;
  let checksPassed: number | null = null;
  let checksTotal: number | null = null;

  const rateMatch = content.match(/Consistency rate:\s*(\d+)%.*?(\d+)\/(\d+)/);
  if (rateMatch) {
    consistencyRate = parseInt(rateMatch[1], 10);
    checksPassed = parseInt(rateMatch[2], 10);
    checksTotal = parseInt(rateMatch[3], 10);
  }

  // Count findings by severity
  const inconsistencySection = extractSection(content, "Detected inconsistencies");
  const findings = inconsistencySection
    .split("\n")
    .filter((l) => l.trim().startsWith("- "));

  let major = 0;
  let minor = 0;
  for (const line of findings) {
    if (line.includes("minor gap") || line.includes("minor issue")) {
      minor++;
    } else {
      major++;
    }
  }

  return {
    exists: true,
    staleness,
    consistency_rate: consistencyRate,
    checks_passed: checksPassed,
    checks_total: checksTotal,
    major_findings_count: major,
    minor_findings_count: minor,
  };
}

function parseReadiness(dir: string): ReadinessSummary {
  const checklistPath = path.join(dir, "checklist.md");
  const content = readFile(checklistPath);
  if (!content) {
    return { staleness: { is_stale: false }, launch_readiness_status: null, readiness_level: null, readiness_score: null, top_blockers: [], recommended_next_actions: [] };
  }

  // Checklist is both a source asset and a derived output;
  // it becomes stale if the scan context has been updated more recently
  // (but we don't track that here — staleness is checked at the report level)

  // Extract launch readiness status
  const statusSection = extractSection(content, "Launch readiness status") ||
    extractSection(content, "Launch Readiness Status");
  const launchStatus = statusSection ? statusSection.split("\n")[0].replace(/^\*\*.*?\*\*\s*/, "").trim() || statusSection.trim() : null;

  // Extract top blockers from "Missing or weak areas"
  const missingSection = extractSection(content, "Missing or weak areas") ||
    extractSection(content, "Missing or Incomplete Items");
  const blockers = missingSection
    .split("\n")
    .filter((l) => l.trim().startsWith("- **"))
    .map((l) => {
      const match = l.match(/\*\*(.+?)\*\*/);
      return match ? cleanTrailingColon(match[1]) : cleanTrailingColon(l.replace(/^-\s*/, "").trim());
    })
    .slice(0, 5);

  // Extract next actions
  const actionsSection = extractSection(content, "Recommended next actions") ||
    extractSection(content, "Recommended Next Actions");
  const actions = actionsSection
    .split("\n")
    .filter((l) => /^\d+\./.test(l.trim()))
    .map((l) => {
      const match = l.match(/\*\*(.+?)\*\*/);
      return match ? cleanTrailingColon(match[1]) : cleanTrailingColon(l.replace(/^\d+\.\s*/, "").trim());
    })
    .slice(0, 5);

  // Derive readiness_score and readiness_level
  const { score, level } = deriveReadiness(launchStatus, blockers);

  return {
    staleness: { is_stale: false }, // checklist staleness tracked via consistency report
    launch_readiness_status: launchStatus,
    readiness_level: level,
    readiness_score: score,
    top_blockers: blockers,
    recommended_next_actions: actions,
  };
}

export function cleanTrailingColon(s: string): string {
  return s.replace(/:+\s*$/, "").trim();
}

export function deriveReadiness(
  statusText: string | null,
  blockers: string[],
): { score: number | null; level: ReadinessSummary["readiness_level"] } {
  if (!statusText) return { score: null, level: null };

  // Try to extract a percentage from the status text (e.g., "approximately 60%")
  const pctMatch = statusText.match(/(\d{1,3})%/);
  let score: number | null = pctMatch ? parseInt(pctMatch[1], 10) : null;

  // If no percentage found, estimate from blocker count
  if (score === null) {
    if (blockers.length === 0) score = 90;
    else if (blockers.length <= 2) score = 70;
    else if (blockers.length <= 4) score = 50;
    else score = 30;
  }

  // Determine level from score
  let level: ReadinessSummary["readiness_level"];
  if (score >= 80) {
    level = "launch-ready";
  } else if (score >= 50) {
    level = "soft-launch-ready";
  } else {
    level = "not-ready";
  }

  return { score, level };
}

function parseBaseline(dir: string): NormalizedBaseline {
  const content = readFile(path.join(dir, "consistency-report.md"));
  if (!content) {
    return { product_name: null, core_one_liner: null, core_tagline: null, core_audience: null, core_proof_claim_language: [] };
  }

  const baselineSection = extractSection(content, "Suggested normalized brand/message baseline") ||
    extractSection(content, "Standardized brand/message baseline");

  if (!baselineSection) {
    return { product_name: null, core_one_liner: null, core_tagline: null, core_audience: null, core_proof_claim_language: [] };
  }

  const extract = (label: string): string | null => {
    const match = baselineSection.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`));
    return match ? match[1].trim() : null;
  };

  const claimStr = extract("Core proof/claim language");
  const claims = claimStr
    ? claimStr.split(",").map((s) => s.trim()).filter((s) => s && s !== "(none detected)")
    : [];

  return {
    product_name: extract("Product name"),
    core_one_liner: extract("Core one-liner"),
    core_tagline: extract("Core tagline"),
    core_audience: extract("Core audience"),
    core_proof_claim_language: claims,
  };
}

function extractSection(markdown: string, heading: string): string {
  const pattern = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = markdown.match(pattern);
  return match ? match[1].trim() : "";
}
