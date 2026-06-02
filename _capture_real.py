import os, sys, base64
from playwright.sync_api import sync_playwright

# REAL-GPU capture (headed Chromium → uses the machine's actual GPU, like the user's
# browser) — NOT SwiftShader. This is what the user actually sees. CDP captureScreenshot
# beats the continuous-WebGL page.screenshot stability timeout.
BASE = os.environ.get("FITSOLE_BASE", "http://localhost:4000")
label = sys.argv[1] if len(sys.argv) > 1 else "real"
beats = [float(x) for x in (sys.argv[2].split(",") if len(sys.argv) > 2 else ["0.30", "0.50", "0.74"])]

with sync_playwright() as pw:
    b = pw.chromium.launch(headless=False, args=[
        "--use-gl=angle", "--use-angle=d3d11", "--enable-gpu",
        "--ignore-gpu-blocklist", "--window-size=1600,950",
    ])
    pg = b.new_page(viewport={"width": 1600, "height": 900}, device_scale_factor=1, reduced_motion="no-preference")
    msgs = []
    pg.on("console", lambda m: msgs.append(f"{m.type}: {m.text}") if m.type == "error" else None)
    cdp = pg.context.new_cdp_session(pg)

    def shot(name):
        data = cdp.send("Page.captureScreenshot", {"format": "png"})
        with open(f"C:/tmp/{name}.png", "wb") as f:
            f.write(base64.b64decode(data["data"]))
        print("  ->", name)

    pg.goto(BASE, wait_until="load")
    pg.wait_for_timeout(4000)
    # Report the GPU the page is actually using (confirms real GPU vs SwiftShader).
    gpu = pg.evaluate("""()=>{try{const c=document.createElement('canvas');const gl=c.getContext('webgl2')||c.getContext('webgl');const e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'(no ext)';}catch(e){return 'ERR '+e}}""")
    print("GPU:", gpu)
    box = pg.evaluate("""()=>{const s=document.querySelector('section[aria-label="FitSole — two drops, one vault"]');return s?{top:s.offsetTop,height:s.offsetHeight,vh:innerHeight}:null}""")
    span = box["height"] - box["vh"]
    first = True
    for p in beats:
        pg.evaluate(f"window.scrollTo(0, {box['top'] + p*span})")
        pg.wait_for_timeout(6500 if first else 3500); first = False
        shot(f"{label}_finale_p{int(round(p*100))}")
    print("CONSOLE errors:", msgs[:10] if msgs else "clean")
    b.close()
