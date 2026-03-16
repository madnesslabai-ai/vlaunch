import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

// Import all prompt contracts
import { positioningPrompt as positioning } from "../src/lib/ai/prompts/positioning";
import { producthuntPrompt as producthunt } from "../src/lib/ai/prompts/producthunt";
import { mediumPrompt as medium } from "../src/lib/ai/prompts/medium";
import { routingPrompt as routing } from "../src/lib/ai/prompts/routing";
import { directoriesPrompt as directories } from "../src/lib/ai/prompts/directories";
import { checklistPrompt as checklist } from "../src/lib/ai/prompts/checklist";
import { affiliatePrompt as affiliate } from "../src/lib/ai/prompts/affiliate";

// ─── Positioning Parser ──────────────────────────────

describe("positioning.parseResponse", () => {
  const valid = `# Positioning

## One-liner
OddsFlow — AI football predictions

## Tagline
Track record you can verify

## Short Description
A tool for football predictions

## Long Description
Longer description here

## Problem
Bettors need reliable predictions

## Solution
OddsFlow provides verified predictions

## Why Now
AI models are now good enough
`;

  it("accepts valid positioning with all sections", () => {
    const result = positioning.parseResponse(valid);
    assert.ok(result !== null);
    assert.ok(result!.includes("# Positioning"));
    assert.ok(result!.includes("## One-liner"));
  });

  it("accepts with 4 of 7 sections", () => {
    const partial = `# Positioning

## One-liner
Test product

## Tagline
A tagline

## Problem
The problem

## Solution
The solution
`;
    assert.ok(positioning.parseResponse(partial) !== null);
  });

  it("rejects missing top-level heading", () => {
    assert.equal(positioning.parseResponse("## One-liner\nTest\n## Tagline\nTest\n## Problem\nTest\n## Solution\nTest"), null);
  });

  it("rejects missing One-liner section", () => {
    assert.equal(positioning.parseResponse("# Positioning\n## Tagline\nTest\n## Problem\nTest\n## Solution\nTest\n## Why Now\nTest"), null);
  });

  it("rejects with fewer than 4 sections", () => {
    assert.equal(positioning.parseResponse("# Positioning\n## One-liner\nTest\n## Tagline\nTest"), null);
  });

  it("strips code fences", () => {
    const fenced = "```markdown\n" + valid + "```";
    const result = positioning.parseResponse(fenced);
    assert.ok(result !== null);
    assert.ok(!result!.includes("```"));
  });
});

// ─── Product Hunt Parser ─────────────────────────────

describe("producthunt.parseResponse", () => {
  const valid = `# Product Hunt Draft

## Name
TestProduct

## Tagline
A great tagline

## Short Pitch
This is the short pitch

## First Comment
Hi PH — maker here. We built this because...

## Launch Checklist
- [ ] Product name finalized
- [ ] Page complete
- [ ] Logo uploaded
- [ ] Gallery images ready
- [ ] Demo video ready
- [ ] First comment reviewed
`;

  it("accepts valid PH draft", () => {
    assert.ok(producthunt.parseResponse(valid) !== null);
  });

  it("rejects missing top-level heading", () => {
    assert.equal(producthunt.parseResponse("## Name\nTest"), null);
  });

  it("rejects with fewer than 5 checkboxes", () => {
    const bad = `# Product Hunt Draft

## Name
Test

## Tagline
Test

## Short Pitch
Test

## First Comment
Test

## Launch Checklist
- [ ] One
- [ ] Two
`;
    assert.equal(producthunt.parseResponse(bad), null);
  });

  it("accepts with 4 of 5 required sections", () => {
    const partial = `# Product Hunt Draft

## Name
Test

## Tagline
Test

## Short Pitch
Test

## Launch Checklist
- [ ] One
- [ ] Two
- [ ] Three
- [ ] Four
- [ ] Five
`;
    assert.ok(producthunt.parseResponse(partial) !== null);
  });
});

// ─── Medium Parser ───────────────────────────────────

describe("medium.parseResponse", () => {
  const valid = `# Medium Draft

## Title
The Story

## Subtitle
Why we built this

---

## Intro
An intro paragraph.

## The Problem
The problem.

## What We Built
What we built.

## Why Now
Why now.

## What's Next
What's next. https://example.com
`;

  it("accepts valid medium draft", () => {
    assert.ok(medium.parseResponse(valid) !== null);
  });

  it("rejects missing top-level heading", () => {
    assert.equal(medium.parseResponse("## Title\nTest\n## Subtitle\nTest\n## Intro\nTest\n## The Problem\nTest\n## What We Built\nhttps://example.com"), null);
  });

  it("rejects with fewer than 5 sections", () => {
    assert.equal(medium.parseResponse("# Medium Draft\n## Title\nTest\n## Subtitle\nTest\n## Intro\nhttps://example.com"), null);
  });

  it("rejects without a URL", () => {
    const noUrl = `# Medium Draft

## Title
Test

## Subtitle
Test

## Intro
Test

## The Problem
Test

## What We Built
Test description without a link
`;
    assert.equal(medium.parseResponse(noUrl), null);
  });
});

// ─── Routing Parser ──────────────────────────────────

describe("routing.parseResponse", () => {
  const valid = `# Routing Plan

## Recommended Platforms
1. Reddit
2. YouTube

## Why These Platforms
Because of the audience.

## Priority Order
1. Reddit
2. YouTube

## Suggested Launch Sequence
- Week 1: Reddit
- Week 2: YouTube

## Avoid for Now
- TikTok
`;

  it("accepts valid routing plan", () => {
    assert.ok(routing.parseResponse(valid) !== null);
  });

  it("rejects missing top-level heading", () => {
    assert.equal(routing.parseResponse("## Recommended Platforms\n1. Reddit"), null);
  });

  it("rejects with fewer than 4 sections", () => {
    assert.equal(routing.parseResponse("# Routing Plan\n## Recommended Platforms\nReddit\n## Priority Order\n1. Reddit"), null);
  });

  it("accepts with 4 of 5 sections", () => {
    const partial = `# Routing Plan

## Recommended Platforms
1. Reddit

## Why These Platforms
Because.

## Priority Order
1. Reddit

## Suggested Launch Sequence
- Week 1: Reddit
`;
    assert.ok(routing.parseResponse(partial) !== null);
  });
});

// ─── Directories Parser ──────────────────────────────

describe("directories.parseResponse", () => {
  const validJson = JSON.stringify([
    { name: "ProductHunt", category: "Launch", priority: "high", suggested_description: "A great tool", reason: "Good audience" },
    { name: "Reddit", category: "Community", priority: "medium", suggested_description: "Another listing", reason: "Active users" },
    { name: "HackerNews", category: "Tech", priority: "medium", suggested_description: "Tech listing", reason: "Engineers" },
  ], null, 2);

  it("accepts valid JSON array with 3+ entries", () => {
    const result = directories.parseResponse(validJson);
    assert.ok(result !== null);
    const parsed = JSON.parse(result!);
    assert.equal(parsed.length, 3);
  });

  it("strips code fences from JSON", () => {
    const fenced = "```json\n" + validJson + "\n```";
    assert.ok(directories.parseResponse(fenced) !== null);
  });

  it("rejects invalid JSON", () => {
    assert.equal(directories.parseResponse("not json at all"), null);
  });

  it("rejects array with fewer than 3 entries", () => {
    const tooFew = JSON.stringify([
      { name: "A", category: "B", priority: "C", suggested_description: "D", reason: "E" },
    ]);
    assert.equal(directories.parseResponse(tooFew), null);
  });

  it("rejects entries missing required fields", () => {
    const missingField = JSON.stringify([
      { name: "A", category: "B", priority: "C", suggested_description: "D" },
      { name: "A", category: "B", priority: "C", suggested_description: "D", reason: "E" },
      { name: "A", category: "B", priority: "C", suggested_description: "D", reason: "E" },
    ]);
    assert.equal(directories.parseResponse(missingField), null);
  });

  it("rejects non-array JSON", () => {
    assert.equal(directories.parseResponse('{"name": "test"}'), null);
  });
});

// ─── Checklist Parser ────────────────────────────────

describe("checklist.parseResponse", () => {
  const valid = `# Launch Checklist

## Current strengths
- Strong positioning

## Missing or weak areas
- No screenshots

## Recommended next actions
1. Add screenshots

## Launch readiness status
Approximately 60% ready
`;

  it("accepts valid checklist", () => {
    assert.ok(checklist.parseResponse(valid) !== null);
  });

  it("accepts with 3 of 4 required sections", () => {
    const partial = `# Launch Checklist

## Current strengths
- Good

## Missing or weak areas
- Bad

## Launch readiness status
50% ready
`;
    assert.ok(checklist.parseResponse(partial) !== null);
  });

  it("rejects missing top-level heading", () => {
    assert.equal(checklist.parseResponse("## Current strengths\n- Good\n## Missing or weak areas\n- Bad\n## Launch readiness status\nReady"), null);
  });

  it("rejects with fewer than 3 sections", () => {
    assert.equal(checklist.parseResponse("# Launch Checklist\n## Current strengths\n- Good"), null);
  });
});

// ─── Affiliate Parser ────────────────────────────────

describe("affiliate.parseResponse", () => {
  const valid = `# Affiliate Draft

## Headline
Partner with us

## Why Promote This Product
Because it's great

## Ideal Partner Types
- Bloggers
- YouTubers

## Suggested Commission Structure
25% recurring

## Outreach Draft
Hi there, we'd love to partner...
`;

  it("accepts valid affiliate draft", () => {
    assert.ok(affiliate.parseResponse(valid) !== null);
  });

  it("accepts with 4 of 5 required sections", () => {
    const partial = `# Affiliate Draft

## Headline
Partner with us

## Why Promote This Product
It's great

## Ideal Partner Types
- Bloggers

## Outreach Draft
Hey...
`;
    assert.ok(affiliate.parseResponse(partial) !== null);
  });

  it("rejects missing top-level heading", () => {
    assert.equal(affiliate.parseResponse("## Headline\nTest\n## Why Promote This Product\nTest\n## Ideal Partner Types\nTest\n## Outreach Draft\nTest"), null);
  });

  it("rejects with fewer than 4 sections", () => {
    assert.equal(affiliate.parseResponse("# Affiliate Draft\n## Headline\nTest\n## Outreach Draft\nTest"), null);
  });
});
