'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { PRESETS, lerpPreset, detectTier } from './sceneStore'
import {
  createFluidState, tickFluid, attachPointerListener,
  type FluidState,
} from './webgl/fluidInteraction'
import {
  microVert, microFrag,
  mediumVert, mediumFrag,
  largeVert, largeFrag,
  smokeVert, smokeFrag,
  shaftVert, shaftFrag,
} from './webgl/shaders'
import { buildMicroGeometry, buildClusteredGeometry, type Span } from './webgl/particleGeometry'

/* ── Particle counts per GPU tier ──────────────────────────── */
/* Counts are tuned for a 16:9 frame; wider frames get proportionally more so
   density per screen area stays constant instead of thinning out. */
function mkCounts(tier: 0|1|2|3, aspect: number): [number, number, number] {
  const k = Math.min(Math.max(aspect / 1.78, 0.85), 1.5)
  const base: [number, number, number] =
      tier === 3 ? [28_000, 82_000, 15_000]
    : tier === 2 ? [14_000, 42_000,  8_000]
    : tier === 1 ? [ 4_500, 15_000,  2_600]
    :              [0, 0, 0]
  return [Math.round(base[0]*k), Math.round(base[1]*k), Math.round(base[2]*k)]
}

/**
 * Half-extent of the particle volume, sized so the field reaches the edges of
 * the frustum at mid depth. A fixed cube leaves the viewport's left and right
 * thirds empty on any landscape screen.
 */
const Z_MID = -1.0
function computeSpan(camera: THREE.PerspectiveCamera): Span {
  const halfH = Math.tan((camera.fov * Math.PI/180) * 0.5) * (camera.position.z - Z_MID)
  return { x: halfH * camera.aspect * 1.05, y: halfH * 1.15 }
}

/* ── Colored dark section backgrounds ──────────────────────── */
const SECTION_BG: Record<string, string> = {
  hero:        'radial-gradient(ellipse 90% 75% at 68% 38%, #28172f 0%, #211326 30%, #17151f 62%, #090d18 100%)',
  whatA:       'radial-gradient(ellipse 85% 70% at 28% 55%, #11162b 0%, #0b2025 35%, #090d18 68%, #060810 100%)',
  whatB:       'radial-gradient(ellipse 95% 65% at 62% 38%, #321b1a 0%, #28120a 35%, #17100a 65%, #0e0805 100%)',
  whatC:       'radial-gradient(ellipse 80% 72% at 75% 35%, #0b1a2e 0%, #11162b 32%, #17151f 62%, #090d18 100%)',
  value:       'radial-gradient(ellipse 95% 68% at 50% 52%, #211c1b 0%, #1a1509 35%, #12100a 65%, #0a0807 100%)',
  publicValue: 'radial-gradient(ellipse 80% 65% at 35% 55%, #0b2025 0%, #11162b 32%, #090d18 65%, #060810 100%)',
  works:       'radial-gradient(ellipse 85% 68% at 65% 40%, #2a1508 0%, #1e0f05 35%, #130c05 65%, #090604 100%)',
  ending:      'radial-gradient(ellipse 88% 68% at 50% 68%, #211c1b 0%, #1a150a 35%, #120f08 62%, #090704 100%)',
}

function smoothstep(t: number) { return t*t*(3-2*t) }

/* ── Shared uniform factory ─────────────────────────────────── */
function makeBaseUniforms(p0: typeof PRESETS.hero, dpr: number, size: number, span: THREE.Vector2) {
  return {
    uTime:         { value: 0 },
    uSize:         { value: size },
    uDPR:          { value: dpr },
    uSpan:         { value: span },
    uLightColorA:  { value: new THREE.Vector3(...p0.lightColorA) },
    uLightColorB:  { value: new THREE.Vector3(...p0.lightColorB) },
    uAmbient:      { value: new THREE.Vector3(...p0.ambientColor) },
    uPointerForce: { value: p0.pointerForce },
    uTurbulence:   { value: p0.turbulence },
    uIdleSpeed:    { value: p0.idleSpeed },
    uFlowDir:      { value: new THREE.Vector3(...p0.flowDir) },
  }
}

function applyPreset(u: Record<string, { value: unknown }>, cur: typeof PRESETS.hero) {
  ;(u.uLightColorA.value as THREE.Vector3).set(...cur.lightColorA)
  ;(u.uLightColorB.value as THREE.Vector3).set(...cur.lightColorB)
  ;(u.uAmbient.value as THREE.Vector3).set(...cur.ambientColor)
  u.uPointerForce.value = cur.pointerForce
  u.uTurbulence.value   = cur.turbulence
  u.uIdleSpeed.value    = cur.idleSpeed
  ;(u.uFlowDir.value as THREE.Vector3).set(...cur.flowDir)
}

/* ══════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════ */
export default function WebGLBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bgRef     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const bgEl   = bgRef.current
    if (!canvas) return

    const tier = detectTier()
    const [cntMicro, cntMedium, cntLarge] = mkCounts(tier, window.innerWidth/window.innerHeight)
    if (tier === 0 || cntMedium === 0) return

    const dpr = Math.min(window.devicePixelRatio, tier >= 3 ? 1.5 : 1.0)
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true })
    renderer.setPixelRatio(dpr)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 50)
    camera.position.z = 3.5

    const p0   = PRESETS.hero
    const SIZE = tier >= 3 ? 1.9 : tier === 2 ? 1.7 : 1.5

    const span    = computeSpan(camera)
    const spanVec = new THREE.Vector2(span.x, span.y)

    /* ── Micro particles ─────────────────────────────── */
    const microGeo  = buildMicroGeometry(cntMicro, span)
    const microUnis = { ...makeBaseUniforms(p0, dpr, SIZE, spanVec), uFluidFast: { value: new THREE.Vector2(0,0) } }
    scene.add(new THREE.Points(microGeo, new THREE.ShaderMaterial({
      vertexShader: microVert, fragmentShader: microFrag,
      uniforms: microUnis, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    })))

    /* ── Medium clustered splats ─────────────────────── */
    const medGeo  = buildClusteredGeometry(cntMedium, span)
    const medUnis = {
      ...makeBaseUniforms(p0, dpr, SIZE, spanVec),
      uFluidMid:    { value: new THREE.Vector2(0,0) },
      uFluidOffset: { value: new THREE.Vector2(0,0) },
    }
    scene.add(new THREE.Points(medGeo, new THREE.ShaderMaterial({
      vertexShader: mediumVert, fragmentShader: mediumFrag,
      uniforms: medUnis, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    })))

    /* ── Large atmospheric splats ────────────────────── */
    const largeGeo  = buildClusteredGeometry(cntLarge, span)
    const largeUnis = {
      ...makeBaseUniforms(p0, dpr, SIZE, spanVec),
      uFluidSlow:   { value: new THREE.Vector2(0,0) },
      uFluidOffset: { value: new THREE.Vector2(0,0) },
    }
    scene.add(new THREE.Points(largeGeo, new THREE.ShaderMaterial({
      vertexShader: largeVert, fragmentShader: largeFrag,
      uniforms: largeUnis, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    })))

    /* ── Smoke planes ────────────────────────────────── */
    const smokeDefs = [
      { z: -3.2, scale: 8.0, layer: 0.0, opacity: 0.26 },
      { z: -2.0, scale: 6.2, layer: 0.5, opacity: 0.18 },
      { z: -0.8, scale: 4.5, layer: 1.0, opacity: 0.10 },
    ]
    const smokePlaneGeo = new THREE.PlaneGeometry(1,1)
    const smokeMats: THREE.ShaderMaterial[] = []
    const smokeMeshes: THREE.Mesh[] = []
    const smokeFluidOff = new THREE.Vector2(0,0)
    for (const def of smokeDefs) {
      const sm = new THREE.ShaderMaterial({
        vertexShader: smokeVert, fragmentShader: smokeFrag,
        uniforms: {
          uSmokeColor: { value: new THREE.Vector3(...p0.lightColorA).multiplyScalar(0.55) },
          uOpacity: { value: def.opacity }, uTime: { value: 0 },
          uLayer: { value: def.layer }, uFluidOff: { value: smokeFluidOff },
        },
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
      const m = new THREE.Mesh(smokePlaneGeo, sm)
      m.position.z = def.z; m.scale.set(def.scale*camera.aspect, def.scale, 1)
      m.userData.baseScale = def.scale
      scene.add(m); smokeMats.push(sm); smokeMeshes.push(m)
    }

    /* ── Light shafts ────────────────────────────────── */
    const shaftDefs = [
      { pos: [ 0.9, 0.3,-3.0] as [number,number,number], sx:1.4, sy:6.0, rz: 0.18, phase:0.0 },
      { pos: [-0.7,-0.4,-2.4] as [number,number,number], sx:1.1, sy:5.0, rz:-0.25, phase:1.6 },
    ]
    const shaftGeo = new THREE.PlaneGeometry(1,1)
    const shaftMats: THREE.ShaderMaterial[] = []
    for (const def of shaftDefs) {
      const sm = new THREE.ShaderMaterial({
        vertexShader: shaftVert, fragmentShader: shaftFrag,
        uniforms: {
          uColor: { value: new THREE.Vector3(...p0.lightColorA) },
          uOpacity: { value: 0.06 }, uTime: { value: 0 }, uPhase: { value: def.phase },
        },
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
      const m = new THREE.Mesh(shaftGeo, sm)
      m.position.set(...def.pos); m.scale.set(def.sx, def.sy, 1); m.rotation.z = def.rz
      scene.add(m); shaftMats.push(sm)
    }

    /* ── Fluid state ─────────────────────────────────── */
    const fluid: FluidState = createFluidState()
    const detachPointer = attachPointerListener(fluid)

    /* ── Preset state ────────────────────────────────── */
    let currentPreset = { ...p0 }, targetPreset = { ...p0 }, lerpT = 1, lastPreset = 'hero'

    const SECTIONS = [
      { id: '#hero', preset: 'hero' }, { id: '#what', preset: 'whatA' },
      { id: '#value', preset: 'value' }, { id: '#public', preset: 'publicValue' },
      { id: '#works', preset: 'works' }, { id: '#ending', preset: 'ending' },
    ]
    const detectSection = () => {
      const mid = window.innerHeight * 0.42
      let hit = 'hero'
      for (const s of SECTIONS) {
        const el = document.querySelector(s.id); if (!el) continue
        const r = el.getBoundingClientRect()
        if (r.top <= mid && r.bottom > mid) { hit = s.preset; break }
      }
      if (hit === 'whatA') {
        const el = document.querySelector('#what')
        if (el) {
          const r = el.getBoundingClientRect()
          const prog = Math.min(1, Math.max(0, -r.top)/(el.scrollHeight-window.innerHeight))
          hit = prog < 0.33 ? 'whatA' : prog < 0.66 ? 'whatB' : 'whatC'
        }
      }
      if (hit !== lastPreset) {
        targetPreset = { ...PRESETS[hit] ?? PRESETS.hero }
        lerpT = 0; lastPreset = hit
        if (bgEl) bgEl.style.background = SECTION_BG[hit] ?? SECTION_BG.hero
      }
    }
    window.addEventListener('scroll', detectSection, { passive: true })
    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight)
      camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix()
      const s = computeSpan(camera)
      spanVec.set(s.x, s.y)
      for (const m of smokeMeshes) {
        const b = m.userData.baseScale as number
        m.scale.set(b*camera.aspect, b, 1)
      }
    }
    window.addEventListener('resize', onResize)
    if (bgEl) bgEl.style.background = SECTION_BG.hero

    /* ── RAF ─────────────────────────────────────────── */
    let rafId = 0, time = 0, last = performance.now()
    const frame = () => {
      rafId = requestAnimationFrame(frame)
      const now = performance.now()
      const dt = Math.min((now-last)/1000, 0.05)
      last = now; time += dt

      tickFluid(fluid)

      lerpT = Math.min(1, lerpT + dt/1.4)
      const cur = lerpPreset(currentPreset, targetPreset, smoothstep(lerpT))
      if (lerpT >= 1) currentPreset = { ...targetPreset }

      /* micro */
      microUnis.uTime.value = time
      applyPreset(microUnis as Record<string, { value: unknown }>, cur)
      ;(microUnis.uFluidFast.value as THREE.Vector2).copy(fluid.fast)

      /* medium */
      medUnis.uTime.value = time
      applyPreset(medUnis as Record<string, { value: unknown }>, cur)
      ;(medUnis.uFluidMid.value as THREE.Vector2).copy(fluid.mid)
      ;(medUnis.uFluidOffset.value as THREE.Vector2).copy(fluid.offset)

      /* large */
      largeUnis.uTime.value = time
      applyPreset(largeUnis as Record<string, { value: unknown }>, cur)
      ;(largeUnis.uFluidSlow.value as THREE.Vector2).copy(fluid.slow)
      ;(largeUnis.uFluidOffset.value as THREE.Vector2).copy(fluid.offset)

      /* smoke */
      smokeFluidOff.copy(fluid.offset)
      const sCA = new THREE.Vector3(...cur.lightColorA).multiplyScalar(0.55)
      const sCB = new THREE.Vector3(...cur.lightColorB).multiplyScalar(0.35)
      for (let i = 0; i < smokeMats.length; i++) {
        smokeMats[i].uniforms.uTime.value = time
        smokeMats[i].uniforms.uSmokeColor.value.copy(i%2===0?sCA:sCB)
      }

      /* shafts */
      const t2 = Math.sin(time*0.14)*0.5+0.5
      const sc = new THREE.Vector3(...cur.lightColorA).lerp(new THREE.Vector3(...cur.lightColorB), t2)
      for (const sm of shaftMats) { sm.uniforms.uTime.value = time; sm.uniforms.uColor.value.copy(sc) }

      /* camera drift */
      camera.position.x = Math.sin(time*0.06)*0.05 + fluid.smoothPtr.x*0.032
      camera.position.y = Math.cos(time*0.048)*0.04 + fluid.smoothPtr.y*0.025

      renderer.render(scene, camera)
    }
    rafId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(rafId); detachPointer()
      window.removeEventListener('scroll', detectSection)
      window.removeEventListener('resize', onResize)
      microGeo.dispose(); medGeo.dispose(); largeGeo.dispose()
      smokePlaneGeo.dispose(); shaftGeo.dispose()
      smokeMats.forEach(m=>m.dispose()); shaftMats.forEach(m=>m.dispose())
      renderer.dispose()
    }
  }, [])

  return (
    <>
      <div ref={bgRef} aria-hidden="true" style={{
        position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
        transition:'background 2.5s cubic-bezier(0.4,0,0.2,1)',
        background: SECTION_BG.hero,
      }}/>
      <canvas ref={canvasRef} aria-hidden="true" style={{
        position:'fixed', inset:0, width:'100%', height:'100%',
        pointerEvents:'none', zIndex:1,
      }}/>
      <div aria-hidden="true" style={{
        position:'fixed', inset:0, zIndex:2, pointerEvents:'none',
        background:'radial-gradient(ellipse 75% 70% at 50% 50%, transparent 45%, rgba(6,4,12,0.55) 100%)',
      }}/>
    </>
  )
}
