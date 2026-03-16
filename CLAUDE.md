# vLaunch Development Rules

This repository builds an agentic CLI for launch preparation during vibe coding.

## Product goal
Turn a project URL + short description + target audience into launch-ready assets:
- positioning
- routing plan
- Product Hunt draft
- Medium draft
- directory profile
- affiliate copy
- checklist

## Development principles
- Keep everything CLI-first
- Keep outputs file-based and human-editable
- Prefer markdown and json outputs
- Do not build web UI in phase 1
- Do not over-engineer agent systems in phase 1
- Use deterministic file structure under `.vlaunch/`
- Every command should be independently runnable
- All outputs should be reusable for future web workspace

## Commands to support
- vlaunch init
- vlaunch scan
- vlaunch position
- vlaunch route
- vlaunch package
- vlaunch checklist
- vlaunch run

## Expected output directory
.vlaunch/
  project.yaml
  context.json
  assets/
    project-summary.md
    positioning.md
    routing-plan.md
    producthunt.md
    medium-draft.md
    directories.json
    affiliate.md
    checklist.md

## Agent roles
- Scanner Agent: understands the product from URL and description
- Positioning Agent: creates messaging and value proposition
- Routing Agent: recommends launch/distribution platforms
- Packaging Agent: creates channel-specific launch assets
- Checklist Agent: generates missing items and next steps

## Coding rules
- Use TypeScript
- Keep modules small and composable
- Avoid premature abstractions
- Prefer explicit functions over complex frameworks
- Keep prompt logic in separate files
- Keep templates editable
- Make outputs easy to inspect and version control