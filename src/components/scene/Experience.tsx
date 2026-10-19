'use client'
import { Canvas, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { autoTierEnabled, quality, TIERS, useTier } from '@/lib/quality'
import { story, useStory } from '@/lib/store'
import { Director } from './Director'
import { Effects } from './Effects'
import { Laptop } from './laptop/Laptop'
import { ScreenPainter } from './screenPainter'
import { Shelf, Stage } from './Stage'

/** Compile every shader before revealing, then flag the scene ready (drives the preloader). */
function ReadyGate({ post }: { post: boolean }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const setFrameloop = useThree((s) => s.setFrameloop)
  useEffect(() => {
    let cancelled = false
    story.getState().set({ loadStep: 0.7 })
    const done = () => {
      if (cancelled) return
      // Start rendering only now. Rendering while KHR_parallel_shader_compile is still working
      // makes the first frame block on every program (a ~1 s main-thread long task).
      setFrameloop(document.hidden ? 'never' : 'always')
      story.getState().set({ ready: true, loadStep: 1 })
      if (new URLSearchParams(location.search).has('qa')) (window as unknown as Record<string, unknown>).__sceneReady = true
    }
    const fallback = setTimeout(done, 2500)
    // Shader variants depend on the render target: with post-processing the scene is drawn into a
    // linear render target without tone mapping, so compile THAT variant (binding an RT while
    // compile() runs). Compiling for the canvas instead made every material recompile on frame 1 (~1 s).
    const rt = post ? new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }) : null
    if (rt) gl.setRenderTarget(rt)
    const compiling = gl.compileAsync(scene, camera) // compile() runs synchronously here; polling is async
    if (rt) gl.setRenderTarget(null)
    compiling.then(done, done).finally(() => rt?.dispose())
    return () => {
      cancelled = true
      clearTimeout(fallback)
    }
  }, [gl, scene, camera, setFrameloop, post])
  return null
}

/** ?qa=1 only: expose renderer stats and the active tier for the QA scripts. */
function QaProbe() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    if (!new URLSearchParams(location.search).has('qa')) return
    const w = window as unknown as Record<string, unknown>
    w.__glInfo = () => ({
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      programs: gl.info.programs?.length ?? 0,
      tier: quality.getState().tier,
      dpr: gl.getPixelRatio(),
    })
  }, [gl])
  return null
}

/** Pause rendering when the tab is hidden. */
function VisibilityPause() {
  const setFrameloop = useThree((s) => s.setFrameloop)
  useEffect(() => {
    const on = () => setFrameloop(document.hidden ? 'never' : 'always')
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [setFrameloop])
  return null
}

/** Context loss → static fallback, never a blank page. */
function ContextLossGuard({ onLost }: { onLost: () => void }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const el = gl.domElement
    const lost = (e: Event) => {
      e.preventDefault()
      onLost()
    }
    el.addEventListener('webglcontextlost', lost)
    return () => el.removeEventListener('webglcontextlost', lost)
  }, [gl, onLost])
  return null
}

export default function Experience({ onFail }: { onFail: () => void }) {
  const tier = useTier()
  // geometry detail is fixed at the starting tier (re-meshing mid-visit isn't worth the hitch)
  const [startTier] = useState(() => TIERS[quality.getState().tier])
  const painter = useMemo(() => new ScreenPainter(...startTier.screenRes), [startTier])
  useEffect(() => () => painter.dispose(), [painter])
  const root = useRef<THREE.Group>(null)
  const catalog = useStory((s) => s.catalog)
  // measure only once the scene is compiled and revealed; load-time frames are not representative
  const ready = useStory((s) => s.ready)

  return (
    <Canvas
      dpr={[1, tier.maxDpr]}
      gl={{ antialias: !tier.post || tier.msaa === 0, powerPreference: 'high-performance', alpha: false, stencil: false }}
      camera={{ fov: 30, near: 0.1, far: 60, position: [3.4, 1.3, 7.2] }}
      eventSource={document.body} // client-only component (ssr:false), HTML overlays the canvas
      eventPrefix="client"
      frameloop="never" // ReadyGate switches it on once shaders are compiled
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.AgXToneMapping
        story.getState().set({ loadStep: 0.45 })
      }}
      onPointerMissed={() => story.getState().set({ hovered: null })}
    >
      {ready && autoTierEnabled() && <PerformanceMonitor
        // decline only on SUSTAINED low frame rate (~5 s below 38 fps); transition hitches don't count
        ms={500}
        iterations={10}
        threshold={0.8}
        bounds={(refresh) => (refresh > 90 ? [45, 90] : [38, 60])}
        flipflops={3}
        onDecline={() => quality.getState().drop()}
        onFallback={() => quality.getState().set('low')}
      />}
      <Stage tier={tier} />
      <Laptop ref={root} segments={startTier.segments} smd={startTier.smd} screen={painter.texture} />
      <Shelf products={catalog} />
      <Director root={root} painter={painter} screenHz={tier.screenHz} />
      <Effects tier={tier} />
      <ReadyGate post={tier.post} />
      <VisibilityPause />
      <QaProbe />
      <ContextLossGuard onLost={onFail} />
    </Canvas>
  )
}
