"use client";

import { useEffect, useRef } from "react";
import { FRAG, VERT } from "./shader";

/**
 * The living hero: the RAW octopus behind the murk. It blinks, glances around (sometimes at the
 * "Book" button), follows your finger, flares when you tap, exhales bubbles, and sinks as you scroll.
 * Rendered at reduced resolution on purpose — it's meant to be seen through the blur — and paused
 * whenever it's off-screen. Without WebGL the poster image behind it stays.
 *
 * First load is kept smooth: the poster (the exact same frame — see POSTER) paints instantly, the
 * GPU work starts only once the page is idle, the shader compiles off the main thread where the
 * browser allows it, and the canvas fades in over an identical picture, so nothing jumps.
 */

// the frame tools/deep-poster.mjs renders into /media/deep-poster.jpg — the canvas starts here
export const POSTER = { t: 14, look: [0.05, -0.05] as [number, number] };

type Idle = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };

export default function TheDeep({ paused = false, className = "" }: { paused?: boolean; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const w = window as Idle;
    let dispose = () => {};
    let cancelled = false;
    const go = () => { if (!cancelled) dispose = start(canvas, pausedRef); };
    // let hydration, fonts and the first images finish before asking the GPU for anything
    const id = w.requestIdleCallback ? w.requestIdleCallback(go, { timeout: 1500 }) : window.setTimeout(go, 250);
    return () => {
      cancelled = true;
      if (w.cancelIdleCallback) w.cancelIdleCallback(id); else window.clearTimeout(id);
      dispose();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={`absolute inset-0 h-full w-full opacity-0 transition-opacity duration-700 ${className}`} />;
}

function start(canvas: HTMLCanvasElement, pausedRef: React.MutableRefObject<boolean>): () => void {
  const host = canvas.parentElement!;
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "high-performance" });
  if (!gl || gl.isContextLost()) return () => {}; // no WebGL: the poster image behind stays

  // compile without blocking: with KHR_parallel_shader_compile the browser builds the program in the
  // background and we only start drawing once it reports done
  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  const prog = gl.createProgram()!;
  const shaders = ([[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]] as const).map(([type, src]) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    gl.attachShader(prog, sh);
    return sh;
  });
  gl.linkProgram(prog);

  const buf = gl.createBuffer();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let scale = 0.55;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(2, Math.round(canvas.clientWidth * dpr * scale));
    canvas.height = Math.max(2, Math.round(canvas.clientHeight * dpr * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  /* ---------------- behaviour ---------------- */
  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const now = () => performance.now() / 1000;
  const n0 = now();
  const s = {
    // starts exactly where the poster is, so the fade-in is seamless
    look: [...POSTER.look], target: [...POSTER.look], lastTouch: -99, nextGlance: n0 + 2.2,
    blinkAt: n0 + rand(2.6, 4), blinkStart: -9, double: false,
    pulse: 0, burstStart: -99, nextBurst: n0 + rand(7, 11), scroll: 0,
  };
  const aim = (x: number, y: number) => {
    const r = canvas.getBoundingClientRect();
    const ex = r.left + r.width / 2, ey = r.top + r.height * (0.5 - 0.115);
    s.target = [Math.max(-1, Math.min(1, (x - ex) / (r.width * 0.5))), Math.max(-1, Math.min(1, -(y - ey) / (r.height * 0.45)))];
  };
  const onMove = (e: PointerEvent) => { aim(e.clientX, e.clientY); s.lastTouch = now(); };
  const onDown = (e: PointerEvent) => { aim(e.clientX, e.clientY); s.lastTouch = now(); s.pulse = 1; if (Math.random() < 0.35) s.burstStart = now(); };
  const onTouch = (e: TouchEvent) => { const t = e.touches[0]; if (t) { aim(t.clientX, t.clientY); s.lastTouch = now(); } };
  const onScroll = () => { s.scroll = Math.max(0, Math.min(1, window.scrollY / Math.max(1, host.clientHeight))); };
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("touchmove", onTouch, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  let visible = true;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
  io.observe(host);

  let u: Record<string, WebGLUniformLocation | null> | null = null;
  let raf = 0, last = now(), shown = false, slow = 0, frames = 0, warm = 0, t0 = 0;

  // once the program is built: set up buffers and uniforms (only now do we ask for status)
  const setup = () => {
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn(gl.getProgramInfoLog(prog) || shaders.map((sh) => gl.getShaderInfoLog(sh)).join("\n"));
      return false;
    }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n: string) => gl.getUniformLocation(prog, n);
    u = { res: U("uRes"), time: U("uTime"), look: U("uLook"), blink: U("uBlink"), pulse: U("uPulse"), scroll: U("uScroll"), burst: U("uBurst") };
    t0 = now() - POSTER.t;
    last = now();
    return true;
  };

  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (!u) {
      if (parallel && !gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR)) return; // still compiling
      if (!setup()) { cancelAnimationFrame(raf); return; }
    }
    const n = now();
    const dt = Math.min(0.1, n - last);
    last = n;
    if (!visible || document.hidden || (pausedRef.current && shown)) return;
    const t = n - t0;

    // idle: glance around; one time in four, eye up the "Book a style" button
    if (n - s.lastTouch > 2.5 && n > s.nextGlance) {
      s.target = Math.random() < 0.25 ? [-0.55, -0.95] : [rand(-0.6, 0.6), rand(-0.35, 0.3)];
      s.nextGlance = n + rand(1.2, 3.4);
    }
    // scrolling away: it watches you leave
    const tx = s.target[0], ty = s.target[1] - s.scroll * 0.9;
    const k = 1 - Math.exp(-dt * 7);
    s.look[0] += (tx - s.look[0]) * k;
    s.look[1] += (ty - s.look[1]) * k;

    if (n > s.blinkAt) { s.blinkStart = n; s.double = Math.random() < 0.22; s.blinkAt = n + rand(2.4, 6.5); }
    const bt = n - s.blinkStart;
    const one = (x: number) => (x > 0 && x < 0.17 ? Math.sin((x / 0.17) * Math.PI) : 0);
    const blink = Math.max(one(bt), s.double ? one(bt - 0.24) : 0);

    if (n > s.nextBurst) { s.burstStart = n; s.nextBurst = n + rand(9, 16); }
    s.pulse *= Math.exp(-dt * 2.4);

    gl.uniform2f(u!.res, canvas.width, canvas.height);
    gl.uniform1f(u!.time, reduce ? POSTER.t : t % 1000);
    gl.uniform2f(u!.look, s.look[0], s.look[1]);
    gl.uniform1f(u!.blink, reduce ? 0 : blink);
    gl.uniform1f(u!.pulse, s.pulse);
    gl.uniform1f(u!.scroll, s.scroll);
    gl.uniform1f(u!.burst, n - s.burstStart);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!shown) { shown = true; canvas.style.opacity = "1"; }
    // phones that struggle get fewer pixels (it's blurry by design anyway). The first couple of
    // seconds don't count: the page is still loading and every phone looks slow then.
    if (warm < 120) { warm++; return; }
    frames++;
    if (dt > 0.026) slow++;
    if (frames === 90) { if (slow > 30 && scale > 0.36) { scale -= 0.1; resize(); } frames = 0; slow = 0; }
    if (reduce) cancelAnimationFrame(raf);
  };
  raf = requestAnimationFrame(frame);

  // phones can drop the GPU context (memory pressure, too many tabs): fade back to the poster
  const onLost = (e: Event) => { e.preventDefault(); cancelAnimationFrame(raf); canvas.style.opacity = "0"; };
  canvas.addEventListener("webglcontextlost", onLost);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    host.removeEventListener("pointermove", onMove);
    host.removeEventListener("pointerdown", onDown);
    host.removeEventListener("touchmove", onTouch);
    window.removeEventListener("scroll", onScroll);
    canvas.removeEventListener("webglcontextlost", onLost);
    gl.deleteBuffer(buf);
    gl.deleteProgram(prog);
    shaders.forEach((sh) => gl.deleteShader(sh));
    // free the GPU only once the canvas has really left the page — React re-runs effects on the
    // same canvas in development, and a lost context can't be used again
    setTimeout(() => { if (!canvas.isConnected) gl.getExtension("WEBGL_lose_context")?.loseContext(); }, 0);
  };
}
