/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // lets a second build run (e.g. a check) without touching the dev server's .next
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    formats: ["image/avif", "image/webp"],
    // product photos uploaded from the admin live on Supabase Storage
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
};
export default nextConfig;
