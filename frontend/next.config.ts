import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera .next/standalone para a imagem Docker (Easypanel)
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
