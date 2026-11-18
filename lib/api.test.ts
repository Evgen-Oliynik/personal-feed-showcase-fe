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

  it("GETs suggestions and parses JSON", async () => {
    fetchMock.mockResolvedValue(json(["react"]));
    await expect(api.getSuggestions()).resolves.toEqual(["react"]);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/topics\/suggestions$/);
  });

  it("sends the topic list to the feed", async () => {
    fetchMock.mockResolvedValue(json({ items: [] }));
    await api.getTodayFeed(["react", "c++"]);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(
      /\/feed\/today\?topics=react%2Cc%2B%2B$/,
    );
  });

  it("returns undefined on 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api.getSuggestions()).resolves.toBeUndefined();
  });

  it("throws ApiError with the server message", async () => {
    fetchMock.mockResolvedValue(json({ message: "Topic exists" }, 409));
    const err = await api.getSuggestions().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, message: "Topic exists" });
  });

  it("falls back to status text when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue(
      new Response("boom", { status: 500, statusText: "Server Error" }),
    );
    await expect(api.getTodayFeed(["a"])).rejects.toMatchObject({
      status: 500,
      message: "Server Error",
    });
  });

  it("propagates network failures", async () => {
    fetchMock.mockRejectedValue(new TypeError("network"));
    await expect(api.getSuggestions()).rejects.toThrow("network");
  });
});
