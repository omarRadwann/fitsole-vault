# FitSole Vault Walk — Tripo Asset Prompts

The 3D scene is already wired. Each asset is loaded by `components/three/ModelOrFallback.tsx`
via `lib/assets.ts`. Until a GLB exists, the scene shows placeholder geometry automatically.

## How to deliver each asset
1. Generate in Tripo Studio (tripo3d.ai) with the prompt + negative prompt below.
2. Export as **GLB** (textures / PBR on).
3. Drop the file into this folder's `raw/` using the RAW filename. Tell Claude — it optimizes into `optimized/`.
4. For an instant preview, copy the export straight to `optimized/<name>.glb` with the exact name and reload.

Loader auto-normalizes scale + seats each model, so Tripo export scale does not matter.
Tripo settings: Realistic style, PBR on, symmetry on where noted. Hero sneaker: Image-to-3D from a reference photo gives the best result.

---

## 1 — Hero sneaker  (HIGHEST PRIORITY)
Prompt:
```
Premium unbranded modern lifestyle sneaker, sculptural chunky layered midsole, clean knit and leather upper, no logos, no text, matte graphite-black panels with warm bone-white sections and a single subtle amber accent line, brushed metallic eyelets, neat laces, realistic PBR materials, high-end studio product display quality, one single centered shoe, web-ready 3D asset
```
Negative:
```
logo, brand mark, swoosh, three stripes, puma cat, text, numbers, watermark, human foot, sock, person, pair of shoes, second shoe, melted geometry, distorted sole, floating parts, tangled laces, low-poly blob, background, scene, floor, box
```
GLB · texture 2048 · pivot center-bottom · target 10k-35k faces
Raw: `raw/hero-sneaker-v01.raw.glb` → Optimized: `optimized/hero-sneaker-v01.glb`

## 2 — Display plinth
Prompt:
```
Premium circular sneaker display pedestal for a luxury retail store, layered matte black rubber and brushed dark metal, slim cylindrical column on a wide round base, subtle warm amber LED ring near the top edge, minimal clean geometry, no text, no logos, isolated product display stand, realistic PBR materials, web-ready 3D asset
```
Negative:
```
shoe, sneaker, product on top, people, logos, text, wires, clutter, full room, watermark, distorted
```
GLB · texture 1024-2048 · pivot center-bottom · target 3k-10k faces · symmetry on
Raw: `raw/display-plinth-v01.raw.glb` → Optimized: `optimized/display-plinth-v01.glb`

## 3 — Drop-wall shelf module
Prompt:
```
Modular premium sneaker store wall shelf unit, dark brushed metal frame, three horizontal glass shelves, warm LED light strip along each shelf front edge, tall narrow vertical module designed to line a retail corridor, clean grid structure, no products, no logos, no text, isolated modular asset, realistic PBR materials, web-ready low-poly 3D asset
```
Negative:
```
shoes, products, brand logos, text, people, full store, room, clutter, distorted shelves, watermark
```
GLB · texture 1024-2048 · pivot center-bottom · target 2k-8k faces
Raw: `raw/drop-wall-module-v01.raw.glb` → Optimized: `optimized/drop-wall-module-v01.glb`

## 4 — Authenticity counter
Prompt:
```
Premium sneaker authentication counter desk for a high-end store, dark matte body with a glass top, small built-in verification tray, warm amber LED accent along the front edge, trustworthy luxury retail service station, clean simple geometry, no text, no logos, no people, isolated object, realistic PBR materials, web-ready 3D asset
```
Negative:
```
readable text, brand logos, people, hands, messy documents, full room, watermark, distorted counter
```
GLB · texture 1024-2048 · pivot center-bottom · target 3k-10k faces
Raw: `raw/authenticity-counter-v01.raw.glb` → Optimized: `optimized/authenticity-counter-v01.glb`

## 5 — Verification card / tag
Prompt:
```
Premium sneaker authenticity verification card, small rectangular card, matte black with off-white panel and a subtle embossed abstract checkmark symbol, thin brushed-metal edge, minimal luxury retail accessory, no readable text, no brand logos, no QR code, isolated object, clean geometry, realistic PBR materials, suitable for close-up web animation
```
Negative:
```
readable text, serial numbers, QR code, barcode, brand logos, clutter, watermark, person, hand
```
GLB · texture 1024 · pivot center · target under 3k faces
Raw: `raw/verification-card-v01.raw.glb` → Optimized: `optimized/verification-card-v01.glb`

## 6 — Shoebox stack
Prompt:
```
Stack of three premium unbranded sneaker boxes for a luxury store, matte black and warm bone-white boxes slightly offset, subtle blank label panel with no readable text, a thin amber accent line on the top box, clean stacked geometry, retail display prop, no logos, no brand names, isolated object, realistic PBR materials, web-ready 3D asset
```
Negative:
```
Nike, Adidas, Puma, ON, NBA, Wilson, readable text, logos, letters, numbers, people, background, distorted boxes, watermark
```
GLB · texture 1024 · pivot center-bottom · target under 5k faces
Raw: `raw/shoebox-stack-v01.raw.glb` → Optimized: `optimized/shoebox-stack-v01.glb`

---
Lower priority (code-built for now): storefront portal, floor tile module. Generate later only if needed.
