// Base path for the deployment. On GitHub Pages the site lives under a repo
// subpath (e.g. "/fitsole-vault"), so raw asset URLs that Next does NOT rewrite
// — useGLTF / useTexture fetches and plain <img> tags — must be prefixed.
// NEXT_PUBLIC_BASE_PATH is inlined at build time; empty for local dev (root).
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

// Prefix an absolute public-asset path (starts with "/"). next/image and
// next/link already apply basePath, so only use this for raw asset URLs.
export const withBase = (path: string): string => `${BASE_PATH}${path}`
