# Changelog

## Phase 3.1.1 — Refinement plan classification
- Extended revision entries with `revision_type`, `fixable_by_refine`, `needs_external_asset`, `needs_site_change`, `needs_distribution_work`
- 7 revision types: copy_refinement, messaging_alignment, proof_gap, cta_clarity, social_proof_gap, external_asset_dependency, platform_strategy_adjustment
- Classification is deterministic — based on keyword matching against finding text
- External blockers (screenshots, pricing, demo, accounts) are now included in the plan but marked as not fixable by refinement
- `auto_apply_suitability` set to `"none"` for external-only revisions
- Markdown plan shows fixability per revision: "Yes — fixable via `vlaunch refine-apply N`" or "No — requires external assets / site changes / distribution work"
- Apply order sorts fixable revisions first, external revisions last
- Notes section reports fixable vs external counts
- Overall assessment includes fixable/external split

## Phase 3.1 — Review-driven batch refinement
- Added `vlaunch review` — deterministic planner that reads consistency-report.md, checklist.md, and launch-manifest.json to produce a structured refinement plan
- Generates `refinement-plan.md` (human-readable) and `refinement-plan.json` (agent-consumable)
- Each revision includes: target asset, priority (high/medium/low), why it matters, suggested feedback, auto-apply suitability
- Suggested apply order sorts high-priority revisions first
- External actions (screenshots, pricing page, account setup) are filtered out — only asset-content revisions are recommended
- Detects generic phrasing patterns in positioning and recommends cleanup
- Added `vlaunch refine-apply <index>` — applies a specific revision from the plan using the existing refine infrastructure with all guardrails
- Plan is deterministic — no AI required to generate it
- Notes section explains what can and cannot be addressed via refinement

## Phase 3.0.1 — Refinement guardrails
- Added brand anchor preservation to refinement system prompt: product name, audience, and proof language must be retained unless feedback explicitly targets them
- Brand anchors loaded from `launch-manifest.json` normalized baseline and injected into the system prompt
- Post-refinement anchor validation: checks refined output against original for product name, audience keywords, and proof/claim terms
- Positioning-specific one-liner guardrail: product name must appear in the `## One-liner` section, not just elsewhere in the document — enforced both in the system prompt and in post-validation
- Refinement rejected if anchors silently dropped — original asset preserved, user told to mention them explicitly in feedback
- Feedback-aware bypass: anchor checks are skipped for terms the feedback explicitly references (e.g., "remove the product name" won't trigger the product name guardrail)
- Improved refinement summary: reports which brand anchors were preserved and which (if any) were dropped
- Tested: positioning refinement with "shorter tagline" preserves "OddsFlow" in the one-liner

## Phase 3.0 — Refinement workflow
- Added `vlaunch refine <asset> --feedback "..."` command for targeted revision of a single asset
- Supports 5 assets in v1: positioning, producthunt, medium, routing, affiliate
- Reads current asset from disk + scan context + positioning (for downstream assets) + user feedback
- Uses asset-specific refinement system prompt with structure preservation rules
- Reuses each asset's existing `parseResponse()` validator — refined output must pass the same checks as initial enhancement
- Overwrites only on success; original preserved on failure
- Updates manifest and provenance after refinement (`command_scope: "refine"`, `touched_in_current_command: true` on the refined asset only)
- Implemented in `src/commands/refine.ts` (command handler + asset registry) and `src/lib/ai/refine.ts` (orchestrator)
- No changes to existing generation flows — refinement is additive

## Phase 2.8.2 — Manifest provenance polish
- Separated run context from asset provenance — `run.mode` reflects the current command, asset entries reflect original generation history
- Replaced `generation_mode` with `last_known_generation_mode` on asset entries — reads from persisted provenance, not inferred from current command
- Added `last_updated_at` timestamp per asset from provenance records
- Added `touched_in_current_command` boolean per asset — lets downstream agents distinguish "generated now" from "existed already"
- Added `.vlaunch/asset-provenance.json` — lightweight file-based provenance store, updated by every generating command
- Provenance persists across commands: `vlaunch run --ai` records AI-enhanced provenance, subsequent `vlaunch check` preserves it
- Assets without provenance history show `"unknown"` instead of falsely claiming deterministic
- Consistency-report correctly remains `"deterministic"` even after an AI-enhanced pipeline run

## Phase 2.8.1 — Manifest polish pass
- Cleaned trailing colons from `top_blockers` and `recommended_next_actions` extracted values
- Added `readiness_level` field: "not-ready" / "soft-launch-ready" / "launch-ready" derived from readiness score
- Added `readiness_score` field: parsed from percentage in checklist status text, falls back to blocker-count heuristic
- Expanded `command_scope` coverage: `position`, `route`, `package`, `checklist` commands now generate/update the manifest after execution
- Verified consistency rate: 73% (8/11 checks) is correct for current AI-enhanced assets
- Improved partial-run stability: individual commands produce a manifest reflecting whatever assets exist at that point

## Phase 2.8 — Agent-ready output layer
- Implemented `src/commands/manifest.ts` — generates `.vlaunch/launch-manifest.json` after every pipeline run
- Manifest includes: project metadata, run metadata, per-asset status, consistency summary, readiness summary, normalized baseline
- Each asset entry tracks `generation_mode` (ai-enhanced / deterministic / fallback-preserved) and `status` (success / skipped / failed)
- Enhancement results are collected from position, route, package, and checklist commands and forwarded to the manifest generator
- Consistency summary parsed from consistency-report.md: rate, checks passed/total, major/minor finding counts
- Readiness summary parsed from checklist.md: launch status, top blockers (up to 5), recommended next actions (up to 5)
- Normalized baseline parsed from consistency-report.md: product name, one-liner, tagline, audience, proof/claim language
- Added as step 8/8 in `vlaunch run` pipeline
- `vlaunch check` also generates/updates the manifest
- Fully deterministic — no AI required, no API calls
- Schema is stable and machine-readable for downstream agent consumption

## Phase 2.7 — AI-enhanced affiliate copy
- Fully implemented `src/lib/ai/prompts/affiliate.ts` prompt contract
- System prompt produces product-specific partner recommendations, category-aware commission framing, and ready-to-send outreach emails
- Reads positioning, routing plan, and directories as context for channel alignment
- Partner types are specific to the product category (YouTube match analysts, Telegram tip channel operators, subreddit contributors, Betfair traders)
- Commission structure presented as draft recommendations, not confirmed terms
- Outreach template is personalized with content-specific hooks
- Parser validates `# Affiliate Draft` heading and 4+ of 5 required sections
- Added affiliate.md to the `enhanceAssets` batch in `package.ts`
- Falls back to phase-1 output if enhancement fails
- All 7 enhanceable assets now have AI enhancement

## Phase 2.6 — Cross-asset consistency checker
- Implemented `src/commands/check.ts` — deterministic consistency checker across all generated assets
- Checks 6 dimensions: brand name, positioning alignment, claim consistency, audience consistency, platform strategy, and tone
- Extracts baseline from positioning.md: product name, one-liner, tagline, audience, claim language patterns
- Brand name check verifies consistent naming across PH, Medium, directories, and routing plan
- Positioning alignment check uses phrase overlap scoring to detect tagline/subtitle drift
- Claim consistency flags absolute claims ("most accurate", "the best", "guaranteed") and detects evidence language used inconsistently across user-facing assets
- Audience check measures keyword coverage to detect targeting drift between assets
- Platform strategy check validates directories.json entries against routing-plan.md recommendations and "Avoid" section
- Tone check detects category language leakage (launch-tool terms in sports products, mixed category signals)
- Generates `consistency-report.md` with: overall assessment, consistency rate, what is consistent, detected inconsistencies, high-priority fixes, and standardized brand/message baseline
- Added `vlaunch check` standalone command
- Added consistency check as step 7/7 in `vlaunch run` pipeline
- Fully deterministic — no AI required, no API calls

## Phase 2.5 — AI-enhanced checklist
- Fully implemented `src/lib/ai/prompts/checklist.ts` prompt contract
- System prompt produces product-aware launch readiness coaching: specific strengths, concrete gaps, prioritized next actions
- Builds user prompt from all generated assets (positioning, PH, Medium, routing, directories, affiliate) for full-context assessment
- Parser validates `# Launch Checklist` heading and 3+ of 4 required sections
- Added `--ai` flag to `vlaunch checklist` command
- Updated `run.ts` to pass `--ai` through to `checklistProject()`
- Gaps are stated as possibilities ("likely needed", "not yet visible") rather than confirmed facts
- Falls back to phase-1 deterministic checklist if enhancement fails

## Phase 2.4 — AI-enhanced routing plan and directories
- Fully implemented `src/lib/ai/prompts/routing.ts` prompt contract
- System prompt produces product-specific platform recommendations with strategic reasoning, not generic platform descriptions
- Parser validates `# Routing Plan` heading and 4+ of 5 required sections
- Fully implemented `src/lib/ai/prompts/directories.ts` prompt contract
- System prompt rewrites directory listing descriptions to be platform-tailored and product-specific
- Parser validates JSON array structure, 3+ entries, and all required fields
- Added `--ai` flag to `vlaunch route` command
- Updated `run.ts` to pass `--ai` through to `routeProject()`
- Added directories.json to the `enhanceAssets` batch in `package.ts`
- Both prompts read AI-enhanced positioning.md as additional context
- Falls back to phase-1 output if response fails validation

## Phase 2.3 — AI-enhanced Medium draft
- Fully implemented `src/lib/ai/prompts/medium.ts` prompt contract
- System prompt guides the LLM to write a publishable launch story with real narrative arc
- Intro uses engaging hooks instead of template openings ("We started building X because...")
- Problem, What We Built, and Why Now sections written with concrete detail and product-specific language
- Response parser validates heading structure (5+ of 7 sections required), URL presence, and code fence stripping
- Uses AI-enhanced positioning as context for voice and framing
- Falls back to phase-1 output if response fails validation

## Phase 2.2 — AI-enhanced Product Hunt draft
- Fully implemented `src/lib/ai/prompts/producthunt.ts` prompt contract
- System prompt produces natural, maker-voice first comments with specific product details
- Tagline, Short Pitch, and First Comment are AI-rewritten; Launch Checklist preserved verbatim
- Response parser validates heading structure, requires all 5 sections, and verifies checklist has 5+ checkbox items
- Reads AI-enhanced positioning.md as additional context for voice alignment
- Wired into `vlaunch package --ai` and `vlaunch run --ai`
- Falls back to phase-1 output if response fails validation or API is unavailable

## Phase 2.1 — AI-enhanced positioning
- Added `--ai` flag to `vlaunch position`, `vlaunch package`, and `vlaunch run`
- Built provider abstraction (`src/lib/ai/provider.ts`) with `AIProvider` interface and factory
- Implemented Anthropic/Claude provider (`src/lib/ai/anthropic.ts`) using the Messages API
- Built enhancement orchestrator (`src/lib/ai/enhance.ts`) with safe overwrite (phase-1 preserved on failure)
- Fully implemented positioning prompt contract (`src/lib/ai/prompts/positioning.ts`)
- Response parser validates heading structure, requires 4+ of 7 sections, strips code fences
- Added `dotenv/config` for `.env` file support; API key read from `ANTHROPIC_API_KEY`
- Created `.gitignore` to exclude `.env`, `node_modules/`, `dist/`, `.vlaunch/`
- All AI enhancement is optional — without `--ai`, behavior is identical to Phase 1
- Graceful error handling: missing API key or provider failure logs cleanly and preserves phase-1 output

## Phase 1.9 — Description source selection heuristics
- `bestDescription()` now evaluates whether fetched metadata is suitable for mid-sentence use
- Added `looksLikeFeatureList()` to detect imperative, multi-sentence, or feature-dump copy
- Added `suitableForMidSentence()` to reject text that breaks "X is [desc]" grammar (e.g. bare imperative verbs)
- Falls back to CLI description when fetched metadata is low quality
- `inferTaglineFromMeta()` now uses only the second title segment instead of joining all segments
- Tagline extraction capped at 80 chars and rejects feature-list patterns
- Fixed title separator regex to handle plain hyphens (`-`), not just em/en dashes
- Standalone taglines are now properly capitalized when used as headings
- Consistent `lowercaseStart()` helper applied to both CLI and meta description paths

## Phase 1.8 — Spirituality / wellness category support
- Added `spirituality_wellness` product category
- Detection via keyword matching: astrology, zi wei, destiny, horoscope, tarot, spiritual guidance, self-discovery, etc.
- Category-specific positioning tone: calm, credible, respectful of tradition — not clinical or mystical
- One-liner/tagline overrides emphasize modern access to traditional wisdom and personalized interpretation
- Problem/solution framing: practitioner-vs-generic-tool gap, not "AI hype vs utility"
- PH comment follow-up highlights traditional grounding and chart-specific interpretation
- Medium draft "What We Built" uses tradition-appropriate language (interpretive depth, transparent reasoning)
- Platform routing excludes Hacker News, Dev.to, Indie Hackers; boosts YouTube and Reddit
- Improved `inferProductName()` to accept multi-word brand names up to 5 words with proper-noun detection
- Improved `audienceVariants()` to handle "people interested in X, Y, and Z" patterns

## Phase 1.7 — Category-aware copy polish
- Added `audienceVariants()` helper to reduce repetitive audience phrasing across all assets
- Short form uses first two items from comma-separated lists; pronoun/noun variants for further reduction
- Updated `getCategoryContext` for `sports_analytics`: verification-first language, published track records, no absolute claims
- Category-level overrides for one-liner, tagline, and description via `oneLiner`, `tagline`, and `rewriteDesc` on CategoryContext
- Sports analytics description rewritten to avoid "most accurate AI football predictor" in favor of evidence-based language
- PH comment and Medium draft use category-specific follow-up sentences
- All downstream generators (positioning, PH, Medium, directories, affiliate) use audience variants consistently

## Phase 1.6 — Metadata-aware asset generation
- Downstream generators now prefer fetched website metadata over raw CLI inputs
- `bestDescription` helper strips product name collisions and composes clean sentences
- `inferProductName` extracts brand names from page titles (e.g. "Cursor" from "Cursor: The best way to code with AI")
- `inferTaglineFromMeta` pulls taglines from title and meta description
- positioning.md, producthunt.md, and medium-draft.md produce grounded copy when metadata is available
- Graceful fallback to CLI description when no metadata exists

## Phase 1.5 — Website metadata fetching
- `vlaunch scan` now fetches the provided URL and extracts page metadata
- Extracts: final URL, domain, page title, meta description, text preview
- Text preview filters out navigation noise, UI fragments, localhost URLs, and dashboard text
- Enriched metadata saved to `fetched` field in context.json
- project-summary.md now displays fetched title, meta description, and text preview
- Scan remains non-blocking — fetch failures fall back to CLI inputs only
- Scan command and pipeline are now async

## Phase 1 — CLI scaffold and deterministic pipeline
- Initial TypeScript CLI built with Commander
- Implemented all seven commands: init, scan, position, route, package, checklist, run
- `vlaunch init` creates .vlaunch/ directory structure with project.yaml and context.json
- `vlaunch scan` captures URL, description, and target audience
- `vlaunch position` generates one-liner, tagline, short/long descriptions, problem/solution/why-now
- `vlaunch route` scores platforms with keyword matching and generates a prioritized launch sequence
- `vlaunch package` generates producthunt.md, medium-draft.md, directories.json, and affiliate.md
- `vlaunch checklist` inspects generated assets and produces a readiness checklist
- `vlaunch run` executes the full pipeline in one command
- All outputs are markdown or JSON, human-editable, and saved under .vlaunch/assets/
- Added dev:* npm scripts for each command
- Iteratively improved template quality across all assets to reduce generic phrasing
