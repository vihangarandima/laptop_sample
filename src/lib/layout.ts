import type { PartName } from './parts'

/**
 * Physical layout of the stage laptop (1 unit ≈ 10 cm).
 * Local frame: x = right, y = up, z = toward the viewer. Bottom of the chassis at y = 0.
 * Both the procedural model and the timeline data read these numbers, so a part
 * placed here is placed everywhere.
 */
export const L = {
  W: 3.1,
  D: 2.15,
  baseH: 0.16,
  lidH: 0.055,
  coverH: 0.024,
  corner: 0.12,
  /** hinge axis (lid pivot) */
  hinge: [0, 0.16, -1.075] as const,
  /** lid fully open, radians (negative x rotation opens) */
  lidOpenAngle: 1.88,
}

/** Rest position of each part group's origin, in the laptop (root) frame. */
export const REST: Record<Exclude<PartName, 'display'>, readonly [number, number, number]> & {
  display: readonly [number, number, number]
} = {
  bottomCover: [0, 0, 0],
  screws: [0, 0, 0],
  battery: [0, 0.056, 0.52],
  motherboard: [0, 0.112, -0.44],
  fan: [0.98, 0.07, -0.5],
  heatpipes: [0, 0.09, 0],
  ramA: [-0.98, 0.082, -0.16],
  ramB: [-0.98, 0.062, -0.5],
  ssd: [-0.96, 0.068, -0.86],
  keyboardDeck: [0, 0, 0],
  hinge: [0, 0.16, -1.075],
  lid: [0, 0.16, -1.075],
  /** display panel is a child of the lid; this is in the lid's frame */
  display: [0, -0.004, 1.075],
}

/** Height at which the root floats during the teardown (keeps the exploded column off the floor). */
export const TEARDOWN_ROOT_Y = 1.45

/**
 * World position of a part while the laptop is flipped upside down (root rz = π)
 * and lifted to TEARDOWN_ROOT_Y, given its local explode offset.
 * Used by the timeline data to aim the camera at parts.
 */
export function flippedWorld(part: Exclude<PartName, 'display' | 'lid'>, offset: readonly [number, number, number]) {
  const r = REST[part]
  const lx = r[0] + offset[0]
  const ly = r[1] + offset[1]
  const lz = r[2] + offset[2]
  return [-lx, TEARDOWN_ROOT_Y - ly, lz] as [number, number, number]
}
