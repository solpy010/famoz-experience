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
  | 'noparticle'

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
  contentSuppression: 0.82,
  brightnessSuppression: 0.86,
  pointerSuppression: 0.90,
  coreOcclusion: 1.0,
  deflect: 0.28,

  count: 60_000,
  microRatio: 0.50,
  mediumRatio: 0.35,
  largeRatio: 0.15,
  sizeScale: 1.0,
  gaussianSoftness: 1.0,
  opacity: 0.92,
  reflectance: 1.05,
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

  /* 팔레트는 지시서 §3 Hero 기본값에서만 고른다.
     순수 red/green/magenta/cyan 금지, 두 고채도 색의 동일 면적 경쟁 금지. */
  mainLight:       [-1.75,  1.05, -2.5],
  mainLightColor:  [0.557, 0.478, 0.659],  // smoky lavender  #8E7AA8
  sideLight:       [ 2.05, -0.50, -1.0],
  sideLightColor:  [0.714, 0.506, 0.353],  // dusty amber     #B6815A
  sideLevel: 0.42,                          // 주광원 대비 낮춰 강조 10% 이하로
  ambient:         [0.105, 0.098, 0.125],
  /* 입자의 기본색은 저채도. 빛에 닿을 때만 lavender/amber가 반사색으로 뜬다. */
  albedoNear:      [0.63, 0.605, 0.585],   // warm gray
  albedoFar:       [0.485, 0.520, 0.575],  // muted blue-gray
  fogAbsorb: 0.55,
  fogScattering: 0.62,
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
  noparticle: 8,
}

/** 레이어별 반응 지연·힘·복귀 (문서 §10) */
export const LAYER_RESPONSE = {
  micro:  { lag: 0.15, force: 0.35, tau: 1.6 },
  medium: { lag: 0.35, force: 0.60, tau: 2.5 },
  large:  { lag: 0.62, force: 0.25, tau: 3.8 },
  fog:    { lag: 0.45, force: 0.35, tau: 4.0 },
  light:  { lag: 0.72, force: 0.12, tau: 3.2 },
} as const
