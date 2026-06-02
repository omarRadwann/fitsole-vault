import os
import sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("FITSOLE_BASE", "http://localhost:3000")

# Capture the WebGL finale (SkyBridge/SkyScene) at specific scroll-progress beats.
# Usage: python _capture_finale.py <label>   ->  /tmp/finale_<label>_p<NN>.png
suffix = sys.argv[1] if len(sys.argv) > 1 else "shot"
BEATS = [0.45, 0.68, 0.90]  # 0.45 = charge glow; 0.68 = auras + spin + copy; 0.90 = flood + dive flare

with sync_playwright() as pw:
    browser = pw.chromium.launch(
        headless=True,
        args=[
            "--enable-unsafe-swiftshader",   # allow WebGL via SwiftShader in headless
            "--use-gl=angle",
            "--use-angle=swiftshader",
            "--ignore-gpu-blocklist",
        ],
    )
    page = browser.new_page(
        viewport={"width": 1440, "height": 900},
        device_scale_factor=1,
        reduced_motion="no-preference",
    )
    msgs = []
    page.on("console", lambda m: msgs.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    page.on("pageerror", lambda e: msgs.append(f"pageerror: {e}"))
    page.on("requestfailed", lambda r: msgs.append(f"reqfail: {r.url} {r.failure}") if (".glb" in r.url or ".webp" in r.url) else None)

    page.goto(BASE, wait_until="load")
    page.wait_for_timeout(2500)

    box = page.evaluate(
        """() => {
            const s = document.querySelector('section[aria-label="FitSole — two drops, one vault"]')
                   || [...document.querySelectorAll('section')].find(x => (x.getAttribute('aria-label')||'').includes('two drops'));
            if (!s) return null;
            return { top: s.offsetTop, height: s.offsetHeight, vh: window.innerHeight };
        }"""
    )
    print("SECTION:", box)
    if not box:
        labels = page.evaluate("() => [...document.querySelectorAll('section')].map(s=>s.getAttribute('aria-label'))")
        print("FINALE NOT FOUND. section labels:", labels)
        browser.close()
        sys.exit(1)

    span = box["height"] - box["vh"]
    first = True
    for p_target in BEATS:
        y = box["top"] + p_target * span
        page.evaluate(f"window.scrollTo(0, {y})")
        page.wait_for_timeout(500)  # IO flips inView + rAF writes scrollProgress
        page.wait_for_timeout(7000 if first else 3500)  # WebGL + model decode settle
        first = False
        # report whether a canvas is mounted + its size, and current scrollProgress proxy
        info = page.evaluate(
            """() => {
                const c = document.querySelector('canvas');
                return { canvas: !!c, w: c?c.width:0, h: c?c.height:0, scrollY: window.scrollY };
            }"""
        )
        out = f"/tmp/finale_{suffix}_p{int(p_target*100)}.png"
        page.screenshot(path=out)
        print(f"captured p={p_target} y={y:.0f} -> {out}  info={info}")

    print("CONSOLE errors/warnings/failed:", msgs[:25] if msgs else "none")
    browser.close()
