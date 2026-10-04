/** Lets the artist "Add to Home Screen" so the admin opens like an app. */
export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      name: "RAW Admin",
      short_name: "RAW Admin",
      start_url: "/admin",
      scope: "/admin",
      display: "standalone",
      background_color: "#070608",
      theme_color: "#070608",
      icons: [
        { src: "/admin-icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/admin-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } }
  );
}
