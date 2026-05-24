# FitSole — Egypt's Sneaker Vault · Session Handover

> Cinematic 3D Awwwards-style ecommerce homepage rebrand of **fitsole.shop**.
> A scroll-driven "walk through a Cairo sneaker vault" that is also a real, shoppable store.
> **Standing directive from the user: "make this a masterpiece. keep going."**

---

## 0. READ THIS FIRST — operational gotchas that cost time

- **Working directory ≠ project directory.** The shell cwd keeps resetting to a `m3lm` git worktree
  (`C:\Users\acer\Desktop\m3lm\.claude\worktrees\...`). The actual project is
  **`C:\Users\acer\Desktop\fitsole-rebranding`**. **Always use absolute paths**, and `cd` into the
  project for `npm` commands. (A bare `Grep` earlier searched the worktree and found nothing — don't trust
  relative searches.)
- **Dev server:** `cd /c/Users/acer/Desktop/fitsole-rebranding && npm run dev` → http://localhost:3000
  (Next 16 / Turbopack, ready in <500ms).
- **Build:** `npm run build`. **Stop the dev server first** — both use `.next` and will clash.
- **Killing a stale dev server:** target the port owner, do **not** blanket-kill all node:
  `Get-NetTCPConnection -LocalPort 3000 -State Listen` → `Stop-Process -Id <pid> -Force`.
  (A broad `Stop-Process` once killed a PowerShell host mid-command.) If you suspect a zombie stale
  bundle, also `Remove-Item -Recurse -Force .next`.
- **PowerShell `2>&1` on native exes** (npm, gltf-transform) wraps stderr as error records → false exit 255
  even on success. Use `2>$null` or don't redirect; verify the real output.
- **Chrome MCP:** tab id **1078283947** (`tabs_context_mcp` to confirm). Scroll via `javascript_tool`
  (`window.scrollTo`, set `document.documentElement.style.scrollBehavior='auto'`). Wait ~3s for the camera
  lerp before screenshots. Use `browser_batch` to chain navigate→wait→js→screenshot.
- **You CANNOT measure FPS through the automation tab.** It runs with `document.hidden === true`, which
  **pauses `requestAnimationFrame`** (a rAF-threshold promise will hang the full 45s CDP timeout; a
  setTimeout-bounded rAF counter returns `fps:0, frames:0`). For real FPS, open localhost:3000 in a
  foreground browser yourself.
- **`resize_window` does NOT change the rendered viewport** (stays ~1707px wide). You cannot test a true
  mobile viewport through this tooling. To verify the mobile/reduced-motion fallback, temporarily force it
  in code (see §4) and revert.
- **The only console error is benign:** a hydration warning for `cz-shortcut-listen="true"` on `<body>`,
  injected by a browser extension — NOT a code bug. Ignore it; don't chase it.
- **Advisor protocol:** call `advisor()` before substantial work and before declaring done. It sees the
  full transcript. It has been the source of every priority call this project.

---

## 1. Tech stack

- Next.js **16.2.6** (App Router, Turbopack), React **19.2.4**, TypeScript, Tailwind **v4** (`@theme inline` tokens)
- React Three Fiber 9.6.1, drei 10.7.7, three 0.184.0, @react-three/postprocessing 3.0.4 (Bloom, Vignette, EffectComposer)
- GLB optimization: `@gltf-transform/cli optimize in.glb out.glb --texture-compress webp --texture-size <N>`
  (applies simplify + webp + meshopt; drei `useGLTF` auto-decodes meshopt). **No GLB >15MB first-load. DPR clamped [1,1.5].**
- Images: `next/image` with `cdn.shopify.com` allowed in `next.config.ts`.

### Asset workflow (IMPORTANT)
- 3D assets are generated **manually on tripo3d.ai — there is NO Tripo API.** When a new asset is needed,
  **send the user an exact Tripo prompt**; they generate it and drop the GLB in `/public/models/tripo/`.
- **Procedural rule:** shelves, counter, verification card, hero plinth, and shoeboxes are built
  **procedurally in Three.js** — NOT from the wooden-desk / retail-shelf / pedestal GLBs the user sent
  earlier (those were rejected: too heavy / wrong look). Only the **sneaker** GLBs are loaded (hero + shelves).
- Brand logos are **real** (Simple Icons CDN `https://cdn.simpleicons.org/<slug>/<hex>` or saved SVGs in
  `/public/brand-logos/`). **Never AI-fake a logo.** ON has no Simple Icons mark → rendered as a text wordmark.

---

## 2. Current state — what is DONE and verified

The homepage is a **complete, shoppable, cinematic experience**. Production build passes clean
(TypeScript + static gen). Verified in-browser this session:

**The 3D vault (desktop / capable devices):**
- Premium preloader curtain → entrance → "step inside" → **hero pedestal** → drop wall → authenticity →
  brand corridor → membership, all scroll-driven via a 700vh container + sticky 100vh canvas.
- 18 real sneaker instances on amber-LED smoked-glass shelves (6 unique optimized GLBs, cycled).
- Real hero sneaker spotlit on a procedural plinth, slow rotation + float + halo ring.
- Postprocessing: Bloom (mipmapBlur, intensity 0.85, threshold 0.5) + Vignette. Reflective floor, dust motes, wall/ceiling LED strips, door-threshold reveal.

**Commerce (real, working):**
- Real catalog scraped from fitsole.shop — 12 products, EGP prices, sale strikethroughs, Shopify CDN photos
  (`lib/products.ts`).
- 4 product grids (New Arrivals / Best Sellers / Sale / The Wall) via `ProductWall`.
- **Hero → product bridge:** the hero overlay features the **A.E. 1 Low** (Adidas · Basketball · 8,499 EGP ·
  Limited) with a **"Shop This Pair"** CTA that anchors to `#adidas-ae-1-low` (the product card has
  `id={slug}` + `scroll-mt-24`).
- **Working cart:** add from any product card → header count badge + auto-opening slide-in drawer with line
  items, qty steppers, remove, subtotal, Checkout → fitsole.shop. Persists to localStorage across reloads.
  **SSR-safe — no hydration mismatch.**

**Robustness / a11y:**
- **Reduced-motion + phones** (`prefers-reduced-motion` OR `(max-width:640px) and (pointer:coarse)`) get the
  lightweight static hero `VaultStatic` — **the WebGL canvas does not even mount** (verified `canvasPresent:false`),
  so phones pay zero GLB/GPU cost. iPads stay on the rich 3D path. (This fixed a real bug: `VaultStatic` used
  to be dead code, so reduced-motion users got an invisible, CTA-less hero.)

---

## 2.5 — Latest session (real sneakers + video fused into WebGL)

Shipped to `main` + gh-pages (live) in two commits:

- **Phase A `cacfb6f` — real Tripo sneakers.** All 7 placeholder GLBs replaced with photoreal
  Tripo models generated from the real fitsole product shots (refs in `Desktop/fitsole-tripo-refs/`),
  optimized via gltf-transform (webp, 1024px, meshopt): hero **A.E. 1 Low** (983KB) + 6 shelf pairs
  (~0.6–0.7MB each). Dropped the `clayShelfMat` tint so each pair shows its true colorway. Verified
  orientation at the hero (0.43), entrance (0.12), and New Drops (0.6) beats. The shelf-shoe yaw is
  `rotation={[0, sx>0?-1.15:1.15, 0]}` — re-check if you swap shelf models again.
- **Phase B `978ebb4` — unboxing film fused into the 3D vault.** `DropFeature` (x=-1.6/z=-5.2, the
  "New Drops" glance beat) is now a wall-mounted **16:9 video display** playing the cinematic A.E. 1
  unboxing via drei **`useVideoTexture`** (`meshBasicMaterial`, `toneMapped={false}`, sRGB,
  `withBase('/video/ae1-unboxing.mp4')`), framed by a graphite bezel + amber edges, yawed `0.4` rad
  toward the aisle. **Playback is scroll-gated** in a `useFrame`: plays (looping) only across
  `p≈0.30–0.62`, pauses otherwise. **Critical:** the video sits in its **OWN `<Suspense fallback={DropWallBezel}>`**
  inside VaultScene so a buffering texture can never blank the whole scene (VaultCanvas wraps the
  WHOLE scene in one Suspense — do NOT add another suspending hook to VaultScene without its own boundary).
- **Video asset:** `public/video/ae1-unboxing.mp4` is a **seamless loop** (Kling 3.0 `pro`, 16:9, sound off,
  `start_image = end_image` = the unboxing still → invisible loop seam). **1.5MB** (was 6.4MB). Poster
  `ae1-unboxing.webp` (75KB) is that same anchor still. Higgsfield MCP balance ~580 credits (Pro).
- **`FeaturedUnboxing.tsx`** (flat section after the vault) — KEPT (it's the only product motion on the
  mobile/reduced-motion path where the 3D wall doesn't mount). Fixed a live bug: its `<video>` `src` +
  `poster` were raw `/video/...` (404 under the `/fitsole-vault` subpath) → now `withBase()`.
- **`window.__vaultForce`** = a 0–1 number pins the camera + overlay + video gate to any beat for
  screenshot verification (inert unless set). Chrome MCP tab this session: **1078285256**.
- **Exit-beat refinement (same session, follow-up):** the membership beat used to end on an empty
  black void because `LOOK_PATH`'s last point sat on the camera position (a degenerate near-straight-
  down stare). Changed that endpoint to `(0, 1.05, -16)` so the exit looks DOWN the hall, and added
  `<ExitThreshold/>` — a quiet warm halo ring (echoes the hero plinth glow) at `z=-17.3` the camera
  resolves on (also softly visible behind the brand-corridor headline — intended, one continuous
  "back of the vault" glow). `CAMERA_PATH` end stays `z=-12` (a forward nudge to -13.5 was tried +
  reverted — it framed a blown-out totem at p≈0.92). Also raised the brand-corridor chip contrast in
  `VaultOverlay.tsx` (gold border + backing plate, an audit flag), and deleted ~32MB of dead
  non-optimized GLBs from `public/models/tripo/` (code only loads the `.optimized.glb` variants).

## 3. File map (key files)

```
app/
  layout.tsx          Fonts (Geist + Playfair), metadata, wraps children in <CartProvider>
  page.tsx            HomePage: Header, VaultExperience, TrustSection, CategoryNav, BrandStrip, 4×ProductWall, Footer
  globals.css         @theme inline vault tokens; .vault-scrim, .vault-copy, .font-display; overflow-x: clip (NOT hidden)

lib/
  assets.ts           ASSETS.heroSneaker + SHELF_SNEAKERS[6] (paths to /public/models/tripo/*.optimized.glb)
  products.ts         12 real products, Product type, formatPrice(), BRAND_COLORS, newArrivals/bestSellers/onSale
  cart.tsx            ★NEW CartProvider + useCart(). localStorage key 'fitsole-cart-v1'. SSR-safe pattern.
  cn.ts               className merge util

components/site/
  Header.tsx          Sticky scroll-aware header; nav; SEARCH BUTTON IS DEAD; cart button wired + count badge; mobile menu; renders <CartDrawer/>

components/vault/
  VaultExperience.tsx Scroll host (700vh). RAF loop: scene opacity + copy reveal transform + progress fill. fallback state → VaultStatic. resize-nudge for first-paint. VaultStatic defined here.
  VaultCanvas.tsx     R3F <Canvas> dpr[1,1.5], Suspense, mounts VaultScene
  VaultScene.tsx      ★BIG FILE — all 3D: materials, CAMERA_PATH/LOOK_PATH, ShelfModule, AuthenticityCounter, HeroDisplay, ShoeboxStack, DoorFrame, strips, EffectComposer, Environment
  VaultOverlay.tsx    7 DOM scenes (data-scene-from/to). hero-display wired to A.E.1 product. brands trimmed to Nike/Adidas/Puma/ON.
  VaultPreloader.tsx  ★NEW useProgress() curtain ("Entering the Vault"), min-show 700ms, 6s safety drain, z-100

components/commerce/
  ProductCard.tsx     Real photo + silhouette placeholder, size selector, Add to Cart → useCart().add(), id={slug} scroll-mt-24
  ProductWall.tsx     Grid section (filter: new|best|sale|all)
  CartDrawer.tsx      ★NEW slide-in drawer (z-120), Escape + body scroll lock, Checkout → https://fitsole.shop

next.config.ts        images.remotePatterns: cdn.shopify.com

public/models/tripo/  hero_sports_sneaker_web_v01.optimized.glb (1.05MB) + shelf_sneaker_{white,pink,03,athletic,olive,colorful}_v01.optimized.glb (~0.6–0.85MB each)
public/brand-logos/   nike.svg, adidas.svg, puma.svg
```

Source-of-truth design pack lives in the repo: **V5_PRO** prompt-factory (`FITSOLE_..._V5_PRO`).

---

## 4. How to verify (repeatable)

```bash
# build
cd /c/Users/acer/Desktop/fitsole-rebranding && npm run build      # expect "Compiled successfully" + clean TS

# dev
cd /c/Users/acer/Desktop/fitsole-rebranding && npm run dev        # localhost:3000
```

- **Hero→product:** scroll to ~0.41 progress → A.E.1 panel; `location.hash='adidas-ae-1-low'` lands on the card.
- **Cart e2e (via Chrome MCP, since clicks need React re-render between steps):**
  1. click a size button `#<slug> button[aria-label^="Size"]`
  2. (separate call so React flushes) click the last `<button>` in the card → adds + opens drawer
  3. assert header badge text + `aside[aria-label="Shopping cart"]` contents
- **Persistence:** reload → header badge re-renders from localStorage; drawer starts closed.
- **Fallback render (the only way to SEE VaultStatic through tooling):** in `VaultExperience.tsx` temporarily
  change the detection effect's `const update = () => setFallback(mqReduce.matches || mqMobile.matches)` to
  `() => setFallback(true)`, navigate, screenshot (expect `canvasPresent:false`, "Browse All" CTA), then **revert**.

---

## 5. Known limitations / open items (next-session candidates)

1. **Mobile layout of the hero-display overlay is unverified/unpolished.** The hero copy is left-aligned
   (`max-w-[20rem]`) so the centered 3D sneaker shows on desktop; on a narrow phone the text would overlap the
   sneaker. Text stays readable (scrim + shadow) but it's not designed for mobile. NOTE: phones now get
   `VaultStatic` anyway, so this only matters if the mobile breakpoint for the fallback is loosened. Cannot be
   tested through current tooling (see §0) — needs a real device/browser.
2. **Real FPS never measured.** Advisor flagged 6 GLBs + 18 instances + reflective floor + Environment + bloom
   as "near the upper bound for a mid-range laptop." Check on a real foreground browser. **Do not add more 3D.**
3. **Search button in the header is dead** (no handler). Wire it or remove it.
4. **Checkout is a deep-link to fitsole.shop**, not a real checkout (intentional scope cap). No discount codes,
   inventory, accounts, or address forms — by design.
5. **Brand-corridor / BrandStrip links** point to `#brand-nike` etc. with no matching sections (aspirational).

---

## 6. Conventions & constraints (do not violate)

- Optimize every GLB with gltf-transform before use; keep first-load light; DPR [1,1.5]; Suspense fallback everywhere useGLTF is used (ModelOrFallback pattern with an error boundary catches 404s → placeholder).
- Keep text readable over 3D (scrim + text-shadow). No AI-faked brand logos.
- Never blanket-kill node; never leave `overflow-x: hidden` on html/body (it broke sticky scroll — must be `clip`).
- localStorage in React: empty initial state, load in `useEffect`, persist after a `hydrated` flag — never read storage at module scope or in a `useState` initializer (causes hydration divergence).
- Ship workflow: commit to **`main`** → `git push origin main` → `GITHUB_PAGES=true npm run build` →
  `npx --yes gh-pages -d out --dotfiles` (publishes the static `out/` to the gh-pages branch, served at
  omarradwann.github.io/fitsole-vault). The user has approved pushing directly to `main`. Commit msgs via
  `git commit -F <file>` (here-strings break in this shell). Raw asset URLs (GLB/texture/**video**/`<img>`)
  MUST use `withBase()` — next/image + next/link auto-prefix, raw `src`/`poster` do NOT (404s on the subpath).

---

## 7. One-paragraph status for the next session

The FitSole homepage is a finished, verified, shoppable 3D experience: cinematic vault walk on desktop with a
real hero→product bridge and a working localStorage cart (badge + drawer), plus a clean reduced-motion/mobile
static fallback that skips WebGL entirely. Build is clean. The user's standing goal is "make it a masterpiece —
keep going." The highest-value untouched items are: (a) a real mobile pass for the hero overlay, (b) a foreground
FPS check before adding anything heavy, (c) wiring or removing the dead search button. Read §0 before touching the
dev server or trying to screenshot/measure anything.
```
