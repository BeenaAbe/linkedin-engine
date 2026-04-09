import type { Post, Brand } from "@/lib/types";

export async function sendWhatsAppNotification(
  post: Post,
  brand: Brand,
  appUrl: string
): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = process.env.WHATSAPP_TO;

  if (!accountSid || !authToken || !from || !to) {
    console.warn("WhatsApp not configured — missing Twilio credentials");
    return false;
  }

  const hooks = (post.hooks || [])
    .map((h, i) => `${i + 1}. [${h.type}] ${h.text}`)
    .join("\n");

  const message = `📝 *New ${brand.name} LinkedIn Draft*

*Topic:* ${post.topic}
*Goal:* ${post.goal.replace("_", " ")}
*Score:* ${post.editor_score}/100

*Hook Options:*
${hooks}

*Post Preview:*
${(post.post_body || "").slice(0, 500)}${(post.post_body || "").length > 500 ? "..." : ""}

*CTA:* ${post.cta}
*Hashtags:* ${(post.hashtags || []).join(" ")}

👉 Review: ${appUrl}/posts/${post.id}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({ From: from, To: to, Body: message });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  return response.ok;
}
