import type { Post, Brand } from "@/lib/types";

export async function sendTeamsNotification(
  post: Post,
  brand: Brand,
  appUrl: string
): Promise<boolean> {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("Teams not configured — missing webhook URL");
    return false;
  }

  const hooks = (post.hooks || [])
    .map((h, i) => `${i + 1}. [${h.type}] ${h.text}`)
    .join("\n\n");

  const payload = {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: [
            {
              type: "TextBlock",
              text: `📝 New ${brand.name} LinkedIn Draft`,
              weight: "Bolder",
              size: "Large",
            },
            {
              type: "FactSet",
              facts: [
                { title: "Topic", value: post.topic },
                { title: "Goal", value: post.goal.replace("_", " ") },
                { title: "Score", value: `${post.editor_score}/100` },
              ],
            },
            {
              type: "TextBlock",
              text: "**Hook Options:**",
              weight: "Bolder",
            },
            {
              type: "TextBlock",
              text: hooks,
              wrap: true,
            },
            {
              type: "TextBlock",
              text: (post.post_body || "").slice(0, 400),
              wrap: true,
            },
          ],
          actions: [
            {
              type: "Action.OpenUrl",
              title: "Review Post",
              url: `${appUrl}/posts/${post.id}`,
            },
          ],
        },
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
