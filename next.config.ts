import type { NextConfig } from "next";

// Build with GITHUB_PAGES=true to emit under the project subpath. The "/" is a
// literal here (NOT passed through the shell) to dodge Git-Bash's POSIX-path
// mangling of "/fitsole-vault" into a Windows path. Empty for local dev (root).
const basePath = process.env.GITHUB_PAGES === "true" ? "/fitsole-vault" : "";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack stops inferring a parent lockfile
  // (C:\Users\acer\pnpm-lock.yaml) over this project's own package-lock.json.
  turbopack: { root: __dirname },
  // Emit a fully static site (out/) so it can be served by GitHub Pages.
  output: "export",
  trailingSlash: true,
  basePath: basePath || undefined,
  // Expose the same prefix to client code (lib/basePath → withBase) so raw
  // asset URLs (useGLTF/useTexture, plain <img>) resolve under the subpath.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: {
    // GitHub Pages has no image-optimization server.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
      },
    ],
  },
};

export default nextConfig;
