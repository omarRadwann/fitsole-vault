import os, base64
from playwright.sync_api import sync_playwright

# Ground-truth probe: where does the ball actually REST (world Y), is it on-screen, and how big does
# it look vs the sneakers? Reads window.__ball + screenshots at settle (p~0.3) and the meet (p~0.5).
BASE = os.environ.get("FITSOLE_BASE", "http://localhost:4000")

with sync_playwright() as pw:
    b = pw.chromium.launch(headless=False, args=[
        "--use-gl=angle", "--use-angle=d3d11", "--enable-gpu",
        "--ignore-gpu-blocklist", "--window-size=1600,950",
    ])
    pg = b.new_page(viewport={"width": 1600, "height": 900}, device_scale_factor=1)
    pg.on("console", lambda m: (print("  RAW>", m.text) if "RAWDIM" in m.text else None))
    cdp = pg.context.new_cdp_session(pg)

    def shot(name):
        d = cdp.send("Page.captureScreenshot", {"format": "png"})
        open(f"C:/tmp/{name}.png", "wb").write(base64.b64decode(d["data"]))
        print("  ->", name)

    def ball():
        return pg.evaluate("()=>window.__ball || null")

    pg.goto(BASE, wait_until="load")
    pg.wait_for_timeout(3500)
    box = pg.evaluate("""()=>{const s=document.querySelector('section[aria-label="FitSole — two drops, one vault"]');return s?{top:s.offsetTop,height:s.offsetHeight,vh:innerHeight}:null}""")
    span = box["height"] - box["vh"]

    # settle at p~0.30
    pg.evaluate(f"window.scrollTo(0,{box['top'] + 0.30 * span})")
    pg.wait_for_timeout(5000)
    print("REST @p0.30:", ball(), " (wy should be ~0.11 = R; if much bigger/near 0 the ball sits wrong)")
    shot("probe_rest_p30")

    # the meet at p~0.50 (where the user's screenshot was)
    pg.evaluate(f"window.scrollTo(0,{box['top'] + 0.50 * span})")
    pg.wait_for_timeout(4000)
    print("MEET  @p0.50:", ball())
    shot("probe_meet_p50")

    # settle a touch later
    pg.evaluate(f"window.scrollTo(0,{box['top'] + 0.62 * span})")
    pg.wait_for_timeout(4000)
    print("REST @p0.62:", ball())
    shot("probe_rest_p62")
    b.close()
