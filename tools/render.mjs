// Renders the 3D illustrations to public/renders/*.webp
//   npm run render                 -> everything
//   npm run render -- cornrows art -> only those scenes
//   npm run render -- --preview    -> small, fast previews into tools/out
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { serve, launch } from "./chrome.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const preview = args.includes("--preview");
const only = args.filter((a) => !a.startsWith("--"));
const OUT = path.join(root, "tools", "out");
fs.mkdirSync(OUT, { recursive: true });

// size of each render [w, h] before 2x downsampling
const SIZES = { banner: [1200, 1600], "banner-wide": [1600, 1000] };
const SS = preview ? 1 : 2;

const server = await serve(root);
const browser = await launch();
const page = await browser.newPage();
page.on("console", (m) => console.log("  [page]", m.text()));
page.on("pageerror", (e) => console.error("  [page error]", e.message));
await page.goto("http://localhost:4791/tools/studio/index.html");
await page.waitForFunction("window.studioReady === true", { timeout: 60000 });
const all = await page.evaluate(() => window.scenes.list());
const names = only.length ? only : [...all.styles, ...all.products, ...all.special];

for (const name of names) {
  const [w, h] = SIZES[name] || [1024, 1024];
  const t0 = Date.now();
  const data = await page.evaluate((n, w, h) => window.scenes.shoot(n, w, h), name, (w * SS) / (preview ? 2 : 1), (h * SS) / (preview ? 2 : 1));
  const png = path.join(OUT, `${name}.png`);
  fs.writeFileSync(png, Buffer.from(data.split(",")[1], "base64"));
  console.log(`rendered ${name} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
await browser.close();
server.close();

if (!preview) {
  // downsample 2x (supersampled anti-aliasing) and encode WebP with alpha
  execFileSync("python", [path.join(root, "tools", "encode.py"), ...names], { stdio: "inherit", cwd: root });
}
