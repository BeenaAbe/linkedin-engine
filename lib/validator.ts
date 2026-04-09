import type { GoalType, PipelineInput } from "@/lib/types";

const VALID_GOALS: GoalType[] = [
  "thought_leadership",
  "product",
  "educational",
  "personal_brand",
  "interactive",
  "inspirational",
];

export function validateInput(input: PipelineInput): { valid: boolean; error?: string } {
  if (!input.topic || input.topic.trim().length < 3) {
    return { valid: false, error: "Topic must be at least 3 characters" };
  }

  if (!input.goal || !VALID_GOALS.includes(input.goal)) {
    return { valid: false, error: `Invalid goal. Must be one of: ${VALID_GOALS.join(", ")}` };
  }

  if (!input.brand_id || input.brand_id.trim().length === 0) {
    return { valid: false, error: "Brand must be selected" };
  }

  return { valid: true };
}
