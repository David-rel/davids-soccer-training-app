"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  ageGroupFromAge,
  calculateAgeFromBirthdate,
  getBirthYearFromBirthdate,
} from "@/lib/playerAge";

type Player = {
  id: string;
  name: string;
  birthdate: string | null;
  team_level: string | null;
  primary_position: string | null;
  secondary_position: string | null;
  dominant_foot: string | null;
  profile_photo_url: string | null;
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        disabled={disabled}
        className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 placeholder:text-gray-500 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
      />
    </div>
  );
}

export function PlayerEditor(props: { player: Player }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [draft, setDraft] = useState<Player>(props.player);

  const changed = useMemo(() => {
    const a = props.player;
    const b = draft;
    return (
      a.name !== b.name ||
      a.birthdate !== b.birthdate ||
      a.team_level !== b.team_level ||
      a.primary_position !== b.primary_position ||
      a.secondary_position !== b.secondary_position ||
      a.dominant_foot !== b.dominant_foot ||
      a.profile_photo_url !== b.profile_photo_url
    );
  }, [draft, props.player]);

  const computed = useMemo(() => {
    const age = calculateAgeFromBirthdate(draft.birthdate);
    const birthYear = getBirthYearFromBirthdate(draft.birthdate);
    const ageGroup = ageGroupFromAge(age);
    return { age, birthYear, ageGroup };
  }, [draft.birthdate]);

  return (
    <div>
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Player details
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Update basic profile info. (Players are added by Coach David.)
          </p>
        </div>
        <div className="hidden sm:flex sm:flex-col sm:items-end sm:gap-2">
          {draft.profile_photo_url ? (
            // Use <img> to avoid Next/Image remote domain configuration.
            <img
              src={draft.profile_photo_url}
              alt="Profile"
              className="h-18 w-18 rounded-2xl border border-emerald-200 object-cover"
            />
          ) : (
            <div className="flex h-18 w-18 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700">
              {draft.name?.slice(0, 1).toUpperCase() || "P"}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              setSuccess(null);
              setError(null);

              if (!file.type.startsWith("image/")) {
                setError("Please choose an image file.");
                return;
              }

              const maxBytes = 8 * 1024 * 1024;
              if (file.size > maxBytes) {
                setError("Image too large (max 8MB).");
                return;
              }

              setIsUploading(true);
              try {
                const form = new FormData();
                form.append("file", file);

                const res = await fetch("/api/blob/upload", {
                  method: "POST",
                  body: form,
                });

                if (!res.ok) {
                  const text = await res.text().catch(() => "");
                  throw new Error(text || "Upload failed.");
                }

                const data = (await res.json()) as { url: string };
                setDraft((p) => ({ ...p, profile_photo_url: data.url }));
                setSuccess("Photo uploaded. Click “Save changes” to apply.");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Upload failed.");
              } finally {
                setIsUploading(false);
                e.target.value = "";
              }
            }}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isPending}
              className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading ? "Uploading…" : "Upload photo"}
            </button>
            {draft.profile_photo_url && (
              <button
                type="button"
                onClick={() => {
                  setSuccess(null);
                  setError(null);
                  setDraft((p) => ({ ...p, profile_photo_url: null }));
                }}
                disabled={isUploading || isPending}
                className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {(error || success) && (
        <div
          className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error ?? success}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field
          label="Name"
          value={draft.name}
          onChange={(v) => {
            setSuccess(null);
            setError(null);
            setDraft((p) => ({ ...p, name: v }));
          }}
          placeholder="Player name"
        />
        <Field
          label="Team / level"
          value={draft.team_level ?? ""}
          onChange={(v) => {
            setSuccess(null);
            setError(null);
            setDraft((p) => ({ ...p, team_level: v || null }));
          }}
          placeholder="Team / level"
        />
        <Field
          label="Birthday"
          value={draft.birthdate ?? ""}
          onChange={(v) => {
            setSuccess(null);
            setError(null);
            setDraft((p) => ({ ...p, birthdate: v || null }));
          }}
          type="date"
          placeholder="YYYY-MM-DD"
        />
        <Field
          label="Computed (age / birth year / age group)"
          value={[
            computed.age !== null ? `Age ${computed.age}` : "Age —",
            computed.birthYear !== null
              ? `Birth year ${computed.birthYear}`
              : "Birth year —",
            computed.ageGroup ?? "Age group —",
          ].join(" • ")}
          onChange={() => {}}
          type="text"
          disabled
        />
        <Field
          label="Primary position"
          value={draft.primary_position ?? ""}
          onChange={(v) => {
            setSuccess(null);
            setError(null);
            setDraft((p) => ({ ...p, primary_position: v || null }));
          }}
          placeholder="e.g. CM"
        />
        <Field
          label="Secondary position"
          value={draft.secondary_position ?? ""}
          onChange={(v) => {
            setSuccess(null);
            setError(null);
            setDraft((p) => ({ ...p, secondary_position: v || null }));
          }}
          placeholder="e.g. LB"
        />
        <Field
          label="Dominant foot"
          value={draft.dominant_foot ?? ""}
          onChange={(v) => {
            setSuccess(null);
            setError(null);
            setDraft((p) => ({ ...p, dominant_foot: v || null }));
          }}
          placeholder="Right / Left / Both"
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          disabled={!changed || isPending}
          onClick={() => {
            setDraft(props.player);
            setError(null);
            setSuccess(null);
          }}
          className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reset
        </button>
        <button
          type="button"
          disabled={!changed || isPending || isUploading}
          onClick={() => {
            setError(null);
            setSuccess(null);

            const name = String(draft.name ?? "").trim();
            if (!name) {
              setError("Name is required.");
              return;
            }

            startTransition(async () => {
              try {
                const res = await fetch(`/api/players/${draft.id}`, {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    name,
                    birthdate: draft.birthdate,
                    team_level: draft.team_level,
                    primary_position: draft.primary_position,
                    secondary_position: draft.secondary_position,
                    dominant_foot: draft.dominant_foot,
                    profile_photo_url: draft.profile_photo_url,
                  }),
                });

                if (!res.ok) {
                  const text = await res.text().catch(() => "");
                  throw new Error(text || "Save failed.");
                }

                setSuccess("Saved.");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Save failed.");
              }
            });
          }}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
