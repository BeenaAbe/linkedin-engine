"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

const AuthContext = createContext<{ userId: string | null }>({ userId: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();

    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      setUserId(session?.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ userId }}>{children}</AuthContext.Provider>
  );
}

export function useUserId() {
  return useContext(AuthContext).userId;
}
