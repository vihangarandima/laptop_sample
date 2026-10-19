---
name: r3f-scene-architecture
description: Use when creating or changing how the React Three Fiber scene is organised inside the Next.js App Router app — mounting the Canvas, the render loop (useFrame), sharing scroll/selection state between HTML and 3D, events/raycasting through an HTML overlay, and the part registry the timeline addresses by name.
---

# R3F scene architecture (Next.js App Router)

Versions verified: next 16.3, react 19.3, three 0.186, @react-three/fiber 9.8 (peer: react >=19 <19.4), drei 10.7.

## Layout of responsibilities

```
app/page.tsx (Server Component)  -> real HTML for every chapter (SEO, a11y, no-JS)
  <SceneMount/> ('use client')    -> decides: WebGL? reduced motion? then next/dynamic(ssr:false)
     <Experience/>                -> <Canvas> + scene graph; never rendered on the server
  <Story/> ('use client')         -> ScrollTrigger + Lenis; writes progress into the store
lib/store.ts                      -> zustand vanilla store: React UI subscribes, useFrame reads getState()
lib/parts.ts                      -> registry: name -> Object3D (filled by model refs)
```

## Rules

1. **`ssr:false` only inside a client component.** Next 16 errors if `next/dynamic(..., { ssr:false })` is in a Server Component. Put it in `SceneMount.tsx` with `'use client'`.
2. **Never setState per frame.** Scroll progress, damped values, hover target: write to a mutable object/zustand store; read with `store.getState()` inside `useFrame`. React state only for things that change UI (active chapter, selected product), and only when they *change*.
3. **Mutate in `useFrame`, reuse scratch objects.** Allocate `Vector3`/`Quaternion`/`Color` once at module or `useMemo` scope. No `new` inside the loop.
4. **Frame-rate independent damping.** Use `THREE.MathUtils.damp(current, target, lambda, delta)` (or maath `easing.damp3`). Clamp `delta` (`Math.min(delta, 1/20)`) so a tab-switch doesn't teleport.
5. **Address parts by name.** Every animated object gets a stable `name` and registers itself (`registerPart(name, ref)`). The timeline never imports model components; swapping a `.glb` means registering the GLTF nodes under the same names.
6. **Don't conditionally mount heavy subtrees.** Toggle `visible` instead (pitfalls doc) — remounting recompiles shaders.
7. **Events through an HTML overlay.** The canvas is `position:fixed` behind the page with `pointer-events:none`. Pass `eventSource={document.body}` (or a wrapper element) and `eventPrefix="client"` so meshes still get hover/click while HTML stays on top. Keep raycast targets few: give each part a cheap invisible hit box (`<mesh visible={false}>` still raycasts? **No** — invisible meshes are skipped by R3F raycast). Use `material-transparent opacity={0}` + `depthWrite={false}`, or raycast against the part's group with `userData.hit`.
8. **Render priority.** Animation callbacks at default priority 0; when using EffectComposer it renders at priority 1 itself. Never write `useFrame(..., 1)` yourself unless you render manually.

## Store pattern (verified zustand 5)

```ts
// lib/store.ts
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
type S = { progress: number; chapter: string; hovered: string | null; setChapter(c: string): void }
export const story = createStore<S>()((set) => ({
  progress: 0, chapter: 'boot', hovered: null,
  setChapter: (chapter) => set((s) => (s.chapter === chapter ? s : { chapter })),
}))
export const useStory = <T,>(sel: (s: S) => T) => useStore(story, sel)
// per-frame values that React never needs: a plain mutable object
export const live = { progress: 0, pointer: { x: 0, y: 0 } }
```

## Canvas setup

```tsx
<Canvas
  dpr={[1, tier.maxDpr]} gl={{ antialias: !tier.post, powerPreference: 'high-performance', alpha: false }}
  camera={{ fov: 30, near: 0.1, far: 60, position: [0, 1.2, 9] }}
  eventSource={document.body} eventPrefix="client"
  frameloop="always" flat={false}
  onCreated={({ gl }) => gl.setClearColor('#0b0c0d')}
/>
```
`alpha:false` + explicit clear colour is cheaper than transparent canvas (three tips). Pass `antialias:false` when an EffectComposer with `multisampling` handles AA.

## Pause when hidden
rAF already stops in hidden tabs, but also stop GSAP/Lenis work: listen to `visibilitychange` and set `frameloop` via `useThree(s=>s.setFrameloop)('never' | 'always')`.

## Known console noise (harmless)
- `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` R3F 9.8 still uses Clock with three 0.186. Ignore it.
- D3D11 `warning X4122 ... cannot be represented accurately in double precision` from ANGLE shader compiles on Windows. Harmless.

## Verified in the prototype
- `ref={(o) => registerPart('x', o)}` callback refs work with React 19 (the callback returns void).
- `gl.compileAsync(scene, camera)` resolves in < 1 s for a small scene; use it as the "scene ready" gate (it skips invisible objects).
- Parts own their materials (clone per part at registration) so dim/glow per part is a plain uniform change, never a recompile.
- Under React StrictMode (dev), useGSAP + returned cleanup leaves exactly one Lenis instance and one canvas.

## React Compiler lint rules (eslint-config-next 16 → react-hooks v7) — hit in the real build
- `react-hooks/immutability`: don't mutate a value returned by `useThree` (e.g. `camera.fov = …` on `useThree(s => s.camera)`). Use the frame state: `useFrame((state) => { const cam = state.camera … })`.
- `react-hooks/set-state-in-effect`: no `useEffect(() => setX(document.body))`. In an `ssr:false` component read `document.body` directly.
- `react-hooks/use-memo`: deps must be an array literal — for create-once disposables use `const [v] = useState(make)` + cleanup effect.
- `react-hooks/static-components`: no components declared inside render (move helpers like `<FieldError>` to module scope).

## Common mistakes
- Importing `three` in a Server Component → bundling errors / huge server bundle.
- Using drei `<ScrollControls>`: it makes its own scroll container — breaks native scroll, SEO text and keyboard paging. We use document scroll + ScrollTrigger instead.
- Reading `useThree()` without a selector → re-render on every resize/state change.
- Forgetting `dispose` for manually created `CanvasTexture`/render targets (R3F disposes only what it created from JSX).

See [reference.md](reference.md) for the sources and the part-registry code.
