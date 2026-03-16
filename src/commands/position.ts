import * as path from "path";
import { readContext } from "../lib/config";
import { writeFile, assetsDir } from "../lib/fs";
import { capitalize, inferProductName, inferTaglineFromMeta, bestDescription, ProductCategory, audienceVariants } from "../lib/text";
import { ScanContext } from "../types";

export async function positionProject(options?: { ai?: boolean }): Promise<Array<{ asset: string; status: string }>> {
  const context = readContext();
  if (!context || !context.url) {
    console.error("No scan context found. Run `vlaunch scan` first.");
    process.exit(1);
  }

  const positioning = generatePositioning(context);
  const outputPath = path.join(assetsDir(), "positioning.md");
  writeFile(outputPath, positioning);
  console.log("Generated .vlaunch/assets/positioning.md");

  const results: Array<{ asset: string; status: string }> = [];

  if (options?.ai) {
    try {
      const { createProvider } = require("../lib/ai/provider");
      const { enhanceAsset, printEnhanceSummary } = require("../lib/ai/enhance");
      const { positioningPrompt } = require("../lib/ai/prompts/positioning");
      const provider = createProvider();
      const result = await enhanceAsset(provider, positioningPrompt, context, "positioning.md");
      printEnhanceSummary([result]);
      results.push(result);
    } catch (err: any) {
      console.error(`[ai] Enhancement failed: ${err?.message || err}`);
      console.log("[ai] Phase-1 output preserved.");
    }
  }

  return results;
}

function generatePositioning(context: ScanContext): string {
  const { url, targetAudience, fetched } = context;
  const category = (context.category || "general") as ProductCategory;
  const audience = targetAudience.toLowerCase();
  const name = inferProductName(url, context.description, fetched?.title);
  const desc = bestDescription(context.description, fetched?.metaDescription, name);
  const metaTagline = inferTaglineFromMeta(fetched?.title, fetched?.metaDescription);

  if (category === "launch_tool" || category === "developer_tool") {
    return generateDevToolPositioning(name, desc, audience, url, metaTagline, fetched?.metaDescription);
  }

  return generateProductPositioning(name, desc, audience, url, category, metaTagline, fetched?.metaDescription);
}

function generateDevToolPositioning(
  name: string, desc: string, audience: string, url: string,
  metaTagline: string | null, hasMeta?: string,
): string {
  const oneLiner = metaTagline
    ? `${name}: ${metaTagline}`
    : `${name} generates your entire launch package from the command line — positioning, platform plan, drafts, and checklist — while you keep building.`;

  const tagline = metaTagline
    ? `${metaTagline} — now with a structured launch toolkit for ${audience}.`
    : `Ship your product and your launch prep at the same time.`;

  const longDescOpener = hasMeta
    ? `${name} is ${desc}. But getting the word out is a different challenge.`
    : `${capitalize(audience)} are great at building. The part that breaks momentum is everything that comes after.`;

  return `# Positioning

## One-liner
${oneLiner}

## Tagline
${tagline}

## Short Description
${name} is ${desc}. Built for ${audience}, it pairs the product with a CLI-first launch engine that generates positioning, distribution routing, platform-specific drafts, and a readiness checklist — all as editable local files.

## Long Description
${longDescOpener}

Figuring out where to launch, writing the right copy for each platform, making sure nothing gets missed — that work is fragmented and manual. ${name} handles it. Run a single command and get a complete launch package as markdown and JSON files in a local \`.vlaunch/\` directory.

No accounts to create. No dashboards to learn. No vendor lock-in. The outputs live in your project directory, under version control, right next to the code.

${url}

## Problem
${capitalize(audience)} can ship fast, but launch prep takes days of scattered work: researching platforms, writing taglines, drafting Product Hunt comments, preparing directory submissions, and building checklists from scratch. Every launch starts from zero, and the work is never reusable.

## Solution
${name} compresses that process into a single CLI pipeline. It reads your project context and generates each launch asset in sequence — from positioning to final checklist. Every output follows a consistent structure, so you can review, edit, and publish without starting from a blank page.

## Why Now
The rise of vibe coding and AI-assisted development means more products ship faster than ever. But launch tooling has not kept up — builders still prepare launches manually. ${name} closes that gap by making launch prep as fast and file-based as the build itself.
`;
}

function generateProductPositioning(
  name: string, desc: string, audience: string, url: string,
  category: ProductCategory, metaTagline: string | null, hasMeta?: string,
): string {
  const aud = audienceVariants(audience);
  const categoryContext = getCategoryContext(category, audience);

  // Allow category to override one-liner, tagline, and description
  const effectiveDesc = categoryContext.rewriteDesc
    ? categoryContext.rewriteDesc(name, desc)
    : desc;

  const oneLiner = categoryContext.oneLiner
    ? categoryContext.oneLiner(name)
    : metaTagline
      ? `${name} — ${metaTagline}`
      : `${name}: ${effectiveDesc}`;

  const tagline = categoryContext.tagline
    ? categoryContext.tagline(name)
    : metaTagline || capitalize(effectiveDesc);

  const shortDesc = hasMeta
    ? `${name} is ${effectiveDesc}. Built for ${aud.short} who want ${categoryContext.want}.`
    : `${capitalize(effectiveDesc)}. Designed for ${aud.short} who want ${categoryContext.want}.`;

  const longDescOpener = hasMeta
    ? `${name} is ${effectiveDesc}.`
    : `${capitalize(effectiveDesc)}.`;

  return `# Positioning

## One-liner
${oneLiner}

## Tagline
${tagline}

## Short Description
${shortDesc}

## Long Description
${longDescOpener}

${capitalize(aud.short)} ${categoryContext.pain}. ${name} addresses that by giving ${aud.pronoun} ${categoryContext.value}.

${url}

## Problem
${capitalize(aud.full)} ${categoryContext.problem}

## Solution
${name} ${categoryContext.solution}

## Why Now
${categoryContext.whyNow(name, audience)}
`;
}

interface CategoryContext {
  want: string;
  pain: string;
  value: string;
  problem: string;
  solution: string;
  whyNow: (name: string, audience: string) => string;
  oneLiner?: (name: string) => string;
  tagline?: (name: string) => string;
  rewriteDesc?: (name: string, desc: string) => string;
}

function getCategoryContext(category: ProductCategory, _audience: string): CategoryContext {
  switch (category) {
    case "sports_analytics":
      return {
        oneLiner: (name) => `${name} — verification-first football intelligence for the top European leagues`,
        tagline: (_name) => `Evidence-based football analysis with a published track record`,
        rewriteDesc: (_name, _desc) =>
          `an AI-powered football intelligence platform covering the Premier League, Bundesliga, Serie A, La Liga, and Ligue 1 — with 1x2 predictions, handicap analysis, and over/under signals you can verify against a published track record`,
        want: "transparent AI signals they can verify, not gut feelings or anonymous tipsters",
        pain: "are stuck stitching together scattered stats, inconsistent tipsters, and opaque models — with no way to verify what actually works",
        value: "a football intelligence platform that surfaces structured predictions and lets users evaluate the reasoning behind every signal",
        problem: "face a fragmented landscape of prediction tools. Most lack transparency, published track records, or coverage across multiple leagues. Getting a clear, data-driven view means pulling from multiple sources and doing the analysis manually.",
        solution: "consolidates AI-driven predictions, odds analysis, and historical performance tracking into one platform. It covers the top European leagues, provides structured match-level insights, and publishes its track record so users can judge signal quality for themselves.",
        whyNow: (name, _audience) =>
          `Football data has become far richer, and AI models can now process it at a scale tipsters and spreadsheets cannot. ${name} arrives as the gap between available data and accessible analysis is at its widest — users who want predictive intelligence, not just raw stats, finally have a realistic option.`,
      };

    case "spirituality_wellness":
      return {
        oneLiner: (name) => `${name} — modern access to traditional wisdom, powered by AI`,
        tagline: (_name) => `Personalized readings grounded in ancient tradition, interpreted for modern life`,
        rewriteDesc: (_name, desc) => desc,
        want: "clarity and personal insight grounded in a tradition they trust",
        pain: "struggle to find readings that feel both authentic and personally relevant — most tools are shallow, generic, or disconnected from the tradition they claim to represent",
        value: "AI-assisted interpretation that respects the depth of the tradition while making it accessible and personally meaningful",
        problem: "face a gap between traditional practitioners (hard to access, expensive, inconsistent quality) and generic online tools (superficial, one-size-fits-all, no real interpretive depth). Finding trustworthy, personalized guidance means either deep self-study or luck in finding the right practitioner.",
        solution: "bridges that gap by combining structured traditional knowledge with AI-powered personalization. It generates detailed, individually tailored readings and makes the interpretive reasoning transparent — so users can learn from the tradition, not just consume a result.",
        whyNow: (name, _audience) =>
          `Interest in traditional wisdom systems is rising, but access remains uneven. AI is now capable enough to handle the interpretive complexity these traditions require — not just pattern matching, but contextual, personalized analysis. ${name} brings that capability to a practice that has been underserved by technology until now.`,
      };

    case "ai_product":
      return {
        want: "AI that delivers real results, not just demos",
        pain: "are tired of tools that promise AI but deliver generic outputs that still need heavy manual work",
        value: "an AI-first workflow that produces actionable results out of the box",
        problem: "have tried AI tools that underdeliver — slow, generic, or too complex to integrate into their existing workflow. The gap between AI hype and AI utility is real.",
        solution: "closes that gap by focusing on practical output quality. It integrates AI where it matters and stays out of the way where it doesn't.",
        whyNow: (name, aud) =>
          `AI tooling has matured enough to deliver real value, not just novelty. ${name} arrives at the right time for ${aud} who are ready to adopt AI as a serious part of their workflow.`,
      };

    case "saas":
      return {
        want: "a focused tool that solves their problem without unnecessary complexity",
        pain: "deal with bloated platforms that try to do everything and do nothing well",
        value: "a streamlined product that does one thing exceptionally",
        problem: "waste time and money on tools that are overbuilt for their needs. Switching costs are high, onboarding is slow, and most features go unused.",
        solution: "takes a focused approach — solving the core problem well, with a clean interface and fast onboarding. No feature bloat, no learning curve.",
        whyNow: (name, aud) =>
          `${capitalize(aud)} are increasingly choosing focused tools over all-in-one platforms. ${name} meets that demand with a product that respects their time and workflow.`,
      };

    default:
      return {
        want: "a better way to get results",
        pain: "are underserved by existing tools that are either too complex, too generic, or too expensive",
        value: "a focused product built specifically for their needs",
        problem: "lack a dedicated solution that fits their workflow. Existing alternatives miss the mark — too broad, too complicated, or not designed with this audience in mind.",
        solution: "fills that gap with a purpose-built product that gives them exactly what they need.",
        whyNow: (name, aud) =>
          `The market for tools serving ${aud} is growing. ${name} is well-positioned to capture early demand by shipping a focused, high-quality product before incumbents adapt.`,
      };
  }
}
