import os, base64
from playwright.sync_api import sync_playwright

# Capture the VAULT section (hero sneaker turntable) at a few scroll depths to confirm the shared
# ModelOrFallback normalizeTo fix did NOT regress the (already-approved) vault hero sneaker.
BASE = os.environ.get("FITSOLE_BASE", "http://localhost:4000")

with sync_playwright() as pw:
    b = pw.chromium.launch(headless=False, args=[
        "--use-gl=angle", "--use-angle=d3d11", "--enable-gpu",
        "--ignore-gpu-blocklist", "--window-size=1600,950",
    ])
    pg = b.new_page(viewport={"width": 1600, "height": 900}, device_scale_factor=1)
    errs = []
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errs.append(f"PAGEERROR {e}"))
    cdp = pg.context.new_cdp_session(pg)

    def shot(name):
        d = cdp.send("Page.captureScreenshot", {"format": "png"})
        open(f"C:/tmp/{name}.png", "wb").write(base64.b64decode(d["data"]))
        print("  ->", name)

    pg.goto(BASE, wait_until="load")
    pg.wait_for_timeout(3500)
    total = pg.evaluate("()=>document.body.scrollHeight")
    print("scrollHeight:", total)
    for frac, name in [(0.28, "vault_c28"), (0.40, "vault_c40"), (0.52, "vault_c52")]:
        pg.evaluate(f"window.scrollTo(0,{int(frac*total)})")
        pg.wait_for_timeout(1800)
        shot(name)
    print("CONSOLE ERRORS:", errs[:8] if errs else "clean")
    b.close()
