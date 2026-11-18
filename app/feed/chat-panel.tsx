"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { askChat, NOT_COVERED, UNAVAILABLE, type ChatSource } from "@/lib/chat";

interface Turn {
  question: string;
  answer: string;
  sources: ChatSource[];
  status: "streaming" | "done" | "error";
}

const BADGE = { read: "Read", watch: "Watch", listen: "Listen" } as const;

function withLinks(text: string, sources: ChatSource[]): ReactNode[] {
  return text.split(/(\[\d+\])/).map((part, i) => {
    const m = /^\[(\d+)\]$/.exec(part);
    const source = m && sources.find((s) => s.n === Number(m[1]));
    if (!source) return <Fragment key={i}>{part}</Fragment>;
    return (
      <a
        key={i}
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline"
      >
        {part}
      </a>
    );
  });
}

export function ChatPanel({ onClose }: { onClose: () => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const patchLast = (patch: (t: Turn) => Turn) =>
    setTurns((all) => all.map((t, i) => (i === all.length - 1 ? patch(t) : t)));

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || streaming) return;
    setQuestion("");
    setStreaming(true);
    setTurns((all) => [
      ...all,
      { question: q, answer: "", sources: [], status: "streaming" },
    ]);
    const controller = new AbortController();
    abort.current = controller;
    let failed = true;
    for await (const ev of askChat(q, controller.signal)) {
      if (ev.type === "sources")
        patchLast((t) => ({ ...t, sources: ev.sources }));
      else if (ev.type === "delta")
        patchLast((t) => ({ ...t, answer: t.answer + ev.text }));
      else if (ev.type === "error") break;
      else if (ev.type === "done") {
        failed = false;
        break;
      }
    }
    patchLast((t) => ({ ...t, status: failed ? "error" : "done" }));
    setStreaming(false);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 p-3 dark:border-zinc-800">
        <h2 className="font-semibold">Ask about today&apos;s feed</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="min-h-11 min-w-11 rounded border border-zinc-400 px-3"
        >
          ✕
        </button>
      </div>
      <div
        data-testid="chat-log"
        className="flex flex-1 flex-col gap-4 overflow-y-auto p-3"
      >
        {turns.map((t, i) => (
          <div key={i} className="flex flex-col gap-2">
            <p className="self-end rounded-lg bg-zinc-100 px-3 py-2 break-words dark:bg-zinc-800">
              {t.question}
            </p>
            {t.status === "error" ? (
              <p role="alert">{UNAVAILABLE}</p>
            ) : t.answer.trim() === NOT_COVERED ? (
              <p data-testid="not-covered" className="text-sm text-zinc-500">
                {NOT_COVERED}
              </p>
            ) : (
              <>
                <p
                  data-testid="answer"
                  className="break-words whitespace-pre-wrap"
                >
                  {withLinks(t.answer, t.sources)}
                </p>
                {t.sources.length > 0 && (
                  <section aria-label="Sources">
                    <h3 className="text-sm font-semibold">Sources</h3>
                    <ul className="mt-1 flex flex-col gap-1 text-sm">
                      {t.sources.map((s) => (
                        <li key={s.n} className="flex items-baseline gap-2">
                          <span className="shrink-0 rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium dark:bg-zinc-800">
                            {BADGE[s.type]}
                          </span>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-w-0 break-words underline"
                          >
                            {s.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      <form
        onSubmit={send}
        className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
      >
        <input
          aria-label="Question"
          value={question}
          maxLength={500}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about today's feed"
          className="min-h-11 min-w-0 flex-1 rounded border border-zinc-400 bg-background px-3 text-base"
        />
        <button
          type="submit"
          disabled={streaming || question.trim() === ""}
          className="min-h-11 rounded bg-foreground px-4 font-semibold text-background disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </>
  );
}
