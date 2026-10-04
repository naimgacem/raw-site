// Shared helpers for the offline render tools: a tiny static server + headless Chrome.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].filter(Boolean);

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".json": "application/json", ".ttf": "font/ttf" };

export function serve(root, port = 4791) {
  const server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(req.url.split("?")[0]));
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise((r) => server.listen(port, () => r(server)));
}

// gpu: use the real graphics card (much faster for heavy renders); default is the software renderer
export async function launch({ gpu = false } = {}) {
  const executablePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!executablePath) throw new Error("Chrome not found — set CHROME_PATH");
  return puppeteer.launch({
    executablePath,
    headless: true,
    protocolTimeout: 600000,
    args: gpu
      ? ["--enable-webgl", "--ignore-gpu-blocklist", "--enable-gpu", "--use-angle=" + (process.platform === "win32" ? "d3d11" : "default")]
      : ["--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
  });
}
