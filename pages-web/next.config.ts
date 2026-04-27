import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  // Cosmetic lint/type errors don't break prod builds; CI lint job catches them.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: {
    serverActions: { bodySizeLimit: "16mb" },
  },
  images: {
    remotePatterns: [{ hostname: "**" }], // covers come from Google Books, OpenLibrary, Audible, ...
  },
  async rewrites() {
    return [
      // Forward /api/engine/* to the FastAPI service (audio Range, conversion,
      // cover proxy, scanner triggers, exporter endpoints).
      {
        source: "/api/engine/:path*",
        destination: `${process.env.PAGES_ENGINE_URL || "http://localhost:8003"}/:path*`,
      },
    ];
  },
  // epubjs + pdfjs both ship browser-only code that breaks SSR; let webpack
  // resolve the right entry on the client and stub it on the server.
  webpack: (cfg, { isServer }) => {
    if (isServer) {
      cfg.resolve.alias = { ...cfg.resolve.alias, canvas: false, encoding: false };
    }
    return cfg;
  },
};

export default config;
