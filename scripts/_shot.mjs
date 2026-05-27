// Dev-only: drive a real Chrome (software WebGL) to screenshot each vault beat,
// so the agent can self-verify the 3D look. Not part of the app/build.
import { chromium } from 'playwright'
import fs from 'fs'

const OUT = process.argv[2] || '.shots'
const TIER = process.argv[3] || 'standard'
fs.mkdirSync(OUT, { recursive: true })

const BEATS = [
  { name: '1-entrance', p: 0.06 },
  { name: '2-hero', p: 0.42 },
  { name: '3-drop', p: 0.58 },
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

await page.goto(`http://localhost:3000/?tier=${TIER}&debug=1`, { waitUntil: 'load', timeout: 90000 })
await page.waitForTimeout(11000) // preloader clear + assets + first (slow) software frames

for (const b of BEATS) {
  await page.evaluate((p) => { window.__vaultForce = p }, b.p)
  await page.waitForTimeout(5000) // camera lerp + slow software render to settle
  await page.screenshot({ path: `${OUT}/${b.name}.png` })
  console.log('shot', b.name, '@p=' + b.p)
}
await page.evaluate(() => { try { delete window.__vaultForce } catch {} })
console.log('CONSOLE_ERRORS:', errs.length ? errs.slice(0, 8).join(' || ') : 'none')
await browser.close()
console.log('DONE tier=' + TIER)
