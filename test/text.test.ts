import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { inferProductName, inferProductCategory, audienceVariants } from "../src/lib/text";

describe("inferProductName", () => {
  // ─── Standard page titles ───────────────────────────

  it("extracts brand from 'Brand: Description' format", () => {
    assert.equal(
      inferProductName("https://cursor.com", "AI code editor", "Cursor: The best way to code with AI"),
      "Cursor",
    );
  });

  it("extracts brand from 'Description | Brand' format", () => {
    assert.equal(
      inferProductName(
        "https://oddsflow-partners.com",
        "Affiliate program",
        "AI-Powered Odds Intelligence for Sportsbooks & Feed Providers | OddsFlow Partners",
      ),
      "OddsFlow Partners",
    );
  });

  it("extracts brand after em-dash", () => {
    assert.equal(
      inferProductName("https://clawagenthub.io", "AI agent platform", "ClawAgentHub — The Agent Hub That Shows Its Work"),
      "ClawAgentHub",
    );
  });

  it("does not split on hyphens inside words", () => {
    const name = inferProductName(
      "https://example.com",
      "Some product",
      "AI-Powered Platform for Teams | BrandName",
    );
    assert.notEqual(name, "AI");
    assert.equal(name, "BrandName");
  });

  // ─── Platform name rejection ────────────────────────

  it("rejects 'Telegram' as product name", () => {
    const name = inferProductName(
      "https://t.me/ClawSportBot",
      "Telegram bot for football",
      "Telegram: Launch @ClawSportBot",
    );
    assert.notEqual(name, "Telegram");
    assert.equal(name, "ClawSportBot");
  });

  it("rejects 'GitHub' as product name", () => {
    const name = inferProductName(
      "https://github.com/someproject",
      "A developer tool",
      "GitHub: someproject",
    );
    assert.notEqual(name, "GitHub");
  });

  it("rejects 'YouTube' as product name", () => {
    const name = inferProductName(
      "https://youtube.com/watch?v=123",
      "A video tool",
      "YouTube: My Channel",
    );
    assert.notEqual(name, "YouTube");
  });

  // ─── t.me URL handling ──────────────────────────────

  it("extracts bot name from t.me URL path", () => {
    assert.equal(
      inferProductName("https://t.me/ClawSportBot", "A bot", undefined),
      "ClawSportBot",
    );
  });

  it("extracts channel name from t.me URL path with @", () => {
    assert.equal(
      inferProductName("https://t.me/@SomeChannel", "A channel", undefined),
      "SomeChannel",
    );
  });

  // ─── @ mention extraction ───────────────────────────

  it("extracts @username from title text", () => {
    assert.equal(
      inferProductName("https://example.com", "A bot", "Telegram: Launch @MyBot"),
      "MyBot",
    );
  });

  // ─── URL fragment rejection ─────────────────────────

  it("never returns a raw URL as product name", () => {
    const name = inferProductName("https://clawagent hub.io", "A platform", undefined);
    assert.ok(!name.startsWith("http"), `Got URL fragment: ${name}`);
  });

  // ─── Simple title (no delimiters) ───────────────────

  it("handles simple single-segment title", () => {
    assert.equal(
      inferProductName("https://zwds.app", "Astrology tool", "ZWDS Calculator"),
      "ZWDS Calculator",
    );
  });

  // ─── Domain fallback ───────────────────────────────

  it("falls back to domain when no title", () => {
    assert.equal(
      inferProductName("https://myproduct.io", "A great tool", undefined),
      "Myproduct",
    );
  });

  // ─── Description fallback ──────────────────────────

  it("falls back to description words when URL has no usable domain", () => {
    // "not-a-url" still gets parsed as a domain → "Not-a-url"
    // Test with empty URL to exercise the description fallback
    const name = inferProductName("", "Great New Tool for developers", undefined);
    assert.equal(name, "Great New");
  });
});

describe("inferProductCategory", () => {
  it("detects sports_analytics", () => {
    assert.equal(
      inferProductCategory("AI football prediction tool", "sports bettors"),
      "sports_analytics",
    );
  });

  it("detects spirituality_wellness", () => {
    assert.equal(
      inferProductCategory("Zi Wei Dou Shu chart reading with AI", "people interested in astrology and self-discovery"),
      "spirituality_wellness",
    );
  });

  it("detects developer_tool", () => {
    assert.equal(
      inferProductCategory("CLI tool for developer workflows", "software engineers"),
      "developer_tool",
    );
  });

  it("detects ai_product", () => {
    assert.equal(
      inferProductCategory("AI agent orchestration platform", "ML engineers"),
      "ai_product",
    );
  });

  it("detects launch_tool", () => {
    assert.equal(
      inferProductCategory("Launch preparation CLI engine", "indie hackers"),
      "launch_tool",
    );
  });

  it("returns general for unrecognized input", () => {
    assert.equal(
      inferProductCategory("A new way to organize your kitchen", "home cooks"),
      "general",
    );
  });
});

describe("audienceVariants", () => {
  it("shortens comma-separated lists to first two items", () => {
    const result = audienceVariants("football bettors, sports traders, and AI fans");
    assert.equal(result.short, "football bettors and sports traders");
    assert.equal(result.pronoun, "them");
    assert.equal(result.noun, "this audience");
  });

  it("shortens 'people interested in' patterns", () => {
    const result = audienceVariants("people interested in astrology, self-discovery, and Chinese metaphysics");
    assert.ok(result.short.startsWith("people interested in"));
    assert.ok(result.short.includes("astrology"));
  });

  it("returns full audience when only two items", () => {
    const result = audienceVariants("developers and designers");
    assert.equal(result.short, "developers and designers");
    assert.equal(result.full, "developers and designers");
  });
});
