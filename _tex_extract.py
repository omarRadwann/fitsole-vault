import struct, json, sys, io
from PIL import Image

# Extract the first embedded image (baseColor) from a GLB and save as PNG to view.
glb = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else "C:/tmp/tex.png"
with open(glb, "rb") as f:
    data = f.read()
magic, version, length = struct.unpack("<III", data[:12])
off = 12
json_chunk = bin_chunk = None
while off < length:
    clen, ctype = struct.unpack("<II", data[off:off+8])
    cdata = data[off+8:off+8+clen]
    if ctype == 0x4E4F534A:   # JSON
        json_chunk = cdata
    elif ctype == 0x004E4942: # BIN
        bin_chunk = cdata
    off += 8 + clen
gltf = json.loads(json_chunk.decode("utf-8"))
img = gltf["images"][0]
print("image entry:", {k: img.get(k) for k in ("mimeType", "bufferView", "uri", "name")})
bv = gltf["bufferViews"][img["bufferView"]]
start = bv.get("byteOffset", 0)
ln = bv["byteLength"]
print("bufferView:", {"byteOffset": start, "byteLength": ln, "ext": bv.get("extensions")})
raw = bin_chunk[start:start+ln]
im = Image.open(io.BytesIO(raw))
print("decoded:", im.format, im.size, im.mode)
im.convert("RGB").save(out)
print("saved ->", out)
