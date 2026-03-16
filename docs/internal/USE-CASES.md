# vLaunch — Use Cases

## 1. Launch Prep for AI Products

**Problem**: You built an AI-powered product. Now you need a tagline, a Product Hunt comment, a Medium article, directory listings, and a distribution plan — and each one needs to avoid the vague, overhyped language that makes technical audiences tune out.

**How vLaunch helps**: One command generates the full launch package. The category system detects AI-oriented products and adjusts tone automatically. With `--ai`, drafts become more product-specific and less generic.

**Example**: Writesonic — vLaunch detected the `ai_product` category, rejected low-quality feature-dump metadata from the site, and generated positioning focused on what the product actually does rather than generic AI messaging.

---

## 2. Product Positioning Draft Generation

**Problem**: You know what your product does, but turning that into a one-liner, tagline, problem statement, and "why now" is hard — especially without sounding generic.

**How vLaunch helps**: `vlaunch position` generates a full `positioning.md` with one-liner, tagline, short description, long description, problem, solution, and why-now sections. With `--ai`, each section is sharpened with product-specific value props and competitive framing. That positioning then becomes upstream context for downstream assets.

**Example**: OddsFlow — deterministic mode produced category-level sports analytics positioning. AI mode rewrote it around the accountability gap in football predictions and produced a sharper tagline: "Predict smarter. Verify everything."

---

## 3. Product Hunt Launch Draft Generation

**Problem**: Writing a Product Hunt first comment that sounds like a real maker — not a marketing template — usually takes multiple drafts. You also need a tagline, short pitch, and launch checklist.

**How vLaunch helps**: `vlaunch package` generates `producthunt.md` with all the core sections. With `--ai`, the first comment is rewritten in a more natural maker voice with specific product details and stronger feedback prompts. The launch checklist remains intact so it can still be used operationally.

**Example**: OddsFlow — the AI-enhanced Product Hunt draft frames the problem around unaccountable football tipsters, describes the product with specific market types such as 1x2, Asian handicap, and over/under, and ends with two genuine questions for feedback.

---

## 4. Medium / Long-Form Launch Article Generation

**Problem**: You need a launch article, but starting from a blank page is slow. A useful launch article needs narrative structure, not just a feature list.

**How vLaunch helps**: `vlaunch package` generates `medium-draft.md` with title, subtitle, intro, problem, what we built, why now, and what's next. With `--ai`, the article becomes more readable, more specific, and more publishable.

**Example**: OddsFlow — the AI-enhanced Medium draft opens with a concrete scene from the bettor workflow instead of a generic product announcement and builds a clearer story around accountability, transparency, and signal quality.

---

## 5. Distribution Planning and Channel Prioritization

**Problem**: You do not know where to post first. Reddit, Product Hunt, Telegram, YouTube, or niche communities all work differently depending on the product and audience.

**How vLaunch helps**: `vlaunch route` generates `routing-plan.md` with recommended platforms, priority order, a suggested launch sequence, and channels to avoid. With `--ai`, platform recommendations become more specific and more strategic.

**Example**: OddsFlow — the routing plan prioritizes betting communities such as r/sportsbook and specialist forums, places Telegram and X where the audience already consumes signals, and explicitly avoids broad football fan communities where the pitch would not land.

---

## 6. Platform-Specific Listing Generation

**Problem**: Each platform expects a different style of description. A Reddit post should invite scrutiny. A tweet should be concise. A Telegram listing should match how signals are actually consumed.

**How vLaunch helps**: `vlaunch package` generates `directories.json` with platform-specific descriptions and reasons for each listing. With `--ai`, descriptions are adapted more closely to platform culture and audience expectations.

**Example**: OddsFlow — the Reddit listing opens with a challenge to unverified tipsters, the X listing leads with a sharper contrast, and the Telegram version matches the daily-signal format bettors already follow.

---

## 7. Launch-Readiness Review and Gap Detection

**Problem**: You may have all the launch assets, but you still do not know whether the product is actually ready to launch. What is strong? What is missing? What should be fixed first?

**How vLaunch helps**: `vlaunch checklist` generates `checklist.md`. In deterministic mode, it checks asset presence and common launch items. With `--ai`, it reads the generated assets and produces a product-aware readiness review: current strengths, missing or weak areas, prioritized next actions, and an overall readiness assessment.

**Example**: OddsFlow — the AI-enhanced checklist identified the "verified track record" positioning as a strength, but flagged the lack of published accuracy stats as the biggest blocker before community outreach.

---

## 8. Multi-Vertical Launch Support

**Problem**: Many launch tools assume every product is a generic SaaS or developer tool. That breaks quickly when the product is a sports analytics platform, a spirituality product, or a niche AI tool.

**How vLaunch helps**: vLaunch detects product category from URL, description, and metadata, then adjusts tone, framing, routing, platform descriptions, and launch-readiness guidance accordingly.

**Examples**:
- **OddsFlow** (`sports_analytics`) — verification-first, evidence-based tone; routed toward betting communities, Telegram, and sports-focused channels.
- **Zi Wei Dou Shu AI** (`spirituality_wellness`) — calm, tradition-respecting tone; routed away from developer communities and toward channels better suited to self-discovery and guidance products.
- **Writesonic** (`ai_product`) — clear, results-oriented positioning; low-quality metadata rejected in favor of cleaner product description.

---

## 9. Launch Support for Sports Intelligence Products

**Problem**: Sports intelligence products — prediction bots, analytics dashboards, signal services — operate in a market where trust is the primary conversion barrier. Generic SaaS launch copy does not work because the audience has been burned by unverifiable tipsters and black-box models. You need launch assets that lead with evidence, not features.

**How vLaunch helps**: The `sports_analytics` category adjusts tone to be verification-first and evidence-based. Routing prioritizes betting communities, Telegram signal channels, and sports-focused forums over general tech platforms. With `--ai`, assets reference specific signal types, league coverage, and track record transparency — the language this audience responds to.

**Example**: ClawSportBot — a Telegram-based football prediction bot covering multiple leagues. vLaunch would generate positioning around signal accuracy and published results, route toward Telegram betting groups and r/sportsbook, and produce a Product Hunt comment that leads with verifiable performance rather than "AI-powered predictions."

---

## 10. Launch Prep for Partner / Infrastructure Products

**Problem**: Partner and infrastructure products — affiliate platforms, API layers, white-label services — do not launch the same way consumer products do. The audience is other businesses, not end users. Product Hunt comments and Medium articles need to speak to integration value, revenue opportunity, and partnership fit rather than user features.

**How vLaunch helps**: vLaunch generates the same asset set, but with `--ai`, the positioning and copy shift toward B2B language: what the partner gains, how integration works, and why the timing is right. Routing prioritizes LinkedIn, affiliate networks, and partnership-oriented communities over consumer-facing channels.

**Example**: OddsFlow-Partners.com — a partner program for sports content creators and betting communities to integrate OddsFlow signals. vLaunch would generate positioning around revenue share and audience fit, produce a Medium article explaining the partner model, and route toward affiliate review sites, YouTube creators in the betting space, and LinkedIn for B2B outreach.

---

## 11. Launch Support for Agent Marketplaces and Ecosystems

**Problem**: Agent marketplaces and AI ecosystems are a new product category with no established launch playbook. The audience is split between developers who want to build on the platform and end users who want to discover agents. Launch copy needs to speak to both without sounding like a generic developer tool or a consumer app store.

**How vLaunch helps**: vLaunch treats this as a hybrid category. Positioning can frame the product as both a discovery layer and a developer platform. Routing targets developer communities for builder adoption and product directories for end-user discovery. With `--ai`, assets reference specific ecosystem value — agent categories, integration patterns, and what makes the marketplace worth listing on.

**Example**: ClawAgentHub.io — a curated marketplace for AI agents across sports analytics, productivity, and automation. vLaunch would generate positioning around agent discovery and developer distribution, route toward AI directories, Hacker News, and relevant subreddits, and produce a Product Hunt draft that frames the marketplace as infrastructure for the agent economy rather than just another directory.

---

## Extended Product Coverage

The use cases above cover the product types vLaunch has been validated on and the adjacent categories it is designed to support. As the category system expands — with planned additions like `finance_trading`, `content_creator_tool`, and `marketplace` — vLaunch will handle a wider range of verticals with the same approach: detect the category, adjust tone and routing, and generate assets that sound like they were written for that specific product.

The pattern is consistent: three inputs, seven outputs, and a launch package that starts from product context rather than a blank page.

---

## Summary

vLaunch is useful when launch work is slowing down a product that is already built. It helps turn a URL, a one-line description, and a target audience into a structured launch package — with stronger outputs in AI mode and safe fallback in deterministic mode.
