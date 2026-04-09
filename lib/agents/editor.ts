import { complete } from "@/lib/groq";
import type { Brand, GoalType, Hook, ContentStrategy, ResearchBrief } from "@/lib/types";
import { QUALITY_THRESHOLDS } from "@/lib/types";
import type { WriterOutput } from "./writer";

const FORBIDDEN_JARGON = [
  "synergy", "leverage", "circle back", "alignment", "bandwidth",
  "ecosystem", "paradigm shift", "game-changer", "move the needle",
  "low-hanging fruit", "deep dive", "touch base", "holistic",
  "streamline", "best-in-class", "cutting-edge", "robust",
];

interface QualityCheck {
  name: string;
  passed: boolean;
  message: string;
  penalty: number;
}

// Extract numeric tokens worth checking against research stats.
// We want figures that look like real claims, not "3 reasons" or "the 5 things".
function extractNumericClaims(body: string): string[] {
  const matches = body.match(
    /\$\d[\d,.]*\s*(?:million|billion|trillion|m|b|k)?|\d[\d,.]*\s*%|\d+x|\d[\d,.]*\s*(?:million|billion|thousand)\b/gi
  );
  return matches ? Array.from(new Set(matches.map((m) => m.toLowerCase().trim()))) : [];
}

// Strip non-essential formatting so substring matches survive comma/space differences.
function normalizeNumber(s: string): string {
  return s.toLowerCase().replace(/[\s,]/g, "");
}

function runAutomatedChecks(
  draft: WriterOutput,
  goal: GoalType,
  researchBrief?: ResearchBrief
): { checks: QualityCheck[]; score: number } {
  const thresholds = QUALITY_THRESHOLDS[goal];
  const checks: QualityCheck[] = [];
  let score = 100;

  // 1. Character count
  const charCount = draft.post_body.length;
  const charOk = charCount >= thresholds.min_chars && charCount <= thresholds.max_chars;
  checks.push({
    name: "Character count",
    passed: charOk,
    message: charOk
      ? `${charCount} chars (target: ${thresholds.min_chars}-${thresholds.max_chars})`
      : `${charCount} chars — outside target ${thresholds.min_chars}-${thresholds.max_chars}`,
    penalty: charOk ? 0 : 15,
  });

  // 2. Line breaks
  const lineBreaks = (draft.post_body.match(/\n\n/g) || []).length;
  const breaksOk = lineBreaks >= thresholds.min_line_breaks;
  checks.push({
    name: "Line breaks",
    passed: breaksOk,
    message: breaksOk
      ? `${lineBreaks} line breaks`
      : `Only ${lineBreaks} line breaks — need at least ${thresholds.min_line_breaks}`,
    penalty: breaksOk ? 0 : 10,
  });

  // 3. Hook count and diversity
  const hooks = draft.hooks || [];
  const hookTypes = new Set(hooks.map((h: Hook) => h.type));
  const hasAllTypes = hookTypes.has("controversial") && hookTypes.has("question") && hookTypes.has("story");
  checks.push({
    name: "Hook diversity",
    passed: hooks.length === 3 && hasAllTypes,
    message: hasAllTypes
      ? "3 distinct hook types present"
      : `Missing hook types. Have: ${[...hookTypes].join(", ")}. Need: controversial, question, story`,
    penalty: hasAllTypes ? 0 : 20,
  });

  // 4. Hook similarity check
  if (hooks.length >= 2) {
    const hookTexts = hooks.map((h: Hook) => h.text.toLowerCase());
    const firstWords = hookTexts.map((t: string) => t.split(" ").slice(0, 3).join(" "));
    const uniqueStarts = new Set(firstWords).size;
    const startsOk = uniqueStarts === hookTexts.length;
    checks.push({
      name: "Hook uniqueness",
      passed: startsOk,
      message: startsOk ? "Hooks have distinct openings" : "Hooks start too similarly",
      penalty: startsOk ? 0 : 15,
    });
  }

  // 5. CTA presence
  const hasCta = Boolean(draft.cta && draft.cta.trim().length > 5);
  checks.push({
    name: "CTA presence",
    passed: hasCta,
    message: hasCta ? "CTA present" : "Missing or too short CTA",
    penalty: hasCta ? 0 : 10,
  });

  // 6. Hashtag count
  const hashtagCount = draft.hashtags?.length || 0;
  const hashtagsOk = hashtagCount >= 3 && hashtagCount <= 5;
  checks.push({
    name: "Hashtags",
    passed: hashtagsOk,
    message: hashtagsOk
      ? `${hashtagCount} hashtags`
      : `${hashtagCount} hashtags — need 3-5`,
    penalty: hashtagsOk ? 0 : 5,
  });

  // 7. Jargon detection
  const bodyLower = draft.post_body.toLowerCase();
  const foundJargon = FORBIDDEN_JARGON.filter((j) => bodyLower.includes(j));
  const jargonOk = foundJargon.length === 0;
  checks.push({
    name: "Jargon check",
    passed: jargonOk,
    message: jargonOk
      ? "No corporate jargon detected"
      : `Found jargon: ${foundJargon.join(", ")}`,
    penalty: jargonOk ? 0 : foundJargon.length * 5,
  });

  // 8. Passive voice
  const passivePatterns = /\b(was|were|been|being|is|are|am)\s+\w+ed\b/gi;
  const passiveCount = (draft.post_body.match(passivePatterns) || []).length;
  const passiveOk = passiveCount <= 2;
  checks.push({
    name: "Passive voice",
    passed: passiveOk,
    message: passiveOk
      ? `${passiveCount} passive constructions`
      : `${passiveCount} passive constructions — too many, rewrite actively`,
    penalty: passiveOk ? 0 : 10,
  });

  // 9. Stats presence (for thought leadership)
  if (goal === "thought_leadership") {
    const hasNumbers = /\d+%|\d+x|\$\d+|\d+\s*(million|billion|thousand)/i.test(draft.post_body);
    checks.push({
      name: "Statistics",
      passed: hasNumbers,
      message: hasNumbers ? "Contains data/statistics" : "Thought leadership posts need data — add statistics",
      penalty: hasNumbers ? 0 : 10,
    });
  }

  // 10. Research integrity — every numeric claim in the body should trace to
  // a HIGH/MEDIUM confidence stat from the research brief. LOW confidence
  // stats and fabricated numbers fail this check.
  if (researchBrief) {
    const numericClaims = extractNumericClaims(draft.post_body);
    if (numericClaims.length > 0) {
      // Build a haystack of normalized HIGH/MEDIUM stat strings
      const trustedNormalized = researchBrief.statistics
        .filter((s) => s.confidence === "HIGH" || s.confidence === "MEDIUM")
        .map((s) => normalizeNumber(s.stat));

      const unbacked = numericClaims.filter((claim) => {
        const norm = normalizeNumber(claim);
        return !trustedNormalized.some((t) => t.includes(norm) || norm.includes(t));
      });

      const integrityOk = unbacked.length === 0;
      checks.push({
        name: "Research integrity",
        passed: integrityOk,
        message: integrityOk
          ? `All ${numericClaims.length} numeric claim(s) backed by research`
          : `Unbacked numbers in body: ${unbacked.slice(0, 3).join(", ")}${unbacked.length > 3 ? `, +${unbacked.length - 3} more` : ""}`,
        penalty: integrityOk ? 0 : 10,
      });
    }
  }

  // Calculate final score
  const totalPenalty = checks.reduce((sum, c) => sum + c.penalty, 0);
  score = Math.max(0, score - totalPenalty);

  return { checks, score };
}

export interface EditorResult {
  approved: boolean;
  score: number;
  feedback: string;
  checks: QualityCheck[];
  qualitativeReview: string;
  // True when the editor force-approved a draft below threshold because the
  // revision budget (2 revisions) ran out. The UI should warn the user.
  force_approved: boolean;
}

export async function runEditorAgent(
  draft: WriterOutput,
  topic: string,
  goal: GoalType,
  brand: Brand,
  revisionCount: number,
  strategy?: ContentStrategy,
  researchBrief?: ResearchBrief
): Promise<EditorResult> {
  // Run automated checks (now strategy-aware via researchBrief)
  const { checks, score: autoScore } = runAutomatedChecks(draft, goal, researchBrief);

  // Strategy block — only included when the strategist's output is available.
  // The editor uses it for the STRATEGY EXECUTION rubric dimension.
  const strategyBlock = strategy
    ? `

INTENDED STRATEGY (the editor must score whether the draft delivers this):
- CONVENTIONAL WISDOM: ${strategy.conventional_wisdom}
- CHOSEN ANGLE: ${strategy.chosen_angle}
- SCROLL STOP REASON: ${strategy.scroll_stop_reason}${strategy.author_pov ? `\n- AUTHOR POV (the post must arrive here): ${strategy.author_pov}` : ""}
`
    : "";

  // Get LLM qualitative review using a structured rubric
  const systemPrompt = `You are a senior LinkedIn content editor for ${brand.name}.
Tone guide: ${brand.tone}

Score the draft against this rubric. Each dimension is scored 1-10. Be strict — a 7 means "good", a 9 means "exceptional". Default to skepticism.

RUBRIC:
1. HOOK STRENGTH (1-10): Would a busy LinkedIn user stop scrolling? Is it specific, surprising, or emotionally charged — not generic?
2. NARRATIVE FLOW (1-10): Does each paragraph connect to the next THROUGH CONTENT, not through filler transitions like "Here's the thing", "But that's not the real problem", "What's surprising is", "The reality is", "Here's the kicker"? Does it SHOW rather than TELL — i.e., does it demonstrate importance instead of announcing it ("the financial impact is clear" = telling, weak; specific dollar figure with context = showing, strong)? Cap this score at 5 if you find any heralding/announcing phrases.
3. SENTENCE RHYTHM (1-10): Is there real variation in sentence length, or does the post read as a flat sequence of similar declarative sentences? A run of 3+ similar-length declarative sentences caps this at 5. Look for fragment + medium + long mixing.
4. SPECIFICITY & VOICE (1-10): Concrete numbers, names, lived experience? Active voice with first-hand agency ("we tuned", "the team saw") rather than passive distancing ("was observed", "is reported")? Generic vendor-speak caps this at 4.
5. BRAND FIT (1-10): Does it match ${brand.name}'s tone (${brand.tone}) and audience (${brand.target_audience})? Critical test — if you swapped "${brand.name}" for any competitor, would the post still make sense? If yes, score ≤5.
6. CTA QUALITY (1-10): Is the CTA ONE committed ask, or does it stack multiple fragments ("What's your take? Disagree? Comment below.")? Stacked-fragment CTAs cap this at 4. A single pointed question that emerges from the post's argument scores 8+.
7. STRATEGY EXECUTION (1-10): Did the post deliver the chosen angle, or did it drift into generic content? Score ≤4 if the post could have been written without the chosen angle (the angle was decorative not load-bearing). Score ≤4 if the post agrees with the conventional_wisdom instead of contradicting it. ${strategy?.author_pov ? "If author_pov is set, score ≤4 if the post softens, hedges, or fails to arrive at that view. " : ""}If no strategy was provided, score this dimension 7 by default.

Then output, in this exact format:

HOOK: <score> — <one-line reason>
FLOW: <score> — <one-line reason, name any heralding phrase you found>
RHYTHM: <score> — <one-line reason>
SPECIFICITY: <score> — <one-line reason>
BRAND_FIT: <score> — <one-line reason>
CTA: <score> — <one-line reason>
STRATEGY: <score> — <one-line reason citing the chosen_angle>
TOTAL_ADJUST: <integer between -10 and +10>
TOP_FIX: <one specific actionable change, or "none">

Rules for TOTAL_ADJUST: average the 7 scores, then map: avg≥8.5 → +10, avg 7.5-8.4 → +5, avg 6.5-7.4 → 0, avg 5.5-6.4 → -5, avg <5.5 → -10.`;

  const userPrompt = `TOPIC: ${topic}
GOAL: ${goal.replace("_", " ")}
${strategyBlock}
HOOKS:
${draft.hooks.map((h: Hook, i: number) => `${i + 1}. [${h.type}] ${h.text}`).join("\n")}

POST BODY:
${draft.post_body}

CTA: ${draft.cta}

AUTOMATED SCORE: ${autoScore}/100
FAILED CHECKS: ${checks.filter((c) => !c.passed).map((c) => c.message).join("; ") || "None"}

Provide your qualitative review.`;

  const qualitativeReview = await complete({
    systemPrompt,
    userPrompt,
    temperature: 0.2,
    maxTokens: 600,
  });

  // Parse score adjustment from the structured rubric output
  const scoreAdjustMatch = qualitativeReview.match(/TOTAL_ADJUST:\s*([+-]?\d+)/i);
  const scoreAdjust = scoreAdjustMatch ? parseInt(scoreAdjustMatch[1]) : 0;
  const finalScore = Math.max(0, Math.min(100, autoScore + scoreAdjust));

  const threshold = QUALITY_THRESHOLDS[goal].min_score;
  const passed = finalScore >= threshold;
  const exhaustedRevisions = revisionCount >= 2;
  const force_approved = !passed && exhaustedRevisions;
  const approved = passed || exhaustedRevisions;

  const failedChecks = checks.filter((c) => !c.passed);
  const feedback = failedChecks.length > 0
    ? `Failed checks: ${failedChecks.map((c) => c.message).join(". ")}. ${qualitativeReview}`
    : qualitativeReview;

  return {
    approved,
    score: finalScore,
    feedback,
    checks,
    qualitativeReview,
    force_approved,
  };
}
