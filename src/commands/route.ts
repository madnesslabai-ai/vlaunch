import * as path from "path";
import { readContext } from "../lib/config";
import { readFile, writeFile, assetsDir } from "../lib/fs";
import { ProductCategory } from "../lib/text";
import { ScanContext } from "../types";

interface Platform {
  name: string;
  reason: string;
}

interface PlatformDef extends Platform {
  keywords: string[];
  excludeCategories?: ProductCategory[];
  boostCategories?: ProductCategory[];
}

export async function routeProject(options?: { ai?: boolean }): Promise<Array<{ asset: string; status: string }>> {
  const context = readContext();
  if (!context || !context.url) {
    console.error("No scan context found. Run `vlaunch scan` first.");
    process.exit(1);
  }

  const positioningPath = path.join(assetsDir(), "positioning.md");
  const positioning = readFile(positioningPath);
  if (!positioning) {
    console.error("No positioning found. Run `vlaunch position` first.");
    process.exit(1);
  }

  const routingPlan = generateRoutingPlan(context, positioning);
  const outputPath = path.join(assetsDir(), "routing-plan.md");
  writeFile(outputPath, routingPlan);
  console.log("Generated .vlaunch/assets/routing-plan.md");

  const results: Array<{ asset: string; status: string }> = [];

  if (options?.ai) {
    try {
      const { createProvider } = require("../lib/ai/provider");
      const { enhanceAsset, printEnhanceSummary } = require("../lib/ai/enhance");
      const { routingPrompt } = require("../lib/ai/prompts/routing");
      const provider = createProvider();
      const result = await enhanceAsset(provider, routingPrompt, context, "routing-plan.md");
      printEnhanceSummary([result]);
      results.push(result);
    } catch (err: any) {
      console.error(`[ai] Enhancement failed: ${err?.message || err}`);
      console.log("[ai] Phase-1 output preserved.");
    }
  }

  return results;
}

const ALL_PLATFORMS: PlatformDef[] = [
  {
    name: "Product Hunt",
    reason: "High-visibility launch platform for new products. Strong with early adopters and tech audiences.",
    keywords: ["tool", "app", "saas", "product", "launch", "startup", "developer", "indie", "ai"],
  },
  {
    name: "X (Twitter)",
    reason: "Real-time reach and viral potential. Strong for announcements and community engagement.",
    keywords: ["indie", "hacker", "developer", "startup", "build", "launch", "product", "ai", "betting", "sports", "football"],
  },
  {
    name: "Reddit",
    reason: "Community-driven discussion. Reach niche audiences in relevant subreddits.",
    keywords: ["developer", "indie", "hacker", "startup", "open source", "tool", "community", "betting", "football", "sports", "predict", "astrology", "spiritual", "self-discovery"],
    boostCategories: ["sports_analytics", "spirituality_wellness"],
  },
  {
    name: "Medium",
    reason: "Long-form storytelling to explain the problem and solution. Good for SEO and credibility.",
    keywords: ["tool", "product", "developer", "write", "blog", "content", "indie", "hacker", "ai", "analytics"],
  },
  {
    name: "Hacker News",
    reason: "Technical audience with high engagement. Strong for developer tools and Show HN posts.",
    keywords: ["developer", "engineer", "open source", "tool", "technical", "hacker", "startup"],
    excludeCategories: ["sports_analytics", "spirituality_wellness"],
  },
  {
    name: "AI Directories",
    reason: "Curated listings for AI-powered products. Growing discovery channel.",
    keywords: ["ai", "machine learning", "llm", "gpt", "agent", "automat", "intelligent", "predict"],
  },
  {
    name: "Indie Hackers",
    reason: "Community of solo founders and small teams. Great for feedback and early traction.",
    keywords: ["indie", "hacker", "solo", "founder", "bootstrap", "saas", "side project"],
    excludeCategories: ["sports_analytics", "spirituality_wellness"],
  },
  {
    name: "Dev.to",
    reason: "Developer community blog platform. Good for technical write-ups and tutorials.",
    keywords: ["developer", "engineer", "open source", "code", "programming", "tool", "cli"],
    excludeCategories: ["sports_analytics", "saas", "spirituality_wellness"],
  },
  {
    name: "LinkedIn",
    reason: "Professional network for B2B reach and thought leadership.",
    keywords: ["enterprise", "b2b", "business", "professional", "team", "company", "saas"],
  },
  {
    name: "Affiliate / Review Partners",
    reason: "Leverage existing audiences through partnerships and sponsored reviews.",
    keywords: ["saas", "tool", "product", "app", "subscription", "launch", "growth", "betting", "sports", "tipster"],
  },
  {
    name: "YouTube",
    reason: "Video reviews, demos, and tutorials. High trust and discoverability.",
    keywords: ["betting", "sports", "football", "predict", "analytics", "ai", "tool", "app", "astrology", "spiritual", "reading", "chart"],
    boostCategories: ["sports_analytics", "spirituality_wellness"],
  },
  {
    name: "Sports / Betting Forums",
    reason: "Direct access to the target audience in niche communities. High engagement for relevant products.",
    keywords: ["betting", "football", "sports", "odds", "predict", "tipster", "handicap"],
    boostCategories: ["sports_analytics"],
  },
  {
    name: "Telegram / Discord Communities",
    reason: "Private community channels where sports bettors and traders share signals and discuss tools.",
    keywords: ["betting", "football", "sports", "odds", "predict", "trader", "tipster", "community"],
    boostCategories: ["sports_analytics"],
  },
];

function matchPlatforms(context: ScanContext, positioning: string): Platform[] {
  const category = (context.category || "general") as ProductCategory;
  const corpus = `${context.description} ${context.targetAudience} ${positioning}`.toLowerCase();

  const eligible = ALL_PLATFORMS.filter(
    (p) => !p.excludeCategories?.includes(category),
  );

  const scored = eligible.map((p) => {
    let score = p.keywords.filter((kw) => corpus.includes(kw)).length;
    if (p.boostCategories?.includes(category)) score += 3;
    return { name: p.name, reason: p.reason, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5).map(({ name, reason }) => ({ name, reason }));
}

function generateRoutingPlan(context: ScanContext, positioning: string): string {
  const platforms = matchPlatforms(context, positioning);

  const recommended = platforms
    .map((p, i) => `${i + 1}. **${p.name}** — ${p.reason}`)
    .join("\n");

  const priorityList = platforms
    .map((p, i) => `${i + 1}. ${p.name}`)
    .join("\n");

  const sequence = platforms
    .map((p, i) => {
      if (i === 0) return `- **Week 1:** Soft launch on ${p.name} — gather initial feedback`;
      if (i === 1) return `- **Week 1:** Publish story on ${p.name} — build narrative`;
      if (i === 2) return `- **Week 2:** Engage community on ${p.name} — join conversations`;
      if (i === 3) return `- **Week 2:** Announce on ${p.name} — expand reach`;
      return `- **Week 3:** Leverage ${p.name} — sustain momentum`;
    })
    .join("\n");

  return `# Routing Plan

## Recommended Platforms
${recommended}

## Why These Platforms
These platforms were selected based on the project's description ("${context.description}"), target audience (${context.targetAudience}), and positioning. Each channel aligns with where ${context.targetAudience} already spend time discovering and evaluating new products.

## Priority Order
${priorityList}

## Suggested Launch Sequence
${sequence}

## Avoid for Now
- Paid advertising — validate organic traction first
- Broad social media campaigns — focus on targeted communities
- Press outreach — build social proof before pitching journalists
- Platforms where ${context.targetAudience} are not active
`;
}
