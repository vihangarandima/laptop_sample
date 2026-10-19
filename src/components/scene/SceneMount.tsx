'use client'
import dynamic from 'next/dynamic'
import { Component, useCallback, useEffect, useState, type ReactNode } from 'react'
import { detectTier, quality } from '@/lib/quality'
import { story, useStory } from '@/lib/store'

const Experience = dynamic(() => import('./Experience'), { ssr: false })

class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.error('[scene] failed, switching to static fallback', err)
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** Mirrors the early inline decision (see app/layout.tsx) into the store and mounts the canvas. */
export default function SceneMount() {
  const mode = useStory((s) => s.mode)
  const ready = useStory((s) => s.ready)
  const [start, setStart] = useState(false)

  const fail = useCallback(() => {
    document.documentElement.dataset.scene = 'static'
    story.getState().set({ mode: 'static', ready: true, loadStep: 1 })
  }, [])

  useEffect(() => {
    const m = document.documentElement.dataset.scene
    const initial = m === 'static' ? 'static' : m === 'stills' ? 'stills' : 'scrub'
    if (initial === 'static') {
      story.getState().set({ mode: 'static', ready: true, loadStep: 1 })
      return
    }
    quality.getState().set(detectTier())
    story.getState().set({ mode: initial, loadStep: 0.2 })
    // start the 3D after first paint so the HTML (and LCP) isn't held up
    const id = requestAnimationFrame(() => setStart(true))
    return () => cancelAnimationFrame(id)
  }, [])

  if (mode === 'static' || !start) return null
  return (
    <div
      aria-hidden="true"
      className="scene-layer fixed inset-0 z-0 transition-opacity duration-700"
      style={{ opacity: ready ? 1 : 0 }}
    >
      <SceneBoundary onError={fail}>
        <Experience onFail={fail} />
      </SceneBoundary>
    </div>
  )
}
