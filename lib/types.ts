export type GoalType =
  | "thought_leadership"
  | "product"
  | "educational"
  | "personal_brand"
  | "interactive"
  | "inspirational";

export type PostStatus =
  | "draft"
  | "review"
  | "approved"
  | "posted"
  | "rejected";

export type HookType = "controversial" | "question" | "story";

export type NotificationChannel = "slack" | "discord";

export interface Brand {
  id: string;
  name: string;
  description: string;
  target_audience: string;
  tone: string;
  key_messaging: string[];
  topics: string[];
  created_at: string;
  updated_at: string;
}

export interface Hook {
  type: HookType;
  text: string;
}

export interface VisualSuggestion {
  format: string;
  suggestion: string;
  carousel_outline?: string[];
}

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export interface ResearchInsight {
  insight: string;
  confidence: ConfidenceLevel;
  reasoning: string;
}

export interface ResearchStat {
  stat: string;
  source: string;
  confidence: ConfidenceLevel;
  cutoff_risk: boolean;
  url?: string; // present when sourced from a Tavily result
}

export interface ResearchQuote {
  quote: string;
  attribution: string;
  confidence: ConfidenceLevel;
  paraphrased: boolean;
  url?: string; // present when sourced from a Tavily result
}

export interface ResearchBrief {
  key_insights: ResearchInsight[];
  statistics: ResearchStat[];
  contrarian_angles: string[];
  quotes: ResearchQuote[];
  recommended_focus: string;
  knowledge_gaps: string[];
  // True when the brief was built from live web search results.
  // False when Tavily was unavailable and we fell back to training memory.
  live_data?: boolean;
  // List of source URLs that were available to the LLM during synthesis.
  // The writer is restricted to citing only these.
  source_urls?: string[];
}

export type StructureType =
  | "narrative"
  | "framework"
  | "contrarian_argument"
  | "case_study"
  | "myth_busting"
  | "before_after"
  | "list_insight";

export interface OutlineStep {
  role: string;       // hook | tension | insight | proof | brand_moment | cta etc.
  must_do: string;    // what this beat MUST accomplish
}

export interface ContentStrategy {
  chosen_angle: string;
  conventional_wisdom: string;       // what most people in the space believe
  scroll_stop_reason: string;        // why this audience stops for this angle today
  author_pov?: string;               // the author's stated view (if user supplied it)
  // Other framings the strategist considered but did not pick. Each is a
  // distinct conventional_wisdom statement the user could regenerate against.
  // Surfaced in the UI so users can see "why this angle and not that one"
  // and pick a different starting point in one click.
  alternative_framings?: AlternativeFraming[];
  outline: OutlineStep[];
  structure_type: StructureType;
  key_points: string[];
  supporting_data: string[];
  target_length: { min: number; max: number };
  hook_approach: HookType;
}

export interface AlternativeFraming {
  conventional_wisdom: string;       // a different framing of what the audience believes
  why_not_chosen: string;            // one sentence on why the strategist passed on this
}

export interface Post {
  id: string;
  brand_id: string;
  user_id: string;
  topic: string;
  goal: GoalType;
  status: PostStatus;
  research_brief: string | null;
  content_strategy: ContentStrategy | null;
  hooks: Hook[] | null;
  post_body: string | null;
  cta: string | null;
  hashtags: string[] | null;
  visual_suggestion: VisualSuggestion | null;
  editor_score: number | null;
  editor_feedback: string | null;
  performance_notes: string | null;
  created_at: string;
  updated_at: string;
  brand?: Brand;
}

export interface PostHistory {
  id: string;
  brand_id: string;
  hook_type: HookType;
  hook_text: string;
  angle: string;
  key_phrases: string[];
  cta_text: string;
  post_body_hash: string;
  created_at: string;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  channel: NotificationChannel;
  config: Record<string, string>;
  enabled: boolean;
}

// Pipeline types
export interface PipelineInput {
  topic: string;
  goal: GoalType;
  brand_id: string;
  // Optional: what most of the audience currently believes about this topic.
  // The strategist uses this to pick an angle that contradicts/complicates it.
  conventional_wisdom?: string;
  // Optional: the author's actual view about the topic. The post must arrive
  // at this view by the end. Strategist uses it as the destination, writer
  // treats it as a hard constraint.
  author_pov?: string;
  // Optional: user-supplied reference URLs. The research agent will fetch
  // these and include their content as authoritative sources alongside any
  // Tavily web search results. Cited URLs in the final brief are restricted
  // to this set + Tavily results.
  reference_urls?: string[];
}

export interface PipelineState {
  input: PipelineInput;
  brand: Brand;
  research_brief?: string;            // markdown-formatted, with confidence labels
  research_structured?: ResearchBrief; // parsed object for programmatic checks
  content_strategy?: ContentStrategy;
  hooks?: Hook[];
  post_body?: string;
  cta?: string;
  hashtags?: string[];
  visual_suggestion?: VisualSuggestion;
  editor_score?: number;
  editor_feedback?: string;
  // True when the editor force-approved a draft below threshold because the
  // revision budget ran out. Surface in UI as a warning badge.
  force_approved?: boolean;
  revision_count: number;
  status: "running" | "completed" | "failed";
  current_step: string;
  error?: string;
}

export interface PipelineProgress {
  step: string;
  status: "pending" | "running" | "completed" | "failed";
  message?: string;
}

export const GOAL_LABELS: Record<GoalType, string> = {
  thought_leadership: "Thought Leadership",
  product: "Product",
  educational: "Educational",
  personal_brand: "Personal Brand",
  interactive: "Interactive",
  inspirational: "Inspirational",
};

// Single source of truth for length per goal. Both the strategist's
// target_length and the editor's QUALITY_THRESHOLDS read from this.
export const LENGTH_BY_GOAL: Record<GoalType, { min: number; max: number }> = {
  thought_leadership: { min: 900, max: 1300 },
  product: { min: 600, max: 900 },
  educational: { min: 1000, max: 1500 },
  personal_brand: { min: 700, max: 1100 },
  interactive: { min: 400, max: 600 },
  inspirational: { min: 500, max: 800 },
};

// Permitted structure types per goal. Strategist must pick from this list.
export const STRUCTURE_TYPES_BY_GOAL: Record<GoalType, StructureType[]> = {
  thought_leadership: ["contrarian_argument", "myth_busting", "before_after"],
  product: ["case_study", "before_after", "framework"],
  educational: ["framework", "list_insight", "myth_busting"],
  personal_brand: ["narrative", "before_after"],
  interactive: ["contrarian_argument", "myth_busting"],
  inspirational: ["narrative", "before_after"],
};

// Brand → CSS color variable map. Falls back to cream for any unknown brand
// (including the seeded "Generic" profile). Single source of truth — adding a
// new brand only requires one line here, not 6 file edits.
export const BRAND_COLORS: Record<string, string> = {
  Logrite: "var(--color-mint)",
  Deployd: "var(--color-rose)",
};

export const DEFAULT_BRAND_COLOR = "var(--color-cream)";

export function getBrandColor(brandName: string | undefined | null): string {
  if (!brandName) return DEFAULT_BRAND_COLOR;
  return BRAND_COLORS[brandName] ?? DEFAULT_BRAND_COLOR;
}

export const QUALITY_THRESHOLDS: Record<
  GoalType,
  { min_chars: number; max_chars: number; min_line_breaks: number; min_score: number }
> = {
  thought_leadership: { min_chars: LENGTH_BY_GOAL.thought_leadership.min, max_chars: LENGTH_BY_GOAL.thought_leadership.max, min_line_breaks: 4, min_score: 75 },
  product: { min_chars: LENGTH_BY_GOAL.product.min, max_chars: LENGTH_BY_GOAL.product.max, min_line_breaks: 3, min_score: 70 },
  educational: { min_chars: LENGTH_BY_GOAL.educational.min, max_chars: LENGTH_BY_GOAL.educational.max, min_line_breaks: 3, min_score: 75 },
  personal_brand: { min_chars: LENGTH_BY_GOAL.personal_brand.min, max_chars: LENGTH_BY_GOAL.personal_brand.max, min_line_breaks: 3, min_score: 65 },
  interactive: { min_chars: LENGTH_BY_GOAL.interactive.min, max_chars: LENGTH_BY_GOAL.interactive.max, min_line_breaks: 2, min_score: 65 },
  inspirational: { min_chars: LENGTH_BY_GOAL.inspirational.min, max_chars: LENGTH_BY_GOAL.inspirational.max, min_line_breaks: 3, min_score: 70 },
};
