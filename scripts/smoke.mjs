import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("../mockups/node_modules/playwright-core");

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const base = "http://127.0.0.1:3456";
const chrome = "/home/box/.cache/ms-playwright/chromium-1140/chrome-linux/chrome";
const screens = path.join(root, "screens");

const server = spawn("npx", ["next", "start", "-p", "3456", "-H", "127.0.0.1"], {
  cwd: root,
  env: { ...process.env, NEXTAUTH_URL: base, PORT: "3456" },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
server.stdout.on("data", (b) => { logs += b.toString(); });
server.stderr.on("data", (b) => { logs += b.toString(); });

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitHealthy() {
  const start = Date.now();
  while (Date.now() - start < 60_000) {
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) {
        const body = await res.json();
        if (body.places > 0) return;
      }
    } catch { /* starting */ }
    await sleep(400);
  }
  throw new Error("Server did not become healthy.\n" + logs.slice(-2000));
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(screens, name), fullPage: false });
}

const failures = [];
function check(cond, message) {
  if (!cond) failures.push(message);
  else console.log("ok", message);
}

async function main() {
  await mkdir(screens, { recursive: true });
  await waitHealthy();

  // P2 #29 — onboarding POST must redirect with cookies (not 500 immutable headers)
  {
    const onboard = await fetch(`${base}/api/onboarding`, {
      method: "POST",
      redirect: "manual",
      headers: {
        Origin: base,
        Referer: `${base}/onboarding`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "near=21048&kidsAges=&lens=1",
    });
    const loc = onboard.headers.get("location") || "";
    const setCookie = typeof onboard.headers.getSetCookie === "function"
      ? onboard.headers.getSetCookie().join("\n")
      : (onboard.headers.get("set-cookie") || "");
    check([302, 303].includes(onboard.status), `onboarding POST redirects (got ${onboard.status})`);
    check(/\/results/.test(loc) && /near=21048/.test(loc) && /lens=1/.test(loc), `onboarding Location toward Saturday results (got ${loc})`);
    check(setCookie.includes("lf_onboarded"), "onboarding sets lf_onboarded cookie");
    check(setCookie.includes("lf_guest"), "onboarding sets lf_guest cookie");
  }

  const browser = await chromium.launch({
    executablePath: chrome,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(base + "/", { waitUntil: "networkidle" });
    await shot(page, "01-home-iphone.png");
    check((await page.locator("h1").innerText()).includes("fun"), "home heading");
    const homeNear = await page.getByTestId("near-input").inputValue();
    check(homeNear === "21048" || !homeNear.includes("Finksburg"), `home near is bare zip (got ${homeNear})`);
    check(!homeNear.includes("·"), "home near has no pretty separator");

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(base + "/", { waitUntil: "networkidle" });
    await shot(page, "01-home-ipad.png");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "/auth", { waitUntil: "networkidle" });
    await shot(page, "08-auth-iphone.png");

    await page.goto(base + "/results?near=21048&radius=25&lens=1", { waitUntil: "networkidle" });
    await shot(page, "02-results-iphone.png");
    await page.setViewportSize({ width: 768, height: 1024 });
    await shot(page, "02-results-ipad.png");
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto(base + "/places/ag-celebrating-fall", { waitUntil: "networkidle" });
    await shot(page, "03-detail-iphone.png");
    await page.setViewportSize({ width: 768, height: 1024 });
    await shot(page, "03-detail-ipad.png");
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto(base + "/results?near=21048&radius=10&lens=1", { waitUntil: "networkidle" });
    const n10 = Number(await page.getByTestId("result-count").innerText());
    const text10 = await page.locator("body").innerText();
    check(!text10.includes("Renaissance"), "10 mi hides Renaissance Festival");
    check(!text10.includes("Das Best"), "10 mi hides Timonium pumpkin fest");
    check(text10.includes("Maggie’s") || text10.includes("Maggie's"), "10 mi includes Westminster food");
    await shot(page, "02-results-10mi-iphone.png");

    await page.goto(base + "/results?near=21048&radius=40&lens=1", { waitUntil: "networkidle" });
    const n40 = Number(await page.getByTestId("result-count").innerText());
    const text40 = await page.locator("body").innerText();
    check(n40 > n10 + 4, `40 mi count ${n40} > 10 mi count ${n10}`);
    check(text40.includes("Renaissance"), "40 mi includes Renaissance Festival");
    check(text40.includes("Weber"), "40 mi includes Weber’s");
    await shot(page, "02-results-40mi-iphone.png");

    await page.goto(base + "/results?near=21093&radius=10", { waitUntil: "networkidle" });
    const tim = await page.locator("body").innerText();
    check(tim.includes("Das Best") || tim.includes("Oregon Ridge"), "Timonium origin surfaces nearby");
    check(!tim.includes("CCPL Finksburg"), "Timonium 10 mi drops Finksburg library");

    await page.goto(base + "/results?near=10001&radius=25", { waitUntil: "networkidle" });
    check((await page.getByTestId("empty-state").count()) === 1, "New York zip is an empty state");
    check((await page.getByTestId("result-count").innerText()) === "0", "New York count is 0");
    check((await page.getByTestId("empty-chip-21048").count()) === 1, "empty state has Search 21048 chip");
    const emptyBody = await page.locator("body").innerText();
    check(!emptyBody.includes("min from Finksburg"), "empty results do not hardcode Finksburg drive");

    await page.goto(base + "/results?near=10001&radius=10", { waitUntil: "networkidle" });
    check((await page.getByTestId("empty-chip-21048").count()) === 1, "10001 @ 10mi has Search 21048 chip");

    // Persist last search then restore via bare /results
    await page.goto(base + "/results?near=21093&radius=10", { waitUntil: "networkidle" });
    await page.waitForTimeout(200);
    await page.goto(base + "/results", { waitUntil: "networkidle" });
    const restored = await page.url();
    const restoredNear = await page.getByTestId("search-near").innerText();
    check(restoredNear === "21093" || restored.includes("near=21093"), `Explore restore near=21093 (got ${restoredNear} / ${restored})`);
    const timBody = await page.locator("body").innerText();
    check(!timBody.includes("min from Finksburg"), "non-seed origin cards omit Finksburg driveMin");
    check(!timBody.includes("Rank "), "results show Match not Rank");
    check(timBody.includes("Match "), "results show Match score");

    await page.goto(base + "/auth?next=/friends", { waitUntil: "networkidle" });
    await page.fill("#email", "casey@locallife.app");
    await page.fill("#password", "localfun-demo");
    await page.click("button[type=submit]");
    await page.waitForURL((url) => url.pathname === "/friends", { timeout: 15000 });
    check((await page.locator("h1").innerText()) === "Friends", "login lands on friends");

    await page.goto(base + "/go/hashawha?olat=39.4959&olng=-76.8946&olabel=21048", { waitUntil: "networkidle" });
    check((await page.locator("h1").innerText()).includes("Planning"), "go confirm sheet says Planning");
    await page.getByTestId("confirm-go").click();
    await page.waitForSelector("[data-testid=google-maps]");
    const href = await page.getByTestId("google-maps").getAttribute("href");
    check(!!href && href.includes("origin=39.4959") && href.includes("destination="), "maps link has origin and destination");
    const goNote = await page.getByTestId("go-saved").innerText();
    check(goNote.includes("Saved as Going"), "go success softens copy to Saved as Going");
    check(!goNote.includes("Recently Went as planned"), "old Recently Went as planned copy is gone");
    await shot(page, "04-go-iphone.png");

    // Idempotent Go: confirm again must not duplicate open visit
    await page.goto(base + "/go/hashawha?olat=39.4959&olng=-76.8946&olabel=21048", { waitUntil: "networkidle" });
    await page.getByTestId("confirm-go").click();
    await page.waitForSelector("[data-testid=google-maps]");

    await page.goto(base + "/recent", { waitUntil: "networkidle" });
    check((await page.getByTestId("status-legend").count()) === 1, "Went tab has status badge legend");
    const hashGoing = await page.locator('[data-testid=visit]').filter({ hasText: "Hashawha" }).filter({ has: page.locator('[data-testid=visit-status]', { hasText: "Going" }) }).count();
    check(hashGoing === 1, `idempotent Go keeps one Going Hashawha visit (got ${hashGoing})`);
    const goingBadge = await page.locator('[data-testid=visit-status]').filter({ hasText: "Going" }).count();
    check(goingBadge >= 1, "planned visits show Going badge");
    if (await page.getByTestId("review-form").count()) {
      const form = page.getByTestId("review-form").first();
      await form.locator("select").selectOption("4");
      await form.locator("textarea").fill("Smoke test: paved loop and an indoor room.");
      await form.locator("button[type=submit]").click();
      await page.waitForLoadState("networkidle");
    }
    check((await page.locator("body").innerText()).includes("Smoke test:"), "review saved on Going & Been");
    await shot(page, "05-recent-iphone.png");

    await page.goto(base + "/friends", { waitUntil: "networkidle" });
    if (await page.getByTestId("accept-friend").count()) {
      await page.getByTestId("accept-friend").click();
      await page.waitForLoadState("networkidle");
    }
    const friends = await page.getByTestId("friend-list").innerText();
    check(friends.includes("Jamie"), "Jamie is an accepted friend");
    check(friends.includes("Riley"), "Riley request can be accepted");
    check((await page.locator("body").innerText()).includes("Oregon Ridge"), "friends-went activity lists Jamie’s trip");
    await shot(page, "06-friends-iphone.png");

    await page.goto(base + "/settings", { waitUntil: "networkidle" });
    await shot(page, "07-settings-iphone.png");
    await page.setViewportSize({ width: 768, height: 1024 });
    await shot(page, "07-settings-ipad.png");

    await page.goto(base + "/results?near=21048&radius=25&lens=1", { waitUntil: "networkidle" });
    const ranked = await page.locator("body").innerText();
    check(ranked.includes("Friends went"), "signed-in results show friends-went badge");
    check(ranked.includes("Match "), "signed-in results use Match label");
    check(!ranked.includes("Rank "), "signed-in results do not use Rank label");

    // Detail inherits search radius 40 (not saved-home 25)
    await page.goto(base + "/results?near=21048&radius=40", { waitUntil: "networkidle" });
    const open = page.locator('[data-testid=place-card]').filter({ hasText: "Oregon Ridge" }).getByRole("link", { name: "Open" });
    if (await open.count()) {
      await open.first().click();
      await page.waitForLoadState("networkidle");
      const summary = await page.getByTestId("rank-breakdown").locator("summary").innerText();
      check(summary.includes("from this search, 40 mi"), `detail score uses search radius 40 (got: ${summary})`);
      await page.getByTestId("rank-breakdown").locator("summary").click();
      const parts = await page.getByTestId("rank-parts").innerText();
      check(parts.includes("radius 40 mi"), `rank parts disclose radius 40 (got: ${parts.slice(0, 160)})`);
      await mkdir(path.join(screens, "p0"), { recursive: true });
      await page.screenshot({ path: path.join(screens, "p0", "detail-search-radius-40.png"), fullPage: false });
    } else {
      failures.push("Oregon Ridge card missing at 40 mi for detail radius check");
    }

    await page.goto(base + "/results?near=10001&radius=10", { waitUntil: "networkidle" });
    await mkdir(path.join(screens, "p0"), { recursive: true });
    await page.screenshot({ path: path.join(screens, "p0", "empty-21048-chip.png"), fullPage: false });

    await page.goto(base + "/results?near=21048&radius=10&lens=1", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(screens, "p0", "results-match-no-finksburg-drive.png"), fullPage: false });
  } finally {
    await browser.close();
  }
  if (failures.length) {
    await writeFile(path.join(screens, "failures.txt"), failures.join("\n"));
    throw new Error(failures.join("\n"));
  }
}

main()
  .then(() => {
    console.log("smoke passed");
    server.kill("SIGTERM");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    console.error(logs.slice(-3000));
    server.kill("SIGTERM");
    process.exit(1);
  });
