'use client'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { REST } from '@/lib/layout'
import { Part } from '../Part'
import { Instanced, type Inst } from '../Instanced'
import { flatExtrude, roundedBox, roundedHole, roundedRect } from '../geometry'
import { WARNING, type Materials } from '../materials'
import { batteryLabel, boardTextures, stickerLabel } from '../labels'

/* The visible face of every internal part is its -Y face: in the laptop it faces the bottom
 * cover, and during the teardown (laptop upside down) it faces up toward the camera. */
const FACE_DOWN: [number, number, number] = [Math.PI / 2, 0, 0]
/** Same face, but printed so it reads upright while the laptop is upside down (teardown view). */
const FACE_DOWN_READ: [number, number, number] = [Math.PI / 2, 0, Math.PI]

/** Create once, dispose on unmount (for textures/materials made by hand). */
function useDisposable<T extends { dispose(): void }>(make: () => T) {
  const [v] = useState(make)
  useEffect(() => () => v.dispose(), [v])
  return v
}

export function Battery({ mat, seg }: { mat: Materials; seg: number }) {
  const body = useMemo(() => roundedBox(2.5, 0.05, 0.8, 0.02, seg), [seg])
  const label = useDisposable(batteryLabel)
  const labelMat = useDisposable(() => new THREE.MeshStandardMaterial({ map: label, roughness: 0.55, metalness: 0.1 }))
  return (
    <Part name="battery" position={REST.battery}>
      <mesh geometry={body} material={mat.batteryWrap} />
      <mesh position={[0, -0.0256, 0]} rotation={FACE_DOWN_READ} material={labelMat}>
        <planeGeometry args={[2.44, 0.78]} />
      </mesh>
      <mesh position={[0.4, 0, -0.44]} material={mat.plastic}>
        <boxGeometry args={[0.3, 0.03, 0.1]} />
      </mesh>
    </Part>
  )
}

function rand(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

/** Scan uniform shared by the trace material; Director writes it. */
export const boardUniforms = { uScan: { value: 0 }, uGlow: { value: 0.25 } }

export function Motherboard({ mat, seg, smd }: { mat: Materials; seg: number; smd: number }) {
  const board = useMemo(() => roundedBox(2.9, 0.016, 1.1, 0.01, Math.min(seg, 2)), [seg])
  const tex = useMemo(() => boardTextures(11), [])
  useEffect(() => () => { tex.map.dispose(); tex.emissive.dispose() }, [tex])
  const traceMat = useDisposable(() => {
    const m = new THREE.MeshStandardMaterial({
      map: tex.map,
      emissiveMap: tex.emissive,
      emissive: new THREE.Color('#5fe3ff'),
      emissiveIntensity: 1.6,
      roughness: 0.5,
      metalness: 0.2,
    })
    m.userData.keep = true
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uScan = boardUniforms.uScan
      shader.uniforms.uGlow = boardUniforms.uGlow
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uScan;\nuniform float uGlow;')
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          float sx = vEmissiveMapUv.x;
          float lit = step(sx, uScan);
          float band = smoothstep(uScan - 0.08, uScan, sx) * (1.0 - step(uScan, sx));
          totalEmissiveRadiance *= uGlow * 0.15 + lit * 0.9 + band * 2.5;`,
        )
    }
    return m
  })

  const chipGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const capGeo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 12), [])
  const { chips, caps } = useMemo(() => {
    const r = rand(5)
    const chips: Inst[] = []
    const caps: Inst[] = []
    const blocked = (x: number, z: number) =>
      (Math.abs(x + 0.15) < 0.32 && Math.abs(z) < 0.26) || // CPU
      (x < -0.55 && x > -1.42 && z > -0.18) || // RAM area (front-left)
      (x > 0.55 && Math.abs(z + 0.06) < 0.42) || // fan area
      (x < -0.5 && z < -0.32) // SSD area
    let guard = 0
    while (chips.length < smd * 0.35 && guard++ < 4000) {
      const x = (r() - 0.5) * 2.7
      const z = (r() - 0.5) * 0.98
      if (blocked(x, z)) continue
      const w = 0.03 + r() * (r() > 0.85 ? 0.12 : 0.05)
      const d = 0.03 + r() * (r() > 0.85 ? 0.1 : 0.04)
      const h = 0.006 + r() * 0.008
      chips.push({ p: [x, -0.008 - h / 2, z], s: [w, h, d] })
    }
    guard = 0
    while (caps.length < smd * 0.45 && guard++ < 4000) {
      const x = (r() - 0.5) * 2.7
      const z = (r() - 0.5) * 0.98
      if (blocked(x, z)) continue
      const rad = 0.008 + r() * 0.012
      const h = 0.01 + r() * 0.02
      caps.push({ p: [x, -0.008 - h / 2, z], s: [rad, h, rad] })
    }
    return { chips, caps }
  }, [smd])

  const faultMat = useDisposable(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#141516', emissive: WARNING.clone(), emissiveIntensity: 0, roughness: 0.4, toneMapped: false })
    m.userData.keep = true
    return m
  })
  const scanMat = useDisposable(() => {
    const m = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#5fe3ff').multiplyScalar(2.2),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    m.userData.keep = true
    return m
  })

  return (
    <Part name="motherboard" position={REST.motherboard}>
      <mesh geometry={board} material={mat.pcb} />
      <mesh name="traces" position={[0, -0.0083, 0]} rotation={FACE_DOWN_READ} material={traceMat}>
        <planeGeometry args={[2.86, 1.06]} />
      </mesh>
      {/* CPU package */}
      <mesh position={[-0.15, -0.013, 0]} material={mat.pcbDark}>
        <boxGeometry args={[0.38, 0.01, 0.3]} />
      </mesh>
      <mesh position={[-0.15, -0.02, 0]} material={mat.silver}>
        <boxGeometry args={[0.2, 0.006, 0.15]} />
      </mesh>
      <Instanced geometry={chipGeo} material={mat.chip} items={chips} />
      <Instanced geometry={capGeo} material={mat.silver} items={caps} />
      {/* RAM sockets, M.2 slot, IO connectors */}
      {[0.28, -0.06].map((z) => (
        <mesh key={z} position={[-0.98, -0.014, z]} material={mat.plastic}>
          <boxGeometry args={[0.72, 0.012, 0.06]} />
        </mesh>
      ))}
      <mesh position={[-0.58, -0.012, -0.42]} material={mat.plastic}>
        <boxGeometry args={[0.06, 0.01, 0.24]} />
      </mesh>
      {[-1.3, 1.3].map((x) => (
        <mesh key={x} position={[x, -0.02, -0.5]} material={mat.silver}>
          <boxGeometry args={[0.14, 0.03, 0.06]} />
        </mesh>
      ))}
      {/* the faulty component the diagnosis finds */}
      <mesh name="faultChip" position={[-0.42, -0.016, 0.36]} material={faultMat}>
        <boxGeometry args={[0.06, 0.014, 0.045]} />
      </mesh>
      <mesh name="scanBar" position={[0, -0.03, 0]} rotation={FACE_DOWN} material={scanMat}>
        <planeGeometry args={[0.025, 1.12]} />
      </mesh>
    </Part>
  )
}

export function Fan({ mat, seg }: { mat: Materials; seg: number }) {
  const intake = useMemo(() => {
    const s = roundedRect(0.66, 0.66, 0.12)
    const hole = new THREE.Path()
    hole.absarc(0, 0, 0.23, 0, Math.PI * 2, true)
    s.holes.push(hole)
    const g = flatExtrude(s, 0.007, 0.002, 1)
    g.translate(0, -0.032, 0)
    return g
  }, [])
  const wall = useMemo(() => {
    const s = roundedRect(0.66, 0.66, 0.12)
    s.holes.push(roundedHole(0.62, 0.62, 0.1))
    const g = flatExtrude(s, 0.05, 0.002, 1)
    g.translate(0, -0.026, 0)
    return g
  }, [])
  const back = useMemo(() => {
    const g = flatExtrude(roundedRect(0.66, 0.66, 0.12), 0.006, 0.002, 1)
    g.translate(0, 0.022, 0)
    return g
  }, [])
  const hub = useMemo(() => new THREE.CylinderGeometry(0.075, 0.075, 0.042, 32), [])
  const blade = useMemo(() => new THREE.BoxGeometry(0.15, 0.036, 0.006), [])
  const blades = useMemo<Inst[]>(
    () =>
      Array.from({ length: 23 }, (_, i) => {
        const a = (i / 23) * Math.PI * 2
        return { p: [Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15] as [number, number, number], r: [0, -a + 0.45, 0] as [number, number, number] }
      }),
    [],
  )
  void seg
  return (
    <Part name="fan" position={REST.fan}>
      <mesh geometry={intake} material={mat.darkMetal} />
      <mesh geometry={wall} material={mat.plastic} />
      <mesh geometry={back} material={mat.darkMetal} />
      <group name="blades">
        <mesh geometry={hub} material={mat.plastic} />
        <Instanced geometry={blade} material={mat.fanBlade} items={blades} />
      </group>
    </Part>
  )
}

export function HeatPipes({ mat }: { mat: Materials }) {
  const pipes = useMemo(() => {
    const mk = (dz: number) => {
      const curve = new THREE.CatmullRomCurve3(
        [
          [-0.34, -0.4],
          [0.05, -0.42],
          [0.4, -0.5],
          [0.62, -0.72],
          [0.9, -0.9],
          [1.32, -0.92],
        ].map(([x, z]) => new THREE.Vector3(x, 0, z + dz)),
      )
      const g = new THREE.TubeGeometry(curve, 64, 0.028, 10, false)
      g.scale(1, 0.45, 1)
      return g
    }
    return [mk(0), mk(-0.075)]
  }, [])
  const plate = useMemo(() => roundedBox(0.44, 0.012, 0.36, 0.01, 2), [])
  const fin = useMemo(() => new THREE.BoxGeometry(0.006, 0.05, 0.13), [])
  const fins = useMemo<Inst[]>(() => Array.from({ length: 34 }, (_, i) => ({ p: [0.66 + i * 0.019, 0, -0.95] })), [])
  return (
    <Part name="heatpipes" position={REST.heatpipes}>
      {pipes.map((g, i) => (
        <mesh key={i} geometry={g} material={mat.copper} />
      ))}
      <mesh geometry={plate} material={mat.copper} position={[-0.15, 0.004, -0.44]} />
      <Instanced geometry={fin} material={mat.silver} items={fins} />
    </Part>
  )
}

function Sodimm({ mat, label }: { mat: Materials; label: THREE.Texture }) {
  const pcb = useMemo(() => roundedBox(0.67, 0.01, 0.3, 0.004, 1), [])
  const chip = useMemo(() => new THREE.BoxGeometry(0.12, 0.008, 0.1), [])
  const pin = useMemo(() => new THREE.BoxGeometry(0.01, 0.011, 0.045), [])
  const chips = useMemo<Inst[]>(() => [-0.22, -0.075, 0.075, 0.22].map((x) => ({ p: [x, -0.009, -0.03] })), [])
  const pins = useMemo<Inst[]>(() => Array.from({ length: 40 }, (_, i) => ({ p: [-0.3 + i * 0.0155, 0, 0.128] })), [])
  const labelMat = useMemo(() => new THREE.MeshStandardMaterial({ map: label, roughness: 0.6 }), [label])
  return (
    <>
      <mesh geometry={pcb} material={mat.pcbDark} />
      <Instanced geometry={chip} material={mat.chip} items={chips} />
      <Instanced geometry={pin} material={mat.gold} items={pins} />
      <mesh position={[0, -0.0135, -0.03]} rotation={FACE_DOWN_READ} material={labelMat}>
        <planeGeometry args={[0.5, 0.11]} />
      </mesh>
    </>
  )
}

export function Ram({ mat }: { mat: Materials }) {
  const label = useDisposable(() => stickerLabel('16 GB', 'DDR5 SODIMM'))
  return (
    <>
      <Part name="ramA" position={REST.ramA}>
        <Sodimm mat={mat} label={label} />
      </Part>
      <Part name="ramB" position={REST.ramB}>
        <Sodimm mat={mat} label={label} />
      </Part>
    </>
  )
}

export function Ssd({ mat }: { mat: Materials }) {
  const label = useDisposable(() => stickerLabel('1 TB NVMe', 'M.2 2280'))
  const labelMat = useDisposable(() => new THREE.MeshStandardMaterial({ map: label, roughness: 0.6 }))
  const pin = useMemo(() => new THREE.BoxGeometry(0.035, 0.009, 0.01), [])
  const pins = useMemo<Inst[]>(() => Array.from({ length: 14 }, (_, i) => ({ p: [0.39, 0, -0.09 + i * 0.0135] })), [])
  return (
    <Part name="ssd" position={REST.ssd}>
      <mesh material={mat.pcbDark}>
        <boxGeometry args={[0.8, 0.008, 0.22]} />
      </mesh>
      <mesh position={[-0.24, -0.009, 0]} material={mat.chip}>
        <boxGeometry args={[0.15, 0.01, 0.15]} />
      </mesh>
      <mesh position={[0.08, -0.0095, 0]} rotation={FACE_DOWN_READ} material={labelMat}>
        <planeGeometry args={[0.52, 0.17]} />
      </mesh>
      <Instanced geometry={pin} material={mat.gold} items={pins} />
    </Part>
  )
}
