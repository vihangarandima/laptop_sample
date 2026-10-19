// Visual QA: screenshots each chapter at chosen scroll positions on desktop and phone.
// Usage: node scripts/qa-shots.mjs [baseUrl] [--only=teardown,svc-battery] [--vp=desktop|phone] [--q=high]
// Output: qa/<viewport>/<index>-<chapter>-<at>.png  (+ console errors in qa/<viewport>/console.txt)
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const base = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:3000/'
const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]
const only = opt('only')?.split(',')
const vpOnly = opt('vp')
const q = opt('q') ?? ''
const extra = opt('extra') ?? ''

const SHOTS = [
  ['machine', [0.02, 0.5, 0.9]],
  ['fault', [0.4, 0.75]],
  ['teardown', [0.3, 0.5, 0.7, 0.98]],
  ['svc-battery', [0.5]],
  ['svc-storage', [0.5]],
  ['svc-thermal', [0.5]],
  ['svc-board', [0.5]],
  ['svc-input', [0.5]],
  ['svc-display', [0.5]],
  ['diagnosis', [0.3, 0.65, 0.95]],
  ['reassembly', [0.3, 0.55, 0.8, 0.99]],
  ['shelf', [0.15, 0.45]],
  ['track', [0.3]],
  ['book', [0.2]],
  ['find-us', [0.4, 0.99]],
]

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
}

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
for (const [name, ctxOpts] of Object.entries(VIEWPORTS)) {
  if (vpOnly && vpOnly !== name) continue
  const dir = `qa/${name}`
  mkdirSync(dir, { recursive: true })
  const ctx = await browser.newContext(ctxOpts)
  const page = await ctx.newPage()
  const logs = []
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(`[${m.type()}] ${m.text()}`))
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
  await page.goto(`${base}?qa=1${q ? `&quality=${q}` : ''}${extra}`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__sceneReady === true, null, { timeout: 90_000 })
  let i = 0
  for (const [id, ats] of SHOTS) {
    i++
    if (only && !only.includes(id)) continue
    for (const at of ats) {
      await page.evaluate(([id, at]) => window.__jumpTo(id, at), [id, at])
      await page.waitForTimeout(900)
      await page.screenshot({ path: `${dir}/${String(i).padStart(2, '0')}-${id}-${at.toFixed(2)}.png` })
    }
  }
  writeFileSync(`${dir}/console.txt`, logs.join('\n'))
  console.log(name, 'done;', logs.length, 'console warnings/errors')
  await ctx.close()
}
await browser.close()
