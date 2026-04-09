"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-10">
          <h1 className="font-display text-[36px] leading-none tracking-[-0.02em] text-[var(--color-ink)]">
            LinkedIn Engine<span className="text-[var(--color-accent)]">.</span>
          </h1>
          <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mt-2">
            LinkedIn Content for Logrite & Deployd
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="p-4 border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5">
              <p className="text-[13px] text-[var(--color-ink-dim)] leading-relaxed">
                Check your inbox — a sign-in link is on its way to{" "}
                <span className="text-[var(--color-ink)]">{email}</span>.
              </p>
            </div>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-mute)] hover:text-[var(--color-ink)] transition-colors"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] block mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className="w-full bg-[var(--color-bg-raised)] border border-[var(--color-border-strong)] focus:border-[var(--color-accent)] px-4 py-3 text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none transition-colors"
              />
            </div>

            {error && (
              <p className="text-[11px] text-[var(--color-red)]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full px-6 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--color-bg)] text-[11px] uppercase tracking-[0.2em] font-medium transition-colors"
            >
              {loading ? "Sending…" : "Send sign-in link →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
