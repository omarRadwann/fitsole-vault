import sys
from playwright.sync_api import sync_playwright

# Catch the TRANSIENT meeting burst mid-animation: load + settle at p<0.48 (models
# load, burst NOT armed), then nudge past 0.48 (arms the .burst class) and grab a
# frame ~0.25s into the ~0.9s animation. Usage: python _capture_burst.py [ms]
grab_ms = int(sys.argv[1]) if len(sys.argv) > 1 else 240

with sync_playwright() as pw:
    browser = pw.chromium.launch(
        headless=True,
        args=["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
    )
    page = browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1, reduced_motion="no-preference")
    page.goto("http://localhost:3000", wait_until="load")
    page.wait_for_timeout(2000)
    box = page.evaluate(
        """() => { const s=document.querySelector('section[aria-label*="two drops"]')
            || [...document.querySelectorAll('section')].find(x=>(x.getAttribute('aria-label')||'').includes('two drops'));
            return s?{top:s.offsetTop,height:s.offsetHeight,vh:window.innerHeight}:null }"""
    )
    span = box["height"] - box["vh"]
    page.evaluate(f"window.scrollTo(0,{box['top'] + 0.42 * span})")  # below 0.48 → burst NOT armed
    page.wait_for_timeout(7000)  # models load + settle
    page.evaluate(f"window.scrollTo(0,{box['top'] + 0.52 * span})")  # cross 0.48 → arms .burst
    page.wait_for_timeout(grab_ms)  # grab mid-animation
    page.screenshot(path="/tmp/finale_burst.png")
    has = page.evaluate("() => !!document.querySelector('.meet-burst.burst')")
    print(f"/tmp/finale_burst.png  burst-class-active={has}  grab_ms={grab_ms}")
    browser.close()
