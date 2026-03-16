/**
 * Prompt contract for routing-plan.md enhancement.
 *
 * Takes the phase-1 routing plan + scan context + positioning,
 * asks the LLM to rewrite platform recommendations with
 * product-specific reasoning and a more strategic launch sequence.
 */

import { PromptContract } from "./types";
import { ScanContext } from "../../../types";
import * as path from "path";
import { readFile, assetsDir } from "../../fs";

const SYSTEM = `You are a product launch strategist. You rewrite distribution routing plans to be more specific, strategic, and actionable.

Rules:
- Output ONLY the final markdown document. No commentary, no preamble, no explanation.
- Preserve the exact markdown structure:
  # Routing Plan
  ## Recommended Platforms
  ## Why These Platforms
  ## Priority Order
  ## Suggested Launch Sequence
  ## Avoid for Now
- Recommended Platforms: list 5-7 platforms, numbered. Format each as: \`1. **Platform Name** — One-sentence reason specific to this product.\`
- The reasons must be specific to the product, category, and audience — not generic descriptions of the platform.
- Why These Platforms: 2-3 sentences explaining the routing strategy for this specific product. Reference the product category, audience behavior, and content format fit.
- Priority Order: numbered list matching the recommended platforms.
- Suggested Launch Sequence: 3-4 weeks. Each bullet should explain the specific action and why it matters at that stage. Be concrete — mention subreddit types, video formats, community styles, not just platform names.
- Avoid for Now: 3-5 specific recommendations with brief explanations. Should reflect the product category — e.g. a sports analytics product should avoid general tech communities, not just "paid advertising."
- Do not recommend platforms that are clearly irrelevant to the product category.
- Do not use generic platform descriptions ("high engagement", "viral potential") — explain why THIS product fits THIS platform.
- Keep the product URL and audience from the input.`;

export const routingPrompt: PromptContract = {
  assetName: "routing-plan",

  systemPrompt: SYSTEM,

  buildUserPrompt(context: ScanContext, phase1Output: string): string {
    const meta = context.fetched;
    const metaBlock = meta
      ? `Website title: ${meta.title}
Meta description: ${meta.metaDescription}
Domain: ${meta.domain}`
      : "(no website metadata available)";

    const positioningPath = path.join(assetsDir(), "positioning.md");
    const positioning = readFile(positioningPath) || "(no positioning available)";

    return `Rewrite this routing plan with product-specific platform recommendations and strategic reasoning.

## Scan Context
- URL: ${context.url}
- CLI description: ${context.description}
- Target audience: ${context.targetAudience}
- Detected category: ${context.category || "general"}

## Website Metadata
${metaBlock}

## Current Positioning (use for context)
${positioning}

## Phase 1 Draft (rewrite this)
${phase1Output}`;
  },

  parseResponse(raw: string): string | null {
    const trimmed = raw.trim();

    const unwrapped = trimmed
      .replace(/^```(?:markdown|md)?\s*\n?/i, "")
      .replace(/\n?```\s*$/, "")
      .trim();

    if (!unwrapped.includes("# Routing Plan")) {
      return null;
    }

    const required = ["Recommended Platforms", "Why These Platforms", "Priority Order", "Suggested Launch Sequence", "Avoid for Now"];
    const found = required.filter(s => unwrapped.includes(`## ${s}`));
    if (found.length < 4) {
      return null;
    }

    return unwrapped + "\n";
  },
};
