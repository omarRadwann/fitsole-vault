import os, base64
from playwright.sync_api import sync_playwright

# DEEP interaction test for the finale basketball — dispatches REAL mouse events into the canvas
# (headed Chromium → real Iris Xe GPU) to verify grab / drag / throw / bounce actually work, reads
# window.__ball (live world+screen state) + the 🏀 console logs, and measures FPS during play.
BASE = os.environ.get("FITSOLE_BASE", "http://localhost:4000")

with sync_playwright() as pw:
    b = pw.chromium.launch(headless=False, args=[
        "--use-gl=angle", "--use-angle=d3d11", "--enable-gpu",
        "--ignore-gpu-blocklist", "--window-size=1600,950",
    ])
    pg = b.new_page(viewport={"width": 1600, "height": 900}, device_scale_factor=1)
    logs = []
    pg.on("console", lambda m: logs.append(f"{m.type}: {m.text}"))
    pg.on("pageerror", lambda e: logs.append(f"PAGEERROR: {e}"))
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
    pg.evaluate(f"window.scrollTo(0,{box['top'] + 0.4 * span})")
    pg.wait_for_timeout(450)  # SHORT — catch the ball mid-drop (bounce-on-enter)
    print("BALL on enter (want it high + falling):", ball())
    shot("bt_0_enter")
    pg.wait_for_timeout(4200)  # now let it settle

    print("BALL after settle:", ball())
    shot("bt_1_settled")

    fps_steady = pg.evaluate(f"""()=>new Promise(r=>{{let n=0;const t0=performance.now();let y={box['top'] + 0.3 * span};(function f(){{n++;y+=4;window.scrollTo(0,y);const d=performance.now()-t0;d<3000?requestAnimationFrame(f):r((n/(d/1000)).toFixed(1))}})()}})""")
    print("FPS steady (scroll, ball asleep):", fps_steady)
    pg.evaluate(f"window.scrollTo(0,{box['top'] + 0.4 * span})")
    pg.wait_for_timeout(2500)

    bs = ball()
    if not bs:
        print("!!! window.__ball is NULL — ball never mounted or useFrame not running")
    elif not bs.get("onScreen"):
        print("!!! ball OFF-SCREEN at", bs, "— can't grab where the user can't see it")
    else:
        bx, by = bs["sx"], bs["sy"]
        print(f"--- grabbing ball at screen ({bx:.0f},{by:.0f}) ---")
        pg.mouse.move(bx, by)
        pg.wait_for_timeout(60)
        pg.mouse.down()
        pg.wait_for_timeout(140)
        print("after DOWN:", ball())
        before = ball()
        for i in range(1, 12):
            pg.mouse.move(bx - i * 16, by - i * 9)
            pg.wait_for_timeout(16)
        after = ball()
        print("after DRAG:", after)
        moved = abs((after or {}).get("wx", 0) - (before or {}).get("wx", 0)) + abs((after or {}).get("wy", 0) - (before or {}).get("wy", 0))
        print(f"    drag moved the ball by ~{moved:.2f} world units (should be > 0 if drag works)")
        shot("bt_2_dragging")
        pg.mouse.move(bx, by - 330)  # fast UP flick → should SHOOT toward the hoop
        pg.wait_for_timeout(16)
        pg.mouse.up()
        pg.wait_for_timeout(150)
        rel = ball()
        print("after RELEASE:", rel)
        pg.wait_for_timeout(700)  # let it fly toward the hoop
        af = ball()
        print("after FLIGHT:", af)
        print(f"    z went {(before or {}).get('wz')} -> {(af or {}).get('wz')} (more negative = arced toward the hoop = shoot works)")
        shot("bt_3_thrown")

    fps = pg.evaluate(f"""()=>new Promise(r=>{{let n=0;const t0=performance.now();let y={box['top'] + 0.3 * span};(function f(){{n++;y+=5;window.scrollTo(0,y);const d=performance.now()-t0;d<3000?requestAnimationFrame(f):r((n/(d/1000)).toFixed(1))}})()}})""")
    print("FPS active (scroll + thrown ball):", fps)

    print("\n=== ball / error console logs ===")
    seen = set()
    for l in logs:
        tag = "ball" in l.lower() or "grab" in l.lower() or "release" in l.lower() or "swish" in l.lower() or "mounted" in l.lower()
        if (tag or "error" in l.lower() or "PAGEERROR" in l) and l not in seen:
            seen.add(l)
            try:
                print("  ", l.encode("ascii", "replace").decode())
            except Exception:
                pass
    b.close()
