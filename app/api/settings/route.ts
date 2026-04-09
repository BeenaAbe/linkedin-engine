import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getSessionUser } from "@/lib/supabase-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("user_id", user.id);

  return NextResponse.json({ settings: data || [] });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channel, enabled, config } = await request.json();

  const supabase = createServerClient();

  // Delete + insert to avoid upsert constraint issues
  await supabase
    .from("notification_settings")
    .delete()
    .eq("user_id", user.id)
    .eq("channel", channel);

  const { error } = await supabase
    .from("notification_settings")
    .insert({ user_id: user.id, channel, enabled, config });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
