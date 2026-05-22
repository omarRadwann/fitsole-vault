// Rasterize the cream brand SVGs to padded transparent PNGs for use as
// emissive textures on the 3D brand-corridor signs. Run from project root:
//   node scripts/rasterize-logos.cjs
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const dir = path.join(__dirname, '..', 'public', 'brand-logos')
const logos = ['nike', 'adidas', 'puma', 'on']

;(async () => {
  for (const name of logos) {
    const svgPath = path.join(dir, `${name}.svg`)
    const outPath = path.join(dir, `${name}.png`)
    const svg = fs.readFileSync(svgPath)
    // Oversample (high density) then fit into 420px and pad to 512 so the
    // mark sits inside a margin on the sign panel. Transparent background.
    await sharp(svg, { density: 2400 })
      .resize(420, 420, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({ top: 46, bottom: 46, left: 46, right: 46, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outPath)
    const { size } = fs.statSync(outPath)
    console.log(`wrote ${name}.png (${size} bytes)`)
  }
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
