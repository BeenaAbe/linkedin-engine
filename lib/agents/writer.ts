import { jsonrepair } from "jsonrepair";
import { complete } from "@/lib/groq";
import type { Brand, GoalType, ContentStrategy, Hook } from "@/lib/types";

// CTA guidance per goal — describes the SHAPE of CTA to write, not a fixed
// string to copy. The writer should produce a single, committed ask that
// emerges from the post's content. Never stack multiple fragments.
const CTA_BY_GOAL: Record<GoalType, string> = {
  thought_leadership: "End with ONE pointed question that invites disagreement on the post's central claim. Single sentence. No 'comment below' filler.",
  product: "End with a single concrete next step (link in comments, DM me, see the writeup). No hype, no exclamation marks.",
  educational: "End with ONE specific question about which tip the reader will try, OR an invitation to share their own version. Single ask, not a checklist.",
  interactive: "End with ONE clear question worth answering. The whole post should build to this — the CTA is the payoff, not an afterthought.",
  personal_brand: "End with ONE invitation for the reader to share a parallel experience. Personal, specific, single sentence.",
  inspirational: "End with ONE quiet line — a reflection or a person to think of. No 'tag someone who needs to hear this' clichés.",
};

// Brand-specific few-shot examples. Keys are lowercase brand names.
// Falls back to the "generic" set if brand isn't recognized — neutral
// professional voice that works for any broad LinkedIn audience.
const EXAMPLES_BY_BRAND: Record<string, Record<GoalType, string>> = {
  generic: {
    thought_leadership: `Hook: "Unpopular opinion: Your roadmap is killing your product."

Most PMs treat roadmaps like religious texts.

Every quarter, they lock features into a timeline. Then they wonder why shipping feels like pushing a boulder uphill.

Here's what I learned after 8 years of building products:

Roadmaps create false certainty. They assume you know what users want 6 months from now.

But the best products emerge from:
• Weekly user interviews
• Rapid experimentation
• Killing features that don't work

Your job isn't to follow the plan.

It's to find the truth faster than your competitors.

If your team kills more features than it ships, what does your roadmap actually do?`,

    educational: `Hook: "What if I told you 90% of A/B tests fail because of one mistake?"

You're testing the wrong thing.

Most teams test button colors and headlines. They optimize for clicks.

But high-performing teams test hypotheses about user behavior.

Here's the framework I use:

Bad Test: "Will a green button increase signups?"
Good Test: "If users see social proof above the fold, will perceived trust increase enough to boost signups by 15%?"

The difference? One optimizes pixels. The other tests psychology.

Before your next A/B test, ask:
• What user behavior am I trying to change?
• What's my hypothesis about why they behave this way?
• What metric proves I'm right?

Which tip will you try first?`,

    product: `Hook: "I spent 6 months building a feature no one asked for. It became our most-used product."

In 2019, Notion didn't have databases.

Users were begging for integrations, mobile apps, and faster load times.

Instead, we built a relational database inside a document editor. The team thought we were crazy.

But here's what we knew:

Power users weren't leaving because of bugs. They were leaving because they hit a complexity ceiling.

They needed a tool that could scale with their ambitions.

We ignored the feature requests. We solved the deeper problem.

Today, databases power 60% of Notion workspaces.

Link in comments for the full breakdown.`,

    interactive: `Hook: "Quick poll: What's the biggest reason you skip 1-on-1s with your manager?"

I've noticed a pattern in the last 10 companies I've worked with.

1-on-1s get canceled. Not by managers. By ICs.

When I ask why, the answer is always the same: "They're not valuable."

So here's my question to you:

What makes a 1-on-1 feel like a waste of time?

Vote below.`,

    personal_brand: `Hook: "I got fired from my first PM role. Best thing that ever happened to me."

My manager called me into his office on a Tuesday.

"You're not a good fit. Today is your last day."

I was 26. I thought my career was over.

But here's what actually happened:

Getting fired forced me to ask a question I'd been avoiding: "What do I actually want to build?"

At my old job, I was executing someone else's vision. I was a feature factory.

After I got fired, I spent 3 months talking to users. Not building. Just listening.

That's when I realized: the best PMs aren't order-takers. They're problem-finders.

Has this happened to you? Drop your story below.`,

    inspirational: `Hook: "The best career advice I ever got was only 7 words long."

My first CEO told me this after I shipped a feature that flopped:

"Fall in love with the problem, not your solution."

I had spent 3 months building the wrong thing.

I was so attached to my idea that I ignored every signal telling me to pivot.

That sentence changed how I work:

Now, I spend 80% of my time understanding the problem. And 20% building the solution.

Because the teams that win aren't the ones who build the fastest.

They're the ones who understand the deepest.

Tag someone who needs to hear this today.`,
  },

  logrite: {
    thought_leadership: `Hook: "Hot take: your observability stack is the reason your incidents take 4 hours to resolve."

Most teams treat logs, metrics, and traces like three separate problems.

Three vendors. Three query languages. Three dashboards open at 3am while production burns.

The tool sprawl IS the incident. Nobody puts that in the post-mortem.

I watched an SRE team last quarter spend 90 minutes correlating a Datadog metric to a Splunk log line to a Honeycomb trace — for an outage that lasted 12 minutes.

The post-mortem blamed the bug. It wasn't the bug.

It was the context-switching tax. Every tool jump cost them 7-12 minutes of working memory.

When logs, metrics, and traces live in one place, MTTR drops by an order of magnitude. Not because the tool is faster — because the engineer never has to leave the page.

Stop optimizing your tools. Start eliminating the seams between them.

What's the longest your team has spent correlating signals across tools during an incident?`,

    educational: `Hook: "Your error logs are lying to you. Here's how to make them tell the truth."

Most teams log errors like this: log.error("Failed to process payment")

That line tells you nothing. Not the user. Not the amount. Not why.

Here's the structured logging discipline I wish someone had taught me 5 years ago:

1. Log the WHO — user_id, tenant_id, request_id. Always.
2. Log the WHAT — not "payment failed" but {"event":"payment.failed","amount":4200,"currency":"USD","gateway_code":"insufficient_funds"}
3. Log the WHY — the upstream cause, not just the symptom. Wrap your error with the context that produced it.
4. Log it ONCE — at the boundary where you actually have the full picture. Not at every layer on the way up.

The test: can someone debug your incident from the logs alone, without opening the code?

If the answer is no, your logs are decoration, not telemetry.

Which tip will you try first? Let me know below.`,

    product: `Hook: "I spent a year watching SRE teams fight their logging tools. Then we built the thing they actually needed."

Every observability platform makes the same promise: search everything, answer anything.

Then you try to use it during an incident.

You hit a 14-day retention cliff. You realize that one critical service isn't shipping logs at the right level. You discover the query language doesn't support the join you need.

The tool isn't broken. The model is.

Treating logs as "data you query later" assumes you know what you'll ask. During an incident, you don't.

We built Logrite around a different idea: logs should be the same artifact across the lifecycle. Generated with intent at build time. Validated before runtime. Searchable by meaning, not just text, when something breaks.

One team cut their average investigation from 2 hours to 11 minutes after switching. The kicker — they didn't change their alerts, their runbooks, or their on-call rotation.

They just stopped fighting the tool.

Link in comments for the full breakdown.`,

    interactive: `Hook: "Quick question for the SREs: what's the single log line you wish your devs would add?"

I asked 30 on-call engineers this last month.

The answers were almost identical — and almost none of them were what their devs would have guessed.

The top three:

• "The full request payload, not just the user_id"
• "Which feature flag was active at the time"
• "The version of the service that emitted this log"

Notice what's not on the list: stack traces, timestamps, severity levels. Devs already log those.

The gap is always context, not data.

So I'll throw this open:

What's the one log line your devs don't add — and you wish they would?

Drop it in the comments. I'll compile the best ones into a checklist.`,

    personal_brand: `Hook: "The worst incident of my career taught me that good logging isn't a tooling problem. It's a values problem."

3am. Black Friday. Payment service was throwing 500s and we couldn't tell why.

We had Datadog. We had Splunk. We had a $400k/year observability budget.

What we didn't have: a single log line that said which payment provider had failed.

I spent 47 minutes grepping logs from four services before I found a stack trace that mentioned Stripe — buried in a debug-level message we'd almost filtered out.

Here's the part nobody talks about:

The logging gap wasn't an oversight. It was a culture. Our team treated logs as something you add when you have time. Tests had owners. Logs didn't.

After that incident, we made one change: every PR that touched a critical path required a "what does this look like in the logs?" comment from the reviewer.

Outages didn't stop. But our average investigation time dropped from 90 minutes to 14.

Has this happened to you? Drop your story below.`,

    inspirational: `Hook: "An SRE I worked with had a sticky note above her monitor that changed how I think about reliability."

It said: "If the log doesn't tell the story, the engineer becomes the log."

I didn't get it at first.

Then I sat through a post-mortem where a senior engineer spent 40 minutes reconstructing what happened during an incident — from memory, from Slack messages, from a screenshot someone had taken at 2am.

That was the cost. Not the downtime. The human reconstruction tax that nobody puts in the report.

Good logging isn't about debugging faster. It's about respecting the next person who has to walk into a fire you started.

The teams that take that seriously don't just have better incidents. They have better mornings after.

Tag someone who needs to hear this today.`,
  },

  deployd: {
    thought_leadership: `Hook: "Most enterprise test automation programs don't fail because of the tools. They fail because nobody owns them."

I've walked into 40+ Worksoft deployments in the last decade.

The pattern is always the same:

Year one: ambitious rollout, big consulting contract, dashboards everywhere.

Year two: the consultants leave. The internal team inherits 600 test scripts they didn't write and don't fully understand.

Year three: the program is "stalled." Leadership blames the tool. They start evaluating Tricentis.

Ownership never transferred. The tests were built FOR the team, not WITH them — and now nobody's career depends on them working.

Worksoft isn't the problem. Neither is the alternative they're about to migrate to.

The problem is the operating model. Test automation is a product, not a project. It needs a product owner, a backlog, and someone whose career depends on it working.

When someone actually owns your Worksoft, transformation happens. When nobody does, you'll evaluate your way through every vendor in the category.

If you've migrated platforms looking for the fix, did the new tool actually solve it?`,

    educational: `Hook: "Your SAP S/4HANA test suite is 80% redundant. Here's how to find out which 80%."

Most enterprise test estates grow by accretion. Every project adds tests. Nobody removes them.

Five years in, you have 4,000 scripts and a 14-hour regression run that nobody trusts.

Here's the audit I run with every new client:

1. Map every test to a business process. If a test doesn't trace to a process owner, flag it.
2. Pull execution history. Tests that have passed 200 times in a row without a failure are probably testing nothing.
3. Run a coverage diff against your last 3 production incidents. If your tests didn't catch them, your tests aren't aligned to your risk.
4. Kill anything that fails the above. Don't refactor it. Delete it.

A typical result: a 4,000-test suite collapses to 800-1,200 tests that actually defend the business. Run time drops from 14 hours to under 3.

The hardest part isn't the analysis. It's giving people permission to delete work they paid for.

Which tip will you try first? Let me know below.`,

    product: `Hook: "A client called us last year because their Worksoft program was 'broken.' We didn't change a single tool."

Fortune 500 manufacturer. Three years into a CAP rollout. 0% confidence in their regression suite.

Their leadership was a week away from signing a migration contract with another vendor.

We did one thing first: we asked to see the team that ran the platform.

There wasn't one.

The original implementation partner had left. The license was renewing automatically. Three different people had inherited "the Worksoft thing" and none of them owned it end-to-end.

We took over operations. Triaged the broken scripts. Killed 60% of the suite that was testing nothing. Rebuilt the rest around their actual business processes.

Six months later: 0.01% defect rate in production. 98% test coverage on the critical paths. Regression run time cut from 11 hours to under 2.

They didn't need a new tool. They needed someone whose job it was to make this one work.

That's the boring answer most consultancies won't give you, because it doesn't sell a transformation.

Link in comments for the full breakdown.`,

    interactive: `Hook: "For everyone running enterprise test automation: what's the real reason your last program stalled?"

I've been having this conversation for 10 years. The honest answers are almost never the ones that show up in the steering committee deck.

The four I hear most:

• "The implementation partner left and we never replaced the expertise."
• "We automated the wrong things — UI tests for processes that change every quarter."
• "The business stopped trusting the suite after one bad release."
• "Nobody had time to maintain it and shipping pressure won."

I want to know which one matches your experience. Or the one I'm missing.

Drop the real reason in the comments. No vendor names needed.`,

    personal_brand: `Hook: "I told a CIO her $2M test automation investment was salvageable. Her team had been told for a year it wasn't."

The first meeting was tense.

Her QA lead had been preparing the slide deck that would justify scrapping the whole thing. Three years of work. A platform license that was about to renew. A team that had stopped believing.

I asked one question: "Show me the last 10 production defects. Did your tests cover any of them?"

Six out of ten were in flows the suite wasn't testing at all.

That wasn't a tool failure. That was a coverage failure that no amount of new vendor would fix.

We spent the next 90 days doing the unsexy work. Mapping tests to processes. Killing dead scripts. Rewriting the 40 most critical flows. Training her internal team to run the platform without us.

Eight months later, she sent me a screenshot. Their first quarter with zero customer-reported defects in 4 years.

The hardest part of this work isn't technical. It's convincing smart people that the answer to a stalled program is rarely a new tool.

Has this happened to you? Drop your story below.`,

    inspirational: `Hook: "The best QA leader I ever worked with said one thing in every steering committee meeting."

She said it when stakeholders pushed for more tools. She said it when budgets were debated. She said it when leadership asked why automation hadn't 'transformed' anything yet.

"We don't need more tests. We need to trust the ones we have."

That sentence reframed everything for me.

Most enterprise QA programs are drowning in scripts and starving for confidence. They run thousands of tests and still ship with their fingers crossed.

The teams that break out of that pattern do something counterintuitive: they get smaller.

Smaller suites. Sharper coverage. A standing rule that any test that hasn't caught a bug in 18 months gets reviewed for deletion.

What looks like discipline from the outside feels like courage from the inside. Because it means defending decisions to delete work people paid for.

But the result is a regression suite the business actually believes in. And a release process that doesn't end in prayer.

Tag someone who needs to hear this today.`,
  },
};

function getExampleForBrand(brandName: string, goal: GoalType): string {
  const key = brandName.toLowerCase();
  const brandExamples = EXAMPLES_BY_BRAND[key] ?? EXAMPLES_BY_BRAND.generic;
  return brandExamples[goal];
}

function buildSystemPrompt(
  brand: Brand,
  goal: GoalType,
  avoidanceContext: string
): string {
  return `You are a LinkedIn ghostwriter for ${brand.name}.

BRAND CONTEXT:
- Product: ${brand.description}
- Audience: ${brand.target_audience}
- Tone: ${brand.tone}
- Key messaging: ${brand.key_messaging.join(" | ")}

THE SIX RULES — read these once, then write naturally. Don't compliance-check yourself sentence by sentence; trust your ear.

1. FIRST PERSON, LIKE EXPLAINING TO A SMART FRIEND OVER COFFEE. Not a research paper. Not a pitch. The reader is your peer.

2. SPECIFIC OVER GENERIC. Numbers, named companies, lived moments, real consequences. If a sentence could appear in any article on this topic, rewrite it.

3. ACTIVE VOICE, FIRST-HAND AGENCY. "We tuned the suite" not "the suite was tuned". The post should feel like something you lived, not something you summarized.

4. SHOW, DON'T TELL. Demonstrate importance through content; never announce it. Cut any sentence that exists to flag what the next sentence will do.

5. SHORT PARAGRAPHS, VARIED RHYTHM. 1-3 sentences per paragraph. Mix fragments, medium sentences, and the occasional longer sentence that holds a clause. If three sentences in a row sound the same, your rhythm is broken.

6. ONE COMMITTED CTA. A single pointed question or single concrete next step. Never stack fragments.

RESEARCH INTEGRITY — CRITICAL:
The research brief tags every claim with confidence: HIGH / MEDIUM / LOW, and may flag stats with CUTOFF_RISK.
- HIGH confidence: use as fact.
- MEDIUM: use, but consider attributing softly ("estimates suggest", "industry data put it around").
- LOW or CUTOFF_RISK: do NOT embed as fact. Either omit, or attribute explicitly ("as of [year]", "one study put it at").
If the brief lists Knowledge Gaps, do not invent answers to fill them.

HOOK RULES — produce exactly 3 hooks, each a completely different type:
- controversial: a bold debatable claim.
- question: genuine curiosity, opens with a question word.
- story: opens with a first-person moment ("I...", "Last week...", "Three years ago...").

CTA GUIDANCE FOR ${goal.toUpperCase().replace("_", " ")}:
${CTA_BY_GOAL[goal]}

${avoidanceContext ? `ANTI-REPETITION — your hooks/angle/CTA must NOT resemble any of these:\n${avoidanceContext}\n` : ""}

REFERENCE EXAMPLE — match the energy and rhythm, never the topic or phrasing:

${getExampleForBrand(brand.name, goal)}

VISUAL ASSET — pick the format that fits ${goal.replace("_", " ")}:
- thought_leadership / educational → carousel (5-15 slides, 1:1). Supply a slide outline.
- product → video (30-60s demo script) or annotated screenshot.
- personal_brand → candid photo (not corporate).
- interactive → LinkedIn poll (4 options) or text-only.
- inspirational → quote card (key lesson as overlay).

HASHTAGS — exactly 3-5: one broad (#Leadership, #AI), one niche, optionally one trending, optionally one community. No spam tags.

OUTPUT — return ONLY this JSON object, no markdown fences:
{
  "hooks": [
    { "type": "controversial", "text": "..." },
    { "type": "question", "text": "..." },
    { "type": "story", "text": "..." }
  ],
  "post_body": "Full post body with \\n\\n for paragraph breaks.",
  "cta": "Single committed call to action",
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "visual_suggestion": {
    "format": "carousel|video|photo|poll|text_only|quote_card",
    "suggestion": "Brief description",
    "carousel_outline": ["Slide 1", "Slide 2"]
  }
}`;
}

export interface WriterOutput {
  hooks: Hook[];
  post_body: string;
  cta: string;
  hashtags: string[];
  visual_suggestion: {
    format: string;
    suggestion: string;
    carousel_outline?: string[];
  };
}

export async function runWriterAgent(
  topic: string,
  goal: GoalType,
  researchBrief: string,
  strategy: ContentStrategy,
  brand: Brand,
  avoidanceContext: string
): Promise<WriterOutput> {
  const systemPrompt = buildSystemPrompt(brand, goal, avoidanceContext);
  const outlineFormatted = strategy.outline
    .map((step, i) => `  ${i + 1}. [${step.role}] ${step.must_do}`)
    .join("\n");

  const povSection = strategy.author_pov?.trim()
    ? `\nAUTHOR POV — the post MUST arrive at this view by the end. Do not soften it, do not hedge it, do not pretend the opposite is also valid. This is the editorial destination, not a balanced both-sides:
${strategy.author_pov}\n`
    : "";

  const userPrompt = `Write the LinkedIn post.

TOPIC: ${topic}
GOAL: ${goal.replace("_", " ")}
TARGET LENGTH: ${strategy.target_length.min}-${strategy.target_length.max} characters

CONVENTIONAL WISDOM (what most people believe):
${strategy.conventional_wisdom}

YOUR ANGLE (must contradict or complicate the above):
${strategy.chosen_angle}
${povSection}
WHY THE READER STOPS SCROLLING:
${strategy.scroll_stop_reason}

STRUCTURE: ${strategy.structure_type}
OUTLINE — each beat has a role and a job. Follow the jobs, not the role names:
${outlineFormatted}

KEY POINTS TO COMMUNICATE:
${strategy.key_points.map((p) => `- ${p}`).join("\n")}

SUPPORTING DATA (note confidence levels — apply the integrity rules):
${strategy.supporting_data.map((d) => `- ${d}`).join("\n")}

HOOK APPROACH PREFERENCE: ${strategy.hook_approach}

RESEARCH BRIEF:
${researchBrief}

Return ONLY the JSON object.`;

  const result = await complete({
    systemPrompt,
    userPrompt,
    temperature: 0.5,
    maxTokens: 3000,
    // jsonMode OFF for Claude — OpenRouter's response_format is inconsistent
    // across providers and Claude produces cleaner output without forcing.
    jsonMode: false,
    // Route the writer specifically to Claude for prose quality. Other agents
    // stay on the cheap/fast default model.
    model: "anthropic/claude-4.6-sonnet-20260217",
  });

  return JSON.parse(jsonrepair(extractJsonObject(result))) as WriterOutput;
}

// Robust JSON extractor for LLM output. Handles:
//   1. ```json ... ``` markdown fences
//   2. Leading/trailing prose around the object
//   3. Picks the first balanced {...} block found
function extractJsonObject(raw: string): string {
  // Strip markdown code fences
  let s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  // If it already starts with {, try as-is first
  if (s.startsWith("{")) return s;

  // Otherwise scan for the first {...} block, tracking string boundaries
  // so we don't get confused by braces inside string values.
  const start = s.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in writer output");

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  throw new Error("Unbalanced JSON object in writer output");
}
