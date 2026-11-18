import { expect, test } from "@playwright/test";

const API = "http://localhost:4000";

test("pick, save, come back, change, save", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/topics$/);
  await expect(page.getByText("Pick a few topics to start your feed")).toBeVisible();

  const chips = page.getByRole("list", { name: "Selected topics" });
  const suggestions = page
    .getByRole("list", { name: "Suggested topics" })
    .getByRole("button", { pressed: false });
  const first = (await suggestions.nth(0).innerText()).trim();
  await suggestions.nth(0).click();
  await suggestions.nth(0).click();
  await page.getByLabel("Custom topic").fill("elixir");
  await page.getByLabel("Custom topic").press("Enter");
  await expect(chips.getByRole("listitem")).toHaveCount(3);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Today's feed" })).toBeVisible();

  await page.getByRole("link", { name: "Topics" }).click();
  await expect(chips.getByRole("listitem")).toHaveCount(3);
  await expect(chips).toContainText(first);
  await expect(chips).toContainText("elixir");

  await page.getByRole("button", { name: "Remove elixir" }).click();
  await page.getByLabel("Custom topic").fill("zig");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/$/);

  const feed = await (await request.get(`${API}/feed/today`)).json();
  const topics = new Set<string>(feed.items.map((i: { topic: string }) => i.topic));
  expect(topics.has("zig")).toBe(true);
  expect(topics.has("elixir")).toBe(false);
});
