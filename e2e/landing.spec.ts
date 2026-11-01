import { expect, test, type Page } from "@playwright/test";

// ED Solutions landing page at / (spec 0016). Every test starts with no saved theme (a fresh browser context).
const isDark = (page: Page) => page.evaluate(() => document.documentElement.classList.contains("dark"));
const meta = (page: Page, key: string) =>
  page.locator(`meta[property="${key}"], meta[name="${key}"]`).first().getAttribute("content");
const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1280) < 768;
const PERSONAL_IDS = ["hero", "badges", "skills", "projects", "faqs", "contact"];

test("AC-1, AC-2: / answers 200 with the landing sections in order, dark by default", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  expect(response?.request().redirectedFrom()).toBeNull();
  await expect(page).toHaveURL(/\/$/);
  expect(await isDark(page)).toBe(true);
  await expect(page.locator(".brand main")).toHaveCount(1);

  const ids = await page.locator("main > section").evaluateAll((s) => s.map((e) => e.id));
  expect(ids).toEqual(["pitch", "services", "ecosystem", "start"]);
  await expect(page.locator("main + footer")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveCount(1);
  for (const id of ["services", "ecosystem", "start"]) {
    await expect(page.locator(`#${id} h2`)).toHaveCount(1);
  }
  for (const id of ["pitch", "services", "ecosystem", "start"]) {
    await expect(page.locator(`#${id}`)).toHaveAttribute("aria-labelledby", `${id}-heading`);
  }
  for (const id of PERSONAL_IDS) await expect(page.locator(`[id="${id}"]`)).toHaveCount(0);
});

test("AC-3 to AC-6: hero, services, products teaser, and closing call to action", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator("#pitch");
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText("I build the connected systems small businesses run on.");
  await expect(hero.getByText("I don't build marketing sites. I build the systems behind them.")).toBeVisible();
  await expect(hero.getByText("Application Developer at IBM by day, building for small businesses.")).toBeVisible();
  await expect(hero.getByRole("link", { name: "Tell me about your project" })).toHaveAttribute("href", "/contact");

  const services = page.locator("#services");
  await expect(services.getByText("What I build", { exact: true })).toBeVisible();
  await expect(services.getByRole("listitem")).toHaveCount(3);
  await expect(services.getByRole("heading", { level: 3 })).toHaveCount(3);

  const ecosystem = page.locator("#ecosystem");
  await expect(ecosystem.getByRole("heading", { level: 2 })).toHaveText("Systems already running");
  const cards = ecosystem.getByRole("listitem");
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(3);
  await expect(cards.first().getByText("Built", { exact: true })).toBeVisible();
  await expect(ecosystem.getByRole("link", { name: "See every product" })).toHaveAttribute("href", "/products");

  await page.locator("#start").getByRole("link", { name: "Tell me about your project" }).click();
  await expect(page).toHaveURL(/\/contact$/);
});

test("AC-7: the brand menu lists its three items and moves between pages", async ({ page }) => {
  await page.goto("/products");
  await page.waitForLoadState("networkidle");
  await page.locator("header .size-11").click();
  const menu = page.locator("header nav");
  await expect(menu.getByRole("link")).toHaveText(["What I build", "Products", "Contact"]);
  await menu.getByRole("link", { name: "What I build" }).click();
  await expect(page).toHaveURL(/\/#services$/);
  await expect(page.locator("#services")).toBeInViewport();

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  // A marker on window survives a smooth scroll but not a reload.
  await page.evaluate(() => ((window as unknown as { marker: number }).marker = 1));
  await page.locator("header .size-11").click();
  await page.locator("header nav").getByRole("link", { name: "What I build" }).click();
  await expect(page.locator("#services")).toBeInViewport();
  expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1);

  await page.goto("/contact");
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: "ED Solutions" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("#pitch")).toBeVisible();
});

test("AC-8, AC-15: brand footer copy, and the /personal footer is unchanged", async ({ page }) => {
  for (const path of ["/", "/products"]) {
    await page.goto(path);
    const footer = page.locator("footer");
    expect(await footer.getAttribute("id")).toBeNull();
    await expect(footer.getByText("Taking on new projects")).toBeVisible();
    await expect(footer.getByText("Seeking Full-Time Employment Opportunities")).toHaveCount(0);
    await expect(footer.locator('a[href^="/personal#"]')).toHaveCount(0);
    await expect(footer.getByText("Copyright © Erskine Duenas, ED Solutions • All rights reserved")).toBeVisible();
    await expect(footer.locator("nav a")).toHaveText(["What I build", "Products", "Contact", "For employers: my portfolio"]);
    await expect(footer.getByRole("button", { name: "Contact Me" })).toBeVisible();
  }
  await page.waitForLoadState("networkidle");
  await page.locator("footer").getByRole("link", { name: "For employers: my portfolio" }).click();
  await expect(page).toHaveURL(/\/personal$/);
  const footer = page.locator("footer");
  await expect(footer).toHaveAttribute("id", "contact");
  await expect(footer.getByText("Seeking Full-Time Employment Opportunities")).toBeVisible();
});

test("AC-9: old /#section links forward to /personal, and Back skips /", async ({ page }) => {
  await page.goto("/products");
  await page.goto("/#projects");
  await expect(page).toHaveURL(/\/personal#projects$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/products$/);

  await page.goto("/#services");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/#services$/);
});

test("AC-10, AC-11: metadata, share card, and Organization JSON-LD", async ({ page, request }) => {
  await page.goto("/");
  const title = "ED Solutions | Connected systems for small businesses";
  await expect(page).toHaveTitle(title);
  expect(await meta(page, "description")).toMatch(/^Erskine Duenas builds the connected systems/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https:\/\/ed-solutions\.dev\/?$/);
  expect(await meta(page, "og:site_name")).toBe("ED Solutions");
  expect(await meta(page, "og:title")).toBe(title);
  expect(await meta(page, "og:url")).toMatch(/^https:\/\/ed-solutions\.dev\/?$/);
  expect(await meta(page, "og:image:alt")).toBe("ED Solutions, I build the connected systems small businesses run on");
  for (const key of ["og:image", "twitter:image"]) {
    const card = await request.get((await meta(page, key))!);
    expect(card.headers()["content-type"]).toBe("image/png");
    const png = await card.body();
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  }
  const icons = await page.locator('link[rel="icon"]').evaluateAll((links) => links.map((l) => l.getAttribute("href")));
  expect(icons).toEqual(["/icons/ed-solutions.svg"]);

  const scripts = page.locator('script[type="application/ld+json"]');
  await expect(scripts).toHaveCount(1);
  const ld = JSON.parse((await scripts.textContent())!);
  expect(ld).toMatchObject({
    "@type": "Organization",
    name: "ED Solutions",
    url: "https://ed-solutions.dev/",
    founder: { "@type": "Person", url: "https://ed-solutions.dev/personal" },
  });
});

test("AC-12: the sitemap lists / first", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  expect(locs).toEqual([
    "https://ed-solutions.dev/",
    "https://ed-solutions.dev/personal",
    "https://ed-solutions.dev/products",
    "https://ed-solutions.dev/contact",
  ]);
});

test("AC-13: no horizontal scroll in either theme, and the cards stack on mobile", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(await noHorizontalScroll(page)).toBe(true);
  const columns = await page
    .locator("#services ul")
    .evaluate((ul) => getComputedStyle(ul).gridTemplateColumns.split(" ").length);
  expect(columns).toBe(isMobile(page) ? 1 : 3);
  await page.locator("header button").last().click();
  await expect.poll(() => isDark(page)).toBe(false);
  expect(await noHorizontalScroll(page)).toBe(true);
});

test("AC-14: Tab reaches the hero call to action with a visible focus ring", async ({ page }) => {
  test.skip(isMobile(page), "the keyboard pass runs on desktop");
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const hero = page.locator("#pitch").getByRole("link", { name: "Tell me about your project" });
  // The closed menu's links sat in a zero height wrapper and took the first Tab stops, unseen (bug fixed with inert).
  await page.keyboard.press("Tab");
  await expect(page.locator("header").getByRole("link", { name: "ED Solutions" })).toBeFocused();
  const menuLinks = page.locator("header nav a");
  for (let i = 0; i < 15; i++) {
    expect(await menuLinks.evaluateAll((links) => links.includes(document.activeElement as HTMLAnchorElement))).toBe(false);
    if (await hero.evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(hero).toBeFocused();
  expect(await hero.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe("none");
});
