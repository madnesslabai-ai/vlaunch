/**
 * Prompt contract for medium-draft.md enhancement.
 *
 * Takes the phase-1 Medium draft + scan context + AI-enhanced positioning,
 * asks the LLM to rewrite it as a publishable article draft with
 * real narrative structure and product-specific language.
 */

import { PromptContract } from "./types";
import { ScanContext } from "../../../types";
import * as path from "path";
import { readFile, assetsDir } from "../../fs";

const SYSTEM = `You are a startup content writer. You rewrite Medium article drafts into publishable, compelling launch stories.

Rules:
- Output ONLY the final markdown document. No commentary, no preamble, no explanation.
- Preserve the exact markdown structure:
  # Medium Draft
  ## Title
  ## Subtitle
  ---
  ## Intro
  ## The Problem
  ## What We Built
  ## Why Now
  ## What's Next
  ---
  *Tags: ...*
- Title: compelling, specific, under 80 characters. Should make someone want to read the article.
- Subtitle: 1 sentence, under 120 characters. Expands on the title.
- Intro: 2-3 paragraphs. Hook the reader with a specific frustration or observation. Set up why this product exists. Do not start with "We started building X because..." — find a more engaging opening.
- The Problem: 2-3 paragraphs. Be specific and vivid about the pain. Use concrete examples. Make the reader nod in recognition.
- What We Built: 2-3 paragraphs. Describe the product concretely — what it does, how it works, what makes it different. Mention specific features. Do not repeat the problem section.
- Why Now: 1-2 paragraphs. Explain the timing — what changed in the market, technology, or user behavior that makes this product viable now.
- What's Next: 1 short paragraph. Honest about being early. Invite feedback. Include the product URL.
- Tags line at the end: 3-5 relevant comma-separated tags in italics.
- Write like a real person sharing their story, not a marketing team. The tone should be confident but not boastful, specific but not dry.
- Do not use superlatives ("best", "most accurate", "revolutionary") unless they come from the product's own metadata.
- Do not use filler phrases ("game-changer", "cutting-edge", "in today's fast-paced world").
- Do not echo the positioning document verbatim — use it for context and framing, then write fresh copy.
- Keep the product URL from the input. Do not change it.
- The article should feel like it belongs on Medium — readable, well-paced, with a clear narrative arc from problem to solution to future.`;

export const mediumPrompt: PromptContract = {
  assetName: "medium-draft",

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

    return `Rewrite this Medium article draft into a publishable launch story. Use the scan context, website metadata, and positioning for source material — but write a fresh article, not a copy-paste.

## Scan Context
- URL: ${context.url}
- CLI description: ${context.description}
- Target audience: ${context.targetAudience}
- Detected category: ${context.category || "general"}

## Website Metadata
${metaBlock}

## Current Positioning (use for context, not copy-paste)
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

    // Must contain the top-level heading
    if (!unwrapped.includes("# Medium Draft")) {
      return null;
    }

    // Must contain at least 5 of the 7 expected sections
    const sections = ["Title", "Subtitle", "Intro", "The Problem", "What We Built", "Why Now", "What's Next"];
    const found = sections.filter(s => unwrapped.includes(`## ${s}`));
    if (found.length < 5) {
      return null;
    }

    // Must contain the product URL somewhere
    // (relaxed check — just needs a URL-like string)
    if (!/https?:\/\//.test(unwrapped)) {
      return null;
    }

    return unwrapped + "\n";
  },
};
