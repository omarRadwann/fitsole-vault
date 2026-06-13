// Dev-only verification: drive a real Chrome (software WebGL = the INTEGRATED code path) against a
// STATIC `out/` build served on :4000 (next dev is barred on this machine — it OOM-freezes the OS).
// Captures the vault beats via window.__vaultForce so the black-void fix + no-regression can be
// eyeballed. NOT part of the app/build. Usage: node scripts/_shot_verify.mjs [outDir] [tier] [port]
import { chromium } from 'playwright'
import fs from 'fs'

const OUT = process.argv[2] || '.shots-verify'
const TIER = process.argv[3] || 'standard'
const PORT = process.argv[4] || '4000'
fs.mkdirSync(OUT, { recursive: true })

const BEATS = [
  { name: '1-entrance', p: 0.06 },
  { name: '2-hero', p: 0.42 },
  { name: '3-drop', p: 0.58 }, // ← the black-void check: centre must NOT be a dark hole
  { name: '4-auth', p: 0.72 },
  { name: '5-exit', p: 0.97 },
]

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--disable-dev-shm-usage',
  ],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)) })
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 200)))

await page.goto(`http://localhost:${PORT}/?tier=${TIER}&debug=1`, { waitUntil: 'load', timeout: 90000 })
await page.waitForTimeout(11000) // preloader clear + assets + first (slow) software frames

for (const b of BEATS) {
  await page.evaluate((p) => { window.__vaultForce = p }, b.p)
  await page.waitForTimeout(5000) // camera lerp + slow software render to settle
  await page.screenshot({ path: `${OUT}/${TIER}-${b.name}.png` })
  console.log('shot', `${TIER}-${b.name}`, '@p=' + b.p)
}
await page.evaluate(() => { try { delete window.__vaultForce } catch {} })
console.log('CONSOLE_ERRORS:', errs.length ? errs.slice(0, 8).join(' || ') : 'none')
await browser.close()
console.log('DONE tier=' + TIER + ' port=' + PORT)
