import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { TOPICS_KEY } from "@/lib/topics-store";
import { TopicsEditor } from "./topics-editor";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function setup(saved: string[] = [], suggestions = ["react", "rust", "ai"]) {
  localStorage.clear();
  if (saved.length) localStorage.setItem(TOPICS_KEY, JSON.stringify(saved));
  vi.spyOn(globalThis, "fetch");
  vi.spyOn(api, "getSuggestions").mockResolvedValue(suggestions);
  render(<TopicsEditor />);
  return userEvent.setup();
}

const saveButton = () => screen.getByRole("button", { name: "Save" });

describe("TopicsEditor", () => {
  beforeEach(() => push.mockReset());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("pre-selects saved topics with a remove button", async () => {
    setup(["react", "go"]);
    expect(await screen.findByRole("button", { name: "Remove go" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove react" })).toBeInTheDocument();
    expect(screen.getByText("2/10 selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "react", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "rust", pressed: false })).toBeInTheDocument();
  });

  it("shows the empty prompt when nothing is saved", async () => {
    setup([]);
    expect(await screen.findByText("Pick a few topics to start your feed")).toBeInTheDocument();
  });

  it("toggles suggestions and removes with ×", async () => {
    const user = setup([]);
    await user.click(await screen.findByRole("button", { name: "rust" }));
    expect(screen.getByRole("button", { name: "Remove rust" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "rust", pressed: true })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "rust", pressed: true }));
    expect(screen.queryByRole("button", { name: "Remove rust" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "ai" }));
    await user.click(screen.getByRole("button", { name: "Remove ai" }));
    expect(screen.getByText("0/10 selected")).toBeInTheDocument();
  });

  it("adds a custom topic with the button and with Enter, without saving", async () => {
    const user = setup([]);
    await screen.findByText("0/10 selected");
    await user.type(screen.getByLabelText("Custom topic"), "Elixir");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByRole("button", { name: "Remove elixir" })).toBeInTheDocument();
    expect(screen.getByLabelText("Custom topic")).toHaveValue("");
    await user.type(screen.getByLabelText("Custom topic"), "c++{Enter}");
    expect(screen.getByRole("button", { name: "Remove c++" })).toBeInTheDocument();
    expect(localStorage.getItem(TOPICS_KEY)).toBeNull();
  });

  it("disables Save when empty, unchanged, or in flight", async () => {
    const user = setup(["react"]);
    await screen.findByRole("button", { name: "Remove react" });
    expect(saveButton()).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "rust" }));
    expect(saveButton()).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Remove rust" }));
    expect(saveButton()).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Remove react" }));
    expect(saveButton()).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "ai" }));
    await user.click(saveButton());
    expect(JSON.parse(localStorage.getItem(TOPICS_KEY)!)).toEqual(["ai"]);
    expect(push).toHaveBeenCalledWith("/");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("blocks an 11th topic", async () => {
    const names = Array.from({ length: 10 }, (_, i) => `topic${i}`);
    const user = setup(names);
    await screen.findByText("10/10 selected");
    await user.type(screen.getByLabelText("Custom topic"), "extra");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByRole("alert")).toHaveTextContent("You can follow up to 10 topics");
    expect(screen.getByText("10/10 selected")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove extra" })).toBeNull();
  });

  it("shows the invalid-name message client-side", async () => {
    const user = setup([]);
    await screen.findByText("0/10 selected");
    await user.type(screen.getByLabelText("Custom topic"), "bad!name{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Use 1–40 letters, digits, spaces or . + # -",
    );
    expect(screen.queryByRole("button", { name: "Remove bad!name" })).toBeNull();
  });

  it("rejects a non-Latin name", async () => {
    const user = setup([]);
    await screen.findByText("0/10 selected");
    await user.type(screen.getByLabelText("Custom topic"), "кава{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Use 1–40 letters, digits, spaces or . + # -",
    );
    expect(screen.queryByRole("button", { name: "Remove кава" })).toBeNull();
  });

  it("shows an error and stays when the write fails", async () => {
    const user = setup([]);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    await user.click(await screen.findByRole("button", { name: "ai" }));
    await user.click(saveButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save");
    expect(push).not.toHaveBeenCalled();
  });
});
