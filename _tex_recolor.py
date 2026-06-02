import sys, numpy as np
from PIL import Image

# Recolor the A.E.1's neon-lime accents → a muted olive/khaki (premium; ties to the
# olive tree + warm lounge). Targets only saturated bright green pixels; preserves the
# dark navy-teal body + the baked shading (keeps relative Value).
src = sys.argv[1]; out = sys.argv[2]
im = Image.open(src).convert("RGB")
hsv = np.asarray(im.convert("HSV")).astype(np.float32)
H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
# PIL hue 0-255 ↔ 0-360°. lime/green ≈ 57-85 (80-120°); teal body ≈ 127-142 (180-200°).
mask = (H >= 42) & (H <= 108) & (S >= 80) & (V >= 65)
print(f"green px: {int(mask.sum())} / {H.size} ({100*mask.sum()/H.size:.2f}%)")
S[mask] = np.minimum(S[mask] * 0.6, 120)  # muted but still a real olive (not grey)
V[mask] = V[mask] * 0.6                    # DEEPEN so it stays olive under the hero key (not pale)
H[mask] = 50                               # olive/khaki hue (~70°)
hsv2 = np.stack([H, S, V], -1).clip(0, 255).astype(np.uint8)
rgb = Image.fromarray(hsv2, "HSV").convert("RGB")
rgb.save(out, "WEBP", quality=92, method=6)
rgb.save(out.rsplit(".", 1)[0] + ".png")
print("saved", out, "and .png preview")
