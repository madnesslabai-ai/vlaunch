# Phase 3 — Refinement Workflow

Phase 3 adds feedback-driven refinement: targeted revision of a single asset without re-running the pipeline. Built for human iteration and agent workflows.

---

## New Command

```
vlaunch refine <asset> --feedback "..."
```

Revises one asset based on the feedback instruction. Leaves all other assets untouched.

---

## Supported Assets

| Asset | Identifier | Notes |
|-------|-----------|-------|
| Positioning | `positioning` | Root asset — no downstream context needed |
| Product Hunt draft | `producthunt` | Reads current positioning for voice alignment |
| Medium draft | `medium` | Reads current positioning for voice alignment |
| Routing plan | `routing` | Reads current positioning for voice alignment |
| Affiliate draft | `affiliate` | Reads current positioning for voice alignment |

Checklist, directories, and consistency-report are not yet refinable.

---

## How Refinement Works

1. **Read** the current asset from `.vlaunch/assets/`
2. **Load context**: scan context from `context.json`, positioning (for downstream assets), brand anchors from `launch-manifest.json`
3. **Build prompt**: asset-specific system prompt with structure rules + user feedback
4. **Call AI provider**: same `AIProvider` abstraction used for initial enhancement
5. **Validate**: refined output must pass the asset's existing `parseResponse()` validator
6. **Check brand anchors**: verify product name, audience, and proof language were preserved (see Guardrails below)
7. **Write on success only**: overwrite the asset file; original preserved if any check fails
8. **Update provenance**: manifest and `asset-provenance.json` updated with `command_scope: "refine"`

---

## Safety Rules and Validation

- **Structure validation**: the same `parseResponse()` that validates initial AI enhancement validates refinement output — heading structure, required sections, content checks
- **Overwrite-on-success**: if validation fails, the original file is untouched
- **Scoped changes**: only the target asset is modified; no side effects on other assets
- **Manifest honesty**: `touched_in_current_command` is `true` only for the refined asset

---

## Guardrails (Phase 3.0.1)

Refinement preserves brand identity by default. Three categories of anchors are protected:

### Product name
- Must appear in the refined output if it appeared in the original
- **Positioning-specific**: must appear in the `## One-liner` section specifically, not just elsewhere in the document
- Enforced in both the system prompt (instruction to the LLM) and post-validation (code rejects the output if missing)

### Audience
- Target audience keywords must be present if they were in the original
- Checked via significant keyword overlap (first 3 words longer than 3 characters)

### Proof/claim language
- Terms from `normalized_baseline.core_proof_claim_language` (e.g., "verified", "track record", "published") are checked
- Only terms that appeared in the original asset are validated — new terms aren't required
- Silent removal of proof language is rejected

### Feedback-aware bypass
All guardrails are bypassed when the feedback explicitly targets the anchor:
- `--feedback "remove OddsFlow from the one-liner"` → product name guardrail skipped
- `--feedback "change the audience to casual fans"` → audience guardrail skipped
- `--feedback "drop the verified language"` → proof language guardrail skipped

### Summary output
After refinement, the CLI reports what was preserved and what was dropped:
```
Brand anchors preserved:
  ✓ product name "OddsFlow"
  ✓ product name "OddsFlow" in one-liner
  ✓ audience ("football bettors and sports traders")
  ✓ proof language (verified, published, track record, auditable, accountable)
```

---

## Example Refinement Flow

```bash
# Initial AI-enhanced pipeline
vlaunch run --url "https://oddsflow.ai" \
  --description "AI football predictions with a verified track record" \
  --audience "football bettors and sports traders" \
  --ai

# Refine positioning: tighter tagline
vlaunch refine positioning \
  --feedback "shorter tagline — 4 words max. Make the one-liner more direct."

# Refine PH draft: more personal first comment
vlaunch refine producthunt \
  --feedback "make the first comment feel more personal and less polished"

# Refine Medium: shorter intro
vlaunch refine medium \
  --feedback "shorten the intro and make it more concrete"

# Refine routing: reprioritize channels
vlaunch refine routing \
  --feedback "prioritize YouTube earlier and explain why"

# Refine affiliate: tighter outreach
vlaunch refine affiliate \
  --feedback "make the outreach email more concise and more businesslike"
```

Each command updates only the target asset. Manifest and provenance are updated after each refinement.

---

## Why Refinement Matters for Agent Workflows

Refinement makes the pipeline agent-composable:

- An agent reads `launch-manifest.json`, identifies a weak area (e.g., readiness score is low, checklist flags missing proof), and issues a targeted `vlaunch refine` command
- The feedback loop is structured: read manifest → decide what to improve → refine one asset → re-read manifest
- Guardrails prevent the agent from accidentally degrading brand consistency during iteration
- Provenance tracking lets the agent distinguish "generated once" from "refined 3 times"
- The manifest's `touched_in_current_command` field tells the agent exactly what changed in the last step

---

## Files

| File | Purpose |
|------|---------|
| `src/commands/refine.ts` | Command handler, asset registry, system prompt builder, summary printer |
| `src/lib/ai/refine.ts` | Refinement orchestrator, brand anchor loader, anchor checker |

---

## What Comes Next

### Near-term
- **Refinement for checklist and directories** — extend the asset registry
- **Diff preview** — show what changed before confirming the overwrite
- **Multi-step refinement** — chain multiple feedback rounds in one command

### Medium-term
- **Agent-driven refinement loop** — agent reads manifest, identifies gaps, issues refine commands autonomously
- **Refinement history** — log each refinement with feedback and diff for audit
- **Cross-asset cascade** — after refining positioning, offer to propagate changes to downstream assets
