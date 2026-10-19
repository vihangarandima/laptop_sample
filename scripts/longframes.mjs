// Records long animation frames (LoAF) while wheel-scrolling a range of the story, with script attribution.
// Usage: node scripts/longframes.mjs [baseUrl] [fromChapter] [ticks]
import { chromium } from 'playwright'
const [base = 'http://localhost:3000/', from = 'teardown', ticks = '60'] = process.argv.slice(2)
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto(`${base}?qa=1&quality=high&auto=0&${process.env.QS ?? ''}`, { waitUntil: 'networkidle' })
await p.waitForFunction(() => window.__sceneReady === true, null, { timeout: 90000 })
if (process.env.NOBLUR) await p.addStyleTag({ content: '.panel{backdrop-filter:none!important}' })
await p.evaluate((id) => window.__jumpTo(id, 0.9), from)
await p.waitForTimeout(1200)
await p.evaluate(() => {
  window.__loaf = []
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (e.duration < 60) continue
      window.__loaf.push({
        dur: Math.round(e.duration),
        block: Math.round(e.blockingDuration),
        render: Math.round(e.renderStart ? e.startTime + e.duration - e.renderStart : 0),
        style: Math.round(e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0),
        chapter: document.querySelector('section[data-active]')?.id,
        scripts: e.scripts.map((s) => `${s.invokerType}:${s.invoker} ${Math.round(s.duration)}ms fwd=${Math.round(s.forcedStyleAndLayoutDuration)} ${s.sourceFunctionName}@${(s.sourceURL || '').split('/').pop()}:${s.sourceCharPosition}`).slice(0, 3),
      })
    }
  }).observe({ type: 'long-animation-frame', buffered: false })
})
await p.mouse.move(700, 400)
for (let i = 0; i < Number(ticks); i++) { await p.mouse.wheel(0, 140); await p.waitForTimeout(70) }
await p.waitForTimeout(800)
console.log(JSON.stringify(await p.evaluate(() => window.__loaf), null, 1))
await b.close()
