'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { detectTier } from '../sceneStore'
import { visualParams, visualEvents, LAYER_RESPONSE, VIEW_INDEX, LAYER_FILTER, ZONE_FILTER } from './visualParams'
import { buildSplatField, type Span, type SplatBuffers } from './particleField'
import { splatVert, splatFrag, backgroundVert, backgroundFrag, fogVert, fogFrag } from './particleShaders'
import { MaskField } from './maskField'
import { spaceVert, spaceFrag } from './spaceFieldShader'
import type { PointerField } from './pointerField'
import type { JourneyState } from './journeyState'

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
  return tier === 3 ? 1 : tier === 2 ? 0.58 : tier === 1 ? 0.34 : 0
}

export type VisualStats = {
  fps: number; points: number; coverage: number; tier: number
  dpr: number; frameMs: number; gpuMs: number; longFrames: number
  drawCalls: number; geometries: number; textures: number; programs: number
  zoneCounts: [number, number, number, number, number]
  zRange: [number, number]
}

export default function VisualSystemCanvas({
  pointer,
  journey,
  active = true,
  intensity = 1,
  onStats,
  onUnavailable,
}: {
  pointer: PointerField
  journey?: JourneyState
  /** false면 렌더를 멈춘다. Hero를 벗어났을 때 고비용 갱신을 끊는 용도. */
  active?: boolean
  /** 0~1. 인트로에서 파티클 밀도와 공간면을 올리는 램프. */
  intensity?: number
  onStats?: (s: VisualStats) => void
  /** WebGL을 쓸 수 없을 때 호출된다. 호출부가 CSS 폴백으로 전환할 수 있다. */
  onUnavailable?: () => void
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

    const dpr = Math.min(window.devicePixelRatio, tier >= 2 ? 1.0 : 0.85)

    /* WebGL이 없거나 컨텍스트 생성에 실패하는 환경이 실제로 존재한다.
       (GPU 차단 정책, 오래된 기기, 드라이버 블랙리스트, 원격 데스크톱 등)
       여기서 예외가 새어나가면 effect가 던지면서 React 트리 전체가 언마운트되고
       CSS 유색 배경까지 사라진 흰 화면이 된다. 반드시 안에서 잡는다.
       실패하면 조용히 물러나고 SectionBackdrop의 CSS 배경만 남는다. */
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' })
    } catch (err) {
      console.warn('[VisualSystem] WebGL 사용 불가 — CSS 배경으로 폴백합니다.', err)
      onUnavailable?.()
      return
    }
    renderer.setPixelRatio(dpr)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)
    const diagnostic = new URLSearchParams(window.location.search).has('diagnostic')
    const gl = renderer.getContext() as WebGL2RenderingContext
    const timerExt = diagnostic ? gl.getExtension('EXT_disjoint_timer_query_webgl2') : null
    const gpuQueries: WebGLQuery[] = []
    let gpuMs = -1

    /* 실행 중 컨텍스트를 잃는 경우(탭 장시간 방치, GPU 리셋)도 페이지를
       죽이지 않고 루프만 멈춘다. */
    let contextLost = false
    const onContextLost = (e: Event) => {
      e.preventDefault()
      contextLost = true
      onUnavailable?.()
    }
    canvas.addEventListener('webglcontextlost', onContextLost)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 60)
    camera.position.z = CAM_Z

    let span = computeSpan(camera)
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
      uFocus:           { value: new THREE.Vector2() },
      uPointerVelocity: { value: new THREE.Vector2() },
      uDwell:           { value: 0 },
      uMemory:          { value: 0 },
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
      uJourneyOffset:   { value: new THREE.Vector2() },
      uJourneyFlow:     { value: new THREE.Vector2(1, 0) },
      uJourneyColor:    { value: new THREE.Vector3(1, 1, 1) },
      uJourneyYaw:      { value: 0 },
      uJourneyZoom:     { value: 1 },
      uJourneyDensity:  { value: 1 },
      uJourneyResponse: { value: 1 },
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
      uZoneFilter:      { value: -1 },
      uSplatAniso:      { value: visualParams.splatAniso },
      uAspect:          { value: camera.aspect },
      uSpan:            { value: new THREE.Vector2(span.x, span.y) },
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
    const splatMat = new THREE.ShaderMaterial({
      vertexShader: splatVert, fragmentShader: splatFrag, uniforms: splatUnis,
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    })

    const backgroundUnis = {
      uTime: { value: 0 }, uDPR: { value: dpr },
      uSpan: { value: new THREE.Vector2(span.x, span.y) },
      uJourneyOffset: { value: new THREE.Vector2() },
      uJourneyFlow: { value: new THREE.Vector2(1, 0) },
      uJourneyColor: { value: new THREE.Vector3(1, 1, 1) },
      uJourneyYaw: { value: 0 }, uJourneyZoom: { value: 1 },
      uJourneyDensity: { value: 1 },
      uMainColor: { value: new THREE.Vector3(...visualParams.mainLightColor) },
      uSideColor: { value: new THREE.Vector3(...visualParams.sideLightColor) },
    }
    const backgroundMat = new THREE.ShaderMaterial({
      vertexShader: backgroundVert, fragmentShader: backgroundFrag,
      uniforms: backgroundUnis, transparent: true, depthWrite: false,
      depthTest: false, blending: THREE.NormalBlending,
    })

    /* ── 지오메트리 ───────────────────────────────────── */
    const camInfo = {
      z: CAM_Z, aspect: camera.aspect,
      tanHalfFov: Math.tan((FOV * Math.PI / 180) * 0.5),
    }
    let buffers: SplatBuffers | null = null
    const mainPoints = new THREE.Points(new THREE.BufferGeometry(), splatMat)
    mainPoints.frustumCulled = false
    scene.add(mainPoints)

    const backgroundCount = Math.round(18_000 * tierScale(tier))
    const backgroundGeo = new THREE.BufferGeometry()
    const backgroundPos = new Float32Array(backgroundCount * 3)
    const backgroundSeed = new Float32Array(backgroundCount)
    for (let i = 0; i < backgroundCount; i++) {
      backgroundPos[i * 3] = (Math.random() * 2 - 1) * span.x
      backgroundPos[i * 3 + 1] = (Math.random() * 2 - 1) * span.y
      backgroundPos[i * 3 + 2] = -3.15 + Math.random() * 1.25
      backgroundSeed[i] = Math.random()
    }
    backgroundGeo.setAttribute('position', new THREE.BufferAttribute(backgroundPos, 3))
    backgroundGeo.setAttribute('aSeed', new THREE.BufferAttribute(backgroundSeed, 1))
    const backgroundPoints = new THREE.Points(backgroundGeo, backgroundMat)
    backgroundPoints.frustumCulled = false
    backgroundPoints.renderOrder = -0.5
    scene.add(backgroundPoints)

    let stats: { points: number; coverage: number; zoneCounts: [number, number, number, number, number]; zRange: [number, number] } = {
      points: 0, coverage: 0, zoneCounts: [0, 0, 0, 0, 0], zRange: [0, 0],
    }
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
      stats = {
        points: buffers.main.getAttribute('position').count,
        coverage: buffers.coverage,
        zoneCounts: buffers.zoneCounts,
        zRange: buffers.zRange,
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

    /* 한 장의 낮은 농도 깊이층만 둔다. 이전 3중 평면은 회색 안개벽과
       불필요한 overdraw를 만들었다. */
    const fogDefs = [
      { z: -2.4, scale: 2.05, layer: 0.25, opacity: 0.07 },
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

    /* DOM 마스크는 리사이즈와 폰트 정착 때만 다시 굽는다. 스크롤/주기 갱신은
       layout readback과 texture upload를 일으켜 포인터 프레임을 튀게 했다. */
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
      span = computeSpan(camera)
      splatUnis.uSpan.value.set(span.x, span.y)
      backgroundUnis.uSpan.value.set(span.x, span.y)
      pointer.setView(Math.tan((FOV * Math.PI / 180) * 0.5) * (CAM_Z - Z_MID), camera.aspect)
      sizeFog()
      syncMask()
    }
    window.addEventListener('resize', onResize)
    document.fonts?.ready.then(syncMask)

    /* ── RAF ──────────────────────────────────────────── */
    let raf = 0, time = 0, last = performance.now(), frames = 0, fpsT = 0, fps = 0
    let lastStats: VisualStats = {
      fps: 0, points: 0, coverage: 0, tier, dpr, frameMs: 0, gpuMs: -1, longFrames: 0,
      drawCalls: 0, geometries: 0, textures: 0, programs: 0,
      zoneCounts: [0, 0, 0, 0, 0], zRange: [0, 0],
    }
    let wasActive = activeRef.current
    let longFrames = 0
    const v3 = (t: THREE.Vector3, s: [number, number, number]) => t.set(s[0], s[1], s[2])
    /* 하나의 세계를 여섯 방향에서 본다. 색만 바꾸지 않고 yaw/offset/zoom/
       flow/density/response를 함께 보간해 공간의 측면과 작동 방식이 달라진다. */
    const journeyViews = [
      { yaw: 0.00, zoom: 1.00, off: [0.00, 0.00], flow: [ 1.00, 0.10], density: 1.00, response: 1.05, color: [0.84,0.88,1.12] },
      { yaw: 0.38, zoom: 1.12, off: [-0.18,0.08], flow: [ 0.78, 0.46], density: 1.18, response: 1.18, color: [1.18,0.76,0.56] },
      { yaw:-0.52, zoom: 1.22, off: [0.20,-0.04], flow: [ 0.42, 0.92], density: 1.32, response: 1.28, color: [1.16,0.88,0.52] },
      { yaw: 0.76, zoom: 1.34, off: [-0.10,0.14], flow: [-0.36,0.94], density: 1.48, response: 1.45, color: [0.54,1.14,1.06] },
      { yaw:-0.30, zoom: 0.92, off: [0.12,-0.12], flow: [-0.92,0.24], density: 1.14, response: 1.12, color: [0.92,1.04,0.88] },
      { yaw: 0.12, zoom: 0.82, off: [0.00,0.02], flow: [ 0.60,-0.28], density: 0.92, response: 0.92, color: [1.10,0.90,0.72] },
    ] as const
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    const frame = () => {
      raf = requestAnimationFrame(frame)
      const now = performance.now()
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      /* Hero를 벗어나는 경계에서 마지막 프레임을 한 번만 투명하게 지운다.
         clear 없이 조기 반환하면 fixed canvas의 Hero 프리셋이 Works 사진 등
         뒤 장면 위에 그대로 남는다. 비활성 프레임마다 clear하지는 않는다. */
      if (!activeRef.current) {
        if (wasActive && !contextLost) {
          renderer.setRenderTarget(null)
          renderer.clear(true, true, true)
        }
        wasActive = false
        statsRef.current?.({ ...lastStats, fps: 0, frameMs: 0 })
        return
      }
      wasActive = true

      time += dt; frames++; fpsT += dt
      if (dt * 1000 > 24) longFrames++
      if (fpsT >= 0.5) { fps = frames / fpsT; frames = 0; fpsT = 0 }
      if (visualEvents.rebuild !== lastRebuild) { lastRebuild = visualEvents.rebuild; rebuild() }

      pointer.update(dt)
      journey?.update(dt)
      const p = visualParams
      const gain = Math.max(0, Math.min(1, intensityRef.current))
      const viewIdx = VIEW_INDEX[p.view]
      const journeyPos = Math.max(0, Math.min(5, journey?.position ?? 0))
      const sceneA = Math.min(4, Math.floor(journeyPos))
      const sceneT0 = journeyPos - sceneA
      const sceneT = sceneT0 * sceneT0 * (3 - 2 * sceneT0)
      const ja = journeyViews[sceneA], jb = journeyViews[sceneA + 1]

      // 포인터 반경은 화면 너비 비율 → 월드 단위
      const radiusWorld = p.pointerRadius * span.x * 2

      const applyShared = (u: Record<string, { value: unknown }>) => {
        u.uTime.value = time
        u.uStrokeCount.value = pointer.strokeCount
        u.uPointerRadius.value = radiusWorld
        ;(u.uFocus.value as THREE.Vector2).copy(pointer.smooth)
        ;(u.uPointerVelocity.value as THREE.Vector2).copy(pointer.smoothVelocity)
        u.uDwell.value = pointer.dwell
        u.uMemory.value = pointer.memory
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
        ;(u.uJourneyOffset.value as THREE.Vector2).set(
          lerp(ja.off[0], jb.off[0], sceneT), lerp(ja.off[1], jb.off[1], sceneT))
        ;(u.uJourneyFlow.value as THREE.Vector2).set(
          lerp(ja.flow[0], jb.flow[0], sceneT), lerp(ja.flow[1], jb.flow[1], sceneT)).normalize()
        ;(u.uJourneyColor.value as THREE.Vector3).set(
          lerp(ja.color[0], jb.color[0], sceneT),
          lerp(ja.color[1], jb.color[1], sceneT),
          lerp(ja.color[2], jb.color[2], sceneT))
        u.uJourneyYaw.value = lerp(ja.yaw, jb.yaw, sceneT)
        u.uJourneyZoom.value = lerp(ja.zoom, jb.zoom, sceneT)
        u.uJourneyDensity.value = lerp(ja.density, jb.density, sceneT)
        u.uJourneyResponse.value = lerp(ja.response, jb.response, sceneT)
        v3(u.uMainLight.value as THREE.Vector3, p.mainLight)
        v3(u.uMainColor.value as THREE.Vector3, p.mainLightColor)
        v3(u.uSideLight.value as THREE.Vector3, p.sideLight)
        v3(u.uSideColor.value as THREE.Vector3, p.sideLightColor)
        v3(u.uAmbient.value as THREE.Vector3, p.ambient)
        v3(u.uAlbedoNear.value as THREE.Vector3, p.albedoNear)
        v3(u.uAlbedoFar.value as THREE.Vector3, p.albedoFar)
      }

      applyShared(splatUnis as unknown as Record<string, { value: unknown }>)
      backgroundUnis.uTime.value = time
      backgroundUnis.uJourneyOffset.value.set(
        lerp(ja.off[0], jb.off[0], sceneT), lerp(ja.off[1], jb.off[1], sceneT))
      backgroundUnis.uJourneyFlow.value.set(
        lerp(ja.flow[0], jb.flow[0], sceneT), lerp(ja.flow[1], jb.flow[1], sceneT)).normalize()
      backgroundUnis.uJourneyColor.value.set(
        lerp(ja.color[0], jb.color[0], sceneT),
        lerp(ja.color[1], jb.color[1], sceneT),
        lerp(ja.color[2], jb.color[2], sceneT))
      backgroundUnis.uJourneyYaw.value = lerp(ja.yaw, jb.yaw, sceneT)
      backgroundUnis.uJourneyZoom.value = lerp(ja.zoom, jb.zoom, sceneT)
      backgroundUnis.uJourneyDensity.value = lerp(ja.density, jb.density, sceneT) * gain
      v3(backgroundUnis.uMainColor.value, p.mainLightColor)
      v3(backgroundUnis.uSideColor.value, p.sideLightColor)
      splatUnis.uSizeScale.value = p.sizeScale
      splatUnis.uOpacity.value = p.opacity * gain
      splatUnis.uSoftness.value = p.gaussianSoftness
      splatUnis.uBaseCurlScale.value = p.baseCurlScale
      splatUnis.uBaseCurlStrength.value = p.baseCurlStrength
      splatUnis.uBrightSuppress.value = p.brightnessSuppression
      splatUnis.uPointerSuppress.value = p.pointerSuppression
      splatUnis.uCoreOcclusion.value = p.coreOcclusion
      splatUnis.uDeflect.value = p.deflect

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
      const showSpace = v === 'l1' || v === 'l2' || v === 'l1l2'
                     || v === 'cone' || v === 'reflect'
      const showFog   = tier >= 2 && v === 'velocity'
      const layerOnly = LAYER_FILTER[v]
      const zoneOnly = ZONE_FILTER[v]
      const showSplat = v === 'composite' || v === 'masks' || v === 'velocity'
                     || v === 'dist' || v === 'zones'
                     || layerOnly !== undefined || zoneOnly !== undefined
      /* 최종 합성에서도 L1 구조면을 낮은 농도로 유지한다. 이전에는 composite에서
         통째로 숨겨져 입자 뒤의 부피·통로가 사라지고 별 배경처럼 보였다. */
      spaceMesh.visible = v === 'composite' || showSpace
      for (const m of fogMeshes) m.visible = showFog
      mainPoints.visible = showSplat
      const lf = layerOnly !== undefined ? layerOnly : -1
      splatUnis.uLayerFilter.value = lf
      splatUnis.uZoneFilter.value = zoneOnly !== undefined ? zoneOnly : -1
      splatUnis.uSplatAniso.value = p.splatAniso
      splatUnis.uSheetBind.value = p.sheetBind
      splatUnis.uLightZ.value = p.lightZ
      splatUnis.uLightOrigin.value.set(p.lightOrigin[0], p.lightOrigin[1])

      if (contextLost) return
      let gpuQuery: WebGLQuery | null = null
      if (timerExt) {
        gpuQuery = gl.createQuery()
        if (gpuQuery) gl.beginQuery(timerExt.TIME_ELAPSED_EXT, gpuQuery)
      }
      renderer.render(scene, camera)
      if (gpuQuery && timerExt) {
        gl.endQuery(timerExt.TIME_ELAPSED_EXT)
        gpuQueries.push(gpuQuery)
      }
      if (timerExt && gpuQueries.length > 2) {
        const q = gpuQueries[0]
        const ready = gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)
        const disjoint = gl.getParameter(timerExt.GPU_DISJOINT_EXT)
        if (ready) {
          if (!disjoint) gpuMs = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6
          gl.deleteQuery(q)
          gpuQueries.shift()
        }
      }
      const info = renderer.info
      lastStats = {
        fps, points: stats.points + backgroundCount, coverage: stats.coverage, tier,
        dpr, frameMs: dt * 1000, gpuMs, longFrames,
        drawCalls: info.render.calls,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: info.programs?.length ?? 0,
        zoneCounts: stats.zoneCounts,
        zRange: stats.zRange,
      }
      statsRef.current?.(lastStats)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      window.removeEventListener('resize', onResize)
      buffers?.main.dispose(); buffers?.optical.dispose()
      backgroundGeo.dispose(); backgroundMat.dispose()
      fogGeo.dispose(); fogMats.forEach(m => m.dispose()); mask.dispose()
      spaceMesh.geometry.dispose(); spaceMat.dispose()
      splatMat.dispose()
      renderer.dispose()
      gpuQueries.forEach(q => gl.deleteQuery(q))
    }
  }, [pointer, journey])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="visual-canvas"
      style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-field, 1)', pointerEvents: 'none' }}
    />
  )
}
