import * as path from "path";
import { readContext } from "../lib/config";
import { readFile, writeFile, assetsDir } from "../lib/fs";
import { capitalize, stripTrailingPeriod, inferProductName, bestDescription, ProductCategory, audienceVariants } from "../lib/text";
import { ScanContext } from "../types";

export async function packageProject(options?: { ai?: boolean }): Promise<Array<{ asset: string; status: string }>> {
  const context = readContext();
  if (!context || !context.url) {
    console.error("No scan context found. Run `vlaunch scan` first.");
    process.exit(1);
  }

  const positioning = readFile(path.join(assetsDir(), "positioning.md"));
  if (!positioning) {
    console.error("No positioning found. Run `vlaunch position` first.");
    process.exit(1);
  }

  const routingPlan = readFile(path.join(assetsDir(), "routing-plan.md"));
  if (!routingPlan) {
    console.error("No routing plan found. Run `vlaunch route` first.");
    process.exit(1);
  }

  const dir = assetsDir();

  writeFile(path.join(dir, "producthunt.md"), generateProductHunt(context, positioning));
  console.log("Generated .vlaunch/assets/producthunt.md");

  writeFile(path.join(dir, "medium-draft.md"), generateMediumDraft(context, positioning));
  console.log("Generated .vlaunch/assets/medium-draft.md");

  writeFile(path.join(dir, "directories.json"), generateDirectories(context, routingPlan));
  console.log("Generated .vlaunch/assets/directories.json");

  writeFile(path.join(dir, "affiliate.md"), generateAffiliate(context));
  console.log("Generated .vlaunch/assets/affiliate.md");

  const enhanceResults: Array<{ asset: string; status: string }> = [];

  if (options?.ai) {
    try {
      const { createProvider } = require("../lib/ai/provider");
      const { enhanceAssets, printEnhanceSummary } = require("../lib/ai/enhance");
      const { producthuntPrompt } = require("../lib/ai/prompts/producthunt");
      const { mediumPrompt } = require("../lib/ai/prompts/medium");
      const { directoriesPrompt } = require("../lib/ai/prompts/directories");
      const { affiliatePrompt } = require("../lib/ai/prompts/affiliate");
      const provider = createProvider();
      const results = await enhanceAssets(provider, [
        { contract: producthuntPrompt, filename: "producthunt.md" },
        { contract: mediumPrompt, filename: "medium-draft.md" },
        { contract: directoriesPrompt, filename: "directories.json" },
        { contract: affiliatePrompt, filename: "affiliate.md" },
      ]);
      printEnhanceSummary(results);
      enhanceResults.push(...results);
    } catch (err: any) {
      console.error(`[ai] Enhancement failed: ${err?.message || err}`);
      console.log("[ai] Phase-1 outputs preserved.");
    }
  }

  return enhanceResults;
}

function extractSection(markdown: string, heading: string): string {
  const pattern = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = markdown.match(pattern);
  return match ? match[1].trim() : "";
}

// ─── Helpers ──────────────────────────────────────────

function ctx(context: ScanContext) {
  const { fetched } = context;
  const category = (context.category || "general") as ProductCategory;
  const name = inferProductName(context.url, context.description, fetched?.title);
  const audience = context.targetAudience.toLowerCase();
  let desc = bestDescription(context.description, fetched?.metaDescription, name);

  // Category-specific description rewrites
  if (category === "sports_analytics") {
    desc = `an AI-powered football intelligence platform covering the Premier League, Bundesliga, Serie A, La Liga, and Ligue 1 — with 1x2 predictions, handicap analysis, and over/under signals you can verify against a published track record`;
  }
  // spirituality_wellness keeps the original desc (no rewrite needed)

  const isDevTool = category === "developer_tool" || category === "launch_tool";
  return { name, audience, desc, category, isDevTool };
}

// ─── Product Hunt ─────────────────────────────────────

function generateProductHunt(context: ScanContext, positioning: string): string {
  const { name, audience, desc, category, isDevTool } = ctx(context);
  const oneLiner = extractSection(positioning, "One-liner");
  const shortDesc = extractSection(positioning, "Short Description");
  const problem = extractSection(positioning, "Problem");

  const firstComment = isDevTool
    ? generateDevToolPHComment(name, audience, desc, context.url)
    : generateProductPHComment(name, audience, desc, problem, context.url, category);

  return `# Product Hunt Draft

## Name
${name}

## Tagline
${oneLiner}

## Short Pitch
${shortDesc}

## First Comment
${firstComment}

## Launch Checklist
- [ ] Product name and tagline finalized
- [ ] Product page complete on Product Hunt
- [ ] Logo uploaded (240x240)
- [ ] Gallery images ready (1270x760, 3-5 images)
- [ ] Demo video or GIF (optional but recommended)
- [ ] First comment written and reviewed
- [ ] Launch day picked (Tuesday-Thursday recommended)
- [ ] Hunter confirmed (if using one)
- [ ] Team and supporters notified with launch link
- [ ] Social posts queued for launch morning
`;
}

function generateDevToolPHComment(name: string, audience: string, desc: string, url: string): string {
  return `Hi PH — maker here.

We built ${name} to be ${desc}. But we kept noticing the same pattern: the product would be ready, and then launch prep would take longer than the build.

So we built a CLI that handles the launch prep in one command:

\`\`\`
vlaunch run --url "${url}" --description "..." --audience "${audience}"
\`\`\`

That generates positioning, platform routing, channel-specific drafts, and a readiness checklist — all as local files you can edit and ship.

Would genuinely love feedback:
- Does this match how you think about launch prep?
- What's the part of launching that wastes the most of your time?

${url}`;
}

function generateProductPHComment(name: string, audience: string, desc: string, problem: string, url: string, category: ProductCategory): string {
  const aud = audienceVariants(audience);

  const descFollowUp = category === "sports_analytics"
    ? ` Every signal comes with the reasoning behind it, and we publish our track record so you can judge for yourself whether the analysis holds up.`
    : category === "spirituality_wellness"
    ? ` The interpretations are grounded in traditional knowledge and tailored to your specific chart — not generic horoscope-style output.`
    : ``;

  return `Hi PH — maker here.

We built ${name} because ${aud.short} deserve better tools than what's currently available — and most existing options are either too generic or not designed with ${aud.noun} in mind.

${name} is ${desc}.${descFollowUp}

${problem ? `The core problem we're solving:\n${problem}` : ""}

We're early and building in the open. Would genuinely love feedback from this community:
1. Does this solve a real problem for you?
2. What would make it more useful?

Check it out: ${url}`;
}

// ─── Medium ───────────────────────────────────────────

function generateMediumDraft(context: ScanContext, positioning: string): string {
  const { name, audience, desc, isDevTool } = ctx(context);
  const problem = extractSection(positioning, "Problem");
  const solution = extractSection(positioning, "Solution");
  const whyNow = extractSection(positioning, "Why Now");

  const aud = audienceVariants(audience);

  const title = isDevTool
    ? `How ${name} went from product to launch-ready in one command`
    : `Why we built ${name} — and what ${aud.short} get from it`;

  const subtitle = isDevTool
    ? `${capitalize(desc)} — and now it comes with a launch toolkit built for ${aud.short}.`
    : extractSection(positioning, "Tagline") || `${capitalize(desc)}.`;

  const intro = isDevTool
    ? `${name} is ${desc}. But shipping a great product is only half the job — the other half is making sure people find out about it.\n\nWhere do you post first? What do you write for each platform? We've been through this cycle enough times to know: launch prep is real work, and it doesn't have good tooling yet.`
    : `We started building ${name} because we kept running into the same frustration: ${aud.short} are underserved by the tools available to them.\n\nThe existing options are either too generic, lack transparency, or force users to stitch together multiple sources just to get a clear picture. We wanted to build something that treats ${aud.noun} as the primary user — not an afterthought.`;

  const { category } = ctx(context);
  const whatWeBuiltFollowUp = category === "spirituality_wellness"
    ? `We focused on building something ${aud.short} would return to — not a novelty you try once. That means readings with real interpretive depth, transparent reasoning, and respect for the tradition behind the analysis.`
    : category === "sports_analytics"
    ? `We focused on building something ${aud.short} would reach for regularly — not a novelty you try once. That means structured outputs, published track records where possible, and clear reasoning behind every signal.`
    : `We focused on building something ${aud.short} would reach for regularly — not a novelty you try once.`;

  const whatWeBuilt = isDevTool
    ? `${name} includes a CLI-powered launch engine. Give it three inputs — your project URL, a short description, and your target audience — and it generates a structured launch package.\n\nEverything outputs to a local \`.vlaunch/\` directory as markdown and JSON files. You own the files. No accounts, no dashboards, no lock-in.`
    : `${solution}\n\n${whatWeBuiltFollowUp}`;

  return `# Medium Draft

## Title
${title}

## Subtitle
${subtitle}

---

## Intro

${intro}

## The Problem

${problem}

## What We Built

${whatWeBuilt}

## Why Now

${whyNow}

## What's Next

${name} is early. We're building in the open and listening to what ${aud.short} actually need. If this resonates, we'd love your input on what to prioritize next.

Try it: ${context.url}

---

*Tags: ${aud.short}, ${name.toLowerCase()}, launch*
`;
}

// ─── Directories ──────────────────────────────────────

function generateDirectories(context: ScanContext, routingPlan: string): string {
  const { name, audience, desc, isDevTool } = ctx(context);
  const platforms = extractRecommendedPlatforms(routingPlan);

  const entries = platforms.map((p, i) => {
    const category = inferPlatformCategory(p.name);
    const suggested = isDevTool
      ? directoryDescDevTool(name, desc, audience, category, context.url)
      : directoryDescProduct(name, desc, audience, category, context.url);

    return {
      name: p.name,
      category,
      priority: i + 1,
      suggested_description: suggested,
      reason: p.reason,
    };
  });

  return JSON.stringify(entries, null, 2);
}

function directoryDescDevTool(name: string, desc: string, audience: string, category: string, url: string): string {
  const descriptions: Record<string, string> = {
    launch: `${name} — ${desc}. Includes a CLI launch engine that generates positioning, distribution plans, and launch-ready drafts. Built for ${audience}.`,
    content: `${name}: ${desc}. Helps ${audience} prepare structured launch content without starting from a blank page.`,
    community: `${name} is ${desc}. Looking for feedback from ${audience}.`,
    social: `${capitalize(desc)}. A CLI-first launch prep tool for ${audience}. ${url}`,
    partnership: `${name}: ${desc}. Looking for partners who serve ${audience}.`,
  };
  return descriptions[category] || `${name} — ${desc}. Built for ${audience}. ${url}`;
}

function directoryDescProduct(name: string, desc: string, audience: string, category: string, url: string): string {
  const aud = audienceVariants(audience);
  const descriptions: Record<string, string> = {
    launch: `${name} — ${desc}. Designed for ${aud.short} who want data-driven results.`,
    content: `${name}: ${desc}. Gives ${aud.short} the insights and tools they need.`,
    community: `${name} is ${desc}. Built for ${aud.short} — feedback welcome.`,
    social: `${capitalize(desc)}. Built for ${aud.short}. ${url}`,
    partnership: `${name}: ${desc}. Looking for partners who reach ${aud.noun}.`,
    niche_community: `${name} — ${desc}. Purpose-built for ${aud.short} who want a real edge.`,
  };
  return descriptions[category] || `${name} — ${desc}. Built for ${aud.short}. ${url}`;
}

function extractRecommendedPlatforms(routingPlan: string): Array<{ name: string; reason: string }> {
  const lines = routingPlan.split("\n");
  const platforms: Array<{ name: string; reason: string }> = [];

  for (const line of lines) {
    const match = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s+—\s+(.+)$/);
    if (match) {
      platforms.push({ name: match[1], reason: match[2] });
    }
  }

  return platforms.length > 0 ? platforms : [
    { name: "Product Hunt", reason: "Primary launch platform" },
    { name: "Medium", reason: "Long-form content" },
    { name: "Reddit", reason: "Community engagement" },
    { name: "X (Twitter)", reason: "Social reach" },
    { name: "Affiliate / Review Partners", reason: "Partnership channel" },
  ];
}

function inferPlatformCategory(platformName: string): string {
  const categories: Record<string, string> = {
    "Product Hunt": "launch",
    "Medium": "content",
    "Reddit": "community",
    "X (Twitter)": "social",
    "Hacker News": "community",
    "AI Directories": "launch",
    "Indie Hackers": "community",
    "Dev.to": "content",
    "LinkedIn": "social",
    "YouTube": "content",
    "Affiliate / Review Partners": "partnership",
    "Sports / Betting Forums": "niche_community",
    "Telegram / Discord Communities": "niche_community",
  };
  return categories[platformName] || "general";
}

// ─── Affiliate ────────────────────────────────────────

function generateAffiliate(context: ScanContext): string {
  const { name, audience, desc, isDevTool } = ctx(context);
  const aud = audienceVariants(audience);

  const whyPromote = isDevTool
    ? `Every ${audience.replace(/s$/, "")} who ships a product hits the same wall: the build is done, but launch prep takes days. ${name} fixes that with a CLI that generates a full launch package from three inputs.`
    : `${capitalize(aud.short)} are actively looking for better tools. ${name} is ${desc}. Your audience will recognize the problem immediately — and ${name} gives them a concrete solution.`;

  return `# Affiliate Draft

## Program Headline
Help ${aud.short} discover ${name} — and earn on every referral

## Why Promote This Product
${whyPromote}

Your audience already knows this pain. Recommending ${name} isn't a hard sell — it's pointing them to a tool they'll actually use.

## Ideal Affiliate Partner
- **Newsletter authors** who write for ${aud.short}
- **YouTube creators** covering topics relevant to ${aud.noun}
- **Community leaders** in forums, Discords, or groups where ${aud.short} hang out
- **Bloggers** who write reviews, comparisons, or how-to content for ${aud.noun}
- **Educators** teaching skills relevant to ${aud.short}

## Suggested Commission Structure
<!-- Adjust based on your pricing model -->
- **Recurring:** 25% commission for the first 12 months per referred customer
- **One-time:** $[X] flat bonus per converted signup
- **Tiered:** Higher rates for partners who drive 10+ conversions/month
- **Perks:** Early access to new features, co-marketing opportunities, dedicated partner support

## Outreach Template

**Subject:** Partnering on ${name} — built for ${aud.short}

Hi [Name],

I've been following your [newsletter / channel / community] and your audience overlaps almost perfectly with who we built ${name} for.

${name} is ${desc}. We're looking for a small number of partners who genuinely reach ${aud.noun} and would recommend something they'd actually use.

Would you be open to checking it out? Happy to set up a free account and walk you through it.

${context.url}

Best,
[Your name]
`;
}
