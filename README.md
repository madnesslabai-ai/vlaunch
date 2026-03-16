# vLaunch

A CLI that generates launch-ready assets from three inputs: a URL, a short description, and a target audience.

Built for indie hackers and solo founders who want structured launch prep without a marketing team.

## What It Does

vLaunch takes your project and produces 8 structured assets:

| Asset | File | Description |
|-------|------|-------------|
| Project Summary | `project-summary.md` | Structured overview with metadata |
| Positioning | `positioning.md` | One-liner, tagline, value prop, problem/solution |
| Routing Plan | `routing-plan.md` | Prioritized launch platforms with reasoning |
| Product Hunt Draft | `producthunt.md` | Tagline, pitch, first comment, launch checklist |
| Medium Draft | `medium-draft.md` | Publishable launch story |
| Directory Listings | `directories.json` | Platform-tailored directory entries |
| Affiliate Copy | `affiliate.md` | Partner outreach templates and commission framing |
| Launch Checklist | `checklist.md` | Readiness assessment with next actions |

Plus a `launch-manifest.json` with machine-readable metadata, a `consistency-report.md` that catches messaging drift across assets, and a `refinement-plan.json` for structured revision.

## Two Modes

**Deterministic (no API key needed):** Template-based generation using keyword matching, category detection, and structured heuristics. Produces usable drafts immediately.

**AI-enhanced (`--ai` flag):** Uses Anthropic Claude to rewrite each asset with product-specific language, strategic reasoning, and natural voice. Requires an `ANTHROPIC_API_KEY` in your `.env` file. Falls back to deterministic output if the API call fails.

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

- **`examples/oddsflow-ai/`** — Full AI-enhanced pipeline output (all 8 assets + manifest + consistency report)
- **`examples/oddsflow/`** — Deterministic-only baseline for the same product

## Limitations

- **v0.1.0** — early-stage, built during vibe coding
- Copy is structured drafts, not publish-ready — human review expected
- AI enhancement quality depends on API credits and prompt fit
- No web UI — CLI-first, file-based
- No live platform submission — generates drafts, not submissions
- Category detection covers common verticals but is not exhaustive

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
