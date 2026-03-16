/**
 * Prompt contract for directories.json enhancement.
 *
 * Takes the phase-1 directory listings + scan context + positioning,
 * asks the LLM to rewrite descriptions and reasons to be
 * more product-specific and platform-appropriate.
 */

import { PromptContract } from "./types";
import { ScanContext } from "../../../types";
import * as path from "path";
import { readFile, assetsDir } from "../../fs";

const SYSTEM = `You are a product distribution copywriter. You rewrite directory listing entries to be more specific, compelling, and tailored to each platform's audience.

Rules:
- Output ONLY a valid JSON array. No commentary, no preamble, no markdown fences, no explanation.
- Preserve the exact JSON structure: each entry must have "name", "category", "priority", "suggested_description", and "reason".
- Do not add or remove entries — rewrite the existing ones in place.
- Do not change "name", "category", or "priority" values.
- suggested_description: 1-3 sentences tailored to the specific platform. Adjust tone and emphasis based on the platform:
  - Content platforms (YouTube, Medium): emphasize what the product does and why it's interesting
  - Community platforms (Reddit, forums): emphasize the problem being solved, invite feedback
  - Social platforms (Twitter/X): keep it punchy, include the URL
  - Niche communities: speak the audience's language, emphasize specific features they care about
  - Launch platforms (Product Hunt): lead with the value proposition
- reason: 1-2 sentences explaining why this specific product fits this specific platform. Not generic platform descriptions.
- Do not use superlatives unless from the product's own metadata.
- Keep the product URL if present in the input.
- The output must be valid, parseable JSON.`;

export const directoriesPrompt: PromptContract = {
  assetName: "directories",

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

    return `Rewrite the suggested_description and reason fields in this directory JSON to be more product-specific and platform-appropriate.

## Scan Context
- URL: ${context.url}
- CLI description: ${context.description}
- Target audience: ${context.targetAudience}
- Detected category: ${context.category || "general"}

## Website Metadata
${metaBlock}

## Current Positioning (use for context)
${positioning}

## Phase 1 JSON (rewrite descriptions and reasons only)
${phase1Output}`;
  },

  parseResponse(raw: string): string | null {
    const trimmed = raw.trim();

    // Strip markdown code fences if the LLM wrapped the output
    const unwrapped = trimmed
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/, "")
      .trim();

    // Must be valid JSON
    let parsed: any;
    try {
      parsed = JSON.parse(unwrapped);
    } catch {
      return null;
    }

    // Must be an array with at least 3 entries
    if (!Array.isArray(parsed) || parsed.length < 3) {
      return null;
    }

    // Each entry must have the required fields
    const requiredFields = ["name", "category", "priority", "suggested_description", "reason"];
    for (const entry of parsed) {
      for (const field of requiredFields) {
        if (!(field in entry)) {
          return null;
        }
      }
    }

    // Re-serialize with consistent formatting
    return JSON.stringify(parsed, null, 2) + "\n";
  },
};
