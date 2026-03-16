import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { cleanTrailingColon, deriveReadiness } from "../src/commands/manifest";

describe("cleanTrailingColon", () => {
  it("removes trailing colon", () => {
    assert.equal(cleanTrailingColon("Screenshots and visuals:"), "Screenshots and visuals");
  });

  it("removes trailing colon with space", () => {
    assert.equal(cleanTrailingColon("Missing items: "), "Missing items");
  });

  it("removes multiple trailing colons", () => {
    assert.equal(cleanTrailingColon("Items::"), "Items");
  });

  it("preserves text without trailing colon", () => {
    assert.equal(cleanTrailingColon("No colon here"), "No colon here");
  });

  it("does not remove colon in the middle", () => {
    assert.equal(cleanTrailingColon("Step 1: Do this"), "Step 1: Do this");
  });
});

describe("deriveReadiness", () => {
  it("extracts percentage from status text", () => {
    const result = deriveReadiness("Approximately 60% ready", ["blocker1", "blocker2"]);
    assert.equal(result.score, 60);
    assert.equal(result.level, "soft-launch-ready");
  });

  it("returns launch-ready for 80%+", () => {
    const result = deriveReadiness("About 85% of the package is ready", []);
    assert.equal(result.score, 85);
    assert.equal(result.level, "launch-ready");
  });

  it("returns not-ready for sub-50%", () => {
    const result = deriveReadiness("Roughly 30% complete", ["a", "b", "c", "d", "e"]);
    assert.equal(result.score, 30);
    assert.equal(result.level, "not-ready");
  });

  it("estimates from blocker count when no percentage", () => {
    const result = deriveReadiness("The product needs work", []);
    assert.equal(result.score, 90);
    assert.equal(result.level, "launch-ready");
  });

  it("estimates lower score with more blockers", () => {
    const result = deriveReadiness("The product needs significant work", ["a", "b", "c"]);
    assert.equal(result.score, 50);
    assert.equal(result.level, "soft-launch-ready");
  });

  it("returns null for null input", () => {
    const result = deriveReadiness(null, []);
    assert.equal(result.score, null);
    assert.equal(result.level, null);
  });
});
