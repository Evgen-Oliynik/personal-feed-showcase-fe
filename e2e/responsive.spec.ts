import { expect, test } from "@playwright/test";
import { viewports } from "./viewports";

const pages = ["/", "/topics"];

test("no horizontal page scroll at any viewport", async ({ page }) => {
  for (const path of pages) {
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(path);
      // With no topics saved, "/" redirects to "/topics".
      await page.waitForURL("**/topics");
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
  await page.goto("/topics");
  const position = await page
    .getByRole("banner")
    .evaluate((el) => getComputedStyle(el).position);
  expect(position).not.toBe("sticky");
});

test("topics controls are at least 44x44 on smartphone and tablet", async ({ page }) => {
  for (const vp of viewports.filter((v) => v.width < 1024)) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/topics");
    await page.getByLabel("Custom topic").fill("a");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    const controls = page
      .getByRole("main")
      .locator("button:visible");
    const count = await controls.count();
    expect(count).toBeGreaterThan(3);
    for (let i = 0; i < count; i++) {
      const box = await controls.nth(i).boundingBox();
      expect(box!.width, `${vp.name} control ${i}`).toBeGreaterThanOrEqual(43.9);
      expect(box!.height, `${vp.name} control ${i}`).toBeGreaterThanOrEqual(43.9);
    }
    const fontSize = await page
      .getByLabel("Custom topic")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(16);
  }
});
