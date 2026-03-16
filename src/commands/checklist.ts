import * as path from "path";
import { readContext } from "../lib/config";
import { fileExists, writeFile, assetsDir } from "../lib/fs";

const EXPECTED_ASSETS = [
  { file: "project-summary.md", label: "Project Summary", command: "vlaunch scan" },
  { file: "positioning.md", label: "Positioning", command: "vlaunch position" },
  { file: "routing-plan.md", label: "Routing Plan", command: "vlaunch route" },
  { file: "producthunt.md", label: "Product Hunt Draft", command: "vlaunch package" },
  { file: "medium-draft.md", label: "Medium Draft", command: "vlaunch package" },
  { file: "directories.json", label: "Directory Listings", command: "vlaunch package" },
  { file: "affiliate.md", label: "Affiliate Draft", command: "vlaunch package" },
];

const COMMON_MISSING_ITEMS = [
  "Product logo (high-res, square)",
  "Gallery images / screenshots (1270x760 for Product Hunt)",
  "Demo video or GIF walkthrough",
  "Pricing page or pricing clarity",
  "Clear call-to-action (CTA) on landing page",
  "Founder / team profile on launch platforms",
  "Social proof (testimonials, beta user quotes)",
  "Launch day support plan (who to notify, when to post)",
];

export async function checklistProject(options?: { ai?: boolean }): Promise<Array<{ asset: string; status: string }>> {
  const context = readContext();
  if (!context || !context.url) {
    console.error("No scan context found. Run `vlaunch scan` first.");
    process.exit(1);
  }

  const dir = assetsDir();

  const present: string[] = [];
  const missing: string[] = [];

  for (const asset of EXPECTED_ASSETS) {
    if (fileExists(path.join(dir, asset.file))) {
      present.push(asset.label);
    } else {
      missing.push(`${asset.label} — generate with \`${asset.command}\``);
    }
  }

  const checklist = generateChecklist(present, missing);
  const outputPath = path.join(dir, "checklist.md");
  writeFile(outputPath, checklist);
  console.log("Generated .vlaunch/assets/checklist.md");

  const results: Array<{ asset: string; status: string }> = [];

  if (options?.ai) {
    try {
      const { createProvider } = require("../lib/ai/provider");
      const { enhanceAsset, printEnhanceSummary } = require("../lib/ai/enhance");
      const { checklistPrompt } = require("../lib/ai/prompts/checklist");
      const provider = createProvider();
      const result = await enhanceAsset(provider, checklistPrompt, context, "checklist.md");
      printEnhanceSummary([result]);
      results.push(result);
    } catch (err: any) {
      console.error(`[ai] Enhancement failed: ${err?.message || err}`);
      console.log("[ai] Phase-1 output preserved.");
    }
  }

  return results;
}

function generateChecklist(present: string[], missing: string[]): string {
  const total = EXPECTED_ASSETS.length;
  const done = present.length;
  const pct = Math.round((done / total) * 100);

  const presentList = present.map((p) => `- [x] ${p}`).join("\n");

  const missingAssets = missing.length > 0
    ? missing.map((m) => `- [ ] ${m}`).join("\n")
    : "- All generated assets are present.";

  const commonItems = COMMON_MISSING_ITEMS.map((item) => `- [ ] ${item}`).join("\n");

  const nextActions = buildNextActions(missing);

  let status: string;
  if (pct === 100) {
    status = "All generated assets are in place. Review each file, fill in placeholders, and prepare supplementary materials (images, video, profiles) before launch.";
  } else if (pct >= 60) {
    status = `${pct}% of assets generated. Close to ready — run the missing commands above to complete the set.`;
  } else {
    status = `${pct}% of assets generated. Early stage — keep running commands to build out your launch package.`;
  }

  return `# Launch Checklist

## Generated Assets
${presentList}

## Missing or Incomplete Items

### Assets not yet generated
${missingAssets}

### Common pre-launch items to prepare
${commonItems}

## Recommended Next Actions
${nextActions}

## Launch Readiness Status
**${pct}% complete** (${done}/${total} assets generated)

${status}
`;
}

function buildNextActions(missing: string[]): string {
  const actions: string[] = [];

  if (missing.length > 0) {
    actions.push("Run missing commands to generate remaining assets");
  }

  actions.push(
    "Review and edit all generated markdown files — replace placeholder copy with real messaging",
    "Prepare visual assets: logo, screenshots, demo video",
    "Set up accounts on target launch platforms",
    "Draft a launch day timeline with specific post times",
    "Line up 3-5 people for early feedback and upvote support",
  );

  return actions.map((a, i) => `${i + 1}. ${a}`).join("\n");
}
