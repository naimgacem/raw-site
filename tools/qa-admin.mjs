// QA: drives the admin like the artist would on a phone, and checks the public site follows.
// node tools/qa-admin.mjs [baseUrl]   (screens in tools/out/qa-admin)
import fs from "node:fs";
import { launch } from "./chrome.mjs";

const base = process.argv[2] || "http://localhost:3000";
const out = "tools/out/qa-admin";
fs.mkdirSync(out, { recursive: true });
const b = await launch();
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
p.on("dialog", (d) => { errors.push("unexpected dialog: " + d.type()); d.accept(); });
p.on("pageerror", (e) => errors.push("PAGE " + e.message));
p.on("response", (r) => { if (r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url()}`); });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
const snap = async (name) => { await wait(450); await p.screenshot({ path: `${out}/${String(n++).padStart(2, "0")}-${name}.png` }); };
const ok = (cond, msg) => { console.log(cond ? "  ✓" : "  ✗", msg); if (!cond) process.exitCode = 1; };
const clickText = (text, sel = "button, a") =>
  p.evaluate((text, sel) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().replace(/\s+/g, " ").includes(text) && e.offsetParent !== null);
    if (!el) return false;
    el.scrollIntoView({ block: "center" });
    el.click();
    return true;
  }, text, sel);
const toast = () => p.evaluate(() => [...document.querySelectorAll('[role="status"]')].map((e) => e.textContent.trim()).join(" | "));
const text = () => p.evaluate(() => document.body.innerText);
const go = (u) => p.goto(base + u, { waitUntil: "networkidle0" });
const nodeBase = base.replace("localhost", "127.0.0.1"); // node resolves localhost to ::1 first
const publicHtml = async (u) => (await fetch(nodeBase + u, { cache: "no-store" })).text();

console.log("login");
await go("/admin/login");
await snap("login");
await p.type("#pw", "wrong-password");
await clickText("Log in");
await wait(1500);
ok((await text()).includes("isn’t right"), "wrong password is refused with a message");
await p.$eval("#pw", (e) => (e.value = ""));
await p.type("#pw", process.env.ADMIN_PASSWORD || "admin");
await Promise.all([p.waitForNavigation({ waitUntil: "networkidle0" }), clickText("Log in")]);
ok(p.url().endsWith("/admin"), "logged in → home");

console.log("order: confirm → ship → deliver");
await go("/admin/orders/1023");
await clickText("Customer confirmed");
await wait(1200);
ok((await toast()).includes("confirmed"), "confirm shows a toast with Undo: " + (await toast()));
await snap("order-confirmed");
await clickText("Hand to courier");
await wait(700);
await p.type('input[placeholder="Tracking number (optional)"]', "YAL-777");
await snap("ship-sheet");
await clickText("Mark as shipped");
await wait(1500);
await go("/admin/orders/1023");
ok((await text()).includes("Shipped") && (await p.$eval('input[placeholder="e.g. yal-ABC123"]', (e) => e.value)) === "YAL-777", "order is shipped with tracking number");
await clickText("More actions", "button[aria-label]") || (await p.click('button[aria-label="More actions"]'));
await wait(600);
await snap("order-menu");
await p.keyboard.press("Escape");
await wait(400);

console.log("product price → live site");
await go("/admin/catalog/products/velvet-durag");
const priceInput = (await p.$$("input[inputmode=numeric]"))[0];
await priceInput.click({ clickCount: 3 });
const newPrice = 2000 + Math.floor(Math.random() * 90) * 10; // random, so a stale page can't pass
await priceInput.type(String(newPrice));
await wait(300);
await snap("product-dirty");
await clickText("Save", "button");
await wait(2000);
ok((await toast()).includes("Saved"), "product saved: " + (await toast()));
ok(!(await text()).includes("Unsaved changes"), "save bar is gone after saving");
const prod = await publicHtml("/shop/velvet-durag");
const shown = newPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " DA";
ok(prod.includes(shown), `public product page shows the new price (${newPrice})`);

console.log("photo upload");
await go("/admin/catalog/products/crown-oil");
await p.click('button[aria-label="Change photo"]');
await wait(900);
await snap("image-picker");
const [chooser] = await Promise.all([p.waitForFileChooser(), clickText("Upload from phone")]);
await chooser.accept(["public/og.jpg"]);
await wait(3500);
const img = await p.$eval('button[aria-label="Change photo"] img', (e) => e.getAttribute("src"));
ok(img && img.startsWith("/media/"), "uploaded photo is now the product photo: " + img);
await go("/admin/catalog/products/crown-oil"); // discard (dirty guard skipped by full navigation)

console.log("coupon");
await go("/admin/coupons");
await clickText("New");
await wait(700);
const code = "EID" + Math.floor(Math.random() * 90 + 10);
await p.type('input[placeholder="e.g. EID25"]', code);
await snap("coupon-sheet");
await clickText("Create code");
await wait(1500);
ok((await text()).includes(code), `coupon ${code} listed`);
const cj = await (await fetch(`${nodeBase}/api/coupon?code=${code.toLowerCase()}`)).json();
ok(cj.ok === true, "public coupon check accepts it");

console.log("announcement → live site");
await go("/admin/settings");
await clickText("Add announcement");
await wait(300);
await p.keyboard.type("QA drop is live");
await clickText("Save changes", "button");
await wait(2000);
ok((await publicHtml("/")).includes("QA drop is live"), "announcement bar shows the new line");

console.log("manual order");
await go("/admin/orders/new");
await clickText("Add product");
await wait(800);
await clickText("Royal Purple");
await wait(400);
await p.type('input[placeholder="Nom complet"]', "Client Instagram");
await p.type('input[placeholder="0555 12 34 56"]', "0550 11 22 33");
await p.select("select", "16");
await wait(600);
await snap("new-order-filled");
await Promise.all([p.waitForNavigation({ waitUntil: "networkidle0", timeout: 15000 }).catch(() => {}), clickText("Create order")]);
ok(/\/admin\/orders\/\d+$/.test(p.url()), "created and opened " + p.url());

console.log("booking: set date → confirm");
await go("/admin/bookings/101");
await p.$eval('input[type="date"]', (e) => {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  set.call(e, new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10));
  e.dispatchEvent(new Event("input", { bubbles: true }));
});
await wait(400);
await snap("booking-dirty");
await clickText("Confirm for");
await wait(2500);
await go("/admin/bookings/101");
ok((await text()).includes("Confirmed"), "booking confirmed");

console.log("pause orders → site → reopen");
await go("/admin");
await p.click('button[aria-label="Taking orders"]');
await wait(1800);
ok((await publicHtml("/shop/satin-bonnet")).includes("Orders paused"), "product page shows paused message");
await go("/admin");
await snap("home-paused");
await clickText("Reopen");
await wait(1800);
ok(!(await publicHtml("/shop/satin-bonnet")).includes("Orders paused"), "orders open again");

console.log("logout");
await go("/admin/more");
await Promise.all([p.waitForNavigation({ waitUntil: "networkidle0" }), clickText("Log out")]);
ok(p.url().includes("/admin/login"), "logged out");
await go("/admin/orders");
ok(p.url().includes("/admin/login"), "admin is closed after logout");
const api = await fetch(nodeBase + "/api/admin/orders.csv");
ok(api.status === 401, "admin API refuses without a session");

console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no page errors");
await b.close();
