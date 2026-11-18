import { redirect } from "next/navigation";
import { Suspense } from "react";
import { api } from "@/lib/api";

async function FeedGate() {
  const topics = await api.getTopics();
  if (topics.length === 0) redirect("/topics");
  return <h1 className="text-xl font-semibold">Today&apos;s feed</h1>;
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-4">
      <Suspense fallback={<p>Loading…</p>}>
        <FeedGate />
      </Suspense>
    </main>
  );
}
