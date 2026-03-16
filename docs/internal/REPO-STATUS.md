# Repo Status

vLaunch — agentic CLI for launch preparation during vibe coding. As of 2026-03-16.

---

## Project Status

vLaunch is a working CLI that turns three inputs (URL, description, audience) into a complete launch package. Phase 1 (deterministic pipeline) and Phase 2 (AI enhancement + consistency checking + manifest) are complete. Phase 3 (feedback-driven refinement) has started.

The system is production-usable today for generating and refining launch assets.

---

## What Is Working Now

```bash
# Full AI-enhanced pipeline — generates 8 assets in one command
vlaunch run --url "https://yourproduct.com" \
  --description "what it does" \
  --audience "who it's for" \
  --ai

# Targeted refinement of a single asset
vlaunch refine positioning --feedback "shorter tagline, keep the product name"

# Deterministic consistency check
vlaunch check

# Individual commands
vlaunch init | scan | position | route | package | checklist
```

All commands work independently. All outputs are local files under `.vlaunch/assets/` — markdown and JSON, human-editable, version-controllable.

---

## Completed Milestones

### Phase 1 — Deterministic pipeline
CLI scaffold with 7 commands. Category detection (sports_analytics, spirituality_wellness, ai_product, developer_tool, launch_tool, saas, general). Website metadata fetching. All assets generated from templates without AI.

### Phase 2 — AI enhancement layer
- **2.1–2.5**: AI enhancement for positioning, Product Hunt, Medium, routing, directories, checklist (6 assets)
- **2.6**: Deterministic cross-asset consistency checker — 6 dimensions, stem-based matching, severity grading
- **2.7**: AI-enhanced affiliate copy — all 7 content assets now have AI enhancement
- **2.8**: Machine-readable `launch-manifest.json` — project metadata, per-asset status, consistency summary, readiness scoring, normalized baseline
- **2.8.1**: Manifest polish — readiness_level/readiness_score, trailing colon cleanup, expanded command_scope coverage
- **2.8.2**: Provenance-aware manifest — `asset-provenance.json` persists generation history across commands

### Phase 3 — Refinement workflow (in progress)
- **3.0**: `vlaunch refine <asset> --feedback "..."` — targeted revision of one asset without re-running the pipeline
- **3.0.1**: Brand anchor guardrails — product name preserved in one-liner, audience and proof language protected, feedback-aware bypass

---

## Phase 3 Status

Refinement is working for 5 assets: positioning, producthunt, medium, routing, affiliate.

Guardrails enforce brand consistency: product name must appear in the positioning one-liner, audience and proof language are preserved by default, and all guardrails can be bypassed with explicit feedback.

Not yet refinable: checklist, directories, consistency-report.

---

## Key Repo Documents

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Development rules and coding conventions for vLaunch |
| `CHANGELOG.md` | Per-phase changelog with detailed bullet points |
| `PHASE-1-BASELINE.md` | Phase 1 milestone snapshot — deterministic pipeline |
| `PHASE-2-BASELINE.md` | Phase 2.4 milestone snapshot — first AI enhancement round |
| `PHASE-2-COMPLETE.md` | Full Phase 2 milestone — all enhancements, manifest, provenance |
| `PHASE-3-REFINE.md` | Phase 3 refinement workflow — command, guardrails, agent integration |
| `DEMO-OVERVIEW.md` | Walkthrough of vLaunch capabilities for demos |
| `USE-CASES.md` | Product use cases across verticals |
| `CATEGORY-MAP.md` | Product category detection rules and overrides |
| `NEXT-STEPS.md` | Development roadmap priorities |
| `README.md` | Project introduction |

---

## Validated Examples

### `examples/oddsflow-ai/` — Full AI pipeline + refinement
- **Category**: sports_analytics
- **Assets**: positioning, producthunt, medium-draft, routing-plan, directories, affiliate, checklist, consistency-report, launch-manifest
- **Consistency**: 90% (9/10 checks)
- **Readiness**: 55% — soft-launch-ready
- **Refinement tested**: positioning tagline and one-liner refined with guardrails

### `examples/oddsflow/` — Phase 1 deterministic baseline
- Same product, deterministic-only output for comparison

### `examples/ziwei-astrology/` — spirituality_wellness category
- Phase 1 validated, AI enhancement not yet tested

### `examples/writesonic/` — ai_product category
- Phase 1 validated, AI enhancement not yet tested

---

## Current Strengths

- **Three inputs to launch package** — URL, description, audience produce 8+ structured assets
- **Full AI coverage** — all 7 content assets have AI enhancement with validated fallback
- **Deterministic safety net** — every asset works without API keys or network access
- **Structured validation** — `parseResponse()` on every prompt contract prevents malformed output
- **Context chaining** — AI-enhanced positioning feeds all downstream prompts for consistent voice
- **Cross-asset consistency** — deterministic checker catches brand drift, claim gaps, audience targeting issues
- **Agent-ready manifest** — machine-readable JSON with provenance, readiness scoring, and normalized baseline
- **Feedback-driven refinement** — revise one asset at a time with brand guardrails
- **Honest provenance** — asset generation history survives across commands
- **Minimal dependencies** — raw fetch to Anthropic API, no SDK, no framework

---

## Likely Next Priorities

1. **Extend refinement** to checklist and directories
2. **Multi-vertical AI validation** — run Zi Wei and Writesonic through `--ai`
3. **Diff preview** before overwriting during refinement
4. **Retry with backoff** for 429/503 API errors
5. **Agent-driven refinement loop** — agent reads manifest, identifies gaps, issues refine commands
6. **Cross-asset cascade** — after refining positioning, propagate changes to downstream assets
7. **Multi-provider support** — OpenAI, Groq, or local models via `--provider`
8. **Selective asset enhancement** — `--only producthunt` flag for `package`
