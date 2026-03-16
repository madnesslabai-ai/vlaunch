/**
 * Prompt contract for checklist.md enhancement.
 *
 * Takes the phase-1 checklist + scan context + all generated assets,
 * asks the LLM to produce a product-aware launch readiness assessment
 * with specific strengths, gaps, and prioritized next actions.
 */

import { PromptContract } from "./types";
import { ScanContext } from "../../../types";
import * as path from "path";
import { readFile, assetsDir } from "../../fs";

const SYSTEM = `You are a launch readiness coach. You review a product's generated launch assets and produce a practical, product-specific launch checklist.

Rules:
- Output ONLY the final markdown document. No commentary, no preamble, no explanation.
- Use this exact structure:

  # Launch Checklist

  ## Current strengths
  (bulleted list)

  ## Missing or weak areas
  (bulleted list)

  ## Recommended next actions
  (numbered list, 5-8 items)

  ## Launch readiness status
  (1-3 sentences)

- Current strengths: identify 4-6 specific things that are already strong based on the actual asset content. Reference concrete details — specific taglines, platform choices, narrative angles — not generic praise.
- Missing or weak areas: identify 4-8 gaps or weaknesses. Be specific about what's missing. Common gaps include: screenshots, demo video, pricing clarity, social proof, testimonials, landing page CTA, platform accounts, launch day plan. Only mention gaps that are plausible given the product — do not state them as confirmed facts, use phrasing like "likely needed" or "not yet visible in the assets."
- Recommended next actions: 5-8 prioritized, actionable steps. Each should be concrete enough that someone could act on it today. Order by impact. Reference specific platforms from the routing plan when relevant.
- Launch readiness status: honest 1-3 sentence assessment. State what percentage of the launch package is in place, what the biggest blocker is, and whether this product is ready for a soft launch vs. needs more preparation.
- Focus on the target product, not on vLaunch as a tool.
- Do not invent assets or features that aren't present in the inputs.
- Do not use generic advice when product-specific advice is possible.`;

export const checklistPrompt: PromptContract = {
  assetName: "checklist",

  systemPrompt: SYSTEM,

  buildUserPrompt(context: ScanContext, phase1Output: string): string {
    const meta = context.fetched;
    const metaBlock = meta
      ? `Website title: ${meta.title}
Meta description: ${meta.metaDescription}
Domain: ${meta.domain}`
      : "(no website metadata available)";

    const dir = assetsDir();
    const positioning = readFile(path.join(dir, "positioning.md")) || "(not generated)";
    const producthunt = readFile(path.join(dir, "producthunt.md")) || "(not generated)";
    const mediumDraft = readFile(path.join(dir, "medium-draft.md")) || "(not generated)";
    const routingPlan = readFile(path.join(dir, "routing-plan.md")) || "(not generated)";
    const directories = readFile(path.join(dir, "directories.json")) || "(not generated)";
    const affiliate = readFile(path.join(dir, "affiliate.md")) || "(not generated)";

    return `Review these launch assets and produce a product-specific launch readiness checklist.

## Scan Context
- URL: ${context.url}
- CLI description: ${context.description}
- Target audience: ${context.targetAudience}
- Detected category: ${context.category || "general"}

## Website Metadata
${metaBlock}

## Generated Assets

### positioning.md
${positioning}

### producthunt.md
${producthunt}

### medium-draft.md
${mediumDraft}

### routing-plan.md
${routingPlan}

### directories.json
${directories}

### affiliate.md
${affiliate}

## Phase 1 Checklist (rewrite this)
${phase1Output}`;
  },

  parseResponse(raw: string): string | null {
    const trimmed = raw.trim();

    const unwrapped = trimmed
      .replace(/^```(?:markdown|md)?\s*\n?/i, "")
      .replace(/\n?```\s*$/, "")
      .trim();

    if (!unwrapped.includes("# Launch Checklist")) {
      return null;
    }

    const required = ["Current strengths", "Missing or weak areas", "Recommended next actions", "Launch readiness status"];
    const found = required.filter(s => unwrapped.includes(`## ${s}`));
    if (found.length < 3) {
      return null;
    }

    return unwrapped + "\n";
  },
};
