import * as THREE from 'three'
import { brand } from '@/config/brand'

/**
 * Material factories. Each part clones what it uses at registration (see partLook.ts),
 * so per-part dimming/glow never leaks between parts. Shader programs are still shared.
 */
export const ACCENT = new THREE.Color(brand.colors.accent)
export const WARNING = new THREE.Color(brand.colors.warning)

export const makeMaterials = () => {
  const aluminium = new THREE.MeshPhysicalMaterial({
    color: '#8f9398',
    metalness: 1,
    roughness: 0.34,
    anisotropy: 0.55,
    clearcoat: 0.15,
    clearcoatRoughness: 0.4,
  })
  aluminium.userData.body = true

  return {
    aluminium,
    darkMetal: new THREE.MeshStandardMaterial({ color: '#2a2d31', metalness: 0.85, roughness: 0.42 }),
    plastic: new THREE.MeshStandardMaterial({ color: '#16181b', metalness: 0.1, roughness: 0.7 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#0d0e10', metalness: 0, roughness: 0.95 }),
    keycap: new THREE.MeshStandardMaterial({ color: '#1c1e21', metalness: 0.2, roughness: 0.55 }),
    // Standard (not Physical) wherever clearcoat/anisotropy isn't visible: each distinct material
    // feature set is another shader program, and program compile dominates cold load (see webgl-performance).
    trackpad: new THREE.MeshStandardMaterial({ color: '#25282c', metalness: 0.4, roughness: 0.22 }),
    glassBlack: new THREE.MeshStandardMaterial({ color: '#050607', metalness: 0.5, roughness: 0.06 }),
    pcb: new THREE.MeshStandardMaterial({ color: '#0e2a24', metalness: 0.2, roughness: 0.55 }),
    pcbDark: new THREE.MeshStandardMaterial({ color: '#10161a', metalness: 0.2, roughness: 0.6 }),
    chip: new THREE.MeshStandardMaterial({ color: '#121314', metalness: 0.3, roughness: 0.38 }),
    silver: new THREE.MeshStandardMaterial({ color: '#b9bdc2', metalness: 1, roughness: 0.28 }),
    gold: new THREE.MeshStandardMaterial({ color: '#d6a84b', metalness: 1, roughness: 0.24 }),
    copper: new THREE.MeshStandardMaterial({ color: '#c47b4b', metalness: 1, roughness: 0.3 }),
    batteryWrap: new THREE.MeshStandardMaterial({ color: '#1d2023', metalness: 0.15, roughness: 0.6 }),
    fanBlade: new THREE.MeshStandardMaterial({ color: '#202327', metalness: 0.1, roughness: 0.6, side: THREE.DoubleSide }),
  }
}
export type Materials = ReturnType<typeof makeMaterials>

/** Canvas helper: returns a CanvasTexture with sRGB colour space (colour data). */
export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  draw(ctx, w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
