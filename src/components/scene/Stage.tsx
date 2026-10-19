'use client'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { brand } from '@/config/brand'
import type { Product } from '@/lib/data/types'
import type { Uniforms } from '@/content/chapters'
import { story, useStory } from '@/lib/store'
import { rigRef } from '@/lib/timeline'
import type { Tier } from '@/lib/quality'
import { roundedBox } from './geometry'
import { ScreenPainter } from './screenPainter'

const BG = brand.colors.background

/** Studio lighting built locally (no CDN HDRIs), plinth, floor, grounding shadow. */
export function Stage({ tier }: { tier: Tier }) {
  const plinth = useMemo(() => roundedBox(22, 0.16, 3.8, 0.03, 2), [])
  return (
    <>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 11, 24]} />
      <Environment resolution={256} frames={1} environmentIntensity={0.65}>
        <Lightformer form="rect" intensity={2.2} position={[0, 6, -2]} rotation-x={Math.PI / 2} scale={[12, 3, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[-7, 2, 1]} rotation-y={Math.PI / 2} scale={[8, 1.4, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[7, 1.5, -1]} rotation-y={-Math.PI / 2} scale={[8, 0.8, 1]} />
        <Lightformer form="ring" color={brand.colors.accent} intensity={0.5} position={[4, 3, 5]} scale={2.5} />
      </Environment>
      <mesh geometry={plinth} position={[0, -0.08, -0.4]}>
        <meshStandardMaterial color="#121315" roughness={0.82} metalness={0.2} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.161, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#0a0b0c" roughness={1} />
      </mesh>
      <ContactShadows
        key={`${tier.shadowRes}-${tier.shadowLive}`}
        position={[0, 0.002, -0.2]}
        scale={[11, 5.5]}
        blur={2.6}
        far={4.5}
        opacity={0.62}
        resolution={tier.shadowRes}
        frames={tier.shadowLive ? Infinity : 1}
        color="#000000"
      />
    </>
  )
}

/** Stock laptops that rise onto the plinth in the shelf chapter. Simplified, instanced-light. */
export function Shelf({ products }: { products: Product[] }) {
  const group = useRef<THREE.Group>(null)
  const slots = [-7.2, -3.7, 3.7, 7.2]
  const stock = products.slice(0, 4)
  useFrame(() => {
    const rig = rigRef.current
    const g = group.current
    if (!rig || !g) return
    const v = rig.u.shelf
    // stay visible until the scene is ready so compileAsync compiles these shaders up front
    // (renderer.compile skips invisible objects → otherwise a hitch the first time they appear)
    g.visible = v > 0.002 || !story.getState().ready
    g.children.forEach((c, i) => {
      const lag = Math.min(1, Math.max(0, v * 1.4 - (i % 2) * 0.25))
      c.position.y = (1 - lag) * -0.9
    })
  })
  return (
    <group ref={group}>
      {stock.map((p, i) => (
        <ShelfLaptop key={p.id} product={p} x={slots[i]} />
      ))}
    </group>
  )
}

function ShelfLaptop({ product, x }: { product: Product; x: number }) {
  const base = useMemo(() => roundedBox(3.1, 0.16, 2.15, 0.05, 2), [])
  const lid = useMemo(() => roundedBox(3.1, 0.05, 2.15, 0.02, 2), [])
  const painter = useMemo(() => {
    const p = new ScreenPainter(512, 320)
    p.paint({ mode: 'product', u: { boot: 1, heat: 0, glitch: 0 } as Uniforms, product, trackerText: '', ticket: null, ticketState: 'idle', time: 0 })
    return p
  }, [product])
  useEffect(() => () => painter.dispose(), [painter])
  const s = product.look.scale
  return (
    <group position={[x, -0.9, -0.9]} rotation-y={-x * 0.06} scale={s}>
      <mesh geometry={base} position={[0, 0.08, 0]}>
        <meshStandardMaterial color={product.look.body} metalness={1} roughness={0.36} />
      </mesh>
      <group position={[0, 0.16, -1.075]} rotation-x={-1.85}>
        <mesh geometry={lid} position={[0, 0.025, 1.075]}>
          <meshStandardMaterial color={product.look.body} metalness={1} roughness={0.36} />
        </mesh>
        <mesh position={[0, -0.002, 1.1]} rotation-x={Math.PI / 2}>
          <planeGeometry args={[2.86, 1.79]} />
          <meshBasicMaterial map={painter.texture} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

export function useCatalog() {
  return useStory((s) => s.catalog)
}
