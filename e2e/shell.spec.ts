import { expect, test } from "@playwright/test";

test("shell shows the header and nav", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner")).toContainText("Personal Feed");
  await expect(page.getByRole("link", { name: "Feed" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("link", { name: "Topics" })).toHaveAttribute(
    "href",
    "/topics",
  );
});
