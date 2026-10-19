'use client'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { chapters, totalLength } from '@/content/chapters'
import { buildTimeline, chapterStarts, createRig, rigRef, stillTime } from '@/lib/timeline'
import { live, scrollApi, story } from '@/lib/store'

gsap.registerPlugin(ScrollTrigger, useGSAP)

type Range = { id: string; top: number; height: number; start: number; length: number }

/**
 * Drives the whole story from the document scroll position.
 * Each chapter <section> maps its own pixel range onto its slice of the master timeline,
 * so section heights can grow with content (catalogue, forms) without breaking the mapping.
 */
export default function ScrollController() {
  useGSAP(() => {
    ScrollTrigger.config({ ignoreMobileResize: true })
    const mm = gsap.matchMedia()

    mm.add(
      { isMobile: '(max-width: 899px)', isDesktop: '(min-width: 900px)', reduce: '(prefers-reduced-motion: reduce)' },
      (ctx) => {
        const { isMobile, reduce } = ctx.conditions as { isMobile: boolean; reduce: boolean }
        const scene = document.documentElement.dataset.scene
        // static: no 3D at all (no WebGL / scene failed) → native scroll, copy always visible
        const isStatic = scene === 'static'
        const stills = reduce || scene === 'stills' || isStatic
        const rig = createRig(isMobile)
        rigRef.current = rig
        const tl = buildTimeline(rig, isMobile)

        let ranges: Range[] = []
        const measure = () => {
          // A chapter spans from its top to the next chapter's top (sticky chapters overlap the
          // next one by a viewport). The last chapter ends where the page can't scroll further.
          const tops = chapters.map((c) => document.getElementById(c.id)!.getBoundingClientRect().top + window.scrollY)
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight
          ranges = chapters.map((c, i) => {
            const end = i < chapters.length - 1 ? tops[i + 1] : maxScroll
            return { id: c.id, top: tops[i], height: Math.max(1, end - tops[i]), start: chapterStarts[c.id], length: c.length }
          })
        }
        measure()

        let lenis: Lenis | null = null
        if (!stills) {
          lenis = new Lenis({
            autoRaf: false,
            lerp: 0.1,
            smoothWheel: true,
            syncTouch: false,
            anchors: true,
            prevent: (node) => !!node.closest?.('[data-lenis-prevent]'),
          })
        }
        const currentY = () => (lenis ? lenis.scroll : window.scrollY)

        let lastChapter = ''
        const update = () => {
          const y = currentY()
          let time = 0
          let active = ranges[0]
          for (const r of ranges) {
            if (y >= r.top) active = r
          }
          if (active) {
            const local = Math.min(1, Math.max(0, (y - active.top) / active.height))
            time = active.start + local * active.length
            live.chapterProgress = local
          }
          time = Math.min(totalLength, Math.max(0, time))
          live.time = time
          if (active && active.id !== lastChapter) {
            document.getElementById(lastChapter)?.removeAttribute('data-active')
            document.getElementById(active.id)?.setAttribute('data-active', '')
            lastChapter = active.id
            story.getState().set({ chapter: active.id })
            if (stills && !isStatic) {
              const ch = chapters.find((c) => c.id === active.id)!
              const layer = document.querySelector<HTMLElement>('.scene-layer canvas')
              if (layer) gsap.fromTo(layer, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power1.out' })
              tl.time(stillTime(ch))
            }
          }
          if (!stills) tl.time(time)
        }

        const tick = (t: number) => lenis?.raf(t * 1000)
        if (lenis) {
          lenis.on('scroll', () => {
            ScrollTrigger.update()
            update()
          })
          gsap.ticker.add(tick)
          gsap.ticker.lagSmoothing(0)
        } else {
          window.addEventListener('scroll', update, { passive: true })
        }
        const onRefresh = () => {
          measure()
          update()
        }
        ScrollTrigger.addEventListener('refresh', onRefresh)

        // content height changes (catalogue filters, form results) → re-measure
        let raf = 0
        const ro = new ResizeObserver(() => {
          cancelAnimationFrame(raf)
          raf = requestAnimationFrame(() => ScrollTrigger.refresh())
        })
        ro.observe(document.body)
        document.fonts?.ready.then(() => ScrollTrigger.refresh())

        // copy fades (scrub mode only; without JS or with reduced motion copy is simply visible)
        if (!stills) {
          document.querySelectorAll<HTMLElement>('[data-chapter-copy]').forEach((el) => {
            const section = el.closest('section')!
            // data-chapter-copy: "" = fade in and out, "in" = fade in only, "out" = visible from the start (hero)
            const fadeOut = el.dataset.chapterCopy !== 'in'
            const fadeIn = el.dataset.chapterCopy !== 'out'
            const t = gsap.timeline({
              // From the chapter's first pixel to its last ('bottom bottom': the box is the chapter plus
              // one overlapping viewport). Outgoing copy is gone exactly when incoming copy starts.
              scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: true },
            })
            if (fadeIn) t.fromTo(el, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.12, ease: 'power2.out' })
            else t.to(el, { duration: 0.12 })
            t.to(el, { duration: 0.76 })
            if (fadeOut) t.to(el, { autoAlpha: 0, y: -28, duration: 0.12, ease: 'power2.in' })
            else t.to(el, { duration: 0.12 })
          })
        }

        scrollApi.toChapter = (id, opts = {}) => {
          const r = ranges.find((x) => x.id === id)
          if (!r) return
          const ch = chapters.find((c) => c.id === id)!
          const at = opts.at ?? ch.still ?? 0.5
          const y = r.top + Math.min(at, 0.999) * r.height
          if (lenis) {
            const dist = Math.abs(y - lenis.scroll)
            lenis.scrollTo(y, {
              immediate: opts.immediate,
              force: true,
              duration: Math.min(2.2, 0.8 + dist / 4000),
              easing: (x) => 1 - Math.pow(1 - x, 3),
            })
          } else {
            window.scrollTo({ top: y, behavior: 'auto' })
          }
        }

        if (new URLSearchParams(location.search).has('qa')) {
          const w = window as unknown as Record<string, unknown>
          w.__jumpTo = (id: string, at?: number) => scrollApi.toChapter(id, { immediate: true, at })
          w.__ranges = () => ranges
        }

        // pointer for the cursor tilt (desktop only)
        const hover = window.matchMedia('(hover: hover)').matches
        const onMove = (e: PointerEvent) => {
          live.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
          live.pointer.y = (e.clientY / window.innerHeight) * 2 - 1
        }
        if (hover && !stills) window.addEventListener('pointermove', onMove, { passive: true })

        update()

        return () => {
          ro.disconnect()
          cancelAnimationFrame(raf)
          ScrollTrigger.removeEventListener('refresh', onRefresh)
          window.removeEventListener('scroll', update)
          window.removeEventListener('pointermove', onMove)
          gsap.ticker.remove(tick)
          lenis?.destroy()
          tl.kill()
        }
      },
    )
    return () => mm.revert()
  })
  return null
}
