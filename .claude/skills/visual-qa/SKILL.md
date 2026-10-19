---
name: visual-qa
description: Use when checking the site visually — screenshotting each chapter at its scroll position on desktop and phone sizes with headless Playwright, measuring frame rate, testing reduced-motion and no-WebGL modes, and judging framing, legibility and overlap.
---

# Visual QA

## Tooling
Playwright (`npx playwright` 1.63 available). Script lives in `scripts/qa-shots.mjs`; output to a gitignored `qa/` folder.

```js
import { chromium } from 'playwright'
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] }) // real GPU (tested, Windows)
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
await page.goto(url + '?quality=medium&qa=1', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__sceneReady === true, null, { timeout: 60_000 })
for (const id of chapters) {
  await page.evaluate((id) => window.__jumpTo(id), id)     // instant scroll to chapter hold point
  await page.waitForTimeout(700)                           // let damping settle
  await page.screenshot({ path: `qa/${vp}-${id}.png` })
}
```
- Expose `window.__jumpTo(id, at=0.5)` and `window.__sceneReady` **only when `?qa=1`**. Jumping must be instant (`lenis.scrollTo(y, { immediate:true })`) and then the scrub settles.
- Phone: `{ viewport:{ width:390, height:844 }, deviceScaleFactor:2, isMobile:true, hasTouch:true }`.
- Reduced motion: `browser.newContext({ reducedMotion:'reduce' })`.
- No WebGL: launch with `--disable-webgl --disable-3d-apis` (or page `?nowebgl=1` override).
- Use GPU flags. SwiftShader (`--use-angle=swiftshader --enable-unsafe-swiftshader`) is only for machines without a GPU: it is slow enough that `page.screenshot` times out (30 s) on a scene with post-processing, so pass `?quality=low` with it.
- `__jumpTo` must call `lenis.scrollTo(y, { immediate: true, force: true })`. Without `force`, Lenis ignores scrollTo while stopped.

## FPS probe (relative only in headless)
```js
const fps = await page.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now()
  const f = () => { n++; performance.now() - t0 < 3000 ? requestAnimationFrame(f) : r(n / 3) }; requestAnimationFrame(f) }))
```
Start the probe (don't await it), then scroll with real input: `for (...) { await page.mouse.wheel(0, 120); await page.waitForTimeout(60) }`, then await. **Do not** scroll with `setInterval(scrollBy)`: it fights Lenis and reports nonsense (13 fps for a real 60). Report fps and p95 frame time.

## Reversibility check (tested)
Jump to a position, shoot A; jump to the end; jump back, shoot B; pixel-diff A and B with PIL `ImageChops.difference`. Max channel diff <= ~10 is noise (bloom/dither); anything larger means a non-deterministic tween or damping that never settles.

## Contact sheets
Downscale all shots of one viewport into one strip (`scripts/sheet.py`) so you can check continuity in one image. Shots sort alphabetically, so prefix them with the chapter index (`03-teardown-0.50.png`).

## What to look at in every screenshot (then actually open the PNGs)
1. **Framing**: subject fully in frame, not touching edges, consistent visual weight; on phone the laptop is in the top half and copy below.
2. **Overlap**: no 3D part behind body text without a scrim; leader line endpoints land on the part and the text block.
3. **Legibility**: headline readable at a glance; body ≥ 16px phone; contrast holds over bright parts (screen glow).
4. **Exploded view**: every part separated (no interpenetration), recognisable silhouette, order matches the copy.
5. **Continuity**: compare adjacent chapter shots — pose at the end of chapter N ≈ start of N+1 (no pops). Also take shots at chapter boundaries ±2% to catch jumps.
6. **Colour discipline**: warning colour only in fault/diagnosis shots.
7. **Fallbacks**: no-WebGL and reduced-motion pages show complete content, no empty hero.

## Judging
Write down for each shot: OK / issue + fix. Fix the worst issue first, re-shoot only affected chapters, repeat. Teardown and service stops get the most passes.

## Project scripts (KERNEL)
`scripts/qa-shots.mjs [--vp=desktop|phone] [--only=a,b] [--q=high]` → `qa/<vp>/NN-chapter-at.png`; `python scripts/sheet.py qa/desktop 5` contact sheet; `scripts/e2e.mjs` (booking, tracker, catalogue, 3D hover/click, keyboard); `scripts/modes.mjs`; perf: `perf.mjs`, `profile.mjs`, `cpuprofile.mjs`, `longframes.mjs`.

## Gotchas hit
- Shell: never put `&` in an unquoted CLI argument (`--extra=&x=1` backgrounded the command). Quote it.
- Shoot short chapters at their midpoint (0.5) — that's where pin-duration bugs show.
- Shots at chapter boundaries (0.97–0.99) legitimately show hand-offs; judge pacing there, not legibility.
- Measure fps on `next build && next start`, not dev.
