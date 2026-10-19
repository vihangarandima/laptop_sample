'use client'
import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'

export type Inst = { p: [number, number, number]; s?: [number, number, number]; r?: [number, number, number] }

const m = new THREE.Matrix4()
const q = new THREE.Quaternion()
const e = new THREE.Euler()
const pv = new THREE.Vector3()
const sv = new THREE.Vector3()

/** Raw InstancedMesh (one draw call) for repeated details: keys, chips, screws, fins. */
export function Instanced({
  geometry,
  material,
  items,
  name,
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  items: Inst[]
  name?: string
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    items.forEach((it, i) => {
      e.set(...(it.r ?? [0, 0, 0]))
      q.setFromEuler(e)
      pv.set(...it.p)
      sv.set(...(it.s ?? [1, 1, 1]))
      mesh.setMatrixAt(i, m.compose(pv, q, sv))
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere() // frustum culling must see every instance
  }, [items])
  return <instancedMesh ref={ref} name={name} args={[geometry, material, items.length]} />
}
