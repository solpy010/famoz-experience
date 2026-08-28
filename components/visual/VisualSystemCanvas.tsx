'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { detectTier } from '../sceneStore'
import { visualParams, visualEvents, LAYER_RESPONSE, VIEW_INDEX, LAYER_FILTER } from './visualParams'
import { buildSplatField, type Span, type SplatBuffers } from './particleField'
import { splatVert, splatFrag, fogVert, fogFrag } from './particleShaders'
import { MaskField } from './maskField'
import { spaceVert, spaceFrag } from './spaceFieldShader'
import type { PointerField } from './pointerField'

/**
 * L3 (Fog) + L4 (Gaussian Splat) 을 담는 단일 Canvas.  z-index 3.
 *
 * 스모그를 DOM이 아니라 이 캔버스에 두는 이유: 문서 §5·§10 이 스모그와 splat이
 * **같은 velocity field** 를 공유하되 지연만 다르도록 요구하기 때문이다.
 * z-index 2 의 DOM 레이어는 볼류메트릭 광원만 담당한다.
 *
 * Canvas는 pointer-events: none 이며 모든 콘텐츠(z 10/20)보다 아래에 있다.
 */

const Z_MID = -1.2
const FOV = 55
const CAM_Z = 3.4

function computeSpan(camera: THREE.PerspectiveCamera): Span {
  const halfH = Math.tan((camera.fov * Math.PI / 180) * 0.5) * (camera.position.z - Z_MID)
  return { x: halfH * camera.aspect * 1.06, y: halfH * 1.16 }
}

function tierScale(tier: 0 | 1 | 2 | 3): number {
  // tier 1 = 모바일. 40k * 0.30 = 12k (지시서 §8 권장 10~14k)
  return tier === 3 ? 1 : tier === 2 ? 0.52 : tier === 1 ? 0.30 : 0
}

export type VisualStats = {
  fps: number; points: number; coverage: number; tier: number
  dpr: number; frameMs: number
  drawCalls: number; geometries: number; textures: number; programs: number
}

export default function VisualSystemCanvas({
  pointer,
  active = true,
  intensity = 1,
  onStats,
}: {
  pointer: PointerField
  /** false면 렌더를 멈춘다. Hero를 벗어났을 때 고비용 갱신을 끊는 용도. */
  active?: boolean
  /** 0~1. 인트로에서 파티클 밀도와 공간면을 올리는 램프. */
  intensity?: number
  onStats?: (s: VisualStats) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  /* onStats는 매 렌더마다 새 참조로 들어오기 쉽다. deps에 넣으면 WebGL 씬이
     통째로 재생성되므로 ref로 받는다. */
  const statsRef = useRef(onStats)
  statsRef.current = onStats
  const activeRef = useRef(active)
  activeRef.current = active
  const intensityRef = useRef(intensity)
  intensityRef.current = intensity

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const tier = detectTier()
    if (tier === 0) return   // reduced-motion: 정적 배경만 남긴다

    const dpr = Math.min(window.devicePixelRatio, tier >= 3 ? 1.5 : 1.0)
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true })
    renderer.setPixelRatio(dpr)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 60)
    camera.position.z = CAM_Z

    let span = computeSpan(camera)
    const spanVec = new THREE.Vector2(span.x, span.y)
    pointer.setView(Math.tan((FOV * Math.PI / 180) * 0.5) * (CAM_Z - Z_MID), camera.aspect)

    /* ── 공유 uniform ─────────────────────────────────── */
    const strokes = pointer.strokes
    const mask = new MaskField()
    const maskTexel = new THREE.Vector2(1 / 720, 1 / 450)
    const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight)

    const shared = () => ({
      uTime:            { value: 0 },
      uDPR:             { value: dpr },
      uCamPos:          { value: camera.position.clone() },
      uStrokes:         { value: strokes },
      uStrokeCount:     { value: 0 },
      uPointerRadius:   { value: 0.6 },
      uPointerForce:    { value: visualParams.pointerForce },
      uMaxDisp:         { value: visualParams.maxDisplacement },
      uSwirl:           { value: visualParams.swirl },
      uMaxPointerSpeed: { value: visualParams.maxPointerSpeed },
      uCoreTex:         { value: mask.coreTex },
      uSoftTex:         { value: mask.softTex },
      uMaskTexel:       { value: maskTexel },
      uMainLight:       { value: new THREE.Vector3(...visualParams.mainLight) },
      uMainColor:       { value: new THREE.Vector3(...visualParams.mainLightColor) },
      uSideLight:       { value: new THREE.Vector3(...visualParams.sideLight) },
      uSideColor:       { value: new THREE.Vector3(...visualParams.sideLightColor) },
      uSideLevel:       { value: visualParams.sideLevel },
      uAmbient:         { value: new THREE.Vector3(...visualParams.ambient) },
      uAlbedoNear:      { value: new THREE.Vector3(...visualParams.albedoNear) },
      uAlbedoFar:       { value: new THREE.Vector3(...visualParams.albedoFar) },
      uFogAbsorb:       { value: visualParams.fogAbsorb },
      uAnisotropy:      { value: visualParams.scatterAnisotropy },
      uReflectance:     { value: visualParams.reflectance },
      uExposure:        { value: visualParams.exposureResponse },
      uContentSuppress: { value: visualParams.contentSuppression },
      uView:            { value: 0 },
    })

    const splatUnis = {
      ...shared(),
      uSizeScale:       { value: visualParams.sizeScale },
      uOpacity:         { value: visualParams.opacity },
      uSoftness:        { value: visualParams.gaussianSoftness },
      uBaseCurlScale:   { value: visualParams.baseCurlScale },
      uBaseCurlStrength:{ value: visualParams.baseCurlStrength },
      uBrightSuppress:  { value: visualParams.brightnessSuppression },
      uPointerSuppress: { value: visualParams.pointerSuppression },
      uCoreOcclusion:   { value: visualParams.coreOcclusion },
      uDeflect:         { value: visualParams.deflect },
      uRevealCap:       { value: 0.25 },
      uLayerFilter:     { value: -1 },
      uSplatAniso:      { value: visualParams.splatAniso },
      uAspect:          { value: camera.aspect },
      uSheetBind:       { value: visualParams.sheetBind },
      uLightOrigin:     { value: new THREE.Vector2(...visualParams.lightOrigin) },
      uLightZ:          { value: visualParams.lightZ },
      uLagMicro:   { value: LAYER_RESPONSE.micro.lag },
      uLagMedium:  { value: LAYER_RESPONSE.medium.lag },
      uLagLarge:   { value: LAYER_RESPONSE.large.lag },
      uForceMicro: { value: LAYER_RESPONSE.micro.force },
      uForceMedium:{ value: LAYER_RESPONSE.medium.force },
      uForceLarge: { value: LAYER_RESPONSE.large.force },
      uTauMicro:   { value: LAYER_RESPONSE.micro.tau },
      uTauMedium:  { value: LAYER_RESPONSE.medium.tau },
      uTauLarge:   { value: LAYER_RESPONSE.large.tau },
    }
    // 광학 입자는 Additive라 노출 상한을 조금 더 준다 (§9: 최대 1.8배)
    const opticalUnis = { ...splatUnis, uRevealCap: { value: 0.8 }, uOpacity: { value: visualParams.opacity * 0.55 } }

    const splatMat = new THREE.ShaderMaterial({
      vertexShader: splatVert, fragmentShader: splatFrag, uniforms: splatUnis,
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    })
    const opticalMat = new THREE.ShaderMaterial({
      vertexShader: splatVert, fragmentShader: splatFrag, uniforms: opticalUnis,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    })

    /* ── 지오메트리 ───────────────────────────────────── */
    const camInfo = {
      z: CAM_Z, aspect: camera.aspect,
      tanHalfFov: Math.tan((FOV * Math.PI / 180) * 0.5),
    }
    let buffers: SplatBuffers | null = null
    const mainPoints = new THREE.Points(new THREE.BufferGeometry(), splatMat)
    const optPoints  = new THREE.Points(new THREE.BufferGeometry(), opticalMat)
    mainPoints.frustumCulled = false
    optPoints.frustumCulled = false
    scene.add(mainPoints, optPoints)

    let stats = { points: 0, coverage: 0 }
    const rebuild = () => {
      buffers?.main.dispose()
      buffers?.optical.dispose()
      const n = Math.round(visualParams.count * tierScale(tier))
      buffers = buildSplatField(n, span, camInfo, {
        threshold: visualParams.densityThreshold,
        contrast: visualParams.densityContrast,
        micro: visualParams.microRatio,
        medium: visualParams.mediumRatio,
        additiveRatio: visualParams.additiveRatio,
        // 모바일은 전경 입자를 쓰지 않는다 (지시서 §8)
        nearRatio: tier <= 1 ? 0 : visualParams.nearRatio,
      })
      mainPoints.geometry = buffers.main
      optPoints.geometry = buffers.optical
      stats = {
        points: buffers.main.getAttribute('position').count + buffers.optical.getAttribute('position').count,
        coverage: buffers.coverage,
      }
    }
    rebuild()
    let lastRebuild = visualEvents.rebuild

    /* ── L1 Spatial Field + L2 Volumetric Light ────────
       파티클보다 먼저 공간의 실루엣을 만든다. 씬에서 가장 먼저 그려지도록
       renderOrder를 -1로 두고 depthTest를 끈다. */
    const spaceUnis = {
      uTime:        { value: 0 },
      uAspect:      { value: camera.aspect },
      uFieldMode:   { value: 0 },
      uWarp:        { value: visualParams.warp },
      uFieldLevel:  { value: visualParams.fieldLevel },
      uCorridor:    { value: visualParams.corridor },
      uShadow:      { value: visualParams.shadow },
      uAmbientCol:  { value: new THREE.Vector3(...visualParams.ambient) },
      uSurfaceCol:  { value: new THREE.Vector3(...visualParams.surfaceCol) },
      uShadowCol:   { value: new THREE.Vector3(...visualParams.shadowCol) },
      uLightOrigin: { value: new THREE.Vector2(...visualParams.lightOrigin) },
      uLightDir:    { value: new THREE.Vector2(...visualParams.lightDir) },
      uWarmOrigin:  { value: new THREE.Vector2(...visualParams.warmOrigin) },
      uLightZ:      { value: visualParams.lightZ },
      uCoolLevel:   { value: visualParams.coolLevel },
      uConeWidth:   { value: visualParams.coneWidth },
      uConeFalloff: { value: visualParams.coneFalloff },
      uConeLevel:   { value: visualParams.coneLevel },
      uScatterLevel:{ value: visualParams.scatterLevel },
      uReflectLevel:{ value: visualParams.reflectLevel },
      uSideLevel:   { value: visualParams.sideLevel },
      uLightCol:    { value: new THREE.Vector3(...visualParams.mainLightColor) },
      uCoolCol:     { value: new THREE.Vector3(...visualParams.coolCol) },
      uWarmCol:     { value: new THREE.Vector3(...visualParams.sideLightColor) },
    }
    const spaceMat = new THREE.ShaderMaterial({
      vertexShader: spaceVert, fragmentShader: spaceFrag, uniforms: spaceUnis,
      transparent: true, depthWrite: false, depthTest: false,
      blending: THREE.NormalBlending,
    })
    const spaceMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), spaceMat)
    spaceMesh.frustumCulled = false
    spaceMesh.renderOrder = -1
    scene.add(spaceMesh)

    /* ── L3 스모그 평면 3층 ───────────────────────────── */
    const fogDefs = [
      { z: -2.9, scale: 2.30, layer: 0.0, opacity: 0.24 },  // 후경 넓은 색면
      { z: -1.6, scale: 1.85, layer: 0.5, opacity: 0.15 },  // 중경 광선 산란층
      { z: -0.5, scale: 1.45, layer: 1.0, opacity: 0.08 },  // 전경 낮은 밀도 안개
    ]
    const fogGeo = new THREE.PlaneGeometry(1, 1)
    const fogMeshes: THREE.Mesh[] = []
    const fogMats: THREE.ShaderMaterial[] = []
    for (const d of fogDefs) {
      const u = {
        ...shared(),
        uLayer:       { value: d.layer },
        uOpacity:     { value: d.opacity },
        uFogDensity:  { value: visualParams.fogDensity },
        uFogScattering:{ value: visualParams.fogScattering },
        uResolution:  { value: resolution },
        uLagFog:      { value: LAYER_RESPONSE.fog.lag },
        uForceFog:    { value: LAYER_RESPONSE.fog.force },
        uTauFog:      { value: LAYER_RESPONSE.fog.tau },
      }
      const m = new THREE.ShaderMaterial({
        vertexShader: fogVert, fragmentShader: fogFrag, uniforms: u,
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
      })
      const mesh = new THREE.Mesh(fogGeo, m)
      mesh.position.z = d.z
      mesh.userData.k = d.scale
      mesh.frustumCulled = false
      scene.add(mesh)
      fogMeshes.push(mesh); fogMats.push(m)
    }
    const sizeFog = () => {
      for (const mesh of fogMeshes) {
        const k = mesh.userData.k as number
        const halfH = Math.tan((FOV * Math.PI / 180) * 0.5) * (CAM_Z - mesh.position.z)
        mesh.scale.set(halfH * camera.aspect * 2 * k, halfH * 2 * k, 1)
      }
    }
    sizeFog()

    /* ── 3단계 마스크 갱신 ─────────────────────────────
       DOM 레이아웃을 읽어 core/soft 텍스처를 다시 굽는다. 매 프레임 할 필요는
       없고 리사이즈·스크롤·주기적 확인으로 충분하다. */
    const syncMask = () => {
      mask.update(window.innerWidth, window.innerHeight)
      maskTexel.set(2 / window.innerWidth, 2 / window.innerHeight)
    }
    syncMask()

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight)
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      resolution.set(window.innerWidth, window.innerHeight)
      spaceUnis.uAspect.value = camera.aspect
      camInfo.aspect = camera.aspect
      splatUnis.uAspect.value = camera.aspect
      opticalUnis.uAspect.value = camera.aspect
      span = computeSpan(camera)
      spanVec.set(span.x, span.y)
      pointer.setView(Math.tan((FOV * Math.PI / 180) * 0.5) * (CAM_Z - Z_MID), camera.aspect)
      sizeFog()
      syncMask()
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', syncMask, { passive: true })

    /* ── RAF ──────────────────────────────────────────── */
    let raf = 0, time = 0, last = performance.now(), frames = 0, fpsT = 0, fps = 0, tick = 0
    let lastStats: VisualStats = {
      fps: 0, points: 0, coverage: 0, tier, dpr, frameMs: 0,
      drawCalls: 0, geometries: 0, textures: 0, programs: 0,
    }
    const v3 = (t: THREE.Vector3, s: [number, number, number]) => t.set(s[0], s[1], s[2])

    const frame = () => {
      raf = requestAnimationFrame(frame)
      const now = performance.now()
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now; time += dt; frames++; fpsT += dt
      if (fpsT >= 0.5) { fps = frames / fpsT; frames = 0; fpsT = 0 }

      if (visualEvents.rebuild !== lastRebuild) { lastRebuild = visualEvents.rebuild; rebuild() }
      if (++tick % 30 === 0) syncMask()

      /* Hero를 벗어나면 렌더와 유니폼 갱신을 멈춘다. 씬은 유지해 복귀가 즉시
         되도록 하되, 프레임 비용은 0에 가깝게 만든다. */
      if (!activeRef.current) { statsRef.current?.({ ...lastStats, fps: 0, frameMs: 0 }); return }

      pointer.update(dt)
      const p = visualParams
      const gain = Math.max(0, Math.min(1, intensityRef.current))
      const viewIdx = VIEW_INDEX[p.view]

      // 포인터 반경은 화면 너비 비율 → 월드 단위
      const radiusWorld = p.pointerRadius * span.x * 2

      const applyShared = (u: Record<string, { value: unknown }>) => {
        u.uTime.value = time
        u.uStrokeCount.value = pointer.strokeCount
        u.uPointerRadius.value = radiusWorld
        u.uPointerForce.value = p.pointerForce
        u.uMaxDisp.value = p.maxDisplacement
        u.uSwirl.value = p.swirl
        u.uMaxPointerSpeed.value = p.maxPointerSpeed
        u.uContentSuppress.value = p.contentSuppression
        u.uSideLevel.value = p.sideLevel
        u.uFogAbsorb.value = p.fogAbsorb
        u.uAnisotropy.value = p.scatterAnisotropy
        u.uReflectance.value = p.reflectance
        u.uExposure.value = p.exposureResponse
        u.uView.value = viewIdx
        v3(u.uMainLight.value as THREE.Vector3, p.mainLight)
        v3(u.uMainColor.value as THREE.Vector3, p.mainLightColor)
        v3(u.uSideLight.value as THREE.Vector3, p.sideLight)
        v3(u.uSideColor.value as THREE.Vector3, p.sideLightColor)
        v3(u.uAmbient.value as THREE.Vector3, p.ambient)
        v3(u.uAlbedoNear.value as THREE.Vector3, p.albedoNear)
        v3(u.uAlbedoFar.value as THREE.Vector3, p.albedoFar)
      }

      applyShared(splatUnis as unknown as Record<string, { value: unknown }>)
      applyShared(opticalUnis as unknown as Record<string, { value: unknown }>)
      splatUnis.uSizeScale.value = p.sizeScale
      splatUnis.uOpacity.value = p.opacity * gain
      splatUnis.uSoftness.value = p.gaussianSoftness
      splatUnis.uBaseCurlScale.value = p.baseCurlScale
      splatUnis.uBaseCurlStrength.value = p.baseCurlStrength
      splatUnis.uBrightSuppress.value = p.brightnessSuppression
      splatUnis.uPointerSuppress.value = p.pointerSuppression
      splatUnis.uCoreOcclusion.value = p.coreOcclusion
      splatUnis.uDeflect.value = p.deflect
      opticalUnis.uSizeScale.value = p.sizeScale
      opticalUnis.uOpacity.value = p.opacity * 0.55 * gain
      opticalUnis.uSoftness.value = p.gaussianSoftness
      opticalUnis.uBaseCurlScale.value = p.baseCurlScale
      opticalUnis.uBaseCurlStrength.value = p.baseCurlStrength
      opticalUnis.uBrightSuppress.value = p.brightnessSuppression
      opticalUnis.uPointerSuppress.value = p.pointerSuppression
      /* 광학(additive) 입자는 실루엣 내부에서 100% 제거한다 (지시서 §1-A) */
      opticalUnis.uCoreOcclusion.value = 1.0
      opticalUnis.uDeflect.value = p.deflect

      for (const m of fogMats) {
        applyShared(m.uniforms as unknown as Record<string, { value: unknown }>)
        m.uniforms.uFogDensity.value = p.fogDensity
        m.uniforms.uFogScattering.value = p.fogScattering
      }

      /* space field */
      spaceUnis.uTime.value = time
      spaceUnis.uWarp.value = p.warp
      spaceUnis.uFieldLevel.value = p.fieldLevel * (0.25 + gain * 0.75)
      spaceUnis.uCorridor.value = p.corridor
      spaceUnis.uShadow.value = p.shadow
      spaceUnis.uConeWidth.value = p.coneWidth
      spaceUnis.uConeFalloff.value = p.coneFalloff
      spaceUnis.uConeLevel.value = p.coneLevel * (0.18 + gain * 0.82)
      spaceUnis.uScatterLevel.value = p.scatterLevel
      spaceUnis.uCoolLevel.value = p.coolLevel
      spaceUnis.uLightZ.value = p.lightZ
      spaceUnis.uReflectLevel.value = p.reflectLevel
      spaceUnis.uSideLevel.value = p.sideLevel
      v3(spaceUnis.uAmbientCol.value, p.ambient)
      v3(spaceUnis.uSurfaceCol.value, p.surfaceCol)
      v3(spaceUnis.uShadowCol.value, p.shadowCol)
      v3(spaceUnis.uLightCol.value, p.mainLightColor)
      v3(spaceUnis.uCoolCol.value, p.coolCol)
      v3(spaceUnis.uWarmCol.value, p.sideLightColor)
      spaceUnis.uLightOrigin.value.set(p.lightOrigin[0], p.lightOrigin[1])
      spaceUnis.uLightDir.value.set(p.lightDir[0], p.lightDir[1])
      spaceUnis.uWarmOrigin.value.set(p.warmOrigin[0], p.warmOrigin[1])
      spaceUnis.uFieldMode.value =
        p.view === 'l1' ? 1 : p.view === 'cone' ? 2 : p.view === 'reflect' ? 3 : 0

      /* 검수 캡처별 레이어 가시성 */
      const v = p.view
      const showSpace = v === 'composite' || v === 'l1' || v === 'l2' || v === 'l1l2'
                     || v === 'cone' || v === 'reflect'
      const showFog   = v === 'composite' || v === 'velocity'
      const layerOnly = LAYER_FILTER[v]
      const showSplat = v === 'composite' || v === 'masks' || v === 'velocity'
                     || v === 'dist' || layerOnly !== undefined
      spaceMesh.visible = showSpace
      for (const m of fogMeshes) m.visible = showFog
      mainPoints.visible = showSplat
      optPoints.visible = showSplat && v === 'composite'
      const lf = layerOnly !== undefined ? layerOnly : -1
      splatUnis.uLayerFilter.value = lf
      opticalUnis.uLayerFilter.value = lf
      splatUnis.uSplatAniso.value = p.splatAniso
      opticalUnis.uSplatAniso.value = p.splatAniso
      splatUnis.uSheetBind.value = p.sheetBind
      opticalUnis.uSheetBind.value = p.sheetBind
      splatUnis.uLightZ.value = p.lightZ
      opticalUnis.uLightZ.value = p.lightZ
      splatUnis.uLightOrigin.value.set(p.lightOrigin[0], p.lightOrigin[1])
      opticalUnis.uLightOrigin.value.set(p.lightOrigin[0], p.lightOrigin[1])

      renderer.render(scene, camera)
      const info = renderer.info
      lastStats = {
        fps, points: stats.points, coverage: stats.coverage, tier,
        dpr, frameMs: dt * 1000,
        drawCalls: info.render.calls,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: info.programs?.length ?? 0,
      }
      statsRef.current?.(lastStats)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', syncMask)
      buffers?.main.dispose(); buffers?.optical.dispose()
      fogGeo.dispose(); fogMats.forEach(m => m.dispose()); mask.dispose()
      spaceMesh.geometry.dispose(); spaceMat.dispose()
      splatMat.dispose(); opticalMat.dispose()
      renderer.dispose()
    }
  }, [pointer])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="visual-canvas"
      style={{ position: 'fixed', inset: 0, zIndex: 3, pointerEvents: 'none' }}
    />
  )
}
