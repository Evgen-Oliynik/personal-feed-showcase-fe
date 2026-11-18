import { expect, test } from "@playwright/test";
import { viewports } from "./viewports";

const API = "http://localhost:4000";

const fixtureFeed = {
  date: "2026-11-18",
  builtAt: null,
  limits: { read: 10, watch: 10, listen: 10 },
  counts: { read: 3, watch: 0, listen: 0 },
  items: [1, 2, 3].map((id) => ({
    id,
    url: `https://example.test/${id}`,
    type: "read",
    source: "devto",
    topic: "react",
    title: `Title ${id}`,
    summary: Array.from({ length: 80 }, (_, i) => `word${i}`).join(" "),
    author: null,
    imageUrl: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"/>')}`,
    publishedAt: "2026-11-17T10:00:00Z",
    durationSec: null,
  })),
};

function expectedRange(width: number) {
  if (width < 640) return { lines: 2, thumb: 72 };
  if (width < 1024) return { lines: 3, thumb: 120 };
  if (width < 1280) return { lines: 4, thumb: 160 };
  return { lines: null, thumb: 200 };
}

// Leave the shared backend with no topics: the other cases expect "/" to redirect.
test.afterEach(async ({ request }) => {
  const topics = await (await request.get(`${API}/topics`)).json();
  for (const t of topics) await request.delete(`${API}/topics/${t.id}`);
});

test("feed layout per viewport: one column, clamp and thumbnail", async ({
  page,
  request,
}) => {
  await request.put(`${API}/topics`, { data: { names: ["react", "rust"] } });
  await page.route(`${API}/feed/today`, (route) =>
    route.fulfill({ json: fixtureFeed }),
  );
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/");
    const cards = page.getByRole("main").locator("a[target=_blank]");
    await expect(cards).toHaveCount(3);
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(fits, `no h-scroll @ ${vp.name}`).toBe(true);
    const lefts = await cards.evaluateAll((els) =>
      els.map((e) => Math.round(e.getBoundingClientRect().left)),
    );
    expect(new Set(lefts).size, `one column @ ${vp.name}`).toBe(1);
    const want = expectedRange(vp.width);
    const summary = page.getByTestId("summary").first();
    const clamp = await summary.evaluate(
      (el) => getComputedStyle(el).webkitLineClamp,
    );
    expect(clamp, `clamp @ ${vp.name}`).toBe(
      want.lines === null ? "none" : String(want.lines),
    );
    const thumb = await page.getByTestId("thumbnail").first().boundingBox();
    expect(Math.round(thumb!.width), `thumb @ ${vp.name}`).toBe(want.thumb);
    if (vp.width >= 1280) {
      const box = await cards.first().boundingBox();
      expect(box!.width).toBeLessThanOrEqual(960);
    }
    if (vp.width < 1024) {
      for (const link of await page
        .getByRole("link", { name: /^(All|Read|Watch|Listen)/ })
        .all()) {
        expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(43.9);
      }
    }
  }
});

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

test("topics controls are at least 44x44 on smartphone and tablet", async ({
  page,
}) => {
  for (const vp of viewports.filter((v) => v.width < 1024)) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/topics");
    await page.getByLabel("Custom topic").fill("a");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    const controls = page.getByRole("main").locator("button:visible");
    const count = await controls.count();
    expect(count).toBeGreaterThan(3);
    for (let i = 0; i < count; i++) {
      const box = await controls.nth(i).boundingBox();
      expect(box!.width, `${vp.name} control ${i}`).toBeGreaterThanOrEqual(
        43.9,
      );
      expect(box!.height, `${vp.name} control ${i}`).toBeGreaterThanOrEqual(
        43.9,
      );
    }
    const fontSize = await page
      .getByLabel("Custom topic")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(16);
  }
});
