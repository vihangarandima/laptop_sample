---
name: webgl-performance
description: Use when deciding performance budgets, choosing/adjusting quality tiers (high/medium/low), measuring frame rate and draw calls, lazy-loading the 3D scene, pausing rendering, or checking memory and disposal in the R3F scene.
---

# WebGL performance

## Budgets (targets: 60 fps mid laptop, ≥30 fps mid Android)
| | high | medium | low |
|---|---|---|---|
| max DPR | 2 | 1.5 | 1 (phones: 1.25 cap max) |
| draw calls | < 120 | < 90 | < 70 |
| triangles | < 400k | < 200k | < 100k |
| post | Bloom + DoF + MSAA 4 | Bloom + MSAA 2 (never 0 with a composer) | none (gl antialias) |
| contact shadows | 512, every frame | 256, every frame | 256, baked `frames={1}` |
| rounded-geo segments | 4 | 3 | 2 |
| screen texture | 1024×640 @30 Hz | 1024×640 @20 Hz | 512×320 @15 Hz |

Read live numbers from `gl.info.render.calls / .triangles` and `gl.info.memory.geometries / .textures` (dev overlay, `?debug`).

## Pick a tier at start (no benchmarking delay)
```ts
function detectTier(): Tier {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const mobile = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 768
  const cores = nav.hardwareConcurrency ?? 4, mem = nav.deviceMemory ?? 4
  const gpu = getGpuName()   // WEBGL_debug_renderer_info → UNMASKED_RENDERER_WEBGL, may be blocked → ''
  const weakGpu = /(mali-4|mali-t|adreno \(tm\) [345]\d\d|powervr|intel\(r\) (hd|uhd) graphics [56]\d\d|swiftshader|llvmpipe)/i.test(gpu)
  if (weakGpu || mem <= 2 || cores <= 2) return 'low'
  if (mobile || mem <= 4 || cores <= 4) return 'medium'
  return 'high'
}
```
`?quality=high|medium|low` overrides for QA. SwiftShader/llvmpipe (software GL, also headless Chrome) → low.

Integrated laptop GPUs (Intel non-Arc, AMD APUs) start on **medium** — high caused intermittent GPU stalls on Iris Xe.

## Drop a tier when fps sags (drei PerformanceMonitor)
Mount it only after the scene is ready, use `bounds={(r) => r > 90 ? [45, 90] : [38, 60]} ms={500} threshold={0.8}`,
and give `drop()` a ~6 s cooldown — a drop remounts post (slow frames) and otherwise cascades to low. Details: [lessons.md](lessons.md).
```tsx
<PerformanceMonitor ms={250} iterations={10} threshold={0.75} flipflops={3}
  onDecline={() => quality.getState().drop()}
  onFallback={() => quality.getState().set('low')} />
```
Only ever *drop* automatically (never climb back up mid-visit — flip-flopping is visible). Remounting the EffectComposer on a tier change is acceptable (one-time cost); geometry detail changes are not worth remounting — keep the start tier's geometry.

## Load fast
- Canvas via `next/dynamic(() => import('./Experience'), { ssr:false })` from a client component, started after first paint (`requestIdleCallback` / after preloader begins). LCP must be HTML text, not the canvas.
- No network assets for 3D at all (procedural model, local Lightformer env) → the "loading progress" is shader compile + texture painting. Pre-compile: `await gl.compileAsync(scene, camera)` (three ≥ r158), then reveal. **compile skips invisible objects** — keep anything that appears later `visible` until ready.
  **With post-processing, compile the render-target variant**: the scene is drawn into a linear RT without tone mapping, which is a *different program* from drawing to the canvas. Bind an RT around the synchronous part of `compileAsync`:
  ```ts
  const rt = post ? new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }) : null
  if (rt) gl.setRenderTarget(rt)
  const compiling = gl.compileAsync(scene, camera)   // compile() runs now; readiness polling is async
  if (rt) gl.setRenderTarget(null)
  await compiling; rt?.dispose()
  ```
  And keep `<Canvas frameloop="never">` until it resolves — rendering while KHR_parallel_shader_compile is still busy blocks the first frame on every program. Measured: first-frame long task 1000 ms → 211 ms; boot hidden at 1.16 s, scene ready 1.41 s (Iris Xe, cold). Gate the preloader's progress on real steps: fonts → JS chunk → scene built → compile done.
- Fonts via `next/font` (self-hosted, `display: swap`), preload only display + body.

## Keep frames cheap
- Instancing for keys/chips/caps (see procedural-modeling). Share materials (module-level singletons).
- No allocations in `useFrame`. No React state per frame.
- CanvasTexture: upload only when changed; throttle. Use a CPU-backed canvas (`getContext('2d', { willReadFrequently: true })`) — uploading a GPU canvas forces a readback. Never `drawImage` a canvas onto itself (full snapshot each call).
- Avoid `transparent` on large surfaces (sorting + overdraw). Glass = one thin plane.
- Turn off `castShadow`/`receiveShadow` (we use ContactShadows).
- `frustumCulled` stays on; call `computeBoundingSphere()` for instanced meshes.

## Pause
- Hidden tab: `document.visibilitychange` → `setFrameloop('never')`, `gsap.ticker.sleep()`; resume with `'always'` and `gsap.ticker.wake()`.
- Story scrolled past the 3D (e.g., long catalogue grid fully covering it)? Keep rendering at low cost: canvas covered by an opaque panel → set frameloop `'demand'` and invalidate on change.

## Memory / disposal
Manually created textures/geometries/render targets: dispose in effect cleanup. Check `gl.info.memory` stays flat when scrolling top→bottom→top twice.

## Measured baseline (prototype, Intel Iris Xe, 1440x900, DPR 1, headless D3D11)
Full pipeline (env + ContactShadows 512 live + Bloom + DoF + MSAA 4 + AGX): **60 fps idle and while wheel-scrolling, p95 frame 16.8 ms.** The headroom goes into model complexity, so re-measure after the real laptop is built.

## Measuring
On this Windows machine headless Chromium gets the real GPU with `--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist` (renderer reports Intel Iris Xe). SwiftShader is too slow for the full pipeline: screenshots time out. **Drive scrolling with `page.mouse.wheel`, never `setInterval(scrollBy)`.** Programmatic scrollBy fights Lenis and showed 13 fps (and 0.3 fps) for a scene that really runs at 60.

Sources: R3F scaling-performance https://r3f.docs.pmnd.rs/advanced/scaling-performance · drei PerformanceMonitor https://drei.docs.pmnd.rs/performances/performance-monitor · three.js dispose manual https://github.com/mrdoob/three.js/blob/dev/manual/pages/how-to-dispose-of-objects.html · Ridgeline case study (compileAsync, frozen shadows, no MSAA on post): https://tympanus.net/codrops/2026/07/22/building-ridgeline-engineering-a-real-time-3d-experience-in-webflow (403 to fetch; summary via daily.dev)
