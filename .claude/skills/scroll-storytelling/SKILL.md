---
name: scroll-storytelling
description: Use when building or editing the scroll-driven master timeline — chapter data (scroll ranges, camera poses, lights, part transforms), Lenis + GSAP ScrollTrigger wiring, chapter text fades, jump navigation, pacing, reversibility and the reduced-motion variant.
---

# Scroll storytelling

Versions verified: gsap 3.15 (all plugins free for commercial use since 2025-04-30), @gsap/react 2.1, lenis 1.3.

## Model: data → GSAP timeline → mutable rig → useFrame

1. **Chapters are data** (`content/timeline.ts`): ordered list, each with `id`, `length` (in viewport heights), and
   *keyframes* for the rig: `camera.position`, `camera.target`, `lights`, `parts[name].offset/rotation/glow`, scalar uniforms (heat, glitch, scan).
2. **HTML section heights come from the same data**: `style={{ height: `${chapter.length * 100}svh` }}`. So retiming a chapter = editing `length` once; the 3D range and the text range move together.
3. **Compile once** into a paused `gsap.timeline()` whose tweens animate a plain JS `rig` object (not three objects, not React state). Position = cumulative length; add a label per chapter id. Staggered part tweens use the `stagger`/position offsets declared in data.
4. **One ScrollTrigger** on the story wrapper: `start:'top top', end:'bottom bottom', scrub: true, animation: tl`. (Let our render loop add damping; or use `scrub: 0.6` and no extra damping — pick one, never both.)
5. **useFrame copies `rig` → objects** every frame (camera.position.set, lookAt target, part.position = rest + offset…). Because the timeline is scrubbed and pure, scrolling up plays it back *exactly*.

```ts
gsap.registerPlugin(ScrollTrigger, useGSAP)
useGSAP(() => {
  const tl = buildTimeline(chapters, rig)   // paused timeline from data
  ScrollTrigger.create({ trigger: storyRef.current, start: 'top top', end: 'bottom bottom',
    scrub: true, animation: tl,
    onUpdate: (self) => { live.progress = self.progress } })
}, { scope: storyRef })
```

Hold rule (tested): a tween starts at the *previous keyframe* (or the group's last mention, if later), not at the group's last mention. See timeline-shape.md.

Important: tweens on a plain object need **explicit from values** at each keyframe boundary (`fromTo` or a `set` at position 0). Otherwise `immediateRender`/lazy from-values record the wrong start when scrubbing backwards. Build keyframes with `tl.to(rig.cam, {...}, at)` where the *initial* rig state equals chapter 0's pose.

## Lenis + ScrollTrigger (from the Lenis README)

```ts
const lenis = new Lenis({ autoRaf: false, lerp: 0.1, smoothWheel: true, anchors: true })
lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add((t) => lenis.raf(t * 1000))
gsap.ticker.lagSmoothing(0)
```
React: `<ReactLenis root options={{ autoRaf:false }} ref={…}>` then connect the same two lines in an effect; import `'lenis/dist/lenis.css'`. Jump nav: `lenis.scrollTo(target, { duration: 1.6 })` where target = `tl.scrollTrigger.labelToScroll(id)` or the section element.
Disable Lenis entirely under reduced motion (native scroll).

## Text overlays (revised after the real build)
**Pin duration trap:** a `sticky; height:100svh` block inside a section of `L×100svh` only stays pinned for `(L−1)/L` of the chapter — for a 1.4-viewport service stop that's 29%, so the copy scrolled away before the camera arrived. Fix: make sticky sections `(L+1)×100svh` tall with `margin-bottom:-100svh`, and compute chapter ranges from **consecutive section tops** (last chapter ends at `scrollHeight − innerHeight`, or it never completes).
Copy fades: one ScrollTrigger per copy block, `start:'top top', end:'bottom bottom'` (= exactly the chapter), fade in 12% / hold / fade out 12%. Every pinned layer must fade out (incl. catalogue rails), or it bleeds over the next chapter. Starting the fade-in before the boundary produced messy cross-fades.

Each chapter `<section>` is tall; its copy lives in a `position:sticky; top:0; height:100svh` inner block. Fade copy with its own ScrollTrigger (`scrub:true`, from opacity 0/y 24 → 1/0 → 0/-24) keyed to the section. Copy must be readable at its *rest* moment for ≥ 40% of the section's length — dead air is fine for the 3D, not for text.

## Pacing (borrowed technique, not design)
- Each chapter: **enter (15%) → hold (50–70%) → exit (15–20%)**. Holds are where text is read; the camera keeps drifting ~2–5% so it never feels frozen.
- One big move per chapter. Camera *and* parts moving fast simultaneously reads as chaos; stagger: parts move, then camera follows.
- Exploded view along one axis, parts leave in **staggered order with ease `power3.inOut`** and slight overshoot; heavier parts (battery, board) start later and travel shorter.
- Reassembly is ~40% faster than teardown and uses `power2.in` → `back.out(1.2)` settle on the last piece.
- Keep the `target` (lookAt) path smoother than the position path — jerky targets cause nausea.

## Mobile
Framing that fits the laptop's *width* on tall screens (tested at 390x844): after applying the rig, push the camera away from its target by `k = clamp(refAspect / aspect, 1, 2.4)` with refAspect ~ 1.6. Use `cameraMobile` poses only where the composition must change (copy below the laptop, part stops).
`gsap.matchMedia()` with `{ isDesktop:'(min-width: 900px)', isMobile:'(max-width: 899px)', reduce:'(prefers-reduced-motion: reduce)' }`. Mobile poses come from a separate `poseMobile` (or a framing function that pulls camera back by aspect). Set `ScrollTrigger.config({ ignoreMobileResize: true })` so the URL bar showing/hiding doesn't refresh. Use `svh` units for section heights.

## Static (no WebGL) and reduced motion
Static mode must skip Lenis, the timeline and the copy fades entirely (they hid all text in the first build).
Reduced motion: no scrub, no Lenis; mark the active section `data-active` and fade copy with a CSS transition on that attribute.
No scrub. On each section's `onToggle`/`onEnter`, set the rig instantly to that chapter's **hold pose** (`tl.seek(label + hold)`) and crossfade the canvas opacity (0.3s). Text appears without translate.

## Mistakes to avoid
- Animating React state from ScrollTrigger `onUpdate` (re-render storms).
- Two smoothers (Lenis lerp + scrub number + useFrame damp) → mushy, laggy reversal.
- `ScrollTrigger.refresh()` before fonts/layout are ready: call after `document.fonts.ready`, and after async content (catalogue) changes height.
- Pinning inside a Lenis-smoothed page without `ScrollTrigger.update` wiring → jitter.
- `useGSAP` without `scope` and dependencies → duplicated triggers in React StrictMode dev.

Full timeline type and builder: [timeline-shape.md](timeline-shape.md).
