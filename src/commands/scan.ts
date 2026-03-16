import * as path from "path";
import { writeContext, contextJsonPath } from "../lib/config";
import { writeFile, assetsDir, fileExists } from "../lib/fs";
import { fetchPageMeta } from "../lib/fetch";
import { inferProductName, inferProductCategory } from "../lib/text";
import { ScanContext } from "../types";

interface ScanOptions {
  url: string;
  description: string;
  audience: string;
}

export async function scanProject(options: ScanOptions): Promise<void> {
  if (!fileExists(path.dirname(contextJsonPath()))) {
    console.error("Project not initialized. Run `vlaunch init` first.");
    process.exit(1);
  }

  // Sanitize URL: trim whitespace to prevent malformed URLs propagating
  const sanitizedUrl = options.url.replace(/\s+/g, "");

  const context: ScanContext = {
    url: sanitizedUrl,
    description: options.description,
    targetAudience: options.audience,
    scannedAt: new Date().toISOString(),
  };

  console.log(`Fetching ${sanitizedUrl}...`);
  const fetched = await fetchPageMeta(sanitizedUrl);

  if (fetched) {
    context.fetched = fetched;
    console.log(`Fetched: "${fetched.title || "(no title)"}" from ${fetched.domain}`);
  } else {
    console.log("Could not fetch page — continuing with CLI inputs only.");
  }

  context.category = inferProductCategory(
    context.description,
    context.targetAudience,
    context.fetched?.metaDescription,
    context.fetched?.extractedTextPreview,
  );
  console.log(`Detected category: ${context.category}`);

  writeContext(context);
  console.log("Saved context to .vlaunch/context.json");

  const summary = generateProjectSummary(context);
  const summaryPath = path.join(assetsDir(), "project-summary.md");
  writeFile(summaryPath, summary);
  console.log("Generated .vlaunch/assets/project-summary.md");
}

function generateProjectSummary(context: ScanContext): string {
  const name = inferProductName(context.url, context.description);
  const f = context.fetched;

  const titleSection = f?.title
    ? `${f.title}`
    : `<!-- Page title not available -->`;

  const metaSection = f?.metaDescription
    ? `${f.metaDescription}`
    : `<!-- Meta description not available -->`;

  const previewSection = f?.extractedTextPreview
    ? `${f.extractedTextPreview}`
    : `<!-- No text extracted -->`;

  const domainLine = f?.domain
    ? `- **Domain:** ${f.domain}`
    : "";

  const finalUrlLine = f?.finalUrl && f.finalUrl !== context.url
    ? `- **Resolved URL:** ${f.finalUrl}`
    : "";

  const fetchedDetails = [domainLine, finalUrlLine].filter(Boolean).join("\n");

  return `# Project Summary

## Product
- **Name:** ${name}
- **URL:** ${context.url}
${fetchedDetails}

## Description
${context.description}

## Target Audience
${context.targetAudience}

## Page Title
${titleSection}

## Meta Description
${metaSection}

## Extracted Text Preview
${previewSection}

## Scan Date
${context.scannedAt}

---

## Key Value Proposition
<!-- To be filled by positioning agent -->

## Technical Stack
<!-- To be filled by scanner agent in phase 2 -->

## Competitive Landscape
<!-- To be filled by positioning agent -->

## Launch Readiness
<!-- To be filled by checklist agent -->
`;
}
