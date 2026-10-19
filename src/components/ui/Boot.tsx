'use client'
import { useEffect, useState } from 'react'
import { brand } from '@/config/brand'
import { useStory } from '@/lib/store'

const LINES: [number, string][] = [
  [0, `${brand.name} BIOS 1.2 — memory ok`],
  [0.2, 'loading story ............ ok'],
  [0.45, 'building machine ......... ok'],
  [0.7, 'compiling shaders ........ ok'],
  [1, 'ready'],
]

/**
 * Boot preloader. Progress is real: each line appears when the matching load step completes
 * (JS chunk → renderer → model built → shaders compiled). It never holds the page longer than
 * 1.7 s; CSS hides it after 4 s if JS fails (see globals.css).
 */
export function Boot() {
  const step = useStory((s) => s.loadStep)
  const ready = useStory((s) => s.ready)
  const [done, setDone] = useState(false)
  useEffect(() => {
    performance.mark(`kernel:step-${step}`)
  }, [step])
  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => setDone(true), 280)
    return () => clearTimeout(t)
  }, [ready])
  // Never hold the page: if the scene isn't ready, the boot screen steps aside anyway; the hero
  // HTML is readable over the dark stage and the 3D fades in when it is ready (SceneMount).
  useEffect(() => {
    // Measured from navigation start. 1.0 s: step aside before the shader compile (a main-thread
    // long task of up to ~1.4 s on integrated GPUs, cold cache) so the fade-out isn't blocked behind it.
    const t = setTimeout(() => setDone(true), Math.max(250, 1000 - performance.now()))
    return () => clearTimeout(t)
  }, [])
  return (
    <div
      className="boot fixed inset-0 z-[60] flex items-end bg-bg p-6 font-mono text-[13px] leading-6 text-muted md:p-10"
      data-done={done}
      aria-hidden="true"
    >
      <div>
        {LINES.filter(([at]) => at <= step).map(([at, l]) => (
          <p key={l} className={at === 1 ? 'caret text-text' : ''}>
            {l}
          </p>
        ))}
      </div>
    </div>
  )
}
