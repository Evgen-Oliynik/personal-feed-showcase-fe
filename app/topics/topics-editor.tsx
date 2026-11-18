"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { ApiError, api } from "@/lib/api";

const MAX_TOPICS = 10;
const LIMIT_MESSAGE = "You can follow up to 10 topics";
const INVALID_MESSAGE = "Use 1–40 letters, digits, spaces or . + # -";

const chip =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-4 py-2 text-sm";
const idleChip = `${chip} border-zinc-300 dark:border-zinc-700`;
const selectedChip = `${chip} border-blue-600 bg-blue-600 text-white`;

function normalize(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((name) => b.includes(name));
}

function saveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return INVALID_MESSAGE;
    if (error.status === 422) return LIMIT_MESSAGE;
  }
  return "Could not save your topics. Try again.";
}

export function TopicsEditor() {
  const router = useRouter();
  const [saved, setSaved] = useState<string[] | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selection, setSelection] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getTopics(), api.getSuggestions()])
      .then(([topics, names]) => {
        if (cancelled) return;
        const current = topics.map((t) => normalize(t.name));
        setSaved(current);
        setSelection(current);
        setSuggestions(names.map(normalize));
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your topics. Reload to try again.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function add(name: string) {
    const value = normalize(name);
    if (!value || selection.includes(value)) return false;
    if (selection.length >= MAX_TOPICS) {
      setError(LIMIT_MESSAGE);
      return false;
    }
    setError(null);
    setSelection([...selection, value]);
    return true;
  }

  function remove(name: string) {
    setError(null);
    setSelection(selection.filter((n) => n !== name));
  }

  function toggle(name: string) {
    if (selection.includes(name)) remove(name);
    else add(name);
  }

  function onAdd(event: FormEvent) {
    event.preventDefault();
    if (add(draft)) setDraft("");
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.replaceTopics(selection);
      // The router keeps this page's state alive while hidden (cacheComponents),
      // so a returning visit must not find Save stuck in flight.
      setSaving(false);
      router.push("/");
    } catch (e) {
      setError(saveErrorMessage(e));
      setSaving(false);
    }
  }

  const loaded = saved !== null;
  const unchanged = saved !== null && sameSet(selection, saved);
  const saveDisabled = !loaded || selection.length === 0 || unchanged || saving;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Topics</h1>
      {saved?.length === 0 && (
        <p className="text-zinc-600 dark:text-zinc-400">
          Pick a few topics to start your feed
        </p>
      )}

      <section aria-labelledby="selected-heading" className="flex flex-col gap-2">
        <h2 id="selected-heading" className="font-medium">
          Your topics
        </h2>
        <ul className="flex flex-wrap gap-2" aria-label="Selected topics">
          {selection.map((name) => (
            <li key={name} className={`${selectedChip} gap-2`}>
              <span>{name}</span>
              <button
                type="button"
                aria-label={`Remove ${name}`}
                onClick={() => remove(name)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center -my-2 -mr-3"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <p>
          {selection.length}/{MAX_TOPICS} selected
        </p>
      </section>

      <section aria-labelledby="suggestions-heading" className="flex flex-col gap-2">
        <h2 id="suggestions-heading" className="font-medium">
          Suggestions
        </h2>
        <ul className="flex flex-wrap gap-2" aria-label="Suggested topics">
          {suggestions.map((name) => {
            const on = selection.includes(name);
            return (
              <li key={name}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(name)}
                  className={on ? selectedChip : idleChip}
                >
                  {name}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <form onSubmit={onAdd} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Custom topic"
          placeholder="Add your own topic"
          className="min-h-11 w-full rounded border border-zinc-300 bg-transparent px-3 text-base sm:w-72 dark:border-zinc-700"
        />
        <button
          type="submit"
          className="min-h-11 w-full rounded border border-zinc-300 px-4 sm:w-auto dark:border-zinc-700"
        >
          Add
        </button>
      </form>

      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saveDisabled}
        className="min-h-11 w-full rounded bg-blue-600 px-6 text-white disabled:opacity-50 sm:w-auto sm:self-start"
      >
        Save
      </button>
    </div>
  );
}
