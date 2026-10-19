// Idle fps at a fixed chapter for a list of feature-switch combos (QA overrides). Auto tier drop disabled.
// Usage: node scripts/profile.mjs [baseUrl] [chapter] [at]
import { chromium } from 'playwright'
const [base = 'http://localhost:3000/', chapter = 'fault', at = '0.5'] = process.argv.slice(2)
const combos = ['', 'dof=0', 'dof=0&msaa=0', 'dof=0&msaa=0&shadows=baked', 'post=0', 'post=0&shadows=baked', 'dof=0&shadows=baked']
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
for (const c of combos) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.goto(`${base}?qa=1&quality=high&auto=0&${c}`, { waitUntil: 'networkidle' })
  await p.waitForFunction(() => window.__sceneReady === true, null, { timeout: 90000 })
  await p.evaluate(([id, a]) => window.__jumpTo(id, Number(a)), [chapter, at])
  await p.waitForTimeout(1500)
  const ts = await p.evaluate(() => new Promise((r) => { const ts = []; const t0 = performance.now(); const f = (t) => { ts.push(t); if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(ts) }; requestAnimationFrame(f) }))
  const d = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b)
  console.log((c || 'high (all on)').padEnd(30), 'fps', (ts.length / 3).toFixed(1).padStart(5), ' p95', d[Math.floor(d.length * 0.95)].toFixed(1))
  await p.close()
}
await b.close()
