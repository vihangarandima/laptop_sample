// CPU profile from navigation to scene-ready; prints top self-time functions + long tasks.
import { chromium } from 'playwright'
const base = process.argv[2] ?? 'http://localhost:3000/'
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const cdp = await p.context().newCDPSession(p)
await cdp.send('Profiler.enable')
await cdp.send('Profiler.setSamplingInterval', { interval: 250 })
await cdp.send('Profiler.start')
await p.addInitScript(() => { window.__lt = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true }) })
await p.goto(`${base}?qa=1&${process.env.QS ?? ""}`, { waitUntil: "load" })
await p.waitForFunction(() => window.__sceneReady === true, null, { timeout: 60000 })
const { profile } = await cdp.send('Profiler.stop')
const self = new Map(); const byId = new Map(profile.nodes.map((n) => [n.id, n]))
profile.samples.forEach((id, i) => { const n = byId.get(id); const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber}`; self.set(k, (self.get(k) ?? 0) + (profile.timeDeltas[i] ?? 0) / 1000) })
for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16)) console.log(v.toFixed(0).padStart(6), 'ms ', k)
console.log('long tasks [start, dur]:', JSON.stringify(await p.evaluate(() => window.__lt)))
await b.close()
