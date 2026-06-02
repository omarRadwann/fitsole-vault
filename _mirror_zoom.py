import os, sys, base64
from playwright.sync_api import sync_playwright

# Zoomed diagnostic on the LEFT (mirror) region of the finale at the meet + present,
# to see whether the live reflective-glass plane renders / aligns / reflects the pairs.
BASE = os.environ.get("FITSOLE_BASE", "http://localhost:4000")
label = sys.argv[1] if len(sys.argv) > 1 else "mz"

with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True, args=[
        "--enable-unsafe-swiftshader", "--use-gl=angle",
        "--use-angle=swiftshader", "--ignore-gpu-blocklist",
    ])
    pg = b.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1,
                    reduced_motion="no-preference")
    cdp = pg.context.new_cdp_session(pg)

    def shot(name, clip=None):
        params = {"format": "png"}
        if clip:
            params["clip"] = clip
        data = cdp.send("Page.captureScreenshot", params)
        with open(f"/tmp/{name}.png", "wb") as f:
            f.write(base64.b64decode(data["data"]))
        print("  ->", name)

    pg.goto(BASE, wait_until="load")
    pg.wait_for_timeout(3000)
    box = pg.evaluate("""()=>{const s=document.querySelector('section[aria-label=\"FitSole — two drops, one vault\"]');return s?{top:s.offsetTop,height:s.offsetHeight,vh:innerHeight}:null}""")
    span = box["height"] - box["vh"]
    # Mirror sits screen-left; zoom that region (x0..330, y10..420) at 3x.
    clip = {"x": 0, "y": 10, "width": 330, "height": 420, "scale": 3}
    first = True
    for p in [0.42, 0.58, 0.74]:
        pg.evaluate(f"window.scrollTo(0, {box['top'] + p*span})")
        pg.wait_for_timeout(7000 if first else 3500); first = False
        shot(f"{label}_mirror_p{int(p*100)}", clip)
    b.close()
