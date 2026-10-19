---
name: lighting-and-look
description: Use when setting up or tuning materials, environment lighting, shadows, bloom, depth of field, tone mapping and colour management for the premium dark product-film finish, including the per-chapter lighting states (rim, warning heat, accent highlight).
---

# Lighting and look

## Colour pipeline (three 0.186 / R3F 9)
- R3F defaults: `outputColorSpace = SRGBColorSpace`, `toneMapping = ACESFilmicToneMapping`, ColorManagement on. Hex colours in JSX are sRGB and auto-converted.
- Colour textures (CanvasTexture screen, labels) → `colorSpace = SRGBColorSpace`. Data textures (roughness/normal) → leave `NoColorSpace`.
- **With an EffectComposer, the renderer's tone mapping is switched off.** Verified in `@react-three/postprocessing` 3.1.3 source: the composer runs `gl.toneMapping = NoToneMapping` while mounted. Add `<ToneMapping mode={ToneMappingMode.AGX} />` (or ACES_FILMIC) as the LAST effect. Verify on screen: if it looks washed-out/too bright compared to no-composer, tone mapping is applied twice or not at all.
- Materials that must keep exact UI colour (screen) or glow (scan bar, accent edges): `toneMapped={false}`.

## Environment = reflections, built locally
drei warns `preset` loads from a CDN and "is not meant to be used in production". Build the studio in code:

```tsx
<Environment resolution={256} frames={1}>
  <Lightformer form="rect" intensity={2} position={[0, 5, -4]} scale={[10, 2, 1]} />   {/* top strip */}
  <Lightformer form="rect" intensity={1.2} position={[-6, 1, 1]} rotation-y={Math.PI/2} scale={[6, 1.5, 1]} />
  <Lightformer form="ring" color="#5fe3ff" intensity={0.6} position={[5, 2, 2]} scale={2} />
</Environment>
```
`frames={1}` bakes once (cheap). Set `scene.environmentIntensity` per chapter instead of re-rendering the env.

## Light rig (few lights, no shadow maps by default)
- **Key**: one `spotLight`/`directionalLight`, soft, slightly warm-neutral.
- **Rim**: back light, cool white, high intensity — sells silhouette in the dark hero.
- **Screen spill**: a `rectAreaLight` is expensive; use a `pointLight` (no shadows) in front of the screen, intensity tied to lid angle × screen brightness, colour = screen average.
- **Warning**: amber-red `pointLight` under the chassis, intensity from rig `heat`; only in "Something is wrong".
- **Accent**: cyan point light that follows the focused part during service stops.
- Ground: big plane, `meshStandardMaterial` near-black, roughness 0.9. Contact shadows give grounding.

## Shadows
`<ContactShadows position={[0,0.001,0]} scale={12} blur={2.4} far={3} opacity={0.6} resolution={512|256} frames={tier.high ? Infinity : 1} />`
It is "rather expensive"; it re-renders the scene from below each frame. On low tier bake once (`frames={1}`) and accept that exploded parts don't update their shadow. Avoid real shadow maps (renders scene once per light).

## Post-processing (tasteful)
```tsx
<EffectComposer multisampling={tier.msaa} enableNormalPass={false}>
  <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.6} />
  {tier.dof ? <DepthOfField ref={dof} worldFocusRange={2} bokehScale={0} /> : <></>}
  <Vignette offset={0.25} darkness={0.7} />
  <ToneMapping mode={ToneMappingMode.AGX} />
</EffectComposer>
```
- Selective bloom: threshold 1 + `toneMapped:false` emissive >1. Only screen, scan line, LED, glowing logo, accent edges should bloom.
- DoF only on high tier and only in close-up chapters. **Verified API:** props are `worldFocusDistance`, `worldFocusRange`, `focalLength`, `bokehScale`, `target`. Changing `worldFocusDistance`/`worldFocusRange` *props* recreates the effect (they are useMemo deps). Animate via ref instead:
  ```ts
  const ref = useRef<DepthOfFieldEffect>(null)   // import type { DepthOfFieldEffect } from 'postprocessing'
  useFrame(({ camera }) => { const e = ref.current; if (!e) return
    e.cocMaterial.worldFocusDistance = camera.position.distanceTo(target); e.bokehScale = rig.u.dof * 3 })
  ```
- `ToneMappingMode` (postprocessing 6.39): ACES_FILMIC 6, AGX 7, NEUTRAL 8.
- Conditional effects inside `<EffectComposer>`: the prototype used `{cond ? <Dof/> : <></>}`, which typechecks and builds. Re-verify before switching to `cond && <Dof/>`.
- Cost order (most→least): DoF > Bloom (mipmap) > MSAA 4 > Vignette/ToneMapping.

## Palette (brand)
background `#0b0c0d`, text `#ecebe6`, accent cyan `#5fe3ff`, warning `#ff5a36`. The warning colour appears ONLY in the fault chapter and the diagnosis fault pulse.

## Mistakes
- Fully black materials on a black stage: lift albedo to ~#1a1c1e so the rim and env carve form.
- Metalness 1 without an env map → looks like black plastic.
- Bloom on everything (threshold < 1) → milky, cheap.
- Using `preset="studio"` in production.

Sources: [sources.md](sources.md)
