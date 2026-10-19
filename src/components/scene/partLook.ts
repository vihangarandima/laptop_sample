import * as THREE from 'three'
import type { PartName } from '@/lib/parts'
import { ACCENT } from './materials'

type Entry = {
  mat: THREE.MeshStandardMaterial
  color: THREE.Color
  emissive: THREE.Color
  emissiveIntensity: number
  env: number
  body: boolean
}
type Look = { entries: Entry[]; dim: number; glow: number }

const looks = new Map<PartName, Look>()
const tmp = new THREE.Color()
const bodyColor = new THREE.Color('#8f9398')
let bodyVersion = 0

/**
 * Give a part its own material instances so dimming/glowing it never affects other parts.
 * Materials flagged `userData.keep` (screen, emissive traces) are left shared and untouched.
 */
export function adoptPartMaterials(name: PartName, root: THREE.Object3D) {
  const entries: Entry[] = []
  const cache = new Map<THREE.Material, THREE.Material>()
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || Array.isArray(mesh.material)) return
    const src = mesh.material as THREE.MeshStandardMaterial
    if (!src || src.userData.keep || !('emissive' in src)) return
    if (src.userData.partOwned) return // already adopted (StrictMode re-run)
    let m = cache.get(src) as THREE.MeshStandardMaterial | undefined
    if (!m) {
      m = src.clone()
      m.userData = { ...src.userData, partOwned: true }
      cache.set(src, m)
      entries.push({
        mat: m,
        color: m.color.clone(),
        emissive: m.emissive.clone(),
        emissiveIntensity: m.emissiveIntensity,
        env: m.envMapIntensity ?? 1,
        body: !!src.userData.body,
      })
    }
    mesh.material = m
  })
  const prev = looks.get(name)
  looks.set(name, { entries: prev ? [...prev.entries, ...entries] : entries, dim: -1, glow: -1 })
}

export function setBodyColor(hex: string) {
  bodyColor.set(hex)
  bodyVersion++
}

let appliedBody = -1
/** Apply dim/glow from the rig. Cheap: only touches materials whose inputs changed. */
export function applyLook(name: PartName, dim: number, glow: number) {
  const look = looks.get(name)
  if (!look) return
  const bodyChanged = appliedBody !== bodyVersion
  if (Math.abs(look.dim - dim) < 0.002 && Math.abs(look.glow - glow) < 0.002 && !bodyChanged) return
  look.dim = dim
  look.glow = glow
  const k = 1 - 0.78 * dim
  for (const e of look.entries) {
    tmp.copy(e.body ? bodyColor : e.color).multiplyScalar(k)
    e.mat.color.copy(tmp)
    e.mat.envMapIntensity = e.env * (1 - 0.7 * dim) + glow * 0.35
    e.mat.emissive.copy(e.emissive).lerp(ACCENT, glow * 0.07)
    e.mat.emissiveIntensity = e.emissiveIntensity
  }
}
export function commitBody() {
  appliedBody = bodyVersion
}
