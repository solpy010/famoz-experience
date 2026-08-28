/**
 * Shared scene state — values live in refs/plain objects, not React state,
 * so WebGL and DOM can read them every frame without causing re-renders.
 */

export type ScenePreset = {
  colorA: [number, number, number]
  colorB: [number, number, number]
  density: number
  turbulence: number
  flowDir: [number, number, number]
  pointerForce: number
  bloomStrength: number
  idleSpeed: number
  // Volumetric light colors (particles RECEIVE this light, not emit)
  lightColorA: [number, number, number]
  lightColorB: [number, number, number]
  // Ambient dark fog/smoke tint
  ambientColor: [number, number, number]
}

export const PRESETS: Record<string, ScenePreset> = {
  hero: {
    colorA: [0.42, 0.20, 0.55],
    colorB: [0.78, 0.45, 0.72],
    density: 0.65,
    turbulence: 0.042,
    flowDir: [0, 0.12, 0],
    pointerForce: 0.55,
    bloomStrength: 0.55,
    idleSpeed: 0.044,
    lightColorA: [0.70, 0.25, 0.82],   // deep violet
    lightColorB: [0.92, 0.40, 0.58],   // warm pink
    ambientColor: [0.04, 0.01, 0.07],
  },
  whatA: {
    colorA: [0.18, 0.72, 0.55],
    colorB: [0.25, 0.18, 0.45],
    density: 0.80,
    turbulence: 0.050,
    flowDir: [0.18, 0.06, 0],
    pointerForce: 0.58,
    bloomStrength: 0.40,
    idleSpeed: 0.048,
    lightColorA: [0.12, 0.85, 0.58],   // emerald
    lightColorB: [0.10, 0.32, 0.82],   // deep blue
    ambientColor: [0.01, 0.05, 0.03],
  },
  whatB: {
    colorA: [0.88, 0.52, 0.28],
    colorB: [0.78, 0.62, 0.20],
    density: 0.85,
    turbulence: 0.060,
    flowDir: [0, 0, 0],
    pointerForce: 0.72,
    bloomStrength: 0.50,
    idleSpeed: 0.056,
    lightColorA: [0.94, 0.54, 0.15],   // amber
    lightColorB: [0.88, 0.75, 0.12],   // gold
    ambientColor: [0.07, 0.03, 0.01],
  },
  whatC: {
    colorA: [0.45, 0.25, 0.72],
    colorB: [0.22, 0.70, 0.90],
    density: 0.75,
    turbulence: 0.045,
    flowDir: [0.08, 0.16, 0],
    pointerForce: 0.62,
    bloomStrength: 0.45,
    idleSpeed: 0.050,
    lightColorA: [0.15, 0.85, 0.95],   // cyan
    lightColorB: [0.58, 0.18, 0.88],   // violet
    ambientColor: [0.02, 0.03, 0.07],
  },
  value: {
    colorA: [0.93, 0.90, 0.82],
    colorB: [0.52, 0.28, 0.72],
    density: 0.70,
    turbulence: 0.048,
    flowDir: [0, 0.18, 0],
    pointerForce: 0.60,
    bloomStrength: 0.45,
    idleSpeed: 0.046,
    lightColorA: [0.90, 0.82, 0.58],   // warm ivory
    lightColorB: [0.55, 0.28, 0.80],   // violet
    ambientColor: [0.05, 0.04, 0.02],
  },
  publicValue: {
    colorA: [0.18, 0.72, 0.55],
    colorB: [0.22, 0.70, 0.90],
    density: 0.75,
    turbulence: 0.052,
    flowDir: [-0.08, 0.10, 0],
    pointerForce: 0.62,
    bloomStrength: 0.40,
    idleSpeed: 0.048,
    lightColorA: [0.20, 0.82, 0.55],   // emerald
    lightColorB: [0.88, 0.84, 0.65],   // ivory
    ambientColor: [0.01, 0.04, 0.02],
  },
  works: {
    colorA: [0.72, 0.45, 0.15],
    colorB: [0.55, 0.30, 0.55],
    density: 0.65,
    turbulence: 0.055,
    flowDir: [0.05, 0.05, 0],
    pointerForce: 0.65,
    bloomStrength: 0.50,
    idleSpeed: 0.052,
    lightColorA: [0.88, 0.52, 0.12],   // amber
    lightColorB: [0.62, 0.35, 0.58],   // warm purple
    ambientColor: [0.05, 0.02, 0.01],
  },
  ending: {
    colorA: [0.55, 0.38, 0.18],
    colorB: [0.78, 0.62, 0.22],
    density: 0.45,
    turbulence: 0.028,
    flowDir: [0, 0.06, 0],
    pointerForce: 0.35,
    bloomStrength: 0.25,
    idleSpeed: 0.030,
    lightColorA: [0.72, 0.52, 0.25],   // warm brown
    lightColorB: [0.90, 0.82, 0.55],   // warm ivory
    ambientColor: [0.04, 0.03, 0.01],
  },
}

export function lerpPreset(a: ScenePreset, b: ScenePreset, t: number): ScenePreset {
  const lerp = (x: number, y: number) => x + (y - x) * t
  const lerpV = (u: [number, number, number], v: [number, number, number]): [number, number, number] =>
    [lerp(u[0], v[0]), lerp(u[1], v[1]), lerp(u[2], v[2])]
  return {
    colorA: lerpV(a.colorA, b.colorA),
    colorB: lerpV(a.colorB, b.colorB),
    density: lerp(a.density, b.density),
    turbulence: lerp(a.turbulence, b.turbulence),
    flowDir: lerpV(a.flowDir, b.flowDir),
    pointerForce: lerp(a.pointerForce, b.pointerForce),
    bloomStrength: lerp(a.bloomStrength, b.bloomStrength),
    idleSpeed: lerp(a.idleSpeed, b.idleSpeed),
    lightColorA: lerpV(a.lightColorA, b.lightColorA),
    lightColorB: lerpV(a.lightColorB, b.lightColorB),
    ambientColor: lerpV(a.ambientColor, b.ambientColor),
  }
}

export function detectTier(): 0 | 1 | 2 | 3 {
  if (typeof window === 'undefined') return 2
  const ua = navigator.userAgent.toLowerCase()
  const isMobile = /android|iphone|ipad|ipod/.test(ua)
  if (isMobile) return 1
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReduced) return 0
  const cores = navigator.hardwareConcurrency ?? 2
  if (cores >= 8) return 3
  if (cores >= 4) return 2
  return 1
}

export function particleCount(tier: 0 | 1 | 2 | 3): number {
  switch (tier) {
    case 3: return 35000
    case 2: return 18000
    case 1: return 6000
    default: return 0
  }
}
