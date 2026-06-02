import os
from playwright.sync_api import sync_playwright

# Measure rAF frame rate in the finale: (1) static at the meet, (2) while continuously
# scrolling (the "laggy" scenario). Headed Chromium -> real Iris Xe GPU. rAF is vsync-capped
# (~60 here), so a steady ~60 while scrolling == the GPU keeps up (smooth); a drop == lag.
BASE = os.environ.get("FITSOLE_BASE", "http://localhost:4000")
with sync_playwright() as pw:
    b = pw.chromium.launch(headless=False, args=[
        "--use-gl=angle", "--use-angle=d3d11", "--enable-gpu",
        "--ignore-gpu-blocklist", "--window-size=1600,950",
    ])
    pg = b.new_page(viewport={"width": 1600, "height": 900})
    pg.goto(BASE, wait_until="load")
    pg.wait_for_timeout(4000)
    box = pg.evaluate("""()=>{const s=document.querySelector('section[aria-label="FitSole — two drops, one vault"]');return s?{top:s.offsetTop,height:s.offsetHeight,vh:innerHeight}:null}""")
    span = box["height"] - box["vh"]
    pg.evaluate(f"window.scrollTo(0,{box['top'] + 0.5*span})")
    pg.wait_for_timeout(1500)
    fps_static = pg.evaluate("""()=>new Promise(r=>{let n=0;const t0=performance.now();(function f(){n++;const d=performance.now()-t0;d<2500?requestAnimationFrame(f):r((n/(d/1000)).toFixed(1))})()})""")
    print("rAF FPS at meet (static):", fps_static)
    fps_scroll = pg.evaluate(f"""()=>new Promise(r=>{{let n=0;const t0=performance.now();let y={box['top'] + 0.25*span};(function f(){{n++;y+=7;window.scrollTo(0,y);const d=performance.now()-t0;d<2500?requestAnimationFrame(f):r((n/(d/1000)).toFixed(1))}})()}})""")
    print("rAF FPS while scrolling:", fps_scroll)
    b.close()
