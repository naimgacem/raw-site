"use client";

import { useEffect, useRef, useState } from "react";
import { deleteMedia, listMedia } from "@/app/admin/actions";
import { RENDERS } from "@/lib/media";
import type { MediaItem } from "@/lib/types";
import { useShell } from "./Shell";
import { Button, Sheet, Thumb, cx } from "./ui";
import { CheckI, ImageI, SpinnerI, TrashI, UploadI } from "./icons";

/** Shrinks a phone photo before upload: max 1600px, WebP (JPEG where the browser can't encode WebP). */
async function compress(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 700_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const toBlob = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
    let blob = await toBlob("image/webp", 0.85);
    if (!blob || blob.type !== "image/webp") blob = await toBlob(file.type === "image/png" ? "image/png" : "image/jpeg", 0.86);
    if (!blob) return file;
    const ext = blob.type.split("/")[1].replace("jpeg", "jpg");
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type: blob.type });
  } catch {
    return file;
  }
}

export async function uploadPhoto(file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const small = await compress(file);
  const body = new FormData();
  body.append("file", small);
  try {
    const r = await fetch("/api/admin/upload", { method: "POST", body });
    const j = await r.json();
    return j.ok ? { ok: true, url: j.item.url } : { ok: false, error: j.error ?? "Upload failed" };
  } catch {
    return { ok: false, error: "No connection — try again." };
  }
}

export function ImagePicker({ open, onClose, onPick, current }: { open: boolean; onClose: () => void; onPick: (url: string) => void; current?: string }) {
  const { toast, confirm } = useShell();
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || items) return;
    listMedia().then((r) => setItems(r.ok ? r.items : []));
  }, [open, items]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    const r = await uploadPhoto(file);
    setUploading(false);
    if (!r.ok) return toast(r.error, { tone: "error" });
    setItems((x) => [{ url: r.url, name: "", size: 0, at: new Date().toISOString() }, ...(x ?? [])]);
    onPick(r.url);
    onClose();
  };

  const remove = async (m: MediaItem) => {
    if (!(await confirm({ title: "Delete this photo?", body: "If a product still uses it, that product will show an empty image.", confirm: "Delete photo", danger: true }))) return;
    const r = await deleteMedia(m.name);
    if (!r.ok) return toast(r.error, { tone: "error" });
    setItems((x) => (x ?? []).filter((i) => i.url !== m.url));
  };

  return (
    <Sheet open={open} onClose={onClose} title="Choose a photo" wide>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
      <Button variant="primary" size="lg" className="w-full" icon={uploading ? <SpinnerI /> : <UploadI />} disabled={uploading} onClick={() => input.current?.click()}>
        {uploading ? "Uploading…" : "Upload from phone"}
      </Button>
      <p className="mt-2 text-center text-[0.8rem] text-mute">Square photos look best. They’re resized automatically.</p>

      <h3 className="mb-2 mt-6 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-mute">Your photos</h3>
      {items === null ? (
        <div className="grid h-24 place-items-center text-mute"><SpinnerI /></div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-[0.88rem] text-mute">Nothing uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((m) => (
            <div key={m.url} className="relative">
              <Tile src={m.url} on={current === m.url} onClick={() => { onPick(m.url); onClose(); }} />
              {m.name && (
                <button aria-label="Delete photo" onClick={() => remove(m)} className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-bone/80 backdrop-blur active:bg-black/80">
                  <TrashI className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <h3 className="mb-2 mt-6 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-mute">RAW illustrations</h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {RENDERS.map((src) => <Tile key={src} src={src} on={current === src} onClick={() => { onPick(src); onClose(); }} />)}
      </div>
    </Sheet>
  );
}

function Tile({ src, on, onClick }: { src: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cx("relative block aspect-square w-full overflow-hidden rounded-2xl ring-offset-2 ring-offset-ink", on ? "ring-2 ring-lilac" : "ring-1 ring-white/[0.08]")}>
      <Thumb src={src} className="absolute inset-0 h-full w-full" />
      {on && <span className="absolute bottom-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full bg-lilac text-abyss"><CheckI className="h-4 w-4" /></span>}
    </button>
  );
}

/** A photo slot: shows the image, tap to change. */
export function ImageField({ value, onChange, className, label = "Photo" }: { value: string; onChange: (url: string) => void; className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={value ? `Change ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`} className={cx("group relative block overflow-hidden rounded-2xl border border-white/[0.08]", className)}>
        {value ? <Thumb src={value} className="absolute inset-0 h-full w-full" /> : <span className="absolute inset-0 grid place-items-center bg-ink text-mute"><span className="flex flex-col items-center gap-1 text-[0.75rem] font-medium"><ImageI className="h-6 w-6" /> Add</span></span>}
        {value && <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent pb-1.5 pt-4 text-center text-[0.7rem] font-semibold text-white">Change</span>}
      </button>
      <ImagePicker open={open} onClose={() => setOpen(false)} onPick={onChange} current={value} />
    </>
  );
}
