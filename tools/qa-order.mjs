// QA: hero animation + order form flow at iPhone size. node tools/qa-order.mjs [baseUrl]
import fs from "node:fs";
import { launch } from "./chrome.mjs";
const base = process.argv[2] || "http://localhost:3100";
const out = "tools/out/qa"; fs.mkdirSync(out, { recursive: true });
const b = await launch();
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
p.on("pageerror", (e) => console.error("PAGE ERROR", e.message));
p.on("console", (m) => { if (["error", "warning"].includes(m.type())) console.error("console:", m.text()); });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const snap = async (n) => { await p.screenshot({ path: `${out}/${n}.png` }); console.log("saved", n); };

// hero
await p.goto(base + "/", { waitUntil: "networkidle0" });
await wait(2500); await snap("01-hero");
console.log("canvas opacity:", await p.evaluate(() => getComputedStyle(document.querySelector("section canvas")).opacity));
await p.touchscreen.tap(320, 260); await wait(500); await snap("02-hero-tap");
await p.evaluate(() => window.scrollTo(0, 900)); await wait(1200); await snap("03-cards");

// product page + embedded order form
await p.goto(base + "/shop/silky-durag", { waitUntil: "networkidle0" });
await wait(800);
await p.evaluate(() => document.querySelector("form[dir=rtl]").scrollIntoView({ block: "start" }));
await p.evaluate(() => window.scrollBy(0, -80)); await wait(600); await snap("04-form-empty");
// submit empty -> validation
await p.evaluate(() => document.querySelector("form[dir=rtl] button[type=submit]").click()); await wait(400);
await wait(300); await p.evaluate(() => document.querySelector('input[autocomplete="name"]').scrollIntoView({ block: "start" })); await p.evaluate(() => window.scrollBy(0, -140)); await wait(500); await snap("05-form-errors");
// coupon
await p.type('input[aria-label="Coupon code"]', "raw10");
await p.evaluate(() => [...document.querySelectorAll("form[dir=rtl] button")].find((x) => x.textContent.trim() === "Apply").click());
// fill
await p.type('input[autocomplete="name"]', "Yacine Benali");
await p.type('input[autocomplete="tel"]', "0555 12 34 56");
await p.select("form[dir=rtl] select", "16");
await wait(500);
const communeOpts = await p.evaluate(() => document.querySelectorAll("form[dir=rtl] select")[1].options.length);
console.log("commune options for Alger:", communeOpts - 1);
await p.evaluate(() => { const s = document.querySelectorAll("form[dir=rtl] select")[1]; s.value = s.options[3].value; s.dispatchEvent(new Event("change", { bubbles: true })); });
await p.type('input[autocomplete="street-address"]', "Cité 200 logements, Bt 4");
await p.evaluate(() => document.querySelector("form[dir=rtl]").scrollIntoView({ block: "start" })); await p.evaluate(() => window.scrollBy(0, -80)); await wait(500);
await snap("06-form-filled");
await p.evaluate(() => window.scrollBy(0, 560)); await wait(400); await snap("07-form-filled-b");
const res = p.waitForResponse((r) => r.url().includes("/api/order"));
await p.evaluate(() => document.querySelector("form[dir=rtl] button[type=submit]").click());
const r = await res; console.log("api status", r.status(), JSON.stringify(await r.json()).slice(0, 220));
await wait(700);
await p.evaluate(() => document.querySelector("[lang=ar]").scrollIntoView({ block: "center" })); await wait(400); await snap("08-confirmation");

// bag -> checkout
await p.goto(base + "/shop", { waitUntil: "networkidle0" });
await p.evaluate(() => document.querySelector('[aria-label="Add Velvet Durag to bag"]').click()); await wait(900);
await snap("09-bag");
await p.evaluate(() => [...document.querySelectorAll("a")].find((a) => a.textContent.includes("Checkout")).click());
await wait(1500); await snap("10-checkout");
await b.close();
