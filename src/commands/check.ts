import * as path from "path";
import { readContext } from "../lib/config";
import { readFile, writeFile, assetsDir } from "../lib/fs";

// ─── Types ───────────────────────────────────────────

interface AssetBundle {
  positioning: string | null;
  producthunt: string | null;
  medium: string | null;
  routing: string | null;
  directories: string | null;
  checklist: string | null;
}

interface Finding {
  category: "consistent" | "inconsistency" | "fix";
  message: string;
  priority?: number; // lower = higher priority (1-3)
}

interface Baseline {
  productName: string;
  oneLiner: string;
  tagline: string;
  audience: string;
  claimLanguage: string[];
}

// ─── Main ────────────────────────────────────────────

export function checkConsistency(): void {
  const context = readContext();
  if (!context || !context.url) {
    console.error("No scan context found. Run `vlaunch scan` first.");
    process.exit(1);
  }

  const dir = assetsDir();
  const bundle: AssetBundle = {
    positioning: readFile(path.join(dir, "positioning.md")),
    producthunt: readFile(path.join(dir, "producthunt.md")),
    medium: readFile(path.join(dir, "medium-draft.md")),
    routing: readFile(path.join(dir, "routing-plan.md")),
    directories: readFile(path.join(dir, "directories.json")),
    checklist: readFile(path.join(dir, "checklist.md")),
  };

  const CORE_ASSETS: (keyof AssetBundle)[] = ["positioning", "producthunt", "medium", "routing", "directories", "checklist"];
  const presentAssets = CORE_ASSETS.filter((k) => bundle[k] !== null);
  const missingAssets = CORE_ASSETS.filter((k) => bundle[k] === null);
  const assetCount = presentAssets.length;

  if (assetCount < 2) {
    console.error("Need at least 2 generated assets to check consistency. Run more pipeline commands first.");
    process.exit(1);
  }

  const isPartial = missingAssets.length > 0;
  if (isPartial) {
    console.warn(`Warning: running consistency check with ${assetCount}/${CORE_ASSETS.length} assets present.`);
    console.warn(`Missing: ${missingAssets.join(", ")}`);
    console.warn("Consistency rate reflects only the assets checked, not a full package.\n");
  }

  const baseline = extractBaseline(bundle, context.targetAudience);
  const findings: Finding[] = [];

  checkBrandName(bundle, baseline, findings);
  checkPositioningAlignment(bundle, findings);
  checkClaimConsistency(bundle, findings);
  checkAudienceConsistency(bundle, baseline, findings);
  checkPlatformStrategy(bundle, findings);
  checkToneConsistency(bundle, findings);

  const report = generateReport(findings, baseline, assetCount, isPartial, missingAssets);
  const outputPath = path.join(dir, "consistency-report.md");
  writeFile(outputPath, report);
  console.log("Generated .vlaunch/assets/consistency-report.md");
}

// ─── Baseline Extraction ─────────────────────────────

function extractSection(markdown: string, heading: string): string {
  const pattern = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = markdown.match(pattern);
  return match ? match[1].trim() : "";
}

function extractBaseline(bundle: AssetBundle, contextAudience: string): Baseline {
  let productName = "";
  let oneLiner = "";
  let tagline = "";
  let audience = contextAudience;
  const claimLanguage: string[] = [];

  if (bundle.positioning) {
    oneLiner = extractSection(bundle.positioning, "One-liner");
    tagline = extractSection(bundle.positioning, "Tagline");

    // Extract product name from one-liner (usually "Name — description")
    const dashMatch = oneLiner.match(/^(.+?)\s*[—–-]\s*/);
    if (dashMatch) {
      productName = dashMatch[1].trim();
    }

    // Extract claim language patterns (stem-based)
    const claimPatterns: Array<{ label: string; stem: string }> = [
      { label: "verified", stem: "verif" },
      { label: "published", stem: "publish" },
      { label: "track record", stem: "track record" },
      { label: "transparent", stem: "transparen" },
      { label: "auditable", stem: "audit" },
      { label: "accountable", stem: "accountab" },
    ];
    const lower = bundle.positioning.toLowerCase();
    for (const { label, stem } of claimPatterns) {
      if (lower.includes(stem)) {
        claimLanguage.push(label);
      }
    }
  }

  // Fallback: extract name from PH draft
  if (!productName && bundle.producthunt) {
    const phName = extractSection(bundle.producthunt, "Name");
    if (phName) productName = phName;
  }

  return { productName, oneLiner, tagline, audience, claimLanguage };
}

// ─── Check: Brand Name ───────────────────────────────

function checkBrandName(bundle: AssetBundle, baseline: Baseline, findings: Finding[]): void {
  if (!baseline.productName) return;

  const name = baseline.productName;
  const nameVariants: Array<{ source: string; found: boolean }> = [];

  if (bundle.producthunt) {
    const phName = extractSection(bundle.producthunt, "Name").trim();
    const match = phName.toLowerCase() === name.toLowerCase();
    nameVariants.push({ source: "producthunt.md (Name)", found: match });
    if (!match && phName) {
      findings.push({
        category: "inconsistency",
        message: `Product name mismatch: positioning uses "${name}" but producthunt.md uses "${phName}"`,
      });
    }
  }

  if (bundle.medium) {
    const title = extractSection(bundle.medium, "Title");
    const found = title.toLowerCase().includes(name.toLowerCase());
    nameVariants.push({ source: "medium-draft.md (Title)", found });
    if (!found && title) {
      findings.push({
        category: "inconsistency",
        message: `Product name "${name}" not found in Medium draft title: "${title}"`,
      });
    }
  }

  if (bundle.directories) {
    try {
      const entries = JSON.parse(bundle.directories);
      let dirMentions = 0;
      for (const entry of entries) {
        if (entry.suggested_description?.toLowerCase().includes(name.toLowerCase())) {
          dirMentions++;
        }
      }
      const total = entries.length;
      if (dirMentions < total) {
        findings.push({
          category: "inconsistency",
          message: `Product name "${name}" appears in ${dirMentions}/${total} directory listings — some entries may be missing the brand name`,
        });
      } else {
        findings.push({
          category: "consistent",
          message: `Product name "${name}" appears in all ${total} directory listings`,
        });
      }
    } catch {
      // Invalid JSON — skip
    }
  }

  // Check routing plan mentions the product
  if (bundle.routing) {
    const found = bundle.routing.toLowerCase().includes(name.toLowerCase());
    if (found) {
      findings.push({
        category: "consistent",
        message: `Product name "${name}" is referenced in the routing plan`,
      });
    }
  }

  // Overall name consistency
  const allFound = nameVariants.every((v) => v.found);
  if (allFound && nameVariants.length >= 2) {
    findings.push({
      category: "consistent",
      message: `Product name "${name}" is used consistently across all checked assets`,
    });
  }
}

// ─── Check: Positioning Alignment ────────────────────

function checkPositioningAlignment(bundle: AssetBundle, findings: Finding[]): void {
  if (!bundle.positioning) return;

  const oneLiner = extractSection(bundle.positioning, "One-liner").toLowerCase();
  const tagline = extractSection(bundle.positioning, "Tagline").toLowerCase();
  const shortDesc = extractSection(bundle.positioning, "Short Description").toLowerCase();

  if (!oneLiner || !tagline) return;

  // Check PH tagline aligns with positioning
  if (bundle.producthunt) {
    const phTagline = extractSection(bundle.producthunt, "Tagline").toLowerCase();
    if (phTagline) {
      // Check for meaningful overlap (shared key phrases)
      const overlapScore = phraseOverlap(oneLiner, phTagline);
      if (overlapScore >= 0.3) {
        findings.push({
          category: "consistent",
          message: "Product Hunt tagline aligns with positioning one-liner",
        });
      } else {
        findings.push({
          category: "inconsistency",
          message: `Product Hunt tagline may diverge from positioning one-liner — check that both communicate the same core value`,
        });
      }
    }
  }

  // Check Medium subtitle aligns with positioning
  if (bundle.medium) {
    const subtitle = extractSection(bundle.medium, "Subtitle").toLowerCase();
    if (subtitle && shortDesc) {
      const overlapScore = phraseOverlap(shortDesc, subtitle);
      if (overlapScore >= 0.2) {
        findings.push({
          category: "consistent",
          message: "Medium subtitle aligns with positioning short description",
        });
      } else {
        findings.push({
          category: "inconsistency",
          message: "Medium subtitle may diverge from positioning short description — check that both describe the same product scope",
        });
      }
    }
  }
}

// ─── Check: Claim Consistency ────────────────────────

function checkClaimConsistency(bundle: AssetBundle, findings: Finding[]): void {
  const absoluteClaims = ["most accurate", "the best", "the only", "#1", "number one", "world's first", "guaranteed", "always correct", "never wrong", "100% accurate"];
  // Evidence claims: label → stems to match (catches "verified"/"verifiable"/"verification", etc.)
  const evidenceClaims: Array<{ label: string; stems: string[] }> = [
    { label: "verified", stems: ["verif"] },
    { label: "published", stems: ["publish"] },
    { label: "track record", stems: ["track record"] },
    { label: "auditable", stems: ["audit"] },
    { label: "transparent", stems: ["transparen"] },
    { label: "accountable", stems: ["accountab"] },
  ];

  const assetTexts: Array<{ name: string; text: string }> = [];
  if (bundle.positioning) assetTexts.push({ name: "positioning.md", text: bundle.positioning });
  if (bundle.producthunt) assetTexts.push({ name: "producthunt.md", text: bundle.producthunt });
  if (bundle.medium) assetTexts.push({ name: "medium-draft.md", text: bundle.medium });
  if (bundle.routing) assetTexts.push({ name: "routing-plan.md", text: bundle.routing });
  if (bundle.checklist) assetTexts.push({ name: "checklist.md", text: bundle.checklist });
  if (bundle.directories) assetTexts.push({ name: "directories.json", text: bundle.directories });

  // Check for absolute claims
  for (const asset of assetTexts) {
    const lower = asset.text.toLowerCase();
    for (const claim of absoluteClaims) {
      if (lower.includes(claim)) {
        findings.push({
          category: "inconsistency",
          message: `Absolute claim "${claim}" found in ${asset.name} — may be risky or unsupported`,
          priority: 1,
        });
      }
    }
  }

  // Helper: check if any stem matches in text
  const hasClaim = (text: string, stems: string[]): boolean =>
    stems.some((s) => text.toLowerCase().includes(s));

  // Check evidence claim consistency across assets
  for (const claim of evidenceClaims) {
    const assetsWithClaim = assetTexts.filter((a) => hasClaim(a.text, claim.stems));
    const assetsWithoutClaim = assetTexts.filter((a) => !hasClaim(a.text, claim.stems));

    // Only flag if the claim appears in some but not all user-facing assets
    if (assetsWithClaim.length >= 2 && assetsWithoutClaim.length >= 1) {
      // Only flag user-facing assets missing the claim (not routing/checklist)
      const userFacingNames = ["positioning.md", "producthunt.md", "medium-draft.md", "directories.json"];
      const missingUserFacing = assetsWithoutClaim.filter((a) => userFacingNames.includes(a.name));
      if (missingUserFacing.length > 0) {
        // Low severity if only 1 user-facing asset is missing and most have it
        const severity = missingUserFacing.length === 1 && assetsWithClaim.length >= 4
          ? "minor"
          : "notable";
        findings.push({
          category: "inconsistency",
          message: severity === "minor"
            ? `Claim language "${claim.label}" present in most assets but missing from ${missingUserFacing.map((a) => a.name).join(", ")} — minor gap, review if intentional`
            : `Claim language "${claim.label}" used in ${assetsWithClaim.map((a) => a.name).join(", ")} but missing from ${missingUserFacing.map((a) => a.name).join(", ")}`,
        });
      }
    }
  }

  // Positive: evidence language used consistently
  const consistentClaims = evidenceClaims.filter((claim) => {
    const userFacing = assetTexts.filter((a) =>
      ["positioning.md", "producthunt.md", "medium-draft.md"].includes(a.name),
    );
    return userFacing.length >= 2 && userFacing.every((a) => hasClaim(a.text, claim.stems));
  });

  if (consistentClaims.length >= 2) {
    findings.push({
      category: "consistent",
      message: `Evidence language (${consistentClaims.map((c) => c.label).join(", ")}) is used consistently across user-facing assets`,
    });
  }
}

// ─── Check: Audience Consistency ─────────────────────

function checkAudienceConsistency(bundle: AssetBundle, baseline: Baseline, findings: Finding[]): void {
  const audience = baseline.audience.toLowerCase();
  const audienceKeywords = audience
    .split(/[\s,]+/)
    .filter((w) => w.length > 3 && !["and", "the", "for", "who", "that", "with", "are", "interested"].includes(w));

  if (audienceKeywords.length === 0) return;

  const assetTexts: Array<{ name: string; text: string }> = [];
  if (bundle.positioning) assetTexts.push({ name: "positioning.md", text: bundle.positioning });
  if (bundle.producthunt) assetTexts.push({ name: "producthunt.md", text: bundle.producthunt });
  if (bundle.medium) assetTexts.push({ name: "medium-draft.md", text: bundle.medium });

  let allMention = true;
  for (const asset of assetTexts) {
    const lower = asset.text.toLowerCase();
    const keywordsFound = audienceKeywords.filter((kw) => lower.includes(kw));
    const coverage = keywordsFound.length / audienceKeywords.length;

    if (coverage < 0.3) {
      allMention = false;
      findings.push({
        category: "inconsistency",
        message: `${asset.name} has low audience keyword coverage — may be targeting a different user group than "${baseline.audience}"`,
      });
    }
  }

  if (allMention && assetTexts.length >= 2) {
    findings.push({
      category: "consistent",
      message: `Target audience ("${baseline.audience}") is referenced consistently across user-facing assets`,
    });
  }
}

// ─── Check: Platform Strategy ────────────────────────

function checkPlatformStrategy(bundle: AssetBundle, findings: Finding[]): void {
  if (!bundle.routing || !bundle.directories) return;

  // Extract platform names from routing plan
  const routingPlatforms: string[] = [];
  const lines = bundle.routing.split("\n");
  for (const line of lines) {
    const match = line.match(/^\d+\.\s+\*\*(.+?)\*\*/);
    if (match) {
      routingPlatforms.push(match[1].trim());
    }
  }

  // Extract platform names from directories
  let directoryPlatforms: string[] = [];
  try {
    const entries = JSON.parse(bundle.directories);
    directoryPlatforms = entries.map((e: any) => e.name);
  } catch {
    return;
  }

  if (routingPlatforms.length === 0 || directoryPlatforms.length === 0) return;

  // Check overlap — directories should be a subset or match routing
  const routingLower = routingPlatforms.map((p) => normalizePlatform(p));
  const dirLower = directoryPlatforms.map((p) => normalizePlatform(p));

  let matched = 0;
  const unmatched: string[] = [];
  for (const dp of dirLower) {
    if (routingLower.some((rp) => rp.includes(dp) || dp.includes(rp))) {
      matched++;
    } else {
      unmatched.push(directoryPlatforms[dirLower.indexOf(dp)]);
    }
  }

  if (matched === dirLower.length) {
    findings.push({
      category: "consistent",
      message: "All directory listings correspond to platforms in the routing plan",
    });
  } else if (unmatched.length > 0) {
    findings.push({
      category: "inconsistency",
      message: `Directory listings include platforms not in routing plan: ${unmatched.join(", ")}`,
    });
  }

  // Check if routing "Avoid" section conflicts with directories
  const avoidSection = extractSection(bundle.routing, "Avoid for Now");
  if (avoidSection) {
    // Extract the actual platform names from the avoid section's bold entries
    const avoidedPlatforms: string[] = [];
    for (const avoidLine of avoidSection.split("\n")) {
      const boldMatch = avoidLine.match(/\*\*(.+?)\*\*/);
      if (boldMatch) avoidedPlatforms.push(boldMatch[1].trim());
    }

    for (const dp of directoryPlatforms) {
      const dpNorm = normalizePlatform(dp);
      const isAvoided = avoidedPlatforms.some((ap) => {
        const apNorm = normalizePlatform(ap);
        return apNorm === dpNorm || apNorm.includes(dpNorm) || dpNorm.includes(apNorm);
      });
      if (isAvoided) {
        findings.push({
          category: "inconsistency",
          message: `"${dp}" appears in both directories.json and the routing plan's "Avoid for Now" section`,
          priority: 1,
        });
      }
    }
  }

  // Check if checklist next actions contradict routing priorities
  if (bundle.checklist) {
    const checklistActions = extractSection(bundle.checklist, "Recommended next actions") ||
      extractSection(bundle.checklist, "Recommended Next Actions");
    if (checklistActions && avoidSection) {
      // Extract the actual avoided platform names (from bold entries in avoid section)
      const avoidedPlatforms: string[] = [];
      for (const avoidLine of avoidSection.split("\n")) {
        const boldMatch = avoidLine.match(/\*\*(.+?)\*\*/);
        if (boldMatch) avoidedPlatforms.push(boldMatch[1].trim());
      }

      const actionLines = checklistActions.split("\n").filter((l) => l.trim());
      const seenMessages = new Set<string>();
      for (const line of actionLines) {
        for (const ap of avoidedPlatforms) {
          const apNorm = normalizePlatform(ap);
          if (platformMentionedIn(apNorm, line)) {
            const msg = `Checklist recommends action involving "${ap}" which the routing plan says to avoid`;
            if (!seenMessages.has(msg)) {
              seenMessages.add(msg);
              findings.push({
                category: "inconsistency",
                message: msg,
                priority: 1,
              });
            }
          }
        }
      }
    }
  }
}

// ─── Check: Tone Consistency ─────────────────────────

function checkToneConsistency(bundle: AssetBundle, findings: Finding[]): void {
  // Detect tone leakage from wrong category
  const launchToolMarkers = ["vlaunch", "cli", "pipeline", ".vlaunch/", "npm run", "npx", "ts-node"];
  const sportsMarkers = ["bettor", "betting", "handicap", "odds", "tipster", "prediction", "league"];
  const spiritualityMarkers = ["astrology", "horoscope", "chart", "reading", "spiritual", "destiny", "zi wei"];

  const userFacing: Array<{ name: string; text: string }> = [];
  if (bundle.producthunt) userFacing.push({ name: "producthunt.md", text: bundle.producthunt });
  if (bundle.medium) userFacing.push({ name: "medium-draft.md", text: bundle.medium });

  // Detect which tone dominates
  const allText = userFacing.map((a) => a.text).join(" ").toLowerCase();
  const isSports = sportsMarkers.filter((m) => allText.includes(m)).length >= 3;
  const isSpiritual = spiritualityMarkers.filter((m) => allText.includes(m)).length >= 2;

  // Check for launch-tool language leaking into non-launch products
  for (const asset of userFacing) {
    const lower = asset.text.toLowerCase();
    const launchLeaks = launchToolMarkers.filter((m) => lower.includes(m));
    if (launchLeaks.length >= 2 && (isSports || isSpiritual)) {
      findings.push({
        category: "inconsistency",
        message: `${asset.name} contains launch-tool language (${launchLeaks.join(", ")}) that may be out of place for this product category`,
        priority: 2,
      });
    }
  }

  // Check for mixed category signals
  if (isSports) {
    for (const asset of userFacing) {
      const lower = asset.text.toLowerCase();
      const spiritualLeaks = spiritualityMarkers.filter((m) => lower.includes(m));
      if (spiritualLeaks.length >= 2) {
        findings.push({
          category: "inconsistency",
          message: `${asset.name} mixes sports analytics and spirituality language — possible category confusion`,
          priority: 1,
        });
      }
    }
  }

  // Positive tone finding
  if (userFacing.length >= 2) {
    const toneLabels: string[] = [];
    if (isSports) toneLabels.push("sports analytics");
    if (isSpiritual) toneLabels.push("spirituality/wellness");
    if (!isSports && !isSpiritual) toneLabels.push("general/tech");

    findings.push({
      category: "consistent",
      message: `User-facing assets maintain consistent ${toneLabels.join("/")} tone`,
    });
  }
}

// ─── Helpers ─────────────────────────────────────────

export function normalizePlatform(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9\s/]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(" ");
}

/** Check if a platform token appears as a whole word/phrase in text */
export function platformMentionedIn(platformNorm: string, text: string): boolean {
  // For very short tokens (1-2 chars like "x"), require word boundaries
  const escaped = platformNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\b${escaped}\\b`, "i");
  return pattern.test(text);
}

function phraseOverlap(a: string, b: string): number {
  const wordsA = new Set(
    a.split(/\s+/).filter((w) => w.length > 3 && !["with", "that", "this", "from", "have", "been", "will", "your", "their", "them", "they"].includes(w)),
  );
  const wordsB = new Set(
    b.split(/\s+/).filter((w) => w.length > 3 && !["with", "that", "this", "from", "have", "been", "will", "your", "their", "them", "they"].includes(w)),
  );

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap++;
  }

  return overlap / Math.min(wordsA.size, wordsB.size);
}

// ─── Report Generation ───────────────────────────────

function generateReport(findings: Finding[], baseline: Baseline, assetCount: number, isPartial: boolean = false, missingAssets: string[] = []): string {
  // Deduplicate findings by message
  const dedup = (arr: Finding[]): Finding[] => {
    const seen = new Set<string>();
    return arr.filter((f) => {
      if (seen.has(f.message)) return false;
      seen.add(f.message);
      return true;
    });
  };

  const consistent = dedup(findings.filter((f) => f.category === "consistent"));
  const inconsistencies = dedup(findings.filter((f) => f.category === "inconsistency"));
  const fixes = inconsistencies
    .filter((f) => f.priority)
    .sort((a, b) => (a.priority || 3) - (b.priority || 3));

  // Add remaining inconsistencies without explicit priority as lower-priority fixes
  const fixMessages = new Set(fixes.map((f) => f.message));
  const additionalFixes = inconsistencies.filter((f) => !fixMessages.has(f.message));
  const allFixes = [...fixes, ...additionalFixes];

  // Overall assessment
  const totalChecks = consistent.length + inconsistencies.length;
  const consistencyRate = totalChecks > 0 ? Math.round((consistent.length / totalChecks) * 100) : 0;

  let assessment: string;
  if (inconsistencies.length === 0) {
    assessment = `All ${assetCount} assets checked. No inconsistencies detected. The launch package is well-aligned across brand name, positioning, claims, audience, platform strategy, and tone.`;
  } else if (inconsistencies.length <= 2) {
    assessment = `${assetCount} assets checked. ${consistent.length} consistency checks passed, ${inconsistencies.length} minor issue${inconsistencies.length === 1 ? "" : "s"} detected. The launch package is mostly aligned with a few areas to review.`;
  } else {
    assessment = `${assetCount} assets checked. ${consistent.length} consistency checks passed, ${inconsistencies.length} issues detected. Review the inconsistencies below before launching — some may affect how the product is perceived across different platforms.`;
  }

  const consistentList = consistent.length > 0
    ? consistent.map((f) => `- ${f.message}`).join("\n")
    : "- No consistency checks passed (this usually means not enough assets are generated yet)";

  const inconsistencyList = inconsistencies.length > 0
    ? inconsistencies.map((f) => `- ${f.message}`).join("\n")
    : "- No inconsistencies detected";

  const fixList = allFixes.length > 0
    ? allFixes.map((f, i) => `${i + 1}. ${f.message}`).join("\n")
    : "No fixes needed at this time.";

  const partialNotice = isPartial
    ? `\n> **Partial check:** Only ${assetCount}/6 core assets present. Missing: ${missingAssets.join(", ")}. Consistency rate reflects only the assets checked.\n`
    : "";

  return `# Consistency Report
${partialNotice}
## Overall assessment
${assessment}

**Consistency rate: ${consistencyRate}%** (${consistent.length}/${totalChecks} checks passed)${isPartial ? " *(partial — not all assets present)*" : ""}

## What is consistent
${consistentList}

## Detected inconsistencies
${inconsistencyList}

## High-priority fixes
${fixList}

## Suggested normalized brand/message baseline
- **Product name:** ${baseline.productName || "(not detected)"}
- **Core one-liner:** ${baseline.oneLiner || "(not found)"}
- **Core tagline:** ${baseline.tagline || "(not found)"}
- **Core audience:** ${baseline.audience || "(not specified)"}
- **Core proof/claim language:** ${baseline.claimLanguage.length > 0 ? baseline.claimLanguage.join(", ") : "(none detected)"}
`;
}
