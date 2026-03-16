# Category Map

vLaunch uses product categories to shape the tone, narrative, and vocabulary of generated assets. Each category controls how positioning, Product Hunt drafts, Medium articles, directory listings, and affiliate copy are written.

Categories are detected automatically during `vlaunch scan` based on the product description, target audience, fetched metadata, and extracted page text.

---

## Currently Implemented

### `developer_tool`
- **For:** IDEs, CLIs, SDKs, APIs, code editors, dev platforms, open-source libraries
- **Tone:** Direct, technical, no-nonsense. Respects the reader's expertise.
- **Narrative:** Problem → friction in the dev workflow → how the tool removes it. Emphasizes speed, control, file-based outputs, no lock-in.
- **Avoids:** Marketing fluff, vague value props, enterprise jargon

### `launch_tool`
- **For:** Launch prep tools, go-to-market engines, distribution automation
- **Tone:** Builder-to-builder. Practical and specific.
- **Narrative:** "You ship fast, but launch prep is still manual." Frames launch readiness as an engineering problem with a tooling solution.
- **Avoids:** Generic startup advice, "growth hacking" language

### `sports_analytics`
- **For:** Sports prediction platforms, betting intelligence tools, odds analysis, tipster alternatives
- **Tone:** Evidence-based, verification-first. Confident but not absolute.
- **Narrative:** Fragmented landscape → opaque tipsters and scattered stats → transparent, structured signals with a published track record. Users can verify, not just trust.
- **Avoids:** Absolute claims ("most accurate"), gambling promotion, hype language

### `spirituality_wellness`
- **For:** Astrology platforms, meditation apps, chart reading tools, spiritual guidance, self-discovery products
- **Tone:** Calm, credible, respectful of tradition. Neither clinical nor mystical.
- **Narrative:** Gap between hard-to-access practitioners and shallow online tools → AI-powered interpretation that respects traditional depth while making it personally relevant and accessible.
- **Avoids:** Developer/workflow language, "AI hype vs utility" framing, dismissive or overly rational tone

### `ai_product`
- **For:** General AI-powered tools that don't fit a more specific category
- **Tone:** Results-oriented. Skeptical of AI hype, focused on practical output.
- **Narrative:** AI tools that overpromise → this one focuses on output quality and integrates AI where it matters.
- **Avoids:** Buzzword-heavy AI marketing, "revolutionary" claims

### `saas`
- **For:** Subscription software, dashboards, workspace tools, platforms
- **Tone:** Clean, focused, anti-bloat.
- **Narrative:** Bloated platforms that do everything poorly → a focused tool that does one thing well. Fast onboarding, no feature creep.
- **Avoids:** Feature lists disguised as value props, enterprise complexity

### `general`
- **For:** Anything that doesn't match a specific category
- **Tone:** Neutral, professional, adaptable.
- **Narrative:** Underserved audience → purpose-built product that fits their needs. Generic but functional.
- **Avoids:** Making assumptions about domain-specific language

---

## Planned (Not Yet Implemented)

### `finance_trading`
- **For:** Trading platforms, portfolio trackers, market analysis tools, fintech products
- **Tone:** Precise, data-driven, compliance-aware. No financial advice framing.
- **Narrative:** Information overload and unreliable signals → structured, transparent analysis users can evaluate independently. Emphasis on risk awareness and data provenance.
- **Avoids:** "Get rich" language, guaranteed returns, unqualified financial claims

### `content_creator_tool`
- **For:** Writing assistants, video editing tools, thumbnail generators, social media schedulers, creator analytics
- **Tone:** Energetic but grounded. Speaks the creator's language without pandering.
- **Narrative:** Creator workflow is fragmented across too many tools → this one handles [specific thing] so creators can focus on making things. Emphasizes output quality and time saved.
- **Avoids:** "10x your content" hype, passive income promises, generic productivity language

### `ai_saas`
- **For:** AI-native SaaS products that combine AI capabilities with subscription software patterns
- **Tone:** Practical, demo-driven. Show what it does, not what AI could theoretically do.
- **Narrative:** Combines the `ai_product` skepticism-of-hype with the `saas` anti-bloat focus. AI is a means to better output, not the selling point itself.
- **Avoids:** Leading with "AI-powered" as the primary value prop, feature-dumping

---

## How Categories Work

1. **Detection** — `inferProductCategory()` in `src/lib/text.ts` runs keyword matching against a combined corpus of description, audience, meta description, and extracted page text. More specific categories (sports, spirituality) are checked before generic ones (ai_product, saas).

2. **Positioning** — `getCategoryContext()` in `src/commands/position.ts` returns category-specific copy blocks: want, pain, value, problem, solution, whyNow. Some categories also override the one-liner, tagline, and description via `oneLiner`, `tagline`, and `rewriteDesc`.

3. **Packaging** — `src/commands/package.ts` uses the category to adjust PH comments, Medium drafts, and directory descriptions with category-appropriate follow-up sentences and tone.

4. **Routing** — `src/commands/route.ts` uses `excludeCategories` and `boostCategories` on each platform to ensure products are routed to relevant channels.

## Adding a New Category

1. Add the type to `ProductCategory` in `src/lib/text.ts`
2. Add detection regex to `inferProductCategory()` — place it before more generic categories
3. Add a `case` to `getCategoryContext()` in `src/commands/position.ts`
4. Add any category-specific desc rewrites or PH/Medium follow-ups in `src/commands/package.ts`
5. Update platform `excludeCategories` / `boostCategories` in `src/commands/route.ts`
