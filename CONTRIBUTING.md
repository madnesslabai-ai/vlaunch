# Contributing to vLaunch

Thanks for your interest in contributing!

## Getting started

```bash
git clone <repo-url>
cd vlaunch
npm install
cp .env.example .env   # add your Anthropic API key
npm run build
npm test
```

## Project structure

```
src/
  index.ts              # CLI entry point (Commander.js)
  commands/             # One file per CLI command
    scan.ts             # Product scanning and context extraction
    position.ts         # Positioning asset generation
    route.ts            # Platform routing recommendations
    package.ts          # Channel-specific asset packaging
    check.ts            # Cross-asset consistency checking
    manifest.ts         # Launch manifest generation
    review.ts           # Refinement plan generation
    refine.ts           # AI-powered asset refinement
  lib/
    ai/
      anthropic.ts      # Anthropic API provider (with retry/backoff)
      provider.ts       # AI provider interface
      enhance.ts        # AI enhancement orchestration
      refine.ts         # Refinement logic and brand anchor guardrails
      prompts/          # Prompt contracts (system + user + parser per asset)
    config.ts           # .vlaunch/ config reading
    fs.ts               # File system helpers
    text.ts             # Product name inference, category detection, audience utils
test/                   # Unit tests (node:test + node:assert/strict)
```

## Development

- `npm run build` — compile TypeScript
- `npm test` — run all tests
- `npm run dev <command>` — run a command via ts-node (e.g., `npm run dev:init`)

## Adding a new prompt contract

1. Create `src/lib/ai/prompts/<name>.ts`
2. Export an object with `{ systemPrompt, userPrompt(ctx), parseResponse(raw) }`
3. Add parser tests in `test/parsers.test.ts`
4. Wire it into the relevant command

## Adding a new command

1. Create `src/commands/<name>.ts`
2. Register it in `src/index.ts` via Commander
3. Add a `dev:<name>` script in `package.json`

## Testing

We use Node.js built-in test runner (`node:test`) with `node:assert/strict`. No external test dependencies.

```bash
npm test
```

## Code style

- TypeScript, strict mode
- Small, composable modules
- Explicit functions over frameworks
- Prompt logic in separate files under `src/lib/ai/prompts/`
- All outputs are file-based (markdown, JSON) under `.vlaunch/`

## Pull requests

- Keep PRs focused on a single change
- Include tests for new logic
- Ensure `npm run build && npm test` passes
