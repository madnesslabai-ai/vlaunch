import { FetchedMeta } from "../types";

export async function fetchPageMeta(url: string): Promise<FetchedMeta | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "vlaunch/0.1 (launch-prep-cli)",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();
    const finalUrl = res.url || url;

    let domain: string;
    try {
      domain = new URL(finalUrl).hostname.replace(/^www\./, "");
    } catch {
      domain = "";
    }

    const title = extractTag(html, "title");
    const metaDescription =
      extractMetaContent(html, "description") ||
      extractMetaContent(html, "og:description");
    const extractedTextPreview = extractTextPreview(html);

    return { finalUrl, domain, title, metaDescription, extractedTextPreview };
  } catch {
    return null;
  }
}

function extractTag(html: string, tag: string): string {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? cleanText(match[1]) : "";
}

function extractMetaContent(html: string, name: string): string {
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*?)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*?)["'][^>]+(?:name|property)=["']${name}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return cleanText(match[1]);
  }
  return "";
}

function extractTextPreview(html: string): string {
  // Strip non-content elements
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<button[\s\S]*?<\/button>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Extract text from paragraphs and headings
  const blocks: string[] = [];
  const blockPattern = /<(?:p|h[1-6])[^>]*>([\s\S]*?)<\/(?:p|h[1-6])>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockPattern.exec(cleaned)) !== null) {
    const text = cleanText(match[1]);
    if (isUsefulBlock(text)) {
      blocks.push(text);
    }
    if (blocks.length >= 5) break;
  }

  return blocks.join(" | ").slice(0, 400);
}

function isUsefulBlock(text: string): boolean {
  // Too short to be meaningful
  if (text.length < 30) return false;

  // Too many words jammed together (UI fragments: "BuildPageFetchData")
  if (/[a-z][A-Z]/.test(text) && text.replace(/[^A-Z]/g, "").length > text.length * 0.15) {
    return false;
  }

  // Contains localhost or internal dev artifacts
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(text)) return false;

  // Looks like a run-on concatenation (no spaces between words, long stretches)
  const words = text.split(/\s+/);
  const avgWordLen = text.replace(/\s+/g, "").length / Math.max(words.length, 1);
  if (avgWordLen > 20) return false;

  // Too many numbers relative to text (dashboards, stats, timestamps)
  const digitRatio = text.replace(/[^0-9]/g, "").length / text.length;
  if (digitRatio > 0.3) return false;

  // Looks like a menu/nav list (very short "words" separated by pipes, bullets, etc.)
  if (words.length < 4) return false;

  return true;
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
