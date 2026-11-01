import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// ED Solutions brand (spec 0015). Every test starts with no saved theme (a fresh browser context).
const isDark = (page: Page) => page.evaluate(() => document.documentElement.classList.contains("dark"));
const meta = (page: Page, property: string) => page.locator(`meta[property="${property}"]`).getAttribute("content");

for (const [path, title, headline] of [
  ["/products", "Products | ED Solutions", "Products for small and medium businesses"],
  ["/contact", "Contact | ED Solutions", "Tell me about your project"],
] as const) {
  test(`AC-2 to AC-6: ${path} carries the brand`, async ({ page, request }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    expect(await isDark(page)).toBe(true);
    await expect(page.locator(".brand")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "ED Solutions" })).toBeVisible();
    await expect(page.getByText("Erskine Duenas", { exact: true })).toHaveCount(0);
    expect(await meta(page, "og:site_name")).toBe("ED Solutions");
    expect(await meta(page, "og:title")).toBe(title);
    expect(await meta(page, "og:image:alt")).toBe(`ED Solutions, ${headline}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    const icons = await page.locator('link[rel="icon"]').evaluateAll((links) =>
      links.map((l) => [l.getAttribute("href"), l.getAttribute("type")]),
    );
    expect(icons).toEqual([["/icons/ed-solutions.svg", "image/svg+xml"]]);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/icons/ed-solutions-180.png");
    for (const file of ["/icons/ed-solutions.svg", "/icons/ed-solutions-180.png"]) {
      expect((await request.get(file)).status()).toBe(200);
    }

    for (const property of ["og:image", "twitter:image"]) {
      const card = await request.get((await page.locator(`meta[property="${property}"], meta[name="${property}"]`).first().getAttribute("content"))!);
      expect(card.headers()["content-type"]).toBe("image/png");
      const png = await card.body();
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
    }
  });
}

test("AC-3: a first visit crosses between groups on each group's default", async ({ page }) => {
  await page.goto("/personal");
  await page.waitForLoadState("networkidle");
  expect(await isDark(page)).toBe(false);
  await page.locator("footer").getByRole("button", { name: "Contact Me" }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect.poll(() => isDark(page)).toBe(true);
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: "ED Solutions" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("#pitch")).toBeVisible();
  expect(await isDark(page)).toBe(true);
  // The way back to the portfolio is the brand footer's employer link (spec 0016, AC-8).
  await page.locator("footer").getByRole("link", { name: "For employers: my portfolio" }).click();
  await expect(page).toHaveURL(/\/personal$/);
  await expect.poll(() => isDark(page)).toBe(false);
});

test("AC-3: a picked theme holds on every page", async ({ page }) => {
  await page.goto("/products");
  await page.waitForLoadState("networkidle");
  expect(await isDark(page)).toBe(true);
  await page.locator("header button").last().click();
  await expect.poll(() => isDark(page)).toBe(false);
  await page.getByRole("link", { name: "ED Solutions" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await isDark(page)).toBe(false);
  await page.locator("footer").getByRole("link", { name: "For employers: my portfolio" }).click();
  await expect(page).toHaveURL(/\/personal$/);
  await page.waitForLoadState("networkidle");
  expect(await isDark(page)).toBe(false);
  await page.locator("footer").getByRole("button", { name: "Contact Me" }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await page.waitForTimeout(500);
  expect(await isDark(page)).toBe(false);
  await page.reload();
  expect(await isDark(page)).toBe(false);
});

test("AC-3: a stale saved system value counts as no choice", async ({ page }) => {
  await page.goto("/personal");
  await page.evaluate(() => localStorage.setItem("theme", "system"));
  await page.goto("/contact");
  expect(await isDark(page)).toBe(true);
});

test("AC-7 to AC-9: /personal, the studio, and unmatched URLs keep the old look and icon", async ({ page, request }) => {
  await page.goto("/personal");
  await expect(page).toHaveTitle("Erskine Duenas | Software Engineer and Aspiring Architect");
  expect(await meta(page, "og:site_name")).toBe("Erskine Duenas");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/icons/erskine-duenas.ico");
  await expect(page.locator(".brand")).toHaveCount(0);

  const oldIcon = readFileSync("public/icons/erskine-duenas.ico");
  for (const file of ["/favicon.ico", "/icons/erskine-duenas.ico"]) {
    expect(Buffer.compare(await (await request.get(file)).body(), oldIcon)).toBe(0);
  }

  await page.goto("/studio/login");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/icons/erskine-duenas.ico");
  await expect(page.locator(".brand")).toHaveCount(0);
  expect(await isDark(page)).toBe(false);

  const missing = await page.goto("/does-not-exist");
  expect(missing?.status()).toBe(404);
  await expect(page.locator(".brand")).toHaveCount(0);
});
