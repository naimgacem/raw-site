import type { Metadata, Viewport } from "next";
import { Caesar_Dressing, Instrument_Sans, Tajawal } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/site";

// The bold display face Sunviya uses
const display = Caesar_Dressing({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
// Arabic for the order form (Caesar Dressing has no Arabic glyphs)
const arabic = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700", "800"], variable: "--font-ar", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: "RAW — Royal Art Weaves | Braids · Twists · Barrel twists · Art", template: "%s | RAW — Royal Art Weaves" },
  description: "Braids, twists, barrel twists and hair art — styled like royalty. Mobile braider, we come to you. Book by DM and shop silky durags, bonnets and hair care.",
  openGraph: {
    title: "RAW — Royal Art Weaves",
    description: "Braids · Twists · Barrel twists · Art. Styled like royalty.",
    images: ["/og.jpg"],
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#CDB8F7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${arabic.variable}`}>
      <body>{children}</body>
    </html>
  );
}
