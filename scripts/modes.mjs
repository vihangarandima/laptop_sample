// Checks the degraded modes: no WebGL, no JavaScript, reduced motion.
// Usage: node scripts/modes.mjs [baseUrl]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:3000/'
mkdirSync('qa/modes', { recursive: true })
const log = (...a) => console.log(...a)

// 1. WebGL really disabled in the browser
{
  const b = await chromium.launch({ args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(base, { waitUntil: 'networkidle' })
  const scene = await p.evaluate(() => document.documentElement.dataset.scene)
  const canvases = await p.locator('canvas').count()
  await p.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)) }
  })
  await p.waitForTimeout(500)
  const imgs = await p.evaluate(() => [...document.querySelectorAll('.scene-still img')].filter((i) => i.complete && i.naturalWidth > 0 && i.offsetParent).length)
  await p.screenshot({ path: 'qa/modes/nowebgl-full.png', fullPage: true })
  log('no-webgl: scene =', scene, '| canvases =', canvases, '| visible stills loaded =', imgs, '| errors =', errs.length, errs.join(' | ').slice(0, 300))
  await b.close()
}

// 2. JavaScript disabled
{
  const b = await chromium.launch()
  const ctx = await b.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  const p = await ctx.newPage()
  await p.goto(base, { waitUntil: 'networkidle' })
  const h = await p.locator('h1, h2').allTextContents()
  const bootVisible = await p.locator('.boot').isVisible()
  await p.screenshot({ path: 'qa/modes/nojs-top.png' })
  log('no-js: headings =', h.length, '| first =', JSON.stringify(h[0]), '| preloader visible =', bootVisible)
  await b.close()
}

// 3. Reduced motion: no smooth scroll, still frames per chapter
{
  const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu'] })
  const ctx = await b.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } })
  const p = await ctx.newPage()
  await p.goto(`${base}?qa=1`, { waitUntil: 'networkidle' })
  await p.waitForFunction(() => window.__sceneReady === true, null, { timeout: 90_000 })
  const scene = await p.evaluate(() => document.documentElement.dataset.scene)
  const lenis = await p.evaluate(() => document.documentElement.classList.contains('lenis'))
  for (const [id, at] of [['machine', 0.3], ['teardown', 0.3], ['svc-board', 0.2], ['diagnosis', 0.4]]) {
    await p.evaluate(([i, a]) => window.__jumpTo(i, a), [id, at])
    await p.waitForTimeout(700)
    await p.screenshot({ path: `qa/modes/reduced-${id}.png` })
  }
  log('reduced-motion: scene =', scene, '| lenis active =', lenis)
  await b.close()
}
