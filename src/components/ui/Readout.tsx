'use client'
import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { chapters } from '@/content/chapters'
import { live, story } from '@/lib/store'

const ORDER = new Map(chapters.map((c, i) => [c.id, i]))
const DIAG = ORDER.get('diagnosis') ?? 0

/**
 * Diagnostic readout that "types" in step with the scan (scrub mode only).
 * All lines are server-rendered, so static / no-JS / reduced-motion visitors see the full text.
 */
export function Readout({ lines, warnIndex, okIndex }: { lines: string[]; warnIndex: number; okIndex: number }) {
  const ref = useRef<HTMLPreElement>(null)
  useEffect(() => {
    let last = -1
    const tick = () => {
      const el = ref.current
      if (!el) return
      const s = story.getState()
      if (s.mode !== 'scrub') {
        if (last !== lines.length) {
          last = lines.length
          el.querySelectorAll('span').forEach((sp) => (sp.style.visibility = 'visible'))
        }
        return
      }
      // reveal across the scan → fault → repair part of the chapter (see chapters.ts diagnosis keys)
      const idx = ORDER.get(s.chapter) ?? 0
      const p = idx === DIAG ? live.chapterProgress : idx > DIAG ? 1 : 0
      const shown = Math.max(0, Math.min(lines.length, Math.floor(((p - 0.24) / (0.94 - 0.24)) * lines.length + 0.999)))
      if (shown === last) return
      last = shown
      el.querySelectorAll('span').forEach((sp, i) => {
        sp.style.visibility = i < shown ? 'visible' : 'hidden'
        sp.classList.toggle('caret', i === shown - 1 && shown < lines.length)
      })
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [lines.length])
  return (
    <pre ref={ref} aria-label="Diagnostic readout" className="panel mt-6 overflow-x-auto p-4 font-mono text-[0.8rem] leading-6 text-text/90 md:text-sm">
      {lines.map((l, i) => (
        <span key={l} className={`block ${i === warnIndex ? 'text-warning' : i === okIndex ? 'text-accent' : ''}`}>
          {l}
        </span>
      ))}
    </pre>
  )
}
