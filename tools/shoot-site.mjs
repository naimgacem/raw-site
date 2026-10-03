// QA screenshots of the running site at iPhone size: node tools/shoot-site.mjs [baseUrl] [outDir]
import fs from "node:fs";
import path from "node:path";
import { launch } from "./chrome.mjs";

const base = process.argv[2] || "http://localhost:3100";
const out = process.argv[3] || "tools/out/site";
fs.mkdirSync(out, { recursive: true });
const b = await launch();
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");
p.on("pageerror", (e) => console.error("PAGE ERROR", e.message));
p.on("console", (m) => { if (m.type() === "error") console.error("console:", m.text()); });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const revealAll = () => p.evaluate(() => document.querySelectorAll(".reveal").forEach((e) => e.classList.add("is-in")));
async function shot(name, full = false) {
  await wait(700);
  if (!full) { await p.screenshot({ path: path.join(out, name + ".png") }); console.log("saved", name); return; }
  // scroll in viewport steps so lazy images load and sticky UI behaves like on a phone
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  let i = 0;
  for (let y = 0; y < H; y += 760) {
    await p.evaluate((y) => window.scrollTo(0, y), y);
    await wait(650);
    await p.screenshot({ path: path.join(out, `${name}-${String(i++).padStart(2, "0")}.png`) });
  }
  await p.evaluate(() => window.scrollTo(0, 0));
  console.log("saved", name, i, "frames");
}

await p.goto(base + "/", { waitUntil: "networkidle0" });
await wait(1500);
await shot("01-home-top");
await shot("02-home-full", true);
// booking sheet
await p.evaluate(() => document.querySelector('[aria-label^="Custom Art"]')?.click());
await shot("03-booking");
await p.keyboard.press("Escape");
await wait(800);
// menu drawer
await p.click('[aria-label="Open menu"]');
await shot("04-menu-drawer");
await p.keyboard.press("Escape");
await wait(800);
// add to bag → cart
await p.evaluate(() => document.querySelector('[aria-label="Add Silky Durag to bag"]')?.click());
await shot("05-cart");
await p.keyboard.press("Escape");
await wait(800);
await p.click('[aria-label="Search"]');
await p.type('input[aria-label="Search styles and products"]', "dur");
await shot("06-search");
await p.keyboard.press("Escape");
await p.goto(base + "/menu", { waitUntil: "networkidle0" });
await shot("07-menu-page", true);
await p.goto(base + "/shop", { waitUntil: "networkidle0" });
await shot("08-shop", true);
await p.goto(base + "/shop/silky-durag", { waitUntil: "networkidle0" });
await shot("09-product");
await shot("10-product-full", true);
await b.close();
