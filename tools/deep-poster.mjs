// Renders public/media/deep-poster.jpg from components/deep/shader.ts (the hero's first paint / no-WebGL fallback).
//   node tools/deep-poster.mjs            -> poster
//   node tools/deep-poster.mjs --preview  -> a few states into tools/out/deep-*.png
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "./chrome.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "components/deep/shader.ts"), "utf8");
const grab = (name) => {
  const i = src.indexOf("`", src.indexOf(`export const ${name} =`));
  return src.slice(i + 1, src.indexOf("`;", i + 1));
};
const VERT = grab("VERT"), FRAG = grab("FRAG");

const html = `<!doctype html><body style="margin:0;background:#000"><canvas id=c></canvas><script>
const c=document.getElementById('c'); const gl=c.getContext('webgl',{preserveDrawingBuffer:true});
const p=gl.createProgram();
for(const [t,s] of [[gl.VERTEX_SHADER,${JSON.stringify(VERT)}],[gl.FRAGMENT_SHADER,${JSON.stringify(FRAG)}]]){const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));gl.attachShader(p,sh);}
gl.linkProgram(p);gl.useProgram(p);
const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
const l=gl.getAttribLocation(p,'a');gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0);
window.draw=(w,h,o)=>{c.width=w;c.height=h;gl.viewport(0,0,w,h);const U=n=>gl.getUniformLocation(p,n);
gl.uniform2f(U('uRes'),w,h);gl.uniform1f(U('uTime'),o.t);gl.uniform2f(U('uLook'),o.look[0],o.look[1]);gl.uniform1f(U('uBlink'),o.blink||0);gl.uniform1f(U('uPulse'),o.pulse||0);gl.uniform1f(U('uScroll'),o.scroll||0);gl.uniform1f(U('uBurst'),o.burst??99);
gl.drawArrays(gl.TRIANGLES,0,3);return c.toDataURL('image/png');};
</script>`;

const b = await launch();
const page = await b.newPage();
page.on("pageerror", (e) => { console.error(e.message); process.exit(1); });
await page.setContent(html);
const shoot = async (file, w, h, o) => {
  const data = await page.evaluate((w, h, o) => window.draw(w, h, o), w, h, o);
  fs.writeFileSync(file, Buffer.from(data.split(",")[1], "base64"));
};
if (process.argv.includes("--preview")) {
  const out = path.join(root, "tools/out");
  const states = {
    idle: { t: 14, look: [0, 0] }, glance: { t: 21, look: [-0.55, -0.95] }, blink: { t: 30, look: [0.3, 0.1], blink: 0.85 },
    tap: { t: 40, look: [0.6, 0.4], pulse: 1, burst: 1.5 }, scrolled: { t: 50, look: [0, -0.9], scroll: 0.6 },
  };
  for (const [k, o] of Object.entries(states)) await shoot(path.join(out, `deep-${k}.png`), 390, 708, o);
  console.log("previews in tools/out/deep-*.png");
} else {
  const tmp = path.join(root, "tools/out/deep-poster.png");
  // Same frame the canvas starts on (POSTER in TheDeep.tsx), wide enough to cover any hero shape when
  // sized to the hero's height (like the shader), and rendered soft like the canvas (~0.6x, upscaled).
  await shoot(tmp, 660, 600, { t: 14, look: [0.05, -0.05] });
  const { execFileSync } = await import("node:child_process");
  execFileSync("python", ["-c", `from PIL import Image; Image.open(r'${tmp}').convert('RGB').resize((1100, 1000), Image.BICUBIC).save(r'${path.join(root, "public/media/deep-poster.jpg")}', quality=82, optimize=True, progressive=True)`]);
  // + the inlined placeholder the hero shows while the poster loads
  const lqip = execFileSync("python", ["-c", `import base64,io; from PIL import Image; im=Image.open(r'${path.join(root, "public/media/deep-poster.jpg")}').convert('RGB').resize((24,22), Image.LANCZOS); b=io.BytesIO(); im.save(b,'JPEG',quality=60,optimize=True); print(base64.b64encode(b.getvalue()).decode())`]).toString().trim();
  fs.writeFileSync(path.join(root, "components/deep/lqip.ts"), `// Tiny blurred copy of /media/deep-poster.jpg, inlined so the hero is never black while the poster loads.
// Written by tools/deep-poster.mjs — re-run it after changing the shader.
export const POSTER_LQIP = "data:image/jpeg;base64,${lqip}";
`);
  console.log("public/media/deep-poster.jpg + components/deep/lqip.ts");
}
await b.close();
