'use client'
import { scrollApi, useStory } from '@/lib/store'

/** Persistent "Book a repair" button. Hidden while the booking chapter is on screen. */
export function BookButton() {
  const chapter = useStory((s) => s.chapter)
  const hidden = chapter === 'book'
  return (
    <a
      href="#book"
      onClick={(e) => {
        e.preventDefault()
        scrollApi.toChapter('book', { at: 0.02 })
        history.replaceState(null, '', '#book')
        setTimeout(() => document.getElementById('book-title')?.focus({ preventScroll: true }), 900)
      }}
      data-cursor="link"
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      className={`fixed bottom-5 right-5 z-40 inline-flex h-[var(--book-h)] items-center gap-3 rounded-full bg-text px-6 font-medium text-bg shadow-[0_8px_40px_-10px_rgba(95,227,255,0.45)] transition-all duration-500 hover:bg-accent md:bottom-8 md:right-8 ${
        hidden ? 'pointer-events-none translate-y-4 opacity-0' : ''
      }`}
    >
      <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
      Book a repair
    </a>
  )
}
