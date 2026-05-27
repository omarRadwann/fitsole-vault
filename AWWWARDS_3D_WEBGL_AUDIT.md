# AWWWARDS / FWA 3D · WebGL Audit — FitSole Vault

**Site:** FitSole Cairo — scroll-driven 3D "sneaker vault" + shoppable storefront
**Local URL tested:** `http://localhost:3000/?debug=1&fps` (Next.js 16.2.6 / Turbopack dev)
**Audit date:** 2026-05-26
**Lens:** Awwwards SOTD jury (40% design · 30% UX/UI · 20% creativity · 10% content) + brutal WebGL/perf engineer
**Method:** Live local instrumentation (DOM accessibility tree, computed CSS, network waterfall, console, in‑app `?debug=1` overlay, GPU/tier boot log) + exhaustive source analysis of the running build, reconciled against the three prior real‑browser audits (`AUDIT_REPORT.md`, `ROUND2_REPORT.md`, `MOONSHOT_HANDOVER.md`).
**Stack:** Next 16 (App Router) · React 19 · three 0.184 · @react-three/fiber 9.6 · @react-three/drei 10.7 · @react-three/postprocessing 3.0 · gsap 3.15 · lenis 1.3 · Tailwind 4 · TypeScript. Single route `/`.

> ### ⚠️ Honest testing limitation (read before the scores)
> The automation preview browser runs the tab as **`document.hidden = true`**. The render loop is rAF‑driven, so the browser **parks it**: the in‑app overlay reads **FPS 0/0, DRAW CALLS 0, TRIANGLES 0**, and `preview_screenshot` **times out at 30 s** on the live WebGL canvas. The R3F store is not reachable from page‑eval (the canvas exposes only React fiber keys), so frames could not be forced. **This is the same, reproducible limitation the three prior reports documented.** Therefore:
> - **No live‑rendered WebGL frames, no measured FPS, and no live draw‑call/triangle counts were obtainable this session.**
> - Everything below about *visual look, motion feel, and frame‑rate* is grounded in **(a)** full source analysis, **(b)** the in‑app overlay's static readout (tier/DPR/GPU/postFX), **(c)** the network/console telemetry, and **(d)** the prior cold audits, which *did* screenshot the live site in a real Chrome. Every frame‑rate or "feels" claim is flagged **`[UNVERIFIED — needs real foreground device]`**.
> - **DOM/CSS/content/commerce/accessibility findings are first‑hand and reliable** (the accessibility snapshot and computed‑style tools work without canvas paint).
>
> **Test machine (from the live boot log):** `[vault] tier:high dpr:1.00 webgl2:true gpu: ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11)`. Windows 11, **Intel Iris Xe integrated GPU, 1.0‑DPR display, WebGL2**, auto‑tier **HIGH**.

---

## 1) Executive verdict

**Awwwards readiness: 7.0 / 10.** This is a genuinely premium, cohesive, and technically excellent 3D commerce experience that is in real striking distance of Site of the Day — but is currently a likely **Honourable Mention / Developer Award** site, not a lock for SOTD. It would clear round one (it is clearly not a hobby demo), then lose points on **product‑model fidelity, a narrative that lists rather than escalates, the absence of any 3D on mobile, and unverified frame‑rate on exactly the mid‑range hardware juries use.**

**Does it feel award‑worthy today?** Partly. The *world* (warm‑gold‑on‑near‑black vault, IBL‑first lighting, ACES filmic grade, the authentication beat, the in‑WebGL video screens) is SOTD‑grade. The *hero product* and the *story spine* are not yet — and on a sneaker site, the shoe is the whole point.

**Top 10 reasons it scores where it does**
1. Exceptional, disciplined art direction — one palette, one type system, IBL‑first lighting; reads expensive and consistent. *(strength)*
2. World‑class hidden engineering: instancing, `frameloop` gating, a 3‑tier adaptive ladder with a **DPR floor of 1.0**, baked IBL, video‑decode gating, shadow throttling, no‑transmission "fake" glass. *(strength)*
3. A real signature moment — the **Authentication Beat** (staged Stitch→Weight→UV badges + brass plaque + chime + a synced 3D "APPROVED" flash). *(strength)*
4. The hero **sneaker model fidelity is the ceiling** — Tripo‑generated GLBs read "premium‑ish," not photoreal; the prior real‑browser audit saw the hero go faceted on push‑in. *(gap)*
5. The narrative is an **anthology of parallel pitches** ("authentic / new / verified / brands / collective"), not a single escalating thread. *(gap)*
6. **No 3D on phones at all** — coarse‑pointer devices get a static text hero (`VaultStatic`); the entire "wow" is desktop‑only. *(gap, defensible but costly)*
7. **Frame‑rate is unverified on the target hardware** and the device auto‑runs the *full* HIGH stack on an Intel Iris Xe iGPU. *(risk)*
8. Strong, honest commerce: working cart, functional search, honest "Continue on fitsole.shop" checkout, real EGP catalog. *(strength)*
9. A **content‑integrity gap**: the brand corridor, brand chips, and search all promise **Nike**, but the catalog has **zero Nike SKUs**. *(gap)*
10. Accessibility and reduced‑motion handling are better than most award sites (aria everywhere, `prefers-reduced-motion` triple‑covered, focus rings, dialog semantics). *(strength)*

**Biggest thing holding it back:** the **hero product presentation** — model fidelity plus the fact that the shoe never gets a clean, photoreal "hero turntable" moment the eye can lock onto. On a sneaker site, that is the money shot, and right now the *room* is more convincing than the *shoe*.

**Biggest hidden strength:** the adaptive‑quality + performance‑hygiene engineering (`VaultCanvas.tsx`, `lib/deviceTier.ts`, the instancing and gating in `VaultScene.tsx`). This is the layer most "pretty" 3D sites fail on and Awwwards jury hardware exposes. It is already done to a high standard.

---

## 2) Weighted Awwwards score

> Scores are a **current estimate grounded in code + the prior real‑browser audit**, since this session could not see rendered frames (see limitation box). Confidence noted per line.

| Category | Weight | Score | Brutal justification |
|---|---|---|---|
| **Design (visual craft)** | 40% | **7.5/10** | The palette (`#0C0B0A`/`#BFA06A`/`#F2EDE4`), the Playfair‑Display display serif, IBL‑first lighting, ACES grade, and emissive discipline are genuinely premium and *consistent across every beat* — that is the hardest thing and it's done. It loses two full points on **product‑model fidelity** (the one thing a sneaker buyer scrutinises) and on **legibility/framing risk over a moving 3D background** that I could not visually verify but the prior audit repeatedly flagged. Med confidence. |
| **UX / UI** | 30% | **7.0/10** | Nav, cart, search, audio toggle, keyboard/Escape, focus rings, dialog semantics, honest checkout copy — all solid and first‑hand verified in the DOM. Held back by: **700vh of scroll for ~7 beats** (high effort‑to‑payoff), **phones get zero 3D**, **no WebGL‑failure fallback**, and a couple of nav anchors worth re‑QA'ing. High confidence on mechanics, med on feel. |
| **Creativity / originality** | 20% | **6.5/10** | The Authentication Beat is a real, ownable idea and the in‑WebGL video screens are a strong flourish. But this is an *excellent execution of a known genre* (camera‑dolly‑through‑a‑space), not a category‑defining concept, and the brand world is cohesive without a single unforgettable "I've never seen that" hook. Med confidence. |
| **Content / storytelling** | 10% | **6.5/10** | Copy is tight, on‑brand, bilingual‑clean, and the Cairo identity lands. Hurt by the **Nike promise vs. zero Nike inventory** integrity gap, an **anthology arc** that restates "authentic" rather than building, and a thin footer for a store. High confidence (DOM/data verified). |
| **Developer craft** | — | **9.0/10** | The standout. Instancing (6 draws for 18 shoes), `frameloop` parking, the one‑way tier ladder, DPR floor 1.0, baked `frames={1}` IBL, no‑transmission glass, gated video decode, throttled shadows, clean disposal/cleanup, hydration‑safe SSR, honest debug overlay. This is award‑caliber. Minus one point only for the unverified perf claim on the target iGPU and the missing WebGL‑context‑loss path. High confidence (source‑verified). |

**Per‑discipline (1–10):** Design 7.5 · UX/UI 7 · Creativity 6.5 · Content 6.5 · Developer craft 9 · Motion 7.5 · 3D art direction 7 · Camera 7.5 · Lighting 8 · Materials 6.5 · Performance‑engineering 8.5 *(measured FPS UNVERIFIED)* · Mobile 5 · Memorability 7 · Brand fit 8 · E‑commerce usefulness 7.

---

## 3) Live testing summary

**URL:** `http://localhost:3000/` (and `/?debug=1&fps`, `/?tier=…`).
**Server:** Next 16.2.6 Turbopack, "Ready in 302 ms", `GET / 200`.

**Viewport matrix (live `preview_resize` + computed‑layout reads at each width; 3D layer unrendered per the limitation box):**
- **1920 / 1440 / 1280 (desktop):** entrance `<h1>` holds the full **96px** `text-8xl`; product grid is **4 columns** (`~292px ×4`); the hero‑display copy block (left‑aligned, `max-w-[20rem]`) sits **left of center, clear of the centered pedestal** (1920: block x463–783, center 623, vs viewport center 960). The asymmetric editorial layout works at desktop. First‑hand.
- **390×844 (mobile width):** `<h1>` scales to **48px** (`text-5xl`) and the grid drops to **2 columns** (`163px ×2`) — both reflow correctly. **But** the hero‑display copy block becomes **294px wide, centered at x195 = the exact viewport center**, overlaying the centered pedestal shoe. Critically this is on the **full‑vault path** — the preview is `pointer:fine`, so the coarse‑pointer `VaultStatic` fallback does **not** engage; any narrow `pointer:fine` window hits this. First‑hand, measured.
- **Live interaction:** clicking the header **Search** button **opened the overlay and focused the input** (`role=dialog` present, wrapper `pointer-events:auto`, `activeElement="Search the catalog"`) — the "dead search button" in `HANDOVER.md` is **fixed and live‑confirmed**. (The 300 ms opacity transition didn't visibly complete — same hidden‑tab throttling that parks the canvas.)
- **Caveat:** 3D *visual* comparison across widths was impossible (parked loop); the above is computed layout + live DOM state, not rendered pixels.

**Console (first‑hand):**
- `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` — repeated. Upstream (R3F/drei internal on three 0.184), **benign**, but it is noise in the console a jury's dev might open. P3.
- A React **hydration‑mismatch** warning whose only diffed attribute is `cz-shortcut-listen="true"` on `<body>` — that attribute is injected by a **browser extension (ColorZilla)**, *not* the app. **Not an app bug.** (No other markup mismatch observed.)
- Clean boot log with GPU/tier/DPR (above). No app `error`‑level logs.

**Network (first‑hand, `/`):**
- ✅ All **7 GLBs serve 200** (`hero…960 KB` + 6 shelf `~270–310 KB`). They are requested **~3× in dev** (React StrictMode double‑invoke + the two `resize` nudges) — a **dev‑only** artifact; production export caches once.
- ✅ **9.3 MB of audio is NOT on the load path** — no `.mp3` request fires on initial load (lazy, on audio‑unlock). Good.
- ✅ Video **posters** (`.webp`) load eagerly as fallbacks; the **`.mp4`s show `206 … net::ERR_ABORTED`** — this is **expected, not broken**: `useVideoTexture({ start:false })` plus the scroll‑gate means a paused/un‑gated video aborts its range request. Benign.
- ✅ Fonts (Geist + Playfair) load. **No real 404s** (localhost has no `basePath`, so the `withBase()` subpath risk doesn't surface here — it must still be re‑checked on the GH Pages deploy).
- Shopify‑CDN product images are lazy (below the fold), not on the critical path.

**Worst performance moments (code‑reasoned, `[UNVERIFIED]`):** the hero dwell (≈p0.46, full HIGH stack + shadow caster + 680 particles + bloom + N8AO on an iGPU) and the **vault→shop hand‑off** (sticky release over 100vh while the heavy scene is still compositing) are the two most likely frame‑budget pressure points.

**Worst visual moments (from prior real‑browser audit, status reconciled):** hero shoe going faceted on close push‑in (model‑fidelity, **still likely open**); the green/scan beam grazing the authenticity headline (**likely mitigated** — the DOM scan‑bar is gone from `AuthScene`; the 3D mint scan‑bar lives on the counter screen — **needs visual confirmation**); black‑void nav jumps and overlay bleed (**fixed** — see §13 "already shipped").

---

## 4) Scene registry

Beats are driven by one eased scroll value (`dwellEase`) over a **700vh** container; overlay copy and camera share it. Camera = two 8‑point CatmullRom curves (`CAMERA_PATH`/`LOOK_PATH`, `VaultScene.tsx:22–44`). Visual/feel notes are `[UNVERIFIED]` per the limitation box.

### Scene 01 — Preloader / Vault doors
- **Files:** `VaultPreloader.tsx`, `globals.css:240–314`.
- **Purpose / feeling:** turn load latency into theatre — heavy vault doors part on a `cubic-bezier(0.66,0,0.28,1)` 1.35 s slide with a gold seam flare. Intended: anticipation. **Works:** branded, `useProgress`‑driven, 700 ms min + 6 s safety, reduced‑motion fallback (doors fade, no slide).
- **Open:** the door visual itself can't be confirmed this session; verify the seam flare doesn't outlast first paint on a slow connection.

### Scene 02 — Entrance (p 0–0.18)
- **Camera:** `[0,1.8,12]` → forward, fov 55, looking down the corridor to `[0,1.0,6]`.
- **Overlay:** `<h1>` "Egypt's Sneaker Vault" (Playfair), sub "Authentic heat, curated drops…", CTAs **Enter the Vault** (scrolls 1 vh + unlocks audio) and **Shop New Arrivals** (`#new-arrivals`). Scrim + text‑shadow back the copy.
- **Should be noticed first:** the headline, then the lit corridor depth. **Risk:** the corridor's symmetric vanishing point can read as a center seam (prior "hero center seam" note). P2.

### Scene 03 — Entering (p 0.18–0.32)
- **Copy:** "Step Inside." / "Every pair is authenticated. Every drop is real." Pure transition beat. **Weakness:** this is the most "restating the pitch" beat — it advances the *camera* but not the *story* (see §8/Creativity).

### Scene 04 — Hero plinth (p 0.32–0.50) ★ money shot
- **Camera:** dips low to `[0,1.22,2.0]`, gazes UP to `[0,1.34,-0.5]` — a reverent upward look at the floating shoe. `DWELL_LUT` slows scroll ~35% here.
- **3D:** real A.E. 1 Low GLB (`hero…960 KB`), slow turntable (`clock*0.25 + pointer.x*0.7`) + float bob + audio‑reactive halo ring; **sculpted lathe brass plinth** (base + marble column + capital + etched sigil); one warm spotlight (intensity 16, the **only** shadow caster, 1024 map) + one cool rim point.
- **Works (code):** the plinth is now genuinely sculpted (not the old grey cylinders); lighting is motivated.
- **Breaks the premium illusion `[UNVERIFIED]`:** the **shoe model itself** is the ceiling — Tripo fidelity + a low camera that pushes close is exactly where the prior audit saw faceting. **Best upgrade:** a higher‑fidelity hero GLB (or a baked‑normal high‑poss variant swapped in only for this beat) + contact shadow grounding. This single fix moves Design and 3D‑art‑direction the most.

### Scene 05 — Drop wall (p 0.50–0.65)
- **3D:** `DropFeature` at `[-1.6,0,-5.2]`, yawed to the aisle — a 1.8×1.8 self‑lit screen playing `ae1-vault.mp4`, gated `0.30<p<0.62`, machined bezel + amber edges + warm backlight halo; poster always painted (its own Suspense → never blanks). **Strong, ownable flourish.** Copy "New Drops." → "Browse the Wall" (`#drop-wall`).

### Scene 06 — Authenticity / cashier (p 0.65–0.80) ★ signature
- **3D:** machined counter at `z=-8`, smoked‑glass top, mint scan bar, a checkout screen above it playing `ae1-authenticate.mp4` (gated `0.30–0.88`) with an **always‑on mint scan bar** that sweeps the poster (so SAFE tier never shows a frozen still) and flashes once on `fitsole:verified`.
- **DOM beat (`AuthScene`):** staged badges **Stitch (520 ms) → Weight (880 ms) → UV (1240 ms, + chime + `fitsole:verified` event) → brass plaque "Lot #04219 · 24 May 2026 · Cairo" (1640 ms)**; re‑arms on scroll‑back. This is the best idea on the site.
- **Open:** the 3D mint scan‑bar (counter, in 3D space) vs the DOM headline "100% Authentic. Every pair." (screen‑centered) can still spatially overlap depending on framing — the prior "green beam grazing the headline" note. **Needs visual confirmation.** P1 if it overlaps.

### Scene 07 — Brand corridor (p 0.80–0.93)
- **3D:** 4 illuminated `BrandTotem`s (Nike/Adidas/Puma/ON) scaling 0.9→1.2 with depth to fight perspective shrink; emissive cream marks (no per‑totem real light).
- **Overlay:** "Every brand. One vault." + 4 chips → all `#drop-wall`. **Chips now have a backing plate** (`bg-vault-black/40` + `backdrop-blur` + gold border + cream/85) — the prior "near‑invisible chips" issue is addressed.
- **Content gap:** Nike totem + Nike chip, but **zero Nike SKUs** in `products.ts`. The story over‑promises the catalog.

### Scene 08 — Membership / exit (p 0.93–1.0)
- **3D:** `MembershipFilmWall` (5.2‑wide cinema, graphite frame + gold edges) playing `ae1-collective.mp4` (gated `p>0.55`, starts early to pre‑decode), poster fallback.
- **Bridge:** a fade‑to‑black scrim caps at **0.5** over `p 0.95–1.0` so the storefront "lights up from dusk" rather than hard‑cutting (a deliberate softening of the old "abrupt gap"). **Open `[UNVERIFIED]`:** the sticky release still costs ~100vh; confirm it doesn't read as dead space on a real device.

### Flat storefront (below the vault)
`FeaturedUnboxing` (poster + lazy `ae1-unboxing.mp4`, IntersectionObserver autoplay) → `TrustSection` (4 columns) → `CategoryNav` (01–04 editorial list) → `BrandStrip` → `ProductWall ×3` (New/Best/Sale) → `ShopWall` (#drop-wall, filterable) → footer. Scroll‑reveal via pure CSS `animation-timeline: view()` (`globals.css:162–180`) — zero‑JS, reduced‑motion‑safe. Clean, premium, and **scales** (2D grids, no per‑SKU GPU cost).

---

## 5) Pixel‑level visual issues

> Severity: **P0** broken · **P1** kills premium feel · **P2** polish · **P3** detail. Visual items are `[UNVERIFIED]` unless DOM/CSS‑sourced.

- **P1 — Hero sneaker model fidelity `[UNVERIFIED, prior‑audit‑supported]`.** Tripo GLB + close low camera → faceting/soft sole on the one object the whole site sells. Fix in §6/§7.
- **P1 — Nike promised, zero Nike inventory (DOM/data‑verified).** Brand corridor + chips + search all surface Nike; `products.ts` has none → "No pairs match 'nike'." Integrity hit on a "100% authentic" brand.
- **P1 — 3D mint scan‑bar vs authenticity headline overlap `[UNVERIFIED]`.** Confirm the counter scan‑bar doesn't graze "100% Authentic." at the framed angle.
- **P2 — Center vanishing‑point seam at entrance `[UNVERIFIED]`.** Symmetric corridor can read as a vertical stitch under the headline.
- **P2 — Mobile hero overlay overlaps the pedestal (MEASURED this session, `VaultOverlay.tsx:74`).** At 390px the left‑aligned `max-w-[20rem]` block becomes **294px wide, centered at the exact viewport center (x195)** — directly over the centered shoe. Phones dodge it via the coarse‑pointer static fallback, but any `pointer:fine` window < ~640px (small desktop window, foldables) renders the full vault and shows it. Fix: center‑align + cap width, or hide this copy block below `sm`.
- **P2 — `THREE.Clock` deprecation console spam (first‑hand).** Cosmetic; suppress at the source if trivially possible.
- **P3 — Shoebox stacks are untextured blocks (`VaultScene.tsx:672`, TODO in code).** Fine as background; a subtle logo decal would lift them.
- **P3 — Thin footer for a store** (no returns/shipping/size‑guide/social/newsletter).

---

## 6) Camera direction review

**Current:** two CatmullRom curves sampled by eased scroll; fov 55, near 0.1, far 60; frame‑rate‑independent lerp `f = 1 - exp(-12·dt)`; subtle mouse parallax (±0.1 x / ±0.06 y) **gated off during fast scroll** (`scrollDelta < 0.002`); a snap‑on‑resume guard prevents camera/overlay desync after parking; `DWELL_LUT` slows the walk ~35% at the hero (p0.46) and membership (p0.95) beats.

**What works:** this is **cinematically literate** — motivated moves, a reverent low‑angle hero gaze, a single soft glance left at the drop wall, dwell on the money shots, no nausea‑inducing roll, and clean reverse scroll (prior audit confirmed). The parallax‑gate and snap‑guard are pro touches most R3F sites miss.

**What to improve:**
1. **Give the hero a true "lock" moment.** Right now the camera keeps drifting; add a near‑still hold at p≈0.46 where the shoe is dead‑center, fully lit, and momentarily *stops* — that stillness is what reads as "expensive." **Note the math:** `DWELL_LUT`'s speed floor is `Math.max(0.5, 1 - gauss(…))` (`VaultExperience.tsx:68`), so the hero `amt` of 0.35 already yields ~0.65× velocity, and deepening it to 0.5 only reaches the **0.5× floor (~23% more dwell), not a stop.** A real hold needs **lowering that 0.5 floor** (e.g. to ~0.25) *and/or* adding a short discrete plateau to the camera curve at the hero beat. `[UNVERIFIED — tune live]`.
2. **Don't push closer than the model can hold.** Cap the hero approach z so the GLB never reveals faceting; let a *higher‑fidelity* swap (see §7) take the close‑up if you want one.
3. **Consider a shallow DoF only on the hero dwell.** A gentle `DepthOfField` (focal on the shoe, blurring the corridor) for ~p0.40–0.50 would isolate the product and hide background model weakness — but it is expensive on the iGPU; gate it to HIGH only and A/B the cost. `[risk: perf]`.

---

## 7) Lighting & material review

**Lighting — current (`VaultScene.tsx:1204–1246`):** IBL‑first. A baked `<Environment frames={1}>` (1024/512/256 by tier) with 7 Lightformers does the ambient + reflections at **zero per‑frame cost**; then only a handful of real lights: ambient 0.4, a cool directional 0.6, entrance point 9, back‑corridor point 3.4, counter point 7, two shelf fills 5, plus the hero spotlight 16 (only shadow caster, 1024 map, **throttled to every 2nd frame**) and a cool rim point 7. Fog `#1A100A` 6→26.

- **Strength:** this is the correct, premium approach — "light the world, not the objects," warm key + one cool rim for separation, ACES rolloff so emissives bloom without clipping. Genuinely good.
- **Upgrade (art):** per‑beat exposure could lift the experience — e.g., a touch dimmer/cooler at the entrance, warmest at the hero dwell, a cool wash at membership. Cheap (tone‑mapping exposure or a single animated light), high emotional payoff. `[UNVERIFIED]`.
- **Upgrade (perf‑safe):** add **contact shadows** under the hero and shelf shoes (drei `<AccumulativeShadows>`/`<ContactShadows>` once, or a baked AO blob decal) so products sit on the surface instead of floating — prior audit + handover both flag the float. A baked blob is ~free.

**Materials — current (`VaultScene.tsx:47–158`):** a disciplined PBR library — `floorMat` (metal 0.9 / rough 0.22 mirrors IBL — a free luxury reflection), brushed `brassMat`/`machinedMat`/`graphiteMat`, emissive `stripMat`/`amberMat`/`mintMat` (audio‑reactive), tinted‑transparency "glass" (no `transmission` — a deliberate, correct perf call), sRGB color‑space on every texture. No custom shaders.

- **Strength:** materials read consistently and "milled," and the no‑transmission decision is exactly right for the iGPU budget.
- **Weakness:** the **product** materials (the GLB's own) are the weak link — they don't reach photoreal leather/rubber. **Fix:** re‑author the hero GLB's PBR (real roughness/normal maps, a subtle clearcoat on glossy panels) or commission/generate a higher‑fidelity hero asset; this is the highest‑leverage visual change on the site.

---

## 8) Motion design review

**Language:** scroll‑synchronised camera + opacity‑and‑rise overlay copy (`translate3d(0, (1-opacity)*22px, 0)`), Lenis‑smoothed scroll (`lerp 0.1`) + a light secondary damp (`SCROLL_DECAY 30`), `DWELL_LUT` pacing, CSS scroll‑driven reveals for the flat shop, and the staged Authentication Beat (520/880/1240/1640 ms). Continuous life: turntable, float bob, audio‑reactive emissives, dust motes.

**What works:** pacing is intentional (dwell on money shots), the entrance has anticipation (door curtain), the auth beat has true staging + a payoff (chime + plaque), and cleanup is **thorough** (rAF cancel, `lenis.destroy()`, listener/timeout removal — no leaks). `frameloop` parks the loop off‑screen.

**Weak moments / fixes:**
1. **Effort‑to‑payoff ratio.** 700vh for ~7 beats means long stretches where the camera moves but little *new* happens (prior audit measured ~14 screens). **Fix:** either tighten to ~450–500vh, or add a micro‑payoff to the "Entering" and "Brand corridor" transit beats (a light cue, a totem ignite, a reflection sweep) so no stretch feels like pure travel.
2. **No idle "breathing" hook on the hero.** The turntable is constant; consider a subtle anticipation‑and‑settle as the dwell begins so the shoe *arrives* rather than just spins. `[UNVERIFIED]`.
3. **Fast‑scroll story integrity `[UNVERIFIED]`.** Confirm that flicking through doesn't skip the auth beat's payoff; the re‑arm logic looks correct in code, but verify the chime/plaque don't get orphaned mid‑sweep.
4. **Reduced‑motion is exemplary** — `globals.css:96–105` + `:234` kill animations, and the whole vault is swapped for `VaultStatic`. Keep it.

---

## 9) Technical WebGL / Three.js / R3F review

**Renderer (`VaultCanvas.tsx:81–112`):** `<Canvas flat frameloop={active?'always':'never'} dpr={clampDpr(tier)} gl={{antialias:true, alpha:false, powerPreference:'high-performance'}} shadows={tier==='safe'?false:'percentage'} camera={{pos:[0,1.8,12],fov:55,near:0.1,far:60}}>`. `onCreated` reads the unmasked GPU string → tier; `PerformanceMonitor flipflops={3}` degrades **one‑way** (`onDecline`→drop a tier, `onFallback`→safe). `flat` means **ACES ToneMapping in the composer is the only color transform** (correct, and why it's on every tier).

**Scene cost (code‑derived; live `renderer.info` UNVERIFIED — overlay parked at 0):**
- **Draw calls ≈ 200–260.** Procedural furniture dominates: 6 `ShelfModule`s × ~9 meshes ≈ 54, 4 `BrandTotem`s × ~6 ≈ 24, counter ≈ 12, door ≈ 7, strips 11, walls/floor/ceiling ≈ 7, drop wall ≈ 9, membership ≈ 5, hero ≈ 7, **shelf shoes = 6 instanced draws (for 18 placements)**, particles 1, + ~6–12 post passes.
- **Triangles:** hero GLB + 6 shelf GLBs (optimised Tripo, meshopt) + lathe/RoundedBox procedurals; **estimate low‑hundreds‑of‑thousands**, not millions. `[UNVERIFIED]`.
- **Lights:** ~8 (2 global + 4 point + spot + rim); **1 shadow caster** (throttled). **Post passes:** N8AO (HIGH) → Bloom (HIGH/STD) → Vignette → ACES → SMAA, `multisampling=0`.

**R3F hygiene — clean (source‑verified):** no `setState` in `useFrame`; vectors/curves/materials are module‑level or `useMemo`'d (no per‑frame allocation); shelf shoes are properly instanced with baked geometry; effects are a **filtered array** (tier flips rebuild the pass list with no composer remount / black flash); `useGLTF`/`useTexture` cached; disposal handled by R3F + Suspense.

**Risks / gaps:**
1. **No WebGL‑context‑loss / no‑WebGL fallback.** Only reduced‑motion and coarse‑pointer phones get `VaultStatic`; a desktop with WebGL disabled or a lost context has **no error boundary around `VaultCanvas`** → blank/throw. **Fix:** wrap `VaultCanvas` in an error boundary that renders `VaultStatic`, and handle `webglcontextlost`. P1 (robustness; juries test weird configs).
2. **`THREE.Clock` deprecation** (upstream) — cosmetic console noise.
3. **GLBs fetched ~3× in dev** — StrictMode/HMR artifact; verify the production export fetches once (it should).
4. **HIGH on an Intel Iris Xe iGPU (`deviceTier.ts:66`)** — *intentional and measured* by a prior session ("~100+ fps … sustains the full stack"), with `PerformanceMonitor` as the safety net. Reasonable, but **unconfirmed this session** and the single biggest perf assumption (see §10).

---

## 10) Performance review

> **All FPS claims `[UNVERIFIED]`** — the hidden‑tab environment parked the loop (overlay FPS 0/0). The numbers below are the project's own prior measurement + code reasoning.

**Observed (first‑hand):** auto‑tier **HIGH** on Intel Iris Xe, DPR pinned **1.00** (cap 2.0, floor 1.0), WEBGL2 true, POSTFX "SSAO + bloom + SMAA", video "beat‑gated h264". Critical‑path payload ≈ **2.7 MB GLB + posters + fonts**; **audio (9.3 MB) and product images are off the critical path** (good). Server `GET / 200` in ~100–520 ms.

**Likely pressure points (code‑reasoned):**
1. **Hero dwell on HIGH/iGPU** — N8AO (heaviest pass, even `halfRes`) + bloom + 680 particles + a live shadow caster + glossy floor reflecting IBL, all at once, on integrated graphics. This is the frame‑budget worst case. `[UNVERIFIED]`.
2. **Vault→shop hand‑off** — the 0.3vh pre‑warm buffer (`VaultExperience.tsx:177`) is a deliberate fix for the old "heavy scene composited over the incoming storefront" stutter; confirm it's smooth on a real mid device.
3. **GLB triple‑fetch in dev** — non‑issue in production but verify.

**Quick wins:** none required for correctness; the engineering is already strong. The one *measurement* gap is the highest priority — **someone must open `?fps&debug=1` in a real foreground Chrome on the Iris Xe and on a true weak iGPU and read the 10‑s FPS.** If HIGH dips below ~50 on Iris Xe, demote Iris Xe to STANDARD in `tierFromGpu` (drop N8AO first) — the ladder already supports it.

**Adaptive‑quality plan (already largely implemented — keep, don't rebuild):**

| Tier | DPR cap (floor 1.0) | SSAO | Bloom | Particles | Shadows | Env | Video |
|---|---|---|---|---|---|---|---|
| HIGH (discrete/Apple/**Iris**) | 2.0 | ✓ | ✓ | 680 | ✓ (throttled) | 1024 | h264 |
| STANDARD | 1.5 | ✗ | ✓ | 360 | ✓ | 512 | h264 |
| SAFE (weak iGPU/mobile/reduced‑motion) | 1.25 | ✗ | ✗ | 0 | ✗ | 256 | poster only |

This is textbook ("cut effects first, DPR last, never below native"). The only change to consider is the Iris‑Xe→HIGH classification, pending a real FPS read.

---

## 11) Product scalability plan

The architecture is **already correct for scale** and must be protected:
- **Full 3D = the hero only** (one curated A.E. 1 Low on the plinth). Right call.
- **Lightweight 3D = the 18 shelf shoes via 6 instanced GLBs** (cosmetic set‑dressing, cycled). Right call.
- **Everything else = 2D** — the entire catalog (`products.ts`, Shopify‑CDN images, `ProductWall`/`ShopWall` grids) is pure DOM with **zero GPU cost** and scales to hundreds of SKUs.
- **Video/turntable instead of realtime 3D** for editorial moments (drop wall, cashier, membership) — smart; one shared video texture each, decode‑gated.

**Guidance going forward:**
- Keep the vault a **curated cinematic landing**, never a per‑SKU 3D renderer. New products enter the *2D grid*, not the vault.
- If you ever feature a second 3D pair, **reuse the instancing + gating template**; budget ≤ ~1 MB/GLB, meshopt, and only one full‑3D hero on screen at a time.
- Filters/search must **never remount the canvas** — today they don't (search/filter operate on the DOM grid, the vault is a separate sticky region). Preserve that boundary.

---

## 12) Mobile & weak‑laptop plan

**Today:** phones (coarse pointer + ≤640 px) and reduced‑motion users get `VaultStatic` — a clean static hero, **no canvas mounts at all** (zero GLB/GPU cost). Weak iGPUs that *do* render get SAFE tier. This is a **defensible, honest** engineering decision.

**But for an award:** it means the **entire 3D experience — the whole reason this site exists — is invisible on mobile.** Awwwards juries open sites on phones. A static text hero on mobile reads as "the 3D site that gave up on me."

**Recommended (in priority order):**
1. **Give mobile a real, lightweight signature** — not the full walk, but more than text: a 6–8 frame scroll‑driven *image/video sequence* of the same beats (poster‑level cinematics already exist as `.webp`/`.mp4`), or a single autoplaying hero turntable clip. The handover already scoped this ("6‑still parallax + same audio bed").
2. **Reconsider the coarse‑pointer cutoff** — modern phones run light WebGL fine; consider letting newer devices attempt SAFE‑tier 3D (with a hard FPS bail to the static path) rather than blanket‑excluding all coarse pointers.
3. **Preserve:** DPR floor 1.0, effect‑first degradation, reduced‑motion swap, the static fallback as the ultimate floor.
4. **Fix the narrow‑width hero overlap** (`VaultOverlay.tsx:74`) so the small‑desktop‑window case (pointer:fine, < 480 px) doesn't show left‑aligned copy over the shoe.

---

## 13) Implementation roadmap

> **Already shipped since the prior audits — do NOT re‑open** (verified in current source): black‑void nav jumps (`scroll-behavior:auto`), copy legibility (`--color-vault-muted` lifted to `#8E867A` for WCAG AA 4.5:1 + `.vault-scrim` + `.vault-copy` text‑shadow), overlay bleed (cue/trust fade), **honest checkout copy** ("Continue on fitsole.shop"), **functional search** (`SearchOverlay` is wired and **live‑confirmed to open + focus its input** — *not* the dead button the handover lists), **brand‑chip backing plate**, real Tripo hero/shelf models, **instancing**, **Lenis**, **audio engine**, **`frameloop` gating**, **sculpted brass plinth**, **Authentication Beat**, **3‑tier adaptive ladder**, fade‑to‑black bridge.

**P0 — Broken / integrity (do first)**
| Issue | Why it matters | File(s) | Fix | Risk | Visual Δ | Perf Δ |
|---|---|---|---|---|---|---|
| Nike promised, zero Nike SKUs | Authenticity brand whose search/corridor dead‑ends on its most‑searched brand | `lib/products.ts`, `VaultScene.tsx:942` (totem), `VaultOverlay.tsx:150` | Add real Nike inventory, **or** remove Nike from the corridor/chips and add a brand‑synonym note in search | Low | Med | None |

**P1 — Biggest award‑level upgrades**
| Issue | Why | File(s) | Fix | Risk | Visual Δ | Perf Δ |
|---|---|---|---|---|---|---|
| Hero model fidelity | The shoe is the product; it's the visual ceiling | `lib/assets.ts`, hero GLB; `HeroDisplay` `VaultScene.tsx:541` | Higher‑fidelity hero GLB (real PBR maps / clearcoat) or a hi‑poly swap for the dwell only; cap close‑push z | Med (asset work) | **High** | Low if size‑budgeted |
| Mobile has no 3D signature | The whole concept is invisible on phones juries test | `VaultExperience.tsx:13` (`VaultStatic`) | Add a lightweight scroll image/video sequence + audio bed to the mobile path | Med | **High (mobile)** | Low (no realtime 3D) |
| No WebGL‑failure fallback | Blank/throw on lost context or WebGL‑off | `VaultCanvas.tsx`, `VaultExperience.tsx` | Error boundary around `VaultCanvas` → render `VaultStatic`; handle `webglcontextlost` | Low | Safety | None |
| Auth scan‑bar vs headline overlap `[UNVERIFIED]` | Reads as a render bug on the trust beat | `VaultScene.tsx:484` (counter scan), `VaultOverlay.tsx:266` | Confirm framing; nudge the 3D bar's Y or mask the headline out of it | Low | Med | None |
| Effort‑to‑payoff / hero "lock" | Long transit stretches; hero never fully stills | `VaultExperience.tsx:62–84` (`DWELL_LUT`), `CAMERA_PATH` | Deepen hero dwell to ~0.5; add micro‑payoffs to transit beats; consider tighter 500vh | Med | Med‑High | None |

**P2 — Performance & stability**
| Issue | File(s) | Fix |
|---|---|---|
| Measure real FPS on target HW | `?fps&debug=1` | Foreground read on Iris Xe + a weak iGPU; demote Iris→STANDARD in `deviceTier.ts:66` if HIGH < ~50 fps |
| Contact shadows (float fix) | `VaultScene.tsx` | Baked AO blob / `<ContactShadows>` under hero + shelf shoes |
| Lockfile workspace‑root warning | `next.config.ts` | Set `turbopack.root` to silence + avoid mis‑resolution |
| `withBase()` on live deploy | `lib/basePath.ts` | Re‑verify all raw asset URLs 200 on GH Pages subpath (localhost can't surface this) |

**P3 — Polish & delight**
| Issue | File(s) | Fix |
|---|---|---|
| `THREE.Clock` console spam | upstream | Suppress if trivially patchable |
| Per‑beat exposure grade | `VaultScene.tsx` lights / ToneMapping | Subtle warm‑up at hero, cool wash at membership |
| Shoebox logo decals | `VaultScene.tsx:672` (TODO) | Thin brand decal plane |
| Thin footer | `app/page.tsx` | Add returns/shipping/size‑guide/social/newsletter |

---

## 14) "Do not do" list

- **Do NOT flatten the 3D to "fix" performance.** The vault *is* the product; the engineering to make it cheap is already done. Cut effects per‑tier (the ladder exists), never the concept.
- **Do NOT make more products realtime 3D.** One curated hero + instanced set‑dressing + 2D grid is the correct, scalable model. Per‑SKU 3D would collapse it.
- **Do NOT remove the Authentication Beat, the in‑WebGL video screens, the brass plinth, or the audio bed** to save bytes — they are the premium moments.
- **Do NOT re‑introduce a sub‑native DPR floor** (the old 0.6 blur). Sharpness is non‑negotiable; effects are the budget.
- **Do NOT "fix" the prior false positives** (the AE 1 is genuinely adidas; the card silhouette is an intentional load fallback; the cart inits empty; the Handball/PUMA pairs are distinct colorways).
- **Do NOT add random post (chromatic aberration, heavy DoF everywhere, film grain) to look "cinematic."** The ACES + bloom + vignette grade is tasteful; more would hide the art direction and tax the iGPU.
- **Do NOT make in‑page nav jumps smooth** (the `scroll-behavior:auto` is deliberate — smooth would crawl the camera through 700vh of black).

---

## 15) Final recommendation — smartest next pass

**A focused "3D scene + hero‑product + mobile signature" pass** — in that order — is the highest‑leverage route to SOTD. The performance and UX foundations are already award‑caliber; the gap to a 9 is **felt quality of the hero shoe** and **reach onto mobile**, plus the one content‑integrity fix.

Concretely, one tight sprint:
1. **P0:** resolve the Nike promise/inventory mismatch (add stock or remove the promise).
2. **P1 hero pass:** upgrade the hero GLB fidelity + add a true camera "lock"/dwell + contact‑shadow grounding. This single pass moves Design, 3D art direction, and Memorability the most.
3. **P1 mobile pass:** give phones a lightweight scroll‑sequence signature so the concept survives the device juries actually use.
4. **P1 robustness:** WebGL‑failure error boundary.
5. **P2 measurement:** the real‑foreground FPS read on Iris Xe + a weak iGPU — the one number this audit could not get, and the one a jury's laptop will.

Everything else (lighting grade per beat, shoebox decals, footer, console hygiene) is polish that can ride along.

**Bottom line:** this is not a "make it work" situation — it already works and it already feels expensive. It is a "make the hero unforgettable and let mobile in" situation. Do those, verify the frame‑rate, and this is a credible Site of the Day contender.

---

*Generated 2026-05-26. Live‑instrumented on localhost: GPU/tier/DPR/postFX boot readout, network waterfall, console, accessibility tree, a 4‑width computed‑layout responsive sweep (1920/1440/1280/390), and a live Search‑overlay interaction — all via DOM tooling (Intel Iris Xe, hidden‑tab/parked‑renderer limitation noted throughout). Rendered‑pixel and FPS findings are flagged `[UNVERIFIED]` and grounded in source + the prior real‑browser audits. No source files were modified (audit‑only scope).*
