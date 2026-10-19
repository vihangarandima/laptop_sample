/**
 * THE MASTER TIMELINE — the whole story as data.
 *
 * Each chapter is one <section> on the page. `length` is its height in viewport heights,
 * and also its share of the 3D timeline, so retiming a chapter means editing one number.
 * Reorder chapters by reordering this array (keep camera poses continuous).
 *
 * Keyframes: `at` is 0..1 inside the chapter. A value HOLDS until the keyframe before the
 * one that changes it, then tweens into it with that keyframe's `ease`.
 *
 * Part offsets are in the laptop's own frame. During the teardown the laptop is upside
 * down, so a NEGATIVE y offset moves a part UP on screen (helper `up()`).
 */
import type { PartName } from '@/lib/parts'
import { flippedWorld, TEARDOWN_ROOT_Y } from '@/lib/layout'

export type V3 = [number, number, number]
export type PartPose = { offset?: V3; rotation?: V3; glow?: number; dim?: number }
export type CameraPose = {
  position: V3
  target: V3
  /** shift the subject on screen, as a fraction of viewport width/height (+x right, +y up) */
  frame?: [number, number]
  fov?: number
}
export type Uniforms = {
  lidOpen: number // 0 closed → 1 open
  screen: number // screen brightness 0..1
  boot: number // 0 = boot screen start, 1 = desktop ready
  glitch: number // 0..1
  heat: number // underside amber glow
  fan: number // fan speed (turns / s)
  scan: number // diagnosis scan line 0..1 across the board
  fault: number // fault component pulse 0..1
  fixed: number // fault component repaired 0..1 (warning → accent)
  dof: number // depth of field strength 0..1
  key: number
  rim: number
  warn: number // warning light
  accent: number // cyan accent light
  shelf: number // other stock laptops revealed 0..1
  logo: number // lid logo glow
  tilt: number // how much the laptop follows the cursor 0..1
}
export type RootPose = { position?: V3; rotation?: V3 }
export type Keyframe = {
  at: number
  ease?: string
  camera?: CameraPose
  /** optional phone-specific pose; otherwise the desktop pose is auto-framed for portrait */
  cameraMobile?: CameraPose
  root?: RootPose
  u?: Partial<Uniforms>
  parts?: Partial<Record<PartName, PartPose>>
  /** spread the part tweens of this keyframe: each listed part starts `each` (chapter-relative units) later */
  stagger?: { order: PartName[]; each: number }
}
export type ScreenMode = 'desktop' | 'tracker' | 'product' | 'off'
export type Chapter = {
  id: string
  /** label in the chapter indicator; omit to hide the chapter from it */
  nav?: string
  length: number
  screen: ScreenMode
  /** service stop: the part that can be hovered/clicked, and the service id it maps to */
  service?: { id: string; parts: PartName[]; anchor: PartName }
  /** where reduced-motion mode freezes the chapter (0..1) */
  still?: number
  keys: Keyframe[]
}

/* ---------------------------------------------------------------- helpers */

/** Lift a part n units up the explode axis. The axis leans back slightly (z) so upper layers
 *  recede and reveal the ones below — still one axis, just tilted away from the camera. */
const up = (n: number, z = 0, x = 0): V3 => [x, -n, z - n * 0.2]

/** Exploded resting offsets (laptop upside down, column rises on screen). */
export const EXPLODED: Record<PartName, V3> = {
  screws: up(2.6),
  bottomCover: up(2.15),
  battery: up(1.65),
  ssd: up(1.18),
  ramA: up(1.22),
  ramB: up(1.06),
  fan: up(0.8),
  heatpipes: up(0.72),
  motherboard: up(0.32),
  keyboardDeck: [0, 0, 0],
  hinge: [0, 0.38, -0.25],
  lid: [0, 0.98, 0],
  display: [0, -0.44, 0], // relative to the lid
}

const ALL = Object.keys(EXPLODED) as PartName[]
const ASSEMBLED = Object.fromEntries(ALL.map((p) => [p, { offset: [0, 0, 0] as V3, rotation: [0, 0, 0] as V3, glow: 0, dim: 0 }]))
const explodedPose = (dim = 0) =>
  Object.fromEntries(ALL.map((p) => [p, { offset: EXPLODED[p], rotation: [0, 0, 0] as V3, glow: 0, dim }]))

/** How far forward (+z) each part slides out of the column at its service stop. */
const PULL: Partial<Record<PartName, number>> = {
  battery: 1.3,
  ssd: 2.2,
  ramA: 1.55,
  ramB: 1.9,
  fan: 2.05,
  heatpipes: 2.1,
  motherboard: 2.3,
  keyboardDeck: 2.35,
  display: 2.4,
  hinge: 2.6,
}

function stopPose(focus: PartName[], extra: Partial<Record<PartName, PartPose>> = {}) {
  const parts: Partial<Record<PartName, PartPose>> = explodedPose(0.82)
  for (const p of focus) {
    const e = EXPLODED[p]
    parts[p] = { offset: [e[0], e[1], e[2] + (PULL[p] ?? 1.5)], rotation: [0, 0, 0], glow: 1, dim: 0 }
  }
  return { ...parts, ...extra }
}

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const pulled = (p: Exclude<PartName, 'display' | 'lid'>): V3 => {
  const e = EXPLODED[p]
  return flippedWorld(p, [e[0], e[1], e[2] + (PULL[p] ?? 1.5)])
}

/** Camera pose looking at a world point from above-front-right. */
const look = (target: V3, dist: number, frame: [number, number] = [0.2, 0]): CameraPose => ({
  target,
  position: add(target, [dist * 1.5 * 0.24, dist * 1.5 * 0.55, dist * 1.5 * 0.8]),
  frame,
})
const lookMobile = (target: V3, dist: number): CameraPose => ({
  target,
  position: add(target, [dist * 1.25 * 0.15, dist * 1.25 * 0.6, dist * 1.25 * 0.8]),
  frame: [0, 0.22],
})

const R = TEARDOWN_ROOT_Y
const FLIPPED = { position: [0, R, 0] as V3, rotation: [0, 0, Math.PI] as V3 }
const UPRIGHT = { position: [0, 0, 0] as V3, rotation: [0, 0, 0] as V3 }
const COLUMN_TARGET: V3 = [0, 2.25, -0.3]

/* The display panel's pulled position (lid frame → world while flipped). */
const displayWorld: V3 = [0, R - (0.16 + EXPLODED.lid[1] - 0.004 + EXPLODED.display[1]), -1.075 + 1.075 + (PULL.display ?? 0)]
const boardWorld = pulled('motherboard')
const BOARD_DIAG_PULL = 1.0 // extra pull for the diagnosis close-up
const boardDiag: V3 = [boardWorld[0], boardWorld[1], boardWorld[2] + BOARD_DIAG_PULL]

/* ---------------------------------------------------------------- the story */

export const chapters: Chapter[] = [
  {
    id: 'machine',
    nav: 'The machine',
    length: 2.2,
    screen: 'desktop',
    still: 0.9,
    keys: [
      {
        at: 0,
        camera: { position: [3.4, 1.3, 7.2], target: [0, 0.35, 0], frame: [0.16, -0.02], fov: 30 },
        cameraMobile: { position: [2.4, 1.6, 7.4], target: [0, 0.35, 0], frame: [0, 0.18], fov: 30 },
        root: UPRIGHT,
        parts: ASSEMBLED,
        u: {
          lidOpen: 0, screen: 0, boot: 0, glitch: 0, heat: 0, fan: 0.4, scan: 0, fault: 0, fixed: 0, dof: 0,
          key: 0.15, rim: 3.2, warn: 0, accent: 0, shelf: 0, logo: 0.35, tilt: 1,
        },
      },
      { at: 0.25, ease: 'power1.inOut', u: { key: 0.3 } },
      {
        at: 0.82,
        ease: 'power2.inOut',
        camera: { position: [2.9, 2.35, 7.6], target: [0, 0.95, -0.35], frame: [0.18, 0], fov: 30 },
        cameraMobile: { position: [2.0, 2.5, 7.8], target: [0, 0.95, -0.35], frame: [0, 0.2], fov: 30 },
        u: { lidOpen: 1, screen: 1, boot: 1, key: 0.9, logo: 0 },
      },
    ],
  },
  {
    id: 'fault',
    nav: 'Something is wrong',
    length: 2.2,
    screen: 'desktop',
    still: 0.6,
    keys: [
      {
        at: 0.22,
        camera: { position: [-2.6, 1.15, 6.2], target: [0, 0.75, -0.3], frame: [-0.17, 0], fov: 30 },
        cameraMobile: { position: [-1.8, 1.3, 7.0], target: [0, 0.75, -0.3], frame: [0, 0.2], fov: 30 },
        u: { glitch: 1, heat: 1, fan: 7, warn: 3.2, key: 0.35, rim: 2.0 },
      },
      { at: 0.75, u: { glitch: 0.8 } },
      { at: 1, ease: 'power1.in', u: { glitch: 0.2, screen: 0.4 } },
    ],
  },
  {
    id: 'teardown',
    nav: 'The teardown',
    length: 3,
    screen: 'off',
    still: 0.98,
    keys: [
      // close the lid, cool down the warning light
      { at: 0.16, ease: 'power2.inOut', u: { lidOpen: 0, screen: 0, glitch: 0, heat: 0, warn: 0, fan: 0, tilt: 0, key: 1.25, rim: 2.6 } },
      // lift and roll the laptop upside down
      {
        at: 0.42,
        ease: 'power3.inOut',
        root: FLIPPED,
        camera: { position: [4.6, 3.0, 8.2], target: [0, 1.4, 0], frame: [0.14, 0], fov: 30 },
        cameraMobile: { position: [3.2, 3.2, 9.0], target: [0, 1.4, 0], frame: [0, 0.16], fov: 30 },
      },
      // screws out, bottom cover lifts away
      {
        at: 0.55,
        ease: 'power2.out',
        parts: { screws: { offset: up(0.7) }, bottomCover: { offset: up(0.35) } },
        stagger: { order: ['screws', 'bottomCover'], each: 0.06 },
      },
      // the clean exploded view, staggered and weighty
      {
        at: 0.95,
        ease: 'power3.inOut',
        camera: { position: [3.5, 5.3, 7.3], target: COLUMN_TARGET, frame: [0.17, 0], fov: 30 },
        cameraMobile: { position: [2.4, 5.6, 8.6], target: COLUMN_TARGET, frame: [0, 0.12], fov: 30 },
        parts: explodedPose(0),
        stagger: {
          order: ['screws', 'bottomCover', 'battery', 'ssd', 'ramA', 'ramB', 'fan', 'heatpipes', 'motherboard', 'hinge', 'lid', 'display'],
          each: 0.045,
        },
        u: { dof: 0.3 },
      },
    ],
  },
  {
    id: 'svc-battery',
    nav: 'Services',
    length: 1.4,
    screen: 'off',
    still: 0.5,
    service: { id: 'battery', parts: ['battery'], anchor: 'battery' },
    keys: [
      { at: 0.4, ease: 'power3.inOut', camera: look(pulled('battery'), 4.4), cameraMobile: lookMobile(pulled('battery'), 6.2), parts: stopPose(['battery']), u: { accent: 2.2, dof: 0.6 } },
    ],
  },
  {
    id: 'svc-storage',
    length: 1.4,
    screen: 'off',
    still: 0.5,
    service: { id: 'storage-memory', parts: ['ssd', 'ramA', 'ramB'], anchor: 'ramA' },
    keys: [
      { at: 0.4, ease: 'power3.inOut', camera: look(pulled('ramA'), 3.8), cameraMobile: lookMobile(pulled('ramA'), 5.6), parts: stopPose(['ssd', 'ramA', 'ramB']) },
    ],
  },
  {
    id: 'svc-thermal',
    length: 1.4,
    screen: 'off',
    still: 0.5,
    service: { id: 'thermal', parts: ['fan', 'heatpipes'], anchor: 'fan' },
    keys: [
      { at: 0.4, ease: 'power3.inOut', camera: look(pulled('fan'), 3.9), cameraMobile: lookMobile(pulled('fan'), 5.8), parts: stopPose(['fan', 'heatpipes']), u: { fan: 2.5 } },
    ],
  },
  {
    id: 'svc-board',
    length: 1.4,
    screen: 'off',
    still: 0.5,
    service: { id: 'board', parts: ['motherboard'], anchor: 'motherboard' },
    keys: [
      { at: 0.4, ease: 'power3.inOut', camera: look(boardWorld, 4.6), cameraMobile: lookMobile(boardWorld, 6.6), parts: stopPose(['motherboard']), u: { fan: 0 } },
    ],
  },
  {
    id: 'svc-input',
    length: 1.4,
    screen: 'off',
    still: 0.5,
    service: { id: 'input', parts: ['keyboardDeck'], anchor: 'keyboardDeck' },
    keys: [
      {
        at: 0.4,
        ease: 'power3.inOut',
        camera: look(pulled('keyboardDeck'), 5.6),
        cameraMobile: lookMobile(pulled('keyboardDeck'), 8),
        parts: stopPose(['keyboardDeck'], {
          keyboardDeck: { offset: [0, 0, PULL.keyboardDeck ?? 2], rotation: [Math.PI, 0, 0], glow: 1, dim: 0 },
        }),
      },
    ],
  },
  {
    id: 'svc-display',
    length: 1.4,
    screen: 'off',
    still: 0.5,
    service: { id: 'display', parts: ['display', 'hinge'], anchor: 'display' },
    keys: [
      {
        at: 0.4,
        ease: 'power3.inOut',
        camera: look(displayWorld, 5.6),
        cameraMobile: lookMobile(displayWorld, 8),
        parts: stopPose(['display', 'hinge'], {
          display: { offset: [0, EXPLODED.display[1], PULL.display ?? 2], rotation: [0, 0, 0], glow: 1, dim: 0 },
        }),
      },
    ],
  },
  {
    id: 'diagnosis',
    nav: 'Diagnosis',
    length: 2.6,
    screen: 'off',
    still: 0.92,
    keys: [
      {
        at: 0.22,
        ease: 'power3.inOut',
        camera: { position: add(boardDiag, [0.3, 3.6, 1.4]), target: boardDiag, frame: [0.25, 0], fov: 30 },
        cameraMobile: { position: add(boardDiag, [0, 4.9, 1.9]), target: boardDiag, frame: [0, 0.3], fov: 30 },
        parts: stopPose([], {
          motherboard: { offset: [0, EXPLODED.motherboard[1], (PULL.motherboard ?? 2) + BOARD_DIAG_PULL], rotation: [0, 0, 0], glow: 0, dim: 0 },
        }),
        u: { accent: 0.6, dof: 0.8 },
      },
      { at: 0.55, ease: 'none', u: { scan: 1 } },
      { at: 0.62, ease: 'power1.out', u: { fault: 1, warn: 0.8 } },
      { at: 0.78, u: { fault: 1 } },
      { at: 0.92, ease: 'power2.inOut', u: { fixed: 1, warn: 0, accent: 1.4 } },
    ],
  },
  {
    id: 'reassembly',
    nav: 'Reassembly',
    length: 2.2,
    screen: 'desktop',
    still: 0.95,
    keys: [
      {
        at: 0.12,
        ease: 'power2.inOut',
        camera: { position: [3.5, 5.3, 7.3], target: COLUMN_TARGET, frame: [0.17, 0], fov: 30 },
        cameraMobile: { position: [2.4, 5.6, 8.6], target: COLUMN_TARGET, frame: [0, 0.12], fov: 30 },
        parts: explodedPose(0),
        u: { scan: 0, dof: 0.2, accent: 0 },
      },
      // everything flies home, last piece first, screws settle at the very end
      {
        at: 0.5,
        ease: 'power3.in',
        parts: { ...ASSEMBLED, screws: { offset: up(0.5) } },
        stagger: {
          order: ['display', 'lid', 'hinge', 'motherboard', 'heatpipes', 'fan', 'ramB', 'ramA', 'ssd', 'battery', 'bottomCover'],
          each: 0.022,
        },
        u: { dof: 0, fault: 0, fixed: 0 },
      },
      { at: 0.58, ease: 'back.out(2.2)', parts: { screws: { offset: [0, 0, 0] } } },
      {
        at: 0.74,
        ease: 'power3.inOut',
        root: UPRIGHT,
        camera: { position: [3.0, 2.0, 7.2], target: [0, 0.6, -0.2], frame: [0.17, 0], fov: 30 },
        cameraMobile: { position: [2.0, 2.4, 7.8], target: [0, 0.6, -0.2], frame: [0, 0.2], fov: 30 },
      },
      { at: 0.86, ease: 'power2.out', u: { lidOpen: 1, screen: 1, boot: 0, tilt: 1, fan: 0.4 } },
      {
        at: 1,
        ease: 'power1.inOut',
        camera: { position: [2.6, 2.3, 7.6], target: [0, 0.95, -0.35], frame: [0.18, 0], fov: 30 },
        cameraMobile: { position: [1.8, 2.5, 7.8], target: [0, 0.95, -0.35], frame: [0, 0.2], fov: 30 },
        u: { boot: 1 },
      },
    ],
  },
  {
    id: 'shelf',
    nav: 'The shelf',
    length: 2.6,
    screen: 'product',
    still: 0.5,
    keys: [
      {
        at: 0.35,
        ease: 'power3.inOut',
        camera: { position: [0.6, 3.4, 11.5], target: [0, 0.75, -0.6], frame: [0, 0.2], fov: 30 },
        cameraMobile: { position: [0.4, 4.6, 12.5], target: [0, 0.55, -0.6], frame: [0, 0.3], fov: 30 },
        u: { shelf: 1, key: 1.1, rim: 2.4 },
      },
    ],
  },
  {
    id: 'track',
    nav: 'Track a repair',
    length: 1.6,
    screen: 'tracker',
    still: 0.5,
    keys: [
      {
        at: 0.35,
        ease: 'power3.inOut',
        camera: { position: [0.9, 2.45, 3.9], target: [0, 1.15, -1.35], frame: [0.2, 0], fov: 30 },
        cameraMobile: { position: [0.3, 2.6, 4.2], target: [0, 1.15, -1.35], frame: [0, 0.22], fov: 30 },
        u: { shelf: 0, tilt: 0.4 },
      },
    ],
  },
  {
    id: 'book',
    nav: 'Book a repair',
    length: 1.8,
    screen: 'desktop',
    still: 0.5,
    keys: [
      {
        at: 0.35,
        ease: 'power3.inOut',
        camera: { position: [-3.6, 2.3, 7.6], target: [0, 0.8, -0.3], frame: [0.3, 0], fov: 30 },
        cameraMobile: { position: [-2.0, 2.6, 8.2], target: [0, 0.8, -0.3], frame: [0, 0.24], fov: 30 },
        u: { tilt: 1 },
      },
    ],
  },
  {
    id: 'find-us',
    nav: 'Find us',
    length: 1.8,
    screen: 'desktop',
    still: 1,
    keys: [
      {
        at: 0.3,
        ease: 'power2.inOut',
        camera: { position: [0.5, 5.6, 4.6], target: [0, 0.2, 0.1], frame: [0.2, 0], fov: 30 },
        cameraMobile: { position: [0.3, 6.6, 5.4], target: [0, 0.2, 0.1], frame: [0, 0.22], fov: 30 },
        u: { tilt: 0 },
      },
      { at: 0.85, ease: 'power2.inOut', u: { lidOpen: 0, screen: 0, logo: 1, key: 0.4, rim: 2.8 } },
    ],
  },
]

export const totalLength = chapters.reduce((a, c) => a + c.length, 0)
export const chapterById = (id: string) => chapters.find((c) => c.id === id)
export const navChapters = chapters.filter((c) => c.nav)
