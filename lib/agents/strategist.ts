import { jsonrepair } from "jsonrepair";
import { complete } from "@/lib/groq";
import type { Brand, GoalType, ContentStrategy } from "@/lib/types";
import { LENGTH_BY_GOAL, STRUCTURE_TYPES_BY_GOAL } from "@/lib/types";

function buildSystemPrompt(brand: Brand, goal: GoalType): string {
  const permittedStructures = STRUCTURE_TYPES_BY_GOAL[goal];
  const length = LENGTH_BY_GOAL[goal];

  return `You are a LinkedIn content strategist for ${brand.name}.

BRAND CONTEXT:
- Product: ${brand.description}
- Audience: ${brand.target_audience}
- Tone: ${brand.tone}
- Key messaging: ${brand.key_messaging.join(" | ")}

YOUR JOB:
Read the research brief, decide what makes this post worth stopping for, and produce a strategy the writer can execute.

YOUR FOUR NON-NEGOTIABLE OUTPUTS:
1. conventional_wisdom — what most of the audience currently believes about the topic. If the user supplied this, use their version. Otherwise infer it.
2. chosen_angle — the post's specific perspective. It MUST contradict, complicate, or sharpen conventional_wisdom. If chosen_angle agrees with conventional_wisdom, you have failed your job. Generic angles are failure too.
3. scroll_stop_reason — why THIS audience stops scrolling for THIS angle TODAY. One sentence. Specific.
4. alternative_framings — TWO OR THREE other ways the audience might be thinking about this topic. These are OTHER conventional_wisdom statements you considered and rejected. Each must be genuinely different from the one you picked — different audience segment, different starting belief, different pain point. Not paraphrases. For each alternative, state in one sentence WHY you didn't pick it. The user will see these and may regenerate from one of them.

EXAMPLE of good alternative_framings for "automated testing":
- chosen: "Most enterprises assume in-house automation means controlling outcomes."
- alt 1: "Most teams blame their last failed automation rollout on tool selection." (why not: less specific to enterprise pain)
- alt 2: "Most QA leaders think automation ROI shows up in defect counts, not release velocity." (why not: harder to tie to a single CTA)
- alt 3: "Most startups skip enterprise testing tools assuming they're overkill." (why not: doesn't match the brand audience)

AUTHOR POV (when supplied):
If the user supplied an author_pov, that is the DESTINATION the post must arrive at. Your chosen_angle is the path from conventional_wisdom to author_pov — the framing that makes the audience willing to walk it. Do not soften author_pov or hedge it; it is the editorial position the post commits to.
If no author_pov is supplied, you have full latitude to invent the most defensible contrarian angle from the research.

PERMITTED STRUCTURE TYPES for ${goal.toUpperCase().replace("_", " ")} posts (pick ONE):
${permittedStructures.map((s) => `- ${s}`).join("\n")}

TARGET LENGTH for ${goal.toUpperCase().replace("_", " ")} posts: ${length.min}-${length.max} characters.

RESEARCH INTEGRITY:
- The research brief tags every claim with HIGH/MEDIUM/LOW confidence. Treat LOW confidence claims as ideas, not facts. Don't anchor the strategy on them.
- If the brief lists Knowledge Gaps, the strategy must work AROUND them, not pretend they're filled.

OUTLINE FORMAT — each step must have a ROLE and a MUST_DO:
Each step is one beat of the post. The role names what it is. The must_do tells the writer what that beat must accomplish — specific verb, specific outcome, no titles.

GOOD must_do: "establish cost of status quo with one specific number from research"
BAD must_do: "introduction" or "talk about the problem"

Standard role names to use: hook, tension, insight, proof, brand_moment, cta. The brand_moment is where ${brand.name}'s point of view enters — through CONTRAST or REFRAME, never as a product mention.

OUTPUT FORMAT — return ONLY this JSON object, no markdown fences:
{
  "conventional_wisdom": "<one sentence stating what most of this audience currently believes>",
  "chosen_angle": "<one sentence stating the post's specific contradicting/complicating perspective>",
  "scroll_stop_reason": "<one sentence: why this audience stops for this angle today>",
  "author_pov": "<the user-supplied author POV if any, otherwise omit this field>",
  "alternative_framings": [
    { "conventional_wisdom": "<a different framing>", "why_not_chosen": "<one sentence>" },
    { "conventional_wisdom": "<a different framing>", "why_not_chosen": "<one sentence>" }
  ],
  "structure_type": "<one of the permitted structure types listed above>",
  "outline": [
    { "role": "hook", "must_do": "<specific verb + outcome>" },
    { "role": "tension", "must_do": "<specific verb + outcome>" },
    { "role": "insight", "must_do": "<specific verb + outcome>" },
    { "role": "proof", "must_do": "<specific verb + outcome>" },
    { "role": "brand_moment", "must_do": "<specific verb + outcome>" },
    { "role": "cta", "must_do": "<specific verb + outcome>" }
  ],
  "key_points": ["<the 3-4 things the post must communicate>"],
  "supporting_data": ["<HIGH or MEDIUM confidence stats/quotes from research, with confidence noted>"],
  "target_length": { "min": ${length.min}, "max": ${length.max} },
  "hook_approach": "controversial" | "question" | "story"
}

BEFORE YOU RETURN: re-read your chosen_angle. Does it actually contradict your conventional_wisdom? If they could both be true at once, rewrite the angle. This check is the difference between a post that gets engagement and a post that gets ignored.`;
}

// Robust JSON extractor — handles markdown fences.
function extractJsonObject(raw: string): string {
  let s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  if (s.startsWith("{")) return s;
  const start = s.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in strategist output");
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
  throw new Error("Unbalanced JSON object in strategist output");
}

export async function runStrategistAgent(
  topic: string,
  goal: GoalType,
  researchBrief: string,
  brand: Brand,
  conventionalWisdom?: string,
  authorPov?: string
): Promise<ContentStrategy> {
  const systemPrompt = buildSystemPrompt(brand, goal);
  const wisdomLine = conventionalWisdom?.trim()
    ? `\nUSER-SUPPLIED CONVENTIONAL WISDOM (use this verbatim as your conventional_wisdom field):\n"${conventionalWisdom.trim()}"\n`
    : "";
  const povLine = authorPov?.trim()
    ? `\nUSER-SUPPLIED AUTHOR POV (this is the editorial destination — the post must arrive here. Echo it verbatim into the author_pov field):\n"${authorPov.trim()}"\n`
    : "";

  const userPrompt = `TOPIC: ${topic}
GOAL: ${goal.replace("_", " ")}
${wisdomLine}${povLine}
RESEARCH BRIEF:
${researchBrief}

Produce the strategy as JSON. Remember: chosen_angle MUST contradict or complicate conventional_wisdom${authorPov?.trim() ? ", AND it must form a defensible path TO the author_pov" : ""}. Return ONLY the JSON object.`;

  const result = await complete({
    systemPrompt,
    userPrompt,
    temperature: 0.4,
    maxTokens: 2000,
  });

  const strategy = JSON.parse(jsonrepair(extractJsonObject(result))) as ContentStrategy;

  // Defensive defaults
  strategy.outline ??= [];
  strategy.key_points ??= [];
  strategy.supporting_data ??= [];
  strategy.target_length ??= LENGTH_BY_GOAL[goal];
  strategy.alternative_framings ??= [];

  // Belt-and-suspenders: if user supplied wisdom or POV, force them through
  if (conventionalWisdom?.trim()) {
    strategy.conventional_wisdom = conventionalWisdom.trim();
  }
  if (authorPov?.trim()) {
    strategy.author_pov = authorPov.trim();
  }

  return strategy;
}
