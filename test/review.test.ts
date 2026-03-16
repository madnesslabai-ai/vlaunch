import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { classifyFinding, inferAssetFromFinding } from "../src/commands/review";

describe("classifyFinding", () => {
  // ─── External asset detection ───────────────────────

  it("detects screenshot as external asset", () => {
    const result = classifyFinding("No screenshots or UI visuals are present");
    assert.equal(result.revisionType, "external_asset_dependency");
    assert.equal(result.fixableByRefine, false);
    assert.equal(result.needsExternalAsset, true);
  });

  it("detects demo video as external asset", () => {
    const result = classifyFinding("No demo video or GIF walkthrough exists");
    assert.equal(result.revisionType, "external_asset_dependency");
    assert.equal(result.fixableByRefine, false);
  });

  // ─── Site change detection ──────────────────────────

  it("detects pricing as site change", () => {
    const result = classifyFinding("Pricing is entirely absent");
    assert.equal(result.revisionType, "cta_clarity");
    assert.equal(result.fixableByRefine, false);
    assert.equal(result.needsSiteChange, true);
  });

  it("detects landing page CTA as site change", () => {
    const result = classifyFinding("Landing page CTA and conversion path are unclear");
    assert.equal(result.revisionType, "cta_clarity");
    assert.equal(result.needsSiteChange, true);
  });

  // ─── Distribution work detection ────────────────────

  it("detects Reddit account history as distribution", () => {
    const result = classifyFinding("No Reddit or forum account history is referenced");
    assert.equal(result.revisionType, "platform_strategy_adjustment");
    assert.equal(result.fixableByRefine, false);
    assert.equal(result.needsDistributionWork, true);
  });

  it("detects responsible gambling as distribution", () => {
    const result = classifyFinding("Responsible gambling or regulatory disclaimer is absent");
    assert.equal(result.needsDistributionWork, true);
    assert.equal(result.fixableByRefine, false);
  });

  // ─── Fixable findings ──────────────────────────────

  it("detects social proof gap as fixable", () => {
    const result = classifyFinding("Social proof is not yet visible");
    assert.equal(result.revisionType, "social_proof_gap");
    assert.equal(result.fixableByRefine, true);
  });

  it("detects claim language gap as proof_gap", () => {
    const result = classifyFinding('Claim language "transparent" present in most assets but missing from producthunt.md');
    assert.equal(result.revisionType, "proof_gap");
    assert.equal(result.fixableByRefine, true);
  });

  it("detects messaging alignment issue", () => {
    const result = classifyFinding("Product Hunt tagline may diverge from positioning one-liner");
    assert.equal(result.revisionType, "messaging_alignment");
    assert.equal(result.fixableByRefine, true);
  });

  it("defaults to copy_refinement for generic text", () => {
    const result = classifyFinding("The short description could be more compelling");
    assert.equal(result.revisionType, "copy_refinement");
    assert.equal(result.fixableByRefine, true);
    assert.equal(result.autoApply, "high");
  });

  // ─── Auto-apply suitability ─────────────────────────

  it("sets autoApply to none for external work", () => {
    const result = classifyFinding("No screenshots available");
    assert.equal(result.autoApply, "none");
  });

  it("sets autoApply to high for copy refinement", () => {
    const result = classifyFinding("The description needs polish");
    assert.equal(result.autoApply, "high");
  });

  it("sets autoApply to medium for proof gap", () => {
    const result = classifyFinding('Claim language "verified" is missing from some assets');
    assert.equal(result.autoApply, "medium");
  });
});

describe("inferAssetFromFinding", () => {
  // ─── "missing from" file parsing ──────────────────

  it("maps 'missing from directories.json' to directories, not medium", () => {
    const result = inferAssetFromFinding(
      'Claim language "transparent" used in positioning.md, producthunt.md, medium-draft.md but missing from directories.json',
    );
    assert.ok(result !== null);
    assert.equal(result!.primary, "directories");
    assert.ok(result!.secondary.includes("positioning"));
    assert.ok(result!.secondary.includes("producthunt"));
    assert.ok(result!.secondary.includes("medium"));
  });

  it("maps 'missing from medium-draft.md' to medium", () => {
    const result = inferAssetFromFinding(
      'Claim language "verified" present in most assets but missing from medium-draft.md',
    );
    assert.ok(result !== null);
    assert.equal(result!.primary, "medium");
  });

  it("maps 'missing from producthunt.md' to producthunt", () => {
    const result = inferAssetFromFinding(
      'Claim language "transparent" used in positioning.md but missing from producthunt.md',
    );
    assert.ok(result !== null);
    assert.equal(result!.primary, "producthunt");
    assert.ok(result!.secondary.includes("positioning"));
  });

  // ─── Keyword fallback ────────────────────────────

  it("maps positioning keyword finding to positioning", () => {
    const result = inferAssetFromFinding("Product Hunt tagline may diverge from positioning one-liner");
    assert.ok(result !== null);
    assert.equal(result!.primary, "producthunt");
  });

  it("maps subtitle finding to medium", () => {
    const result = inferAssetFromFinding("Medium subtitle may diverge from positioning short description");
    assert.ok(result !== null);
    assert.equal(result!.primary, "medium");
  });

  // ─── Null cases ──────────────────────────────────

  it("returns null for checklist findings", () => {
    assert.equal(inferAssetFromFinding("Checklist has missing items"), null);
  });

  it("returns null for unrecognized text", () => {
    assert.equal(inferAssetFromFinding("Something completely unrelated"), null);
  });
});
