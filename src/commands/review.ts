import * as path from "path";
import { readFile, writeFile, fileMtime, assetsDir, vlaunchDir } from "../lib/fs";

// ─── Types ───────────────────────────────────────────

type RevisionType =
  | "copy_refinement"
  | "messaging_alignment"
  | "proof_gap"
  | "cta_clarity"
  | "social_proof_gap"
  | "external_asset_dependency"
  | "platform_strategy_adjustment";

interface Revision {
  index: number;
  asset: string;
  primary_target_asset: string;
  secondary_target_assets?: string[];
  priority: "high" | "medium" | "low";
  revision_type: RevisionType;
  why: string;
  suggested_feedback: string;
  auto_apply_suitability: "high" | "medium" | "low" | "none";
  fixable_by_refine: boolean;
  needs_external_asset: boolean;
  needs_site_change: boolean;
  needs_distribution_work: boolean;
}

interface StalenessInfo {
  is_stale: boolean;
  stale_reason?: string;
  stale_since?: string;
}

interface RefinementPlan {
  schema_version: string;
  generated_at: string;
  is_partial: boolean;
  missing_prerequisites?: string[];
  staleness: StalenessInfo;
  overall_assessment: string;
  revisions: Revision[];
  apply_order: number[];
  notes: string[];
}

// ─── Refineable assets ──────────────────────────────

const REFINEABLE_ASSETS = new Set(["positioning", "producthunt", "medium", "routing", "affiliate"]);

// ─── Classification ─────────────────────────────────

const EXTERNAL_ASSET_SIGNALS = [
  "screenshot", "video", "demo", "gif", "logo", "image", "gallery",
  "visual proof", "screen recording", "walkthrough",
];

const SITE_CHANGE_SIGNALS = [
  "pricing", "landing page", "cta", "call-to-action", "homepage",
  "sign up", "free tier", "trial",
];

const DISTRIBUTION_SIGNALS = [
  "reddit account", "posting history", "account history", "hunter",
  "supporter", "discord", "telegram account", "launch day",
  "coordinate", "timeline", "infrastructure", "tracking", "referral link",
  "responsible gambling", "disclaimer",
];

export function classifyFinding(text: string): {
  revisionType: RevisionType;
  fixableByRefine: boolean;
  needsExternalAsset: boolean;
  needsSiteChange: boolean;
  needsDistributionWork: boolean;
  autoApply: Revision["auto_apply_suitability"];
} {
  const lower = text.toLowerCase();

  const needsExternalAsset = EXTERNAL_ASSET_SIGNALS.some((s) => lower.includes(s));
  const needsSiteChange = SITE_CHANGE_SIGNALS.some((s) => lower.includes(s));
  const needsDistributionWork = DISTRIBUTION_SIGNALS.some((s) => lower.includes(s));
  const isExternal = needsExternalAsset || needsSiteChange || needsDistributionWork;

  // Determine revision type
  let revisionType: RevisionType;
  if (needsExternalAsset) {
    revisionType = "external_asset_dependency";
  } else if (needsSiteChange) {
    revisionType = "cta_clarity";
  } else if (needsDistributionWork) {
    revisionType = "platform_strategy_adjustment";
  } else if (lower.includes("social proof") || lower.includes("testimonial") || lower.includes("beta user")) {
    revisionType = "social_proof_gap";
  } else if (lower.includes("claim") || lower.includes("proof") || lower.includes("evidence") || lower.includes("accuracy") || lower.includes("transparent")) {
    revisionType = "proof_gap";
  } else if (lower.includes("diverge") || lower.includes("drift") || lower.includes("align") || lower.includes("inconsisten")) {
    revisionType = "messaging_alignment";
  } else if (lower.includes("avoid") || lower.includes("contradict") || lower.includes("platform") || lower.includes("channel")) {
    revisionType = "platform_strategy_adjustment";
  } else {
    revisionType = "copy_refinement";
  }

  // Determine fixability
  const fixableByRefine = !isExternal;

  // Auto-apply suitability
  let autoApply: Revision["auto_apply_suitability"];
  if (!fixableByRefine) {
    autoApply = "none";
  } else if (revisionType === "copy_refinement") {
    autoApply = "high";
  } else if (revisionType === "messaging_alignment" || revisionType === "proof_gap") {
    autoApply = "medium";
  } else {
    autoApply = "medium";
  }

  return { revisionType, fixableByRefine, needsExternalAsset, needsSiteChange, needsDistributionWork, autoApply };
}

// ─── Main ────────────────────────────────────────────

export function generateReview(): RefinementPlan {
  const consistencyReport = readFile(path.join(assetsDir(), "consistency-report.md"));
  const checklist = readFile(path.join(assetsDir(), "checklist.md"));
  const manifestContent = readFile(path.join(vlaunchDir(), "launch-manifest.json"));

  // Prerequisite check: require at least consistency report OR checklist
  const missingPrereqs: string[] = [];
  if (!consistencyReport) missingPrereqs.push("consistency-report.md (run `vlaunch check` first)");
  if (!checklist) missingPrereqs.push("checklist.md (run `vlaunch checklist` or `vlaunch run` first)");

  if (!consistencyReport && !checklist) {
    console.error("Cannot generate review: no prerequisite files found.");
    console.error("Missing:");
    for (const m of missingPrereqs) console.error(`  - ${m}`);
    console.error("\nRun `vlaunch check` and/or `vlaunch run` before `vlaunch review`.");
    process.exit(1);
  }

  // Warn about partial prerequisites (one missing is degraded but usable)
  const isPartialReview = missingPrereqs.length > 0;
  if (isPartialReview) {
    console.warn(`Warning: review running with partial prerequisites (missing: ${missingPrereqs.join(", ")})`);
    console.warn("The refinement plan may be incomplete.\n");
  }

  // Staleness detection: check if source assets are newer than the inputs we read from
  const dir = assetsDir();
  const SOURCE_ASSETS = [
    "positioning.md", "producthunt.md", "medium-draft.md",
    "routing-plan.md", "directories.json", "affiliate.md",
  ];
  const inputFiles = [
    consistencyReport ? "consistency-report.md" : null,
    checklist ? "checklist.md" : null,
  ].filter(Boolean) as string[];

  const inputMtimes = inputFiles
    .map((f) => fileMtime(path.join(dir, f)))
    .filter((t): t is number => t !== null);
  const oldestInput = inputMtimes.length > 0 ? Math.min(...inputMtimes) : null;

  let staleness: StalenessInfo = { is_stale: false };
  if (oldestInput !== null) {
    const newerSources: string[] = [];
    for (const src of SOURCE_ASSETS) {
      const srcMtime = fileMtime(path.join(dir, src));
      if (srcMtime !== null && srcMtime > oldestInput) {
        newerSources.push(src);
      }
    }
    if (newerSources.length > 0) {
      staleness = {
        is_stale: true,
        stale_reason: `Source asset(s) modified after prerequisites were generated: ${newerSources.join(", ")}. Re-run \`vlaunch check\` then \`vlaunch review\`.`,
        stale_since: new Date(oldestInput).toISOString(),
      };
      console.warn(`Warning: review inputs may be stale — ${newerSources.join(", ")} modified since last check/checklist.`);
    }
  }

  const revisions: Revision[] = [];
  let idx = 1;

  // 1. Parse consistency findings into revisions
  if (consistencyReport) {
    const inconsistencies = extractBullets(consistencyReport, "Detected inconsistencies");
    const fixes = extractBullets(consistencyReport, "High-priority fixes");

    for (const fix of fixes) {
      const mapping = inferAssetFromFinding(fix);
      if (!mapping) continue;
      const isRefineable = REFINEABLE_ASSETS.has(mapping.primary);
      const cls = classifyFinding(fix);
      revisions.push({
        index: idx++,
        asset: mapping.primary,
        primary_target_asset: mapping.primary,
        secondary_target_assets: mapping.secondary.length > 0 ? mapping.secondary : undefined,
        priority: "high",
        revision_type: cls.revisionType,
        why: `Consistency fix: ${fix}`,
        suggested_feedback: isRefineable
          ? deriveFeedback(fix, mapping.primary)
          : `Requires manual edit to ${mapping.primary}: ${fix}`,
        auto_apply_suitability: isRefineable ? cls.autoApply : "none",
        fixable_by_refine: isRefineable && cls.fixableByRefine,
        needs_external_asset: cls.needsExternalAsset,
        needs_site_change: cls.needsSiteChange,
        needs_distribution_work: cls.needsDistributionWork,
      });
    }

    // Add remaining inconsistencies not already covered by fixes
    for (const issue of inconsistencies) {
      const alreadyCovered = revisions.some((r) => r.why.includes(issue.slice(0, 40)));
      if (alreadyCovered) continue;
      const mapping = inferAssetFromFinding(issue);
      if (!mapping) continue;
      const isRefineable = REFINEABLE_ASSETS.has(mapping.primary);
      const isMinor = issue.toLowerCase().includes("minor");
      const cls = classifyFinding(issue);
      revisions.push({
        index: idx++,
        asset: mapping.primary,
        primary_target_asset: mapping.primary,
        secondary_target_assets: mapping.secondary.length > 0 ? mapping.secondary : undefined,
        priority: isMinor ? "low" : "medium",
        revision_type: cls.revisionType,
        why: `Consistency gap: ${issue}`,
        suggested_feedback: isRefineable
          ? deriveFeedback(issue, mapping.primary)
          : `Requires manual edit to ${mapping.primary}: ${issue}`,
        auto_apply_suitability: isRefineable
          ? (isMinor && cls.fixableByRefine ? "low" : cls.autoApply)
          : "none",
        fixable_by_refine: isRefineable && cls.fixableByRefine,
        needs_external_asset: cls.needsExternalAsset,
        needs_site_change: cls.needsSiteChange,
        needs_distribution_work: cls.needsDistributionWork,
      });
    }
  }

  // 2. Parse checklist blockers into revisions (include external ones now, classified accordingly)
  if (checklist) {
    const weakAreas = extractBoldBullets(checklist, "Missing or weak areas");
    for (const area of weakAreas) {
      const target = inferAssetFromBlocker(area);
      if (!target) continue;
      // Skip non-refineable assets
      if (!REFINEABLE_ASSETS.has(target) && !isExternalBlocker(area)) continue;

      // Skip if we already have a revision for this asset with similar content
      const alreadyCovered = revisions.some(
        (r) => r.asset === target && r.why.toLowerCase().includes(area.label.toLowerCase().slice(0, 30)),
      );
      if (alreadyCovered) continue;

      const combined = `${area.label} ${area.detail}`;
      const cls = classifyFinding(combined);

      // For external blockers that map to a refineable asset, include but mark as not fixable
      const effectiveTarget = REFINEABLE_ASSETS.has(target) ? target : "positioning";

      revisions.push({
        index: idx++,
        asset: effectiveTarget,
        primary_target_asset: effectiveTarget,
        priority: cls.fixableByRefine ? "medium" : "low",
        revision_type: cls.revisionType,
        why: `Readiness gap: ${area.label}`,
        suggested_feedback: cls.fixableByRefine
          ? deriveBlockerFeedback(area, effectiveTarget)
          : `Requires external work: ${area.label}`,
        auto_apply_suitability: cls.autoApply,
        fixable_by_refine: cls.fixableByRefine,
        needs_external_asset: cls.needsExternalAsset,
        needs_site_change: cls.needsSiteChange,
        needs_distribution_work: cls.needsDistributionWork,
      });
    }
  }

  // 3. Check for generic phrasing opportunities
  const positioningContent = readFile(path.join(assetsDir(), "positioning.md"));
  if (positioningContent) {
    const genericPatterns = [
      { pattern: /deserve better tools/i, feedback: "Replace generic 'deserve better tools' phrasing with specific product value" },
      { pattern: /underserved by/i, feedback: "Replace 'underserved by' with a concrete description of what existing tools lack" },
      { pattern: /in today's world/i, feedback: "Remove 'in today's world' — filler phrase" },
    ];
    for (const { pattern, feedback } of genericPatterns) {
      if (pattern.test(positioningContent)) {
        revisions.push({
          index: idx++,
          asset: "positioning",
          primary_target_asset: "positioning",
          priority: "low",
          revision_type: "copy_refinement",
          why: `Generic phrasing detected: "${pattern.source}"`,
          suggested_feedback: feedback,
          auto_apply_suitability: "high",
          fixable_by_refine: true,
          needs_external_asset: false,
          needs_site_change: false,
          needs_distribution_work: false,
        });
      }
    }
  }

  // Build overall assessment
  const readinessScore = parseReadinessScore(manifestContent);
  const consistencyRate = parseConsistencyRate(manifestContent);
  const overall = buildOverallAssessment(revisions, readinessScore, consistencyRate);

  // Build apply order: fixable first (by priority), then non-fixable
  const fixable = revisions.filter((r) => r.fixable_by_refine);
  const notFixable = revisions.filter((r) => !r.fixable_by_refine);
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  fixable.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  notFixable.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  const applyOrder = [...fixable, ...notFixable].map((r) => r.index);

  // Notes
  const notes: string[] = [];
  if (staleness.is_stale) {
    notes.push(`Stale: ${staleness.stale_reason}`);
  }
  if (isPartialReview) {
    notes.push(`Partial review: missing ${missingPrereqs.join(", ")}. Results may be incomplete.`);
  }
  const fixableCount = fixable.length;
  const externalCount = notFixable.length;
  if (revisions.length === 0) {
    notes.push("No revisions recommended. The launch package is internally consistent and well-structured.");
  } else {
    if (fixableCount > 0) {
      notes.push(`${fixableCount} revision(s) can be applied via \`vlaunch refine-apply\`.`);
    }
    if (externalCount > 0) {
      notes.push(`${externalCount} revision(s) require external work (screenshots, pricing, accounts) and cannot be fixed by text refinement alone.`);
    }
    notes.push("Apply revisions selectively. Review each one before running.");
  }

  const plan: RefinementPlan = {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    is_partial: isPartialReview,
    missing_prerequisites: isPartialReview ? missingPrereqs : undefined,
    staleness,
    overall_assessment: overall,
    revisions,
    apply_order: applyOrder,
    notes,
  };

  // Write markdown
  const markdown = renderPlanMarkdown(plan);
  writeFile(path.join(assetsDir(), "refinement-plan.md"), markdown);
  console.log("Generated .vlaunch/assets/refinement-plan.md");

  // Write JSON for agent consumption
  writeFile(path.join(assetsDir(), "refinement-plan.json"), JSON.stringify(plan, null, 2) + "\n");
  console.log("Generated .vlaunch/assets/refinement-plan.json");

  return plan;
}

// ─── Parsers ────────────────────────────────────────

function extractBullets(content: string, heading: string): string[] {
  const pattern = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = content.match(pattern);
  if (!match) return [];
  return match[1]
    .split("\n")
    .filter((l) => l.trim().startsWith("- "))
    .map((l) => l.replace(/^-\s*/, "").trim());
}

interface BoldBullet {
  label: string;
  detail: string;
}

function extractBoldBullets(content: string, heading: string): BoldBullet[] {
  const pattern = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = content.match(pattern);
  if (!match) return [];
  return match[1]
    .split("\n")
    .filter((l) => l.trim().startsWith("- **"))
    .map((l) => {
      const m = l.match(/\*\*(.+?)\*\*:?\s*(.*)/);
      return m ? { label: m[1], detail: m[2] } : { label: l.replace(/^-\s*/, ""), detail: "" };
    });
}

// ─── Asset inference ────────────────────────────────

/** Map filenames and keywords to canonical asset names. */
const ASSET_FILE_MAP: Record<string, string> = {
  "positioning.md": "positioning",
  "producthunt.md": "producthunt",
  "medium-draft.md": "medium",
  "routing-plan.md": "routing",
  "directories.json": "directories",
  "affiliate.md": "affiliate",
  "checklist.md": "checklist",
};

const ASSET_KEYWORD_MAP: [RegExp, string][] = [
  [/\bmedium\b(?!-draft)/, "medium"],
  [/\bsubtitle\b/, "medium"],
  [/\bproduct hunt\b/, "producthunt"],
  [/\bproducthunt\b/, "producthunt"],
  [/\bph\s/, "producthunt"],
  [/\brouting\b/, "routing"],
  [/\bplatform strategy\b/, "routing"],
  [/\blaunch sequence\b/, "routing"],
  [/\baffiliate\b/, "affiliate"],
  [/\bpartner\b/, "affiliate"],
  [/\bcommission\b/, "affiliate"],
  [/\bpositioning\b/, "positioning"],
  [/\bone-liner\b/, "positioning"],
  [/\btagline\b/, "positioning"],
  [/\bdirector(?:ies|y)\b/, "directories"],
];

interface AssetMapping {
  primary: string;
  secondary: string[];
}

/**
 * Infer which asset(s) a finding targets.
 *
 * Strategy:
 * 1. Parse "missing from <file>" / "absent from <file>" → that's the primary target
 * 2. Parse "used in <file>, <file> but missing from <file>" → missing file is primary,
 *    "used in" files are secondary (context only)
 * 3. Fall back to keyword matching for findings without file references
 */
export function inferAssetFromFinding(finding: string): AssetMapping | null {
  const lower = finding.toLowerCase();

  // 1. Check for "missing from <file>" or "absent from <file>" pattern
  const missingMatch = lower.match(/(?:missing|absent)\s+from\s+([\w.-]+\.(?:md|json))/);
  if (missingMatch) {
    const targetFile = missingMatch[1];
    const primary = ASSET_FILE_MAP[targetFile];
    if (primary) {
      // Collect secondary assets from "used in" or "present in" patterns
      const secondary = extractMentionedAssets(lower).filter((a) => a !== primary);
      return { primary, secondary };
    }
  }

  // 2. Check for "missing from <asset-keyword>" without explicit filename
  const missingKeyword = lower.match(/(?:missing|absent)\s+from\s+(\w[\w\s]*?)(?:\s*[—–-]|\s*$|\s*,)/);
  if (missingKeyword) {
    const phrase = missingKeyword[1].trim();
    const matched = matchKeywordToAsset(phrase);
    if (matched) {
      const secondary = extractMentionedAssets(lower).filter((a) => a !== matched);
      return { primary: matched, secondary };
    }
  }

  // 3. Fall back: keyword scan (original behavior for non-"missing from" findings)
  if (lower.includes("checklist")) return null;

  // For general findings, use keyword matching but skip "directories" (non-refineable)
  for (const [pattern, asset] of ASSET_KEYWORD_MAP) {
    if (pattern.test(lower)) {
      return { primary: asset, secondary: [] };
    }
  }

  return null;
}

function extractMentionedAssets(text: string): string[] {
  const assets: string[] = [];
  for (const [file, asset] of Object.entries(ASSET_FILE_MAP)) {
    if (text.includes(file)) {
      assets.push(asset);
    }
  }
  return assets;
}

function matchKeywordToAsset(phrase: string): string | null {
  for (const [pattern, asset] of ASSET_KEYWORD_MAP) {
    if (pattern.test(phrase)) return asset;
  }
  return null;
}

function inferAssetFromBlocker(blocker: BoldBullet): string | null {
  const combined = `${blocker.label} ${blocker.detail}`.toLowerCase();
  if (combined.includes("medium") || combined.includes("story") || combined.includes("article")) return "medium";
  if (combined.includes("product hunt") || combined.includes("ph ") || combined.includes("first comment")) return "producthunt";
  if (combined.includes("routing") || combined.includes("channel") || combined.includes("platform")) return "routing";
  if (combined.includes("affiliate") || combined.includes("partner") || combined.includes("outreach")) return "affiliate";
  if (combined.includes("positioning") || combined.includes("tagline") || combined.includes("one-liner")) return "positioning";
  if (combined.includes("social proof") || combined.includes("accuracy") || combined.includes("data point")) return "producthunt";
  // External blockers — map to a general target for classification
  if (combined.includes("screenshot") || combined.includes("visual") || combined.includes("demo") || combined.includes("video")) return "producthunt";
  if (combined.includes("pricing") || combined.includes("cta") || combined.includes("landing page")) return "positioning";
  if (combined.includes("reddit account") || combined.includes("launch day") || combined.includes("supporter")) return "routing";
  return null;
}

function isExternalBlocker(blocker: BoldBullet): boolean {
  const combined = `${blocker.label} ${blocker.detail}`.toLowerCase();
  return EXTERNAL_ASSET_SIGNALS.some((s) => combined.includes(s))
    || SITE_CHANGE_SIGNALS.some((s) => combined.includes(s))
    || DISTRIBUTION_SIGNALS.some((s) => combined.includes(s));
}

// ─── Feedback derivation ────────────────────────────

function deriveFeedback(finding: string, _asset: string): string {
  const clean = finding.replace(/\*\*/g, "").trim();

  if (clean.toLowerCase().includes("diverge") || clean.toLowerCase().includes("drift")) {
    return `Align this asset's messaging with the current positioning — ${clean}`;
  }
  if (clean.toLowerCase().includes("avoid") || clean.toLowerCase().includes("contradict")) {
    return `Remove or revise the contradicting recommendation — ${clean}`;
  }
  if (clean.toLowerCase().includes("missing") || clean.toLowerCase().includes("absent")) {
    return `Add the missing element — ${clean}`;
  }
  return `Address this consistency issue: ${clean}`;
}

function deriveBlockerFeedback(blocker: BoldBullet, asset: string): string {
  const label = blocker.label.replace(/:+$/, "").trim();
  if (asset === "producthunt") {
    return `Strengthen the ${asset} draft to address: ${label}. Add concrete specifics where possible.`;
  }
  return `Revise to address: ${label}. Be specific and actionable.`;
}

// ─── Assessment builder ─────────────────────────────

function parseReadinessScore(manifestContent: string | null): number | null {
  if (!manifestContent) return null;
  try {
    return JSON.parse(manifestContent).readiness?.readiness_score ?? null;
  } catch { return null; }
}

function parseConsistencyRate(manifestContent: string | null): number | null {
  if (!manifestContent) return null;
  try {
    return JSON.parse(manifestContent).consistency?.consistency_rate ?? null;
  } catch { return null; }
}

function buildOverallAssessment(revisions: Revision[], readiness: number | null, consistency: number | null): string {
  const parts: string[] = [];

  if (readiness !== null) parts.push(`Readiness score: ${readiness}%.`);
  if (consistency !== null) parts.push(`Consistency rate: ${consistency}%.`);

  const total = revisions.length;
  const fixable = revisions.filter((r) => r.fixable_by_refine).length;
  const external = total - fixable;

  if (total === 0) {
    parts.push("No revisions recommended — the launch package is internally consistent.");
  } else {
    parts.push(`${total} revision(s) identified: ${fixable} fixable via asset refinement, ${external} requiring external work.`);
  }

  const highCount = revisions.filter((r) => r.priority === "high").length;
  if (highCount > 0) {
    parts.push(`${highCount} high-priority item(s) should be addressed before launch.`);
  }

  return parts.join(" ");
}

// ─── Markdown renderer ──────────────────────────────

function revisionTypeLabel(rt: RevisionType): string {
  const labels: Record<RevisionType, string> = {
    copy_refinement: "Copy refinement",
    messaging_alignment: "Messaging alignment",
    proof_gap: "Proof / evidence gap",
    cta_clarity: "CTA clarity",
    social_proof_gap: "Social proof gap",
    external_asset_dependency: "External asset needed",
    platform_strategy_adjustment: "Platform strategy",
  };
  return labels[rt] || rt;
}

function fixabilityLabel(rev: Revision): string {
  if (rev.fixable_by_refine) return "Yes — fixable via `vlaunch refine-apply " + rev.index + "`";
  const deps: string[] = [];
  if (rev.needs_external_asset) deps.push("external assets (screenshots, video)");
  if (rev.needs_site_change) deps.push("site changes (pricing, CTA)");
  if (rev.needs_distribution_work) deps.push("distribution work (accounts, coordination)");
  return `No — requires ${deps.join(", ")}`;
}

function renderPlanMarkdown(plan: RefinementPlan): string {
  const lines: string[] = [];

  lines.push("# Refinement Plan");
  lines.push("");
  lines.push("## Overall assessment");
  lines.push(plan.overall_assessment);
  lines.push("");

  lines.push("## Recommended revisions");
  if (plan.revisions.length === 0) {
    lines.push("No revisions recommended.");
  } else {
    for (const rev of plan.revisions) {
      lines.push(`### ${rev.index}. ${rev.asset}`);
      lines.push(`- **Type:** ${revisionTypeLabel(rev.revision_type)}`);
      lines.push(`- **Priority:** ${rev.priority}`);
      lines.push(`- **Fixable by refinement:** ${fixabilityLabel(rev)}`);
      lines.push(`- **Why this matters:** ${rev.why}`);
      lines.push(`- **Suggested change:** ${rev.suggested_feedback}`);
      lines.push(`- **Auto-apply suitability:** ${rev.auto_apply_suitability}`);
      lines.push("");
    }
  }

  lines.push("## Suggested apply order");
  if (plan.apply_order.length === 0) {
    lines.push("No revisions to apply.");
  } else {
    for (let i = 0; i < plan.apply_order.length; i++) {
      const revIdx = plan.apply_order[i];
      const rev = plan.revisions.find((r) => r.index === revIdx);
      if (rev) {
        const tag = rev.fixable_by_refine ? "" : " *(external)*";
        lines.push(`${i + 1}. Revision ${rev.index} — **${rev.asset}** (${rev.priority})${tag}`);
      }
    }
  }
  lines.push("");

  lines.push("## Notes");
  for (const note of plan.notes) {
    lines.push(`- ${note}`);
  }
  lines.push("");

  return lines.join("\n");
}
