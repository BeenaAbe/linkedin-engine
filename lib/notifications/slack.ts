import type { Post, Brand } from "@/lib/types";

export async function sendSlackNotification(
  post: Post,
  brand: Brand,
  appUrl: string
): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("Slack not configured — missing webhook URL");
    return false;
  }

  const hooks = (post.hooks || [])
    .map((h, i) => `${i + 1}. [${h.type}] ${h.text}`)
    .join("\n");

  const payload = {
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `📝 New ${brand.name} LinkedIn Draft` },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Topic:*\n${post.topic}` },
          { type: "mrkdwn", text: `*Goal:*\n${post.goal.replace("_", " ")}` },
          { type: "mrkdwn", text: `*Score:*\n${post.editor_score}/100` },
        ],
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*Hook Options:*\n${hooks}` },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Post Preview:*\n${(post.post_body || "").slice(0, 500)}`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Review Post" },
            url: `${appUrl}/posts/${post.id}`,
          },
        ],
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return response.ok;
}
