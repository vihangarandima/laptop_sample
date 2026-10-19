import * as THREE from 'three'
import { brand } from '@/config/brand'
import type { ScreenMode, Uniforms } from '@/content/chapters'
import type { Product, Ticket } from '@/lib/data/types'
import { STEP_LABEL, TICKET_STEPS } from '@/lib/data/types'

const MONO = '"Geist Mono", ui-monospace, monospace'
const SANS = '"Geist", ui-sans-serif, system-ui, sans-serif'
const DISPLAY = '"Inter Tight", "Geist", ui-sans-serif, sans-serif'
const C = brand.colors

export type ScreenInput = {
  mode: ScreenMode
  u: Uniforms
  product: Product | null
  trackerText: string
  ticket: Ticket | null
  ticketState: 'idle' | 'loading' | 'found' | 'error'
  time: number
}

/**
 * Paints the laptop screen into a canvas. Only redraws when the visible state changes
 * or while something on it is animating (boot, glitch, cursor blink), throttled by the caller.
 */
export class ScreenPainter {
  readonly canvas: HTMLCanvasElement
  readonly texture: THREE.CanvasTexture
  /** what the screen shows (uploaded to the GPU) */
  private out: CanvasRenderingContext2D
  /** the clean frame, redrawn only when its content changes; glitch frames are built from it */
  private base: HTMLCanvasElement
  private g: CanvasRenderingContext2D
  private key = ''
  private baseKey = ''
  private seed = 1

  constructor(w: number, h: number) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = w
    this.canvas.height = h
    this.base = document.createElement('canvas')
    this.base.width = w
    this.base.height = h
    // CPU-backed canvases: uploading a GPU-accelerated 2D canvas to WebGL forces a slow GPU readback.
    this.out = this.canvas.getContext('2d', { willReadFrequently: true })!
    this.g = this.base.getContext('2d', { willReadFrequently: true })!
    this.texture = new THREE.CanvasTexture(this.canvas)
    this.texture.colorSpace = THREE.SRGBColorSpace
    this.texture.anisotropy = 4
  }

  dispose() {
    this.texture.dispose()
  }

  /** Returns true if the canvas changed. */
  paint(i: ScreenInput): boolean {
    const blink = Math.floor(i.time * 2) % 2
    // content of the clean frame (no time in it, except the tracker cursor blink at 2 Hz)
    const baseKey = [
      i.mode,
      i.u.boot.toFixed(2),
      i.u.heat.toFixed(1),
      i.product?.id,
      i.trackerText,
      i.ticket?.id,
      i.ticketState,
      i.mode === 'tracker' ? blink : 0,
    ].join('|')
    const glitching = i.mode === 'desktop' && i.u.glitch > 0.01
    // glitch frames advance at 10 Hz
    const key = `${baseKey}|${glitching ? Math.floor(i.time * 10) : 0}`
    if (key === this.key) return false
    this.key = key
    const { width: w, height: h } = this.canvas
    if (baseKey !== this.baseKey) {
      this.baseKey = baseKey
      const g = this.g
      g.save()
      g.scale(w / 1024, h / 640)
      if (i.mode === 'tracker') this.tracker(i)
      else if (i.mode === 'product' && i.product) this.product(i.product)
      else if (i.mode === 'off') this.off()
      else this.desktop(i)
      g.restore()
    }
    this.out.drawImage(this.base, 0, 0)
    if (glitching) this.glitch(i.u.glitch, i.time)
    this.texture.needsUpdate = true
    return true
  }

  private off() {
    this.g.fillStyle = '#000'
    this.g.fillRect(0, 0, 1024, 640)
  }

  private wallpaper(tint = C.accent, dark = false) {
    const g = this.g
    const bg = g.createLinearGradient(0, 0, 1024, 640)
    bg.addColorStop(0, dark ? '#050607' : '#0d1316')
    bg.addColorStop(1, dark ? '#0b0c0d' : '#071a1f')
    g.fillStyle = bg
    g.fillRect(0, 0, 1024, 640)
    g.globalAlpha = dark ? 0.15 : 0.35
    g.strokeStyle = tint
    g.lineWidth = 1.5
    for (let k = 0; k < 14; k++) {
      g.beginPath()
      for (let x = 0; x <= 1024; x += 16) {
        const y = 330 + Math.sin(x / 160 + k * 0.45) * (60 + k * 6) + k * 8 - 40
        if (x === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.stroke()
    }
    g.globalAlpha = 1
  }

  private chrome() {
    const g = this.g
    g.fillStyle = 'rgba(10,12,14,0.6)'
    g.fillRect(0, 0, 1024, 30)
    g.fillStyle = C.text
    g.font = `500 15px ${SANS}`
    g.fillText(brand.name, 18, 20)
    g.textAlign = 'right'
    g.fillText('09:41', 1006, 20)
    g.textAlign = 'left'
    // dock
    g.fillStyle = 'rgba(20,24,28,0.7)'
    roundRect(g, 352, 572, 320, 52, 14)
    g.fill()
    const icons = ['#5fe3ff', '#ecebe6', '#7d8790', '#3a4148', '#c9c4ba']
    icons.forEach((c, k) => {
      g.fillStyle = c
      roundRect(g, 372 + k * 58, 582, 36, 32, 9)
      g.fill()
    })
  }

  private desktop(i: ScreenInput) {
    const g = this.g
    const boot = i.u.boot
    if (boot < 0.85) {
      g.fillStyle = '#000'
      g.fillRect(0, 0, 1024, 640)
      g.fillStyle = C.text
      g.font = `700 64px ${DISPLAY}`
      g.textAlign = 'center'
      g.fillText(brand.mark, 512, 300)
      g.textAlign = 'left'
      g.fillStyle = '#1e2226'
      roundRect(g, 412, 360, 200, 4, 2)
      g.fill()
      g.fillStyle = C.accent
      roundRect(g, 412, 360, 200 * Math.min(1, boot / 0.8), 4, 2)
      g.fill()
      return
    }
    this.wallpaper()
    this.chrome()
    g.globalAlpha = Math.min(1, (boot - 0.85) / 0.15)
    // a quiet status window
    g.fillStyle = 'rgba(14,17,20,0.82)'
    roundRect(g, 96, 120, 360, 170, 14)
    g.fill()
    g.fillStyle = C.muted
    g.font = `14px ${MONO}`
    g.fillText('SYSTEM', 120, 152)
    const hot = i.u.heat > 0.3
    g.fillStyle = hot ? C.warning : C.text
    g.font = `600 30px ${SANS}`
    g.fillText(hot ? 'CPU 98 °C' : 'CPU 46 °C', 120, 196)
    g.fillStyle = C.muted
    g.font = `16px ${MONO}`
    g.fillText(hot ? 'fan 6200 rpm · battery 12%' : 'fan quiet · battery 100%', 120, 228)
    g.fillStyle = hot ? C.warning : C.accent
    roundRect(g, 120, 252, hot ? 300 : 120, 6, 3)
    g.fill()
    g.globalAlpha = 1
  }

  private glitch(amount: number, time: number) {
    const g = this.out
    const { width: w, height: h } = this.canvas
    let s = (this.seed = (this.seed * 9301 + 49297 + Math.floor(time * 10)) % 233280)
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
    const slices = Math.floor(5 + amount * 9)
    for (let k = 0; k < slices; k++) {
      const y = rnd() * h
      const sh = 4 + rnd() * 40 * amount
      const dx = (rnd() - 0.5) * 120 * amount
      g.drawImage(this.base, 0, y, w, sh, dx, y, w, sh) // copy from the clean frame, never from itself
    }
    g.globalCompositeOperation = 'screen'
    g.fillStyle = `rgba(255,90,54,${0.22 * amount})`
    g.fillRect(0, rnd() * h, w, 3 + rnd() * 30)
    g.fillStyle = `rgba(95,227,255,${0.18 * amount})`
    g.fillRect(0, rnd() * h, w, 2 + rnd() * 18)
    g.globalCompositeOperation = 'source-over'
    if (amount > 0.5) {
      g.fillStyle = 'rgba(10,12,14,0.85)'
      roundRect(g, w * 0.52, h * 0.55, w * 0.38, h * 0.16, 12)
      g.fill()
      g.fillStyle = C.warning
      g.font = `600 ${Math.round(w * 0.022)}px ${MONO}`
      g.fillText('Application not responding', w * 0.55, h * 0.62)
      g.fillStyle = C.muted
      g.fillText('Thermal throttling active', w * 0.55, h * 0.67)
    }
  }

  private product(p: Product) {
    const g = this.g
    if (p.look.screen === 'code') {
      g.fillStyle = '#0a0d10'
      g.fillRect(0, 0, 1024, 640)
      g.font = `18px ${MONO}`
      const lines = ['import { repair } from "kernel"', '', 'const machine = await inspect(device)', 'if (machine.healthy) {', '  ship(machine)', '}', '', '// 32 GB · 1 TB · 165 Hz']
      lines.forEach((l, k) => {
        g.fillStyle = k === 7 ? C.accent : k % 3 ? C.text : C.muted
        g.fillText(l, 60, 90 + k * 34)
      })
    } else if (p.look.screen === 'photo') {
      const grd = g.createLinearGradient(0, 0, 0, 640)
      grd.addColorStop(0, '#1b2b36')
      grd.addColorStop(0.55, '#c98a5b')
      grd.addColorStop(1, '#1a1410')
      g.fillStyle = grd
      g.fillRect(0, 0, 1024, 640)
      g.fillStyle = '#0d0f12'
      g.beginPath()
      g.moveTo(0, 470)
      for (let x = 0; x <= 1024; x += 64) g.lineTo(x, 430 + Math.sin(x / 90) * 40)
      g.lineTo(1024, 640)
      g.lineTo(0, 640)
      g.fill()
    } else {
      this.wallpaper(C.accent, p.look.screen === 'dark')
    }
    if (p.look.screen !== 'code') this.chrome()
    g.fillStyle = 'rgba(10,12,14,0.75)'
    roundRect(g, 40, 520, 330, 70, 12)
    g.fill()
    g.fillStyle = C.text
    g.font = `600 24px ${SANS}`
    g.fillText(p.name, 60, 552)
    g.fillStyle = C.muted
    g.font = `15px ${MONO}`
    g.fillText(`${p.condition === 'new' ? 'NEW' : `REFURB · ${p.grade}`} · ${p.warrantyMonths} MO WARRANTY`, 60, 576)
  }

  private tracker(i: ScreenInput) {
    const g = this.g
    g.fillStyle = '#07090a'
    g.fillRect(0, 0, 1024, 640)
    g.strokeStyle = 'rgba(95,227,255,0.06)'
    g.lineWidth = 1
    for (let x = 0; x < 1024; x += 32) {
      g.beginPath()
      g.moveTo(x, 0)
      g.lineTo(x, 640)
      g.stroke()
    }
    g.fillStyle = C.muted
    g.font = `16px ${MONO}`
    g.fillText(`${brand.name} / REPAIR STATUS`, 56, 64)
    g.fillStyle = C.text
    g.font = `500 34px ${MONO}`
    const cursor = Math.floor(i.time * 2) % 2 ? '_' : ' '
    g.fillText(`> ${i.trackerText || 'KR-'}${cursor}`, 56, 128)

    const t = i.ticket
    const current = t ? TICKET_STEPS.indexOf(t.step) : -1
    const x0 = 80
    const x1 = 944
    const y = 300
    g.strokeStyle = '#22272c'
    g.lineWidth = 4
    g.beginPath()
    g.moveTo(x0, y)
    g.lineTo(x1, y)
    g.stroke()
    if (current >= 0) {
      g.strokeStyle = C.accent
      g.beginPath()
      g.moveTo(x0, y)
      g.lineTo(x0 + ((x1 - x0) * current) / (TICKET_STEPS.length - 1), y)
      g.stroke()
    }
    TICKET_STEPS.forEach((step, k) => {
      const x = x0 + ((x1 - x0) * k) / (TICKET_STEPS.length - 1)
      const done = k <= current
      g.fillStyle = k === current ? C.accent : done ? '#2b8ea3' : '#22272c'
      g.beginPath()
      g.arc(x, y, k === current ? 14 : 9, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = done ? C.text : C.muted
      g.font = `${k === current ? 600 : 400} 15px ${SANS}`
      g.textAlign = 'center'
      const words = STEP_LABEL[step].split(' ')
      words.forEach((wd, j) => g.fillText(wd, x, y + 44 + j * 20))
      g.textAlign = 'left'
    })
    g.font = `20px ${MONO}`
    if (i.ticketState === 'found' && t) {
      g.fillStyle = C.text
      g.fillText(t.device, 56, 470)
      g.fillStyle = C.muted
      g.fillText((t.note ?? '').slice(0, 70), 56, 506)
    } else if (i.ticketState === 'error') {
      g.fillStyle = C.warning
      g.fillText('No ticket found. Check the number on your receipt.', 56, 470)
    } else if (i.ticketState === 'loading') {
      g.fillStyle = C.muted
      g.fillText('Looking up…', 56, 470)
    } else {
      g.fillStyle = C.muted
      g.fillText('Enter your ticket number to see where your laptop is.', 56, 470)
    }
  }
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.roundRect(x, y, Math.max(0, w), h, r)
}
