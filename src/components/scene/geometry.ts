import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

export function roundedRectPath<T extends THREE.Path>(p: T, w: number, h: number, r: number, cx = 0, cy = 0): T {
  const x = cx - w / 2
  const y = cy - h / 2
  r = Math.min(r, w / 2, h / 2)
  p.moveTo(x + r, y)
  p.lineTo(x + w - r, y)
  p.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  p.lineTo(x + w, y + h - r)
  p.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
  p.lineTo(x + r, y + h)
  p.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  p.lineTo(x, y + r)
  p.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return p
}

export const roundedRect = (w: number, h: number, r: number) => roundedRectPath(new THREE.Shape(), w, h, r)
export const roundedHole = (w: number, h: number, r: number, cx = 0, cy = 0) =>
  roundedRectPath(new THREE.Path(), w, h, r, cx, cy)

/**
 * Extrude a shape drawn in plan view (x = right, shape-y = toward the BACK) and lay it flat:
 * after this the extrusion runs from y = 0 up to y = depth, and shape-y maps to -z.
 */
export function flatExtrude(shape: THREE.Shape, depth: number, bevel = 0.006, segments = 2, curveSegments = 10) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.0001, depth - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: segments,
    curveSegments,
  })
  geo.translate(0, 0, bevel)
  geo.rotateX(-Math.PI / 2)
  geo.computeVertexNormals()
  return geo
}

export const roundedBox = (w: number, h: number, d: number, r: number, segments: number) =>
  new RoundedBoxGeometry(w, h, d, segments, Math.min(r, h / 2 - 0.0001, w / 2, d / 2))

/** Planar UVs for a flat-extruded geometry so a texture spans its footprint (w × d). */
export function planarUV(geo: THREE.BufferGeometry, w: number, d: number) {
  const pos = geo.attributes.position as THREE.BufferAttribute
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / w + 0.5
    uv[i * 2 + 1] = 0.5 - pos.getZ(i) / d
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return geo
}
