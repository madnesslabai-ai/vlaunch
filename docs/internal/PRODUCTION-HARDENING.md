# Production Hardening

What needs to be true before vLaunch ships as a reliable open-source tool.

---

## 1. Schema Stability

### Risk
The manifest schema (`launch-manifest.json`, `asset-provenance.json`, `refinement-plan.json`) has evolved across multiple phases. Downstream agents that parse these files will break if fields change shape.

### Gates
- [ ] Freeze the manifest schema: document every field, type, and nullability
- [ ] Add a `schema_version` field to `launch-manifest.json` (start at `"1.0"`)
- [ ] Add a `schema_version` field to `refinement-plan.json`
- [ ] Write a schema validator that runs after every manifest write — warn on unexpected shapes
- [ ] Document breaking vs non-breaking changes policy: new fields are non-breaking, renamed/removed fields require a version bump

### Implementation order
1. Add `schema_version` to manifest and plan generators
2. Write `validateManifestSchema()` — run after every `generateManifest()` call
3. Document the schema in a `MANIFEST-SCHEMA.md`

---

## 2. Partial-Run Guarantees

### Risk
Running individual commands (`vlaunch position`, `vlaunch route`) produces a manifest that reflects a partial state. If an agent reads the manifest mid-pipeline, it may see stale or incomplete data.

### Gates
- [ ] Every command that writes assets also writes the manifest — already done as of 2.8.1
- [ ] Manifest must never contain stale asset entries: if a file is deleted externally, `exists: false` must be accurate
- [ ] Provenance must not be overwritten by a command that didn't generate the asset — already done as of 2.8.2
- [ ] Test: run `vlaunch position`, then `vlaunch check`, then `vlaunch refine positioning --feedback "..."` — verify provenance chain is correct at each step

### Implementation order
1. Add a pre-write freshness check: re-verify `fileExists()` for every asset before writing the manifest
2. Add integration test: partial pipeline → manifest accuracy
3. Add integration test: single-command → provenance accuracy

---

## 3. Failure Handling

### Risk
AI provider failures (network timeout, 429 rate limit, 503 overload, malformed response) are handled with basic try-catch but no retry logic. A transient failure during `vlaunch run --ai` wastes the entire run.

### Gates
- [ ] Add retry with exponential backoff for 429 and 503 responses (max 3 retries)
- [ ] Add per-asset timeout (60s default, configurable)
- [ ] Log retry attempts so users know what happened
- [ ] Never retry on 401 (bad API key) or 400 (malformed request)
- [ ] Manifest must accurately reflect which assets failed and why

### Implementation order
1. Add retry logic to `AnthropicProvider.generate()`
2. Add timeout to the fetch call
3. Update `EnhanceResult` to include retry count
4. Test with `ANTHROPIC_API_KEY=""` — verify clean failure, no crash, phase-1 preserved

---

## 4. Provenance and Manifest Reliability

### Risk
Provenance is stored in `asset-provenance.json` and read during manifest generation. If the file is corrupted, deleted, or out of sync with the actual assets, the manifest will be misleading.

### Gates
- [ ] If `asset-provenance.json` is missing, all assets show `"unknown"` — already done
- [ ] If `asset-provenance.json` is corrupted (invalid JSON), fall back to `"unknown"` — already done
- [ ] Provenance timestamp must not be newer than the file's actual mtime on disk
- [ ] Add a `vlaunch manifest` standalone command to regenerate the manifest from current state without running any pipeline
- [ ] Test: delete `asset-provenance.json`, run `vlaunch check` — verify manifest shows `"unknown"` for all assets

### Implementation order
1. Add mtime cross-check in manifest generator
2. Add `vlaunch manifest` command
3. Add test for corrupted provenance recovery

---

## 5. Fixture and Golden Tests

### Risk
There are no automated tests. Output quality is validated manually. Regressions in template logic, parser validation, or consistency checking are invisible until someone runs a demo.

### Gates
- [ ] Golden test for deterministic pipeline: fixed inputs → expected outputs, byte-for-byte comparison
- [ ] Golden test for consistency checker: fixed asset bundle → expected findings
- [ ] Golden test for manifest generator: fixed inputs → expected JSON structure
- [ ] Golden test for refinement plan: fixed consistency report + checklist → expected revisions
- [ ] Parser unit tests for every prompt contract: valid input → accepted, malformed input → rejected
- [ ] Run all golden tests in CI (GitHub Actions)

### Implementation order
1. Create `test/fixtures/` with a frozen OddsFlow input set (context.json, all assets)
2. Write deterministic pipeline golden test
3. Write consistency checker golden test
4. Write manifest golden test
5. Write parser unit tests for all 7 prompt contracts
6. Add `npm test` script and CI workflow

---

## 6. Agent Workflow Reliability

### Risk
The manifest + refinement plan + refine-apply loop is designed for agent consumption. If any step produces unexpected output, the agent loop breaks silently.

### Gates
- [ ] `refinement-plan.json` always contains valid JSON with the documented schema
- [ ] `refine-apply` fails cleanly with a useful error if the revision index doesn't exist
- [ ] `refine-apply` fails cleanly if the target asset doesn't exist on disk
- [ ] Guardrail rejection produces a clear, parseable error message — not just a console.warn
- [ ] Manifest `success` field accurately reflects whether the command completed without errors
- [ ] Add structured exit codes: 0 = success, 1 = failure, 2 = partial success (some assets failed)

### Implementation order
1. Standardize exit codes across all commands
2. Add JSON-format error output option (`--json-errors`) for agent consumption
3. Test the full agent loop: run → check → review → refine-apply → check — verify end-to-end

---

## 7. CLI Polish

### Risk
Minor usability issues that don't affect correctness but affect trust and adoption.

### Gates
- [ ] `--help` output is clear and complete for every command
- [ ] Unknown commands produce a helpful error, not a stack trace
- [ ] Missing required options produce a clear error
- [ ] `--version` works
- [ ] Add `--quiet` flag to suppress non-essential output
- [ ] Add `--verbose` flag for debugging

### Implementation order
1. Review all `--help` strings
2. Add global `--quiet` and `--verbose` flags
3. Test all error paths for clean output

---

## Release Gates Summary

Before open-source release:

| Gate | Status | Priority |
|------|--------|----------|
| Schema version in manifest | not started | high |
| Retry with backoff for AI calls | not started | high |
| Golden tests for deterministic pipeline | not started | high |
| Parser unit tests | not started | high |
| Exit code standardization | not started | medium |
| `vlaunch manifest` standalone command | not started | medium |
| Provenance mtime cross-check | not started | medium |
| CI workflow | not started | medium |
| `--quiet` / `--verbose` flags | not started | low |
| JSON error output for agents | not started | low |
| Schema documentation | not started | low |

### Suggested implementation order
1. Golden tests and parser unit tests (catch regressions before changing anything)
2. Schema version fields (non-breaking addition)
3. Retry with backoff (biggest reliability win)
4. Exit code standardization
5. `vlaunch manifest` command
6. CI workflow
7. CLI polish
