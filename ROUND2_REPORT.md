# FitSole Vault — Round 2 Final Report

**Branch:** `polish/cashier-and-tiers` (5 commits, not merged to `main`, not deployed — awaiting review)
**Date:** 2026-05-25
**Scope:** Cashier "frozen image" fix + weak-laptop quality-tier system, on top of Round 1's craft pass.
**Builds:** `npm run build` ✅ green · `GITHUB_PAGES=true npm run build` ✅ green (`out/` emitted, basePath baked).

---

## 1. SUPER PLAN status

All planned phases complete.

| Phase | Plan | Status |
|---|---|---|
| 0 | Commit Round 1 craft pass as clean baseline | ✅ `e510e14` |
| A | Cashier moment — swap to `ae1-checkout.mp4` + real motion | ✅ `aef5d4a` |
| B | Weak-laptop quality-tier system (revive `tier`, effect ladder, DPR floor 1.0, GPU detect) | ✅ `4d40fa2` |
| C | Debug overlay + measurement (§8 layout) | ✅ `115f46e` |
| D | Regression & sign-off + **SAFE-cashier fix** (advisor catch) | ✅ `3abdc3a` + this report |

One deviation surfaced *during* Phase D and was fixed (the SAFE-tier scan-bar bug, §2 below).

---

## 2. Summary of changes

**Cashier (the "freezed image" complaint).** Root cause: `checkout-cinematic.mp4` is AI-generated from a still — near-zero intrinsic motion — and was beat-gated to scroll 0.45–0.86, so on arrival/edges it showed only the static poster. Two fixes, together:
- **Swapped the source** to `ae1-checkout.mp4` (1924×1076, higher-res than the old 1280×720).
- **Added real, code-driven motion** independent of the footage: a mint **verification scan bar** sweeps the screen (~2.6 s loop) the whole time the counter is in frame, and a one-shot **"APPROVED" flash** fires off the existing AuthScene UV-badge beat (decoupled via a `window` `'fitsole:verified'` CustomEvent). The cashier now reads as the *fulfilment* of the verify sequence: **verify → approve → buy.** Alive, not loud — it's background to the focal DOM verification card.

**Weak-laptop problem (briefing P0).** Replaced the single DPR lever with a **3-tier quality ladder** (HIGH / STANDARD / SAFE) that cuts *expensive effects first* and never renders below native resolution. Boot heuristic → GPU-string read → runtime FPS, one-way down only. Full rules in §5–§8.

**SAFE-cashier fix (found in Phase D, advisor-flagged).** The scan bar originally lived *inside* the video component, which SAFE gates off — so the exact weak-GPU persona we built tiers for would have seen a frozen poster, reintroducing the complaint on the very beat we fixed. Split into `CashierVideo` (gated `tier !== 'safe'`) + `CashierScanBar` (**always** rendered, animates over the poster on SAFE).

**Debug overlay (briefing §8, mandatory).** `?debug=1` / `Shift+D` → live readout of tier, DPR (cap/floor), **GPU renderer string**, WebGL2, FPS (1 s / 10 s), draw calls, triangles, postFX, video mode, reduced-motion, scroll %. Plus a one-line boot log to console.

---

## 3. Files changed (this round, vs `main`)

| Commit | Files |
|---|---|
| `e510e14` (R1) | `app/globals.css`, `app/page.tsx`, `components/commerce/ProductCard.tsx`, `components/vault/VaultOverlay.tsx`, `components/vault/VaultScene.tsx` |
| `aef5d4a` (R2-A) | `components/vault/VaultScene.tsx`, `components/vault/VaultOverlay.tsx`, **+**`public/video/ae1-checkout.mp4`, **+**`public/video/ae1-checkout.webp` |
| `4d40fa2` (R2-B) | `components/vault/VaultCanvas.tsx`, `components/vault/VaultScene.tsx`, **+**`lib/deviceTier.ts` |
| `115f46e` (R2-C) | `components/vault/VaultCanvas.tsx`, **+**`components/vault/VaultDebug.tsx` |
| `3abdc3a` (R2-D) | `components/vault/VaultScene.tsx` |

**New modules:** `lib/deviceTier.ts` (tier detection), `components/vault/VaultDebug.tsx` (overlay).
**Untouched (protected):** camera path / DWELL_LUT, Lenis, instancing, audio engine, preloader, `withBase()`, static-export config, mobile/reduced-motion `VaultStatic` fallback, the 2D commerce/cart/search stack.

---

## 4. Root cause(s) of the weak-laptop problem — named

1. **Inverted degradation strategy.** The only runtime lever was DPR, and `PerformanceMonitor.onFallback` dropped it to **0.6 — sub-native = blurry** — while the *full* N8AO + Bloom + SMAA stack, 680 particles, and 1024 shadows kept running. That is the exact inverse of "cut effects first, DPR last, floor 1.0." A struggling laptop got *blurrier* while still paying for the most expensive passes.
2. **The `tier` scaffold was dead.** A `tier` state existed in `VaultCanvas` but was **never passed to the scene** — so nothing actually scaled by capability.
3. **No GPU awareness.** The single most common real-world cause of "a gaming laptop looks bad" is Chrome running on the **integrated** Intel GPU instead of the discrete one. Nothing detected or reported that.

---

## 5. Quality behavior — old vs new, per tier

**Old (all machines, single path):** full effect stack always on; quality scaled only by DPR, 1.1 → **0.6 floor** (blur) under load.

**New:**

| | HIGH (discrete/Apple) | STANDARD (Iris Xe etc.) | SAFE (weak iGPU / mobile / reduced-motion) |
|---|---|---|---|
| Resolution | native, DPR ≤ 2.0 | native, DPR ≤ 1.5 | **native, DPR ≤ 1.25 (floor 1.0 — crisp, not 0.6 blur)** |
| SSAO (N8AO) | on | off | off |
| Bloom | on | on | off |
| ToneMapping + Vignette + SMAA | on | on | **on** (cheap; keeps `flat`-canvas color + AA correct) |
| Particles | 680 | 360 | off |
| Hero shadow map | percentage (2048-class) | percentage (1024-class) | **off** (halo + reflective floor still ground the hero) |
| Environment res | 1024 | 512 | 256 |
| Cashier/wall video | full h264 | full h264 | **poster only (no decode)** + **live scan bar over the poster** |

The composition — camera, models, layout, the scan/approve beat — is **identical on every tier**; only per-frame cost scales. SAFE is *simpler premium*, never low-quality blur.

---

## 6. Tier rules (how a device lands on a tier)

`lib/deviceTier.ts`, conservative and one-way-down:
1. **Boot guess** (sync, no GL yet): `prefers-reduced-motion` → SAFE; coarse pointer + short side ≤ 480 → SAFE; `hardwareConcurrency ≤ 4` or `deviceMemory ≤ 4` → SAFE; else **STANDARD**. Never boots HIGH then crashes down.
2. **GPU-string read** in `onCreated` (`WEBGL_debug_renderer_info`, the most diagnostic signal): discrete / Apple Silicon (`rtx|gtx|geforce|radeon|arc|apple m#|quadro|nvidia`) → HIGH; `iris` (Iris Xe/Plus — capable) → STANDARD; weak integrated / software / mobile (`intel|uhd|hd graphics|mali|adreno|powervr|llvmpipe|swiftshader|…`) → SAFE.
3. **Runtime** `PerformanceMonitor` → on sustained decline, **drop one tier** (cut effects), not crush DPR. One-way; never oscillates back up.
4. **Overrides:** `?tier=high|standard|safe` (URL) or the overlay's `[H][S][L]` buttons pin the tier (auto-detection can't move a pinned tier).

---

## 7. DPR floor + rationale

**Floor = 1.0 on every tier.** `clampDpr = max(1.0, min(devicePixelRatio, cap))`, caps 2.0 / 1.5 / 1.25.

The cap only bites on hi-dpi (retina) screens; a typical 1.0-dpr laptop stays at **exactly native** on every tier. The old 0.6 floor was the single biggest cause of "looks bad on the other laptop" — it traded sharpness (the thing humans read as "cheap") to keep the expensive effects the weak GPU couldn't afford anyway. We now do the opposite: **keep pixels sharp, drop the effects.** Sharpness is non-negotiable; effects are the budget.

---

## 8. Degradation order (briefing §6.2 compliance)

When a frame budget is missed, cost is shed in this order — **DPR is last, and never below 1.0:**

`SSAO (N8AO) → Bloom → particles → shadows → env-map resolution → video decode (→ poster)` … and **only then**, on hi-dpi screens, the DPR cap tightens toward (never past) 1.0.

Mechanically this is the HIGH → STANDARD → SAFE ladder: each downgrade removes the next-most-expensive pass. The runtime monitor moves *down* the ladder only.

---

## 9. Catalog scalability — preserved

Zero 3D-per-product cost was introduced. The cashier change is **one shared video texture**; the tier system touches **only the vault scene**. The 2D catalog (`lib/products.ts`, 12 SKUs today) is fully independent of WebGL and still scales to hundreds of SKUs in conventional grids at no GPU cost. The vault remains a curated cinematic *landing*, not a per-SKU 3D renderer.

---

## 10. Verification — commands + results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ exit 0 |
| `npm run lint` | ✅ **21 problems** (unchanged baseline — all pre-existing in `lib/audio.tsx`, `lib/cart.tsx`, `scripts/rasterize-logos.cjs`; **none** from this round) |
| `npm run build` | ✅ compiled 6.4 s, TS clean, 4 static pages |
| `GITHUB_PAGES=true npm run build` | ✅ compiled 6.1 s, static export to `out/` |
| basePath baked | ✅ `fitsole-vault` in 126 places across 21 built files (`withBase` concatenates `BASE_PATH` at runtime — correct) |
| Cashier asset deployed | ✅ `out/video/ae1-checkout.mp4` + `.webp` present |
| Old clip unwired | ✅ no built text asset references `checkout-cinematic` |
| SAFE boot (live, `?tier=safe`) | ✅ console `[vault] tier:safe dpr:1.25 webgl2:true gpu:…Iris Xe`, zero errors |
| SAFE wiring (live overlay) | ✅ TIER SAFE · POSTFX "tonemap + SMAA" · VIDEO "poster only (decode off)" |

**Verification limitations (honest):**
- **SAFE-tier scan-bar *visual* not screenshotted.** The backgrounded preview tab throttles `requestAnimationFrame` so hard the render loop parks (overlay reads **FPS 0/0, draw calls 0**) and `preview_screenshot` times out at 30 s. This is environmental and reproducible — the same scene runs ~111 fps on a real foreground tab. Confirmed SAFE indirectly via source (unconditional render), clean compile, boot log, and the live overlay's VIDEO row. **Manual close-the-loop check in §11/§16.**
- **FPS-under-load not measured live** for the same rAF reason; the tier ladder's *correctness* (which effects each tier mounts) is verified via the overlay POSTFX/VIDEO rows, not a sustained-fps capture.

---

## 11. Live testing notes, per surface

- **Vault (HIGH/STANDARD/STANDARD-auto):** boots STANDARD on this Iris Xe machine (`dpr:1.50`), 111 fps observed in prior foreground testing; `?tier=high` mounts SSAO; all read correct color + AA (SMAA present, no shimmer — Round 1's AA-regression fix holds).
- **Vault (SAFE):** boots clean, correct color via the retained ToneMapping pass, video correctly skipped (poster only). **Scan-bar motion to confirm manually:** load `?tier=safe&debug=1`, scroll to ≈64 % of the vault section (cashier in frame, before the membership wall). **Pass:** a thin mint horizontal line sweeps top→bottom on a ~2.6 s loop over the poster; on the verify beat it settles to centre and flashes once. **Fail:** static poster, no motion.
- **Cashier before/after:** before = static/near-frozen `checkout-cinematic`; after = higher-res `ae1-checkout` clip (STANDARD/HIGH) or live-scanned poster (SAFE), plus the synced APPROVED flash on every tier.
- **Commerce / cart / search:** untouched this round; Round 1's add-to-cart confirm (gold + checkmark) intact.
- **Mobile / reduced-motion:** the `VaultStatic` fallback path is upstream of `VaultCanvas` and was not touched — intact by construction. Reduced-motion users who *do* get WebGL now boot SAFE.

---

## 12. Before / after

| | Before | After |
|---|---|---|
| Cashier | AI-still clip, near-zero motion, poster on edges → "freezed" | Higher-res clip + live mint scan + synced APPROVED flash → reads as a live transaction |
| Weak laptop under load | DPR crushed to **0.6 (blurry)**, full effect stack still running | **Native-resolution (≥1.0)**, expensive effects dropped per tier → crisp + smooth |
| Capability awareness | none | GPU-string detect + boot heuristic + runtime monitor; visible in overlay |
| Diagnostics | `?fps` graph only | full §8 overlay (tier/DPR/GPU/FPS/draw/tris/postFX/video/reduced/scroll) + boot log |
| SAFE cashier | n/a (no tiers) | scan bar animates over poster — not a frozen still |

---

## 13. Top remaining issues (ranked)

1. **~7.7 MB dead video ships to the live deploy.** `out/video/checkout-cinematic.*` (~3.9 MB, now unreferenced) **and** `ae1-checkout-2.*` (~3.8 MB, byte-identical dupe, untracked in git but still copied into `out/` → `gh-pages -d out` pushes it). **Fix:** delete both from `public/video/` before deploy. *(Awaiting your OK on `checkout-cinematic` — see §15.)*
2. **SAFE scan-bar visual unconfirmed by screenshot** (environmental, §10). Do the 30-second §11 manual check on a real machine.
3. **Sustained-FPS-under-load not captured per tier** in this environment; trust the ladder + a real-device pass with the overlay open.
4. **Lockfile ambiguity** — Next warns it picked `C:\Users\acer\pnpm-lock.yaml` as workspace root over the repo's `package-lock.json`. Harmless now; set `turbopack.root` to silence and avoid a future mis-resolution.
5. **PerformanceMonitor thresholds are drei defaults** (`flipflops={3}`) — not yet tuned to the briefing's ≥50 fps target on a known-weak device. Tune once real weak-device telemetry exists.
6. **`deviceMemory` is Chromium-only** — Safari/Firefox fall back to the cores check; acceptable but means the boot guess is coarser there.
7. **No HIGH-tier soak test** — N8AO + bloom + 680 particles + 2048 shadows on a true discrete GPU not yet profiled for sustained headroom.
8. **Scan-bar opacity (0.22) tuning** — intentionally subtle; confirm it's visible enough over the brightest poster frame on a calibrated display.
9. **Tier transition (runtime degrade) not visually verified** for a black-flash/pop on the live device (the conditional-render approach should avoid composer remount, but confirm).
10. **`ae1-checkout-2.*` untracked files** linger in the working tree — delete to avoid accidental future commits.

(Round 1's standing a11y/commerce backlog and briefing §5/§10 items remain *manual scope*, deliberately out of this focused diff.)

---

## 14. Closer to Awwwards? — honest answer

**Yes, materially — but the gain this round is mostly *trust*, not *spectacle*.** Awwwards juries punish two things hard: jank on their review hardware, and anything that reads as cheap (blur, frozen "video"). This round kills both — the weak-laptop blur path is gone and the cashier no longer reads as a freeze. That removes the most likely score-killers. It does **not** add new visual ambition; the spectacle ceiling is still Round 1's composition. Net: the floor came up a lot, the ceiling is unchanged — which is exactly right per the Prime Directives (Stability > Trust > Premium feel > … > Novelty).

---

## 15. Safe to deploy? — yes, with two conditions

**Both builds are green and the export is valid, so: yes — conditionally.**
1. **Delete the dead video first** (`public/video/checkout-cinematic.*` and `ae1-checkout-2.*`) to avoid shipping ~7.7 MB of unused payload. `checkout-cinematic` deletion awaits your explicit OK (you asked not to auto-delete); the `-2` dupe was never committed and is safe to remove now.
2. **Do the §11 SAFE scan-bar manual check** on one real machine before calling the cashier fix proven on the weak-GPU persona — I verified everything except the literal paint, which the headless preview can't capture.

Deploy path unchanged: `GITHUB_PAGES=true npm run build` → `out/` → ensure `out/.nojekyll` → `npx gh-pages -d out --dotfiles`. The branch is **not merged to `main` and not deployed** — it's staged for your review.

---

## 16. Manual checks (do these on the real hardware)

**On the strong laptop (the one it already looks good on):**
- Open `?debug=1`. Confirm the **GPU** line names the **discrete** GPU (NVIDIA/Radeon/Arc/Apple), not Intel. If it shows Intel here, Chrome is on the iGPU — see below.
- Confirm TIER reads **HIGH**, POSTFX = "SSAO + bloom + SMAA", FPS 10 s holds ≥ 50.

**On the weaker/mid-range gaming laptop (the P0 machine):**
- `chrome://gpu` → confirm **"Hardware accelerated"** for WebGL/WebGL2 (not "Software only / SwiftShader").
- Windows → Settings → Display → Graphics → set the browser to **High performance (dedicated GPU)** if it has one; relaunch Chrome.
- Open `?debug=1`. Read the **GPU** line: discrete → expect HIGH; "Intel … UHD/HD Graphics" → expect SAFE (correct — native-crisp, effects off); "Iris Xe" → STANDARD.
- Scroll the full vault. Confirm **no blur** (DPR floor 1.0), FPS 10 s ≥ 50, no black flash if the tier auto-drops.
- Run the **§11 SAFE scan-bar check** (`?tier=safe&debug=1`, scroll ≈64 %).

**On a phone:**
- Confirm you get the **`VaultStatic` fallback** (mobile path), or if WebGL loads, TIER = SAFE, poster-only video, no particles/shadows.
- Toggle OS **Reduce Motion** → confirm the reduced-motion fallback and/or SAFE tier engages.

**Deviation worth one sentence (so it isn't re-litigated):** `CashierScanBar`'s `lit` test is now just `p ∈ 0.45..0.86` — it intentionally dropped the old `active`/video-`ready` gate, because (a) `useFrame` is already parked when the vault is inactive so it can't paint stale-lit, and (b) dropping `ready` is the whole point — the bar must animate over the *poster* on SAFE where there is no video.

---

*Generated 2026-05-25. Branch `polish/cashier-and-tiers` @ `3abdc3a`.*
