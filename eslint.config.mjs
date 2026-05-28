import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // CommonJS Node utilities (run with `node`, never bundled into the app) — a
    // `.cjs` file uses require() by definition, so flagging it is a false positive.
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // React Three Fiber layer. R3F's whole model is mutable per-frame state: the
    // useFrame callback intentionally mutates refs/objects after render, reads
    // ref.current during render, and seeds a mount timestamp (Date.now) in a ref.
    // The React-Compiler-aligned react-hooks v7 rules (immutability / purity / refs)
    // read these correct R3F idioms as violations. Scope them off for the 3D layer
    // only — they stay fully active across the rest of the app.
    files: ["components/vault/**/*.{ts,tsx}", "components/three/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
    },
  },
  {
    // SSR-safe hydration. The server renders a neutral default; the client corrects
    // it in a mount effect (reading localStorage for cart/audio prefs, resetting the
    // search query when the overlay reopens). That post-mount setState is the
    // recommended Next.js pattern here — not the cascading-render anti-pattern that
    // react-hooks/set-state-in-effect targets.
    files: ["lib/cart.tsx", "lib/audio.tsx", "components/commerce/SearchOverlay.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
