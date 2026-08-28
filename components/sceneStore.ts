/**
 * Shared scene state — values live in refs/plain objects, not React state,
 * so WebGL and DOM can read them every frame without causing re-renders.
 */

export type ScenePreset = {
  colorA: [number, number, number]  // RGB 0-1
  colorB: [number, number, number]
  density: number       // 0-1 multiplier on total particle count
  turbulence: number    // curl noise strength
  flowDir: [number, number, number]
  pointerForce: number  // 0-1
  bloomStrength: number // 0-1
  idleSpeed: number     // time multiplier for curl noise
}

export const PRESETS: Record<string, ScenePreset> = {
  hero: {
    colorA: [0.42, 0.20, 0.55],   // deep plum
    colorB: [0.78, 0.45, 0.72],   // warm pink / violet
    density: 0.65,
    turbulence: 0.10,
    flowDir: [0, 0.3, 0],
    pointerForce: 0.28,
    bloomStrength: 0.55,
    idleSpeed: 0.50,
  },
  whatA: {
    colorA: [0.18, 0.72, 0.55],   // emerald
    colorB: [0.25, 0.18, 0.45],   // deep plum
    density: 0.80,
    turbulence: 0.14,
    flowDir: [0.5, 0.1, 0],
    pointerForce: 0.30,
    bloomStrength: 0.40,
    idleSpeed: 0.55,
  },
  whatB: {
    colorA: [0.88, 0.52, 0.28],   // coral
    colorB: [0.78, 0.62, 0.20],   // gold
    density: 0.90,
    turbulence: 0.20,
    flowDir: [0, 0, 0],
    pointerForce: 0.70,           // strong reaction
    bloomStrength: 0.50,
    idleSpeed: 0.70,
  },
  whatC: {
    colorA: [0.45, 0.25, 0.72],   // violet
    colorB: [0.22, 0.70, 0.90],   // cyan
    density: 0.75,
    turbulence: 0.12,
    flowDir: [0.2, 0.4, 0],
    pointerForce: 0.40,
    bloomStrength: 0.45,
    idleSpeed: 0.60,
  },
  value: {
    colorA: [0.93, 0.90, 0.82],   // warm ivory
    colorB: [0.52, 0.28, 0.72],   // violet
    density: 0.70,
    turbulence: 0.13,
    flowDir: [0, 0.5, 0],
    pointerForce: 0.35,
    bloomStrength: 0.45,
    idleSpeed: 0.55,
  },
  publicValue: {
    colorA: [0.18, 0.72, 0.55],   // emerald
    colorB: [0.22, 0.70, 0.90],   // cyan
    density: 0.75,
    turbulence: 0.15,
    flowDir: [-0.2, 0.2, 0],
    pointerForce: 0.40,
    bloomStrength: 0.40,
    idleSpeed: 0.60,
  },
  works: {
    colorA: [0.72, 0.45, 0.15],   // amber — overridden per project
    colorB: [0.55, 0.30, 0.55],
    density: 0.65,
    turbulence: 0.18,
    flowDir: [0.1, 0.1, 0],
    pointerForce: 0.45,
    bloomStrength: 0.50,
    idleSpeed: 0.65,
  },
  ending: {
    colorA: [0.55, 0.38, 0.18],   // warm brown
    colorB: [0.78, 0.62, 0.22],   // gold
    density: 0.45,
    turbulence: 0.06,
    flowDir: [0, 0.15, 0],
    pointerForce: 0.12,
    bloomStrength: 0.25,
    idleSpeed: 0.35,
  },
}

/** Linearly interpolate two presets. t = 0 → a, t = 1 → b */
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
  }
}

/** Detect GPU tier: 0=fallback, 1=low, 2=mid, 3=high */
export function detectTier(): 0 | 1 | 2 | 3 {
  if (typeof window === 'undefined') return 2
  const ua = navigator.userAgent.toLowerCase()
  const isMobile = /android|iphone|ipad|ipod/.test(ua)
  if (isMobile) return 1

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReduced) return 0

  // Try to infer from concurrency / memory
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
