import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { TOPICS_KEY } from "@/lib/topics-store";
import Home from "./page";

const replace = vi.fn();
const router = { replace };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  replace.mockReset();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Home", () => {
  it("redirects to /topics when the store is empty", () => {
    const feed = vi.spyOn(api, "getTodayFeed");
    render(<Home />);
    expect(replace).toHaveBeenCalledWith("/topics");
    expect(feed).not.toHaveBeenCalled();
  });

  it("loads the feed for the stored topics and shows them as chips", async () => {
    localStorage.setItem(TOPICS_KEY, JSON.stringify(["react", "rust"]));
    const feed = vi.spyOn(api, "getTodayFeed").mockReturnValue(new Promise(() => {}));
    render(<Home />);
    expect(await screen.findByRole("list", { name: "Active topics" })).toHaveTextContent("reactrust");
    expect(feed).toHaveBeenCalledWith(["react", "rust"]);
    expect(replace).not.toHaveBeenCalled();
  });
});
