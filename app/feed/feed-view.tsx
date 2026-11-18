"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  api,
  type MediaItem,
  type MediaSourceId,
  type MediaType,
  type TodayFeed,
} from "@/lib/api";
import { formatDuration, relativeDate } from "./format";

const TABS = [
  { key: "all", label: "All" },
  { key: "read", label: "Read" },
  { key: "watch", label: "Watch" },
  { key: "listen", label: "Listen" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const BADGE: Record<MediaType, string> = {
  read: "Read",
  watch: "Watch",
  listen: "Listen",
};

const SOURCE: Record<MediaSourceId, string> = {
  devto: "dev.to",
  medium: "Medium",
  youtube: "YouTube",
  itunes: "Apple Podcasts",
};

function parseTab(value: string | null): TabKey {
  return TABS.some((t) => t.key === value) ? (value as TabKey) : "all";
}

export function FeedView({ topics }: { topics: string[] }) {
  const tab = parseTab(useSearchParams().get("tab"));
  const [feed, setFeed] = useState<TodayFeed | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    setFeed(null);
    api.getTodayFeed().then(setFeed, () => setFailed(true));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load]);

  const items = feed
    ? tab === "all"
      ? feed.items
      : feed.items.filter((i) => i.type === tab)
    : [];

  return (
    <main className="mx-auto w-full flex-1 p-4 xl:max-w-[960px]">
      <h1 className="text-xl font-semibold">Today&apos;s feed</h1>
      {feed && <p className="text-sm text-zinc-500">{feed.date}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ul aria-label="Active topics" className="flex flex-wrap gap-2">
          {topics.map((t) => (
            <li
              key={t}
              className="rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800"
            >
              {t}
            </li>
          ))}
        </ul>
        <Link
          href="/topics"
          className="inline-flex min-h-11 items-center text-sm underline lg:min-h-0"
        >
          Change topics
        </Link>
      </div>

      <nav
        aria-label="Feed tabs"
        className="mt-4 flex gap-2 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800"
      >
        {TABS.map(({ key, label }) => {
          const text =
            key === "all" || !feed
              ? label
              : `${label} ${feed.counts[key]}/${feed.limits[key]}`;
          const active = key === tab;
          return (
            <Link
              key={key}
              href={key === "all" ? "/" : `/?tab=${key}`}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-3 lg:min-h-0 lg:py-2 ${
                active
                  ? "border-foreground font-semibold"
                  : "border-transparent text-zinc-500"
              }`}
            >
              {text}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 flex flex-col gap-3">
        {failed ? (
          <div role="alert" className="flex flex-col items-start gap-2">
            <p>Couldn&apos;t load today&apos;s feed</p>
            <button
              type="button"
              onClick={load}
              className="min-h-11 rounded border border-zinc-400 px-4 lg:min-h-0 lg:py-1"
            >
              Retry
            </button>
          </div>
        ) : !feed ? (
          [0, 1, 2].map((i) => (
            <div
              key={i}
              data-testid="skeleton-card"
              className="h-28 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
            />
          ))
        ) : (
          <>
            {items.map((item) => (
              <Card key={item.id} item={item} />
            ))}
            <EndOfFeed
              subline={
                items.length === 0 && tab !== "all"
                  ? `Nothing new to ${tab} today`
                  : "Come back tomorrow for a fresh feed"
              }
            />
          </>
        )}
      </div>
    </main>
  );
}

function EndOfFeed({ subline }: { subline: string }) {
  return (
    <section data-testid="end-of-feed" className="w-full py-8 text-center">
      <p className="font-semibold">That&apos;s all for today</p>
      <p className="text-sm text-zinc-500">{subline}</p>
    </section>
  );
}

function Card({ item }: { item: MediaItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-11 gap-3 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote hosts
        <img
          src={item.imageUrl}
          alt=""
          data-testid="thumbnail"
          className="h-fit w-[72px] shrink-0 rounded object-cover sm:w-[120px] lg:w-40 xl:w-[200px]"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
          <span className="rounded bg-zinc-100 px-2 py-0.5 font-medium text-foreground dark:bg-zinc-800">
            {BADGE[item.type]}
          </span>
          <span>{SOURCE[item.source]}</span>
          <span>{item.topic}</span>
          <span>{relativeDate(item.publishedAt)}</span>
          {item.type !== "read" && item.durationSec != null && (
            <span>{formatDuration(item.durationSec)}</span>
          )}
        </div>
        <h2 className="mt-1 font-semibold break-words">{item.title}</h2>
        <p
          data-testid="summary"
          className="mt-1 line-clamp-2 text-sm break-words sm:line-clamp-3 lg:line-clamp-4 xl:line-clamp-none"
        >
          {item.summary}
        </p>
      </div>
    </a>
  );
}
