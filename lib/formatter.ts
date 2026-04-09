import type { GoalType, VisualSuggestion } from "@/lib/types";

const VISUAL_DEFAULTS: Record<GoalType, VisualSuggestion> = {
  thought_leadership: {
    format: "carousel",
    suggestion: "5-slide carousel with key data points and a bold opening slide",
    carousel_outline: ["Bold claim/hook", "Problem context", "Data point 1", "Data point 2", "CTA slide"],
  },
  product: {
    format: "video",
    suggestion: "30-60 second demo clip or screenshot with annotations",
  },
  educational: {
    format: "carousel",
    suggestion: "3-7 slide step-by-step carousel",
    carousel_outline: ["Problem/Title", "Step 1", "Step 2", "Step 3", "Summary + CTA"],
  },
  personal_brand: {
    format: "photo",
    suggestion: "Candid photo or behind-the-scenes moment (1:1 or 4:5 aspect)",
  },
  interactive: {
    format: "text_only",
    suggestion: "Text-only post or simple quote card to maximize comment visibility",
  },
  inspirational: {
    format: "quote_card",
    suggestion: "Quote card with key line on a textured/gradient background",
  },
};

export interface FormattedOutput {
  character_count: number;
  word_count: number;
  estimated_read_time: string;
  visual_suggestion: VisualSuggestion;
  final_hashtags: string[];
}

export function formatOutput(
  postBody: string,
  goal: GoalType,
  hashtags: string[],
  writerVisual: VisualSuggestion | null
): FormattedOutput {
  const charCount = postBody.length;
  const wordCount = postBody.split(/\s+/).filter(Boolean).length;
  const readMinutes = Math.max(1, Math.ceil(wordCount / 200));

  // Use writer's visual if provided, otherwise default
  const visual = writerVisual && writerVisual.format
    ? writerVisual
    : VISUAL_DEFAULTS[goal];

  // Ensure hashtags are properly formatted
  const finalHashtags = hashtags
    .map((h) => (h.startsWith("#") ? h : `#${h}`))
    .map((h) => h.replace(/\s+/g, ""))
    .slice(0, 5);

  return {
    character_count: charCount,
    word_count: wordCount,
    estimated_read_time: `${readMinutes} min read`,
    visual_suggestion: visual,
    final_hashtags: finalHashtags,
  };
}
