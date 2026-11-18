import { expect, test, type Page } from "@playwright/test";

test("feed shows 30 cards in All and 10 in each other tab", async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("pfs.topics"))
      localStorage.setItem("pfs.topics", JSON.stringify(["react", "rust"]));
  });

  await page.goto("/");
  const cards = page.getByRole("main").locator("a[target=_blank]");
  await expect(cards).toHaveCount(30);
  await expectEndLast(page);
  await expect(page.getByRole("link", { name: "Read 10/10" })).toBeVisible();

  for (const tab of ["Read", "Watch", "Listen"]) {
    await page
      .getByRole("navigation", { name: "Feed tabs" })
      .getByRole("link", { name: new RegExp(`^${tab} `) })
      .click();
    await expect(page).toHaveURL(new RegExp(`tab=${tab.toLowerCase()}`));
    await expect(cards).toHaveCount(10);
    await expectEndLast(page);
  }

  await expect(
    page.getByRole("link", { name: "Change topics" }),
  ).toHaveAttribute("href", "/topics");
  await expect(cards.first()).toHaveAttribute("rel", "noopener noreferrer");
});

async function expectEndLast(page: Page) {
  const end = page.getByTestId("end-of-feed");
  await expect(end).toContainText("That's all for today");
  await expect(end).toContainText("Come back tomorrow for a fresh feed");
  expect(await end.evaluate((el) => el.nextElementSibling === null)).toBe(true);
}
