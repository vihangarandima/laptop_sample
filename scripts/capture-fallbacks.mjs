// Renders one still per chapter from the live 3D scene (HTML hidden) into public/fallback/<id>.jpg.
// These are shown when WebGL is unavailable, the scene fails, or JS is off.
// Usage: node scripts/capture-fallbacks.mjs [baseUrl]   (dev or prod server must be running)
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:3000/'
const STILLS = {
  machine: 0.9,
  fault: 0.55,
  teardown: 0.97,
  'svc-battery': 0.6,
  'svc-storage': 0.6,
  'svc-thermal': 0.6,
  'svc-board': 0.6,
  'svc-input': 0.6,
  'svc-display': 0.6,
  diagnosis: 0.95,
  reassembly: 0.99,
  shelf: 0.55,
  track: 0.5,
  book: 0.5,
  'find-us': 0.99,
}
mkdirSync('public/fallback', { recursive: true })
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
await page.goto(`${base}?qa=1&quality=high`, { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__sceneReady === true, null, { timeout: 90_000 })
await page.addStyleTag({ content: 'main, header, nav, .boot, a[href="#book"], svg, [class*="z-30"], [class*="z-[80]"] { visibility: hidden !important; } nextjs-portal { display: none !important; }' })
// a sample ticket on the tracker screen
await page.evaluate(() => window.__jumpTo('track', 0.5))
for (const [id, at] of Object.entries(STILLS)) {
  await page.evaluate(([id, at]) => window.__jumpTo(id, at), [id, at])
  await page.waitForTimeout(1100)
  await page.screenshot({ path: `public/fallback/${id}.jpg`, type: 'jpeg', quality: 78 })
  console.log('captured', id)
}
await browser.close()
