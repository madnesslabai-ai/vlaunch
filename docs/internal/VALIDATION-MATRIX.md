# Validation Matrix

Cross-vertical validation plan for vLaunch. Each product tests a different category path through the pipeline.

---

## 1. OddsFlow

| Field | Detail |
|-------|--------|
| **Product type** | Sports analytics SaaS |
| **Category** | `sports_analytics` |
| **URL** | oddsflow.com |
| **What to test** | Category detection fires `sports_analytics`. Positioning uses verification-first language, no absolute claims ("most accurate", "guaranteed"). Routing excludes platforms that penalize gambling-adjacent content. Affiliate copy uses sports-specific partner types (tipsters, Telegram channels, Betfair traders). Consistency checker flags any absolute claims that leak through. |
| **Good output** | One-liner references track record / published predictions, not "best AI predictor". PH draft uses maker voice without hype. Medium draft tells a credible origin story. Directories target sports/betting verticals. Checklist flags responsible-gambling disclaimer as missing. |
| **Failure modes** | Absolute claims survive into PH or Medium drafts. Generic SaaS language replaces sports-specific framing. Routing recommends Hacker News or Dev.to (wrong audience). Affiliate copy uses generic "influencer" language instead of sports-specific partners. |

---

## 2. OddsFlow-Partners.com

| Field | Detail |
|-------|--------|
| **Product type** | Affiliate / partner portal |
| **Category** | `sports_analytics` or `saas` (depends on description framing) |
| **URL** | oddsflow-partners.com |
| **What to test** | Category detection when the product is a B2B portal for an existing B2C product. Positioning must distinguish the partner program from the main product. Affiliate copy should describe recruiting sub-affiliates, not end users. |
| **Good output** | Positioning frames value for potential partners, not bettors. One-liner mentions earning/commission/partnership. PH draft positions it as a partner opportunity. Routing targets affiliate marketing communities, not sports forums. |
| **Failure modes** | Pipeline treats it as another sports prediction tool. Positioning copies OddsFlow's end-user messaging. Audience detection picks "sports bettors" instead of "affiliate marketers" or "content creators". |

---

## 3. ClawSportBot

| Field | Detail |
|-------|--------|
| **Product type** | Telegram bot for sports data |
| **Category** | `sports_analytics` |
| **URL** | (Telegram bot link or landing page) |
| **What to test** | Handling of non-standard URLs (Telegram links vs web pages). Metadata fetch graceful failure if URL is a t.me link. Category detection still fires from description keywords. Platform routing should prioritize Telegram communities, Reddit sports subs. |
| **Good output** | Positioning acknowledges bot-native distribution. PH draft adapts to bot format (no "visit our website" CTAs). Routing plan ranks Telegram-native channels highest. Metadata fetch fails gracefully, falls back to CLI description. |
| **Failure modes** | Metadata fetch crashes on non-HTTP URL. Pipeline generates website-centric CTAs for a bot product. Routing recommends Product Hunt as primary (wrong for bots). Positioning ignores the bot form factor entirely. |

---

## 4. ClawAgentHub.io

| Field | Detail |
|-------|--------|
| **Product type** | AI agent platform / marketplace |
| **Category** | `ai_product` or `developer_tool` |
| **URL** | clawagent hub.io |
| **What to test** | Category detection distinguishes AI product from developer tool. Positioning avoids generic "AI revolution" language. Routing targets AI/ML communities (Twitter/X AI circles, Reddit r/MachineLearning, Hacker News). Consistency checker catches if "agent" terminology is used inconsistently. |
| **Good output** | One-liner is specific about what agents do, not vague "AI-powered platform". PH draft speaks to builders who want to deploy agents. Medium draft explains the technical differentiation. Directories target AI/ML and developer tool listings. |
| **Failure modes** | Category detected as generic `saas`. Positioning uses buzzword-heavy AI language without specifics. "Agent" used interchangeably with "bot", "assistant", "AI" across assets. Routing misses AI-specific communities. |

---

## 5. Zi Wei Dou Shu AI

| Field | Detail |
|-------|--------|
| **Product type** | Astrology / Chinese metaphysics interpretation tool |
| **Category** | `spirituality_wellness` |
| **URL** | (product URL) |
| **What to test** | Category detection fires `spirituality_wellness` from keywords (zi wei, astrology, destiny). Positioning tone is calm and credible, respects tradition. Routing excludes Hacker News, Dev.to, Indie Hackers. PH and Medium drafts avoid clinical or mystical extremes. Product name inference handles multi-word brand name. |
| **Good output** | One-liner references "traditional wisdom" or "personalized interpretation", not "AI fortune telling". Tone is respectful across all assets. Routing prioritizes YouTube, Reddit spirituality communities. Audience variants handle "people interested in astrology, self-discovery, and Chinese metaphysics". Affiliate targets wellness/spirituality content creators. |
| **Failure modes** | Category detected as `ai_product` (because it uses AI). Positioning uses tech-startup language for a spiritual product. Routing recommends developer communities. Tone is either too clinical ("our algorithm") or too mystical ("unlock your cosmic destiny"). Product name truncated to "Zi" or "Zi Wei". |

---

## 6. Writesonic

| Field | Detail |
|-------|--------|
| **Product type** | AI writing assistant SaaS |
| **Category** | `ai_product` or `saas` |
| **URL** | writesonic.com |
| **What to test** | Metadata fetch on a well-structured marketing site. Category detection with a product that straddles AI and general SaaS. Positioning differentiates from crowded market (Jasper, Copy.ai, ChatGPT). Consistency checker validates claims across assets. |
| **Good output** | Metadata fetch extracts clean title and description. Positioning identifies a specific angle rather than "another AI writer". PH draft has a genuine maker voice, not corporate marketing. Medium draft tells a differentiated story. Directories cover both AI tool and writing tool categories. |
| **Failure modes** | Metadata fetch pulls navigation noise or cookie banners. Positioning is generic ("write better content faster"). Claims like "best AI writer" survive into assets. No differentiation from competitors. Audience too broad ("everyone who writes"). |

---

## 7. Cursor (developer tool)

| Field | Detail |
|-------|--------|
| **Product type** | AI code editor |
| **Category** | `developer_tool` |
| **URL** | cursor.com |
| **What to test** | Category detection fires `developer_tool`. Positioning uses developer-native language. Routing prioritizes Hacker News, Reddit r/programming, Dev.to, Twitter/X dev circles. PH draft speaks to developers specifically. Technical claims are grounded. |
| **Good output** | One-liner is specific about the editor + AI combination. PH draft uses technical language appropriate for developers. Routing correctly identifies developer communities as primary channels. Affiliate targets developer content creators (YouTubers, newsletter authors). Medium draft has technical depth. |
| **Failure modes** | Category detected as `ai_product` instead of `developer_tool`. Positioning uses non-technical marketing language. Routing recommends general consumer channels. PH draft dumbs down the product for a non-technical audience. |

---

## 8. Notion (consumer product)

| Field | Detail |
|-------|--------|
| **Product type** | Productivity / workspace tool |
| **Category** | `saas` or `general` |
| **URL** | notion.so |
| **What to test** | Metadata fetch on a complex SPA. Category detection for a broad consumer SaaS. Positioning handles a product with many use cases without becoming vague. Audience detection with broad appeal ("teams", "individuals", "students"). |
| **Good output** | Metadata fetch extracts meaningful description despite SPA complexity. Positioning picks a specific angle rather than listing all features. Audience variants produce natural phrasing for broad audiences. PH draft has authentic voice. Routing covers both professional and consumer channels. |
| **Failure modes** | Metadata fetch returns empty or JS-rendered placeholder text. Positioning is a feature list, not a value proposition. Audience is impossibly broad ("everyone"). Checklist is generic. Category falls through to `general` with no category-specific behavior. |

---

## Validation Protocol

For each product in the matrix:

1. **Run the full pipeline**: `vlaunch run --ai` with the product's URL, description, and audience
2. **Run consistency check**: `vlaunch check` — verify no false positives or missed inconsistencies
3. **Run review**: `vlaunch review` — verify revision classification is accurate (fixable vs external)
4. **Spot-check assets**: Read each generated asset and verify against the "good output" criteria
5. **Check failure modes**: Confirm none of the listed failure modes are present
6. **Test refinement**: Run at least one `vlaunch refine <asset> --feedback "..."` and verify guardrails hold

## Coverage Map

| Dimension | Products that test it |
|-----------|-----------------------|
| Category detection | All 8 (each should hit a different category path) |
| Metadata fetch | Writesonic, Cursor, Notion (well-structured sites), ClawSportBot (non-standard URL) |
| Multi-word product name | Zi Wei Dou Shu AI, ClawAgentHub.io |
| Audience variants | Zi Wei Dou Shu AI (long lists), Notion (broad audience) |
| Routing exclusions | Zi Wei Dou Shu AI (exclude dev communities), OddsFlow (exclude gambling-hostile platforms) |
| Claim validation | OddsFlow (absolute claims), Writesonic (competitive claims) |
| B2B vs B2C framing | OddsFlow-Partners.com (B2B portal for B2C product) |
| Non-web product | ClawSportBot (Telegram bot) |
| Crowded market positioning | Writesonic (many competitors) |
| Broad audience handling | Notion (everyone), Cursor (developers specifically) |
