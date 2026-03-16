# vLaunch — Demo Overview

## What vLaunch Is

vLaunch is a CLI-first launch generation engine for any product. You give it a URL, a short description, and a target audience. It gives you positioning, a distribution plan, platform-specific drafts, and a launch-readiness assessment — all as local files you can edit and ship.

It works across multiple product categories. It adapts tone, framing, and platform recommendations based on what the product is and who it is for. No accounts, no dashboards — just files.

---

## What You Input

Three things:

```bash
vlaunch run \
  --url "https://yourproduct.com" \
  --description "what it does in one sentence" \
  --audience "who it's for"
```

vLaunch fetches the URL, extracts metadata such as title, description, and text preview, detects the product category, and uses that context to generate assets that sound like the actual product.

---

## What vLaunch Generates

Seven files, saved to `.vlaunch/assets/`:

| File | What You Get |
|------|-------------|
| `positioning.md` | One-liner, tagline, short and long descriptions, problem, solution, why now |
| `routing-plan.md` | Which platforms to launch on, in what order, with a week-by-week sequence |
| `producthunt.md` | Product name, tagline, short pitch, first comment draft, launch checklist |
| `medium-draft.md` | Full article draft with title, subtitle, intro, problem, solution, and CTA |
| `directories.json` | Platform-specific listings with descriptions tailored to each channel |
| `affiliate.md` | Partner outreach template, ideal partner types, suggested commission structure |
| `checklist.md` | What is strong, what is missing, what to do next, and an honest readiness assessment |

Everything is markdown or JSON. Edit the files directly, version-control them, or copy-paste them into the platforms you are launching on.

---

## Deterministic Mode vs AI-Enhanced Mode

### Deterministic (default)

```bash
vlaunch run --url "..." --description "..." --audience "..."
```

No API keys required. No external LLM calls. After the initial URL fetch, generation stays deterministic and file-based. Fast, predictable, and usable immediately.

### AI-Enhanced

```bash
vlaunch run --url "..." --description "..." --audience "..." --ai
```

Same pipeline, but each asset is enhanced by Claude with product-specific language, stronger narrative structure, and platform-appropriate tone. The AI uses positioning as upstream context so voice and framing stay consistent across downstream assets.

Requires `ANTHROPIC_API_KEY` in your environment or a `.env` file.

If AI enhancement fails — missing key, network issue, or invalid response — the deterministic output is preserved. You still get usable files, and nothing is partially overwritten.

### What changes with AI

| Asset | Without `--ai` | With `--ai` |
|-------|----------------|-------------|
| Positioning | Category-level templates | Product-specific value props and competitive framing |
| Product Hunt | Structural draft, boilerplate voice | Natural maker voice with specific product details |
| Medium | Template sections, placeholder narrative | Publishable story with real hooks and concrete detail |
| Routing | Keyword-scored platform list | Named communities and more strategic reasoning |
| Directories | Generic platform descriptions | Tone adapted per platform |
| Checklist | Generic readiness guidance | Product-aware coaching with specific gaps and prioritized actions |

---

## Validated Examples

vLaunch has been tested across multiple product categories to verify that tone, framing, and platform routing adapt correctly.

### OddsFlow — AI football predictions
- **URL**: https://oddsflow.ai
- **Category**: `sports_analytics`
- **Tested**: Deterministic + full AI pipeline
- **What it showed**: Routing names betting communities directly. Directories adapt tone per channel. Medium draft centers on accountability and verifiable signals. Checklist identifies missing screenshots, absent pricing, and unpublished accuracy stats as the main blockers.
- **Outputs**: `examples/oddsflow/` (deterministic), `examples/oddsflow-ai/` (AI-enhanced)

### Zi Wei Dou Shu AI — Chinese astrology readings
- **URL**: https://ziweiastrology.ai
- **Category**: `spirituality_wellness`
- **Tested**: Deterministic
- **What it showed**: Tone is calm and tradition-respecting rather than clinical or generic AI SaaS. Routing avoids developer communities and prioritizes more suitable channels such as YouTube and Reddit. Product name inference correctly selects the title-based brand.
- **Outputs**: `examples/ziwei-astrology/`

### Writesonic — AI writing assistant
- **URL**: https://writesonic.com
- **Category**: `ai_product`
- **Tested**: Deterministic
- **What it showed**: Imperative feature-dump metadata is rejected when it would harm output quality. A cleaner CLI description is used instead. This validated the description-source heuristics layer.
- **Outputs**: `examples/writesonic/`

---

## Why It Matters

Most builders spend days on launch prep after the product is already built. The work is not hard — it is scattered. You need copy for multiple platforms, each with different tone and format expectations. You need to decide where to launch first. You need to know what is missing before traffic starts arriving.

vLaunch compresses that into one command. Deterministic mode gives you a strong starting point in seconds. AI mode gives you sharper, more product-specific drafts. Either way, you skip the blank page and start from something that already understands your product context.

Everything stays local. No vendor lock-in. Just files in your repo.

---

## What Comes Next

- AI-enhanced affiliate copy
- More AI validation across non-sports verticals
- Iterative refinement workflows
- Multi-provider support
- Web workspace for reviewing and editing assets in-browser

---

## Quick Start

```bash
npm install
npm run build

# Deterministic mode
npx vlaunch run --url "https://yourproduct.com" \
  --description "what it does" \
  --audience "who it's for"

# AI-enhanced mode
export ANTHROPIC_API_KEY=sk-...
npx vlaunch run --url "https://yourproduct.com" \
  --description "what it does" \
  --audience "who it's for" \
  --ai
```
