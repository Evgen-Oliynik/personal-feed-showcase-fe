import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, type MediaItem, type TodayFeed } from "@/lib/api";
import { formatDuration } from "./format";
import { FeedView } from "./feed-view";

let tab: string | null = null;
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(tab ? { tab } : {}),
}));

const item = (
  id: number,
  type: MediaItem["type"],
  extra: Partial<MediaItem> = {},
): MediaItem => ({
  id,
  url: `https://example.test/${id}`,
  type,
  source: type === "watch" ? "youtube" : type === "listen" ? "itunes" : "devto",
  topic: "react",
  title: `Title ${id}`,
  summary: `Summary ${id}`,
  author: null,
  imageUrl: null,
  publishedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
  durationSec: null,
  ...extra,
});

const feed: TodayFeed = {
  date: "2026-11-18",
  builtAt: null,
  limits: { read: 10, watch: 10, listen: 10 },
  counts: { read: 2, watch: 1, listen: 1 },
  items: [
    item(1, "read"),
    item(2, "read"),
    item(3, "watch", { durationSec: 3725, imageUrl: "https://img.test/3.jpg" }),
    item(4, "listen", { durationSec: 605 }),
  ],
};

function setup(t: string | null = null) {
  tab = t;
  vi.spyOn(api, "getTodayFeed").mockResolvedValue(feed);
  return render(<FeedView topics={["react", "rust"]} />);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("FeedView", () => {
  it("shows date, topics, change link and tab counts", async () => {
    setup();
    expect(await screen.findByText("2026-11-18")).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Active topics" }),
    ).toHaveTextContent("rust");
    expect(screen.getByRole("link", { name: "Change topics" })).toHaveAttribute(
      "href",
      "/topics",
    );
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Read 2/10" })).toHaveAttribute(
      "href",
      "/?tab=read",
    );
    expect(
      screen.getByRole("link", { name: "Watch 1/10" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Listen 1/10" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(4);
  });

  it("filters by the tab query param", async () => {
    setup("watch");
    expect(await screen.findByText("Title 3")).toBeInTheDocument();
    expect(screen.queryByText("Title 1")).toBeNull();
    expect(screen.getByRole("link", { name: "Watch 1/10" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    cleanup();
    setup("bogus");
    expect(await screen.findAllByRole("heading", { level: 2 })).toHaveLength(4);
  });

  it("renders card fields and link attributes", async () => {
    setup();
    const link = (await screen.findByText("Title 3")).closest("a")!;
    expect(link).toHaveAttribute("href", "https://example.test/3");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveTextContent("Watch");
    expect(link).toHaveTextContent("YouTube");
    expect(link).toHaveTextContent("react");
    expect(link).toHaveTextContent("3 hours ago");
    expect(link).toHaveTextContent("Summary 3");
    expect(link).toHaveTextContent("1:02:05");
    expect(link.querySelector("img")).toHaveAttribute(
      "src",
      "https://img.test/3.jpg",
    );
    const listen = screen.getByText("Title 4").closest("a")!;
    expect(listen).toHaveTextContent("10:05");
    expect(listen.querySelector("img")).toBeNull();
    expect(screen.getByText("Title 1").closest("a")).not.toHaveTextContent(
      /\d:\d\d/,
    );
  });

  it("shows skeletons while loading", () => {
    tab = null;
    vi.spyOn(api, "getTodayFeed").mockReturnValue(new Promise(() => {}));
    render(<FeedView topics={["react"]} />);
    expect(screen.getAllByTestId("skeleton-card").length).toBeGreaterThan(0);
  });

  it("shows an error with Retry that reloads", async () => {
    tab = null;
    const spy = vi
      .spyOn(api, "getTodayFeed")
      .mockRejectedValueOnce(new Error("x"));
    spy.mockResolvedValue(feed);
    render(<FeedView topics={["react"]} />);
    expect(
      await screen.findByText("Couldn't load today's feed"),
    ).toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() =>
      expect(screen.getByText("Title 1")).toBeInTheDocument(),
    );
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe("formatDuration", () => {
  it("formats mm:ss and h:mm:ss", () => {
    expect(formatDuration(65)).toBe("01:05");
    expect(formatDuration(3600)).toBe("1:00:00");
  });
});
