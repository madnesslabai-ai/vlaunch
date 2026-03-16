# Phase 2 Complete

vLaunch Phase 2 milestone as of Phase 2.8.2. All seven enhanceable assets have AI enhancement with validated fallback. The pipeline includes a deterministic consistency checker, a machine-readable launch manifest with provenance tracking, and structured readiness scoring. The deterministic Phase 1 pipeline remains the foundation and the safety net.

---

## What the System Can Do

Three inputs:
```
vlaunch run --url "https://yourproduct.com" \
  --description "what it does" \
  --audience "who it's for" \
  --ai
```

Seven AI-enhanced outputs, plus two deterministic-only assets:

| Asset | Phase 1 | AI-Enhanced | Status |
|-------|---------|-------------|--------|
| `positioning.md` | Category-level templates | Product-specific value props and competitive framing | ✓ |
| `producthunt.md` | Structural draft | Natural maker-voice comment with specific product details | ✓ |
| `medium-draft.md` | Template narrative | Publishable story with real hooks and concrete detail | ✓ |
| `routing-plan.md` | Keyword-scored platform list | Named communities, strategic reasoning, week-by-week actions | ✓ |
| `directories.json` | Generic platform descriptions | Platform-tailored copy adapted to each channel's conventions | ✓ |
| `checklist.md` | File-existence check | Product-aware readiness coaching with specific gaps and actions | ✓ |
| `affiliate.md` | Template outreach copy | Product-specific partner types, category-aware commission framing, personalized outreach | ✓ |
| `consistency-report.md` | *(deterministic only)* | Cross-asset consistency checker — 6 dimensions, no AI | det |
| `launch-manifest.json` | *(deterministic only)* | Machine-readable manifest with provenance, readiness scoring | det |

Without `--ai`, behavior is identical to Phase 1. No API key required.

---

## Architecture

### Provider
- `AIProvider` interface with single `generate(system, user)` method
- `AnthropicProvider` calls Claude claude-sonnet-4-6 via Messages API (raw fetch, no SDK)
- API key from `ANTHROPIC_API_KEY` env var or `.env` file
- Provider instantiated only when `--ai` is passed

### Prompt Contracts
Each enhanced asset has a `PromptContract` with three parts:
- `systemPrompt` — role, constraints, output format
- `buildUserPrompt()` — assembles scan context, website metadata, positioning, and phase-1 output
- `parseResponse()` — validates structure; returns `null` if the response is unusable

### Enhancement Orchestrator
- `enhanceAsset()` — reads phase-1 → builds prompt → calls provider → validates → writes only on success
- `enhanceAssets()` — batch sequential enhancement with per-asset status tracking
- `printEnhanceSummary()` — logs ✓/–/✗ per asset

### Context Chaining
AI-enhanced positioning feeds into all downstream prompts (PH, Medium, routing, directories, affiliate, checklist), so every asset shares consistent voice and framing.

### Safe Fallback
- Every AI call is wrapped in try-catch
- Missing API key → error logged, phase-1 file untouched
- Provider failure (network, rate limit, auth) → error logged, phase-1 file untouched
- Invalid response (fails `parseResponse`) → warning logged, phase-1 file untouched
- No partial overwrites — full validated response or nothing

### Consistency Checker (Phase 2.6)
- Deterministic cross-asset analysis — no AI, no API calls
- Checks 6 dimensions: brand name, positioning alignment, claim consistency, audience consistency, platform strategy, tone
- Stem-based matching for evidence claims (e.g., "transparen" matches both "transparency" and "transparent")
- Severity grading: minor vs notable based on how many assets are affected
- Generates `consistency-report.md` with findings, fixes, and a normalized brand/message baseline

### Launch Manifest (Phase 2.8)
- Machine-readable `.vlaunch/launch-manifest.json` generated after every command
- Includes: project metadata, run context, per-asset status with provenance, consistency summary, readiness summary, normalized baseline
- Provenance tracked in `.vlaunch/asset-provenance.json` — persists across commands so `vlaunch check` doesn't overwrite AI-enhanced provenance
- Readiness scoring: `readiness_score` (0-100) and `readiness_level` ("not-ready" / "soft-launch-ready" / "launch-ready")
- Stable schema designed for downstream agent consumption

---

## What Each Enhancement Does

### Positioning (Phase 2.1)
Rewrites one-liner, tagline, short/long descriptions, problem, solution, and why-now with product-specific language. Parser requires 4+ of 7 section headings. This asset anchors all downstream prompts.

### Product Hunt Draft (Phase 2.2)
Rewrites tagline, short pitch, and first comment in natural maker voice. Preserves the launch checklist verbatim. Parser requires all 5 sections and verifies the checklist has 5+ checkbox items.

### Medium Draft (Phase 2.3)
Produces a publishable narrative with real intro hooks, concrete problem framing, and product-specific detail. Parser requires 5+ of 7 section headings and URL presence.

### Routing Plan (Phase 2.4)
Names specific communities (subreddits, forums, Telegram channel types) with product-specific reasoning for each. Launch sequence spans 3-4 weeks with concrete actions. "Avoid" section is category-aware. Parser requires 4+ of 5 required sections.

### Directories (Phase 2.4)
Rewrites platform listing descriptions with tone matched to each platform's conventions — community tone for Reddit, punchy for X, signal format for Telegram, methodology depth for YouTube. Parser validates JSON structure with all required fields.

### Checklist (Phase 2.5)
Reviews all generated assets and produces a readiness assessment with specific strengths, concrete gaps, and prioritized next actions. References actual content from the assets — taglines, platform choices, placeholder values. Parser requires 3+ of 4 required sections.

### Affiliate (Phase 2.7)
Produces product-specific partner recommendations with category-aware commission framing and ready-to-send outreach emails. Partner types are tailored to the product category. Commission structure presented as draft recommendations, not confirmed terms. Parser validates `# Affiliate Draft` heading and 4+ of 5 required sections.

---

## Manifest Schema (Phase 2.8–2.8.2)

### Per-asset fields
| Field | Purpose |
|-------|---------|
| `asset_name` | Asset identifier |
| `path` | Relative path under `.vlaunch/` |
| `exists` | Whether the file is on disk |
| `status` | `"success"` / `"skipped"` / `"failed"` / `null` |
| `last_known_generation_mode` | `"ai-enhanced"` / `"deterministic"` / `"fallback-preserved"` / `"unknown"` / `null` |
| `last_updated_at` | ISO timestamp from provenance |
| `touched_in_current_command` | Whether this command generated/regenerated the asset |

### Readiness fields
| Field | Purpose |
|-------|---------|
| `readiness_score` | 0-100, parsed from checklist status text or blocker-count heuristic |
| `readiness_level` | `"not-ready"` (<50) / `"soft-launch-ready"` (50-79) / `"launch-ready"` (80+) |
| `top_blockers` | Up to 5 extracted from checklist, trailing colons cleaned |
| `recommended_next_actions` | Up to 5 extracted from checklist, trailing colons cleaned |

### Agent trust guide
| Question | Trust this field |
|----------|-----------------|
| What command just ran? | `run.command_scope` |
| Was AI used in this command? | `run.mode` |
| How was this asset originally generated? | `assets[].last_known_generation_mode` |
| When was this asset last written? | `assets[].last_updated_at` |
| Did this command touch this asset? | `assets[].touched_in_current_command` |

---

## Validated Examples

### OddsFlow (sports_analytics) — Full AI Pipeline
- **URL**: https://oddsflow.ai
- **Category**: `sports_analytics`
- **AI results**: All 7 enhanceable assets succeeded
- **Consistency**: 90% (9/10 checks passed, 1 minor finding)
- **Readiness**: 55% — soft-launch-ready
- **Positioning**: Verification-first language, "Predict smarter. Verify everything." tagline
- **Routing**: Names r/sportsbook, r/SoccerBetting, OddsPortal Forum, Telegram betting channels; avoids r/soccer, fantasy platforms, generic tech communities
- **Directories**: Reddit copy invites scrutiny, X copy contrasts with unaccountable tipsters, Telegram matches signal-channel format
- **Medium**: Narrative built around the accountability gap in football predictions; references closing line value
- **PH comment**: Maker voice with specific product details and open-ended feedback questions
- **Affiliate**: Partner types include YouTube match analysts, Telegram tip channel operators, Betfair traders; commission framed as draft recommendations
- **Checklist**: Identifies missing screenshots, absent pricing, no published accuracy stats; recommends posting real performance data before community outreach
- **Manifest**: Full provenance tracking — AI-enhanced assets retain provenance after `vlaunch check`
- **Example outputs**: `examples/oddsflow-ai/`

### Zi Wei Dou Shu AI (spirituality_wellness) — Phase 1 Validated
- **URL**: https://ziweiastrology.ai
- **Category**: `spirituality_wellness`
- **Tone**: Calm, tradition-respecting, guidance-oriented
- **Routing**: Excludes Hacker News, Dev.to, Indie Hackers; boosts YouTube, Reddit
- **AI enhancement**: Not yet tested for this vertical
- **Example outputs**: `examples/ziwei-astrology/`

### Writesonic (ai_product) — Phase 1 Validated
- **URL**: https://writesonic.com
- **Category**: `ai_product`
- **Tone**: Results-oriented, anti-hype
- **Key win**: Imperative feature-dump metadata correctly rejected; clean CLI description used
- **AI enhancement**: Not yet tested for this vertical
- **Example outputs**: `examples/writesonic/`

---

## Current Strengths

- **Product-specific output** — AI-enhanced assets reference actual features, audience behaviors, and competitive context; no template phrases survive enhancement
- **Full AI coverage** — all 7 content assets have AI enhancement with validated fallback
- **Deterministic safety net** — every enhanced asset has a working Phase 1 version that ships without API keys or network access
- **Structured validation** — `parseResponse()` on every contract prevents malformed output from corrupting files
- **Context chaining** — positioning cascades through all downstream prompts for consistent voice
- **Platform-aware tone** — directories and routing adapt to each platform's culture and conventions
- **Cross-asset consistency** — deterministic checker catches brand drift, claim inconsistency, and audience targeting gaps
- **Agent-ready output** — machine-readable manifest with provenance tracking, readiness scoring, and normalized baseline
- **Honest provenance** — asset generation history survives across commands; read-only commands don't overwrite AI-enhanced provenance
- **Minimal dependencies** — Anthropic provider uses raw fetch; no SDK, no framework, no build complexity
- **Full CLI coverage** — `--ai` available on `position`, `route`, `package`, `checklist`, and `run`; `check` is always deterministic

---

## Known Limitations

### Prompt & Model
- Cross-asset context is partial — positioning feeds downstream, but routing doesn't inform directories at the AI layer
- Temperature fixed at 0.7; model hardcoded to claude-sonnet-4-6
- No token budget management for long inputs

### Provider
- Anthropic-only — no OpenAI, Groq, or local model support
- No retry logic for transient failures (429, 503)
- No streaming, no cost tracking, no token usage reporting

### Pipeline
- Enhancements run sequentially — no parallel processing of independent assets
- No `--dry-run` to preview prompts without API calls
- No selective enhancement within `package` (enhances all four assets)
- No caching — re-running calls the API again even if inputs haven't changed

### Consistency Checker
- AI enhancement tested end-to-end on OddsFlow only — spirituality_wellness and ai_product verticals need AI validation
- One enhancement pass per asset — no A/B generation or multi-option output

---

## What Comes Next

### Near-term
- **Multi-vertical AI validation** — run Zi Wei and Writesonic through `--ai`, capture examples
- **Retry with backoff** — handle 429/503 gracefully
- **Selective asset enhancement** — `--only producthunt` flag for `package`

### Medium-term
- **Multi-provider support** — OpenAI, Groq, or local models via `--provider`
- **Parallel enhancement** — concurrent processing of independent assets
- **Cross-asset context** — routing plan informs directory descriptions at the AI layer
- **Prompt preview** — `--dry-run` mode

### Longer-term
- **Cost tracking** — token usage and estimated cost per run
- **Caching layer** — skip API when inputs haven't changed
- **Confidence scoring** — ranked category candidates instead of first-match
- **Web workspace** — local UI for reviewing and editing generated assets

Phase 1 outputs remain the permanent fallback for offline use, rate limits, or when users prefer deterministic results.

---

## Phase 3 Started

Phase 2 is complete. Phase 3 introduces a feedback-driven refinement workflow (`vlaunch refine <asset> --feedback "..."`) for iteratively improving individual assets without re-running the pipeline. See `PHASE-3-REFINE.md` for details.
