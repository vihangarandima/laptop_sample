'use client'
import { useMemo } from 'react'
import * as THREE from 'three'
import { L, REST } from '@/lib/layout'
import { Part } from '../Part'
import { Instanced, type Inst } from '../Instanced'
import { flatExtrude, roundedBox, roundedHole, roundedRect } from '../geometry'
import type { Materials } from '../materials'

/** Bottom cover with vents and feet; the screws that hold it. */
export function BottomCover({ mat, seg }: { mat: Materials; seg: number }) {
  const geo = useMemo(() => {
    const s = roundedRect(L.W, L.D, L.corner)
    for (const cx of [-0.62, 0.62]) for (let k = 0; k < 7; k++) s.holes.push(roundedHole(0.9, 0.022, 0.011, cx, 0.5 + k * 0.055))
    return flatExtrude(s, L.coverH, 0.006, seg)
  }, [seg])
  const foot = useMemo(() => roundedBox(2.5, 0.014, 0.08, 0.006, seg), [seg])
  return (
    <Part name="bottomCover" position={REST.bottomCover}>
      <mesh geometry={geo} material={mat.aluminium} />
      <mesh geometry={foot} material={mat.rubber} position={[0, -0.005, 0.86]} />
      <mesh geometry={foot} material={mat.rubber} position={[0, -0.005, -0.86]} />
    </Part>
  )
}

export function Screws({ mat }: { mat: Materials }) {
  const geo = useMemo(() => new THREE.CylinderGeometry(0.024, 0.024, 0.008, 16), [])
  const items = useMemo<Inst[]>(() => {
    const xs = [-1.42, -0.5, 0.5, 1.42]
    const out: Inst[] = []
    for (const x of xs) for (const z of [-0.98, 0.98]) out.push({ p: [x, -0.003, z] })
    out.push({ p: [0, -0.003, 0.2] }, { p: [0, -0.003, -0.4] })
    return out
  }, [])
  return (
    <Part name="screws" position={REST.screws}>
      <Instanced geometry={geo} material={mat.darkMetal} items={items} />
    </Part>
  )
}

const ROWS: number[][] = [
  Array(15).fill(1),
  [...Array(13).fill(1), 2],
  [1.5, ...Array(12).fill(1), 1.5],
  [1.75, ...Array(11).fill(1), 2.25],
  [2.25, ...Array(10).fill(1), 2.75],
  [1.25, 1, 1.25, 6, 1.25, 1, 1, 1, 1.25],
]

/** Top case: walls, palm rest, keyboard (instanced caps) and trackpad. */
export function KeyboardDeck({ mat, seg }: { mat: Materials; seg: number }) {
  const walls = useMemo(() => {
    const s = roundedRect(L.W, L.D, L.corner)
    s.holes.push(roundedHole(L.W - 0.07, L.D - 0.07, L.corner - 0.035))
    const g = flatExtrude(s, 0.11, 0.004, seg)
    g.translate(0, L.coverH, 0)
    return g
  }, [seg])
  const top = useMemo(() => {
    const g = flatExtrude(roundedRect(L.W, L.D, L.corner), 0.026, 0.008, seg)
    g.translate(0, L.baseH - 0.026, 0)
    return g
  }, [seg])
  const well = useMemo(() => roundedBox(2.78, 0.004, 1.04, 0.03, 2), [])
  const pad = useMemo(() => roundedBox(1.2, 0.006, 0.74, 0.05, seg), [seg])
  const keyGeo = useMemo(() => roundedBox(1, 0.014, 1, 0.003, 2), [])
  const keys = useMemo<Inst[]>(() => {
    const width = 2.66
    const pitch = width / 15
    const out: Inst[] = []
    ROWS.forEach((row, r) => {
      let x = -width / 2
      const z = -0.8 + r * 0.168 + (r === 0 ? -0.02 : 0)
      const depth = r === 0 ? 0.1 : 0.145
      for (const u of row) {
        const w = u * pitch - 0.024
        out.push({ p: [x + (u * pitch) / 2, L.baseH + 0.006, z], s: [w, 1, depth] })
        x += u * pitch
      }
    })
    return out
  }, [])
  return (
    <Part name="keyboardDeck" position={REST.keyboardDeck}>
      <mesh geometry={walls} material={mat.aluminium} />
      <mesh geometry={top} material={mat.aluminium} />
      <mesh geometry={well} material={mat.plastic} position={[0, L.baseH + 0.0005, -0.38]} />
      <Instanced geometry={keyGeo} material={mat.keycap} items={keys} />
      <mesh geometry={pad} material={mat.trackpad} position={[0, L.baseH + 0.0005, 0.6]} />
    </Part>
  )
}

export function Hinge({ mat }: { mat: Materials }) {
  const barrel = useMemo(() => new THREE.CylinderGeometry(0.052, 0.052, 0.5, 20).rotateZ(Math.PI / 2), [])
  const bracket = useMemo(() => roundedBox(0.42, 0.012, 0.22, 0.01, 2), [])
  return (
    <Part name="hinge" position={REST.hinge}>
      {[-0.95, 0.95].map((x) => (
        <group key={x} position={[x, -0.012, 0.02]}>
          <mesh geometry={barrel} material={mat.darkMetal} />
          <mesh geometry={bracket} material={mat.silver} position={[0, -0.03, 0.13]} />
        </group>
      ))}
    </Part>
  )
}
