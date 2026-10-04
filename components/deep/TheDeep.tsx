"use client";

import { useEffect, useRef } from "react";
import { FRAG, VERT } from "./shader";

/**
 * The living hero: the RAW octopus behind the murk. It blinks, glances around (sometimes at the
 * "Book" button), follows your finger, flares when you tap, exhales bubbles, and sinks as you scroll.
 * Rendered at reduced resolution on purpose — it's meant to be seen through the blur — and paused
 * whenever it's off-screen. Without WebGL the poster image behind it stays.
 */
export default function TheDeep({ paused = false, className = "" }: { paused?: boolean; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const host = canvas.parentElement!;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "high-performance" });
    if (!gl || gl.isContextLost()) return; // no WebGL: the poster image behind stays

    const prog = gl.createProgram()!;
    for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]] as const) {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return; }
      gl.attachShader(prog, s);
    }
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const u = { res: U("uRes"), time: U("uTime"), look: U("uLook"), blink: U("uBlink"), pulse: U("uPulse"), scroll: U("uScroll"), burst: U("uBurst") };

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
    const s = {
      look: [0, 0], target: [0, 0], lastTouch: -99, nextGlance: 1.5,
      blinkAt: 2.2, blinkStart: -9, double: false,
      pulse: 0, burstStart: -99, nextBurst: rand(6, 10), scroll: 0,
    };
    const aim = (x: number, y: number) => {
      const r = canvas.getBoundingClientRect();
      const ex = r.left + r.width / 2, ey = r.top + r.height * (0.5 - 0.115);
      s.target = [Math.max(-1, Math.min(1, (x - ex) / (r.width * 0.5))), Math.max(-1, Math.min(1, -(y - ey) / (r.height * 0.45)))];
    };
    const now = () => performance.now() / 1000;
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

    let raf = 0, last = now(), shown = false, slow = 0, frames = 0;
    const t0 = now() - 6; // start a few seconds in so the fog has moved
    const frame = () => {
      raf = requestAnimationFrame(frame);
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

      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform1f(u.time, reduce ? 8 : t % 1000);
      gl.uniform2f(u.look, s.look[0], s.look[1]);
      gl.uniform1f(u.blink, reduce ? 0 : blink);
      gl.uniform1f(u.pulse, s.pulse);
      gl.uniform1f(u.scroll, s.scroll);
      gl.uniform1f(u.burst, n - s.burstStart);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (!shown) { shown = true; canvas.style.opacity = "1"; }
      // phones that struggle get fewer pixels (it's blurry by design anyway)
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
      // free the GPU only once the canvas has really left the page — React re-runs effects on the
      // same canvas in development, and a lost context can't be used again
      setTimeout(() => { if (!canvas.isConnected) gl.getExtension("WEBGL_lose_context")?.loseContext(); }, 0);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={`absolute inset-0 h-full w-full opacity-0 transition-opacity duration-[1400ms] ${className}`} />;
}
