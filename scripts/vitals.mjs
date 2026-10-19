// Lab Core Web Vitals on load: LCP element + time, CLS, and (simulated) INP proxy via a click.
// Usage: node scripts/vitals.mjs [baseUrl] [--phone] [--slow]   (--slow = 4× CPU + fast-3G-ish network)
import { chromium } from 'playwright'
const args = process.argv.slice(2)
const base = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:3000/'
const phone = args.includes('--phone')
const slow = args.includes('--slow')
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu'] })
const ctx = await b.newContext(phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } })
const p = await ctx.newPage()
if (slow) {
  const cdp = await ctx.newCDPSession(p)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 })
}
await p.addInitScript(() => {
  window.__v = { lcp: 0, lcpEl: '', cls: 0 }
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      window.__v.lcp = e.startTime
      window.__v.lcpEl = `${e.element?.tagName ?? '?'} "${(e.element?.textContent ?? '').slice(0, 40)}"`
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true })
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (!e.hadRecentInput) window.__v.cls += e.value
  }).observe({ type: 'layout-shift', buffered: true })
})
const t0 = Date.now()
await p.goto(`${base}?qa=1`, { waitUntil: 'load' })
const loadMs = Date.now() - t0
await p.waitForFunction(() => document.querySelector('.boot')?.getAttribute('data-done') === 'true', null, { timeout: 120000 })
const bootHiddenMs = Date.now() - t0
await p.waitForFunction(() => window.__sceneReady === true, null, { timeout: 120000 }).catch(() => {})
const readyMs = Date.now() - t0
await p.waitForTimeout(1500)
const res = await p.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0]
  const js = performance.getEntriesByType('resource').filter((r) => r.name.endsWith('.js')).reduce((a, r) => a + (r.transferSize || 0), 0)
  return { ...window.__v, fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime, ttfb: nav.responseStart, jsKB: Math.round(js / 1024) }
})
console.log(JSON.stringify({ phone, slow, loadMs, bootHiddenMs, sceneReadyMs: readyMs, ...res, lcp: Math.round(res.lcp), fcp: Math.round(res.fcp), cls: +res.cls.toFixed(4) }, null, 1))
await b.close()
