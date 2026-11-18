import { afterEach, describe, expect, it, vi } from "vitest";
import { readTopics, TOPICS_KEY, writeTopics } from "./topics-store";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("topics store", () => {
  it("reads [] when nothing is stored", () => {
    expect(readTopics()).toEqual([]);
  });

  it("writes and reads a JSON array under pfs.topics", () => {
    expect(writeTopics(["react", "rust"])).toBe(true);
    expect(localStorage.getItem(TOPICS_KEY)).toBe('["react","rust"]');
    expect(readTopics()).toEqual(["react", "rust"]);
  });

  it("reads [] for invalid JSON or a non-array", () => {
    localStorage.setItem(TOPICS_KEY, "{oops");
    expect(readTopics()).toEqual([]);
    localStorage.setItem(TOPICS_KEY, '{"a":1}');
    expect(readTopics()).toEqual([]);
  });

  it("drops invalid and duplicate names and keeps at most 10", () => {
    const many = Array.from({ length: 14 }, (_, i) => `topic${i}`);
    localStorage.setItem(
      TOPICS_KEY,
      JSON.stringify(["react", "React", 5, "bad!name", "", ...many]),
    );
    const read = readTopics();
    expect(read).toHaveLength(10);
    expect(read.slice(0, 2)).toEqual(["react", "topic0"]);
  });

  it("survives a throwing localStorage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(readTopics()).toEqual([]);
    expect(writeTopics(["react"])).toBe(false);
  });
});
