"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Post, Brand } from "@/lib/types";
import { getBrandColor } from "@/lib/types";

export default function Dashboard() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState({ total: 0, drafts: 0, approved: 0 });

  useEffect(() => {
    fetch("/api/brands").then((r) => r.json()).then((d) => setBrands(d.brands || []));
    fetch("/api/posts?limit=6").then((r) => r.json()).then((d) => {
      const posts = d.posts || [];
      setRecentPosts(posts);
      setStats({
        total: d.total || 0,
        drafts: posts.filter((p: Post) => p.status === "draft" || p.status === "review").length,
        approved: posts.filter((p: Post) => p.status === "approved" || p.status === "posted").length,
      });
    });
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="h-screen flex flex-col animate-fade-in">
      {/* Compact header */}
      <header className="px-10 py-5 border-b border-[var(--color-border)] flex items-baseline justify-between">
        <div className="flex items-baseline gap-4">
          <h1 className="font-display text-[26px] leading-none tracking-[-0.02em] text-[var(--color-ink)]">
            Overview<span className="text-[var(--color-accent)]">.</span>
          </h1>
          <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)]">Dashboard</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] tabular">{today}</span>
      </header>

      {/* Stats row */}
      <section className="px-10 py-6 border-b border-[var(--color-border)] grid grid-cols-3 gap-10">
        <BigStat label="Total posts" value={stats.total} />
        <BigStat label="Pending review" value={stats.drafts} accent="amber" />
        <BigStat label="Approved & shipped" value={stats.approved} accent="mint" />
      </section>

      {/* Body — two columns */}
      <div className="flex-1 grid grid-cols-2 min-h-0">
        {/* LEFT: Brands */}
        <section className="border-r border-[var(--color-border)] p-8 overflow-y-auto">
          <div className="flex items-baseline justify-between mb-5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)]">Brands</div>
            <Link href="/brands" className="text-[10px] text-[var(--color-ink-mute)] hover:text-[var(--color-accent)] uppercase tracking-[0.15em]">
              Edit →
            </Link>
          </div>
          <div className="space-y-4">
            {brands.map((brand) => (
              <BrandPanel key={brand.id} brand={brand} />
            ))}
          </div>
        </section>

        {/* RIGHT: Recent posts */}
        <section className="p-8 overflow-y-auto">
          <div className="flex items-baseline justify-between mb-5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)]">Latest posts</div>
            <div className="flex gap-3">
              <Link
                href="/generate"
                className="px-3 py-1.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-bg)] text-[10px] uppercase tracking-[0.15em] font-medium transition-colors"
              >
                + New
              </Link>
              <Link href="/posts" className="text-[10px] text-[var(--color-ink-mute)] hover:text-[var(--color-accent)] uppercase tracking-[0.15em] self-center">
                All →
              </Link>
            </div>
          </div>

          {recentPosts.length === 0 ? (
            <div className="border border-dashed border-[var(--color-border-strong)] py-12 text-center">
              <p className="font-display text-[18px] text-[var(--color-ink-mute)] italic">The page is blank.</p>
            </div>
          ) : (
            <div className="space-y-px">
              {recentPosts.map((post, i) => (
                <PostRow key={post.id} post={post} index={i + 1} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function BigStat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  const colorMap: Record<string, string> = {
    amber: "var(--color-amber)",
    mint: "var(--color-mint)",
  };
  const color = accent ? colorMap[accent] : "var(--color-ink)";
  return (
    <div>
      <div className="font-display text-[44px] leading-none tabular tracking-[-0.02em]" style={{ color }}>
        {value.toString().padStart(2, "0")}
      </div>
      <div className="mt-1.5 text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-mute)]">
        {label}
      </div>
    </div>
  );
}

function BrandPanel({ brand }: { brand: Brand }) {
  const accentVar = getBrandColor(brand.name);

  return (
    <Link
      href="/generate"
      className="group block p-5 border border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-raised)] transition-colors"
    >
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-display text-[24px] leading-none text-[var(--color-ink)] tracking-[-0.02em]">
          {brand.name}
        </h3>
        <span className="text-[10px] uppercase tracking-[0.2em] tabular" style={{ color: accentVar }}>
          {brand.topics.length} topics
        </span>
      </div>
      <p className="text-[12px] text-[var(--color-ink-dim)] leading-relaxed line-clamp-2">
        {brand.description}
      </p>
      <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-mute)]">Begin a draft</span>
        <span className="group-hover:translate-x-1 transition-transform" style={{ color: accentVar }}>→</span>
      </div>
    </Link>
  );
}

function PostRow({ post, index }: { post: Post; index: number }) {
  return (
    <Link
      href={`/posts/${post.id}`}
      className="group flex items-baseline gap-4 py-3 border-b border-[var(--color-border)] hover:bg-[var(--color-bg-raised)] -mx-2 px-2 transition-colors"
    >
      <span className="text-[10px] tabular text-[var(--color-ink-faint)] w-6">
        {index.toString().padStart(2, "0")}
      </span>
      <span
        className="text-[10px] uppercase tracking-[0.15em] w-16 shrink-0"
        style={{ color: getBrandColor(post.brand?.name) }}
      >
        {post.brand?.name}
      </span>
      <p className="font-display text-[14px] text-[var(--color-ink)] truncate flex-1 group-hover:text-[var(--color-accent)] transition-colors">
        {post.topic}
      </p>
      <StatusPill status={post.status} />
      {post.editor_score && (
        <span className="text-[12px] tabular text-[var(--color-ink-mute)] w-8 text-right">{post.editor_score}</span>
      )}
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    draft: { label: "Draft", color: "var(--color-ink-mute)" },
    review: { label: "Review", color: "var(--color-amber)" },
    approved: { label: "Approved", color: "var(--color-mint)" },
    posted: { label: "Shipped", color: "var(--color-accent)" },
    rejected: { label: "Killed", color: "var(--color-red)" },
  };
  const { label, color } = map[status] || map.draft;
  return (
    <span className="text-[9px] uppercase tracking-[0.2em] w-16 text-right" style={{ color }}>
      · {label}
    </span>
  );
}
