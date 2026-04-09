"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-browser";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", index: "01" },
  { href: "/generate", label: "Generate", index: "02" },
  { href: "/posts", label: "Posts", index: "03" },
  { href: "/brands", label: "Brands", index: "04" },
  { href: "/settings", label: "Settings", index: "05" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await getBrowserSupabase().auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-[var(--color-bg)] border-r border-[var(--color-border)] flex flex-col z-50">
      {/* Wordmark */}
      <div className="px-8 pt-10 pb-8">
        <Link href="/" className="block group">
          <div className="font-display text-[22px] leading-none text-[var(--color-ink)] tracking-tight">
            LinkedIn Engine<span className="text-[var(--color-accent)]">.</span>
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-mute)]">
            LinkedIn Content for Logrite & Deployd
          </div>
        </Link>
      </div>

      <hr className="rule mx-8" />

      {/* Navigation */}
      <nav className="flex-1 px-8 py-8">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)] mb-4">
          Sections
        </div>
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ href, label, index }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-baseline gap-4 py-2.5 group transition-colors ${
                    isActive ? "text-[var(--color-ink)]" : "text-[var(--color-ink-mute)] hover:text-[var(--color-ink-dim)]"
                  }`}
                >
                  <span className={`text-[10px] tabular ${isActive ? "text-[var(--color-accent)]" : "text-[var(--color-ink-faint)]"}`}>
                    {index}
                  </span>
                  <span className={`text-[15px] transition-all ${isActive ? "font-medium" : ""}`}>
                    {label}
                  </span>
                  {isActive && (
                    <span className="ml-auto text-[var(--color-accent)] text-sm">→</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer status */}
      <div className="px-8 py-6 border-t border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              Engine
            </div>
            <div className="text-[12px] text-[var(--color-ink-dim)] mt-1 tabular">
              GPT-OSS 120B
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-mint)]" />
            <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-ink-mute)]">Live</span>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)] hover:text-[var(--color-red)] transition-colors"
        >
          Sign out →
        </button>
      </div>
    </aside>
  );
}
