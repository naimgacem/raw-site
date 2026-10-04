// iPhone-size screenshots of the admin: node tools/shoot-admin.mjs <baseUrl> <outDir> <path>[@full] ...
// Logs in first (ADMIN_PASSWORD or "admin" in development). Full-page shots with "@full".
import fs from "node:fs";
import path from "node:path";
import { launch } from "./chrome.mjs";

const [base = "http://localhost:3000", out = "tools/out/admin", ...paths] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await launch();
const p = await b.newPage();
if (process.env.DESKTOP) await p.setViewport({ width: 1280, height: 820, deviceScaleFactor: 1 });
else {
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");
}
p.on("pageerror", (e) => console.error("PAGE ERROR", e.message));
p.on("console", (m) => { if (m.type() === "error") console.error("console:", m.text().slice(0, 300)); });
p.on("response", (r) => { if (r.status() >= 400) console.error("HTTP", r.status(), r.url()); });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await p.goto(base + "/admin/login", { waitUntil: "networkidle0" });
if (p.url().includes("/admin/login")) {
  await p.type("#pw", process.env.ADMIN_PASSWORD || "admin");
  await Promise.all([p.waitForNavigation({ waitUntil: "networkidle0" }), p.click('button[type="submit"]')]);
}
console.log("logged in →", p.url());

let i = 0;
for (const raw of paths) {
  const full = raw.endsWith("@full");
  const url = full ? raw.slice(0, -5) : raw;
  await p.goto(base + url, { waitUntil: "networkidle0" });
  await wait(600);
  const name = `${String(i++).padStart(2, "0")}-${url.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home"}`;
  await p.screenshot({ path: path.join(out, name + ".png"), fullPage: full });
  console.log("saved", name, full ? "(full)" : "");
}
await b.close();
