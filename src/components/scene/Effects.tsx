'use client'
import { useFrame } from '@react-three/fiber'
import { Bloom, DepthOfField, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode, type DepthOfFieldEffect } from 'postprocessing'
import { useRef } from 'react'
import { rigRef } from '@/lib/timeline'
import type { Tier } from '@/lib/quality'

/** Depth of field driven by the rig: focus on the camera target, strength from `u.dof`. */
function Focus() {
  const ref = useRef<DepthOfFieldEffect>(null)
  useFrame(({ camera }) => {
    const e = ref.current
    const rig = rigRef.current
    if (!e || !rig) return
    const d = Math.hypot(camera.position.x - rig.cam.tx, camera.position.y - rig.cam.ty, camera.position.z - rig.cam.tz)
    e.cocMaterial.worldFocusDistance = d
    e.cocMaterial.worldFocusRange = 1.6 + d * 0.25
    e.bokehScale = rig.u.dof * 2.6
  })
  return <DepthOfField ref={ref} worldFocusDistance={6} worldFocusRange={3} bokehScale={0} />
}

/**
 * Tasteful post: selective bloom (threshold 1, only toneMapped:false emissives exceed it),
 * DoF on high tier only, vignette, AgX tone mapping LAST (the composer disables the
 * renderer's own tone mapping while mounted).
 */
export function Effects({ tier }: { tier: Tier }) {
  if (!tier.post) return null
  return (
    <EffectComposer key={`${tier.name}-${tier.msaa}-${tier.dof}-${tier.bloom}`} multisampling={tier.msaa} enableNormalPass={false}>
      {tier.bloom ? <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.25} intensity={0.75} /> : <></>}
      {tier.dof ? <Focus /> : <></>}
      <Vignette offset={0.28} darkness={0.72} />
      <ToneMapping mode={ToneMappingMode.AGX} />
    </EffectComposer>
  )
}
