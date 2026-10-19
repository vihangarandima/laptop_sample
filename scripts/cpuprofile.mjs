// CPU profile (CDP) while idling at a chapter; prints the top self-time functions.
// Usage: node scripts/cpuprofile.mjs [baseUrl] [chapter] [at] [extraQuery]
import { chromium } from 'playwright'
const [base = 'http://localhost:3000/', chapter = 'fault', at = '0.5', extra = ''] = process.argv.slice(2)
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto(`${base}?qa=1&quality=high&auto=0&${extra}`, { waitUntil: 'networkidle' })
await p.waitForFunction(() => window.__sceneReady === true, null, { timeout: 90000 })
await p.evaluate(([id, a]) => window.__jumpTo(id, Number(a)), [chapter, at])
await p.waitForTimeout(1500)
const cdp = await p.context().newCDPSession(p)
await cdp.send('Profiler.enable')
await cdp.send('Profiler.setSamplingInterval', { interval: 200 })
await cdp.send('Profiler.start')
await p.waitForTimeout(3000)
const { profile } = await cdp.send('Profiler.stop')
const self = new Map()
const dt = profile.timeDeltas
const byId = new Map(profile.nodes.map((n) => [n.id, n]))
profile.samples.forEach((id, i) => {
  const n = byId.get(id)
  const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber}`
  self.set(k, (self.get(k) ?? 0) + (dt[i] ?? 0) / 1000)
})
const total = [...self.values()].reduce((a, b) => a + b, 0)
console.log('total ms', total.toFixed(0))
for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(v.toFixed(0).padStart(6), 'ms ', k)
await b.close()
