import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import { sendNotifications } from "@/lib/notifications";
import { createServerClient } from "@/lib/supabase";
import { getSessionUser } from "@/lib/supabase-session";
import type { PipelineInput } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Allow up to 2 minutes for full pipeline

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const body = await request.json();
    const { topic, goal, brand_id, notify, conventional_wisdom, author_pov, reference_urls } = body as PipelineInput & {
      notify?: boolean;
    };

    const result = await runPipeline({ topic, goal, brand_id, conventional_wisdom, author_pov, reference_urls }, userId);

    if (result.status === "failed") {
      return NextResponse.json(
        { error: result.error || "Pipeline failed" },
        { status: 500 }
      );
    }

    // Send notifications if requested
    if (notify && result.status === "completed") {
      const supabase = createServerClient();
      const postId = (result as { post_id?: string }).post_id;
      if (postId) {
        const { data: post } = await supabase
          .from("posts")
          .select("*")
          .eq("id", postId)
          .single();

        if (post) {
          await sendNotifications(post, result.brand, userId);
        }
      }
    }

    return NextResponse.json({
      status: result.status,
      post_id: (result as { post_id?: string }).post_id,
      hooks: result.hooks,
      post_body: result.post_body,
      cta: result.cta,
      hashtags: result.hashtags,
      research_brief: result.research_brief,
      content_strategy: result.content_strategy,
      visual_suggestion: result.visual_suggestion,
      editor_score: result.editor_score,
      editor_feedback: result.editor_feedback,
      revision_count: result.revision_count,
      force_approved: result.force_approved ?? false,
    });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
