# Current Release Readiness

As of 2026-03-16, after Phase 3.2 validation blocker hardening.

---

## 1. Current Status

vLaunch is a working CLI that generates launch-ready assets from three inputs (URL, description, audience). The deterministic pipeline, AI enhancement layer, consistency checker, manifest system, provenance tracking, and refinement workflow are all functional. Cross-vertical validation has been run against 5 products spanning 3 category paths. The core reliability bugs exposed by validation have been fixed. There are no automated tests, no CI, and the schema is not versioned. The tool works reliably in manual use but is not yet hardened for unsupervised open-source consumption.

---

## 2. What Is Already Production-Strong

- **Deterministic generation** — 7 commands produce 8 structured assets from templates without any API calls. Works offline, produces consistent output, handles 7 product categories with category-specific tone and platform routing.

- **AI-enhanced asset generation** — All 7 content assets (positioning, PH, Medium, routing, directories, affiliate, checklist) have AI enhancement via Anthropic Claude. Each asset has a validated prompt contract with `parseResponse()` that rejects malformed output. Phase-1 output preserved on failure.

- **Consistency checker** — Deterministic cross-asset checker covering 6 dimensions: brand name, positioning alignment, claim consistency, audience targeting, platform strategy, and tone. Word-boundary matching prevents false positives on short platform names. Findings are deduplicated.

- **Readiness checklist and review** — AI-enhanced checklist produces product-specific gap analysis. Deterministic review planner reads the consistency report and checklist to generate a structured refinement plan with classification (fixable vs external), priority ordering, and apply instructions.

- **launch-manifest.json** — Machine-readable manifest with project metadata, per-asset status, consistency summary, readiness scoring (score + level), and normalized brand baseline. Generated after every command.

- **Provenance tracking** — `asset-provenance.json` persists generation mode and timestamp per asset across commands. A deterministic command like `vlaunch check` does not overwrite AI-enhanced provenance. Graceful fallback to `"unknown"` if provenance file is missing or corrupted.

- **Refine workflow** — `vlaunch refine <asset> --feedback "..."` revises a single asset using the existing prompt contract's `parseResponse()` validator. Brand anchor guardrails protect product name (including one-liner-specific check for positioning), audience, and proof language. Feedback-aware bypass allows intentional changes.

- **Review / refine-plan / refine-apply flow** — `vlaunch review` generates `refinement-plan.json` with classified revisions (7 revision types, fixability flags, external dependency tracking). `vlaunch refine-apply <index>` applies a specific revision. Apply order sorts fixable revisions first.

- **Product name inference** — Handles standard page titles (`Brand — Description`, `Description | Brand`), Telegram bot URLs (t.me path extraction), `@mention` extraction, and platform-name rejection. Falls back to domain-derived name when fetch fails.

---

## 3. What Was Recently Hardened (Phase 3.2)

- **`inferProductName()` rewrite** — Fixed hyphen-in-word splitting (no longer splits "AI-Powered" into "AI"). Added last-segment preference for `[Description] | [Brand]` titles. Added platform-name blocklist (Telegram, GitHub, Instagram, etc.). Added URL-fragment rejection. Added t.me special-case handling. Result: 4/4 validation products now get correct names.

- **Platform matching in consistency checker** — Replaced `.includes()` substring matching with word-boundary regex via `platformMentionedIn()`. Avoid-section checking now extracts actual platform names from bold markdown entries instead of scanning raw text. Eliminates false positives where `"x"` matched inside words like "next" or "exposure".

- **URL input sanitization** — Whitespace stripped from URL before storing in `context.json`. Prevents malformed URLs from propagating through the pipeline.

- **Consistency finding deduplication** — `generateReport()` deduplicates findings by message. Checklist-vs-avoid matching uses a `seenMessages` set. Result: finding counts dropped from 8-16 to 3-4 per product.

- **`"(none detected)"` sentinel removal** — Manifest parser now filters out the sentinel string when parsing claim language from the consistency report. Stores empty array `[]` instead of `["(none detected)"]`.

---

## 4. Public Example Readiness

| Product | Category | Safe? | Why |
|---------|----------|-------|-----|
| OddsFlow | `sports_analytics` | Yes | Phase 1+2 validated, AI-enhanced, refinement tested. Existing example in `examples/oddsflow-ai/`. |
| OddsFlow-Partners.com | `sports_analytics` | Yes | Product name correctly inferred as "OddsFlow Partners". B2B affiliate framing is accurate — not confused with end-user product. Routing targets affiliate communities, not consumer betting forums. |
| ClawSportBot | `sports_analytics` | Yes | Product name correctly extracted from t.me URL. Bot-native positioning — no website-centric CTAs. Routing prioritizes Telegram groups and betting communities. |
| ClawAgentHub.io | `ai_product` | Yes | Product name correctly inferred as "ClawAgentHub". Category detection chose `ai_product` (correct). Developer-native tone across all assets. Routing correctly targets Hacker News, AI Twitter, ML subreddits. |
| ZWDS Calculator | `spirituality_wellness` | Yes | Product name correct. Category detection fired `spirituality_wellness`. Tone is calm and respectful across all assets. Routing excludes dev communities. Consistency rate improved from false 27% to accurate 67% after dedup fixes. |

All 5 products produce correct product names in manifest, PH draft, and consistency baseline. No X (Twitter) or Instagram false positives remain.

---

## 5. Remaining Blockers Before Open-Source Release

### No automated tests
There are zero automated tests. All validation has been manual. Regressions in template logic, parser validation, consistency checking, product name inference, or platform matching will be invisible until someone runs a demo and reads the output. This is the single biggest risk for an open-source release.

### No CI
No GitHub Actions workflow. No `npm test` script. Contributors cannot verify their changes don't break anything.

### Schema not versioned
`launch-manifest.json`, `refinement-plan.json`, and `asset-provenance.json` have no `schema_version` field. Downstream agents parsing these files have no way to detect breaking changes.

### Broader cross-vertical validation incomplete
4 of 8 validation matrix products have been tested (OddsFlow-Partners, ClawSportBot, ClawAgentHub, ZWDS Calculator). Remaining: OddsFlow (direct, not partners), Writesonic, Cursor (developer tool), Notion (consumer product). The `developer_tool` and `saas`/`general` category paths have limited AI-enhanced validation.

### Partial-run guarantees not tested
Individual commands (`vlaunch position`, `vlaunch route`) produce manifests, but the accuracy of partial-state manifests has not been systematically tested. Stale asset entries could mislead downstream agents.

### No retry logic for AI calls
A transient 429 or 503 from the Anthropic API during `vlaunch run --ai` fails the asset and preserves phase-1 output, but there is no retry. Users running the full pipeline on a rate-limited key may get inconsistent results.

### No structured exit codes
All commands exit 0 on success and 1 on failure. No distinction between "complete failure" and "partial success" (some assets enhanced, some fell back).

### No contributor documentation
No CONTRIBUTING.md, no architecture guide, no "how to add a new category" guide. The codebase is readable but not documented for external contributors.

---

## 6. Release Gates

| Gate | Status | Priority | Blocks release? |
|------|--------|----------|----------------|
| Product name inference correct across verticals | **done** | P0 | no longer |
| Platform matching false positives eliminated | **done** | P0 | no longer |
| URL sanitization | **done** | P1 | no longer |
| Consistency finding deduplication | **done** | P1 | no longer |
| Golden tests for deterministic pipeline | not started | P0 | **yes** |
| Parser unit tests for all 7 prompt contracts | not started | P0 | **yes** |
| `npm test` script + CI workflow | not started | P0 | **yes** |
| Schema version in manifest and plan | not started | P1 | **yes** |
| Retry with backoff for AI calls | not started | P1 | soft yes |
| Remaining 4 validation matrix products | not started | P1 | soft yes |
| Exit code standardization | not started | P2 | no |
| `vlaunch manifest` standalone command | not started | P2 | no |
| `--quiet` / `--verbose` flags | not started | P3 | no |
| JSON error output for agents | not started | P3 | no |
| CONTRIBUTING.md | not started | P2 | soft yes |
| Schema documentation (MANIFEST-SCHEMA.md) | not started | P2 | no |

---

## 7. Recommended Next Implementation Order

1. **Golden tests and parser unit tests** — Create `test/fixtures/` with frozen inputs, write deterministic pipeline tests, consistency checker tests, manifest tests, and parser unit tests for all 7 prompt contracts. Add `npm test` script. This is the prerequisite for everything else — without tests, any subsequent change is a regression risk.

2. **CI workflow** — GitHub Actions running `npm test` on push and PR. Prevents merging broken code.

3. **Schema version fields** — Add `schema_version: "1.0"` to `launch-manifest.json` and `refinement-plan.json`. Non-breaking, fast, and enables downstream agents to detect future schema changes.

4. **Retry with backoff** — Exponential backoff for 429/503 in `AnthropicProvider.generate()`. Biggest reliability improvement for real-world usage.

5. **Remaining validation matrix products** — Run OddsFlow (direct), Writesonic, Cursor, Notion through the full pipeline. Exercises the `developer_tool`, `saas`, and `general` category paths that have less coverage.

6. **Exit code standardization** — 0 = success, 1 = failure, 2 = partial success. Enables agent-driven workflows to detect and handle partial runs.

7. **Contributor documentation** — CONTRIBUTING.md, architecture overview, "how to add a category" guide.

8. **CLI polish** — `--quiet`, `--verbose`, `--help` review, error message cleanup.

---

## 8. Release Recommendation

**Almost ready.**

The core pipeline is reliable, produces genuinely useful output across multiple verticals, and the major validation blockers have been fixed. The AI enhancement quality is high. The consistency checker and review system catch real issues. The refinement workflow with guardrails works.

What prevents a "ready" rating: there are no automated tests, no CI, and the schema is not versioned. An open-source release without tests means the first external contribution could silently break product name inference, consistency checking, or parser validation — and nobody would know until a user reported bad output. The test gap is the only hard blocker.

A controlled release to a small group of testers (5-10 people, with the understanding that they're testing pre-release software) is viable today. A public open-source release should wait until golden tests, parser unit tests, and CI are in place — roughly 1-2 working sessions of implementation.
