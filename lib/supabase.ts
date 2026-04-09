import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Client-side Supabase client (lazy init to avoid build errors)
let _supabase: SupabaseClient | null = null;
export function getSupabase() {
  if (!_supabase && supabaseUrl && supabaseAnonKey) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase!;
}

// Server-side Supabase client with service role key (for API routes)
export function createServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase environment variables not configured");
  }
  return createClient(supabaseUrl, serviceRoleKey);
}
