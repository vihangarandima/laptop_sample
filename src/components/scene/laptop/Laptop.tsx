'use client'
import { forwardRef, useEffect, useMemo } from 'react'
import type { Group, Texture } from 'three'
import { makeMaterials } from '../materials'
import { BottomCover, Hinge, KeyboardDeck, Screws } from './Chassis'
import { Battery, Fan, HeatPipes, Motherboard, Ram, Ssd } from './Internals'
import { Lid } from './Lid'

/**
 * The stage laptop, built entirely in code. Every part is a named <Part>; the timeline
 * addresses them by name only (see src/lib/parts.ts), so replacing this component with a
 * loaded .glb whose nodes are registered under the same names is a contained change.
 */
export const Laptop = forwardRef<Group, { segments: number; smd: number; screen: Texture }>(function Laptop(
  { segments, smd, screen },
  ref,
) {
  const mat = useMemo(() => makeMaterials(), [])
  useEffect(() => () => Object.values(mat).forEach((m) => m.dispose()), [mat])
  return (
    <group ref={ref} name="laptopRoot">
      <BottomCover mat={mat} seg={segments} />
      <Screws mat={mat} />
      <Battery mat={mat} seg={segments} />
      <Motherboard mat={mat} seg={segments} smd={smd} />
      <Fan mat={mat} seg={segments} />
      <HeatPipes mat={mat} />
      <Ram mat={mat} />
      <Ssd mat={mat} />
      <KeyboardDeck mat={mat} seg={segments} />
      <Hinge mat={mat} />
      <Lid mat={mat} seg={segments} screen={screen} />
    </group>
  )
})
