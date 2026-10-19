import type { Object3D } from 'three'

/**
 * Every individually animated object, addressed by name.
 * The timeline only knows these names. To swap in a real .glb, map its nodes to
 * these names and call registerPart — nothing else needs to change.
 */
export const PART_NAMES = [
  'lid', // display assembly group (rotates at the hinge)
  'display', // panel inside the lid, separates in the exploded view
  'hinge',
  'keyboardDeck',
  'motherboard',
  'fan',
  'heatpipes',
  'ramA',
  'ramB',
  'ssd',
  'battery',
  'bottomCover',
  'screws',
] as const
export type PartName = (typeof PART_NAMES)[number]

export const PART_LABEL: Record<PartName, string> = {
  lid: 'Display assembly',
  display: 'Display panel',
  hinge: 'Hinge',
  keyboardDeck: 'Keyboard deck',
  motherboard: 'Motherboard',
  fan: 'Fan',
  heatpipes: 'Heat pipes',
  ramA: 'RAM',
  ramB: 'RAM',
  ssd: 'M.2 SSD',
  battery: 'Battery',
  bottomCover: 'Bottom cover',
  screws: 'Screws',
}

type Rest = { px: number; py: number; pz: number; rx: number; ry: number; rz: number }
const registry = new Map<PartName, Object3D>()
const listeners = new Set<() => void>()

export function registerPart(name: PartName, obj: Object3D | null) {
  if (obj) {
    if (!obj.userData.rest) {
      obj.userData.rest = {
        px: obj.position.x, py: obj.position.y, pz: obj.position.z,
        rx: obj.rotation.x, ry: obj.rotation.y, rz: obj.rotation.z,
      } satisfies Rest
    }
    obj.userData.part = name
    registry.set(name, obj)
  } else registry.delete(name)
  listeners.forEach((l) => l())
}

export const getPart = (name: PartName) => registry.get(name)
export const restOf = (obj: Object3D) => obj.userData.rest as Rest
export const onPartsChanged = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
