'use client'
import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { chapterById } from '@/content/chapters'
import { PART_LABEL } from '@/lib/parts'
import { live, story, useStory } from '@/lib/store'

/**
 * Thin leader line from the active service text block to its part in 3D.
 * Updated on the GSAP ticker by writing SVG attributes directly (no React renders).
 */
export function ServiceCallout() {
  const line = useRef<SVGLineElement>(null)
  const dot = useRef<SVGCircleElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const tick = () => {
      const s = story.getState()
      const ch = chapterById(s.chapter)
      const l = line.current
      const d = dot.current
      const root = svg.current
      if (!l || !d || !root) return
      const block = ch?.service ? document.querySelector<HTMLElement>(`#${ch.id} [data-callout-anchor]`) : null
      const p = live.chapterProgress
      const show = !!block && live.anchor.visible && s.mode === 'scrub' ? Math.min(1, Math.max(0, (p - 0.3) / 0.12)) * Math.min(1, Math.max(0, (0.9 - p) / 0.08)) : s.mode === 'stills' && block ? 1 : 0
      root.style.opacity = String(show)
      if (!block || show <= 0) return
      const r = block.getBoundingClientRect()
      const mobile = window.innerWidth < 900
      const x1 = mobile ? r.left + r.width * 0.5 : r.right
      const y1 = mobile ? r.top : r.top + 28
      const x2 = live.anchor.x
      const y2 = live.anchor.y
      const len = Math.hypot(x2 - x1, y2 - y1)
      l.setAttribute('x1', String(x1))
      l.setAttribute('y1', String(y1))
      l.setAttribute('x2', String(x2))
      l.setAttribute('y2', String(y2))
      l.style.strokeDasharray = `${len}`
      l.style.strokeDashoffset = `${len * (1 - show)}`
      d.setAttribute('cx', String(x2))
      d.setAttribute('cy', String(y2))
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])
  return (
    <svg ref={svg} aria-hidden="true" className="pointer-events-none fixed inset-0 z-10 h-full w-full" style={{ opacity: 0 }}>
      <line ref={line} stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.8" />
      <circle ref={dot} r="4" fill="var(--bg)" stroke="var(--accent)" strokeWidth="1.5" />
    </svg>
  )
}

/** Label that follows a hovered part (desktop). */
export function HoverLabel() {
  const hovered = useStory((s) => s.hovered)
  const el = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const tick = () => {
      const e = el.current
      if (!e) return
      e.style.transform = `translate3d(${live.hoverAnchor.x + 18}px, ${live.hoverAnchor.y - 14}px, 0)`
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])
  return (
    <div
      ref={el}
      aria-hidden="true"
      className={`pointer-events-none fixed left-0 top-0 z-30 rounded-full border border-accent/60 bg-bg/80 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-accent transition-opacity duration-200 ${
        hovered ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {hovered ? `${PART_LABEL[hovered]} · click to see the service` : ''}
    </div>
  )
}

/** Custom cursor on fine pointers: a ring that grows over interactive things and 3D parts. */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null)
  const hovered = useStory((s) => s.hovered)
  useEffect(() => {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (document.documentElement.dataset.scene !== 'scrub') return
    document.documentElement.dataset.cursor = 'on'
    const pos = { x: -100, y: -100, tx: -100, ty: -100 }
    let active = false
    const move = (e: PointerEvent) => {
      pos.tx = e.clientX
      pos.ty = e.clientY
      const t = e.target as HTMLElement | null
      active = !!t?.closest('a,button,input,select,textarea,label,[data-cursor]')
    }
    const tick = () => {
      const r = ring.current
      if (!r) return
      pos.x += (pos.tx - pos.x) * 0.25
      pos.y += (pos.ty - pos.y) * 0.25
      const big = active || !!story.getState().hovered
      r.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) scale(${big ? 1.9 : 1})`
    }
    window.addEventListener('pointermove', move, { passive: true })
    gsap.ticker.add(tick)
    return () => {
      window.removeEventListener('pointermove', move)
      gsap.ticker.remove(tick)
      delete document.documentElement.dataset.cursor
    }
  }, [])
  return (
    <div
      ref={ring}
      aria-hidden="true"
      className={`pointer-events-none fixed left-0 top-0 z-[80] hidden h-5 w-5 rounded-full border transition-[border-color,background-color] duration-200 [html[data-cursor=on]_&]:block ${
        hovered ? 'border-accent bg-accent/15' : 'border-text/70'
      }`}
    />
  )
}
