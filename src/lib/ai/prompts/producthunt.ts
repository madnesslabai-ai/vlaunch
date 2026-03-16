/**
 * Prompt contract for producthunt.md enhancement.
 *
 * Takes the phase-1 PH draft + scan context + AI-enhanced positioning,
 * asks the LLM to rewrite the Tagline, Short Pitch, and First Comment
 * with product-specific, natural-sounding copy.
 *
 * The Launch Checklist is preserved verbatim from the phase-1 output.
 */

import { PromptContract } from "./types";
import { ScanContext } from "../../../types";
import * as path from "path";
import { readFile, assetsDir } from "../../fs";

const SYSTEM = `You are a Product Hunt launch copywriter. You rewrite Product Hunt drafts to be sharper, more specific, and more natural.

Rules:
- Output ONLY the final markdown document. No commentary, no preamble, no explanation.
- Preserve the exact markdown structure: # Product Hunt Draft, then ## Name, ## Tagline, ## Short Pitch, ## First Comment, ## Launch Checklist
- The ## Name section must contain ONLY the product name, unchanged.
- The ## Launch Checklist section must be copied EXACTLY from the input — do not modify it.
- Tagline: under 60 characters. Punchy, memorable, differentiated. No product name in the tagline.
- Short Pitch: 2-3 sentences. What it does, who it's for, why it's different. Concise and scannable.
- First Comment: write as the maker. Natural, conversational, specific. Structure it as:
  1. Brief personal opener (1-2 sentences on why you built it)
  2. What it does concretely (2-3 sentences, specific features)
  3. The core problem (2-3 sentences)
  4. Ask for feedback (1-2 specific questions)
  5. Link to the product
- The first comment should sound like a real person wrote it, not a template. Avoid "we saw a clear gap" or "deserve better tools" — be specific about the actual problem and what you built.
- Do not use superlatives ("best", "most accurate", "revolutionary") unless they come from the product's own metadata.
- Do not use filler phrases ("game-changer", "cutting-edge", "in today's world").
- Keep the product URL from the input. Do not change it.
- If AI-enhanced positioning is provided, use it as context for voice and framing — but write fresh copy, don't copy-paste from positioning.`;

export const producthuntPrompt: PromptContract = {
  assetName: "producthunt",

  systemPrompt: SYSTEM,

  buildUserPrompt(context: ScanContext, phase1Output: string): string {
    const meta = context.fetched;
    const metaBlock = meta
      ? `Website title: ${meta.title}
Meta description: ${meta.metaDescription}
Domain: ${meta.domain}
Text preview: ${meta.extractedTextPreview?.slice(0, 500) || "(none)"}`
      : "(no website metadata available)";

    // Read the (possibly AI-enhanced) positioning for richer context
    const positioningPath = path.join(assetsDir(), "positioning.md");
    const positioning = readFile(positioningPath) || "(no positioning available)";

    return `Rewrite this Product Hunt draft. Use the scan context, website metadata, and positioning to make it more specific and compelling.

## Scan Context
- URL: ${context.url}
- CLI description: ${context.description}
- Target audience: ${context.targetAudience}
- Detected category: ${context.category || "general"}

## Website Metadata
${metaBlock}

## Current Positioning (use for voice and framing)
${positioning}

## Phase 1 Draft (rewrite this)
${phase1Output}`;
  },

  parseResponse(raw: string): string | null {
    const trimmed = raw.trim();

    // Strip markdown code fences if the LLM wrapped the output
    const unwrapped = trimmed
      .replace(/^```(?:markdown|md)?\s*\n?/i, "")
      .replace(/\n?```\s*$/, "")
      .trim();

    // Must contain the expected heading structure
    if (!unwrapped.includes("# Product Hunt Draft") || !unwrapped.includes("## Name")) {
      return null;
    }

    // Must contain at least these key sections
    const required = ["Name", "Tagline", "Short Pitch", "First Comment", "Launch Checklist"];
    const found = required.filter(s => unwrapped.includes(`## ${s}`));
    if (found.length < 4) {
      return null;
    }

    // Verify the Launch Checklist wasn't mangled — should contain at least 5 checkbox items
    const checklistMatch = unwrapped.match(/## Launch Checklist\n([\s\S]*?)$/);
    if (checklistMatch) {
      const checkboxCount = (checklistMatch[1].match(/- \[ \]/g) || []).length;
      if (checkboxCount < 5) {
        return null;
      }
    }

    return unwrapped + "\n";
  },
};
