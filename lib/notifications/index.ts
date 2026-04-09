import { createServerClient } from "@/lib/supabase";
import { sendWhatsAppNotification } from "./whatsapp";
import { sendSlackNotification } from "./slack";
import { sendTeamsNotification } from "./teams";
import type { Post, Brand } from "@/lib/types";

export async function sendNotifications(
  post: Post,
  brand: Brand,
  userId: string
): Promise<{ channel: string; success: boolean }[]> {
  const supabase = createServerClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { data: settings } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("user_id", userId)
    .eq("enabled", true);

  if (!settings || settings.length === 0) return [];

  const results: { channel: string; success: boolean }[] = [];

  for (const setting of settings) {
    let success = false;
    switch (setting.channel) {
      case "whatsapp":
        success = await sendWhatsAppNotification(post, brand, appUrl);
        break;
      case "slack":
        success = await sendSlackNotification(post, brand, appUrl);
        break;
      case "teams":
        success = await sendTeamsNotification(post, brand, appUrl);
        break;
    }
    results.push({ channel: setting.channel, success });
  }

  return results;
}
