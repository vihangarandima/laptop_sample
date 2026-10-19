# Timeline data shape

```ts
type Vec3 = [number, number, number]
type PartPose = { offset?: Vec3; rotation?: Vec3; glow?: number; dim?: number }

type Keyframe = {
  at: number                  // 0..1 within the chapter
  ease?: string               // gsap ease for the tween ARRIVING at this keyframe
  camera?: { position: Vec3; target: Vec3; fov?: number }
  cameraMobile?: { position: Vec3; target: Vec3; fov?: number }
  lights?: { key?: number; rim?: number; warn?: number; accent?: number }
  uniforms?: { lidOpen?: number; heat?: number; glitch?: number; scan?: number; boot?: number; dof?: number }
  parts?: Partial<Record<PartName, PartPose>>
  stagger?: { order: PartName[]; each: number }   // spread part tweens of this keyframe
}

type Chapter = {
  id: string; label: string     // label is for the side indicator
  length: number                // viewport heights of scroll
  keys: Keyframe[]
  focusPart?: PartName          // service stops
}
```

Builder sketch (gsap 3.15):

```ts
export function buildTimeline(chapters: Chapter[], rig: Rig, mobile: boolean) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } })
  let t = 0, prevAt = 0
  for (const ch of chapters) {
    tl.addLabel(ch.id, t)
    for (const k of ch.keys) {
      const at = t + k.at * ch.length
      const dur = Math.max(0.0001, at - prevAt)
      // each property group tweens from where it is (previous keyframe) to here
      const cam = mobile && k.cameraMobile ? k.cameraMobile : k.camera
      if (cam) tl.to(rig.camPos, { x: cam.position[0], y: …, duration: dur, ease: k.ease }, prevAt)
      …
      prevAt = at
    }
    t += ch.length
  }
  tl.to({}, { duration: 0 }, t)   // pad so total duration == sum(lengths)
  return tl
}
```
Because the timeline's total duration equals the sum of chapter lengths and the story wrapper's
height equals the same sum (in viewport heights), a label's time maps linearly onto scroll.

**Hold semantics (verified in the prototype):** a value *holds* until the keyframe before the one that
changes it. Each tween therefore starts at `max(lastAt[group], previousKeyframeAt)` and ends at this
keyframe. The first version started tweens at the group's last mention (`lastAt[group]`), and the
parts began drifting apart from scroll 0 because their previous mention was the very first keyframe.
Also pass `immediateRender: false` to every `.to()`, and make the rig's initial values equal
chapter 0's first keyframe. With both, a pixel diff of the same scroll position reached forwards
and backwards was <= 7/255 (bloom noise only).
