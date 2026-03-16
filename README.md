# vLaunch

[![CI](https://github.com/madnesslabai-ai/vlaunch/actions/workflows/ci.yml/badge.svg)](https://github.com/madnesslabai-ai/vlaunch/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![GitHub release](https://img.shields.io/github/v/release/madnesslabai-ai/vlaunch)](https://github.com/madnesslabai-ai/vlaunch/releases)

# vLaunch

vLaunch is a CLI for generating, reviewing, and refining launch assets from three inputs: a URL, a short description, and a target audience.

It is built for founders, builders, and small teams who want structured launch preparation without relying on a full marketing workflow.

## What It Does

vLaunch takes a project and generates a structured launch package as editable local files.

Core outputs include:

| Asset | File | Description |
|-------|------|-------------|
| Positioning | `positioning.md` | One-liner, tagline, value proposition, problem/solution framing |
| Routing Plan | `routing-plan.md` | Prioritized launch platforms with reasoning |
| Product Hunt Draft | `producthunt.md` | Tagline, pitch, first comment, and launch checklist |
| Medium Draft | `medium-draft.md` | Long-form launch draft |
| Directory Listings | `directories.json` | Platform-tailored listing copy |
| Affiliate Copy | `affiliate.md` | Partner outreach templates and commission framing |
| Launch Checklist | `checklist.md` | Readiness assessment with next actions |

vLaunch also generates machine-readable and validation outputs, including:

- `launch-manifest.json` — machine-readable run metadata
- `consistency-report.md` — cross-asset consistency checks
- `refinement-plan.md` / `refinement-plan.json` — structured revision suggestions

## Two Modes

**Deterministic (no API key required)**  
Template-based generation using category detection, structured heuristics, and rule-based assembly. Produces usable drafts immediately.

**AI-enhanced (`--ai`)**  
Uses Anthropic Claude to improve each asset with product-specific language, strategic reasoning, and more natural narrative flow. Requires `ANTHROPIC_API_KEY` in `.env`. If AI enhancement fails, deterministic output is preserved.

## Quick Start

```bash
npm install
npm run build

# Full deterministic pipeline
npx vlaunch run \
  --url "https://yourproject.com" \
  --description "A tool that does X" \
  --audience "founders and builders"

# Full AI-enhanced pipeline
npx vlaunch run \
  --url "https://yourproject.com" \
  --description "A tool that does X" \
  --audience "founders and builders" \
  --ai

# Consistency check
npx vlaunch check

# Generate a refinement plan
npx vlaunch review

# Apply a suggested revision
npx vlaunch refine-apply 1

All outputs are written to .vlaunch/ as markdown and JSON files that can be edited, committed, and reused in other workflows.

## Quick Start

```bash
# Install
npm install
npm run build

# Run the full pipeline
npx vlaunch run \
  --url "https://yourproject.com" \
  --description "A tool that does X" \
  --audience "indie hackers"

# With AI enhancement
npx vlaunch run \
  --url "https://yourproject.com" \
  --description "A tool that does X" \
  --audience "indie hackers" \
  --ai

# Check consistency across assets
npx vlaunch check

# Generate a refinement plan
npx vlaunch review

# Apply a specific revision
npx vlaunch refine-apply 1
```

All outputs go to `.vlaunch/assets/` — markdown and JSON, human-editable, version-controllable.

## Commands

| Command | Description |
|---------|-------------|
| `vlaunch init` | Create `.vlaunch/` directory structure |
| `vlaunch scan` | Capture project context (fetches URL metadata) |
| `vlaunch position` | Generate positioning copy |
| `vlaunch route` | Generate platform routing plan |
| `vlaunch package` | Generate channel-specific launch assets |
| `vlaunch checklist` | Generate launch readiness checklist |
| `vlaunch run` | Run the full pipeline in one command |
| `vlaunch check` | Cross-asset consistency checker |
| `vlaunch review` | Generate structured refinement plan |
| `vlaunch refine` | Revise a single asset with feedback |
| `vlaunch refine-apply` | Apply a revision from the refinement plan |

Each command can be run independently. Pass `--ai` to enable AI enhancement on supported commands.

## Output Structure

```
.vlaunch/
  project.yaml
  context.json
  asset-provenance.json
  assets/
    project-summary.md
    positioning.md
    routing-plan.md
    producthunt.md
    medium-draft.md
    directories.json
    affiliate.md
    checklist.md
    consistency-report.md
    refinement-plan.md
    refinement-plan.json
    launch-manifest.json
```

## Examples

See [`EXAMPLES-INDEX.md`](EXAMPLES-INDEX.md) for complete example outputs.
Current public examples include:
- **`examples/oddsflow-ai/`** — Full AI-enhanced pipeline output (all 8 assets + manifest + consistency report)
- **`examples/oddsflow/`** — Deterministic-only baseline for the same product

## Limitations

- vLaunch generates structured drafts, not final publish-without-review copy
- AI-enhanced output depends on model availability, credits, and prompt fit
- No web UI — CLI-first and file-based by design
- No direct platform submission — vLaunch prepares assets, it does not post them
- Category detection covers common product types, but is not exhaustive


## Setup for AI Enhancement

```bash
cp .env.example .env
# Add your Anthropic API key to .env:
# ANTHROPIC_API_KEY=sk-ant-...
```

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for development setup, project structure, and contribution guidelines.

## License

[MIT](LICENSE)
