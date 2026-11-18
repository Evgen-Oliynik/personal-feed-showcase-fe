export type MediaType = "read" | "watch" | "listen";
export type MediaSourceId = "devto" | "medium" | "youtube" | "itunes";

export interface MediaItem {
  id: number;
  url: string;
  type: MediaType;
  source: MediaSourceId;
  topic: string;
  title: string;
  summary: string;
  author: string | null;
  imageUrl: string | null;
  publishedAt: string;
  durationSec: number | null;
}

export interface TodayFeed {
  date: string;
  builtAt: string | null;
  limits: { read: number; watch: number; listen: number };
  counts: { read: number; watch: number; listen: number };
  items: MediaItem[];
  reason?: "no-topics";
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  return `${base.replace(/\/+$/, "")}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let message = res.statusText || `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: unknown };
      if (typeof body.message === "string") message = body.message;
    } catch {
      // non-JSON error body: keep the status text
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  getSuggestions: () => request<string[]>("/topics/suggestions"),
  getTodayFeed: (topics: string[]) =>
    request<TodayFeed>(`/feed/today?topics=${encodeURIComponent(topics.join(","))}`, {
      cache: "no-store",
    }),
};
