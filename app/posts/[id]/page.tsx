"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Post, Hook } from "@/lib/types";
import { getBrandColor } from "@/lib/types";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState(false);
  const [editedBody, setEditedBody] = useState("");
  const [performanceNotes, setPerformanceNotes] = useState("");
  const [sendingReview, setSendingReview] = useState(false);

  useEffect(() => {
    fetch(`/api/posts?id=${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.post) {
          setPost(d.post);
          setEditedBody(d.post.post_body || "");
          setPerformanceNotes(d.post.performance_notes || "");
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  async function updateStatus(status: string) {
    if (!post) return;
    setUpdating(true);
    const res = await fetch("/api/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.id, status }),
    });
    if (res.ok) setPost({ ...post, status: status as Post["status"] });
    setUpdating(false);
  }

  async function saveEdits() {
    if (!post) return;
    setUpdating(true);
    const res = await fetch("/api/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: post.id,
        post_body: editedBody,
        performance_notes: performanceNotes,
      }),
    });
    if (res.ok) {
      setPost({ ...post, post_body: editedBody, performance_notes: performanceNotes });
      setEditingBody(false);
    }
    setUpdating(false);
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  }

  async function deletePost() {
    if (!post) return;
    if (!confirm("Delete this post? This cannot be undone.")) return;
    await fetch(`/api/posts?id=${post.id}`, { method: "DELETE" });
    router.push("/posts");
  }

  async function sendForReview() {
    if (!post) return;
    setSendingReview(true);
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: post.id }),
    });
    setPost({ ...post, status: "review" });
    setSendingReview(false);
  }

  function copyFullPost(hookIndex: number) {
    if (!post) return;
    const hooks = (post.hooks || []) as Hook[];
    const hook = hooks[hookIndex];
    const fullPost = `${hook.text}\n\n${post.post_body}\n\n${post.cta}\n\n${(post.hashtags || []).join(" ")}`;
    copy(fullPost, `full-${hookIndex}`);
  }

  if (loading) {
    return (
      <div className="px-12 pt-16">
        <div className="h-12 w-64 skeleton mb-8" />
        <div className="h-64 skeleton" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="px-12 py-32 text-center">
        <p className="font-display text-[20px] text-[var(--color-ink-mute)] italic">
          Post not found.
        </p>
      </div>
    );
  }

  const hooks = (post.hooks || []) as Hook[];
  const brandColor = getBrandColor(post.brand?.name);

  return (
    <div className="animate-fade-in h-screen overflow-y-auto">
      {/* Header */}
      <header className="px-12 pt-12 pb-10 border-b border-[var(--color-border)]">
        <button
          onClick={() => router.back()}
          className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-mute)] hover:text-[var(--color-accent)] mb-6 transition-colors"
        >
          ← Back to archive
        </button>

        <div className="flex items-baseline justify-between mb-6">
          <span
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ color: brandColor }}
          >
            {post.brand?.name} · {post.goal.replace("_", " ")}
          </span>
          <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] tabular">
            {new Date(post.created_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>

        <h1 className="font-display text-[36px] leading-[1] tracking-[-0.03em] text-[var(--color-ink)] max-w-4xl">
          {post.topic}
        </h1>

        <div className="mt-10 flex items-baseline gap-12">
          {post.editor_score && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)]">
                Score
              </div>
              <div className={`font-display text-[20px] leading-none tabular mt-1 ${
                post.editor_score >= 75 ? "text-[var(--color-mint)]"
                  : post.editor_score >= 60 ? "text-[var(--color-amber)]"
                  : "text-[var(--color-red)]"
              }`}>
                {post.editor_score}
              </div>
            </div>
          )}
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)]">
              Status
            </div>
            <StatusPill status={post.status} />
          </div>
        </div>
      </header>

      {/* Actions */}
      <section className="px-12 py-6 border-b border-[var(--color-border)] flex gap-3">
        {(post.status === "draft" || post.status === "review") && (
          <button
            onClick={sendForReview}
            disabled={sendingReview}
            className="px-6 py-3 border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-bg)] text-[11px] uppercase tracking-[0.2em] font-medium transition-colors"
          >
            {sendingReview ? "Sending…" : "Send for review →"}
          </button>
        )}
        {(post.status === "draft" || post.status === "review") && (
          <>
            <button
              onClick={() => updateStatus("approved")}
              disabled={updating}
              className="px-6 py-3 bg-[var(--color-mint)] hover:bg-[var(--color-mint)]/80 text-[var(--color-bg)] text-[11px] uppercase tracking-[0.2em] font-medium transition-colors"
            >
              Approve →
            </button>
            <button
              onClick={() => updateStatus("rejected")}
              disabled={updating}
              className="px-6 py-3 border border-[var(--color-border-strong)] text-[var(--color-ink-mute)] hover:text-[var(--color-red)] hover:border-[var(--color-red)] text-[11px] uppercase tracking-[0.2em] transition-colors"
            >
              Kill
            </button>
          </>
        )}
        {post.status === "approved" && (
          <button
            onClick={() => updateStatus("posted")}
            disabled={updating}
            className="px-6 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-bg)] text-[11px] uppercase tracking-[0.2em] font-medium transition-colors"
          >
            Mark as shipped →
          </button>
        )}
        <button
          onClick={deletePost}
          className="ml-auto px-6 py-3 border border-[var(--color-border-strong)] text-[var(--color-ink-faint)] hover:text-[var(--color-red)] hover:border-[var(--color-red)] text-[11px] uppercase tracking-[0.2em] transition-colors"
        >
          Delete
        </button>
      </section>

      {/* Hooks */}
      <section className="px-12 py-12 border-b border-[var(--color-border)]">
        <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-8">
          Hook options
        </div>
        <div className="space-y-12">
          {hooks.map((hook, i) => (
            <div key={i}>
              <div className="flex items-baseline justify-between mb-4">
                <div className="flex items-baseline gap-4">
                  <span className="font-display text-[20px] tabular text-[var(--color-accent)]">
                    {(i + 1).toString().padStart(2, "0")}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-mute)]">
                    {hook.type}
                  </span>
                </div>
                <div className="flex gap-6">
                  <button
                    onClick={() => copy(hook.text, `hook-${i}`)}
                    className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-mute)] hover:text-[var(--color-accent)] transition-colors"
                  >
                    {copiedKey === `hook-${i}` ? "Copied ✓" : "Copy hook"}
                  </button>
                  <button
                    onClick={() => copyFullPost(i)}
                    className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-mute)] hover:text-[var(--color-accent)] transition-colors"
                  >
                    {copiedKey === `full-${i}` ? "Copied ✓" : "Copy full →"}
                  </button>
                </div>
              </div>
              <p className="font-display text-[20px] leading-tight text-[var(--color-ink)] tracking-[-0.01em] max-w-3xl">
                {hook.text}
              </p>
              {i < hooks.length - 1 && <hr className="rule mt-8" />}
            </div>
          ))}
        </div>
      </section>

      {/* Body */}
      <section className="px-12 py-12 border-b border-[var(--color-border)]">
        <div className="flex items-baseline justify-between mb-8 max-w-3xl">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)]">
            The body
          </div>
          <div className="flex gap-6">
            {!editingBody && (
              <button
                onClick={() => setEditingBody(true)}
                className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-mute)] hover:text-[var(--color-accent)] transition-colors"
              >
                Edit
              </button>
            )}
            <button
              onClick={() => copy(post.post_body || "", "body")}
              className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-mute)] hover:text-[var(--color-accent)] transition-colors"
            >
              {copiedKey === "body" ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>

        {editingBody ? (
          <div className="max-w-3xl">
            <textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              rows={16}
              className="w-full bg-[var(--color-bg-raised)] border border-[var(--color-border-strong)] focus:border-[var(--color-accent)] p-6 font-display text-[18px] leading-[1.6] text-[var(--color-ink)] resize-y"
            />
            <div className="flex items-center justify-between mt-4">
              <span className="text-[11px] tabular text-[var(--color-ink-mute)]">{editedBody.length} chars</span>
              <div className="flex gap-3">
                <button
                  onClick={() => { setEditingBody(false); setEditedBody(post.post_body || ""); }}
                  className="px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-mute)]"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdits}
                  disabled={updating}
                  className="px-5 py-2 bg-[var(--color-accent)] text-[var(--color-bg)] text-[11px] uppercase tracking-[0.2em] font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <article className="font-display text-[16px] leading-[1.7] text-[var(--color-ink)] whitespace-pre-line tracking-[-0.005em] max-w-3xl">
            {post.post_body}
          </article>
        )}

        <div className="mt-10 max-w-3xl space-y-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-2">
              Call to action
            </div>
            <div className="text-[15px] text-[var(--color-ink-dim)] italic">{post.cta}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-2">
              Tags
            </div>
            <div className="flex gap-3 flex-wrap">
              {(post.hashtags || []).map((tag) => (
                <span key={tag} className="text-[13px] text-[var(--color-accent)]">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Performance Notes */}
      <section className="px-12 py-12">
        <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-4">
          Performance notes
        </div>
        <textarea
          value={performanceNotes}
          onChange={(e) => setPerformanceNotes(e.target.value)}
          placeholder="Log how this post performed after publishing..."
          rows={4}
          className="w-full max-w-3xl bg-[var(--color-bg-raised)] border border-[var(--color-border-strong)] focus:border-[var(--color-accent)] p-5 text-[14px] text-[var(--color-ink-dim)] placeholder:text-[var(--color-ink-faint)] resize-y italic"
        />
        {performanceNotes !== (post.performance_notes || "") && (
          <button
            onClick={saveEdits}
            disabled={updating}
            className="mt-3 px-5 py-2 bg-[var(--color-accent)] text-[var(--color-bg)] text-[11px] uppercase tracking-[0.2em] font-medium"
          >
            Save notes
          </button>
        )}
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    draft: { label: "Draft", color: "var(--color-ink-mute)" },
    review: { label: "In review", color: "var(--color-amber)" },
    approved: { label: "Approved", color: "var(--color-mint)" },
    posted: { label: "Shipped", color: "var(--color-accent)" },
    rejected: { label: "Killed", color: "var(--color-red)" },
  };
  const { label, color } = map[status] || map.draft;
  return (
    <div className="font-display text-[20px] leading-none mt-1" style={{ color }}>
      {label}
    </div>
  );
}
