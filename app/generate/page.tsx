"use client";

import { useState, useEffect, type ReactNode } from "react";
import type { Brand, GoalType, Hook } from "@/lib/types";
import { GOAL_LABELS, getBrandColor } from "@/lib/types";
import { useUserId } from "@/components/AuthProvider";

interface GenerateResult {
  post_id?: string;
  hooks: Hook[];
  post_body: string;
  cta: string;
  hashtags: string[];
  research_brief: string;
  content_strategy: {
    chosen_angle: string;
    conventional_wisdom?: string;
    scroll_stop_reason?: string;
    author_pov?: string;
    alternative_framings?: Array<{ conventional_wisdom: string; why_not_chosen: string }>;
    // outline is OutlineStep[] in new posts, string[] in legacy posts.
    outline: Array<{ role: string; must_do: string } | string>;
    structure_type: string;
  };
  visual_suggestion: {
    format: string;
    suggestion: string;
    carousel_outline?: string[];
  };
  editor_score: number;
  editor_feedback: string;
  revision_count: number;
  force_approved?: boolean;
}

const PIPELINE_STEPS = [
  { key: "validate", label: "Validate", detail: "Checking the inputs." },
  { key: "research", label: "Research", detail: "Gathering context." },
  { key: "strategist", label: "Strategy", detail: "Finding the angle." },
  { key: "writer", label: "Write", detail: "Drafting the post." },
  { key: "editor", label: "Edit", detail: "Sharpening the draft." },
  { key: "formatter", label: "Format", detail: "Polishing for the feed." },
  { key: "save", label: "Save", detail: "Tucking it away." },
];

export default function GeneratePage() {
  const userId = useUserId();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [topic, setTopic] = useState("");
  const [conventionalWisdom, setConventionalWisdom] = useState("");
  const [authorPov, setAuthorPov] = useState("");
  const [referenceUrls, setReferenceUrls] = useState("");
  const [goal, setGoal] = useState<GoalType>("thought_leadership");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"hooks" | "post" | "research" | "strategy" | "visual">("hooks");
  const [sendingNotification, setSendingNotification] = useState(false);

  useEffect(() => {
    fetch("/api/brands")
      .then((r) => r.json())
      .then((d) => {
        const b = d.brands || [];
        setBrands(b);
        if (b.length > 0) setSelectedBrand(b[0].id);
      });
  }, []);

  async function handleGenerate(wisdomOverride?: string) {
    if (!topic.trim() || !selectedBrand || !userId) return;
    // If user clicked "regenerate with this framing", sync the input field too
    // so the value is visible and editable for any further regenerations.
    if (wisdomOverride !== undefined) {
      setConventionalWisdom(wisdomOverride);
    }
    const wisdomToSend = wisdomOverride !== undefined ? wisdomOverride : conventionalWisdom;
    setLoading(true);
    setResult(null);
    setError(null);
    setCurrentStep(0);
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < PIPELINE_STEPS.length - 2 ? prev + 1 : prev));
    }, 4000);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          goal,
          brand_id: selectedBrand,
          user_id: userId,
          notify: false,
          conventional_wisdom: wisdomToSend.trim() || undefined,
          author_pov: authorPov.trim() || undefined,
          reference_urls: referenceUrls
            .split(/[\n,]/)
            .map((u) => u.trim())
            .filter((u) => u.length > 0 && /^https?:\/\//i.test(u)),
        }),
      });
      clearInterval(stepInterval);
      setCurrentStep(PIPELINE_STEPS.length - 1);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  }

  async function handleSendForReview() {
    if (!result?.post_id) return;
    setSendingNotification(true);
    try {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: result.post_id, user_id: userId }),
      });
    } finally {
      setSendingNotification(false);
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  }

  return (
    <div className="h-screen flex flex-col animate-fade-in">
      {/* Compact header */}
      <header className="px-10 py-5 border-b border-[var(--color-border)] flex items-baseline justify-between">
        <div className="flex items-baseline gap-4">
          <h1 className="font-display text-[26px] leading-none tracking-[-0.02em] text-[var(--color-ink)]">
            New post<span className="text-[var(--color-accent)]">.</span>
          </h1>
          <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)]">
            Generate
          </span>
        </div>
      </header>

      {/* Two-column body */}
      <div className="flex-1 grid grid-cols-[440px_1fr] min-h-0">
        {/* LEFT: Composer */}
        <aside className="border-r border-[var(--color-border)] p-8 overflow-y-auto">
          {/* Brand */}
          <div className="mb-6">
            <div className="text-[10px] uppercase tracking-[0.25em] mb-2">
              <span className="text-[var(--color-orange)] tabular">01</span>{" "}
              <span className="text-[var(--color-ink-mute)]">— Brand</span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-[var(--color-border)] border border-[var(--color-border)]">
              {brands.map((brand) => {
                const active = selectedBrand === brand.id;
                const accent = getBrandColor(brand.name);
                return (
                  <button
                    key={brand.id}
                    onClick={() => setSelectedBrand(brand.id)}
                    className={`p-4 text-left transition-colors ${
                      active ? "bg-[var(--color-bg-raised)]" : "bg-[var(--color-bg)] hover:bg-[var(--color-bg-raised)]"
                    }`}
                  >
                    <div className="font-display text-[20px] leading-none" style={{ color: active ? "var(--color-ink)" : "var(--color-ink-mute)" }}>
                      {brand.name}
                    </div>
                    {active && (
                      <div className="text-[10px] uppercase tracking-[0.2em] mt-1.5" style={{ color: accent }}>
                        · Selected
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Goal */}
          <div className="mb-6">
            <div className="text-[10px] uppercase tracking-[0.25em] mb-2">
              <span className="text-[var(--color-amber)] tabular">02</span>{" "}
              <span className="text-[var(--color-ink-mute)]">— Intent</span>
            </div>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as GoalType)}
              className="w-full bg-[var(--color-bg-raised)] border border-[var(--color-border-strong)] focus:border-[var(--color-accent)] px-4 py-3 text-[14px] text-[var(--color-ink)] cursor-pointer"
            >
              {Object.entries(GOAL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Topic */}
          <div className="mb-6">
            <div className="text-[10px] uppercase tracking-[0.25em] mb-2">
              <span className="text-[var(--color-mint)] tabular">03</span>{" "}
              <span className="text-[var(--color-ink-mute)]">— Topic</span>
            </div>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What do you want to say today?"
              rows={3}
              className="w-full bg-[var(--color-bg-raised)] border border-[var(--color-border-strong)] focus:border-[var(--color-accent)] p-4 font-display text-[18px] leading-tight tracking-[-0.01em] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] resize-none"
            />
          </div>

          {/* Conventional wisdom (optional) */}
          <div className="mb-6">
            <div className="text-[10px] uppercase tracking-[0.25em] mb-2">
              <span className="text-[var(--color-rose)] tabular">04</span>{" "}
              <span className="text-[var(--color-ink-mute)]">— Conventional wisdom</span>{" "}
              <span className="text-[var(--color-ink-faint)] normal-case tracking-normal">(optional)</span>
            </div>
            <textarea
              value={conventionalWisdom}
              onChange={(e) => setConventionalWisdom(e.target.value)}
              placeholder="What does most of your audience currently believe about this topic?"
              rows={2}
              className="w-full bg-[var(--color-bg-raised)] border border-[var(--color-border-strong)] focus:border-[var(--color-accent)] p-3 text-[13px] leading-snug text-[var(--color-ink-dim)] placeholder:text-[var(--color-ink-faint)] resize-none"
            />
            <div className="text-[10px] text-[var(--color-ink-faint)] mt-1.5 leading-snug">
              The strategist will pick an angle that contradicts or complicates this. Leave blank to let it guess.
            </div>
          </div>

          {/* Author POV (optional) */}
          <div className="mb-6">
            <div className="text-[10px] uppercase tracking-[0.25em] mb-2">
              <span className="text-[var(--color-cream)] tabular">05</span>{" "}
              <span className="text-[var(--color-ink-mute)]">— Your view</span>{" "}
              <span className="text-[var(--color-ink-faint)] normal-case tracking-normal">(optional)</span>
            </div>
            <textarea
              value={authorPov}
              onChange={(e) => setAuthorPov(e.target.value)}
              placeholder="What do you actually think about this? The post will arrive at this view."
              rows={2}
              className="w-full bg-[var(--color-bg-raised)] border border-[var(--color-border-strong)] focus:border-[var(--color-accent)] p-3 text-[13px] leading-snug text-[var(--color-ink-dim)] placeholder:text-[var(--color-ink-faint)] resize-none"
            />
            <div className="text-[10px] text-[var(--color-ink-faint)] mt-1.5 leading-snug">
              The writer treats this as a hard constraint. Leave blank to let the strategist invent an angle.
            </div>
          </div>

          {/* Reference URLs (optional) */}
          <div className="mb-6">
            <div className="text-[10px] uppercase tracking-[0.25em] mb-2">
              <span className="text-[var(--color-orange)] tabular">06</span>{" "}
              <span className="text-[var(--color-ink-mute)]">— Reference URLs</span>{" "}
              <span className="text-[var(--color-ink-faint)] normal-case tracking-normal">(optional)</span>
            </div>
            <textarea
              value={referenceUrls}
              onChange={(e) => setReferenceUrls(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
              placeholder="https://deployd.io&#10;https://example.com/case-study"
              rows={2}
              className="w-full bg-[var(--color-bg-raised)] border border-[var(--color-border-strong)] focus:border-[var(--color-accent)] p-3 text-[12px] leading-snug text-[var(--color-ink-dim)] placeholder:text-[var(--color-ink-faint)] resize-none font-mono"
            />
            <div className="text-[10px] text-[var(--color-ink-faint)] mt-1.5 leading-snug">
              One URL per line. The research agent will fetch these and treat them as authoritative sources.
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={() => handleGenerate()}
            disabled={loading || !topic.trim() || !selectedBrand}
            className="w-full px-6 py-3.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--color-bg)] text-[12px] uppercase tracking-[0.2em] font-medium transition-all"
          >
            {loading ? <span className="cursor-blink">Working</span> : "Generate draft →"}
          </button>

          {error && (
            <div className="mt-6 p-3 border border-[var(--color-red)]/30 bg-[var(--color-red)]/10">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-red)] mb-1">Error</div>
              <div className="text-[12px] text-[var(--color-ink-dim)]">{error}</div>
            </div>
          )}
        </aside>

        {/* RIGHT: Output */}
        <section className="overflow-y-auto">
          {!result && !loading && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="font-display text-[24px] text-[var(--color-ink-mute)] italic">
                  The page is blank.
                </p>
                <p className="text-[11px] text-[var(--color-ink-faint)] mt-2 uppercase tracking-[0.2em]">
                  Compose a draft to begin
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="h-full overflow-y-auto px-12 py-10 animate-fade-in">
              <div className="max-w-[560px] mx-auto">
                <div className="mb-8">
                  <p className="font-display text-[32px] leading-none text-[var(--color-ink)] cursor-blink">
                    Generating
                  </p>
                  <p className="text-[10px] text-[var(--color-ink-faint)] mt-3 uppercase tracking-[0.25em]">
                    Step {currentStep + 1} of {PIPELINE_STEPS.length} · {PIPELINE_STEPS[currentStep]?.label}
                  </p>
                </div>

                <ol className="space-y-5">
                  {PIPELINE_STEPS.map((step, i) => {
                    const status = i < currentStep ? "done" : i === currentStep ? "active" : "pending";
                    return (
                      <li key={step.key} className="flex gap-4">
                        <span
                          className={`tabular text-[11px] pt-0.5 w-6 shrink-0 ${
                            status === "done"
                              ? "text-[var(--color-mint)]"
                              : status === "active"
                                ? "text-[var(--color-accent)]"
                                : "text-[var(--color-ink-faint)]"
                          }`}
                        >
                          {(i + 1).toString().padStart(2, "0")}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span
                              className={`text-[13px] uppercase tracking-[0.18em] ${
                                status === "done"
                                  ? "text-[var(--color-ink-dim)]"
                                  : status === "active"
                                    ? "text-[var(--color-ink)]"
                                    : "text-[var(--color-ink-mute)]"
                              }`}
                            >
                              {step.label}
                            </span>
                            <span
                              className={`text-[9px] uppercase tracking-[0.2em] ${
                                status === "done"
                                  ? "text-[var(--color-mint)]"
                                  : status === "active"
                                    ? "text-[var(--color-accent)] cursor-blink"
                                    : "text-transparent"
                              }`}
                            >
                              {status === "done" ? "Done" : status === "active" ? "Working" : ""}
                            </span>
                          </div>
                          <p
                            className={`text-[12px] leading-relaxed mt-1 ${
                              status === "pending"
                                ? "text-[var(--color-ink-faint)]"
                                : "text-[var(--color-ink-dim)]"
                            }`}
                          >
                            {step.detail}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          )}

          {result && (
            <div className="animate-fade-in">
              {/* Score bar */}
              <div className="px-8 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-baseline gap-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">Score</span>
                    <span className={`font-display text-[28px] tabular leading-none ${
                      result.editor_score >= 75 ? "text-[var(--color-mint)]"
                        : result.editor_score >= 60 ? "text-[var(--color-amber)]"
                        : "text-[var(--color-red)]"
                    }`}>{result.editor_score}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">Length</span>
                    <span className="font-display text-[20px] tabular text-[var(--color-ink-dim)]">{result.post_body.length}</span>
                  </div>
                  {result.revision_count > 0 && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">Revisions</span>
                      <span className="font-display text-[20px] tabular text-[var(--color-ink-dim)]">{result.revision_count}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {result.post_id && (
                    <a
                      href={`/posts/${result.post_id}`}
                      className="px-4 py-2 border border-[var(--color-border-strong)] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink-mute)] text-[10px] uppercase tracking-[0.2em] font-medium transition-colors"
                    >
                      Open & edit →
                    </a>
                  )}
                  <button
                    onClick={handleSendForReview}
                    disabled={sendingNotification}
                    className="px-4 py-2 border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-bg)] text-[10px] uppercase tracking-[0.2em] font-medium transition-colors"
                  >
                    {sendingNotification ? "Sending..." : "Send for review →"}
                  </button>
                </div>
              </div>

              {/* Force-approve warning */}
              {result.force_approved && (
                <div className="px-8 py-3 border-b border-[var(--color-amber)]/40 bg-[var(--color-amber)]/10 flex items-baseline gap-3">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-amber)] shrink-0">
                    ⚠ Force-approved
                  </span>
                  <span className="text-[12px] text-[var(--color-ink-dim)]">
                    Shipped below quality threshold after {result.revision_count} revision attempts. Review carefully before publishing.
                  </span>
                </div>
              )}

              {/* Tabs */}
              <div className="px-8 pt-4">
                <div className="flex gap-6 border-b border-[var(--color-border)]">
                  {(["hooks", "post", "research", "strategy", "visual"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`pb-3 text-[11px] uppercase tracking-[0.2em] transition-colors relative ${
                        activeTab === tab ? "text-[var(--color-ink)]" : "text-[var(--color-ink-mute)] hover:text-[var(--color-ink-dim)]"
                      }`}
                    >
                      {tab}
                      {activeTab === tab && (
                        <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-[var(--color-accent)]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div className="px-8 py-6">
                {activeTab === "hooks" && (
                  <div className="space-y-5">
                    {result.hooks.map((hook, i) => (
                      <div key={i} className="group">
                        <div className="flex items-baseline justify-between mb-2">
                          <div className="flex items-baseline gap-3">
                            <span className="font-display text-[18px] tabular text-[var(--color-accent)]">
                              {(i + 1).toString().padStart(2, "0")}
                            </span>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-mute)]">
                              {hook.type}
                            </span>
                          </div>
                          <button
                            onClick={() => copy(hook.text, `hook-${i}`)}
                            className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-mute)] hover:text-[var(--color-accent)]"
                          >
                            {copiedKey === `hook-${i}` ? "Copied ✓" : "Copy"}
                          </button>
                        </div>
                        <p className="font-display text-[17px] leading-snug text-[var(--color-ink)] tracking-[-0.01em]">
                          {hook.text}
                        </p>
                        {i < result.hooks.length - 1 && <hr className="rule mt-5" />}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "post" && (
                  <div>
                    <div className="flex items-baseline justify-between mb-4">
                      <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)]">Body</span>
                      <button
                        onClick={() => copy(result.post_body, "body")}
                        className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-mute)] hover:text-[var(--color-accent)]"
                      >
                        {copiedKey === "body" ? "Copied ✓" : "Copy"}
                      </button>
                    </div>
                    <article className="font-display text-[15px] leading-[1.65] text-[var(--color-ink)] whitespace-pre-line">
                      {result.post_body}
                    </article>
                    <hr className="rule my-5" />
                    <div className="space-y-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)] mb-1">CTA</div>
                        <div className="text-[13px] text-[var(--color-ink-dim)] italic">{result.cta}</div>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        {result.hashtags.map((tag) => (
                          <span key={tag} className="text-[12px] text-[var(--color-accent)]">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "research" && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-3">Research brief</div>
                    <article className="text-[13px] leading-[1.7] text-[var(--color-ink-dim)] whitespace-pre-line">
                      {renderResearchMarkdown(result.research_brief)}
                    </article>
                  </div>
                )}

                {activeTab === "strategy" && (
                  <div className="space-y-5">
                    {result.content_strategy.conventional_wisdom && (
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-2">Conventional wisdom</div>
                        <p className="text-[13px] leading-snug text-[var(--color-ink-mute)] italic">
                          {result.content_strategy.conventional_wisdom}
                        </p>
                      </div>
                    )}
                    {result.content_strategy.author_pov && (
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-accent)] mb-2">Your view (destination)</div>
                        <p className="text-[13px] leading-snug text-[var(--color-ink-dim)]">
                          {result.content_strategy.author_pov}
                        </p>
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-2">Angle</div>
                      <p className="font-display text-[18px] leading-snug text-[var(--color-ink)]">
                        {result.content_strategy.chosen_angle}
                      </p>
                    </div>
                    {result.content_strategy.scroll_stop_reason && (
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-2">Scroll stop reason</div>
                        <p className="text-[13px] leading-snug text-[var(--color-ink-dim)]">
                          {result.content_strategy.scroll_stop_reason}
                        </p>
                      </div>
                    )}
                    {result.content_strategy.alternative_framings && result.content_strategy.alternative_framings.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-3">
                          Other framings considered
                        </div>
                        <div className="space-y-3">
                          {result.content_strategy.alternative_framings.map((alt, i) => (
                            <div key={i} className="p-3 border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-colors">
                              <p className="text-[13px] leading-snug text-[var(--color-ink-dim)]">
                                {alt.conventional_wisdom}
                              </p>
                              <p className="text-[11px] text-[var(--color-ink-mute)] italic mt-1.5">
                                Why not chosen: {alt.why_not_chosen}
                              </p>
                              <button
                                onClick={() => handleGenerate(alt.conventional_wisdom)}
                                disabled={loading}
                                className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                Regenerate with this framing →
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <hr className="rule" />
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-3">
                        Structure · {result.content_strategy.structure_type}
                      </div>
                      <ol className="space-y-3">
                        {result.content_strategy.outline.map((item, i) => {
                          // Handle both new shape ({role, must_do}) and legacy string outlines.
                          const isStep = typeof item === "object" && item !== null && "role" in item;
                          return (
                            <li key={i} className="flex items-baseline gap-3">
                              <span className="text-[10px] tabular text-[var(--color-ink-faint)]">
                                {(i + 1).toString().padStart(2, "0")}
                              </span>
                              {isStep ? (
                                <div className="flex-1">
                                  <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-accent)] mb-0.5">
                                    {(item as { role: string; must_do: string }).role}
                                  </div>
                                  <div className="text-[13px] text-[var(--color-ink-dim)]">
                                    {(item as { role: string; must_do: string }).must_do}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[13px] text-[var(--color-ink-dim)]">{item as string}</span>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  </div>
                )}

                {activeTab === "visual" && (
                  <div className="space-y-5">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-2">Format</div>
                      <div className="font-display text-[24px] leading-none text-[var(--color-ink)]">
                        {result.visual_suggestion.format}
                      </div>
                    </div>
                    <p className="text-[13px] leading-relaxed text-[var(--color-ink-dim)]">
                      {result.visual_suggestion.suggestion}
                    </p>
                    {result.visual_suggestion.carousel_outline && (
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-2">Slides</div>
                        <ol className="space-y-2">
                          {result.visual_suggestion.carousel_outline.map((slide, i) => (
                            <li key={i} className="flex items-baseline gap-3">
                              <span className="text-[10px] tabular text-[var(--color-ink-faint)]">
                                {(i + 1).toString().padStart(2, "0")}
                              </span>
                              <span className="text-[13px] text-[var(--color-ink-dim)]">{slide}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// Minimal renderer for the research brief markdown.
// Converts [label](url) → <a> and leaves everything else as plain text inside
// the parent <article whitespace-pre-line> so headings and bullets still flow.
// Intentionally NOT a full markdown parser — we control the input format.
function renderResearchMarkdown(text: string): ReactNode {
  if (!text) return null;
  // Split into lines so we keep newlines intact for whitespace-pre-line.
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => (
    <span key={lineIdx}>
      {parseLinks(line)}
      {lineIdx < lines.length - 1 ? "\n" : ""}
    </span>
  ));
}

function parseLinks(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Match [text](url) — non-greedy, no nested brackets/parens.
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) out.push(line.slice(last, m.index));
    out.push(
      <a
        key={`l-${key++}`}
        href={m[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--color-accent)] underline decoration-dotted underline-offset-2 hover:text-[var(--color-accent-hover)]"
      >
        {m[1]}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}
