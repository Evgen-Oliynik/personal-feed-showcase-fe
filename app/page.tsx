"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { readTopics } from "@/lib/topics-store";
import { FeedView } from "./feed/feed-view";

function FeedGate() {
  const router = useRouter();
  const routerRef = useRef(router);
  const [topics, setTopics] = useState<string[] | null>(null);

  useEffect(() => {
    const stored = readTopics();
    if (stored.length === 0) routerRef.current.replace("/topics");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is browser-only
    else setTopics(stored);
  }, []);

  if (!topics) return <Loading />;
  return <FeedView topics={topics} />;
}

function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-4">
      <p>Loading…</p>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <FeedGate />
    </Suspense>
  );
}
