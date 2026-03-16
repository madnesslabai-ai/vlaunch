# Phase 2 Baseline

Current state of vLaunch as of Phase 2.4. AI enhancement is fully wired for all five core assets. Phase 1 deterministic outputs serve as both the input and the fallback.

---

## What Works

### AI Enhancement Pipeline
- `--ai` flag available on `vlaunch position`, `vlaunch route`, `vlaunch package`, and `vlaunch run`
- Without `--ai`, behavior is identical to Phase 1 — no API calls, no external dependencies
- Enhancement is additive: Phase 1 generates the asset, then AI rewrites it in place
- If AI fails at any point, the Phase 1 file remains untouched

### Provider Architecture
- `AIProvider` interface with `generate(system, user)` method
- `AnthropicProvider` using Claude claude-sonnet-4-6 via the Messages API (direct fetch, no SDK)
- API key via `ANTHROPIC_API_KEY` environment variable or `.env` file
- Provider is instantiated only when `--ai` is passed — no key required for Phase 1

### Prompt Contract Pattern
- Each asset has a `PromptContract`: `systemPrompt`, `buildUserPrompt()`, `parseResponse()`
- `buildUserPrompt()` injects scan context, website metadata, and current positioning
- `parseResponse()` validates structure before allowing the overwrite
- Failed validation → phase-1 output preserved, logged as "skipped"

### AI-Enhanced Positioning (Phase 2.1)
- System prompt: product positioning specialist with character limits and section structure
- Rewrites one-liner, tagline, short/long descriptions, problem, solution, why now
- Parser requires 4+ of 7 section headings and strips code fences
- Enhanced positioning is read by all downstream prompts as context

### AI-Enhanced Product Hunt Draft (Phase 2.2)
- System prompt: PH launch copywriter with natural maker voice
- Rewrites tagline, short pitch, and first comment; preserves launch checklist verbatim
- Parser requires all 5 sections and verifies checklist has 5+ checkbox items
- Reads AI-enhanced positioning for voice alignment

### AI-Enhanced Medium Draft (Phase 2.3)
- System prompt: startup content writer producing publishable narrative
- Rewrites all narrative sections with engaging hooks and concrete detail
- Parser requires 5+ of 7 section headings and URL presence
- Reads AI-enhanced positioning for framing

### AI-Enhanced Routing Plan (Phase 2.4)
- System prompt: product launch strategist with product-specific platform reasoning
- Outputs 5-7 platforms with specific community names (subreddits, forums, channel types)
- Launch sequence spans 3-4 weeks with concrete actions, not generic advice
- "Avoid" section is category-aware (e.g. sports product avoids general tech communities)
- Parser requires `# Routing Plan` heading and 4+ of 5 required sections

### AI-Enhanced Directories (Phase 2.4)
- System prompt: distribution copywriter with platform-tailored tone
- Adjusts description style per platform type (community tone for Reddit, punchy for X, signal format for Telegram)
- Reasons explain why this product fits this platform — not generic platform descriptions
- Parser validates JSON array with 3+ entries, each containing all required fields

### Safe Fallback Behavior
- AI enhancement is wrapped in try-catch at every call site
- Missing API key → error logged, phase-1 outputs preserved
- Provider failure (network, rate limit, auth) → error logged, phase-1 outputs preserved
- Invalid AI response (fails `parseResponse`) → warning logged, phase-1 outputs preserved
- No partial overwrites — either the full validated response is written or nothing changes

### Enhancement Orchestrator
- `enhanceAsset()`: reads phase-1 → builds prompt → calls provider → validates → writes on success
- `enhanceAssets()`: batch sequential enhancement with per-asset status tracking
- `printEnhanceSummary()`: logs ✓/–/✗ per asset after each enhancement pass

---

## Validated Examples

### OddsFlow (sports_analytics) — AI-enhanced
- **URL**: https://oddsflow.ai
- **Category**: sports_analytics
- **AI results**: All 5 assets enhanced successfully
- **Positioning**: Product-specific value props replacing category-level templates; verification-first language preserved
- **Routing**: Reddit subreddits named (r/sportsbook, r/SoccerBetting), Telegram strategy for signal delivery, YouTube for methodology walkthroughs, betting forums by name (SBR, Punters Lounge, Betfair Community)
- **Directories**: Platform-tailored descriptions — Reddit asks for feedback, X contrasts with unaccountable tipsters, Telegram matches signal-channel format
- **Medium**: Narrative arc built around the accountability gap in football predictions; no template phrasing
- **PH comment**: Maker voice with specific product details, not category-level boilerplate

### Zi Wei Dou Shu AI (spirituality_wellness) — Phase 1 only
- **URL**: https://ziweiastrology.ai
- **Category**: spirituality_wellness
- **Phase 1 tone**: Calm, tradition-respecting, guidance-oriented
- **Key strength**: Category system routes away from Hacker News/Dev.to, boosts YouTube/Reddit
- **AI enhancement**: Not yet tested for this vertical — Phase 1 outputs validated

### Writesonic (ai_product) — Phase 1 only
- **URL**: https://writesonic.com
- **Category**: ai_product
- **Phase 1 tone**: Results-oriented, anti-hype
- **Key strength**: Imperative metadata correctly rejected; clean CLI description used
- **AI enhancement**: Not yet tested for this vertical — Phase 1 outputs validated

---

## Current Strengths

- **Product-specific AI copy** — enhanced assets reference actual product features, audience behaviors, and competitive context instead of template phrases
- **Deterministic fallback** — every AI-enhanced asset has a working Phase 1 version that ships without API keys or network access
- **Structured validation** — `parseResponse()` on every prompt contract prevents malformed AI output from corrupting assets
- **Context chaining** — AI-enhanced positioning feeds into all downstream prompts, so PH, Medium, routing, and directories share consistent voice and framing
- **Platform-aware tone** — directories.json descriptions adapt style to each platform's conventions (community, social, content, niche)
- **No SDK dependency** — Anthropic provider uses raw fetch, keeping the dependency footprint minimal

---

## Known Limitations

### AI Quality
- AI enhancement tested end-to-end on OddsFlow only — spirituality_wellness and ai_product verticals need AI validation
- No A/B or multi-generation capability — each asset gets one enhancement pass
- Temperature is fixed at 0.7 — no way to tune creativity vs. consistency per asset
- Model is hardcoded to claude-sonnet-4-6 — no `--model` flag yet

### Prompt Contracts
- No iterative refinement — can't re-run a single asset with feedback ("make the tagline shorter")
- Prompts don't reference each other's outputs (except positioning) — routing doesn't inform directory descriptions at the AI layer
- No token budget management — long positioning + long phase-1 output could hit context limits on smaller models

### Provider System
- Anthropic-only — no OpenAI, Groq, or local model support
- No retry logic for transient failures (429, 503)
- No streaming — full response buffered before validation
- No cost tracking or token usage reporting

### Pipeline
- AI enhancements run sequentially — no parallel enhancement of independent assets
- No `--dry-run` to preview AI prompts without calling the API
- No way to selectively enhance one asset (e.g. `vlaunch position --ai` works, but `vlaunch package --ai` enhances all three package assets)
- No caching — re-running with `--ai` calls the API again even if inputs haven't changed

### Affiliate Copy
- `affiliate.md` has no AI enhancement — still fully templated
- Checklist generation is still deterministic (not a limitation, but noted for completeness)

---

## What Comes Next

### Near-term (Phase 2.5+)
- **AI-enhanced affiliate copy** — last remaining asset without AI enhancement
- **Multi-vertical AI validation** — run Zi Wei Dou Shu AI and Writesonic through the full `--ai` pipeline, capture examples
- **Retry with backoff** — handle 429/503 from the API without losing phase-1 outputs
- **Selective asset enhancement** — `vlaunch package --ai --only producthunt` to enhance a single asset

### Medium-term
- **Iterative refinement** — `vlaunch refine positioning --feedback "shorter tagline"` to re-run AI with user guidance
- **Multi-provider support** — OpenAI, Groq, or local model backends via `--provider` flag
- **Parallel enhancement** — enhance independent assets concurrently to reduce total pipeline time
- **Prompt preview** — `--dry-run` to inspect prompts without API calls
- **Cross-asset context** — routing plan informs directory descriptions at the AI layer

### Longer-term
- **Cost tracking** — report token usage and estimated cost per enhancement run
- **Caching layer** — skip API calls when scan context and phase-1 output haven't changed
- **Confidence scoring** — category detection with ranked candidates instead of first-match
- **Web workspace** — serve generated assets through a local web UI for review and editing

Phase 1 outputs remain the permanent fallback for offline use, rate limits, or when users prefer deterministic results.
