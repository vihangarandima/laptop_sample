'use client'
import { chapters, navChapters } from '@/content/chapters'
import { scrollApi, useStory } from '@/lib/store'

/** For each chapter, the nav entry it belongs to (service stops belong to "Services"). */
const OWNER = new Map<string, string>()
{
  let owner = chapters[0].id
  for (const c of chapters) {
    if (c.nav) owner = c.id
    OWNER.set(c.id, owner)
  }
}

/** Slim chapter indicator at the side. Real anchor links (work without JS), enhanced with smooth jumps. */
export function ChapterNav() {
  const chapter = useStory((s) => s.chapter)
  const current = OWNER.get(chapter)
  return (
    <nav aria-label="Chapters" className="fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 md:block">
      <ol className="flex flex-col items-end gap-1">
        {navChapters.map((c) => {
          const active = c.id === current
          return (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                aria-current={active ? 'true' : undefined}
                data-cursor="link"
                onClick={(e) => {
                  e.preventDefault()
                  scrollApi.toChapter(c.id)
                  history.replaceState(null, '', `#${c.id}`)
                  document.getElementById(`${c.id}-title`)?.focus({ preventScroll: true })
                }}
                className="group flex min-h-7 items-center gap-3 py-1 pl-3 pr-1"
              >
                <span
                  className={`font-mono text-[11px] uppercase tracking-[0.12em] transition-opacity duration-300 ${
                    active ? 'text-text opacity-100' : 'text-muted opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                  }`}
                >
                  {c.nav}
                </span>
                <span
                  className={`block h-px transition-all duration-300 ${active ? 'w-8 bg-accent' : 'w-4 bg-muted/60 group-hover:w-6'}`}
                  aria-hidden="true"
                />
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
