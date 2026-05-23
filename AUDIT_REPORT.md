# Cold Audit — FitSole Vault

**Reviewed:** https://omarradwann.github.io/fitsole-vault/
**Lens:** First-impressions expert review — senior creative director + 3D-web critic, judging against Awwwards "Site of the Day" standards.
**Method:** Judged the live site only, as a first-time visitor, in a real Chrome browser (WebGL rendered fine). Full pass: initial load · slow scroll top→bottom (every scene) · reverse scroll · nav · search · full add-to-cart → checkout · console · DOM/accessibility diagnostics. Every finding below was captured with a screenshot during the live session.
**Honest limitations:** could not drive a true mobile viewport or touch input through automation, and FPS/micro-stutter isn't measurable from stills — so **real mobile rendering, touch-scroll, and frame-rate are unverified** and flagged as high-risk to test on real devices.

---

## Update — corrections & what shipped (2026-05-24)

After this cold audit, every finding was checked against the codebase **before** any change. Several "first-impression" calls were **wrong** and were deliberately NOT acted on — recorded here for honesty:

- **"Nike mislabeled as adidas" (was 🔴) — incorrect.** The **adidas AE 1** is Anthony Edwards' real signature shoe (he is an adidas athlete); the catalog (`lib/products.ts`), SKU `JQ6135`, and image naming correctly say Adidas. The Nike swoosh I zoomed in on is on a **generic placeholder 3D model** (a Tripo GLB), not the product data. No change made.
- **"Duplicate products" (was 🟠) — incorrect.** "Handball Spezial" vs "Handball Spezial Shoes" and "PUMA UP" vs "PUMA UP Trainers" are **different real colorways** (distinct SKUs / colorway codes). No change made.
- **"Checkout loses the cart" (was 🔴) — by design.** The checkout deep-link to fitsole.shop is an intentional scope cap, not a bug. Shipped fix: an **honest relabel** ("Continue on fitsole.shop") instead of a fake checkout promise.
- **"Blank search thumbnails" (was 🟡) — not reproducible.** Thumbnails load correctly on localhost; the live blank was a lazy-load/capture artifact. No change made.
- **"nike search returns nothing"** is simply because there is genuinely **no Nike inventory** in the 12-item catalog, while the meta description aspirationally lists Nike. Left as a product/marketing decision.

**Shipped to the live site** (commits `20311df` + `b0be366`, deployed to the `gh-pages` branch, verified live):

1. **Nav-jump black void → fixed.** Removed global `scroll-behavior: smooth`, so nav/search jumps to sections below the 700vh vault land instantly instead of crawling the camera through ~5s of black.
2. **Copy legibility → improved.** Dim body copy lifted to a readable cream; stronger scrim behind overlay text.
3. **Overlay bleed → fixed.** The SCROLL cue and trust bar now fade out before the vault hands off to the flat shop.
4. **Honest checkout copy** (above).

**Deliberately not touched:** the 3D camera/scene logic (fragile; FPS is unmeasurable through automation tooling). **Still open / verify on real devices:** mobile rendering + touch-scroll, real FPS, and the green scan-beam grazing the authenticity headline (needs a 3D-side adjustment, not a CSS one).

---

## 1) Verdict

A genuinely promising shell that does **not yet deliver on "premium," and is broken as a store.** The serif-on-black art direction and the camera-dolly-through-a-vault concept are real assets — but the experience repeatedly blanks to **full black between scenes**, the sneaker models read **mid-tier, not photoreal**, and the whole emotional build-up collapses at the payoff: clicking **Checkout dumps you onto a totally different, loud red "60% OFF" storefront with an empty cart.** The single biggest problem is **commerce integrity** — a store whose entire pitch is "100% authentic" mislabels a Nike as adidas, returns nothing for a "nike" search, and loses the cart at checkout. Would it win Awwwards SOTD today? No — it'd be knocked out in round one on motion blackouts and a broken buying flow.

---

## 2) Issues by area

Severity key: 🔴 Critical (breaks the experience / loses the visitor) · 🟠 Major (clearly hurts quality) · 🟡 Minor (polish) · ⚠️ Unverified risk.

### A. Design (visual craft) — solid foundation, execution flaws

- 🟢 **What works:** The display serif headline ("Egypt's Sneaker Vault") is genuinely beautiful, and the warm-gold-on-near-black palette reads premium and consistent across every scene. Symmetric, centered compositions feel intentional.
- 🔴 **Text legibility over the moving 3D fails repeatedly.** Sub-headlines and eyebrows render as faint, semi-transparent grey directly over busy 3D ("Every pair is authenticated…" is nearly invisible; the "FITSOLE · CAIRO" eyebrow sits *inside* the shelving). *Why:* the copy meant to sell the story can't be read, so the narrative doesn't land. *Fix:* a subtle radial scrim / frosted plate behind all overlay text; raise opacity; never float body copy unbacked over the render.
- 🔴 **The "100% Authentic. Every pair." headline is literally sliced by a glowing green "verification" bar running through the text.** *Why:* reads as a rendering bug and kills the hero line of the trust scene. *Fix:* move the bar below the type, or mask the type out of it.
- 🟠 **Leftover 3D overlay bleeds into the flat commerce sections** — the pinned "SCROLL" cue, the "100% AUTHENTIC · VERIFIED PAIRS · …" trust strip, and the orange center line ghost over the top of the first flat shop section. *Why:* reads as a z-index/teardown bug and cheapens the handoff to shopping. *Fix:* unmount the hero overlay when the 3D act ends.
- 🟠 **The brand-corridor filter chips (NIKE/ADIDAS/PUMA/ON) are near-invisible** (very low-contrast outlines). *Why:* the one interactive affordance in that scene disappears. *Fix:* raise contrast / give them a real button treatment.
- 🟡 **Hero center seam.** The mirrored composition produces a faint vertical line straight down the middle that, on first load, reads as a stitching artifact rather than the intended floor light. *Fix:* soften/offset so it doesn't bisect the headline.

### B. Motion — the weakest pillar; black voids undermine the whole idea

- 🟢 **What works:** The core concept — a camera gliding forward through a neon-lit vault, scene to scene — is elegant when settled, and **reverse scroll replays cleanly** (no permanent desync; it returns to the hero correctly).
- 🔴 **Transitions blank to full black.** Clicking a nav item ("SALE") produced a **completely black screen that persisted ~5 seconds** with no loading indicator before the section arrived — a *settled-state* observation, not a capture fluke. During rapid scroll, inter-scene frames also came back black with the header detached. *Why:* a 5-second black screen = users think it crashed and leave. *Fix:* cross-dissolve between scenes, keep the canvas painted during scroll-driven jumps, and show a loader if a jump is unavoidable.
- 🔴 **The header detaches and floats mid-screen during transitions/jumps.** *Why:* looks broken. *Fix:* keep the header truly fixed, independent of the pinned scroll timeline.
- 🟠 **~14 viewport-heights of total scroll** (measured: 10,210px ÷ 735px = 13.9 screens). *Why:* a lot of scrolling for ~6 scenes; the ratio of "scroll effort" to "things happening" is high in the 3D act. *Fix:* tighten scroll distance per scene, or add momentum so each scene resolves faster.
- ⚠️ **FPS/micro-stutter not measurable** from automation — must be checked on real hardware, especially mid-range mobile.

### C. Graphics / 3D — atmospheric but hobby-to-mid tier, not award CGI

- 🟢 **What works:** The vault environment is moody and convincing as a *space* — neon shelf strips, dark falloff, a warm floor pool of light, mirrored shelves of sneakers. The strongest CGI moment.
- 🟠 **The sneaker models are mid-tier.** Zoomed in, the pedestal hero shoe is soft/matte with a blobby, low-detail sole and no convincing leather or reflection; materials don't read as real. *Why:* on a "premium" site the hero product must look photoreal; this reads as a competent game asset. *Fix:* higher-poly or better-baked models, real PBR materials, subtle reflections / contact shadows, an HDRI environment for believable highlights.
- 🟠 **The featured-product close-up goes faceted/blurry while the camera is moving** — during the "A.E. 1 Low" push-in the shoe looks shattered/low-poly until it settles. *Fix:* don't fly the camera that close to a model that can't hold up at that scale, or swap in a high-res asset for the close-up.
- 🟡 **Floating shoeboxes are plain grey/white blocks** with no texture or branding. *Fix:* texture them (lids, logos) or remove.

### D. Storytelling / narrative — clear arc, betrayed payoff

- 🟢 **What works:** There's a legible arc — *Enter the Vault → Step Inside → featured drop → The Wall / New Drops → Verification → Brand Corridor → Shop.* The Cairo identity and authenticity theme are consistent, and the copy is decent ("Authentic heat, curated drops, and sneaker culture born in Cairo").
- 🔴 **The payoff betrays the build-up.** The premium dark vault seduces you, then **Checkout opens a completely different brand**: a bright **red, bold sans-serif "UP TO 60% OFF / EID MUBARAK," buy-now-pay-later** discount storefront (`fitsole.shop`). *Why:* the emotional promise ("high-end vault") collides with discount-retailer reality; the visitor feels bait-and-switched. *Fix:* unify the two identities (bring the vault's restraint to the store, or add a transitional bridge), or stage the discount messaging so it doesn't whiplash.
- 🟠 **Most scenes are parallel pitches, not a connected story.** "Step Inside," "New Drops," "Verification," "Brands" each restate "we're authentic" rather than escalating. *Fix:* give it a single narrative spine (e.g., follow one pair from vault → verification → your feet) so scenes build instead of repeat.

### E. Experience & commerce — the core buying path is effectively broken

- 🟢 **What works (and works well):** The cart drawer is clean (empty state, qty stepper, subtotal, "Secure checkout" line) and **persists across reload**. Add-to-cart UX is good: pick size → button becomes "ADD TO CART" → flashes green → cart auto-opens. **Accessibility basics are surprisingly strong:** all 25 images have alt text, exactly one `<h1>`, every button labeled, `lang="en"`, a real meta description, a proper `viewport` meta, and responsive scaffolding (Tailwind `md:` breakpoints + a hamburger toggle for mobile). No console errors observed.
- 🔴 **Checkout loses the cart.** Adding "PUMA UP / Size 42," then clicking **CHECKOUT, opens `fitsole.shop`'s homepage in a new tab — not a checkout, and with none of the selection carried over.** *Why:* the entire cart is decorative; the buyer must start over on a different site. This alone stops the site from turning visitors into buyers. *Fix:* deep-link Checkout to the real product/cart on fitsole.shop (or share its real cart), or relabel the button honestly ("Continue on fitsole.shop").
- 🔴 **Brand data is wrong on a "100% authentic" store.** The hero/featured "A.E. 1 Low" wears a **Nike swoosh and the word "NIKE"** but is tagged **"ADIDAS · BASKETBALL"** (confirmed again in search results). *Why:* mislabeling brands is fatal to an authenticity pitch. *Fix:* correct brand tags; QA every SKU's brand/category.
- 🔴 **Searching "nike" returns "No pairs match 'nike'."** — yet the site's own meta description advertises "100% authentic **Nike**, Adidas, Puma, ON." The catalog has zero Nike-tagged items (and the one real Nike is mislabeled adidas). *Why:* shoppers search the most iconic sneaker brand and hit a dead end. *Fix:* tag Nike products correctly / add Nike inventory; add brand synonyms to search.
- 🟠 **Duplicate products with conflicting prices.** "Handball Spezial" (4,799 EGP, "Best Seller") **and** "Handball Spezial Shoes" (5,949 EGP) both exist; similarly "PUMA UP" vs "PUMA UP Trainers." *Why:* looks like a seeding/data error; erodes trust and muddles choice. *Fix:* dedupe SKUs; one canonical entry per product.
- 🟠 **Primary nav feels broken.** "Best Sellers" updated the URL to `#best-sellers` but didn't move the page; "Sale" eventually arrived, but only after the ~5s black void, and landed misaligned until a manual nudge. *Fix:* make nav anchors jump fast and land settled (see Motion).
- 🟠 **Thin footer for a store.** Just nav links + copyright + "All products 100% authenticated." No contact, returns/shipping policy, size guide, social, or newsletter. *Fix:* add the trust/utility links a buyer expects.
- 🟡 **Search-result thumbnails are blank** (images don't load in the dropdown). *Fix:* wire up the result images.
- ⚠️ **Mobile & motion accessibility unverified / high-risk.** Could not drive a true mobile viewport or touch input; scroll-jacked WebGL is notoriously fragile on touch + mid-range GPUs. Could not confirm `prefers-reduced-motion` handling — a heavy 3D scroll experience with no reduced-motion fallback is a real motion-sensitivity concern. *Fix:* test on real phones (touch-scroll, performance, text legibility at 390px) and honor `prefers-reduced-motion` with a reduced/static path.

---

## 3) Fix-first list (top 5, in priority order)

1. **🔴 Fix the checkout handoff.** Carry the cart/selection through to fitsole.shop (deep-link product+size, or share a real cart) — or relabel the button. Right now nothing a visitor does can result in a purchase.
2. **🔴 Fix brand data integrity & search.** Re-tag the Nike as Nike, make "nike" return results, dedupe Handball Spezial / PUMA UP. Non-negotiable for a "100% authentic" brand.
3. **🔴 Kill the black-void transitions & broken nav jumps.** Cross-dissolve, keep the canvas painted, keep the header pinned, and make nav anchors land fast and settled.
4. **🟠 Resolve the premium → discount brand whiplash.** Align the vault's identity with the actual store, or bridge the transition so the payoff doesn't betray the build-up.
5. **🟠 Fix text-over-3D legibility + leftover overlay bleed**, and **verify mobile/touch on a real device** + add a `prefers-reduced-motion` fallback.

---

## 4) Scores (out of 10)

| Area | Score | One-line justification |
|---|---|---|
| **Design** | **6/10** | Beautiful serif/gold-on-black foundation, undercut by pervasive text-over-3D legibility failures and overlay bleed. |
| **Motion** | **4/10** | Elegant camera concept and clean reverse scroll, but 5-second black voids and a detaching header read as broken. |
| **Graphics / 3D** | **5/10** | Atmospheric vault environment; sneaker models and boxes are mid-tier and go faceted in motion — not award CGI. |
| **Storytelling** | **5/10** | Clear arc and consistent Cairo/authenticity theme, but the checkout dumps you into a different brand and kills the payoff. |
| **Experience & commerce** | **3/10** | Clean cart and solid a11y basics, but mislabeled brands, dead "nike" search, and a cart-losing checkout mean it can't convert. |
| **Overall** | **~4.5/10** | Strong bones and a real point of view; not yet premium, and currently broken as a store. |
