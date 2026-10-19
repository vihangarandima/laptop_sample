import gsap from 'gsap'
import { chapters, totalLength, type Chapter, type Uniforms, type V3 } from '@/content/chapters'
import { PART_NAMES, type PartName } from './parts'

/**
 * The rig is a plain mutable object. The GSAP timeline tweens it; the render loop copies it
 * onto three.js objects every frame. React never re-renders from it.
 */
export type PartRig = { x: number; y: number; z: number; rx: number; ry: number; rz: number; glow: number; dim: number }
export type Rig = {
  cam: { x: number; y: number; z: number; tx: number; ty: number; tz: number; fx: number; fy: number; fov: number }
  root: { x: number; y: number; z: number; rx: number; ry: number; rz: number }
  u: Uniforms
  parts: Record<PartName, PartRig>
}

export function createRig(mobile: boolean): Rig {
  const k0 = chapters[0].keys[0]
  const cam = (mobile && k0.cameraMobile) || k0.camera!
  const u = k0.u as Uniforms
  return {
    cam: {
      x: cam.position[0], y: cam.position[1], z: cam.position[2],
      tx: cam.target[0], ty: cam.target[1], tz: cam.target[2],
      fx: cam.frame?.[0] ?? 0, fy: cam.frame?.[1] ?? 0, fov: cam.fov ?? 30,
    },
    root: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 },
    u: { ...u },
    parts: Object.fromEntries(
      PART_NAMES.map((p) => [p, { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, glow: 0, dim: 0 }]),
    ) as Record<PartName, PartRig>,
  }
}

/** The rig instance shared by the timeline and the scene. Created on the client only. */
export const rigRef: { current: Rig | null } = { current: null }

const v3 = (v: V3, a: string, b: string, c: string) => ({ [a]: v[0], [b]: v[1], [c]: v[2] })

/**
 * Compile the chapter data into one paused timeline. Time unit = viewport heights,
 * so chapter `id` starts at label `id` and the total duration equals `totalLength`.
 *
 * Hold semantics: every property group tweens from max(its last keyframe, the previous
 * keyframe) to the current keyframe, so values hold until just before they change.
 */
export function buildTimeline(rig: Rig, mobile: boolean) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut', immediateRender: false } })
  const last: Record<string, number> = {}
  let t = 0
  let prevAt = 0

  const tween = (key: string, target: object, vars: gsap.TweenVars, at: number, ease: string | undefined, delay = 0) => {
    const start = Math.max(last[key] ?? 0, prevAt) + delay
    const duration = Math.max(0.0001, at - start)
    tl.to(target, { ...vars, duration, ease: ease ?? 'power2.inOut' }, Math.min(start, at - 0.0001))
    last[key] = at
  }

  for (const ch of chapters) {
    tl.addLabel(ch.id, t)
    for (const k of ch.keys) {
      const at = t + k.at * ch.length
      const cam = (mobile && k.cameraMobile) || k.camera
      if (cam) {
        tween('cam', rig.cam, {
          ...v3(cam.position, 'x', 'y', 'z'),
          ...v3(cam.target, 'tx', 'ty', 'tz'),
          fx: cam.frame?.[0] ?? 0,
          fy: cam.frame?.[1] ?? 0,
          fov: cam.fov ?? rig.cam.fov,
        }, at, k.ease)
      }
      if (k.root) {
        const vars: gsap.TweenVars = {}
        if (k.root.position) Object.assign(vars, v3(k.root.position, 'x', 'y', 'z'))
        if (k.root.rotation) Object.assign(vars, v3(k.root.rotation, 'rx', 'ry', 'rz'))
        tween('root', rig.root, vars, at, k.ease)
      }
      for (const [name, value] of Object.entries(k.u ?? {})) {
        tween(`u.${name}`, rig.u, { [name]: value }, at, k.ease)
      }
      for (const [name, pose] of Object.entries(k.parts ?? {})) {
        const p = name as PartName
        const vars: gsap.TweenVars = {}
        if (pose.offset) Object.assign(vars, v3(pose.offset, 'x', 'y', 'z'))
        if (pose.rotation) Object.assign(vars, v3(pose.rotation, 'rx', 'ry', 'rz'))
        if (pose.glow !== undefined) vars.glow = pose.glow
        if (pose.dim !== undefined) vars.dim = pose.dim
        const i = k.stagger ? k.stagger.order.indexOf(p) : -1
        const delay = i >= 0 ? i * k.stagger!.each * ch.length : 0
        tween(`p.${p}`, rig.parts[p], vars, at, k.ease, delay)
      }
      prevAt = at
    }
    t += ch.length
  }
  tl.set({}, {}, totalLength)
  return tl
}

/** Chapter start times in timeline units. */
export const chapterStarts: Record<string, number> = (() => {
  const out: Record<string, number> = {}
  let t = 0
  for (const c of chapters) {
    out[c.id] = t
    t += c.length
  }
  return out
})()

export const stillTime = (c: Chapter) => chapterStarts[c.id] + (c.still ?? 0.5) * c.length
