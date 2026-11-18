import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChatEvent, ChatSource } from "@/lib/chat";
import { ChatPanel } from "./chat-panel";

const askChat = vi.fn();
vi.mock("@/lib/chat", async (orig) => ({
  ...(await orig<typeof import("@/lib/chat")>()),
  askChat: (...a: unknown[]) => askChat(...a),
}));

const source = (n: number): ChatSource => ({
  n,
  id: n,
  title: `Source ${n}`,
  url: `https://example.test/${n}`,
  type: n === 1 ? "read" : "watch",
  source: "devto",
});

async function* events(list: ChatEvent[]) {
  yield* list;
}

async function ask(q: string) {
  const user = userEvent.setup();
  render(<ChatPanel onClose={() => {}} />);
  const send = screen.getByRole("button", { name: "Send" });
  expect(send).toBeDisabled();
  await user.type(screen.getByLabelText("Question"), q);
  await user.click(send);
  return user;
}

afterEach(() => {
  cleanup();
  askChat.mockReset();
});

describe("ChatPanel", () => {
  it("grows the answer with deltas, links [n] and lists sources", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    askChat.mockImplementation(async function* () {
      yield { type: "sources", sources: [source(1), source(2)] };
      yield { type: "delta", text: "See [1]" };
      await gate;
      yield { type: "delta", text: " and [2]." };
      yield { type: "done" };
    });
    await ask("what?");
    await waitFor(() =>
      expect(screen.getByTestId("answer")).toHaveTextContent("See [1]"),
    );
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    release();
    await waitFor(() =>
      expect(screen.getByTestId("answer")).toHaveTextContent(
        "See [1] and [2].",
      ),
    );
    const link = screen.getByRole("link", { name: "[2]" });
    expect(link).toHaveAttribute("href", "https://example.test/2");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    const list = screen.getByRole("region", { name: "Sources" });
    expect(list).toHaveTextContent("Read");
    expect(list).toHaveTextContent("Watch");
    expect(screen.getByRole("link", { name: "Source 1" })).toHaveAttribute(
      "href",
      "https://example.test/1",
    );
    expect(screen.getByText("what?")).toBeInTheDocument();
  });

  it("shows the not-in-materials answer as a muted notice without sources", async () => {
    askChat.mockImplementation(() =>
      events([
        { type: "sources", sources: [] },
        { type: "delta", text: "This is not in the collected materials" },
        { type: "done" },
      ]),
    );
    await ask("x");
    expect(await screen.findByTestId("not-covered")).toHaveClass(
      "text-zinc-500",
    );
    expect(screen.queryByText("Sources")).not.toBeInTheDocument();
  });

  it("shows the unavailable message on error", async () => {
    askChat.mockImplementation(() => events([{ type: "error" }]));
    await ask("x");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The assistant is unavailable right now",
    );
  });

  it("keeps previous question/answer pairs", async () => {
    askChat.mockImplementation(() =>
      events([{ type: "delta", text: "Answer" }, { type: "done" }]),
    );
    const user = await ask("first");
    await screen.findByText("Answer");
    await user.type(screen.getByLabelText("Question"), "second");
    await user.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() =>
      expect(screen.getAllByTestId("answer")).toHaveLength(2),
    );
    expect(screen.getByText("first")).toBeInTheDocument();
    expect(screen.getByText("second")).toBeInTheDocument();
  });
});
