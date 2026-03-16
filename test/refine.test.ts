import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { checkAnchors, extractMarkdownSection } from "../src/lib/ai/refine";
import type { BrandAnchors } from "../src/lib/ai/refine";

describe("extractMarkdownSection", () => {
  const doc = `# Positioning

## One-liner
OddsFlow — AI predictions

## Tagline
Track record you can verify

## Problem
Bettors need tools
`;

  it("extracts section by heading", () => {
    assert.equal(extractMarkdownSection(doc, "One-liner"), "OddsFlow — AI predictions");
  });

  it("extracts section with multi-line content", () => {
    assert.equal(extractMarkdownSection(doc, "Problem"), "Bettors need tools");
  });

  it("returns null for missing section", () => {
    assert.equal(extractMarkdownSection(doc, "Solution"), null);
  });
});

describe("checkAnchors", () => {
  const anchors: BrandAnchors = {
    productName: "OddsFlow",
    audience: "football bettors and sports traders",
    proofLanguage: ["verified", "track record"],
  };

  it("passes when all anchors preserved", () => {
    const original = "# Positioning\n## One-liner\nOddsFlow — AI predictions for football bettors with a verified track record";
    const refined = "# Positioning\n## One-liner\nOddsFlow — smart predictions for football bettors with a verified track record";
    const result = checkAnchors(original, refined, anchors, "make it shorter", "positioning");
    assert.equal(result.passed, true);
    assert.ok(result.dropped.length === 0);
  });

  it("fails when product name dropped from document", () => {
    const original = "OddsFlow is the best tool for football bettors with verified results";
    const refined = "The best tool for football bettors with verified results";
    const result = checkAnchors(original, refined, anchors, "make it shorter", "producthunt");
    assert.equal(result.passed, false);
    assert.ok(result.dropped.some((d) => d.includes("product name")));
  });

  it("fails when product name dropped from positioning one-liner", () => {
    const original = "# Positioning\n## One-liner\nOddsFlow — AI football predictions\n## Tagline\nTrack record";
    const refined = "# Positioning\n## One-liner\nAI football predictions with proof\n## Tagline\nTrack record OddsFlow";
    const result = checkAnchors(original, refined, anchors, "shorter tagline", "positioning");
    assert.equal(result.passed, false);
    assert.ok(result.dropped.some((d) => d.includes("one-liner")));
  });

  it("passes when feedback explicitly targets product name", () => {
    const original = "OddsFlow is a tool for bettors";
    const refined = "A tool for bettors";
    const result = checkAnchors(original, refined, anchors, "remove the product name from the intro", "producthunt");
    assert.equal(result.passed, true);
  });

  it("fails when audience silently dropped", () => {
    const original = "Built for football bettors and sports traders who need predictions";
    const refined = "Built for anyone who needs predictions";
    const result = checkAnchors(original, refined, anchors, "make it shorter", "positioning");
    assert.equal(result.passed, false);
    assert.ok(result.dropped.some((d) => d.includes("audience")));
  });

  it("passes when audience change is explicitly requested", () => {
    const original = "Built for football bettors";
    const refined = "Built for everyone";
    const result = checkAnchors(original, refined, anchors, "broaden the target audience", "positioning");
    assert.equal(result.passed, true);
  });

  it("fails when proof language silently dropped", () => {
    const original = "A verified track record of AI predictions";
    const refined = "AI predictions you can trust";
    const result = checkAnchors(original, refined, anchors, "shorter copy", "positioning");
    assert.equal(result.passed, false);
    assert.ok(result.dropped.some((d) => d.includes("proof language")));
  });

  it("passes when proof language not in original", () => {
    const original = "A new tool for predictions";
    const refined = "A better tool for predictions";
    const result = checkAnchors(original, refined, anchors, "improve it", "positioning");
    assert.equal(result.passed, true);
  });
});
