import { expect, test } from "@playwright/test";

const API = "http://localhost:4000";

test("feed shows 30 cards in All and 10 in each other tab", async ({
  page,
  request,
}) => {
  const put = await request.put(`${API}/topics`, {
    data: { names: ["react", "rust"] },
  });
  expect(put.ok()).toBe(true);

  await page.goto("/");
  const cards = page.getByRole("main").locator("a[target=_blank]");
  await expect(cards).toHaveCount(30);
  await expect(page.getByRole("link", { name: "Read 10/10" })).toBeVisible();

  for (const tab of ["Read", "Watch", "Listen"]) {
    await page
      .getByRole("navigation", { name: "Feed tabs" })
      .getByRole("link", { name: new RegExp(`^${tab} `) })
      .click();
    await expect(page).toHaveURL(new RegExp(`tab=${tab.toLowerCase()}`));
    await expect(cards).toHaveCount(10);
  }

  await expect(
    page.getByRole("link", { name: "Change topics" }),
  ).toHaveAttribute("href", "/topics");
  await expect(cards.first()).toHaveAttribute("rel", "noopener noreferrer");
});
