// Server-side Supabase client that reads the user's session from cookies.
// Used in API routes to get the authenticated user. Does NOT use the service
// role key — use createServerClient() from lib/supabase.ts for DB writes.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getSessionUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Route handlers can't set cookies — safe to ignore
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
