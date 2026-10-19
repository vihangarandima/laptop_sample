---
name: procedural-modeling
description: Use when building or changing the code-generated laptop and its internal parts — geometry choices (rounded/chamfered shapes, extrusions), naming and hierarchy for animation, instancing repeated details (keys, chips, capacitors), and live CanvasTexture content for the screen and labels.
---

# Procedural modeling (no external model files)

## Hierarchy and naming
- Root `laptop` group → `base` group (pivot at hinge line) and `lid` group (pivot **at the hinge axis**, so `rotation.x` opens it).
- Every part the story moves is its own `<group name="…">` registered in the part registry (see r3f-scene-architecture). Animate the *group*, never inner meshes.
- Units: 1 unit ≈ 10 cm. Laptop ~3.1 × 0.16 × 2.15 (w × h × d). Keep the model centred at x/z = 0, bottom at y = 0.
- Store rest transform: `userData.rest = { position: p.clone(), rotation: r.clone() }`.

## Shapes that read as premium
- **Body shells:** `RoundedBoxGeometry` from `three/examples/jsm/geometries/RoundedBoxGeometry.js` (drei's `<RoundedBox>` wraps it). Signature `(width, height, depth, segments, radius)`. segments 4 (high) / 2 (low tier).
- **Chamfered plates with cut-outs** (bottom cover vents, keyboard well): `THREE.Shape` with `absarc` corners + `holes`, then `ExtrudeGeometry({ depth, bevelEnabled:true, bevelSize:0.01, bevelThickness:0.01, bevelSegments:2, curveSegments:8 })`. Rotate −90° on X to lie flat.
- **Heat pipes:** `TubeGeometry(new CatmullRomCurve3(points), 48, r, 8)` flattened with `scale.y=0.45`.
- **Fan:** hub `CylinderGeometry` + N blades from a curved `Shape` extrusion; rotate the blade group in `useFrame` by `speed * delta`.
- Avoid perfectly sharp 90° edges on anything near the camera — a 0.01–0.03 radius catches the rim light, which is what makes it look machined.

## Instancing (one draw call per kind)
Use raw `THREE.InstancedMesh` (drei `<Instances>` costs CPU per instance; fine for <100, not for 80 keys + 200 SMD parts).

```tsx
const ref = useRef<THREE.InstancedMesh>(null!)
useLayoutEffect(() => {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1,1,1), p = new THREE.Vector3()
  layout.forEach((k, i) => { p.set(k.x, 0, k.z); s.set(k.w, 1, 1); ref.current.setMatrixAt(i, m.compose(p, q, s)) })
  ref.current.instanceMatrix.needsUpdate = true
  ref.current.computeBoundingSphere()          // otherwise frustum culling uses the base geometry only
}, [layout])
return <instancedMesh ref={ref} args={[keyGeo, keyMat, layout.length]} castShadow={false} />
```
Per-instance colour: `setColorAt(i, color)` then `instanceColor.needsUpdate = true`. Keys: one rounded key-cap geometry scaled per instance width.

## CanvasTexture for screens and labels
```ts
const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 640
const tex = new THREE.CanvasTexture(canvas)
tex.colorSpace = THREE.SRGBColorSpace          // colour data → sRGB (three color-management manual)
tex.anisotropy = 4
// after drawing:  tex.needsUpdate = true      (only when content changed!)
```
- Redraw only when the screen *state* changes or during short animated states (boot text, glitch). Throttle to 30 Hz; uploading 1024² every frame costs ~1–3 ms on phones.
- Screen material: `meshBasicMaterial` with `toneMapped={false}` so UI colours stay true and it can bloom; a separate thin glass plane on top (`meshPhysicalMaterial` transmission 0, roughness 0.05, `transparent`, opacity ~0.12) gives the reflection.
- Static labels (battery cells, chip markings, SSD sticker): draw once into a small canvas (256–512px), `generateMipmaps` default true is fine.
- Dispose textures you create manually in a cleanup.

## Labels must read in the view they're seen in
Labels on the internals are seen while the laptop is upside down (teardown). Printed with `rotation=[π/2,0,0]` they read upside down; use `[π/2, 0, π]` for the same face but readable after the root's `rz=π` flip.

## Screen painter (tested)
Cache the clean frame in an offscreen CPU canvas keyed by its content; per-frame effects (glitch slices, cursor) copy from the cache into the output canvas. Glitch at 10 Hz. Both canvases `willReadFrequently: true`.

## Emissive trace layer (diagnosis)
Draw board traces into a canvas used as `emissiveMap` on a plane slightly above the PCB; animate a `uScan` via `onBeforeCompile` *or* simpler: second canvas mask + `emissiveIntensity` driven by the rig. Prefer simple: one `MeshStandardMaterial` with `emissiveMap`, and animate `emissiveIntensity` + a moving scan bar mesh. Keep `toneMapped:false` on the scan bar for bloom.

## Mistakes
- Pivot not at hinge → lid swings around its centre.
- Merging parts that need independent motion.
- Forgetting `computeBoundingSphere()` on InstancedMesh → keys vanish at screen edges.
- New geometry per render (always `useMemo` geometry; share materials from one module).
- Real-brand cues (logo shapes, distinctive grilles). Our mark only.

More geometry recipes: [recipes.md](recipes.md).
