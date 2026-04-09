import { jsonrepair } from "jsonrepair";
import { complete } from "@/lib/groq";
import { searchWeb, fetchUrl, type SearchResult } from "@/lib/search";
import type { Brand, GoalType, ResearchBrief } from "@/lib/types";

const GOAL_RESEARCH_STRATEGIES: Record<GoalType, string> = {
  thought_leadership:
    "Find contrarian/data-backed angles. Look for recent debates, controversies, and surprising statistics. Prioritize proprietary data and expert opinions that challenge conventional wisdom.",
  product:
    "Find pain points from real user reviews, competitor gaps, and market trends. Look for specific problems people complain about that this product solves.",
  educational:
    "Find actionable steps, common misconceptions, and lesser-known tips. Prioritize practical, implementable advice with clear before/after outcomes.",
  personal_brand:
    "Find relatable stories, vulnerable angles, and authentic moments. Look for common industry frustrations and shared experiences.",
  interactive:
    "Find polarizing questions, engaging debates, and opinion-splitting topics. Look for recent industry decisions that divide opinion.",
  inspirational:
    "Find underdog stories, breakthrough moments, and transformation narratives. Look for specific, detailed journeys — not generic motivation.",
};

function buildSystemPrompt(brand: Brand, goal: GoalType, hasLiveData: boolean): string {
  const integritySection = hasLiveData
    ? `LIVE WEB SOURCES PROVIDED:
The user prompt includes "KEY SOURCES" — a list of search results from a real web search. Build the brief from these sources.

INTEGRITY RULES (LIVE MODE):
- Every stat or quote you extract MUST come from one of the provided sources. Tag it with the matching source URL in the "url" field.
- If you embed your own training-knowledge claim, mark it confidence: MEDIUM or LOW and url: omit. Never pretend a memory claim came from a source.
- If the sources don't cover something the writer needs, list it under knowledge_gaps. Don't invent.
- HIGH confidence requires: claim is directly stated in a provided source. Otherwise MEDIUM at best.
- Never fabricate URLs. Only use URLs that appear in the KEY SOURCES list.`
    : `NO LIVE DATA AVAILABLE:
Web search is unavailable. Work from your training knowledge only.

INTEGRITY RULES (MEMORY MODE):
- Every claim must be tagged HIGH (you are certain), MEDIUM (you recall this but details might be off), or LOW (you are guessing).
- If a number might have changed in the last 12 months, set cutoff_risk: true. Do NOT substitute a newer guess.
- List blind spots under knowledge_gaps.
- NEVER invent stats, sources, or quotes. A LOW confidence honest claim beats a HIGH confidence fabrication.
- Do NOT include "url" fields — you have no verified sources.`;

  return `You are a research analyst preparing a brief for a LinkedIn ghostwriter.

BRAND CONTEXT:
- Company: ${brand.name}
- Product: ${brand.description}
- Audience: ${brand.target_audience}
- Topics: ${brand.topics.join(", ")}

RESEARCH STRATEGY FOR ${goal.toUpperCase().replace("_", " ")}:
${GOAL_RESEARCH_STRATEGIES[goal]}

${integritySection}

OUTPUT FORMAT — Return ONLY a JSON object with this exact shape:
{
  "key_insights": [
    {
      "insight": "<specific claim>",
      "confidence": "HIGH" | "MEDIUM" | "LOW",
      "reasoning": "<why you're confident or not — one sentence>"
    }
  ],
  "statistics": [
    {
      "stat": "<figure with units, e.g. '60% of teams' or '$2.3B market'>",
      "source": "<source name or 'general industry knowledge' if you can't recall>",
      "confidence": "HIGH" | "MEDIUM" | "LOW",
      "cutoff_risk": true | false,
      "url": "<source URL from the KEY SOURCES list — omit if memory-mode>"
    }
  ],
  "contrarian_angles": [
    "<angle that challenges the mainstream view, one sentence each>"
  ],
  "quotes": [
    {
      "quote": "<text>",
      "attribution": "<person and role>",
      "confidence": "HIGH" | "MEDIUM" | "LOW",
      "paraphrased": true | false,
      "url": "<source URL from the KEY SOURCES list — omit if memory-mode>"
    }
  ],
  "recommended_focus": "<your #1 recommended angle for this post, with reasoning, in 2-3 sentences>",
  "knowledge_gaps": [
    "<thing the writer would benefit from that you cannot verify>"
  ]
}

Aim for 3-5 insights, 2-4 statistics, 2-3 contrarian angles, 0-2 quotes, and 1-3 knowledge gaps.

Return ONLY the JSON object. No markdown fences, no explanation.`;
}

function formatSearchResultsForPrompt(results: SearchResult[]): string {
  if (results.length === 0) return "";
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    ${r.snippet.slice(0, 400)}`)
    .join("\n\n");
}

// Format the structured brief into markdown for the writer's prompt and for UI display.
// Confidence labels are visible so the writer knows what to trust.
function formatBriefAsMarkdown(brief: ResearchBrief): string {
  const lines: string[] = [];

  if (brief.live_data === false) {
    lines.push("> ⚠ **No live data** — this brief was built from training knowledge only. Treat all claims with skepticism.\n");
  }

  lines.push("## Key Insights");
  for (const i of brief.key_insights) {
    lines.push(`- **[${i.confidence}]** ${i.insight}`);
    lines.push(`  _${i.reasoning}_`);
  }

  if (brief.statistics.length > 0) {
    lines.push("\n## Statistics & Data");
    for (const s of brief.statistics) {
      const cutoff = s.cutoff_risk ? " · ⚠ CUTOFF_RISK" : "";
      const sourceLabel = s.url ? `[${s.source}](${s.url})` : `_${s.source}_`;
      lines.push(`- **[${s.confidence}${cutoff}]** ${s.stat} — ${sourceLabel}`);
    }
  }

  if (brief.contrarian_angles.length > 0) {
    lines.push("\n## Contrarian Angles");
    for (const a of brief.contrarian_angles) lines.push(`- ${a}`);
  }

  if (brief.quotes.length > 0) {
    lines.push("\n## Quotes");
    for (const q of brief.quotes) {
      const tag = q.paraphrased ? " (paraphrased)" : "";
      const sourceLabel = q.url ? ` [(source)](${q.url})` : "";
      lines.push(`- **[${q.confidence}]** "${q.quote}" — ${q.attribution}${tag}${sourceLabel}`);
    }
  }

  lines.push("\n## Recommended Focus");
  lines.push(brief.recommended_focus);

  if (brief.knowledge_gaps.length > 0) {
    lines.push("\n## Knowledge Gaps");
    for (const g of brief.knowledge_gaps) lines.push(`- ${g}`);
  }

  return lines.join("\n");
}

// Robust JSON extractor — handles markdown fences and prose-wrapped output.
function extractJsonObject(raw: string): string {
  let s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  if (s.startsWith("{")) return s;
  const start = s.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in research output");
  let depth = 0, inString = false, escape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return s.slice(start, i + 1); }
  }
  throw new Error("Unbalanced JSON object in research output");
}

export interface ResearchResult {
  markdown: string;
  structured: ResearchBrief;
}

export async function runResearchAgent(
  topic: string,
  goal: GoalType,
  brand: Brand,
  referenceUrls?: string[]
): Promise<ResearchResult> {
  // 1. Try Tavily first. Graceful fallback to memory-only mode on any error.
  let searchResults: SearchResult[] = [];
  try {
    searchResults = await searchWeb(topic, 6);
  } catch (err) {
    // Log and continue — research falls back to training knowledge.
    console.warn(`[research] Tavily unavailable, falling back to memory mode:`, err instanceof Error ? err.message : err);
  }

  // 2. Fetch user-supplied reference URLs in parallel. Failures are logged
  // and skipped — the rest of the pipeline still runs.
  let referenceResults: SearchResult[] = [];
  if (referenceUrls && referenceUrls.length > 0) {
    const fetched = await Promise.all(referenceUrls.map((u) => fetchUrl(u)));
    referenceResults = fetched.filter((r): r is SearchResult => r !== null);
  }

  // Live data = either real search hits OR successfully-fetched user URLs.
  const liveData = searchResults.length > 0 || referenceResults.length > 0;

  // Allowed URL set spans both Tavily results and user references.
  const allowedUrls = new Set([
    ...searchResults.map((r) => r.url),
    ...referenceResults.map((r) => r.url),
  ]);

  // Build sources block. User references are tagged as AUTHORITATIVE so the
  // LLM weights them higher than Tavily snippets.
  let sourcesBlock = "";
  if (referenceResults.length > 0) {
    sourcesBlock += `\n\nUSER-SUPPLIED REFERENCES (AUTHORITATIVE — prefer these for any claim about the brand or topic):\n${formatSearchResultsForPrompt(referenceResults)}\n`;
  }
  if (searchResults.length > 0) {
    sourcesBlock += `\n\nKEY SOURCES from web search (use ONLY these URLs alongside the references above):\n${formatSearchResultsForPrompt(searchResults)}\n`;
  }

  const systemPrompt = buildSystemPrompt(brand, goal, liveData);
  const userPrompt = `Topic: ${topic}\nGoal: ${goal.replace("_", " ")}\n${sourcesBlock}\nProduce the research brief as JSON, following the output format exactly.`;

  const result = await complete({
    systemPrompt,
    userPrompt,
    temperature: 0.3,
    maxTokens: 2500,
  });

  const structured = JSON.parse(jsonrepair(extractJsonObject(result))) as ResearchBrief;

  // Defensive defaults — every field is required downstream.
  structured.key_insights ??= [];
  structured.statistics ??= [];
  structured.contrarian_angles ??= [];
  structured.quotes ??= [];
  structured.knowledge_gaps ??= [];
  structured.recommended_focus ??= "";

  // Strip any URLs the LLM hallucinated that weren't in the Tavily set.
  // This prevents made-up citations from leaking into the writer.
  if (liveData) {
    for (const s of structured.statistics) {
      if (s.url && !allowedUrls.has(s.url)) {
        console.warn(`[research] Stripping hallucinated stat URL: ${s.url}`);
        s.url = undefined;
      }
    }
    for (const q of structured.quotes) {
      if (q.url && !allowedUrls.has(q.url)) {
        console.warn(`[research] Stripping hallucinated quote URL: ${q.url}`);
        q.url = undefined;
      }
    }
  } else {
    // Memory mode — strip any URL fields the LLM may have added anyway.
    for (const s of structured.statistics) s.url = undefined;
    for (const q of structured.quotes) q.url = undefined;
  }

  structured.live_data = liveData;
  structured.source_urls = Array.from(allowedUrls);

  return {
    markdown: formatBriefAsMarkdown(structured),
    structured,
  };
}
