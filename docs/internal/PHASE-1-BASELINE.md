# Phase 1 Baseline

Current state of vLaunch as of Phase 1.9. Everything below is deterministic, file-based, and runs without external LLM calls.

---

## What Works

### Pipeline
- Full CLI pipeline: `vlaunch run` executes init → scan → position → route → package → checklist in sequence
- Each command is independently runnable
- All outputs are markdown or JSON under `.vlaunch/assets/`, human-editable and version-controllable

### Scan
- Fetches website metadata (title, meta description, text preview) with graceful fallback
- Infers product name from page title with multi-word brand support (up to 5 words)
- Detects product category from combined corpus of description, audience, meta, and preview
- Title separator handling for `:`, `|`, `-`, `–`, `—`

### Description Source Selection (Phase 1.9)
- Evaluates fetched metadata quality before using it for positioning
- Rejects imperative copy, feature dumps, and text that breaks mid-sentence grammar
- Falls back to CLI description when metadata is unsuitable
- Tagline extraction limited to single title segment, capped at 80 chars

### Category-Aware Generation
- **6 categories**: `developer_tool`, `launch_tool`, `sports_analytics`, `spirituality_wellness`, `ai_product`, `saas`, plus `general` fallback
- Each category controls: one-liner, tagline, description rewrite, problem/solution framing, tone, and platform routing
- Category can override description text to avoid echoing raw claims from metadata
- Platform routing uses `excludeCategories` and `boostCategories` per platform

### Audience Handling
- `audienceVariants()` produces short, noun, and pronoun forms to reduce repetition
- Handles comma-separated lists and "people interested in X, Y, and Z" patterns
- Full audience used once (Problem section), short form everywhere else

### Assets Generated
- `positioning.md` — one-liner, tagline, short/long description, problem, solution, why now
- `producthunt.md` — name, tagline, short pitch, first comment, launch checklist
- `medium-draft.md` — title, subtitle, intro, problem, what we built, why now, what's next
- `directories.json` — top 5 platforms with category-aware descriptions
- `affiliate.md` — headline, why promote, ideal partners, commission structure, outreach template
- `checklist.md` — readiness check against all expected asset files

---

## Validated Examples

### OddsFlow (sports_analytics)
- **URL**: https://oddsflow.ai
- **Name inferred**: OddsFlow (from page title)
- **Category detected**: sports_analytics
- **Tone**: Verification-first, evidence-based, no absolute claims
- **Key win**: "most accurate AI football predictor" from metadata rewritten to verification-focused language; one-liner and tagline use category overrides

### Zi Wei Dou Shu AI (spirituality_wellness)
- **URL**: https://ziweiastrology.ai
- **Name inferred**: Zi Wei Dou Shu AI (from page title, 5-word brand)
- **Category detected**: spirituality_wellness
- **Tone**: Calm, tradition-respecting, guidance-oriented
- **Key win**: Previously detected as `ai_product` with "AI hype vs utility" framing; now uses tradition-appropriate language about interpretive depth and personalized readings

### Writesonic (ai_product)
- **URL**: https://writesonic.com
- **Name inferred**: Writesonic (from page title)
- **Category detected**: ai_product
- **Tone**: Results-oriented, anti-hype
- **Key win**: Imperative feature-dump meta description ("Track AI visibility... Monitor mentions... Fix citation gaps...") correctly rejected; clean CLI description used instead

---

## Current Strengths

- **Zero external dependencies for generation** — no API keys, no LLM calls, no network required after scan
- **Category system is extensible** — adding a new category is 5 touch points across 4 files
- **Description quality heuristics** — intelligently chooses between CLI input and fetched metadata
- **Audience deduplication** — avoids repeating long audience phrases across all assets
- **Brand name inference** — handles single-word, multi-word, and hyphenated title formats
- **Platform routing** — category-aware exclusions and boosts produce relevant channel recommendations

---

## Known Limitations

### Copy Quality
- Templates are still generic within each category — all `ai_product` outputs sound the same regardless of the specific product
- Problem/solution sections are category-level, not product-specific
- Medium drafts are structurally sound but lack real narrative depth
- No way to inject product-specific differentiators beyond what metadata provides

### Name & Description Inference
- Product name inference fails on titles without clear separators (e.g. "Welcome to Our Product")
- `bestDescription()` can't synthesize — it picks CLI or meta, never combines insights from both
- No handling for pages that redirect to login or return minimal HTML

### Category Detection
- Keyword-based only — ambiguous products may land in the wrong category
- No `finance_trading`, `content_creator_tool`, or `ai_saas` categories yet
- A product matching multiple categories gets the first match, no confidence scoring

### Platform Routing
- Scoring is keyword-count based — no weighting or relevance ranking
- Platform descriptions in `directories.json` are still fairly templated
- No support for custom platforms or user-defined routing preferences

### Pipeline
- No `--dry-run` or preview mode
- No way to re-run a single asset without re-running the full pipeline (beyond individual commands)
- No input validation on URL format, description length, or audience

---

## What Belongs in Phase 2

Phase 2 introduces LLM-powered generation. The deterministic templates become fallbacks.

- **AI-generated positioning** — product-specific one-liners, taglines, and descriptions with multiple options
- **AI-generated drafts** — Product Hunt comments and Medium articles with real narrative structure
- **AI-powered routing** — richer platform scoring using website content analysis
- **Iterative refinement** — re-run a single asset with feedback ("make the tagline shorter")
- **Prompt management** — prompt templates in separate files, editable and version-controlled
- **Model selection** — `--model` flag for choosing LLM provider
- **Confidence scoring** — category detection with ranked candidates instead of first-match

Phase 1 outputs remain the fallback for offline use, rate limits, or when users prefer deterministic results.
