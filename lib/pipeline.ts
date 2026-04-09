import { createServerClient } from "@/lib/supabase";
import { validateInput } from "@/lib/validator";
import { runResearchAgent } from "@/lib/agents/research";
import { runStrategistAgent } from "@/lib/agents/strategist";
import { runWriterAgent } from "@/lib/agents/writer";
import { runEditorAgent } from "@/lib/agents/editor";
import { formatOutput } from "@/lib/formatter";
import { getAvoidanceContext, recordPostHistory } from "@/lib/anti-repetition";
import type { PipelineInput, PipelineState, Brand } from "@/lib/types";

export type ProgressCallback = (step: string, status: string, message?: string) => void;

export async function runPipeline(
  input: PipelineInput,
  userId: string,
  onProgress?: ProgressCallback
): Promise<PipelineState> {
  const supabase = createServerClient();
  const report = (step: string, status: string, msg?: string) => {
    if (onProgress) onProgress(step, status, msg);
  };

  // 1. Validate
  report("validate", "running", "Validating input...");
  const validation = validateInput(input);
  if (!validation.valid) {
    return {
      input,
      brand: {} as Brand,
      revision_count: 0,
      status: "failed",
      current_step: "validate",
      error: validation.error,
    };
  }
  report("validate", "completed", "Input validated");

  // Fetch brand
  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("*")
    .eq("id", input.brand_id)
    .single();

  if (brandError || !brand) {
    return {
      input,
      brand: {} as Brand,
      revision_count: 0,
      status: "failed",
      current_step: "validate",
      error: "Brand not found",
    };
  }

  const state: PipelineState = {
    input,
    brand,
    revision_count: 0,
    status: "running",
    current_step: "research",
  };

  try {
    // 2. Research
    report("research", "running", "Researching topic...");
    const researchResult = await runResearchAgent(input.topic, input.goal, brand, input.reference_urls);
    state.research_brief = researchResult.markdown;
    state.research_structured = researchResult.structured;
    const liveLabel = researchResult.structured.live_data ? "live" : "memory-only";
    report("research", "completed", `Research complete · ${liveLabel} · ${researchResult.structured.knowledge_gaps.length} gaps flagged`);

    // 3. Strategist
    report("strategist", "running", "Creating content strategy...");
    state.content_strategy = await runStrategistAgent(
      input.topic,
      input.goal,
      state.research_brief,
      brand,
      input.conventional_wisdom,
      input.author_pov
    );
    report("strategist", "completed", `Angle: ${state.content_strategy.chosen_angle.slice(0, 60)}...`);

    // 4. Get anti-repetition context
    const avoidanceContext = await getAvoidanceContext(input.brand_id);

    // 5. Writer + Editor loop (max 3 attempts)
    let approved = false;
    while (!approved && state.revision_count < 3) {
      // Writer
      report("writer", "running", state.revision_count > 0
        ? `Revising draft (attempt ${state.revision_count + 1})...`
        : "Writing post...");

      const writerOutput = await runWriterAgent(
        input.topic,
        input.goal,
        state.research_brief,
        state.content_strategy!,
        brand,
        avoidanceContext + (state.editor_feedback ? `\n\nEDITOR FEEDBACK FROM LAST ATTEMPT:\n${state.editor_feedback}` : "")
      );

      state.hooks = writerOutput.hooks;
      state.post_body = writerOutput.post_body;
      state.cta = writerOutput.cta;
      state.hashtags = writerOutput.hashtags;
      state.visual_suggestion = writerOutput.visual_suggestion;
      report("writer", "completed", "Draft ready");

      // Editor — now strategy-aware (Spec 3) and research-aware (Spec 5)
      report("editor", "running", "Reviewing quality...");
      const editorResult = await runEditorAgent(
        writerOutput,
        input.topic,
        input.goal,
        brand,
        state.revision_count,
        state.content_strategy,
        state.research_structured
      );

      state.editor_score = editorResult.score;
      state.editor_feedback = editorResult.feedback;
      state.force_approved = editorResult.force_approved;
      approved = editorResult.approved;

      if (!approved) {
        state.revision_count++;
        report("editor", "completed", `Score: ${editorResult.score} — revising...`);
      } else if (editorResult.force_approved) {
        report("editor", "completed", `⚠ Force-approved at ${editorResult.score} (below threshold)`);
      } else {
        report("editor", "completed", `Approved with score: ${editorResult.score}`);
      }
    }

    // 6. Format
    report("formatter", "running", "Formatting output...");
    const formatted = formatOutput(
      state.post_body!,
      input.goal,
      state.hashtags || [],
      state.visual_suggestion || null
    );
    state.hashtags = formatted.final_hashtags;
    state.visual_suggestion = formatted.visual_suggestion;
    report("formatter", "completed", `${formatted.character_count} chars, ${formatted.estimated_read_time}`);

    // 7. Save to database
    report("save", "running", "Saving post...");
    const { data: post, error: insertError } = await supabase
      .from("posts")
      .insert({
        brand_id: input.brand_id,
        user_id: userId,
        topic: input.topic,
        goal: input.goal,
        status: "draft",
        research_brief: state.research_brief,
        content_strategy: state.content_strategy,
        hooks: state.hooks,
        post_body: state.post_body,
        cta: state.cta,
        hashtags: state.hashtags,
        visual_suggestion: state.visual_suggestion,
        editor_score: state.editor_score,
        editor_feedback: state.editor_feedback,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to save post: ${insertError.message}`);
    }

    // 8. Record history for anti-repetition
    if (state.hooks && state.post_body && state.content_strategy) {
      await recordPostHistory(
        input.brand_id,
        state.hooks,
        state.content_strategy.chosen_angle,
        state.cta || "",
        state.post_body
      );
    }

    report("save", "completed", "Post saved");
    state.status = "completed";
    state.current_step = "done";

    return { ...state, ...(post ? { post_id: post.id } : {}) } as PipelineState & { post_id?: string };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    report(state.current_step, "failed", message);
    state.status = "failed";
    state.error = message;
    return state;
  }
}
