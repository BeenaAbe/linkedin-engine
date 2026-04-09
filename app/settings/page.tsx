"use client";

import { useState, useEffect } from "react";

interface ChannelConfig {
  channel: "slack" | "discord" | "teams";
  label: string;
  description: string;
  enabled: boolean;
  webhookUrl: string;
}

const DEFAULTS: ChannelConfig[] = [
  {
    channel: "slack",
    label: "Slack",
    description: "Send drafts to a Slack channel for team review.",
    enabled: false,
    webhookUrl: "",
  },
  {
    channel: "discord",
    label: "Discord",
    description: "Send drafts to a Discord channel via webhook.",
    enabled: false,
    webhookUrl: "",
  },
];

export default function SettingsPage() {
  const [channels, setChannels] = useState<ChannelConfig[]>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(({ settings }) => {
        if (!settings?.length) return;
        setChannels((prev) =>
          prev.map((c) => {
            const s = settings.find((s: { channel: string }) => s.channel === c.channel);
            if (!s) return c;
            return { ...c, enabled: s.enabled, webhookUrl: s.config?.webhook_url ?? "" };
          })
        );
      })
      .finally(() => setLoading(false));
  }, []);

  function toggle(i: number) {
    setChannels((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, enabled: !c.enabled } : c))
    );
  }

  function updateUrl(i: number, value: string) {
    setChannels((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, webhookUrl: value } : c))
    );
  }

  async function handleSave() {
    setSaving(true);
    await Promise.all(
      channels.map((c) =>
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: c.channel,
            enabled: c.enabled,
            config: { webhook_url: c.webhookUrl },
          }),
        })
      )
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="h-screen flex flex-col animate-fade-in">
      <header className="px-10 py-5 border-b border-[var(--color-border)] flex items-baseline justify-between">
        <div className="flex items-baseline gap-4">
          <h1 className="font-display text-[26px] leading-none tracking-[-0.02em] text-[var(--color-ink)]">
            Settings<span className="text-[var(--color-accent)]">.</span>
          </h1>
          <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)]">
            Configuration
          </span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 text-[var(--color-bg)] text-[10px] uppercase tracking-[0.2em] font-medium transition-colors"
        >
          {saved ? "Saved ✓" : saving ? "Saving…" : "Save"}
        </button>
      </header>

      <div className="flex-1 grid grid-cols-2 min-h-0">
        {/* LEFT: Channels */}
        <section className="border-r border-[var(--color-border)] p-8 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-4">
            Notification channels
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 skeleton" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {channels.map((channel, ci) => (
                <div
                  key={channel.channel}
                  className={`border p-5 transition-colors ${
                    channel.enabled
                      ? "border-[var(--color-accent)]/40 bg-[var(--color-bg-raised)]"
                      : "border-[var(--color-border)]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-display text-[20px] leading-none text-[var(--color-ink)]">
                      {channel.label}
                    </span>
                    <button
                      onClick={() => toggle(ci)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        channel.enabled
                          ? "bg-[var(--color-accent)]"
                          : "bg-[var(--color-bg-elevated)] border border-[var(--color-border-strong)]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                          channel.enabled
                            ? "left-5 bg-[var(--color-bg)]"
                            : "left-0.5 bg-[var(--color-ink-mute)]"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-[var(--color-ink-mute)] mb-3">
                    {channel.description}
                  </p>
                  {channel.enabled && (
                    <div className="pt-3 border-t border-[var(--color-border)]">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-ink-faint)] block mb-1">
                        Webhook URL
                      </label>
                      <input
                        type="url"
                        value={channel.webhookUrl}
                        onChange={(e) => updateUrl(ci, e.target.value)}
                        placeholder={
                          channel.channel === "slack"
                            ? "https://hooks.slack.com/services/..."
                            : channel.channel === "discord"
                            ? "https://discord.com/api/webhooks/..."
                            : "https://outlook.office.com/webhook/..."
                        }
                        className="w-full bg-transparent border-b border-[var(--color-border-strong)] focus:border-[var(--color-accent)] py-1 text-[12px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] font-mono outline-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 border border-[var(--color-border)]">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)] mb-2">
              How to get a webhook URL
            </div>
            <ul className="text-[11px] text-[var(--color-ink-mute)] space-y-1.5 leading-relaxed">
              <li><span className="text-[var(--color-ink-dim)]">Slack:</span> Channel settings → Integrations → Add an app → Incoming Webhooks</li>
<li><span className="text-[var(--color-ink-dim)]">Discord:</span> Channel settings → Integrations → Webhooks → New Webhook</li>
            </ul>
          </div>
        </section>

        {/* RIGHT: Engine info */}
        <section className="p-8 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-4">
            Engine specs
          </div>
          <dl className="space-y-2">
            {[
              { label: "Provider", value: "Groq · OpenRouter" },
              { label: "Model", value: "openai/gpt-oss-120b" },
              { label: "Research", value: "Built-in web search" },
              { label: "Pipeline", value: "Research → Strategy → Writer → Editor → Format" },
              { label: "Anti-repetition", value: "Full history per brand" },
              { label: "Database", value: "Supabase Postgres" },
              { label: "Hosting", value: "Vercel" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-2"
              >
                <dt className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
                  {label}
                </dt>
                <dd className="text-[12px] text-[var(--color-ink-dim)] tabular text-right">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 p-4 border border-[var(--color-border)]">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)] mb-2">
              Status
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-mint)]" />
              <span className="text-[12px] text-[var(--color-ink-dim)]">
                All systems operational
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
