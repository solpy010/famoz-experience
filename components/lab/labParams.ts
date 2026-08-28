/**
 * /visual-lab 의 단일 파라미터 저장소.
 *
 * Leva 패널은 이 객체를 **직접 변형(mutate)** 하고, RAF 루프가 매 프레임 읽는다.
 * React state를 쓰지 않으므로 슬라이더를 움직여도 리렌더가 발생하지 않는다.
 * (문서 §12 "패널 값 변경 시 React 전체를 재렌더링하지 않고 Ref·Uniform에 직접 반영")
 */

export type DebugView =
  | 'composite' | 'background' | 'light' | 'fog'
  | 'splat' | 'velocity' | 'masks' | 'depth'

export type LabParams = {
  /* ── Composition ─────────────────────────────── */
  imageFieldOpacity: number
  densityThreshold: number
  densityContrast: number
  foregroundDensity: number
  contentFeather: number          // 화면 너비 대비 비율
  contentSuppression: number      // 파티클 opacity 억제 0~1
  brightnessSuppression: number
  pointerSuppression: number

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
  ambient: [number, number, number]
  fogScattering: number
  fogDensity: number
  exposureResponse: number
  scatterAnisotropy: number       // Henyey-Greenstein g

  /* ── Debug ───────────────────────────────────── */
  view: DebugView
  showMasks: boolean
}

/**
 * HERO 프리셋: Deep Plum + Graphite Indigo 배경 /
 * 주광원 Smoky Lavender / 보조광 Champagne Amber (famoz-art-direction)
 */
export const DEFAULT_PARAMS: LabParams = {
  imageFieldOpacity: 0.30,
  densityThreshold: 0.30,
  densityContrast: 1.35,
  foregroundDensity: 0.55,
  contentFeather: 0.055,
  contentSuppression: 0.68,
  brightnessSuppression: 0.74,
  pointerSuppression: 0.85,

  count: 60_000,
  microRatio: 0.18,
  mediumRatio: 0.60,
  largeRatio: 0.22,
  sizeScale: 1.0,
  gaussianSoftness: 1.0,
  opacity: 0.42,
  reflectance: 0.52,
  additiveRatio: 0.12,

  baseCurlScale: 0.26,
  baseCurlStrength: 0.040,
  pointerSmoothing: 0.035,
  velocitySmoothing: 0.12,
  pointerRadius: 0.16,
  pointerForce: 0.55,
  velocityDamping: 0.975,
  wakeTau: 2.2,
  maxDisplacement: 0.42,
  swirl: 0.38,
  maxPointerSpeed: 0.045,

  mainLight:       [-1.9,  1.15, -2.6],
  mainLightColor:  [0.62, 0.50, 0.78],   // Smoky Lavender
  sideLight:       [ 2.2, -0.55, -0.9],
  sideLightColor:  [0.86, 0.68, 0.42],   // Champagne Amber
  ambient:         [0.055, 0.042, 0.078],
  fogScattering: 0.48,
  fogDensity: 0.62,
  exposureResponse: 0.55,
  scatterAnisotropy: 0.58,

  view: 'composite',
  showMasks: false,
}

/** 살아 있는 단일 인스턴스. Leva와 RAF 루프가 공유한다. */
export const labParams: LabParams = { ...DEFAULT_PARAMS }

/**
 * 지오메트리 재생성 요청 카운터.
 * 입자 수·분포 임계값처럼 버퍼를 다시 만들어야 하는 값이 바뀌면 증가시킨다.
 * 캔버스가 매 프레임 비교해 변했을 때만 재생성한다.
 */
export const labEvents = { rebuild: 0 }
export function requestRebuild() { labEvents.rebuild++ }

/** 디버그 뷰 → 셰이더 uView 값 */
export const VIEW_INDEX: Record<DebugView, number> = {
  composite: 0, background: 1, light: 2, fog: 3,
  splat: 4, velocity: 5, masks: 6, depth: 7,
}

/** 레이어별 반응 지연·힘·복귀 (문서 §10) */
export const LAYER_RESPONSE = {
  micro:  { lag: 0.15, force: 0.35, tau: 1.6 },
  medium: { lag: 0.35, force: 0.60, tau: 2.5 },
  large:  { lag: 0.62, force: 0.25, tau: 3.8 },
  fog:    { lag: 0.45, force: 0.35, tau: 4.0 },
  light:  { lag: 0.72, force: 0.12, tau: 3.2 },
} as const
