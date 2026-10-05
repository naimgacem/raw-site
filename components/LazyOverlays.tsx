"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useStore } from "./store";

// Menu, search, bag, booking sheet and toasts — with the animation library they need — load once the
// page is idle (or the moment someone opens one), so first load only runs what's on screen.
const Overlays = dynamic(() => import("./Overlays"), { ssr: false });

type Idle = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };

export default function LazyOverlays() {
  const { panel, booking, toast } = useStore();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as Idle;
    const go = () => setReady(true);
    const id = w.requestIdleCallback ? w.requestIdleCallback(go, { timeout: 3000 }) : window.setTimeout(go, 1200);
    return () => { if (w.cancelIdleCallback) w.cancelIdleCallback(id); else window.clearTimeout(id); };
  }, []);
  return ready || panel || booking || toast ? <Overlays /> : null;
}
