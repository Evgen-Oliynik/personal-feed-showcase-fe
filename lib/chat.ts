import { apiUrl } from "./api";
import { readTopics } from "./topics-store";

export const NOT_COVERED = "This is not in the collected materials";
export const UNAVAILABLE = "The assistant is unavailable right now";

export interface ChatSource {
  n: number;
  id: number;
  title: string;
  url: string;
  type: "read" | "watch" | "listen";
  source: string;
}

export type ChatEvent =
  | { type: "sources"; sources: ChatSource[] }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error" };

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const HISTORY_PAIRS = 6;

interface PastTurn {
  question: string;
  answer: string;
  status: "streaming" | "done" | "error";
}

/** The last 6 finished question/answer pairs, oldest first, each answer as it was shown. */
export function buildHistory(turns: PastTurn[]): ChatMessage[] {
  return turns
    .filter((t) => t.status === "error" || t.answer.trim() !== "")
    .filter((t) => t.status !== "streaming")
    .slice(-HISTORY_PAIRS)
    .flatMap((t): ChatMessage[] => [
      { role: "user", content: t.question },
      {
        role: "assistant",
        content: t.status === "error" ? UNAVAILABLE : t.answer.trim(),
      },
    ]);
}

/** Incremental SSE parser: feed it chunks, get the complete events so far. */
export function createSseParser() {
  let buffer = "";
  return {
    push(chunk: string): ChatEvent[] {
      buffer += chunk;
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? "";
      const events: ChatEvent[] = [];
      for (const block of blocks) {
        const event = parseBlock(block);
        if (event) events.push(event);
      }
      return events;
    },
  };
}

function parseBlock(block: string): ChatEvent | null {
  let name = "";
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith("event:")) name = line.slice(6).trim();
    else if (line.startsWith("data:"))
      data.push(line.slice(5).replace(/^ /, ""));
  }
  let payload: unknown;
  try {
    payload = data.length ? JSON.parse(data.join("\n")) : {};
  } catch {
    return null;
  }
  const obj = (payload ?? {}) as { text?: unknown };
  switch (name) {
    case "sources":
      return Array.isArray(payload)
        ? { type: "sources", sources: payload as ChatSource[] }
        : null;
    case "delta":
      return typeof obj.text === "string"
        ? { type: "delta", text: obj.text }
        : null;
    case "done":
      return { type: "done" };
    case "error":
      return { type: "error" };
    default:
      return null;
  }
}

/** POST /chat and yield its SSE events; a network failure becomes one `error` event. */
export async function* askChat(
  question: string,
  history: ChatMessage[] = [],
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  try {
    const res = await fetch(apiUrl("/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, topics: readTopics(), history }),
      signal,
    });
    if (!res.ok || !res.body) {
      yield { type: "error" };
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const parser = createSseParser();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      yield* parser.push(decoder.decode(value, { stream: true }));
    }
    yield* parser.push(decoder.decode() + "\n\n");
  } catch {
    if (!signal?.aborted) yield { type: "error" };
  }
}
