# FITSOLE VAULT — Moonshot Handover (v4, codebase-reconciled)
*The single doc a fresh session opens to take `omarradwann.github.io/fitsole-vault/` to the moon.*
*Reconciles the external "v3 CD handover" against the real codebase as of commit `52c3d26`. Where v3 and the code disagree, the code wins — see §1.*

---

## 0. Read order (for the next session)
1. `HANDOVER.md` §0 (operational gotchas) — then §2 here for the deltas.
2. This doc §1 (ground truth) and §3 (the confirmed scope decision).
3. §4 (extension points) before touching any 3D.
4. Execute §5 top-down. P0 first — it unblocks everything and is also the biggest felt-quality win.

---

## 1. Ground truth — what is ACTUALLY live (this corrects the v3 doc)

The v3 CD review is directionally excellent but reviewed an **older build** and had three factual errors. Don't act on them:

| v3 claim | Reality (verified in code) | Action |
|---|---|---|
| "Cart shows 1 item (PUMA UP) on fresh load" | **FALSE.** `lib/cart.tsx:40-58` inits `[]`; only restores from localStorage in a deferred `useEffect`. The reviewer saw their own persisted item. | No fix. |
| "The Wall grid has broken images, half gray silhouettes (P0)" | **FALSE.** All 12 products in `lib/products.ts` use valid `cdn.shopify.com` URLs. The branded silhouette (`ProductCard.tsx:64-76`, tinted by brand, opacity 0.15) is an intentional load/error fallback, not a bug. Reviewer likely caught images mid-load. | No fix needed. |
| "Title paints over the pedestal shoe in Act II" | **FALSE.** Entrance scene `from:0 to:0.18` (`VaultOverlay.tsx`); opacity fades to 0 by 0.18, before the hero beat (0.32–0.50). | No fix. |

**Already shipped since v3 reviewed it (do NOT re-propose):**
- **Video-in-WebGL drop-wall** — `VaultVideoScreen` / `DropFeature` in `VaultScene.tsx:486-538`, `useVideoTexture` of `/video/ae1-unboxing.mp4` (a **seamless Kling loop**, 1.5 MB), self-lit screen + graphite/amber bezel, **playback scroll-gated 0.30–0.62**, isolated in its **own `<Suspense>`** so a stalled video can't black out the scene.
- **Exit halo** — `ExitThreshold` in `VaultScene.tsx:618-646`, warm gold ring at `z=-17.3`; `LOOK_PATH` end was redirected to `(0,1.05,-16)` so the exit looks down the hall at it (fixed a degenerate straight-down stare).
- **Real photoreal sneakers** everywhere (7 optimized Tripo GLBs); **~32 MB of dead GLBs removed**; `out/models/tripo` is 4.8 MB.
- **`FeaturedUnboxing`** flat section (poster + asymmetric editorial copy, `withBase`-safe).

**What v3 gets RIGHT (real, open):**
- ❌ **No audio.** Silent. (`AudioContext`/Howler absent.)
- ❌ **No smooth scroll.** Vanilla scroll + rAF damping; no Lenis (`package.json` has none).
- ❌ **`frameloop` defaults to `"always"`** (`VaultCanvas.tsx`, no prop) → the canvas renders every frame even when the user scrolls into the flat shop below (canvas never unmounts). Wasted GPU. **This is the #1 perf issue and matches this session's own expert review.**
- ❌ **Plinth is basic procedural cylinders** (`HeroDisplay`, `VaultScene.tsx:363-375`): disc r0.65 + shaft r0.2 + metal ring + gold torus.
- ❌ **18 non-instanced GLB clones** for shelf shoes (`ModelOrFallback` deep-clones per instance; `ShelfModule` places 6 modules × 3 shoes). ~250–300 draw calls.
- ➕ (this session's review, not in v3): **no contact shadows** under shelf shoes (they float slightly); **no MSAA** (`multisampling=0`); **abrupt vault→flat gap**; the wall has **no poster fallback** if the mp4 503s (GH Pages occasionally 503s media under load → bezel-only).

**Honest current score (cold expert, this session):** ~7/10 — premium, cohesive, one standout (video-in-WebGL); held back by perf hygiene + a few craft gaps. The moves below target the gap to ~9.

---

## 2. Operational gotchas (deltas to HANDOVER.md §0 — READ)
- **Project dir:** `C:\Users\acer\Desktop\fitsole-rebranding`. The shell cwd resets to an `m3lm` worktree between calls — **always `cd` into the project in the same command** (a bare `npm run dev` failed this session with "Missing script: dev" for exactly this reason). Use absolute paths.
- **Dev:** `cd /c/Users/acer/Desktop/fitsole-rebranding && npm run dev` → :3000 (Next 16 / Turbopack). **Kill before build** (shared `.next`): `Get-NetTCPConnection -LocalPort 3000 -State Listen | Stop-Process -Id <pid> -Force` — never blanket-kill node.
- **Never** redirect a native exe's stderr (`2>&1`) in PowerShell — false exit 255. In bash use `2>/dev/null` or nothing.
- **Commits:** `git commit -F <file>` (here-strings break in this shell); bash heredoc `git commit -F - <<'EOF'` works. End messages with the `Co-Authored-By: Claude Opus 4.7 (1M context)` line.
- **Ship workflow (user approved direct pushes to `main`):** commit → `git push origin main` → `GITHUB_PAGES=true npm run build` → `npx --yes gh-pages -d out --dotfiles`. Served at `omarradwann.github.io/fitsole-vault/`. GH Pages propagation ~30–90s.
- **`withBase()` is mandatory** for raw asset URLs (GLB/texture/**video**/audio/`<img src>`/`poster`) — `next/image`+`next/link` auto-prefix the `/fitsole-vault` subpath, raw attrs do NOT (silent 404 on live). `lib/basePath.ts`.
- **`window.__vaultForce = <0..1>`** pins camera + overlay + media-gates to any beat for screenshot verification (inert unless set). **Reset to `undefined`** when done.
- **FPS is NOT measurable via the automation/CDP tab** — it reports `document.hidden=true`, which pauses rAF, hanging any frame-counter eval. Real FPS needs a foreground browser + the `?fps` overlay. When scrubbing beats, allow full settle (reload + 3–4s) before judging — rapid scrubs produce mid-lerp artifacts that look like bugs but aren't.
- **Higgsfield MCP** (image/video only — no audio): `nano_banana_pro` (Nano Banana 2, image), `kling3_0` (video; supports `start_image`+`end_image` for **seamless loops**; `get_cost:true` to preflight). Balance ~580 credits. Used for the unboxing loop already.

---

## 3. Confirmed scope (decided with the user — overrides v3)
- **KEEP the page shoppable.** Do **NOT** cut the catalog grids (the v3 "home-only, cut 4,800px" move is **rejected**). The full page stays: vault → FeaturedUnboxing → TrustSection → CategoryNav → BrandStrip → ProductWall×3 → ShopWall → Footer. The `01–04` CategoryNav anchors, footer links, and `VaultStatic` links **keep working as-is** (no repointing).
- **Moonshot = additive elevation,** not a restructure. Every move below layers onto the existing architecture.
- **Reframe the v3 "Sky Moment / Act V":** since grids stay, the Sky-Moment closer becomes the **vault→commerce bridge** (fixes this session's "abrupt black gap" finding). Its CTA is "Explore the drops ↓" (scroll into the shop), not a leave-site button — though keep the `Continue on fitsole.shop` affordance the cart drawer already has.
- **Audio:** build the full WebAudio engine NOW with **royalty-free/CC0 or AI-sourced placeholder cues**; pro sound swaps in later by replacing files in `/public/audio/`. (Decided.)
- **v2 dynamic features (ghost shoppers / drop countdown / persistent state) are OUT for now** — they need a live backend (WebSocket / dynamic data); this is a **static GitHub Pages export** (`next.config.ts` `output:'export'`). Flag for a future "needs a backend" phase; don't attempt on the static site.

---

## 4. Architecture & extension points (build on these — don't reinvent)

| System | Where | How to extend |
|---|---|---|
| **Chapter overlays** | `VaultOverlay.tsx` — `scenes[]` of `{id, from, to, content}` (7 scenes: entrance .0–.18, entering .18–.32, hero-display .32–.50, drop-wall .50–.65, authenticity .65–.80, brands .80–.92, membership .92–1.0) | Add a new beat = push an object with a `from/to` range. `VaultExperience.tsx:116-136` rAF auto-computes opacity (`fadeLen=range*0.3`) + the 22px `.vault-copy` rise. No wiring needed. |
| **Camera/look** | `VaultScene.tsx:20-42` `CAMERA_PATH` + `LOOK_PATH` (CatmullRom, 8 pts each); driven in `useFrame` (`:714-740`) by `scrollProgress`, lerp `1-exp(-12·dt)` | New act = add control points to BOTH curves (keep z monotonic), add matching overlay scene, and **bump `height:'700vh'`** in `VaultExperience.tsx:176` if you add scroll length. Verify with `__vaultForce`. |
| **Scroll driver** | `VaultExperience.tsx:70-167` — 700vh container, damped `scrollProgress` ref (decay 9), `__vaultForce` override | Lenis integration point: drive the same `scrollProgress` from Lenis's `scroll` event instead of `getBoundingClientRect`. |
| **Materials** | `VaultScene.tsx:44-141` — incl. `goldMat`(#BFA06A, metal .8), `amberMat`(#FFB366 emissive), `plinithMat`, `graphiteMat`, `metalMat` | **Brass library:** build `brassMat` once (clone `goldMat`, tune toward #C9A36A / anisotropic), reuse on plinth, plaque, sky cube, cart icon. Don't scatter ad-hoc materials. |
| **Scroll-gated 3D event** | `VaultVideoScreen` useFrame (`:498-515`) — `play/pause` when `0.30<p<0.62` | **This is the template** for the Authentication Beat trigger and Wax-Seal trigger: a ref-guarded one-shot fired when `scrollProgress` enters a window (re-arm on exit so it replays on scroll-back). |
| **GLB loader** | `ModelOrFallback.tsx:46-108` — `useGLTF` + `clone(true)`, `normalizeTo`, `seat`, shared-material override, fallback mesh | Instancing target (P0 #3). New props honored; reuse for the plinth/wax-seal GLBs. |
| **Loader curtain** | `VaultPreloader.tsx` — `useProgress()`, min 700ms, 6s safety, z-100 | Swap the progress bar for the brass-key-turning loader (Move 13). |
| **Mobile/RM fallback** | `VaultStatic` in `VaultExperience.tsx:11-46` — gated by `prefers-reduced-motion` OR `(max-width:640px)and(pointer:coarse)`; canvas never mounts | Any audio/scene work must keep this path working (it's the only mobile experience). Add a 6-still parallax + same audio bed here per v3. |
| **Render loop** | `VaultCanvas.tsx:56-68` — no `frameloop` (=="always"), dpr 1.1 ladder→0.6, `PerformanceMonitor`, `shadows="percentage"`, `multisampling=0` | P0 #1: set `frameloop="demand"` + `invalidate()`. |

---

## 5. The moonshot moves — prioritized & file-mapped (execute top-down)

### P0 — Performance foundation (do FIRST; biggest felt-quality win, unblocks the rest)
1. **`frameloop="demand"` + invalidate.** `VaultCanvas.tsx`: add `frameloop="demand"`. In `VaultExperience.tsx` rAF, call drei `invalidate()` whenever `scrollProgress` changes (and while any per-frame animation — video, float, halo shimmer — needs ticking; gate those so idle = no render). Net: stop rendering the unseen vault while the user shops. **Verify the video wall + float still animate.**
2. **Lenis smooth scroll.** `npm i lenis`. Init in a client effect (e.g. in `VaultExperience` or a root provider), drive `scrollProgress`/`invalidate()` from `lenis.on('scroll')`, `requestAnimationFrame(lenis.raf)`. Respect `prefers-reduced-motion` (skip Lenis). Kills the jagged Windows-trackpad feel on the heavy scene.
3. **Instance the shelf shoes.** Replace per-instance `clone()` with one `InstancedMesh` per unique `SHELF_SNEAKERS` model (6 unique → 6 instanced draws for 18 placements), or at minimum share geometry+material across placements. Files: `ModelOrFallback.tsx`, `ShelfModule` in `VaultScene.tsx:181-228`.
4. **Asset pipeline:** confirm GLBs are DRACO/Meshopt (gltf-transform `optimize` already applies Meshopt) and textures KTX2 where it helps; keep first-load lean. (Mostly done; verify.)
*Exit criteria: `?fps` on a mid-range laptop shows ~55–60fps through the full scroll, and idle GPU drops when parked in the shop.*

### P1 — Signature moments (the "wtf that's amazing" layer)
5. **Audio engine + placeholder cues** (see §6). Mute toggle top-right (persisted, default on, iOS-autoplay-safe), ambient bed that ducks for cues, scroll-triggered one-shots reusing the gate pattern (§4). Sounds in `/public/audio/` via `withBase`.
6. **The Authentication Beat** (the trust spectacle; reuse the scroll-gate). On entering the authenticity window: a violet UV scanline sweeps the pedestal shoe (1.2s), three staged badges burn in (STITCH✓ → WEIGHT✓ → UV✓, 0.3s apart), a brass plaque inscribes `LOT #04219 · 24 MAY 2026 · CAIRO`, authentication chime on the 3rd badge. Re-arms on scroll-back. Custom GLSL scanline on the hero material; brass plaque uses `brassMat`. ~2.5s.
7. **Sculpted brass plinth.** Replace the cylinders (`HeroDisplay:363-375`) with: brushed-brass collar (PBR `brassMat`), slim black-marble cylinder, etched FitSole sigil (slow-rotates with the pair), faint floor reflection, halo ring with an anisotropic specular shimmer (4s period). Keep it light (<150 KB if a GLB; or lathe/extrude geometry).
8. **Wax-seal on Featured Drop.** On scroll-in: a brass stamp descends, presses red wax onto a cert at the box corner, lifts (leaves the sigil), wax-seal thunk cue, then the existing reveal. Add a small `Watch us authenticate it →` link (expands to a real 30s Cairo BTS video — **human-dependent**, placeholder for now). Note: the current `FeaturedUnboxing` is a flat DOM section with the video; decide whether the wax-seal is a WebGL beat in the vault or a CSS/video moment in the flat section.
9. **Sky-Moment bridge** (Act V → shop). New final vault beat: camera pulls back through the ceiling, vault shrinks to a brass cube hanging over a dawn Cairo skyline silhouette (generate via Higgsfield Nano Banana as a backplate, or low-poly), single bird crosses, ney-flute cue, cube inscribes `FITSOLE — Egypt's Sneaker Vault`, CTA `Explore the drops ↓`. Extend `CAMERA_PATH`/`LOOK_PATH` + add overlay scene + bump `700vh`. **This also fixes the abrupt vault→flat gap.**

### P2 — Craft & polish
10. **Contact shadows** under shelf shoes (drei `<ContactShadows>` per shelf, or baked AO blob) so they sit on the glass. `VaultScene.tsx`.
11. **AA pass** for thin emissives (SMAA/FXAA in EffectComposer on the high tier, or enable multisampling) — kill LED-strip shimmer at low DPR.
12. **Video-wall poster fallback** — paint the `.webp` first frame on the screen mesh until the texture is ready / if the mp4 503s. `VaultVideoScreen`.
13. **Brass-key pre-roll loader** — restyle `VaultPreloader` as a brass key turning in a lock (600ms). Turns latency into theatre.
14. **Brand strip + footer polish** — `BrandStrip.tsx` center/marquee the logos (kills the left-aligned-empty-right look); the footer can host the ambient-audio toggle + a warmer sign-off (the Sky-Moment already carries the emotional close).
15. **Beat density / scroll length** — only if mid-beats still feel sparse after the Sky Moment + audio land.

### v2 — needs a backend (OUT for the static site; document only)
- Ghost shoppers (WebSocket presence → amber motes at visitor scroll positions), drop countdown ribbon, persistent merchandiser-edited state (rotating hero pair, SOLD plaques). Requires a server (Supabase Realtime / a tiny WS service). Revisit if/when the site moves off pure static hosting.

---

## 6. Audio plan (system now, pro sound later)
- **Stack:** Web Audio API directly (or `howler` for convenience — check bundle cost). Single `AudioContext`, unlocked on first user gesture (iOS Safari). One `GainNode` master + a duck bus.
- **Files** (`/public/audio/`, served via `withBase`, target ~3 MB total Opus/AAC): room-tone bed (loop), vault-door (3s), hi-hat tick (×6 pitch variants), auth chime (1.5s), wax thunk (0.8s), brand-corridor rumble (8s loop), ney flute (12s), 6 UI cues (<200ms).
- **Triggers:** reuse the scroll-gate ref pattern (§4) — fire one-shots when `scrollProgress` crosses a beat; bed loops always (paused with the render loop when off-screen/hidden); duck bed −6 dB during cues.
- **Placeholder sourcing (agent-doable now):** CC0 from freesound/pixabay-audio, or synthesize simple tones (Web Audio oscillators for ticks/chime) committed as a clearly-labelled placeholder set. Swap pro files later — same filenames, no code change.
- **Controls:** mute toggle top-right, `localStorage` persisted, default ON with a muted-autoplay-safe first state; respect `prefers-reduced-motion` (no auto-cues) and the mobile fallback.

---

## 7. Asset list — agent-doable vs human-dependent
**Agent can build/source now:** brass material library; UV scanline GLSL; wax-seal rigged mesh (or procedural); brass plaque (procedural text); Cairo skyline backplate + brass cube (Higgsfield Nano Banana / low-poly); brass-key loader; the entire audio *system* + placeholder cues; Lenis/perf/instancing/contact-shadows/AA; Sky-Moment scene.
**Human-dependent (flag, use placeholders):** professionally composed/mastered sound design; the real 30s Cairo behind-the-scenes authentication video; final brand sign-off on copy.

---

## 8. Bug list (accurate status)
| # | Item | Severity | Status / action |
|---|---|---|---|
| 1 | `frameloop="always"` renders unseen vault | **P0** | Open → Move #1. |
| 2 | Jagged scroll (no Lenis) | **P0** | Open → Move #2. |
| 3 | Renderer stalls on rapid scroll | **P1** | Partly the CDP/hidden-tab quirk; #1+#2+#3 instancing should resolve. Verify on real hardware. |
| 4 | Shelf shoes float (no contact shadow) | **P2** | Open → Move #10. |
| 5 | Video wall blank if mp4 503s | **P2** | Open → Move #12 (poster fallback). |
| 6 | "Cart shows 1 item on load" (v3) | — | **NOT A BUG** (§1). |
| 7 | "Broken Wall images" (v3) | — | **NOT A BUG** (§1). |
| 8 | "Title over shoe" (v3) | — | **NOT A BUG** (§1). |

---

## 9. File map (the files you'll touch)
```
components/vault/
  VaultCanvas.tsx      frameloop, dpr ladder, PerformanceMonitor, AA  → Moves 1, 11
  VaultExperience.tsx  scrollProgress rAF, 700vh, __vaultForce, VaultStatic, Lenis hook → Moves 1,2,9, audio
  VaultScene.tsx       ★ materials, CAMERA/LOOK paths, HeroDisplay plinth, ShelfModule,
                       VaultVideoScreen, ExitThreshold → Moves 3,6,7,9,10,12 + brass lib
  VaultOverlay.tsx     scenes[] (add Authentication Beat + Sky Moment beats) → Moves 6,9
  VaultPreloader.tsx   brass-key loader → Move 13
components/three/ModelOrFallback.tsx   GLB clone → instancing → Move 3
components/showroom/FeaturedUnboxing.tsx  wax-seal moment → Move 8
components/commerce/ProductCard.tsx    (silhouette fallback is intentional — leave)
components/site/BrandStrip.tsx, Header.tsx   brand-strip polish, mute toggle → Moves 5,14
app/page.tsx           section order (KEEP all); CategoryNav cats → Move 14 only if needed
lib/  cart.tsx (empty-init, fine) · products.ts (12, Shopify CDN) · assets.ts · basePath.ts(withBase)
public/  models/tripo/*.optimized.glb (4.8MB) · video/ae1-unboxing.{mp4,webp} · audio/ (NEW)
next.config.ts  output:'export', basePath /fitsole-vault (static — see v2 constraint)
HANDOVER.md     §0 gotchas + §2.5 what shipped (Phase A/B + refinement)
```

---

## 10. Verification (run after each move; full pass before launch)
- Build clean: `cd /c/Users/acer/Desktop/fitsole-rebranding && GITHUB_PAGES=true npm run build` (TS + static gen, exit 0).
- Beat regression via `__vaultForce` at p≈0.12/0.43/0.58/0.75/0.90/1.0 — screenshot, confirm hero, video wall plays, exit halo, new beats; reset `__vaultForce`.
- **`?fps` on a real foreground browser** (mid-range laptop): 55–60fps full scroll; idle GPU drops when parked below the vault (proves `frameloop="demand"`).
- Audio: mute toggle persists; bed ducks for cues; iOS-autoplay-safe; no cues under `prefers-reduced-motion`.
- Live: deploy, re-test video URL (200/206, graceful poster/bezel on 503), Lighthouse (perf + a11y, LCP<2.5s).
- Real phone: `VaultStatic` renders cleanly (the one path tooling can't see — confirm manually).

---

## 11. Definition of done / non-negotiables (if cutting, keep these)
1. **P0 perf** (frameloop demand + Lenis + instancing) — without it everything else stutters.
2. **Audio system** (even with placeholder cues) — a silent vault is a CSS demo.
3. **The Authentication Beat** — 2.5s that earn the brand promise; the most reusable marketing asset.
4. **The Sky-Moment bridge** — otherwise the cinematic exits into a flat gap.
5. **The sculpted brass plinth** — the hero pair is the star; it deserves better than a grey cylinder.
6. Mobile `VaultStatic` fallback stays intact through all of it.

**One-paragraph north star:** A first-time Cairo visitor walks a sounded, smooth, 60fps vault; watches a pair get authenticated (scanline + badges + brass plaque + chime); sees it wax-sealed and unboxed; rises through the ceiling to a brass cube over a dawn Cairo skyline; then flows into a shoppable wall and on to fitsole.shop — having been *earned*, not sold to. Ship that.

---
*v4 handover · reconciled against live build `52c3d26` · supersedes the v3 doc's stale claims + home-only cut (user chose: keep grids, build audio).*
