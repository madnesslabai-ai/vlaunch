export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function stripTrailingPeriod(text: string): string {
  return text.replace(/\.\s*$/, "");
}

export function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Known platform names that should never be returned as a product name
const PLATFORM_NAMES = new Set([
  "telegram", "github", "instagram", "x", "twitter", "facebook", "youtube",
  "linkedin", "reddit", "tiktok", "discord", "slack", "whatsapp", "medium",
  "substack", "product hunt", "producthunt", "hacker news", "hackernews",
]);

function isPlatformName(name: string): boolean {
  return PLATFORM_NAMES.has(name.toLowerCase().trim());
}

function isUrlFragment(name: string): boolean {
  return /^https?:\/\//.test(name) || /\.\w{2,}/.test(name);
}

function isBrandCandidate(candidate: string): boolean {
  if (!candidate || candidate.length < 2 || candidate.length > 50) return false;
  if (isPlatformName(candidate)) return false;
  if (isUrlFragment(candidate)) return false;

  const words = candidate.split(" ");
  if (words.length > 5) return false;

  // Single-word candidates: accept if 2-30 chars and not a platform
  if (words.length === 1) return candidate.length <= 30;

  // Multi-word: must contain at least one capitalized non-stop-word
  const stopWords = new Set(["the", "a", "an", "and", "or", "for", "of", "to", "in", "on", "with", "by", "is", "are"]);
  return words.some(w => /^[A-Z]/.test(w) && !stopWords.has(w.toLowerCase()));
}

export function inferProductName(url: string, description: string, fetchedTitle?: string): string {
  // Special case: t.me URLs — extract bot/channel name from path
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "t.me" && parsed.pathname.length > 1) {
      const botName = parsed.pathname.slice(1).replace(/^@/, "");
      if (botName && botName.length >= 2) return botName;
    }
  } catch { /* not a valid URL */ }

  if (fetchedTitle) {
    // Extract @username from title if present (e.g. "Telegram: Launch @ClawSportBot")
    const atMention = fetchedTitle.match(/@(\w{2,})/);
    if (atMention && isBrandCandidate(atMention[1])) {
      return atMention[1];
    }

    // Split on structural delimiters only: pipe, colon, em-dash, en-dash
    // Do NOT split on plain hyphens (they appear inside words like "AI-Powered")
    // A plain hyphen is only a delimiter when surrounded by spaces: " - "
    const segments = fetchedTitle.split(/\s*[:\|–—]\s*|\s+-\s+/);

    // Try each segment, preferring shorter/brand-like segments
    // Common patterns: "Brand — description" or "Description | Brand"
    // Strategy: check first segment, then last segment, then others
    const candidates: string[] = [];
    if (segments.length >= 2) {
      // First try: first segment (common: "Cursor: The best way to code")
      candidates.push(segments[0].trim());
      // Second try: last segment (common: "AI-Powered ... | OddsFlow Partners")
      candidates.push(segments[segments.length - 1].trim());
      // Third try: remaining middle segments
      for (let i = 1; i < segments.length - 1; i++) {
        candidates.push(segments[i].trim());
      }
    } else if (segments.length === 1) {
      candidates.push(segments[0].trim());
    }

    // Score candidates: prefer shorter, brand-like names
    for (const candidate of candidates) {
      if (isBrandCandidate(candidate) && !candidate.includes(" ")) {
        return candidate; // Single-word brand name — best match
      }
    }
    for (const candidate of candidates) {
      if (isBrandCandidate(candidate) && candidate.split(" ").length <= 3) {
        return candidate; // Short multi-word brand — good match
      }
    }
    for (const candidate of candidates) {
      if (isBrandCandidate(candidate)) {
        return candidate; // Any valid brand candidate
      }
    }
  }

  // Fallback: derive from domain
  const domain = extractDomain(url);
  const name = domain.split(".")[0];
  if (name && name.length > 1 && !isPlatformName(name) && !isUrlFragment(name)) {
    return capitalize(name);
  }

  // Last resort: first two words of description
  const words = description.split(" ").slice(0, 2);
  return words.map(capitalize).join(" ");
}

export function inferTaglineFromMeta(fetchedTitle?: string, metaDescription?: string): string | null {
  // Extract the descriptive part after the brand name in the title
  if (fetchedTitle) {
    const parts = fetchedTitle.split(/\s*[:\|–—]\s*|\s+-\s+/);
    if (parts.length > 1) {
      // Only use second segment — joining 3+ segments creates fragmented taglines
      const taglinePart = parts[1].trim();
      if (taglinePart.length > 10 && taglinePart.length <= 80 && !looksLikeFeatureList(taglinePart)) {
        return taglinePart;
      }
    }
  }
  // Fall back to meta description if it's concise and reads like a tagline
  if (metaDescription && metaDescription.length <= 100 && !looksLikeFeatureList(metaDescription)) {
    return metaDescription;
  }
  return null;
}

export function bestDescription(cliDescription: string, metaDescription?: string, productName?: string): string {
  if (!metaDescription || metaDescription.length > 300) {
    return cliDescription;
  }

  let cleaned = metaDescription.replace(/\.\s*$/, "");

  if (productName) {
    const esc = escapeRegex(productName);

    // Strip leading "ProductName: ..." or "ProductName — ..."
    cleaned = cleaned.replace(new RegExp(`^${esc}\\s*[:\\-–—,]?\\s*`, "i"), "");

    // Strip "..., ProductName is ..." pattern (e.g. "Built to be productive, Cursor is the best...")
    // Keep only the clause after the product name
    const midPattern = new RegExp(`^(.+?),\\s*${esc}\\s+(?:is|are)\\s+`, "i");
    const midMatch = cleaned.match(midPattern);
    if (midMatch) {
      // Combine: "built to be productive" + ", " + "the best way to code"
      const before = midMatch[1].replace(/\.\s*$/, "");
      const after = cleaned.slice(midMatch[0].length);
      cleaned = `${before} — ${after}`;
    }

    // Strip standalone "ProductName is ..." at the start
    cleaned = cleaned.replace(new RegExp(`^${esc}\\s+(?:is|are)\\s+`, "i"), "");
  }

  // Check if the cleaned meta is suitable for mid-sentence use ("X is [desc]")
  // If the meta looks like a feature list, imperative copy, or fragmented text,
  // prefer the CLI description which the user wrote for this purpose
  if (looksLikeFeatureList(cleaned) || !suitableForMidSentence(cleaned)) {
    return lowercaseStart(cliDescription);
  }

  return lowercaseStart(cleaned);
}

/** Lowercase the first character for mid-sentence insertion ("X is [desc]") */
function lowercaseStart(text: string): string {
  if (!text) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/**
 * Detects text that looks like a feature list or marketing dump rather than
 * a coherent product description. These are unsuitable for taglines and
 * mid-sentence positioning.
 */
function looksLikeFeatureList(text: string): boolean {
  // Multiple sentences separated by periods (feature dump)
  const sentenceCount = text.split(/\.\s+/).filter(s => s.length > 5).length;
  if (sentenceCount >= 3) return true;

  // Multiple comma-separated imperative clauses: "Track X, monitor Y, create Z"
  const imperativeVerbs = text.match(/\b(track|monitor|create|build|manage|automate|generate|discover|find|get|boost|grow|scale|optimize|fix|target|analyze|connect|streamline|transform)\b/gi);
  if (imperativeVerbs && imperativeVerbs.length >= 3) return true;

  return false;
}

/**
 * Checks whether text can be naturally inserted into "X is [text]" without
 * sounding broken. Returns false for imperative phrases, bare verb starts,
 * and other patterns that break sentence composition.
 */
function suitableForMidSentence(text: string): boolean {
  if (!text || text.length < 5) return false;

  // Starts with a bare imperative verb — "Track AI visibility...", "Monitor mentions..."
  // These break when inserted as "Writesonic is track AI visibility..."
  const firstWord = text.split(/\s/)[0].toLowerCase();
  const imperativeStarters = new Set([
    "track", "monitor", "create", "build", "manage", "automate", "generate",
    "discover", "find", "get", "boost", "grow", "scale", "optimize", "fix",
    "target", "analyze", "connect", "streamline", "transform", "unlock",
    "join", "start", "try", "sign", "download", "explore", "learn",
    "check", "see", "watch", "read", "click", "buy", "shop", "save",
  ]);
  if (imperativeStarters.has(firstWord)) return false;

  // Starts well for "X is [text]": articles, adjectives, prepositions, "the/a/an"
  // or descriptive openings like "the best...", "a modern...", "an AI-powered..."
  return true;
}

/**
 * Returns a shorter/varied form of the audience string to reduce repetition.
 * e.g. "football bettors, sports traders, and ai-first football fans" →
 *   short: "football bettors and sports traders"
 *   pronoun: "them"
 *   noun: "this audience"
 */
export function audienceVariants(audience: string): {
  full: string;
  short: string;
  noun: string;
  pronoun: string;
} {
  let short = audience;

  // Shorten "people interested in X, Y, and Z" → "people interested in X and Y"
  const interestedMatch = audience.match(/^(people (?:interested|curious|looking)\s+\w+\s+)(.+)$/i);
  if (interestedMatch) {
    const prefix = interestedMatch[1];
    const topics = interestedMatch[2].split(/,\s*/);
    if (topics.length > 2) {
      short = `${prefix}${topics[0]} and ${topics[1].replace(/^and\s+/i, "")}`;
    }
  } else {
    // Take the first two items from a comma-separated list
    const parts = audience.split(/,\s*/);
    if (parts.length > 2) {
      short = `${parts[0]} and ${parts[1].replace(/^and\s+/i, "")}`;
    }
  }

  return {
    full: audience,
    short,
    noun: "this audience",
    pronoun: "them",
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type ProductCategory =
  | "developer_tool"
  | "launch_tool"
  | "sports_analytics"
  | "spirituality_wellness"
  | "ai_product"
  | "saas"
  | "general";

export function inferProductCategory(
  description: string,
  audience: string,
  metaDescription?: string,
  extractedPreview?: string,
): ProductCategory {
  const corpus = `${description} ${audience} ${metaDescription || ""} ${extractedPreview || ""}`.toLowerCase();

  // Sports / betting / analytics
  if (
    /\b(football|soccer|betting|bettor|odds|predict|handicap|sports trad|over\/under|1x2|tipster|match|league)\b/.test(corpus) &&
    /\b(ai|predict|analy|intelligence|data|model|engine)\b/.test(corpus)
  ) {
    return "sports_analytics";
  }

  // Spirituality / wellness / astrology
  if (
    /\b(astrology|zi wei|dou shu|destiny|horoscope|chart reading|birth chart|spiritual|metaphysic|divination|tarot|zodiac|feng shui|numerology|palm reading)\b/.test(corpus) &&
    /\b(self.discover|guidance|reading|insight|wisdom|personal|soul|spirit|mindful|wellbeing|wellness|interpret|clarity)\b/.test(corpus)
  ) {
    return "spirituality_wellness";
  }

  // Launch / distribution tools
  if (
    /\b(launch|product hunt|distribution|go.to.market|launch.prep|launch.ready)\b/.test(corpus) &&
    /\b(cli|tool|engine|generat|automat)\b/.test(corpus)
  ) {
    return "launch_tool";
  }

  // Developer tools
  if (
    /\b(developer|engineer|code|coding|ide|editor|cli|terminal|sdk|api|devtool|open.source|git)\b/.test(corpus) &&
    /\b(tool|platform|framework|library|extension|plugin)\b/.test(corpus)
  ) {
    return "developer_tool";
  }

  // General AI product
  if (/\b(ai|machine learning|llm|gpt|agent|automat|intelligent)\b/.test(corpus)) {
    return "ai_product";
  }

  // SaaS
  if (/\b(saas|subscription|dashboard|workspace|platform|app)\b/.test(corpus)) {
    return "saas";
  }

  return "general";
}
