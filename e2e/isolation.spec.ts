import { expect, test, type Browser, type Page } from "@playwright/test";

const API = "http://localhost:4000";

async function visitor(browser: Browser, topics: string[]) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await context.addInitScript((t) => {
    // Seed once; later changes made by the test survive reloads.
    if (!localStorage.getItem("pfs.topics"))
      localStorage.setItem("pfs.topics", JSON.stringify(t));
  }, topics);
  const page = await context.newPage();
  await page.goto("/");
  return { context, page };
}

// Topic labels of every card on the rendered feed page.
async function feedTopics(page: Page) {
  const cards = page.getByRole("main").locator("a[target=_blank]");
  await expect(cards.first()).toBeVisible();
  const labels = new Set<string>();
  for (const topic of ["react", "rust", "go"]) {
    const n = await cards
      .filter({ has: page.getByText(topic, { exact: true }) })
      .count();
    if (n > 0) labels.add(topic);
  }
  return [...labels].sort();
}

test("two visitors never affect each other", async ({ browser, request }) => {
  const a = await visitor(browser, ["react", "rust"]);
  const b = await visitor(browser, ["go"]);

  expect(await feedTopics(a.page)).toEqual(["react", "rust"]);
  expect(await feedTopics(b.page)).toEqual(["go"]);

  // B changes its topics; A's feed after a reload is unchanged.
  await b.page.evaluate(() =>
    localStorage.setItem("pfs.topics", JSON.stringify(["rust"])),
  );
  await b.page.reload();
  expect(await feedTopics(b.page)).toEqual(["rust"]);
  await a.page.reload();
  expect(await feedTopics(a.page)).toEqual(["react", "rust"]);

  // A's chat answers only from A's feed.
  const feed = await (
    await request.get(`${API}/feed/today?topics=react,rust`)
  ).json();
  const urls = new Set<string>(feed.items.map((i: { url: string }) => i.url));
  const drawer = a.page.getByRole("complementary", {
    name: "Ask about today's feed",
  });
  await drawer.getByLabel("Question").fill("react");
  await drawer.getByRole("button", { name: "Send" }).click();
  const links = drawer
    .getByRole("region", { name: "Sources" })
    .getByRole("link");
  await expect(links.first()).toBeVisible();
  for (const link of await links.all()) {
    expect(urls.has((await link.getAttribute("href"))!)).toBe(true);
  }

  await a.context.close();
  await b.context.close();
});
