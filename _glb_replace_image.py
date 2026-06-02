import struct, json, sys

# Replace the first embedded image in a GLB WITHOUT touching mesh data: append the new
# image bytes to the end of the BIN (4-byte aligned) and repoint image bufferView[0] to
# it. All other bufferViews (incl. meshopt-compressed mesh) keep their original offsets,
# so meshopt stays valid. Old image bytes are orphaned (~95KB; negligible).
glb_in, img_path, glb_out = sys.argv[1], sys.argv[2], sys.argv[3]
data = open(glb_in, "rb").read()
magic, version, total = struct.unpack("<III", data[:12])
assert magic == 0x46546C67, "not a GLB"
off, json_chunk, bin_chunk = 12, None, None
while off < total:
    clen, ctype = struct.unpack("<II", data[off:off+8])
    cdata = data[off+8:off+8+clen]
    if ctype == 0x4E4F534A: json_chunk = cdata
    elif ctype == 0x004E4942: bin_chunk = cdata
    off += 8 + clen
gltf = json.loads(json_chunk.decode("utf-8"))
print("buffers:", len(gltf["buffers"]), "bufferViews:", len(gltf["bufferViews"]), "images:", len(gltf["images"]))
newimg = open(img_path, "rb").read()
pad4 = lambda n: (4 - (n % 4)) % 4

bin_arr = bytearray(bin_chunk)
bin_arr += b"\x00" * pad4(len(bin_arr))
img_offset = len(bin_arr)
bin_arr += newimg
bin_arr += b"\x00" * pad4(len(bin_arr))

iv = gltf["images"][0]["bufferView"]
bv = gltf["bufferViews"][iv]
print("old image bufferView:", {"o": bv.get("byteOffset", 0), "l": bv["byteLength"]}, "-> new:", {"o": img_offset, "l": len(newimg)})
bv["byteOffset"] = img_offset
bv["byteLength"] = len(newimg)
gltf["buffers"][0]["byteLength"] = len(bin_arr)

new_json = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
new_json += b" " * pad4(len(new_json))
out = bytearray()
out += struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(new_json) + 8 + len(bin_arr))
out += struct.pack("<II", len(new_json), 0x4E4F534A) + new_json
out += struct.pack("<II", len(bin_arr), 0x004E4942) + bytes(bin_arr)
open(glb_out, "wb").write(out)
print("wrote", glb_out, len(out), "bytes")
