import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { normalizePlatform, platformMentionedIn } from "../src/commands/check";

describe("normalizePlatform", () => {
  it("normalizes simple platform name", () => {
    assert.equal(normalizePlatform("Reddit"), "reddit");
  });

  it("strips parenthetical from X (Twitter)", () => {
    assert.equal(normalizePlatform("X (Twitter)"), "x");
  });

  it("strips parenthetical from X (Twitter / AI Twitter)", () => {
    assert.equal(normalizePlatform("X (Twitter / AI Twitter)"), "x");
  });

  it("normalizes multi-word platform", () => {
    assert.equal(normalizePlatform("Product Hunt"), "product hunt");
  });

  it("truncates to 3 words", () => {
    assert.equal(
      normalizePlatform("Reddit (r/sportsbook, r/FootballBetting, r/soccer)"),
      "reddit",
    );
  });
});

describe("platformMentionedIn", () => {
  it("matches whole word 'reddit' in text", () => {
    assert.ok(platformMentionedIn("reddit", "Post on Reddit to reach bettors"));
  });

  it("does not match 'x' inside words like 'next'", () => {
    assert.ok(!platformMentionedIn("x", "the next step is to prepare"));
  });

  it("does not match 'x' inside 'exposure'", () => {
    assert.ok(!platformMentionedIn("x", "build exposure through content marketing"));
  });

  it("does not match 'x' inside 'experience'", () => {
    assert.ok(!platformMentionedIn("x", "users with more experience will find"));
  });

  it("matches standalone 'x' in text about the platform", () => {
    assert.ok(platformMentionedIn("x", "Post on X to reach your audience"));
  });

  it("matches 'instagram' as whole word", () => {
    assert.ok(platformMentionedIn("instagram", "Create an Instagram account"));
  });

  it("does not match 'instagram' in unrelated text", () => {
    assert.ok(!platformMentionedIn("instagram", "mainstream astrology accounts"));
  });

  it("matches 'product hunt' as phrase", () => {
    assert.ok(platformMentionedIn("product hunt", "Launch on Product Hunt next week"));
  });
});
