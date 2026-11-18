import { afterEach, describe, expect, it, vi } from "vitest";
import { askChat, createSseParser, type ChatEvent } from "./chat";

const stream = `event: sources
data: [{"n":1,"id":1,"title":"T","url":"https://e.test/1","type":"read","source":"devto"}]

event: delta
data: {"text":"Hi [1]"}

event: done
data: {}

`;

describe("createSseParser", () => {
  it("parses whole events", () => {
    const events = createSseParser().push(stream);
    expect(events.map((e) => e.type)).toEqual(["sources", "delta", "done"]);
    expect(events[1]).toEqual({ type: "delta", text: "Hi [1]" });
  });

  it("parses events split across chunks at every position", () => {
    for (let i = 1; i < stream.length; i++) {
      const p = createSseParser();
      const events = [
        ...p.push(stream.slice(0, i)),
        ...p.push(stream.slice(i)),
      ];
      expect(events.map((e) => e.type)).toEqual(["sources", "delta", "done"]);
    }
  });

  it("handles CRLF and error events, ignores unknown ones", () => {
    const events = createSseParser().push(
      'event: ping\r\ndata: {}\r\n\r\nevent: error\r\ndata: {"message":"x"}\r\n\r\n',
    );
    expect(events).toEqual([{ type: "error" }]);
  });
});

describe("askChat", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  const collect = async (q: string) => {
    const out: ChatEvent[] = [];
    for await (const e of askChat(q)) out.push(e);
    return out;
  };

  it("streams events from the response body", async () => {
    window.localStorage.setItem(
      "pfs.topics",
      JSON.stringify(["react", "rust"]),
    );
    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(enc.encode(stream.slice(0, 40)));
        c.enqueue(enc.encode(stream.slice(40)));
        c.close();
      },
    });
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(body));
    vi.stubGlobal("fetch", fetchMock);
    const events = await collect("q");
    expect(events.map((e) => e.type)).toEqual(["sources", "delta", "done"]);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/chat$/);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      question: "q",
      topics: ["react", "rust"],
    });
  });

  it("yields error on network failure and non-ok status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await collect("q")).toEqual([{ type: "error" }]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("x", { status: 500 })),
    );
    expect(await collect("q")).toEqual([{ type: "error" }]);
  });
});
