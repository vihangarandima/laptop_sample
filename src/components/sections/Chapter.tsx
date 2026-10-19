import type { ReactNode } from 'react'
import { chapterById } from '@/content/chapters'

type Props = {
  id: string
  /** describes what the 3D scene shows here (screen readers + static still alt text) */
  scene: string
  children: ReactNode
  /** sticky full-viewport copy (story chapters) or normal flow (functional chapters) */
  layout?: 'sticky' | 'flow'
  className?: string
  labelledBy?: string
}

/**
 * One chapter = one <section>. Its height comes from the timeline data so the 3D slice and
 * the text slice always match. Functional chapters can grow taller than that; the scroll
 * controller measures real heights.
 */
export function Chapter({ id, scene, children, layout = 'sticky', className = '', labelledBy }: Props) {
  const ch = chapterById(id)
  const vh = (ch?.length ?? 1) * 100
  return (
    <section
      id={id}
      aria-labelledby={labelledBy ?? `${id}-title`}
      className={`chapter relative ${className}`}
      // Sticky chapters are one viewport taller than their length and overlap the next chapter by
      // that viewport, so the pinned copy stays on screen for the chapter's whole length.
      style={layout === 'sticky' ? { height: `${vh + 100}svh`, marginBottom: '-100svh' } : { minHeight: `${vh}svh` }}
    >
      <p className="sr-only">{scene}</p>
      <figure className="scene-still mx-auto max-w-5xl px-4 pt-16" aria-hidden="false">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/fallback/${id}.jpg`}
          alt={scene}
          width={1440}
          height={900}
          loading="lazy"
          decoding="async"
          className="h-auto w-full rounded-2xl border border-line"
        />
      </figure>
      {layout === 'sticky' ? (
        <div className="chapter-sticky sticky top-0 flex h-svh w-full">{children}</div>
      ) : (
        children
      )}
    </section>
  )
}
