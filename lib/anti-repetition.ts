import { createServerClient } from "@/lib/supabase";
import crypto from "crypto";

export async function getAvoidanceContext(brandId: string): Promise<string> {
  const supabase = createServerClient();

  const { data: history } = await supabase
    .from("post_history")
    .select("hook_type, hook_text, angle, cta_text")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });

  if (!history || history.length === 0) return "";

  // If under 100 entries, pass raw hooks
  if (history.length < 100) {
    const hookList = history
      .map((h) => `- [${h.hook_type}] "${h.hook_text}"`)
      .join("\n");
    const angleList = [...new Set(history.map((h) => h.angle))]
      .map((a) => `- ${a}`)
      .join("\n");
    const ctaList = [...new Set(history.map((h) => h.cta_text).filter(Boolean))]
      .map((c) => `- ${c}`)
      .join("\n");

    return `PREVIOUSLY USED HOOKS (${history.length} total):\n${hookList}\n\nPREVIOUSLY USED ANGLES:\n${angleList}\n\nPREVIOUSLY USED CTAs:\n${ctaList}`;
  }

  // If 100+ entries, summarize into patterns
  const hookTypeCounts: Record<string, number> = {};
  const openerPatterns: Record<string, number> = {};

  for (const h of history) {
    hookTypeCounts[h.hook_type] = (hookTypeCounts[h.hook_type] || 0) + 1;

    // Extract first 3 words as opener pattern
    const opener = h.hook_text.split(" ").slice(0, 3).join(" ").toLowerCase();
    openerPatterns[opener] = (openerPatterns[opener] || 0) + 1;
  }

  // Find most overused patterns
  const overusedOpeners = Object.entries(openerPatterns)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([opener, count]) => `"${opener}..." (used ${count} times)`)
    .join("\n- ");

  const recentHooks = history.slice(0, 30).map((h) => `- "${h.hook_text}"`).join("\n");

  const uniqueAngles = [...new Set(history.map((h) => h.angle))];
  const recentAngles = uniqueAngles.slice(0, 20).map((a) => `- ${a}`).join("\n");

  return `PATTERN AVOIDANCE (${history.length} posts analyzed):

OVERUSED OPENERS — DO NOT START WITH:
- ${overusedOpeners}

RECENT HOOKS (last 30) — DO NOT REPEAT:
${recentHooks}

ANGLES ALREADY COVERED:
${recentAngles}

Generate something FRESH and DIFFERENT from all patterns above.`;
}

export async function recordPostHistory(
  brandId: string,
  hooks: Array<{ type: string; text: string }>,
  angle: string,
  ctaText: string,
  postBody: string
): Promise<void> {
  const supabase = createServerClient();
  const bodyHash = crypto.createHash("md5").update(postBody).digest("hex");

  // Extract key phrases (simple approach: sentences with data)
  const keyPhrases = postBody
    .split(/[.!?\n]/)
    .filter((s) => /\d/.test(s) && s.trim().length > 20)
    .map((s) => s.trim())
    .slice(0, 5);

  const records = hooks.map((hook) => ({
    brand_id: brandId,
    hook_type: hook.type,
    hook_text: hook.text,
    angle,
    key_phrases: keyPhrases,
    cta_text: ctaText,
    post_body_hash: bodyHash,
  }));

  await supabase.from("post_history").insert(records);
}
