import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · RAW Admin" },
  robots: { index: false, follow: false },
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: { capable: true, title: "RAW Admin", statusBarStyle: "black-translucent" },
  icons: { apple: "/admin-icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#070608",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100svh] bg-abyss text-bone">{children}</div>;
}
