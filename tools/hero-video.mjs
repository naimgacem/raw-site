// Renders the looping 3D braids video -> public/media/braids-loop.mp4 (+ poster), used behind the banner
//   npm run hero-video            (8s loop, 30fps)
//   npm run hero-video -- --test  (renders 3 frames only)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { serve, launch } from "./chrome.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const test = process.argv.includes("--test");
const FPS = 30, SECONDS = 8, N = FPS * SECONDS;
const frames = path.join(root, "tools", "out", "frames");
fs.rmSync(frames, { recursive: true, force: true });
fs.mkdirSync(frames, { recursive: true });

const server = await serve(root);
const browser = await launch();
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("  [page error]", e.message));
await page.goto("http://localhost:4791/tools/studio/index.html");
await page.waitForFunction("window.studioReady === true", { timeout: 60000 });

const todo = test ? [0, 60, 120] : [...Array(N).keys()];
const t0 = Date.now();
for (const i of todo) {
  const data = await page.evaluate((i, n) => window.scenes.heroFrame(i, n), i, N);
  fs.writeFileSync(path.join(frames, `f${String(i).padStart(4, "0")}.jpg`), Buffer.from(data.split(",")[1], "base64"));
  if (i % 30 === 0) console.log(`frame ${i}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();
server.close();
if (test) process.exit(0);

const ffmpeg = execFileSync("python", ["-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"]).toString().trim();
const media = path.join(root, "public", "media");
fs.mkdirSync(media, { recursive: true });
execFileSync(ffmpeg, ["-y", "-framerate", String(FPS), "-i", path.join(frames, "f%04d.jpg"),
  "-vf", "scale=720:1280:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "25",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", path.join(media, "braids-loop.mp4")], { stdio: "inherit" });
execFileSync(ffmpeg, ["-y", "-i", path.join(frames, "f0000.jpg"), "-vf", "scale=720:1280:flags=lanczos", "-q:v", "4", path.join(media, "braids-poster.jpg")], { stdio: "inherit" });
console.log("braids-loop.mp4", (fs.statSync(path.join(media, "braids-loop.mp4")).size / 1024).toFixed(0), "KB");
