# Open-Source Release Checklist

As of 2026-03-16. Honest assessment of what's ready and what's not.

---

## 1. Current Release Status

vLaunch is a working CLI that generates launch-ready assets from three inputs. The deterministic pipeline, consistency checker, review planner, and refinement workflow all function correctly. Unit tests exist (110 passing, 18 suites). CI runs on Node 18/20/22. Schema versioning, partial-run integrity, and stale-state detection are implemented.

**Not yet validated under full AI enhancement** — all AI-enhanced runs failed due to Anthropic API credit constraints. The deterministic pipeline and prompt contract parsers are validated, but AI output quality across verticals has not been verified end-to-end in this session.

**Honest readiness: 75%.** The tool works. The safety nets work. The AI layer is designed but not battle-tested with live credits.

---

## 2. What Is Already Release-Strong

- **Deterministic asset generation** — 7 commands produce 8 structured assets. Works offline, no API key needed for baseline output.
- **Prompt contract validation** — All 7 AI prompts have `parseResponse()` validators with unit tests. Malformed AI output is rejected and deterministic fallback preserved.
- **Consistency checker** — Cross-asset verification with word-boundary matching, deduplication, partial-state honesty, and stale-state detection.
- **Review and refinement** — Structured refinement plan with correct asset targeting, classification (fixable vs external), brand anchor guardrails.
- **Manifest and provenance** — Machine-readable `launch-manifest.json` with schema versioning, integrity signaling, package completeness, and staleness detection.
- **Test coverage** — 110 unit tests across product name inference, category detection, parser contracts, consistency logic, review classification, and refinement guardrails.
- **CI** — GitHub Actions workflow on Node 18/20/22 matrix.
- **Developer docs** — CONTRIBUTING.md, .env.example, project structure guide.

---

## 3. Must-Finish Before Controlled Open-Source Release

These are hard blockers. Do not release without them.

- [ ] **Add LICENSE file** — No license file exists. Pick MIT or Apache 2.0 and add it. Without this, the repo is technically "all rights reserved" and unusable by others.
- [ ] **Add `license` field to package.json** — Must match the LICENSE file.
- [ ] **Clean up internal development docs** — The root has 12+ markdown files from development phases (PHASE-1-BASELINE.md, PHASE-2-COMPLETE.md, NEXT-STEPS.md, REPO-STATUS.md, etc.). These are internal notes, not user-facing docs. Move to `docs/internal/` or remove before release.
- [ ] **Update README.md** — Current README references "Phase 1" framing and limitations that are no longer accurate post-Phase 3. Should reflect current capabilities (consistency checker, review planner, stale detection, schema versioning).
- [ ] **Update CHANGELOG.md** — Add entries for Phase 3.2 work: stale-state detection, partial-run integrity, review target mapping, retry with backoff, schema versioning, CI/tests.
- [ ] **Run at least one full AI-enhanced validation** — The AI layer has never been validated with live credits in the current session. Before claiming "AI enhancement works," run `vlaunch run --ai` on at least one product with active API credits and verify the output.
- [ ] **Verify `npm pack` / `npx vlaunch` works** — The bin entry points to `./dist/index.js`. Verify that `npm run build && npm pack` produces a working tarball, and that the CLI is usable via `npx`.

---

## 4. Nice-to-Have After Release

These improve quality of life but are not blockers.

- [ ] **Add `repository`, `keywords`, and `homepage` to package.json** — Helps npm discoverability.
- [ ] **Add more validation cases** — Run against Writesonic, Cursor, Notion, and other products to stress-test category paths.
- [ ] **Integration tests** — Current tests are unit-level. Add tests that run a full `vlaunch run` against a fixture and verify manifest/report structure.
- [ ] **Offline mock for AI tests** — Allow tests to run without an API key by mocking Anthropic responses.
- [ ] **Refine the retry logic** — Current retry handles 429/503/529 but not network timeouts. Add timeout handling.
- [ ] **Add `--dry-run` flag** — Let users preview what a command would do without writing files.
- [ ] **Add `--json` output mode** — Let agents consume structured output directly from stdout instead of reading files.
- [ ] **Web workspace export** — The CLAUDE.md mentions "All outputs should be reusable for future web workspace." This is not yet implemented.

---

## 5. Public Examples to Include

These examples are safe and representative:

- **`examples/oddsflow-ai/`** — Full AI-enhanced output for a sports analytics product. Includes all 8 assets plus manifest and consistency report. Best showcase of the complete pipeline.
- **`examples/oddsflow/`** — Deterministic-only baseline for the same product. Shows what you get without an API key.

---

## 6. Examples to Defer

These are incomplete and may confuse users:

- **`examples/writesonic/`** — Only 4 assets, no consistency report, no manifest. Looks like an abandoned partial run.
- **`examples/ziwei-astrology/`** — Only 4 assets, same issue. The product itself is fine for showcasing category diversity, but the example set is incomplete.

Either complete these with full pipeline runs (including check + review) or remove them before release. Incomplete examples undermine credibility.

---

## 7. Required Repo/Docs Surface Before Publishing

| Item | Status | Action |
|------|--------|--------|
| LICENSE | Missing | Add MIT or Apache 2.0 |
| README.md | Exists, outdated | Update to reflect Phase 3 capabilities |
| CONTRIBUTING.md | Done | No action needed |
| .env.example | Done | No action needed |
| CHANGELOG.md | Exists, incomplete | Add Phase 3.2 entries |
| .gitignore | Done | Covers node_modules, dist, .env, .vlaunch |
| CI workflow | Done | Node 18/20/22 matrix |
| package.json `license` | Missing | Add to match LICENSE file |
| package.json `repository` | Missing | Add GitHub URL |
| Internal dev docs | 12+ files in root | Move to docs/internal/ or remove |

---

## 8. Suggested Release Sequence

1. **Add LICENSE + package.json license field**
2. **Clean internal docs out of root** (move to docs/internal/)
3. **Update README** to reflect current capabilities
4. **Update CHANGELOG** with Phase 3.2 entries
5. **Top up API credits and run one full AI validation** (`vlaunch run --ai` on OddsFlow or similar)
6. **Complete or remove incomplete examples** (writesonic, ziwei-astrology)
7. **Verify `npm pack` produces a usable package**
8. **Create a GitHub repo and push**
9. **Open a "Show HN" or similar post** with honest positioning (see below)
10. **Publish to npm** (optional — can defer until feedback confirms demand)

---

## 9. Suggested Release Positioning

How to describe vLaunch honestly:

> **vLaunch** is a CLI that generates launch-ready assets (positioning, Product Hunt draft, Medium post, routing plan, directory listings, affiliate copy, readiness checklist) from three inputs: a URL, a short description, and a target audience.
>
> It works in two modes: a deterministic baseline that needs no API key, and an AI-enhanced mode (via Anthropic Claude) that refines each asset. A built-in consistency checker and review planner catch messaging drift across assets before you publish.
>
> It's early-stage, built during vibe coding, and designed for indie hackers and solo founders who want structured launch prep without a marketing team. It's not a replacement for product-market fit.

**What not to claim:**
- Don't call it "production-ready" — it's 0.1.0
- Don't claim "battle-tested across verticals" — full AI validation is limited
- Don't promise web UI or SaaS — this is CLI-first, file-based
- Don't claim it writes perfect copy — it generates structured drafts that need human review
