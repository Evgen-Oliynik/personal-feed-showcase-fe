import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, apiUrl } from "./api";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("api", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("defaults to localhost:4000", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    expect(apiUrl("/topics")).toBe("http://localhost:4000/topics");
  });

  it("uses NEXT_PUBLIC_API_URL and trims trailing slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test//");
    expect(apiUrl("/feed/today")).toBe("https://api.example.test/feed/today");
  });

  it("GETs and parses JSON", async () => {
    fetchMock.mockResolvedValue(json([{ id: 1, name: "react", createdAt: "x" }]));
    const topics = await api.getTopics();
    expect(topics[0].name).toBe("react");
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/topics$/);
  });

  it("POSTs a JSON body", async () => {
    fetchMock.mockResolvedValue(json({ id: 2, name: "rust", createdAt: "x" }, 201));
    await api.addTopic("rust");
    const init = fetchMock.mock.calls[0][1]!;
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "rust" }));
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
  });

  it("returns undefined on 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api.deleteTopic(3)).resolves.toBeUndefined();
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/topics\/3$/);
  });

  it("throws ApiError with the server message", async () => {
    fetchMock.mockResolvedValue(json({ message: "Topic exists" }, 409));
    const err = await api.addTopic("rust").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, message: "Topic exists" });
  });

  it("falls back to status text when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue(
      new Response("boom", { status: 500, statusText: "Server Error" }),
    );
    await expect(api.getTodayFeed()).rejects.toMatchObject({
      status: 500,
      message: "Server Error",
    });
  });

  it("propagates network failures", async () => {
    fetchMock.mockRejectedValue(new TypeError("network"));
    await expect(api.getTopics()).rejects.toThrow("network");
  });
});
