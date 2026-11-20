import { expect, test } from "@playwright/test";

const API = "http://localhost:4000";

test("ask a question and see a source link to a URL from today's feed", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() =>
    localStorage.setItem("pfs.topics", JSON.stringify(["react", "rust"])),
  );
  const feed = await (
    await request.get(`${API}/feed/today?topics=react,rust`)
  ).json();
  const urls = new Set<string>(feed.items.map((i: { url: string }) => i.url));

  await page.goto("/");
  const drawer = page.getByRole("complementary", {
    name: "Ask about today's feed",
  });
  await expect(drawer).toBeVisible();
  await drawer.getByLabel("Question").fill("react");
  await drawer.getByRole("button", { name: "Send" }).click();

  const sources = drawer.getByRole("region", { name: "Sources" });
  await expect(sources).toBeVisible();
  const href = await sources.getByRole("link").first().getAttribute("href");
  expect(urls.has(href!)).toBe(true);
  await expect(sources.getByRole("link").first()).toHaveAttribute(
    "target",
    "_blank",
  );
  await expect(
    drawer.getByTestId("answer").getByRole("link", { name: "[1]" }),
  ).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Send" })).toBeDisabled();
});

test("a follow-up question carries the first question/answer pair as history", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() =>
    localStorage.setItem("pfs.topics", JSON.stringify(["react", "rust"])),
  );
  const bodies: { question: string; history: unknown[] }[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && req.url().endsWith("/chat"))
      bodies.push(req.postDataJSON());
  });

  await page.goto("/");
  const drawer = page.getByRole("complementary", {
    name: "Ask about today's feed",
  });
  const send = drawer.getByRole("button", { name: "Send" });
  await drawer.getByLabel("Question").fill("react");
  await send.click();
  await expect(drawer.getByTestId("answer")).toHaveCount(1);
  await drawer.getByLabel("Question").fill("and more?");
  await expect(send).toBeEnabled();
  const first = (await drawer.getByTestId("answer").textContent())!.trim();
  await send.click();
  await expect(drawer.getByTestId("answer")).toHaveCount(2);

  expect(bodies).toHaveLength(2);
  expect(bodies[0].history).toEqual([]);
  expect(bodies[1].question).toBe("and more?");
  expect(bodies[1].history).toEqual([
    { role: "user", content: "react" },
    { role: "assistant", content: first },
  ]);
});
