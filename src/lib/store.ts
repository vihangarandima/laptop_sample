import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { PartName } from './parts'
import type { Product, Ticket } from './data/types'

export type SceneMode = 'pending' | 'scrub' | 'stills' | 'static'

type StoryState = {
  /** active chapter id (changes a few times per visit → OK for React) */
  chapter: string
  mode: SceneMode
  ready: boolean
  loadStep: number // preloader progress 0..1
  hovered: PartName | null
  product: Product | null
  catalog: Product[]
  /** ticket shown on the laptop screen in the tracker chapter */
  trackerText: string
  ticket: Ticket | null
  ticketState: 'idle' | 'loading' | 'found' | 'error'
  set: (p: Partial<StoryState>) => void
}

export const story = createStore<StoryState>()((set) => ({
  chapter: 'machine',
  mode: 'pending',
  ready: false,
  loadStep: 0,
  hovered: null,
  product: null,
  catalog: [],
  trackerText: '',
  ticket: null,
  ticketState: 'idle',
  set: (p) => set(p),
}))

export const useStory = <T,>(sel: (s: StoryState) => T) => useStore(story, sel)

/** Per-frame values: never trigger React renders. */
export const live = {
  time: 0, // timeline time (viewport heights)
  chapterProgress: 0,
  pointer: { x: 0, y: 0 }, // -1..1
  /** projected screen position of the service anchor part (px), written by the scene */
  anchor: { x: 0, y: 0, visible: false },
  hoverAnchor: { x: 0, y: 0, visible: false },
}

/** Smooth-scroll API, set by the scroll controller so UI can jump to chapters. */
export const scrollApi: { toChapter: (id: string, opts?: { immediate?: boolean; at?: number }) => void } = {
  toChapter: (id) => {
    document.getElementById(id)?.scrollIntoView()
  },
}
