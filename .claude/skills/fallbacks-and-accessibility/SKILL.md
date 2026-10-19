---
name: fallbacks-and-accessibility
description: Use when handling phones and touch, prefers-reduced-motion, missing/failed WebGL, keyboard navigation, focus styles, contrast, form labelling and screen-reader text alternatives for the 3D scene.
---

# Fallbacks and accessibility

## Principle
The HTML is the site. The canvas is an enhancement drawn *behind* it. Every chapter's headline, copy, service details, catalogue, tracker, booking form and contact info is server-rendered HTML and makes sense with the canvas absent.

## Decision at mount (client)
```ts
const webgl = (() => { try { const c = document.createElement('canvas')
  return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false } })()
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
mode = !webgl || failed ? 'static' : reduce ? 'stills' : 'scrub'
```
- Wrap the Canvas in a React **error boundary** + listen for `webglcontextlost` → switch to `static` mode at runtime. No blank page, ever.
- `static`: each chapter shows a pre-rendered still (`/fallback/<chapter>.webp`, captured from the real scene by `scripts/capture-fallbacks.mjs`) as a regular `<img>` with descriptive `alt`, laid out in the section.
- `stills` (reduced motion): canvas stays, timeline is not scrubbed; rig jumps to each chapter's hold pose with a short opacity crossfade; no Lenis; no parallax/tilt; no glitch flicker (show a static "fault" frame instead) — WCAG 2.3.3.
- Respect `prefers-reduced-motion` in CSS too: `@media (prefers-reduced-motion: reduce){ *{ animation-duration:.01ms!important; transition-duration:.01ms!important; scroll-behavior:auto!important } }`.

## What the build taught
- Decide the mode in an inline `<head>` script (`html[data-scene=static|stills|scrub]`) before first paint; no attribute = no JS = static. CSS keys everything off it — no flash.
- Static stills are rendered from the real scene with `scripts/capture-fallbacks.mjs` (HTML hidden), so the no-WebGL page shows the same machine.
- `.sr-only` elements are `position:absolute`; inside a horizontal scroll rail whose ancestors aren't positioned they escape the rail's clipping and widen the page (1888 px on a 1440 viewport). Make the rail `relative`; add `html { overflow-x: clip }` as a net.
- Verify with `scripts/modes.mjs` (real `--disable-webgl`, JS off, reducedMotion).

## Text alternatives for the scene
Canvas gets `aria-hidden="true"`. Each section has a visually-hidden (`sr-only`) sentence describing what the scene shows at that point ("The laptop's bottom cover lifts away and its parts separate into layers: …"). Do not put an `aria-live` region on scroll-driven changes (too noisy). Use `aria-live="polite"` only for form/tracker results.

## Keyboard
- Skip link "Skip to content" → `#main`, and one to "Book a repair".
- Chapter indicator = `<nav aria-label="Chapters">` with real `<a href="#chapter-id">` links (work without JS); JS enhances with `lenis.scrollTo`. Mark current with `aria-current="true"`.
- Service stops: each part's hotspot also exists as an HTML button list ("Battery · SSD & RAM · …") so hover/click on 3D is never the only way.
- Visible focus: `:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px }` — accent on graphite gives > 3:1. Make sure the sticky "Book a repair" button never covers focused elements (WCAG 2.4.11): add `scroll-padding-bottom` ≥ its height.
- Don't trap scroll: Lenis `prevent` for scrollable children (`data-lenis-prevent` attribute on overflow containers).

## Contrast (WCAG 1.4.3 / 1.4.11)
Body text ≥ 4.5:1 on its actual backdrop — text sits over the 3D, so give copy blocks a subtle graphite scrim (`background: color-mix(in oklab, #0b0c0d 70%, transparent)` + `backdrop-filter` only on high tier) or keep text in zones the camera framing leaves empty. Off-white `#ecebe6` on `#0b0c0d` ≈ 16:1. Muted text no darker than `#9a9a95` (≈ 7:1).

## Forms
`<label for>` on every field, `aria-describedby` for hints and errors, `aria-invalid` on error, error summary focused on submit failure, chips as `<input type="checkbox">` styled (not divs), `autocomplete="name"`/`"tel"`, `inputmode="tel"`.

## Phones / touch
- Detect `(hover: none)` → no custom cursor, no hover tilt; tap selects a part (R3F `onClick` fires on tap). 
- Tall framing: per-keyframe `cameraMobile` or pull camera back by `max(1, 0.75 / aspect)`; put copy at the bottom third, laptop in the top half.
- Use `svh` for section heights (URL bar), `ScrollTrigger.config({ ignoreMobileResize:true })`.
- Hit targets ≥ 44×44 px.

Sources: WCAG 2.3.3 https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html · WCAG focus appearance https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html · web.dev vitals https://web.dev/articles/vitals
