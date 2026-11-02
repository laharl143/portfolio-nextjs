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

// Spec 0017: the hero motion, portrait, and socials.
const SOCIALS = [
  ["LinkedIn", "https://www.linkedin.com/in/erskine-duenas/"],
  ["GitHub", "https://github.com/laharl143"],
  ["Codewars", "https://www.codewars.com/users/laharl143"],
  ["MonkeyType", "https://monkeytype.com/profile/laharl143"],
  ["Facebook", "https://www.facebook.com/erskine.duenas/"],
] as const;
const zoom = (page: Page) => page.getByTestId("landing-portrait-zoom");
const transformOf = (page: Page) => zoom(page).evaluate((el) => getComputedStyle(el).transform);

test("0017 AC-1, AC-2, AC-4: split hero, words revealed by 500ms, LinkedIn and GitHub beside the button", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator("#pitch");
  await expect(hero.locator(".brand-reveal-word")).toHaveCount(9);
  await page.waitForTimeout(600);
  const opacities = await hero
    .locator(".brand-reveal-word, .brand-rise")
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
  expect(opacities.every((o) => o === "1")).toBe(true);

  const cta = hero.getByRole("link", { name: "Tell me about your project" });
  for (const [label, href] of SOCIALS.slice(0, 2)) {
    const link = hero.getByRole("link", { name: `${label} (opens in a new tab)` });
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    const box = (await link.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const ctaBox = (await cta.boundingBox())!;
  const portraitBox = (await zoom(page).boundingBox())!;
  const linkedInBox = (await hero.getByRole("link", { name: "LinkedIn (opens in a new tab)" }).boundingBox())!;
  if (isMobile(page)) {
    expect(linkedInBox.y).toBeGreaterThan(ctaBox.y + ctaBox.height - 1);
    expect(portraitBox.y).toBeGreaterThan(linkedInBox.y);
  } else {
    expect(linkedInBox.x).toBeGreaterThan(ctaBox.x + ctaBox.width - 1);
    expect(portraitBox.x).toBeGreaterThan(ctaBox.x + ctaBox.width);
  }
  await expect(hero.getByRole("img", { name: "Erskine Duenas from behind, wearing an eat sleep code shirt" })).toBeVisible();
});

test("0017 AC-3: the portrait zooms inside its frame as the page scrolls", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(await transformOf(page)).toBe("none");
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect.poll(async () => (await transformOf(page)).match(/^matrix\(([\d.]+)/)?.[1]).toBe("1.12");
  expect(await noHorizontalScroll(page)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => transformOf(page)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
});

test("0017 AC-6: the scroll hint shows from md up and is hidden from assistive tech", async ({ page }) => {
  await page.goto("/");
  const hint = page.locator("#pitch .brand-scroll-chevron").first().locator("..");
  await expect(hint).toHaveAttribute("aria-hidden", "true");
  if (isMobile(page)) {
    await expect(hint).toBeHidden();
    return;
  }
  await expect(hint).toBeVisible();
  expect(await hint.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  const cta = (await page.locator("#pitch").getByRole("link", { name: "Tell me about your project" }).boundingBox())!;
  expect((await hint.boundingBox())!.y).toBeGreaterThan(cta.y + cta.height);
});

test("0017 AC-6: on common laptop sizes the scroll hint sits in the first viewport, below the button", async ({ page }) => {
  test.skip(isMobile(page), "the hint is hidden below md");
  for (const size of [
    { width: 1366, height: 768 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("/");
    const hint = (await page.locator("#pitch .brand-scroll-chevron").first().locator("..").boundingBox())!;
    const cta = (await page.locator("#pitch").getByRole("link", { name: "Tell me about your project" }).boundingBox())!;
    expect(hint.y + hint.height).toBeLessThanOrEqual(size.height);
    expect(hint.y).toBeGreaterThan(cta.y + cta.height);
  }
});

test("0017 AC-8: reduced motion renders everything still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const names = await page
    .locator("#pitch .brand-reveal-word, #pitch .brand-rise, #pitch .brand-scroll-chevron")
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).animationName));
  expect(names.every((n) => n === "none")).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(300);
  expect(await transformOf(page)).toBe("none");
});

test.describe("0017 AC-2: no JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the headline is in the server HTML and visible", async ({ page }) => {
    await page.goto("/");
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveText("I build the connected systems small businesses run on.");
    await expect(h1).toBeVisible();
  });
});

test("0017 AC-5: the brand footer lists all five socials; /personal keeps its footer", async ({ page }) => {
  for (const path of ["/", "/products"]) {
    await page.goto(path);
    const links = page.locator("footer").getByRole("list", { name: "Social links" }).getByRole("link");
    await expect(links).toHaveCount(5);
    for (const [i, [label, href]] of SOCIALS.entries()) {
      await expect(links.nth(i)).toHaveAccessibleName(`${label} (opens in a new tab)`);
      await expect(links.nth(i)).toHaveAttribute("href", href);
      await expect(links.nth(i)).toHaveAttribute("target", "_blank");
    }
  }
  await page.goto("/personal");
  await expect(page.locator("footer").getByRole("list", { name: "Social links" })).toHaveCount(0);
});

// Spec 0018: quiet calls to action at the end of #services and #ecosystem.
const CTA = "Tell me about your project";
const ringOf = (page: Page) => page.evaluate(() => getComputedStyle(document.activeElement!).boxShadow);
const tabTo = async (page: Page, target: ReturnType<Page["locator"]>) => {
  for (let i = 0; i < 40; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
};

test("0018 AC-1 to AC-3, AC-6: section links go to /contact, quiet look, and wrap on mobile", async ({ page }) => {
  await page.goto("/");
  const services = page.locator("#services").getByRole("link", { name: CTA });
  const ecosystem = page.locator("#ecosystem").getByRole("link");
  await expect(services).toHaveAttribute("href", "/contact");
  await expect(ecosystem).toHaveText([CTA, "See every product"]);
  await expect(ecosystem.first()).toHaveAttribute("href", "/contact");

  for (const link of [services, ecosystem.first()]) {
    await expect(link).not.toHaveClass(/rounded-full|bg-primary/);
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(24);
  }
  for (const id of ["pitch", "start"]) {
    await expect(page.locator(`#${id}`).getByRole("link", { name: CTA })).toHaveClass(/rounded-full/);
  }

  const [a, b] = [(await ecosystem.first().boundingBox())!, (await ecosystem.last().boundingBox())!];
  if (isMobile(page)) expect(b.y).toBeGreaterThan(a.y + a.height - 1);
  else expect(b.x).toBeGreaterThan(a.x + a.width);
  expect(await noHorizontalScroll(page)).toBe(true);

  await page.waitForLoadState("networkidle");
  await services.click();
  await expect(page).toHaveURL(/\/contact$/);
});

test("0018 AC-5: Tab reaches each section link in order with a visible focus ring", async ({ page }) => {
  test.skip(isMobile(page), "the keyboard pass runs on desktop");
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const services = page.locator("#services").getByRole("link", { name: CTA });
  const [contact, products] = [
    page.locator("#ecosystem").getByRole("link", { name: CTA }),
    page.locator("#ecosystem").getByRole("link", { name: "See every product" }),
  ];
  await tabTo(page, services);
  await expect(services).toBeFocused();
  expect(await ringOf(page)).not.toBe("none");
  await page.keyboard.press("Tab");
  await expect(contact).toBeFocused();
  expect(await ringOf(page)).not.toBe("none");
  await page.keyboard.press("Tab");
  await expect(products).toBeFocused();
});
