'use client'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { chapterById } from '@/content/chapters'
import { L } from '@/lib/layout'
import { getPart, PART_NAMES, restOf } from '@/lib/parts'
import { live, story } from '@/lib/store'
import { rigRef } from '@/lib/timeline'
import { ACCENT, WARNING } from './materials'
import { applyLook, commitBody, setBodyColor } from './partLook'
import { boardUniforms } from './laptop/Internals'
import type { ScreenPainter } from './screenPainter'

const target = new THREE.Vector3()
const tmp = new THREE.Vector3()
const ndc = new THREE.Vector3()
const DEFAULT_BODY = '#8f9398'

type Props = { root: React.RefObject<THREE.Group | null>; painter: ScreenPainter; screenHz: number }

/**
 * The only place the rig touches three.js. Runs every frame, mutates objects, never sets
 * React state. Camera, lights, part transforms, materials, screen and anchors.
 */
export function Director({ root, painter, screenHz }: Props) {
  const key = useRef<THREE.DirectionalLight>(null)
  const rim = useRef<THREE.SpotLight>(null)
  const warn = useRef<THREE.PointLight>(null)
  const accent = useRef<THREE.PointLight>(null)
  const heatGlow = useRef<THREE.Mesh>(null)
  const tilt = useRef({ x: 0, y: 0, scale: 1 })
  const paintClock = useRef(0)
  const elapsed = useRef(0)
  const cached = useRef<Record<string, THREE.Object3D | undefined>>({})

  // product selection → body colour (only when it changes)
  useEffect(
    () =>
      story.subscribe((s, prev) => {
        if (s.product !== prev.product) setBodyColor(s.product?.look.body ?? DEFAULT_BODY)
      }),
    [],
  )

  const heatTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')!
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    grd.addColorStop(0, 'rgba(255,255,255,1)')
    grd.addColorStop(0.4, 'rgba(255,255,255,0.35)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(c)
  }, [])
  useEffect(() => () => heatTex.dispose(), [heatTex])

  useFrame((state, rawDt) => {
    const rig = rigRef.current
    const laptop = root.current
    if (!rig || !laptop) return
    const dt = Math.min(rawDt, 1 / 20)
    elapsed.current += dt
    const t = elapsed.current
    const u = rig.u
    const { size } = state
    // use the frame's camera (mutating a value returned by useThree is flagged by the React Compiler lint)
    const camera = state.camera as THREE.PerspectiveCamera
    const s = story.getState()

    /* camera ------------------------------------------------------------ */
    const aspect = size.width / size.height
    const fit = aspect < 1 ? THREE.MathUtils.clamp(0.74 / aspect, 1, 1.7) : THREE.MathUtils.clamp(1.5 / aspect, 1, 1.5)
    target.set(rig.cam.tx, rig.cam.ty, rig.cam.tz)
    camera.position.set(rig.cam.x, rig.cam.y, rig.cam.z).sub(target).multiplyScalar(fit).add(target)
    camera.lookAt(target)
    if (camera.fov !== rig.cam.fov) {
      camera.fov = rig.cam.fov
    }
    camera.setViewOffset(size.width, size.height, -rig.cam.fx * size.width, rig.cam.fy * size.height, size.width, size.height)
    camera.updateProjectionMatrix()

    /* root: timeline pose + cursor tilt + product scale + fan strain ----- */
    const k = 1 - Math.exp(-6 * dt)
    tilt.current.x += (live.pointer.x * 0.2 * u.tilt - tilt.current.x) * k
    tilt.current.y += (live.pointer.y * 0.08 * u.tilt - tilt.current.y) * k
    const targetScale = s.product && s.chapter === 'shelf' ? s.product.look.scale : 1
    tilt.current.scale += (targetScale - tilt.current.scale) * k
    const jitter = u.heat * 0.0025
    laptop.position.set(
      rig.root.x + (jitter ? Math.sin(t * 91) * jitter : 0),
      rig.root.y + (jitter ? Math.sin(t * 77) * jitter : 0),
      rig.root.z,
    )
    laptop.rotation.set(rig.root.rx - tilt.current.y, rig.root.ry + tilt.current.x, rig.root.rz)
    laptop.scale.setScalar(tilt.current.scale)

    /* parts --------------------------------------------------------------- */
    for (const name of PART_NAMES) {
      const o = getPart(name)
      if (!o) continue
      const r = restOf(o)
      const p = rig.parts[name]
      o.position.set(r.px + p.x, r.py + p.y, r.pz + p.z)
      o.rotation.set(r.rx + p.rx, r.ry + p.ry, r.rz + p.rz)
      applyLook(name, p.dim, p.glow)
    }
    commitBody()
    const lid = getPart('lid')
    if (lid) lid.rotation.x -= u.lidOpen * L.lidOpenAngle

    const fan = getPart('fan')
    const blades = (cached.current.blades ??= fan?.getObjectByName('blades'))
    if (blades) blades.rotation.y += u.fan * Math.PI * 2 * dt

    /* screen -------------------------------------------------------------- */
    const ch = chapterById(s.chapter)
    paintClock.current += dt
    if (paintClock.current >= 1 / screenHz) {
      paintClock.current = 0
      painter.paint({
        mode: ch?.screen ?? 'desktop',
        u,
        product: s.product,
        trackerText: s.trackerText,
        ticket: s.ticket,
        ticketState: s.ticketState,
        time: t,
      })
    }
    const display = getPart('display')
    const screen = (cached.current.screen ??= display?.getObjectByName('screen')) as THREE.Mesh | undefined
    const flicker = u.glitch > 0.01 ? 1 - u.glitch * 0.35 * (Math.sin(t * 53) > 0.6 ? 1 : 0) : 1
    const bright = u.screen * flicker
    if (screen) (screen.material as THREE.MeshBasicMaterial).color.setScalar(bright * 1.05)
    const spill = (cached.current.spill ??= lid?.getObjectByName('spill')) as THREE.PointLight | undefined
    if (spill) spill.intensity = bright * 2.4 * u.lidOpen

    const logo = (cached.current.logo ??= lid?.getObjectByName('logo')) as THREE.Mesh | undefined
    if (logo) {
      const m = logo.material as THREE.MeshBasicMaterial
      m.opacity = 0.18 + 0.82 * u.logo
      m.color.copy(ACCENT).multiplyScalar(1 + u.logo * 1.6)
    }

    /* board diagnosis ----------------------------------------------------- */
    const board = getPart('motherboard')
    boardUniforms.uScan.value = u.scan * 1.08 - 0.04
    boardUniforms.uGlow.value = 0.25 + u.fixed * 0.6
    const scanBar = (cached.current.scanBar ??= board?.getObjectByName('scanBar')) as THREE.Mesh | undefined
    if (scanBar) {
      scanBar.position.x = (u.scan * 1.08 - 0.54) * 2.86
      ;(scanBar.material as THREE.MeshBasicMaterial).opacity = u.scan > 0.002 && u.scan < 0.998 ? 1 : 0
    }
    const fault = (cached.current.fault ??= board?.getObjectByName('faultChip')) as THREE.Mesh | undefined
    if (fault) {
      const m = fault.material as THREE.MeshStandardMaterial
      m.emissive.copy(WARNING).lerp(ACCENT, u.fixed)
      const pulse = u.fixed > 0.5 ? 1 : 0.55 + 0.45 * Math.sin(t * 9)
      m.emissiveIntensity = Math.max(u.fault, u.fixed) * pulse * 3.2
    }

    /* lights -------------------------------------------------------------- */
    if (key.current) key.current.intensity = u.key * 1.6
    if (rim.current) rim.current.intensity = u.rim * 22
    if (warn.current) {
      warn.current.intensity = u.warn * (0.85 + 0.15 * Math.sin(t * 13)) * 4
      warn.current.position.set(laptop.position.x, laptop.position.y + 0.05, laptop.position.z + 0.2)
    }
    if (heatGlow.current) {
      ;(heatGlow.current.material as THREE.MeshBasicMaterial).opacity = u.heat * 0.85
      heatGlow.current.position.set(laptop.position.x, 0.003, laptop.position.z)
    }

    /* anchors (service callout + hover label) ---------------------------- */
    const anchorName = ch?.service?.anchor
    const anchorObj = anchorName ? getPart(anchorName) : undefined
    if (accent.current) {
      accent.current.intensity = u.accent * 3
      if (anchorObj) {
        anchorObj.getWorldPosition(tmp)
        accent.current.position.lerp(tmp.add(ndc.set(0.6, 1.2, 1.4)), k)
      }
    }
    project(anchorObj, camera, size, live.anchor)
    project(s.hovered ? getPart(s.hovered) : undefined, camera, size, live.hoverAnchor)
  })

  return (
    <>
      <directionalLight ref={key} position={[-4, 6, 4]} intensity={0.3} color="#f3efe8" />
      <spotLight ref={rim} position={[-1.5, 4.5, -6]} angle={0.6} penumbra={0.9} intensity={60} color="#dfe9ff" distance={20} decay={1.6} />
      <pointLight ref={warn} intensity={0} distance={3.2} decay={2} color={WARNING} />
      <pointLight ref={accent} intensity={0} distance={5} decay={2} color={ACCENT} />
      <mesh ref={heatGlow} rotation-x={-Math.PI / 2} renderOrder={1}>
        <planeGeometry args={[5.5, 4.2]} />
        <meshBasicMaterial map={heatTex} color={WARNING} transparent opacity={0} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  )
}

function project(
  obj: THREE.Object3D | undefined,
  camera: THREE.Camera,
  size: { width: number; height: number },
  out: { x: number; y: number; visible: boolean },
) {
  if (!obj) {
    out.visible = false
    return
  }
  obj.getWorldPosition(ndc)
  ndc.project(camera)
  out.x = (ndc.x * 0.5 + 0.5) * size.width
  out.y = (-ndc.y * 0.5 + 0.5) * size.height
  out.visible = ndc.z < 1
}
