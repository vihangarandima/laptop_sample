'use client'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import type { Group } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { registerPart, type PartName } from '@/lib/parts'
import { chapters } from '@/content/chapters'
import { scrollApi, story } from '@/lib/store'
import { adoptPartMaterials } from './partLook'

/** Which parts can be hovered/clicked in the service chapters, and where clicking jumps to. */
const PART_TO_CHAPTER = new Map<PartName, string>()
for (const c of chapters) for (const p of c.service?.parts ?? []) PART_TO_CHAPTER.set(p, c.id)
const isServiceChapter = (id: string) => id === 'teardown' || id.startsWith('svc-')

type Props = {
  name: PartName
  position?: readonly [number, number, number]
  rotation?: readonly [number, number, number]
  children: ReactNode
}

/**
 * A named, individually animated part. Registers itself so the timeline can address it by
 * name, and owns its materials so it can be dimmed or lit without touching other parts.
 */
export function Part({ name, position = [0, 0, 0], rotation = [0, 0, 0], children }: Props) {
  const ref = useRef<Group>(null)
  useLayoutEffect(() => {
    const g = ref.current
    if (!g) return
    registerPart(name, g)
    adoptPartMaterials(name, g)
    return () => registerPart(name, null)
  }, [name])

  const target = PART_TO_CHAPTER.get(name)
  const over = (e: ThreeEvent<PointerEvent>) => {
    if (!target || !isServiceChapter(story.getState().chapter)) return
    e.stopPropagation()
    if (story.getState().hovered !== name) story.getState().set({ hovered: name })
  }
  const out = () => {
    if (story.getState().hovered === name) story.getState().set({ hovered: null })
  }
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (!target || !isServiceChapter(story.getState().chapter)) return
    e.stopPropagation()
    scrollApi.toChapter(target)
  }

  return (
    <group
      ref={ref}
      name={name}
      position={position as [number, number, number]}
      rotation={rotation as [number, number, number]}
      onPointerOver={target ? over : undefined}
      onPointerOut={target ? out : undefined}
      onClick={target ? click : undefined}
    >
      {children}
    </group>
  )
}
