'use client'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { L, REST } from '@/lib/layout'
import { Part } from '../Part'
import { flatExtrude, roundedBox, roundedRect } from '../geometry'
import { ACCENT, type Materials } from '../materials'
import { lidMark } from '../labels'

const FACE_DOWN: [number, number, number] = [Math.PI / 2, 0, 0]
export const SCREEN_W = 2.86
export const SCREEN_H = 1.7875 // 16:10

/** Lid shell (rotates at the hinge), glowing mark, and the display panel inside it. */
export function Lid({ mat, seg, screen }: { mat: Materials; seg: number; screen: THREE.Texture }) {
  const shell = useMemo(() => flatExtrude(roundedRect(L.W, L.D, L.corner), L.lidH, 0.008, seg), [seg])
  const bezel = useMemo(() => roundedBox(L.W - 0.05, 0.01, L.D - 0.05, 0.004, 2), [])
  const mark = useMemo(() => lidMark(), [])
  const logoMat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      color: ACCENT.clone(),
      alphaMap: mark,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      toneMapped: false,
    })
    m.userData.keep = true
    return m
  }, [mark])
  const screenMat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ map: screen, toneMapped: false, color: new THREE.Color(0, 0, 0) })
    m.userData.keep = true
    return m
  }, [screen])
  const glassMat = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color: '#000000',
      metalness: 0.9,
      roughness: 0.06,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    })
    m.userData.keep = true
    return m
  }, [])
  useEffect(() => () => { mark.dispose(); logoMat.dispose(); screenMat.dispose(); glassMat.dispose() }, [mark, logoMat, screenMat, glassMat])

  return (
    <Part name="lid" position={REST.lid}>
      <mesh geometry={shell} material={mat.aluminium} position={[0, 0, L.D / 2]} />
      <mesh name="logo" material={logoMat} position={[0, L.lidH + 0.0012, L.D / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.44, 0.44]} />
      </mesh>
      <pointLight name="spill" position={[0, -0.8, L.D * 0.55]} intensity={0} distance={6} decay={2} color="#cdefff" />
      <Part name="display" position={REST.display}>
        <mesh geometry={bezel} material={mat.glassBlack} />
        <mesh name="screen" material={screenMat} position={[0, -0.0055, 0.035]} rotation={FACE_DOWN}>
          <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        </mesh>
        <mesh material={glassMat} position={[0, -0.0062, 0]} rotation={FACE_DOWN}>
          <planeGeometry args={[L.W - 0.07, L.D - 0.07]} />
        </mesh>
        <mesh position={[0, -0.0056, L.D / 2 - 0.06]} material={mat.plastic} rotation={FACE_DOWN}>
          <circleGeometry args={[0.012, 16]} />
        </mesh>
      </Part>
    </Part>
  )
}
