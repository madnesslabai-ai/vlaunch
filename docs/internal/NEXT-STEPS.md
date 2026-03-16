# Next Steps

## Hardening
- Add input validation for URL format, description length, and audience
- Handle edge cases in metadata fetching (redirects to login pages, CAPTCHAs, non-HTML responses)
- Add `--no-fetch` flag to skip website fetching when not needed
- Add `--force` flag to overwrite existing assets without prompting
- Improve error messages when commands are run out of order
- Add basic test coverage for lib/text.ts, lib/config.ts, and lib/fetch.ts
- Validate context.json schema before downstream commands consume it

## Product Polish
- Add `vlaunch status` command to show current pipeline state at a glance
- Add `vlaunch reset` command to clear .vlaunch/ and start fresh
- Add `--output-dir` flag to customize the output directory
- Improve product name inference for multi-word domains and subdomains
- Support re-running individual commands without re-running the full pipeline
- Add color and formatting to CLI output for better readability
- Build and publish as an installable npm package (`npx vlaunch run`)
- Add a `.vlaunchrc` config file for setting default audience, preferred platforms, etc.

## Phase 2 — AI-Powered Generation
- Integrate LLM calls to generate real positioning copy from scan context
- AI-powered tagline and one-liner generation with multiple options to choose from
- Generate Product Hunt first comments that reflect the actual product, not templates
- Generate Medium drafts with real narrative structure and product-specific language
- AI-powered platform routing using richer signals from website content
- Add `--model` flag to choose between different LLM providers
- Keep prompt logic in separate files for easy editing and version control
- Support iterative refinement: re-run a single asset with feedback

## Future — Web Workspace
- Build a local web UI for reviewing and editing generated assets
- Side-by-side view: generated draft vs. editable final version
- Export to platform-ready formats (Product Hunt submission, Medium import, etc.)
- Collaborative editing for teams preparing a launch together
- Dashboard showing launch readiness across all channels
- Integration with platform APIs for direct submission (Product Hunt, Dev.to, etc.)
- Launch day scheduler with timed post queue
