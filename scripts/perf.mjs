// Frame-rate probe: wheel-scrolls through the whole story (real input, so Lenis is exercised)
// and reports fps + p95 frame time per segment, draw calls, triangles and GPU memory.
// Usage: node scripts/perf.mjs [baseUrl] [--q=high] [--phone] [--cpu=4]
//   --phone  390×844 @2x touch viewport;  --cpu=N  CDP CPU throttling (approximates a mid-range phone CPU)
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const base = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:3000/'
const q = args.find((a) => a.startsWith('--q='))?.split('=')[1]
const phone = args.includes('--phone')
const cpu = Number(args.find((a) => a.startsWith('--cpu='))?.split('=')[1] ?? 1)

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const ctx = await browser.newContext(
  phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } },
)
const page = await ctx.newPage()
if (cpu > 1) {
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
}
await page.goto(`${base}?qa=1${q ? `&quality=${q}` : ''}`, { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__sceneReady === true, null, { timeout: 120_000 })
await page.waitForTimeout(1000)
console.log('renderer:', await page.evaluate(() => window.__glInfo?.()))

await page.mouse.move(700, 400)
const segments = []
const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
let worst = { calls: 0, triangles: 0 }
while ((await page.evaluate(() => scrollY)) < total - 50) {
  const probe = page.evaluate(
    () =>
      new Promise((r) => {
        const ts = []
        const t0 = performance.now()
        const f = (t) => {
          ts.push(t)
          if (performance.now() - t0 < 2000) requestAnimationFrame(f)
          else r(ts)
        }
        requestAnimationFrame(f)
      }),
  )
  if (phone) {
    // touch devices: native scroll (Lenis syncTouch is off on touch)
    for (let i = 0; i < 25; i++) {
      await page.evaluate(() => window.scrollBy(0, 60))
      await page.waitForTimeout(70)
    }
  } else {
    for (let i = 0; i < 25; i++) {
      await page.mouse.wheel(0, 140)
      await page.waitForTimeout(70)
    }
  }
  const ts = await probe
  const d = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b)
  const info = await page.evaluate(() => ({ ...window.__glInfo?.(), chapter: document.querySelector('section[data-active]')?.id }))
  worst = { calls: Math.max(worst.calls, info.calls ?? 0), triangles: Math.max(worst.triangles, info.triangles ?? 0) }
  segments.push({ chapter: info.chapter, fps: +(ts.length / 2).toFixed(1), p95: +d[Math.floor(d.length * 0.95)].toFixed(1), calls: info.calls, tier: info.tier })
}
console.table(segments)
const fpsAll = segments.map((s) => s.fps)
console.log('min fps', Math.min(...fpsAll), '| median fps', fpsAll.sort((a, b) => a - b)[Math.floor(fpsAll.length / 2)], '| worst draw calls', worst.calls, '| worst triangles', worst.triangles)
console.log('final:', await page.evaluate(() => window.__glInfo?.()))
await browser.close()
