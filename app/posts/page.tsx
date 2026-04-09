"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Post, Brand } from "@/lib/types";
import { getBrandColor } from "@/lib/types";

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filterBrand, setFilterBrand] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/brands").then((r) => r.json()).then((d) => setBrands(d.brands || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    setSelected(new Set());
    const params = new URLSearchParams();
    if (filterBrand) params.set("brand_id", filterBrand);
    if (filterStatus) params.set("status", filterStatus);
    params.set("limit", "100");
    fetch(`/api/posts?${params}`)
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []))
      .finally(() => setLoading(false));
  }, [filterBrand, filterStatus]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === posts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(posts.map((p) => p.id)));
    }
  }

  async function deleteSelected() {
    if (!confirm(`Delete ${selected.size} post${selected.size > 1 ? "s" : ""}? This cannot be undone.`)) return;
    setDeleting(true);
    await Promise.all(
      [...selected].map((id) => fetch(`/api/posts?id=${id}`, { method: "DELETE" }))
    );
    setPosts((prev) => prev.filter((p) => !selected.has(p.id)));
    setSelected(new Set());
    setDeleting(false);
  }

  return (
    <div className="h-screen flex flex-col animate-fade-in">
      {/* Header */}
      <header className="px-10 py-5 border-b border-[var(--color-border)] flex items-baseline justify-between">
        <div className="flex items-baseline gap-4">
          <h1 className="font-display text-[26px] leading-none tracking-[-0.02em] text-[var(--color-ink)]">
            Archive<span className="text-[var(--color-accent)]">.</span>
          </h1>
          <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)]">Posts</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] tabular">
          {posts.length.toString().padStart(3, "0")} total
        </span>
      </header>

      {/* Filters */}
      <section className="px-10 py-3 border-b border-[var(--color-border)] flex items-center gap-6">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">Brand</span>
          <select
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
            className="bg-transparent text-[12px] text-[var(--color-ink)] border-b border-[var(--color-border-strong)] hover:border-[var(--color-ink-mute)] focus:border-[var(--color-accent)] py-0.5 pr-4 cursor-pointer"
          >
            <option value="">All</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">Status</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-transparent text-[12px] text-[var(--color-ink)] border-b border-[var(--color-border-strong)] hover:border-[var(--color-ink-mute)] focus:border-[var(--color-accent)] py-0.5 pr-4 cursor-pointer"
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="review">In Review</option>
            <option value="approved">Approved</option>
            <option value="posted">Shipped</option>
            <option value="rejected">Killed</option>
          </select>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {selected.size > 0 && (
            <button
              onClick={deleteSelected}
              disabled={deleting}
              className="px-4 py-2 border border-[var(--color-red)]/50 text-[var(--color-red)] hover:bg-[var(--color-red)]/10 text-[10px] uppercase tracking-[0.15em] transition-colors"
            >
              {deleting ? "Deleting…" : `Delete ${selected.size}`}
            </button>
          )}
          <Link
            href="/generate"
            className="px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-bg)] text-[10px] uppercase tracking-[0.15em] font-medium transition-colors"
          >
            + New post
          </Link>
        </div>
      </section>

      {/* List */}
      <section className="flex-1 overflow-y-auto px-10">
        {loading ? (
          <div className="space-y-px py-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 skeleton" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-display text-[24px] text-[var(--color-ink-mute)] italic">The archive is empty.</p>
          </div>
        ) : (
          <div>
            {/* Select all row */}
            <div className="flex items-center gap-4 py-2 border-b border-[var(--color-border)] -mx-10 px-10">
              <input
                type="checkbox"
                checked={selected.size === posts.length && posts.length > 0}
                onChange={toggleSelectAll}
                className="accent-[var(--color-accent)] w-3.5 h-3.5 cursor-pointer"
              />
              <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
                {selected.size > 0 ? `${selected.size} selected` : "Select all"}
              </span>
            </div>
            {posts.map((post, i) => (
              <PostRow
                key={post.id}
                post={post}
                index={i + 1}
                selected={selected.has(post.id)}
                onToggle={() => toggleSelect(post.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PostRow({
  post,
  index,
  selected,
  onToggle,
}: {
  post: Post;
  index: number;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`group flex items-center gap-4 py-4 border-b border-[var(--color-border)] -mx-10 px-10 transition-colors ${selected ? "bg-[var(--color-bg-raised)]" : "hover:bg-[var(--color-bg-raised)]"}`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        className="accent-[var(--color-accent)] w-3.5 h-3.5 cursor-pointer shrink-0"
      />
      <Link href={`/posts/${post.id}`} className="flex items-baseline gap-6 flex-1 min-w-0">
        <span className="text-[10px] tabular text-[var(--color-ink-faint)] w-6">
          {index.toString().padStart(2, "0")}
        </span>
        <span
          className="text-[10px] uppercase tracking-[0.15em] w-20 shrink-0"
          style={{ color: getBrandColor(post.brand?.name) }}
        >
          {post.brand?.name}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display text-[15px] text-[var(--color-ink)] truncate group-hover:text-[var(--color-accent)] transition-colors">
            {post.topic}
          </p>
          <div className="text-[10px] text-[var(--color-ink-mute)] mt-0.5 uppercase tracking-[0.1em]">
            {post.goal.replace("_", " ")} · {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
        </div>
        <StatusPill status={post.status} />
        {post.editor_score && (
          <span className="font-display text-[14px] tabular text-[var(--color-ink-mute)] w-8 text-right">
            {post.editor_score}
          </span>
        )}
        <span className="text-[var(--color-ink-faint)] group-hover:text-[var(--color-accent)] group-hover:translate-x-1 transition-all">→</span>
      </Link>
    </div>
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
    <span className="text-[10px] uppercase tracking-[0.2em] w-20 text-right" style={{ color }}>
      · {label}
    </span>
  );
}
