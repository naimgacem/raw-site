import type { Metadata, Viewport } from "next";
import { Caesar_Dressing, Instrument_Sans, Tajawal } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/site";

// The bold display face Sunviya uses
// "block": headlines wait the moment it takes this (preloaded) font to arrive, instead of flashing in
// a fallback face and jumping when it lands
const display = Caesar_Dressing({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "block" });
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
// Arabic for the order form (Caesar Dressing has no Arabic glyphs)
// not preloaded: only the order form uses it, so other pages don't spend bandwidth on it
const arabic = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700", "800"], variable: "--font-ar", display: "swap", preload: false });

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
    // suppressHydrationWarning: the inline script below marks <html> before React takes over
    <html lang="en" className={`${display.variable} ${sans.variable} ${arabic.variable}`} suppressHydrationWarning>
      <head>
        {/* lets the hero hide its words until the display font is in, then fade them up together */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.setAttribute('data-js','')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
