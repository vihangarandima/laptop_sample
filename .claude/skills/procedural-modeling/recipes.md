# Geometry recipes

## Rounded rectangle shape (for extrusions)
```ts
export function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}
```
Add holes: `shape.holes.push(roundedRectPath(...))` (a `THREE.Path` built the same way).
Extrude + lay flat: `geo.rotateX(-Math.PI / 2)`; after rotate, extrusion depth runs along +Y.

## Brushed aluminium without textures
`meshPhysicalMaterial` color `#8d9196`, metalness 1, roughness 0.32, `anisotropy` 0.6 (three ≥ r153;
`anisotropyRotation` sets the brush direction), clearcoat 0. Needs an environment map to look metallic.

## Gold contacts / copper pipes
- Gold: color `#d4a64a`, metalness 1, roughness 0.25.
- Copper: color `#c27a4a`, metalness 1, roughness 0.3.

## PCB
Base `meshStandardMaterial` color `#0f2a22` roughness 0.6; silkscreen + traces painted into a canvas
(`map`), and the same canvas lines in brighter cyan into an `emissiveMap` (emissive colour accent,
intensity driven by the timeline). SMD chips: one InstancedMesh of boxes; capacitors: InstancedMesh of cylinders.

## Key layout
6 rows; row widths in key units: [14 × 1], [1.5, 12 × 1, 1.5], [1.75, 11 × 1, 1.75], [2.25, 10 × 1, 2.25], [1.25 ×3, 6, 1.25 × 3 …]; normalise each row to the well width.
