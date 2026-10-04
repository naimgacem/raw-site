// Shown instantly while a screen loads, so every tap feels answered on a slow connection.
export default function Loading() {
  return (
    <div className="animate-pulse pt-[calc(56px+env(safe-area-inset-top))]" aria-busy="true" aria-label="Loading">
      <div className="mt-1 h-9 w-40 rounded-xl bg-white/[0.06]" />
      <div className="mt-3 h-4 w-56 rounded-lg bg-white/[0.04]" />
      <div className="mt-7 space-y-2.5">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-[5.5rem] rounded-[20px] bg-white/[0.04]" />)}
      </div>
    </div>
  );
}
