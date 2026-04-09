import { createServerClient } from "@/lib/supabase";
import type { Post, Brand, NotificationChannel } from "@/lib/types";

interface ChannelResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
}

function buildMessage(post: Post, brand: Brand): string {
  const score = post.editor_score ? `Score: ${post.editor_score}` : "";
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/posts/${post.id}`;
  return [
    `📝 New LinkedIn draft ready for review`,
    ``,
    `Brand: ${brand.name}`,
    `Topic: ${post.topic}`,
    `Goal: ${post.goal.replace("_", " ")}`,
    score,
    ``,
    `Review → ${url}`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}

async function sendSlack(webhookUrl: string, text: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Slack webhook failed: ${res.status}`);
}

async function sendDiscord(webhookUrl: string, text: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text }),
  });
  if (!res.ok) throw new Error(`Discord webhook failed: ${res.status}`);
}


export async function sendNotifications(
  post: Post,
  brand: Brand,
  userId: string
): Promise<ChannelResult[]> {
  const supabase = createServerClient();

  const { data: settings } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("user_id", userId)
    .eq("enabled", true);

  if (!settings || settings.length === 0) return [];

  const message = buildMessage(post, brand);
  const results: ChannelResult[] = [];

  for (const setting of settings) {
    const channel = setting.channel as NotificationChannel;
    try {
      if (channel === "slack") {
        await sendSlack(setting.config.webhook_url, message);
      } else if (channel === "discord") {
        await sendDiscord(setting.config.webhook_url, message);
      }
      results.push({ channel, success: true });
    } catch (err) {
      results.push({
        channel,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}
