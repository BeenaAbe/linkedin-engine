"use client";

import { useEffect, useState } from "react";
import type { Brand } from "@/lib/types";
import { getBrandColor } from "@/lib/types";

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Brand>>({});
  const [saving, setSaving] = useState(false);
  const [activeBrand, setActiveBrand] = useState<string>("");

  useEffect(() => {
    fetch("/api/brands")
      .then((r) => r.json())
      .then((d) => {
        const b = d.brands || [];
        setBrands(b);
        if (b.length > 0) setActiveBrand(b[0].id);
      });
  }, []);

  function startEditing(brand: Brand) {
    setEditing(brand.id);
    setEditData({
      tone: brand.tone,
      key_messaging: brand.key_messaging,
      topics: brand.topics,
      target_audience: brand.target_audience,
      description: brand.description,
    });
  }

  async function save(id: string) {
    setSaving(true);
    const res = await fetch("/api/brands", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...editData }),
    });
    if (res.ok) {
      const { brand } = await res.json();
      setBrands((prev) => prev.map((b) => (b.id === id ? brand : b)));
      setEditing(null);
    }
    setSaving(false);
  }

  const brand = brands.find((b) => b.id === activeBrand);
  const isEditing = editing === activeBrand;
  const accent = getBrandColor(brand?.name);

  return (
    <div className="h-screen flex flex-col animate-fade-in">
      {/* Header */}
      <header className="px-10 py-5 border-b border-[var(--color-border)] flex items-baseline justify-between">
        <div className="flex items-baseline gap-4">
          <h1 className="font-display text-[26px] leading-none tracking-[-0.02em] text-[var(--color-ink)]">
            Brands<span className="text-[var(--color-accent)]">.</span>
          </h1>
          <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)]">Profiles</span>
        </div>
        {/* Brand tabs */}
        <div className="flex gap-px bg-[var(--color-border)] border border-[var(--color-border)]">
          {brands.map((b) => (
            <button
              key={b.id}
              onClick={() => { setActiveBrand(b.id); setEditing(null); }}
              className={`px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] transition-colors ${
                activeBrand === b.id
                  ? "bg-[var(--color-bg-raised)] text-[var(--color-ink)]"
                  : "bg-[var(--color-bg)] text-[var(--color-ink-mute)] hover:text-[var(--color-ink-dim)]"
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </header>

      {brand && (
        <div className="flex-1 overflow-y-auto px-10 py-6">
          {/* Brand title row */}
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: accent }}>
                Active profile
              </div>
              <h2 className="font-display text-[34px] leading-none tracking-[-0.02em] text-[var(--color-ink)]">
                {brand.name}
              </h2>
            </div>
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-mute)]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => save(brand.id)}
                  disabled={saving}
                  className="px-5 py-2 bg-[var(--color-accent)] text-[var(--color-bg)] text-[10px] uppercase tracking-[0.2em] font-medium"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => startEditing(brand)}
                className="px-4 py-2 border border-[var(--color-border-strong)] text-[var(--color-ink-dim)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] text-[10px] uppercase tracking-[0.2em] transition-colors"
              >
                Edit profile
              </button>
            )}
          </div>

          {/* Two-col grid */}
          <div className="grid grid-cols-2 gap-x-10 gap-y-5">
            <Field
              label="Description"
              value={isEditing ? editData.description || "" : brand.description}
              editing={isEditing}
              onChange={(v) => setEditData({ ...editData, description: v })}
            />
            <Field
              label="Audience"
              value={isEditing ? editData.target_audience || "" : brand.target_audience}
              editing={isEditing}
              onChange={(v) => setEditData({ ...editData, target_audience: v })}
            />
            <Field
              label="Voice & tone"
              value={isEditing ? editData.tone || "" : brand.tone}
              editing={isEditing}
              onChange={(v) => setEditData({ ...editData, tone: v })}
            />
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-2">Topics</div>
              {isEditing ? (
                <textarea
                  value={(editData.topics || []).join("\n")}
                  onChange={(e) => setEditData({ ...editData, topics: e.target.value.split("\n").filter(Boolean) })}
                  rows={5}
                  className="w-full bg-[var(--color-bg-raised)] border border-[var(--color-border-strong)] focus:border-[var(--color-accent)] p-3 text-[12px] text-[var(--color-ink-dim)] resize-y"
                  placeholder="One topic per line"
                />
              ) : (
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {brand.topics.map((t) => (
                    <span key={t} className="text-[12px] text-[var(--color-ink-dim)]">
                      {t}
                      <span className="text-[var(--color-ink-faint)] ml-3">·</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="col-span-2">
              <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-2">Key messaging</div>
              {isEditing ? (
                <textarea
                  value={(editData.key_messaging || []).join("\n")}
                  onChange={(e) => setEditData({ ...editData, key_messaging: e.target.value.split("\n").filter(Boolean) })}
                  rows={5}
                  className="w-full bg-[var(--color-bg-raised)] border border-[var(--color-border-strong)] focus:border-[var(--color-accent)] p-3 text-[12px] text-[var(--color-ink-dim)] resize-y"
                  placeholder="One message per line"
                />
              ) : (
                <ul className="space-y-1.5">
                  {brand.key_messaging.map((msg, i) => (
                    <li key={i} className="flex items-baseline gap-3">
                      <span className="text-[10px] tabular text-[var(--color-ink-faint)]">{(i + 1).toString().padStart(2, "0")}</span>
                      <span className="text-[13px] text-[var(--color-ink-dim)]">{msg}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label, value, editing, onChange,
}: {
  label: string; value: string; editing: boolean; onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-2">{label}</div>
      {editing ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full bg-[var(--color-bg-raised)] border border-[var(--color-border-strong)] focus:border-[var(--color-accent)] p-3 text-[12px] text-[var(--color-ink-dim)] resize-y"
        />
      ) : (
        <p className="text-[13px] text-[var(--color-ink-dim)] leading-relaxed">{value}</p>
      )}
    </div>
  );
}
