import * as THREE from 'three'
import { brand } from '@/config/brand'
import { canvasTexture } from './materials'

const MONO = '"Geist Mono", "JetBrains Mono", ui-monospace, monospace'
const SANS = '"Geist", ui-sans-serif, system-ui, sans-serif'

/** Battery: three cells, printed specs. Drawn once. */
export const batteryLabel = () =>
  canvasTexture(1024, 328, (g, w, h) => {
    g.fillStyle = '#1b1e21'
    g.fillRect(0, 0, w, h)
    const cellW = (w - 80) / 3
    for (let i = 0; i < 3; i++) {
      const x = 40 + i * cellW
      g.strokeStyle = '#3a3f45'
      g.lineWidth = 3
      g.strokeRect(x + 8, 28, cellW - 16, h - 56)
      g.fillStyle = '#c9cbc6'
      g.font = `600 30px ${MONO}`
      g.fillText(`CELL ${i + 1}`, x + 30, 80)
      g.fillStyle = '#8b8f93'
      g.font = `22px ${MONO}`
      g.fillText('Li-ion 3.85 V', x + 30, 118)
    }
    g.fillStyle = '#e8e6df'
    g.font = `700 34px ${SANS}`
    g.fillText(`${brand.name} POWER`, 70, h - 70)
    g.fillStyle = '#8b8f93'
    g.font = `22px ${MONO}`
    g.fillText('11.55 V  ·  56 Wh  ·  4830 mAh', 70, h - 40)
    g.fillStyle = brand.colors.warning
    g.fillRect(w - 150, h - 92, 90, 8)
  })

export const stickerLabel = (title: string, sub: string) =>
  canvasTexture(512, 160, (g, w, h) => {
    g.fillStyle = '#e9e7e1'
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#111'
    g.font = `700 44px ${SANS}`
    g.fillText(title, 24, 66)
    g.font = `26px ${MONO}`
    g.fillStyle = '#444'
    g.fillText(sub, 24, 118)
    g.fillStyle = '#0b0c0d'
    for (let i = 0; i < 26; i++) g.fillRect(w - 170 + i * 6, 30, i % 3 ? 2 : 4, 90)
  })

/**
 * Board silkscreen + traces. Returns the colour map and an emissive map (traces only)
 * that the diagnosis scan reveals.
 */
export function boardTextures(seed = 7) {
  let s = seed
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const W = 1024
  const H = 400
  const traces: { pts: [number, number][]; w: number }[] = []
  // traces route from the CPU area out to the edges with 45° jogs
  const cpu: [number, number] = [W * 0.44, H * 0.5]
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2
    const start: [number, number] = [cpu[0] + Math.cos(a) * 60, cpu[1] + Math.sin(a) * 50]
    const pts: [number, number][] = [start]
    let [x, y] = start
    const steps = 2 + Math.floor(rnd() * 3)
    for (let k = 0; k < steps; k++) {
      const horiz = rnd() > 0.35
      const len = 60 + rnd() * 260
      const dir = Math.cos(a) >= 0 ? 1 : -1
      if (horiz) x += dir * len
      else y += (rnd() > 0.5 ? 1 : -1) * len * 0.4
      const jog = 20 + rnd() * 30
      x += dir * jog
      y += (rnd() > 0.5 ? 1 : -1) * jog
      pts.push([Math.max(10, Math.min(W - 10, x)), Math.max(10, Math.min(H - 10, y))])
    }
    traces.push({ pts, w: rnd() > 0.8 ? 3 : 1.6 })
  }
  const drawTraces = (g: CanvasRenderingContext2D, color: string) => {
    g.strokeStyle = color
    g.lineCap = 'round'
    g.lineJoin = 'round'
    for (const t of traces) {
      g.lineWidth = t.w
      g.beginPath()
      t.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
      g.stroke()
      const [ex, ey] = t.pts[t.pts.length - 1]
      g.beginPath()
      g.arc(ex, ey, t.w + 2, 0, Math.PI * 2)
      g.stroke()
    }
  }
  const map = canvasTexture(W, H, (g) => {
    g.fillStyle = '#123a32'
    g.fillRect(0, 0, W, H)
    drawTraces(g, '#1d5246')
    g.strokeStyle = '#d7dbd0'
    g.lineWidth = 2
    g.font = `16px ${MONO}`
    g.fillStyle = '#d7dbd0'
    const labels = ['U1', 'U7', 'PU3', 'C412', 'L2', 'Q8', 'J_BATT', 'J_FAN', 'M.2', 'DIMM0', 'DIMM1', 'R118']
    for (let i = 0; i < labels.length; i++) g.fillText(labels[i], 40 + rnd() * (W - 120), 30 + rnd() * (H - 60))
    g.strokeRect(6, 6, W - 12, H - 12)
    g.font = `600 20px ${MONO}`
    g.fillText(`${brand.name}-MB REV 1.2`, W - 260, H - 24)
  })
  const emissive = canvasTexture(W, H, (g) => {
    g.fillStyle = '#000'
    g.fillRect(0, 0, W, H)
    drawTraces(g, '#ffffff')
  })
  return { map, emissive }
}

/** The lid mark: a soft-edged glyph used as an alpha map for the glowing logo. */
export const lidMark = () =>
  canvasTexture(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h)
    g.fillStyle = '#fff'
    g.font = `700 300px "Inter Tight", ${SANS}`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(brand.mark, w / 2, h / 2 + 10)
    g.lineWidth = 10
    g.strokeStyle = '#fff'
    g.beginPath()
    g.arc(w / 2, h / 2, 210, 0, Math.PI * 2)
    g.stroke()
  })

/** Radial gradient used for the amber heat glow under the chassis. */
export const radialGlow = () => {
  const t = canvasTexture(256, 256, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
    grd.addColorStop(0, 'rgba(255,255,255,1)')
    grd.addColorStop(0.35, 'rgba(255,255,255,0.45)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, w, h)
  })
  t.colorSpace = THREE.NoColorSpace
  return t
}
