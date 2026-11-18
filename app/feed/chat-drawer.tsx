"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ChatPanel } from "./chat-panel";

const WIDE = "(min-width: 1280px)";

function subscribe(cb: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

const isWide = () =>
  typeof window.matchMedia === "function" && window.matchMedia(WIDE).matches;

/** Wraps the feed with the chat drawer: docked and open from 1280px, closed overlay below. */
export function ChatDrawer({ children }: { children: ReactNode }) {
  const wide = useSyncExternalStore(subscribe, isWide, () => false);
  const [override, setOverride] = useState<boolean | null>(null);
  const open = override ?? wide;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOverride(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div
      className={`flex flex-1 flex-col pb-20 ${open ? "xl:pr-[400px]" : ""}`}
    >
      {children}
      <button
        type="button"
        aria-expanded={open}
        aria-controls="chat-drawer"
        onClick={() => setOverride(!open)}
        className={`fixed bottom-4 right-4 z-30 min-h-11 min-w-11 rounded-full bg-foreground px-5 font-semibold text-background shadow-lg ${
          open ? "xl:right-[416px]" : ""
        }`}
      >
        Ask
      </button>
      <aside
        id="chat-drawer"
        aria-label="Ask about today's feed"
        hidden={!open}
        className="fixed inset-0 z-40 flex flex-col bg-background sm:[@media(min-height:500px)]:left-auto sm:[@media(min-height:500px)]:w-[400px] sm:[@media(min-height:500px)]:border-l sm:[@media(min-height:500px)]:border-zinc-200 dark:sm:[@media(min-height:500px)]:border-zinc-800"
      >
        <ChatPanel onClose={() => setOverride(false)} />
      </aside>
    </div>
  );
}
