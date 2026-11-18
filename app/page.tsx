import { redirect } from "next/navigation";
import { Suspense } from "react";
import { api } from "@/lib/api";
import { FeedView } from "./feed/feed-view";

async function FeedGate() {
  const topics = await api.getTopics();
  if (topics.length === 0) redirect("/topics");
  return <FeedView topics={topics.map((t) => t.name)} />;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-5xl flex-1 p-4">
          <p>Loading…</p>
        </main>
      }
    >
      <FeedGate />
    </Suspense>
  );
}
