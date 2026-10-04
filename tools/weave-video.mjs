// Renders "The Weave" — octopus arms plaiting a braid — behind the "We come to you" section.
//   npm run weave-video                 full loop → public/media/weave-loop.mp4 + weave-poster.jpg
//   npm run weave-video -- --preview    a few stills into tools/out/weave-*.jpg (fast)
// Uses the graphics card (each frame is the average of many lens samples for real depth of field).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { serve, launch } from "./chrome.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const preview = process.argv.includes("--preview");
const FPS = 30, SECONDS = 8, N = FPS * SECONDS;
const SIZE = preview ? 640 : 1080; // rendered square, encoded smaller
const OUT_SIZE = 840;
const SAMPLES = preview ? 24 : 40;
const out = path.join(root, "tools", "out");
const frames = path.join(out, "weave-frames");
fs.mkdirSync(out, { recursive: true });
if (!preview) {
  fs.rmSync(frames, { recursive: true, force: true });
  fs.mkdirSync(frames, { recursive: true });
}

const server = await serve(root);
const browser = await launch({ gpu: true });
const page = await browser.newPage();
page.on("console", (m) => console.log("  [page]", m.text()));
page.on("pageerror", (e) => console.error("  [page error]", e.message));
await page.goto("http://localhost:4791/tools/studio/weave.html");
await page.waitForFunction("window.weaveReady === true", { timeout: 60000 });
const info = await page.evaluate((s) => window.weave.init(s, s), SIZE);
console.log("scene ready", info);

const grab = async (phase, file) => {
  const data = await page.evaluate((p, n) => window.weave.frame(p, { samples: n }), phase, SAMPLES);
  fs.writeFileSync(file, Buffer.from(data.split(",")[1], "base64"));
};

const t0 = Date.now();
if (preview) {
  for (const p of [0, 0.33, 0.66]) await grab(p, path.join(out, `weave-${Math.round(p * 100)}.jpg`));
  console.log(`previews in tools/out/weave-*.jpg (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
} else {
  for (let i = 0; i < N; i++) {
    await grab(i / N, path.join(frames, `f${String(i).padStart(4, "0")}.jpg`));
    if (i % 20 === 0) console.log(`frame ${i}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
}
await browser.close();
server.close();
if (preview) process.exit(0);

const ffmpeg = execFileSync("python", ["-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"]).toString().trim();
const media = path.join(root, "public", "media");
const scale = `scale=${OUT_SIZE}:${OUT_SIZE}:flags=lanczos`;
execFileSync(ffmpeg, ["-y", "-framerate", String(FPS), "-i", path.join(frames, "f%04d.jpg"),
  "-vf", scale, "-c:v", "libx264", "-preset", "veryslow", "-crf", "24", "-tune", "film",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", path.join(media, "weave-loop.mp4")], { stdio: "inherit" });
execFileSync(ffmpeg, ["-y", "-i", path.join(frames, "f0000.jpg"), "-vf", scale, "-q:v", "4", "-frames:v", "1", "-update", "1", path.join(media, "weave-poster.jpg")], { stdio: "inherit" });
console.log("weave-loop.mp4", (fs.statSync(path.join(media, "weave-loop.mp4")).size / 1024).toFixed(0), "KB");
