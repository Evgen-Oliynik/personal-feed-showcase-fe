import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/lib/api";
import { TopicsEditor } from "./topics-editor";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const topic = (name: string, id = 1) => ({ id, name, createdAt: "2026-01-01" });

function setup(saved: string[] = [], suggestions = ["react", "rust", "ai"]) {
  vi.spyOn(api, "getTopics").mockResolvedValue(saved.map((n, i) => topic(n, i)));
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
    const replace = vi.spyOn(api, "replaceTopics");
    await screen.findByText("0/10 selected");
    await user.type(screen.getByLabelText("Custom topic"), "Elixir");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByRole("button", { name: "Remove elixir" })).toBeInTheDocument();
    expect(screen.getByLabelText("Custom topic")).toHaveValue("");
    await user.type(screen.getByLabelText("Custom topic"), "c++{Enter}");
    expect(screen.getByRole("button", { name: "Remove c++" })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
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
    let resolve!: () => void;
    const replace = vi.spyOn(api, "replaceTopics").mockReturnValue(
      new Promise((r) => {
        resolve = () => r([]);
      }),
    );
    await user.click(saveButton());
    expect(saveButton()).toBeDisabled();
    expect(replace).toHaveBeenCalledWith(["ai"]);
    resolve();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
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

  it("shows the 400 message", async () => {
    const user = setup([]);
    vi.spyOn(api, "replaceTopics").mockRejectedValue(new ApiError(400, "bad"));
    await user.click(await screen.findByRole("button", { name: "ai" }));
    await user.click(saveButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Use 1–40 letters, digits, spaces or . + # -",
    );
    expect(push).not.toHaveBeenCalled();
    expect(saveButton()).toBeEnabled();
  });

  it("shows the 422 message", async () => {
    const user = setup([]);
    vi.spyOn(api, "replaceTopics").mockRejectedValue(new ApiError(422, "too many"));
    await user.click(await screen.findByRole("button", { name: "ai" }));
    await user.click(saveButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("You can follow up to 10 topics");
  });
});
