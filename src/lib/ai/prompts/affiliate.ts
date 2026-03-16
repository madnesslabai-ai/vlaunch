/**
 * Prompt contract for affiliate.md enhancement.
 *
 * Takes the phase-1 affiliate draft + scan context + all generated assets,
 * asks the LLM to rewrite with product-specific partner recommendations,
 * stronger outreach copy, and category-aware commission framing.
 */

import { PromptContract } from "./types";
import { ScanContext } from "../../../types";
import * as path from "path";
import { readFile, assetsDir } from "../../fs";

const SYSTEM = `You are a partnership and affiliate program copywriter. You rewrite affiliate program drafts to be more specific, compelling, and tailored to the product's category and audience.

Rules:
- Output ONLY the final markdown document. No commentary, no preamble, no explanation.
- Use this exact structure:

  # Affiliate Draft

  ## Headline
  (one sentence)

  ## Why Promote This Product
  (2-3 paragraphs)

  ## Ideal Partner Types
  (bulleted list, 5-8 partner types)

  ## Suggested Commission Structure
  (bulleted list with tiers)

  ## Outreach Draft
  (complete email template)

- Headline: one compelling sentence that makes the value proposition clear to a potential partner. Do not use "earn on every referral" — explain why promoting this product is easy.
- Why Promote This Product: explain the specific pain point the audience has, why this product solves it credibly, and why the partner's audience will respond. Reference specific product features, not generic benefits. Lead with the audience need, not the commission.
- Ideal Partner Types: 5-8 specific partner types that fit this product and category. Go beyond generic labels — name the kind of content they produce, the platforms they operate on, and why their audience overlaps. For example, not just "YouTubers" but "YouTube creators who publish weekly match analysis or betting strategy walkthroughs."
- Suggested Commission Structure: present as draft recommendations, not confirmed terms. Include recurring, one-time, and tiered options. If the product's pricing is unknown, use realistic placeholders and label them clearly as suggestions. Do not present placeholders as confirmed economics.
- Outreach Draft: a complete, ready-to-send email. Personalize the opening. Explain the product in 1-2 sentences using specific details. Make the ask clear. Include the product URL. Keep the tone conversational and professional — not salesy.
- Do not use generic affiliate language ("passive income", "monetize your audience", "unlock earnings").
- Keep the target product as the focus, not the affiliate program itself.
- Make partner recommendations category-appropriate — a sports analytics product needs different partners than a developer tool or a spirituality product.`;

export const affiliatePrompt: PromptContract = {
  assetName: "affiliate",

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
    const routingPlan = readFile(path.join(dir, "routing-plan.md")) || "(not generated)";
    const directories = readFile(path.join(dir, "directories.json")) || "(not generated)";

    return `Rewrite this affiliate program draft with product-specific partner recommendations and stronger outreach copy.

## Scan Context
- URL: ${context.url}
- CLI description: ${context.description}
- Target audience: ${context.targetAudience}
- Detected category: ${context.category || "general"}

## Website Metadata
${metaBlock}

## Current Positioning (use for voice and framing)
${positioning}

## Routing Plan (use for channel alignment)
${routingPlan}

## Directory Listings (use for platform-specific context)
${directories}

## Phase 1 Draft (rewrite this)
${phase1Output}`;
  },

  parseResponse(raw: string): string | null {
    const trimmed = raw.trim();

    const unwrapped = trimmed
      .replace(/^```(?:markdown|md)?\s*\n?/i, "")
      .replace(/\n?```\s*$/, "")
      .trim();

    if (!unwrapped.includes("# Affiliate Draft")) {
      return null;
    }

    const required = ["Headline", "Why Promote This Product", "Ideal Partner Types", "Suggested Commission Structure", "Outreach Draft"];
    const found = required.filter(s => unwrapped.includes(`## ${s}`));
    if (found.length < 4) {
      return null;
    }

    return unwrapped + "\n";
  },
};
