import { expect, test, type Page } from "@playwright/test";

// Cards on the rendered feed page whose topic label is exactly `topic`.
const cardsOf = (page: Page, topic: string) =>
  page
    .getByRole("main")
    .locator("a[target=_blank]")
    .filter({ has: page.getByText(topic, { exact: true }) });

test("pick, save, come back, change, save", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/topics$/);
  await expect(page.getByText("Pick a few topics to start your feed")).toBeVisible();

  const chips = page.getByRole("list", { name: "Selected topics" });
  const suggestions = page
    .getByRole("list", { name: "Suggested topics" })
    .getByRole("button", { pressed: false });
  const first = (await suggestions.nth(0).innerText()).trim();
  await suggestions.nth(0).click();
  const second = (await suggestions.nth(0).innerText()).trim();
  await suggestions.nth(0).click();
  await page.getByLabel("Custom topic").fill("elixir");
  await page.getByLabel("Custom topic").press("Enter");
  await expect(chips.getByRole("listitem")).toHaveCount(3);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Today's feed", exact: true })).toBeVisible();
  for (const t of [first, second, "elixir"]) {
    await expect(cardsOf(page, t).first(), `cards of ${t}`).toBeVisible();
  }

  await page.reload();
  await expect(page.getByRole("heading", { name: "Today's feed", exact: true })).toBeVisible();
  for (const t of [first, second, "elixir"]) {
    await expect(cardsOf(page, t).first(), `cards of ${t} after reload`).toBeVisible();
  }

  await page.getByRole("link", { name: "Topics", exact: true }).click();
  await expect(page).toHaveURL(/\/topics$/);
  await page.reload();
  await expect(chips.getByRole("listitem")).toHaveCount(3);
  await expect(chips).toContainText(first);
  await expect(chips).toContainText("elixir");

  await page.getByRole("button", { name: "Remove elixir" }).click();
  await page.getByLabel("Custom topic").fill("zig");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/$/);

  await expect(page.getByRole("heading", { name: "Today's feed", exact: true })).toBeVisible();
  await expect(cardsOf(page, "zig").first()).toBeVisible();
  await expect(cardsOf(page, first).first()).toBeVisible();
  await expect(cardsOf(page, "elixir")).toHaveCount(0);
});
