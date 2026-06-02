import sys
from playwright.sync_api import sync_playwright

# Capture the VAULT (top of page) at a pinned beat. Usage:
#   python _capture_vault.py <label> [tier] [force]
# tier forces ?tier= (readForcedTier); force pins window.__vaultForce (0..1 beat).
label = sys.argv[1] if len(sys.argv) > 1 else "vault"
tier = sys.argv[2] if len(sys.argv) > 2 else "standard"
force = sys.argv[3] if len(sys.argv) > 3 else "0.46"

with sync_playwright() as pw:
    browser = pw.chromium.launch(
        headless=True,
        args=["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
    )
    page = browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1, reduced_motion="no-preference")
    msgs = []
    page.on("console", lambda m: msgs.append(f"{m.type}: {m.text}") if m.type in ("error",) else None)
    page.on("pageerror", lambda e: msgs.append(f"pageerror: {e}"))
    page.goto(f"http://localhost:3000/?tier={tier}", wait_until="load")
    page.wait_for_timeout(1500)
    page.evaluate(f"window.__vaultForce = {force}")
    page.wait_for_timeout(9000)  # hero GLB (1.5MB) + env bake + settle under software WebGL
    info = page.evaluate(
        "() => ({canvas: !!document.querySelector('canvas'), w: document.querySelector('canvas')?.width, force: window.__vaultForce, dpr: window.devicePixelRatio})"
    )
    out = f"/tmp/vault_{label}.png"
    page.screenshot(path=out)
    print(f"{out}  info={info}")
    print("ERRORS:", msgs[:15] if msgs else "none")
    browser.close()
