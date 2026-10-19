import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

export type TierName = 'high' | 'medium' | 'low'
export type Tier = {
  name: TierName
  maxDpr: number
  post: boolean
  bloom: boolean
  dof: boolean
  msaa: number
  shadowRes: number
  shadowLive: boolean
  segments: number // rounded geometry smoothness
  screenRes: [number, number]
  screenHz: number
  smd: number // instanced board components
}

export const TIERS: Record<TierName, Tier> = {
  high: { name: 'high', maxDpr: 2, post: true, bloom: true, dof: true, msaa: 4, shadowRes: 512, shadowLive: true, segments: 4, screenRes: [1024, 640], screenHz: 30, smd: 220 },
  // msaa must stay > 0 while post is on: the canvas `antialias` flag doesn't reach the composer's render target
  medium: { name: 'medium', maxDpr: 1.5, post: true, bloom: true, dof: false, msaa: 2, shadowRes: 256, shadowLive: true, segments: 3, screenRes: [1024, 640], screenHz: 20, smd: 140 },
  low: { name: 'low', maxDpr: 1.25, post: false, bloom: false, dof: false, msaa: 0, shadowRes: 256, shadowLive: false, segments: 2, screenRes: [640, 400], screenHz: 15, smd: 80 },
}

function gpuName(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl2') as WebGL2RenderingContext | null
    if (!gl) return ''
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER))
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return name
  } catch {
    return ''
  }
}

/** Pick a starting tier from device hints. No benchmark, no delay. `?quality=` overrides. */
export function detectTier(): TierName {
  const forced = new URLSearchParams(location.search).get('quality')
  if (forced === 'high' || forced === 'medium' || forced === 'low') return forced
  const nav = navigator as Navigator & { deviceMemory?: number }
  const coarse = matchMedia('(pointer: coarse)').matches
  const small = Math.min(screen.width, screen.height) < 768
  const cores = nav.hardwareConcurrency ?? 4
  const mem = nav.deviceMemory ?? 4
  const gpu = gpuName()
  const weakGpu =
    /(mali-4|mali-t|adreno \(tm\) [345]\d\d|adreno \(tm\) 6[01]\d|powervr|intel\(r\) (hd|uhd) graphics [56]\d\d|swiftshader|llvmpipe|software)/i.test(gpu)
  // Integrated laptop GPUs (Intel Iris/UHD, AMD APUs): full DoF+MSAA4 pipeline caused intermittent
  // 300–1000 ms GPU stalls during transitions on Iris Xe, so they start on medium.
  const integrated = /(intel|radeon\(tm\) graphics|radeon graphics|vega \d+ graphics)/i.test(gpu) && !/\barc\b/i.test(gpu)
  if (weakGpu || mem <= 2 || cores <= 2) return 'low'
  if (coarse || small || integrated || mem <= 4 || cores <= 4) return 'medium'
  return 'high'
}

type QState = { tier: TierName; drops: number; lastChange: number; set: (t: TierName) => void; drop: () => void }
const ORDER: TierName[] = ['high', 'medium', 'low']

export const quality = createStore<QState>()((set, get) => ({
  tier: 'medium',
  drops: 0,
  lastChange: 0,
  set: (tier) => set({ tier, lastChange: performance.now() }),
  drop: () => {
    // A tier change remounts post-processing, which itself costs a few slow frames.
    // Without a cooldown one hitch cascades high → medium → low in seconds.
    const now = performance.now()
    if (now - get().lastChange < 6000) return
    const i = ORDER.indexOf(get().tier)
    if (i < ORDER.length - 1) {
      set({ tier: ORDER[i + 1], drops: get().drops + 1, lastChange: now })
      if (process.env.NODE_ENV !== 'production') console.info('[quality] dropped to', ORDER[i + 1])
    }
  },
}))
/** QA-only feature switches (?qa=1&dof=0&msaa=0&bloom=0&shadows=baked&dpr=1) for profiling. */
const overrides: Partial<Tier> = (() => {
  if (typeof window === 'undefined') return {}
  const q = new URLSearchParams(location.search)
  if (!q.has('qa')) return {}
  const o: Partial<Tier> = {}
  if (q.get('dof') === '0') o.dof = false
  if (q.get('bloom') === '0') o.bloom = false
  if (q.get('post') === '0') o.post = false
  if (q.has('msaa')) o.msaa = Number(q.get('msaa'))
  if (q.get('shadows') === 'baked') o.shadowLive = false
  if (q.has('dpr')) o.maxDpr = Number(q.get('dpr'))
  return o
})()
export const autoTierEnabled = () => typeof window === 'undefined' || new URLSearchParams(location.search).get('auto') !== '0'
export const useTier = (): Tier => {
  const t = TIERS[useStore(quality, (s) => s.tier)]
  return { ...t, ...overrides, name: t.name }
}
