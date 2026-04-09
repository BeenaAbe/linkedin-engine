import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);

  // Single-post fetch by id — used by the post detail page so we don't have
  // to load and scan the whole archive.
  const id = searchParams.get("id");
  if (id) {
    const { data, error } = await supabase
      .from("posts")
      .select("*, brand:brands(id, name)")
      .eq("id", id)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ post: data });
  }

  const brandId = searchParams.get("brand_id");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = supabase
    .from("posts")
    .select("*, brand:brands(id, name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (brandId) query = query.eq("brand_id", brandId);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: data, total: count });
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Post ID required" }, { status: 400 });
  }

  const { error } = await supabase.from("posts").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Post ID required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ post: data });
}
