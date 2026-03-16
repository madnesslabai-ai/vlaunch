/**
 * Prompt contract for positioning.md enhancement.
 *
 * Takes the phase-1 deterministic positioning and scan context,
 * asks the LLM to rewrite it with product-specific language,
 * sharper differentiation, and a more natural voice.
 */

import { PromptContract } from "./types";
import { ScanContext } from "../../../types";

const SYSTEM = `You are a product positioning specialist. You rewrite launch positioning documents to be sharper, more specific, and more compelling.

Rules:
- Output ONLY the final markdown document. No commentary, no preamble, no explanation.
- Preserve the exact markdown structure: # Positioning, then ## One-liner, ## Tagline, ## Short Description, ## Long Description, ## Problem, ## Solution, ## Why Now
- Keep the product name, URL, and target audience accurate — do not invent facts
- Use information from the provided website metadata and phase-1 draft as your source material
- Make the one-liner punchy (under 80 characters including the product name)
- Make the tagline memorable and differentiated (under 60 characters)
- Short Description: 2-3 sentences max. Lead with what the product does, then who it's for.
- Long Description: 3-4 sentences. Expand on the short description with the core value proposition and how it works.
- Problem: 2-3 sentences. Be specific about the pain. Avoid generic "existing tools are bad" framing.
- Solution: 2-3 sentences. Describe what the product actually does differently. Be concrete.
- Why Now: 2-3 sentences. Explain the market timing or technology shift that makes this product relevant now.
- Do not use superlatives ("best", "most accurate", "revolutionary") unless they come directly from the product's own metadata
- Do not use filler phrases ("in today's world", "game-changer", "cutting-edge")
- Write in a confident, direct voice. No hedging, no fluff.`;

export const positioningPrompt: PromptContract = {
  assetName: "positioning",

  systemPrompt: SYSTEM,

  buildUserPrompt(context: ScanContext, phase1Output: string): string {
    const meta = context.fetched;
    const metaBlock = meta
      ? `Website title: ${meta.title}
Meta description: ${meta.metaDescription}
Domain: ${meta.domain}
Text preview: ${meta.extractedTextPreview?.slice(0, 500) || "(none)"}`
      : "(no website metadata available)";

    return `Rewrite this positioning document. Use the scan context and website metadata to make it more specific and compelling.

## Scan Context
- URL: ${context.url}
- CLI description: ${context.description}
- Target audience: ${context.targetAudience}
- Detected category: ${context.category || "general"}

## Website Metadata
${metaBlock}

## Phase 1 Draft (rewrite this)
${phase1Output}`;
  },

  parseResponse(raw: string): string | null {
    // The response should be a complete markdown document starting with "# Positioning"
    const trimmed = raw.trim();

    // Strip markdown code fences if the LLM wrapped the output
    const unwrapped = trimmed
      .replace(/^```(?:markdown|md)?\s*\n?/i, "")
      .replace(/\n?```\s*$/, "")
      .trim();

    // Validate: must contain the expected heading structure
    if (!unwrapped.includes("# Positioning") || !unwrapped.includes("## One-liner")) {
      return null;
    }

    // Validate: must contain at least 4 of the 7 expected sections
    const sections = ["One-liner", "Tagline", "Short Description", "Long Description", "Problem", "Solution", "Why Now"];
    const found = sections.filter(s => unwrapped.includes(`## ${s}`));
    if (found.length < 4) {
      return null;
    }

    return unwrapped + "\n";
  },
};
