'use client'
import { scrollApi } from '@/lib/store'

/** Accessible alternative to clicking parts in 3D: jumps to a service stop. Works without JS via the anchor. */
export function ServiceJump({ chapter, label }: { chapter: string; label: string }) {
  return (
    <a
      href={`#${chapter}`}
      data-cursor="link"
      onClick={(e) => {
        e.preventDefault()
        scrollApi.toChapter(chapter)
        history.replaceState(null, '', `#${chapter}`)
      }}
      className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface/70 px-4 text-sm text-text/90 transition-colors hover:border-accent hover:text-accent"
    >
      {label}
    </a>
  )
}
