/**
 * /visual-lab 의 단일 파라미터 저장소.
 *
 * Leva 패널은 이 객체를 **직접 변형(mutate)** 하고, RAF 루프가 매 프레임 읽는다.
 * React state를 쓰지 않으므로 슬라이더를 움직여도 리렌더가 발생하지 않는다.
 * (문서 §12 "패널 값 변경 시 React 전체를 재렌더링하지 않고 Ref·Uniform에 직접 반영")
 */

export type DebugView =
  | 'composite'                       // 08 최종 합성
  | 'l0' | 'l1' | 'l2' | 'l1l2'       // 01~04 레이어 분리
  | 'far' | 'mid' | 'near'            // 깊이별 splat
  | 'zones' | 'zoneA' | 'zoneB' | 'zoneC' | 'zoneD' | 'zoneE'
  | 'cone' | 'reflect'                // B, C — L2 광학 마스크 분리
  | 'masks' | 'velocity' | 'dist'     // 디버그 (E = dist)

export type VisualParams = {
  /* ── Composition ─────────────────────────────── */
  imageFieldOpacity: number
  densityThreshold: number
  densityContrast: number
  foregroundDensity: number
  contentFeather: number          // 화면 너비 대비 비율
  contentSuppression: number      // 파티클 opacity 억제 0~1
  brightnessSuppression: number
  pointerSuppression: number
  coreOcclusion: number           // A. 실루엣 내부 차폐율
  deflect: number                 // 흐름을 콘텐츠 밖으로 가르는 세기

  /* ── Splat ───────────────────────────────────── */
  count: number
  microRatio: number
  mediumRatio: number
  largeRatio: number
  sizeScale: number
  gaussianSoftness: number
  opacity: number
  reflectance: number
  additiveRatio: number

  /* ── Flow ────────────────────────────────────── */
  baseCurlScale: number
  baseCurlStrength: number
  pointerSmoothing: number
  velocitySmoothing: number
  pointerRadius: number           // 화면 너비 대비 비율
  pointerForce: number
  velocityDamping: number
  wakeTau: number                 // 초. wake 감쇠 시상수
  maxDisplacement: number
  swirl: number
  maxPointerSpeed: number

  /* ── Light ───────────────────────────────────── */
  mainLight: [number, number, number]
  mainLightColor: [number, number, number]
  sideLight: [number, number, number]
  sideLightColor: [number, number, number]
  sideLevel: number               // 측면광 세기. 1이면 주광원과 동등하게 경쟁한다
  ambient: [number, number, number]
  albedoNear: [number, number, number]
  albedoFar: [number, number, number]
  fogAbsorb: number               // 후경 채도·대비 감쇠
  fogScattering: number
  fogDensity: number
  exposureResponse: number
  scatterAnisotropy: number       // Henyey-Greenstein g

  /* ── L1 Spatial field ────────────────────────── */
  warp: number
  fieldLevel: number
  corridor: number
  shadow: number
  surfaceCol: [number, number, number]
  shadowCol: [number, number, number]

  /* ── L2 Volumetric light ─────────────────────── */
  lightOrigin: [number, number]
  lightDir: [number, number]
  warmOrigin: [number, number]
  lightZ: number
  coneWidth: number
  coneFalloff: number
  coneLevel: number
  scatterLevel: number
  reflectLevel: number
  coolLevel: number
  sheetBind: number               // 입자를 시트에 묶는 정도
  coolCol: [number, number, number]

  /* ── Splat 형태 ──────────────────────────────── */
  splatAniso: number              // 흐름 방향으로 늘이는 정도
  nearRatio: number               // 전체 중 near 레이어 비율 (3~7%)

  /* ── Debug ───────────────────────────────────── */
  view: DebugView
  showMasks: boolean
}

/**
 * HERO 프리셋: Deep Plum + Graphite Indigo 배경 /
 * 주광원 Smoky Lavender / 보조광 Champagne Amber (famoz-art-direction)
 */
export const DEFAULT_PARAMS: VisualParams = {
  imageFieldOpacity: 0.20,
  densityThreshold: 0.40,
  densityContrast: 1.48,
  foregroundDensity: 0.42,
  contentFeather: 0.055,
  contentSuppression: 0.64,
  brightnessSuppression: 0.68,
  pointerSuppression: 0.72,
  coreOcclusion: 1.0,
  deflect: 0.28,

  /* 최근 wake 평가를 4회→1회로 줄인 예산을 미세 입자 밀도로 되돌린다.
     고성능 등급은 36k, tier 2는 약 21k, tier 1은 약 12k다. */
  count: 36_000,
  microRatio: 0.66,
  mediumRatio: 0.30,
  largeRatio: 0.03,
  sizeScale: 0.88,
  gaussianSoftness: 1.12,
  opacity: 1.0,
  reflectance: 0.96,
  additiveRatio: 0,

  baseCurlScale: 0.26,
  baseCurlStrength: 0.12,
  pointerSmoothing: 0.075,
  velocitySmoothing: 0.14,
  pointerRadius: 0.12,
  pointerForce: 0.58,
  velocityDamping: 0.968,
  wakeTau: 1.7,
  maxDisplacement: 0.36,
  swirl: 0.31,
  maxPointerSpeed: 0.045,

  /* 팔레트는 지시서 §3 Hero 기본값에서만 고른다.
     순수 red/green/magenta/cyan 금지, 두 고채도 색의 동일 면적 경쟁 금지. */
  mainLight:       [-1.75,  1.05, -2.5],
  mainLightColor:  [0.565, 0.635, 0.900],  // clear mist blue
  sideLight:       [ 2.05, -0.50, -1.0],
  sideLightColor:  [0.760, 0.690, 0.900],  // pale lavender
  sideLevel: 0.20,
  ambient:         [0.060, 0.094, 0.185],
  /* 입자의 기본색은 저채도. 빛에 닿을 때만 lavender/amber가 반사색으로 뜬다. */
  albedoNear:      [0.785, 0.835, 1.000],
  albedoFar:       [0.330, 0.540, 0.900],
  fogAbsorb: 0.12,
  fogScattering: 0.24,
  fogDensity: 0.24,
  exposureResponse: 0.55,
  scatterAnisotropy: 0.58,

  /* L1 — 비정형 곡면·통로·음영면 */
  warp: 0.085,
  fieldLevel: 0.42,
  corridor: 0.92,
  shadow: 0.85,
  surfaceCol: [0.160, 0.205, 0.390],
  shadowCol:  [0.010, 0.018, 0.042],

  /* L2 — 좌상단 바깥에서 유입해 우중앙으로 진행 */
  lightOrigin: [-1.15,  0.55],
  lightDir:    [ 1.00, -0.42],
  warmOrigin:  [ 0.52, -0.34],
  lightZ: 0.85,
  coneWidth: 0.52,
  coneFalloff: 0.44,
  coneLevel: 0.72,
  scatterLevel: 0.20,
  reflectLevel: 0.38,
  coolLevel: 0.54,
  sheetBind: 0.12,
  coolCol: [0.440, 0.610, 0.820],

  splatAniso: 0.55,
  nearRatio: 0.025,

  view: 'composite',
  showMasks: false,
}

/** 살아 있는 단일 인스턴스. Leva와 RAF 루프가 공유한다. */
export const visualParams: VisualParams = { ...DEFAULT_PARAMS }

/**
 * 지오메트리 재생성 요청 카운터.
 * 입자 수·분포 임계값처럼 버퍼를 다시 만들어야 하는 값이 바뀌면 증가시킨다.
 * 캔버스가 매 프레임 비교해 변했을 때만 재생성한다.
 */
export const visualEvents = { rebuild: 0 }
export function requestRebuild() { visualEvents.rebuild++ }

/** 디버그 뷰 → 셰이더 uView 값 */
export const VIEW_INDEX: Record<DebugView, number> = {
  composite: 0, l0: 1, l1: 2, l2: 3, l1l2: 4,
  far: 5, mid: 6, near: 7, masks: 8, velocity: 9, dist: 10,
  cone: 11, reflect: 12,
  zones: 13, zoneA: 14, zoneB: 15, zoneC: 16, zoneD: 17, zoneE: 18,
}

/** 깊이 레이어 필터. -1 = 전부 */
export const LAYER_FILTER: Partial<Record<DebugView, number>> = {
  far: 0, mid: 1, near: 2,
}

/** 기능적 Z 구역 필터. -1은 셰이더에서 전체를 의미한다. */
export const ZONE_FILTER: Partial<Record<DebugView, number>> = {
  zoneA: 0, zoneB: 1, zoneC: 2, zoneD: 3, zoneE: 4,
}

/** 레이어별 반응 지연·힘·복귀 (문서 §10) */
export const LAYER_RESPONSE = {
  micro:  { lag: 0.15, force: 0.35, tau: 1.6 },
  medium: { lag: 0.35, force: 0.60, tau: 2.5 },
  large:  { lag: 0.62, force: 0.25, tau: 3.8 },
  fog:    { lag: 0.45, force: 0.35, tau: 4.0 },
  light:  { lag: 0.72, force: 0.12, tau: 3.2 },
} as const
