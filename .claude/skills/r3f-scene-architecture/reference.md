# r3f-scene-architecture — reference

## Sources (read 2026-10-03)
- R3F pitfalls: https://r3f.docs.pmnd.rs/advanced/pitfalls
- R3F hooks (useFrame priority, useThree selectors): https://r3f.docs.pmnd.rs/api/hooks
- R3F Canvas props/defaults (dpr [1,2], ACESFilmic, SRGB output, eventSource, eventPrefix): https://r3f.docs.pmnd.rs/api/canvas
- R3F events (bubbling, stopPropagation, onPointerMissed): https://r3f.docs.pmnd.rs/api/events
- Next lazy loading (ssr:false rule): https://nextjs.org/docs/app/guides/lazy-loading

## Part registry

```ts
// lib/parts.ts
import type { Object3D } from 'three'
export const PART_NAMES = ['lid','display','hinge','keyboardDeck','motherboard','fan','heatpipes',
  'ramA','ramB','ssd','battery','bottomCover'] as const
export type PartName = (typeof PART_NAMES)[number]
const registry = new Map<PartName, Object3D>()
export const registerPart = (n: PartName, o: Object3D | null) => { o ? registry.set(n, o) : registry.delete(n) }
export const getPart = (n: PartName) => registry.get(n)
```

Every part stores its *rest* transform in `userData.rest` on mount so the timeline expresses offsets
relative to rest (exploded = rest + offset). Swapping in a GLB: traverse the loaded scene, map node
names to PartName, call registerPart. Nothing else changes.

## Event notes
- `eventSource` default is the canvas parent. With an HTML page on top and a fixed canvas behind,
  point it at `document.body` (must exist — in a client effect, or pass a ref's element).
- R3F skips `visible=false` objects in raycasting. For hit proxies use an invisible material
  (`colorWrite={false} depthWrite={false}`) on a visible mesh.
- `onPointerMissed` on the Canvas → clear selection.
