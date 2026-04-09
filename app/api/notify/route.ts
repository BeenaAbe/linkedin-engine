import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getSessionUser } from "@/lib/supabase-session";
import { sendNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user.id;

  const supabase = createServerClient();
  const { post_id } = await request.json();

  if (!post_id) {
    return NextResponse.json({ error: "post_id required" }, { status: 400 });
  }

  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", post_id)
    .single();

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("*")
    .eq("id", post.brand_id)
    .single();

  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  // Update status to review
  await supabase.from("posts").update({ status: "review" }).eq("id", post_id);

  const results = await sendNotifications(post, brand, userId);

  return NextResponse.json({ results });
}
