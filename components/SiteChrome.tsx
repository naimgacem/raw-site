import { StoreProvider } from "./store";
import { CatalogProvider } from "./catalog";
import AnnouncementBar from "./AnnouncementBar";
import Header from "./Header";
import Footer from "./Footer";
import LazyOverlays from "./LazyOverlays";
import { preload } from "react-dom";
import { getPublicCatalog } from "@/lib/catalog";

// The public site's frame: live catalog, bag, header/footer and overlays around one phone-width column.
export default async function SiteChrome({ children }: { children: React.ReactNode }) {
  const catalog = await getPublicCatalog();
  preload("/brand/logo-crown-sm.webp", { as: "image", fetchPriority: "high" });
  return (
    <CatalogProvider value={catalog}>
      <StoreProvider>
        {/* one phone-width column; the site is designed mobile-first */}
        <div className="mx-auto min-h-screen max-w-[560px] bg-abyss shadow-[0_0_80px_rgba(0,0,0,0.6)]">
          <AnnouncementBar items={catalog.settings.announcements} />
          <Header />
          <main>{children}</main>
          <Footer />
        </div>
        <LazyOverlays />
      </StoreProvider>
    </CatalogProvider>
  );
}
