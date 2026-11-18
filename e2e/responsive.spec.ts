import { expect, test } from "@playwright/test";
import { viewports } from "./viewports";

const pages = ["/"];

test("no horizontal page scroll at any viewport", async ({ page }) => {
  for (const path of pages) {
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(path);
      await expect(page.getByRole("banner")).toBeVisible();
      const fits = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      );
      expect(fits, `${path} @ ${vp.name}`).toBe(true);
    }
  }
});

test("header is not sticky on short viewports", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  const position = await page
    .getByRole("banner")
    .evaluate((el) => getComputedStyle(el).position);
  expect(position).not.toBe("sticky");
});
