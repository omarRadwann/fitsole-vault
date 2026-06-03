import os, base64, math
from playwright.sync_api import sync_playwright

# Focused SHOT test: settle the ball, grab it, flick STRAIGHT UP (a real "shoot" gesture), then sample
# the trajectory and report the closest approach to the rim (0, 2.42, -4.85) — does the aim-assist make
# "flick up = score"? Repeats from a few rest spots. RIM radius for swish ≈ 0.36.
BASE = os.environ.get("FITSOLE_BASE", "http://localhost:4000")
RIM = (0.0, 2.42, -4.85)

def dist_xz(b):
    return math.hypot(b["wx"] - RIM[0], b["wz"] - RIM[2])

with sync_playwright() as pw:
    b = pw.chromium.launch(headless=False, args=[
        "--use-gl=angle", "--use-angle=d3d11", "--enable-gpu",
        "--ignore-gpu-blocklist", "--window-size=1600,950",
    ])
    pg = b.new_page(viewport={"width": 1600, "height": 900}, device_scale_factor=1)
    scored = {"hit": False}
    pg.on("console", lambda m: scored.__setitem__("hit", True) if ("swish" in m.text.lower() or "score" in m.text.lower()) else None)
    cdp = pg.context.new_cdp_session(pg)

    def ball():
        return pg.evaluate("()=>window.__ball || null")

    pg.goto(BASE, wait_until="load")
    pg.wait_for_timeout(3500)
    box = pg.evaluate("""()=>{const s=document.querySelector('section[aria-label="FitSole — two drops, one vault"]');return s?{top:s.offsetTop,height:s.offsetHeight,vh:innerHeight}:null}""")
    span = box["height"] - box["vh"]
    pg.evaluate(f"window.scrollTo(0,{box['top'] + 0.40 * span})")
    pg.wait_for_timeout(6000)  # let the drop fully settle (mirrors _ball_test)

    for trial in range(3):
        bs = ball()
        if not bs or not bs.get("onScreen"):
            print(f"trial {trial}: ball not grabbable", bs); continue
        bx, by = bs["sx"], bs["sy"]
        pg.mouse.move(bx, by); pg.wait_for_timeout(50)
        pg.mouse.down(); pg.wait_for_timeout(90)
        # STRAIGHT-UP flick: x constant, y rises fast over ~5 quick steps
        for i in range(1, 6):
            pg.mouse.move(bx, by - i * 60); pg.wait_for_timeout(12)
        pg.mouse.up()
        # sample the flight, track closest 3D approach + rim-plane crossing
        best = 999; crossed = False
        for _ in range(70):
            pg.wait_for_timeout(16)
            f = ball()
            if not f: continue
            d3 = math.hypot(f["wx"]-RIM[0], f["wy"]-RIM[1], f["wz"]-RIM[2])
            best = min(best, d3)
            if abs(f["wy"] - RIM[1]) < 0.2 and dist_xz(f) < 0.36:
                crossed = True
        print(f"trial {trial}: from grab, closest-to-rim(3D)={best:.2f}  swish-plane-pass={crossed}")
        scored["hit"] = False
        pg.wait_for_timeout(5000)  # let it settle for the next trial
    b.close()
