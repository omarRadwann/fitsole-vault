import os, sys, base64
from playwright.sync_api import sync_playwright

# Verify the rebuilt vault + finale against a LOCAL static build (npx serve out).
# Uses CDP Page.captureScreenshot (does NOT wait for page "stability"), so the
# continuous WebGL rAF / demand loop doesn't hang the shot like page.screenshot did.
# SwiftShader → integrated-GPU code path (the user's Iris Xe path): finale blob
# grounding, vault bloom off. Usage: python _capture_verify.py <label>
BASE = os.environ.get("FITSOLE_BASE", "http://localhost:4000")
label = sys.argv[1] if len(sys.argv) > 1 else "v"

with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True, args=[
        "--enable-unsafe-swiftshader", "--use-gl=angle",
        "--use-angle=swiftshader", "--ignore-gpu-blocklist",
    ])
    pg = b.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1,
                    reduced_motion="no-preference")
    msgs = []
    pg.on("console", lambda m: msgs.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: msgs.append(f"pageerror: {e}"))
    pg.on("requestfailed", lambda r: msgs.append(f"reqfail: {r.url}"))
    cdp = pg.context.new_cdp_session(pg)

    def shot(name):
        data = cdp.send("Page.captureScreenshot", {"format": "png"})
        with open(f"/tmp/{name}.png", "wb") as f:
            f.write(base64.b64decode(data["data"]))
        print("  ->", name)

    pg.goto(BASE, wait_until="load")
    pg.wait_for_timeout(3000)

    # ---- VAULT beats via window.__vaultForce (pins camera + overlay) ----
    pg.evaluate("window.scrollTo(0, 0)")
    first = True
    for p in [0.12, 0.46, 0.58, 0.72, 0.90]:
        pg.evaluate(f"window.__vaultForce = {p}")
        pg.wait_for_timeout(6500 if first else 2600); first = False
        shot(f"{label}_vault_p{int(p*100)}")
    pg.evaluate("delete window.__vaultForce")

    # ---- FINALE beats (real scroll into the SkyBridge section) ----
    box = pg.evaluate("""()=>{const s=document.querySelector('section[aria-label=\"FitSole — two drops, one vault\"]');return s?{top:s.offsetTop,height:s.offsetHeight,vh:innerHeight}:null}""")
    if box:
        span = box["height"] - box["vh"]
        first = True
        for p in [0.30, 0.50, 0.74]:
            pg.evaluate(f"window.scrollTo(0, {box['top'] + p*span})")
            pg.wait_for_timeout(7000 if first else 3500); first = False
            shot(f"{label}_finale_p{int(p*100)}")
    else:
        print("  FINALE SECTION NOT FOUND")

    # ---- Flat shop (product grid) ----
    pg.evaluate("window.scrollTo(0, document.body.scrollHeight - innerHeight*1.5)")
    pg.wait_for_timeout(2500)
    shot(f"{label}_shop")

    print("CONSOLE:", msgs[:30] if msgs else "clean")
    b.close()
