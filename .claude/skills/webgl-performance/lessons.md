# Lessons from the KERNEL build (measured, Intel Iris Xe, production build)

## Diagnosis workflow that worked
1. `scripts/perf.mjs` — wheel-scroll the whole story, fps + p95 per segment. Find *where*.
2. `scripts/profile.mjs <chapter> <at>` — idle fps at one spot for feature-switch combos
   (`?qa=1&auto=0&dof=0&msaa=0&bloom=0&post=0&shadows=baked&dpr=1`). Find *what* (GPU feature vs not).
3. `scripts/cpuprofile.mjs` — CDP Profiler self-time. Find the *function*.
4. `scripts/longframes.mjs` — Long Animation Frame entries with script attribution.
   **A long frame with no scripts, ~0 blocking and ~8 ms render is GPU/compositor time**, not JS.

## Real problems found, and fixes
| Symptom | Cause | Fix |
|---|---|---|
| Fault chapter 28 fps regardless of post/shadows | Screen glitch did `drawImage(canvas → same canvas)` ×20 per frame: each self-draw snapshots the whole canvas (1.5 s of every 3 s in `drawImage`) | Render the clean frame once into an offscreen canvas; build glitch frames by copying slices *from it* |
| 80–110 ms spikes per screen repaint | Uploading a GPU-accelerated 2D canvas to WebGL forces a GPU readback | `getContext('2d', { willReadFrequently: true })` (CPU-backed canvas → upload is a memcpy) |
| 14 fps the first time the shelf appears | `renderer.compile/compileAsync` skips invisible objects; hidden shelf compiled mid-scroll | Keep late-appearing groups `visible` until `ready`, then let the frame loop hide them |
| high → medium → low within seconds | Each tier drop remounts EffectComposer (shader compile = more slow frames = next drop) | 6 s cooldown between tier changes; start PerformanceMonitor only after ready |
| Tier drop at ~60 fps averages | drei default bounds decline below 50 fps; a few transition hitches suffice | `bounds={(r) => r > 90 ? [45, 90] : [38, 60]}`, `ms={500}`, `threshold={0.8}` |
| Intermittent 300–1000 ms GPU stalls in close-ups, only with DoF + MSAA4 + bloom + live shadows | Integrated GPU over budget during transitions (idle was 60) | Integrated GPUs (Intel non-Arc, AMD APU) start on **medium** |
| No anti-aliasing on medium | `msaa: 0` with a composer: canvas `antialias` doesn't reach the composer's render target | Keep `multisampling ≥ 2` whenever post is on |
| ~1 s long task on the first rendered frame (cold load) | compileAsync compiled canvas variants (sRGB + AgX); the composer draws into a linear RT with NoToneMapping → every scene material recompiled synchronously | Bind a render target during `compileAsync`; hold `frameloop="never"` until compile resolves |
| Boot screen couldn't hide on time | Timers can't fire during main-thread long tasks | Remove the long tasks (above); cap the boot at 1.0 s from navigation start, not from hydration |
| `gl.info.render.calls` = 1 | With a composer, info resets per pass; you see the last full-screen pass | Read draw calls on a tier without post (low: 60 calls, 75k tris) |

## Final numbers (production build, auto tier)
- Desktop 1440×900, Iris Xe → medium: **55–60.5 fps across the story**, no tier drops.
- Phone 390×844 @2x, medium tier, CDP CPU throttle ×4: **min 40.5, median 50.5 fps**. (GPU not emulated — real phones need a device test.)
- Low tier: 60 draw calls, 65–75k triangles.
