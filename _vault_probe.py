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
    cdp = pg.context.new_cdp_session(pg)

    def shot(name):
        d = cdp.send("Page.captureScreenshot", {"format": "png"})
        open(f"C:/tmp/{name}.png", "wb").write(base64.b64decode(d["data"]))
        print("  ->", name)

    pg.goto(BASE, wait_until="load")
    pg.wait_for_timeout(3500)
    total = pg.evaluate("()=>document.body.scrollHeight")
    print("scrollHeight:", total)
    for frac, name in [(0.0, "vault_top"), (0.06, "vault_hero"), (0.12, "vault_p12")]:
        pg.evaluate(f"window.scrollTo(0,{int(frac*total)})")
        pg.wait_for_timeout(1800)
        shot(name)
    b.close()
