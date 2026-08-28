import * as THREE from 'three'

/**
 * L4 지오메트리 — density field 기반 분포 (famoz-art-direction)
 *
 * 균등 random 금지. 밀집 흐름 덩어리 4개 + 이를 잇는 중간 밀도 흐름 +
 * 입자가 거의 없는 통로를 만든다. 화면 점유율 목표 45~65%.
 *
 * 분포는 거부 표집(rejection sampling)으로 만든다. 밀도장이 임계값 아래인
 * 후보는 버리므로 통로와 음영이 자연스럽게 생긴다.
 */

export type Span = { x: number; y: number }

export type SplatBuffers = {
  main: THREE.BufferGeometry      // Alpha blending — 전체의 약 88%
  optical: THREE.BufferGeometry   // Additive blending — 광학 입자 10~15%
  coverage: number                // 후보 대비 채택률 (밀도장 점유 지표)
}

/* ── CPU value noise ────────────────────────────────────────── */
function hash3(x: number, y: number, z: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return s - Math.floor(s)
}
function vnoise(x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
  const xf = x - xi, yf = y - yi, zf = z - zi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf)
  const l = (a: number, b: number, t: number) => a + (b - a) * t
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz)
  return l(
    l(l(c(0,0,0), c(1,0,0), u), l(c(0,1,0), c(1,1,0), u), v),
    l(l(c(0,0,1), c(1,0,1), u), l(c(0,1,1), c(1,1,1), u), v),
    w,
  )
}
function fbm(x: number, y: number, z: number): number {
  return vnoise(x, y, z) * 0.55 + vnoise(x * 2.1, y * 2.1, z * 2.1) * 0.30
       + vnoise(x * 4.3, y * 4.3, z * 4.3) * 0.15
}

/**
 * 밀집 덩어리 — x/y/spread는 span에 대해 정규화(-1..1), z는 절대 깊이.
 * 후경에서 전경으로 이어지는 S-커브를 만들어 공간의 앞뒤를 만든다.
 */
const CLUMPS: [number, number, number, number, number][] = [
  // x, y, z, spread, weight
  [-0.72,  0.46, -2.5, 0.52, 1.00],  // 후경 좌상 — 주광원 쪽
  [-0.14, -0.26, -1.7, 0.44, 0.92],  // 중경 중앙
  [ 0.48,  0.24, -1.0, 0.40, 0.85],  // 중경 우측
  [ 0.86, -0.44, -0.4, 0.34, 0.70],  // 전경 우하 — 측면광 쪽
]

function density(x: number, y: number, z: number, span: Span): number {
  let clump = 0
  for (const [cx, cy, cz, sp, w] of CLUMPS) {
    const dx = (x - cx * span.x) / (sp * span.x)
    const dy = (y - cy * span.y) / (sp * span.y)
    const dz = (z - cz) / (sp * 2.6)
    clump = Math.max(clump, Math.exp(-(dx * dx + dy * dy + dz * dz)) * w)
  }
  // 덩어리를 잇는 중간 밀도 흐름
  const flow = fbm(x * 0.62 + 11.3, y * 0.62 - 4.1, z * 0.42) * 0.42
  return clump * 0.72 + flow
}

function brightness(r: number): number {
  // 대부분 어둡다. 외부 광원에 닿았을 때만 드러나야 하므로 상위 대역이 얇다.
  return r < 0.68 ? 0.16 + Math.random() * 0.24
       : r < 0.92 ? 0.44 + Math.random() * 0.26
       :            0.74 + Math.random() * 0.26
}

export function buildSplatField(
  count: number,
  span: Span,
  opts: { threshold: number; contrast: number; micro: number; medium: number; additiveRatio: number },
): SplatBuffers {
  const { threshold, contrast, micro, medium, additiveRatio } = opts

  const oX: number[] = [], oY: number[] = [], oZ: number[] = []
  const bright: number[] = [], dens: number[] = [], cls: number[] = [], seed: number[] = []
  const optical: number[] = []

  let tried = 0
  const maxTries = count * 24
  while (oX.length < count && tried < maxTries) {
    tried++
    const x = (Math.random() - 0.5) * 2 * span.x
    const y = (Math.random() - 0.5) * 2 * span.y
    const z = -3.0 + Math.random() * 3.6
    let d = density(x, y, z, span)
    d = Math.pow(Math.max(0, d), contrast)
    if (d < threshold) continue

    // 전경일수록 큰 splat, 후경일수록 미세 입자로 기운다.
    const depth = (z + 3.0) / 3.6           // 0 후경 → 1 전경
    const r = Math.random() - (depth - 0.5) * 0.22
    const c = r < micro ? 0 : r < micro + medium ? 1 : 2

    oX.push(x); oY.push(y); oZ.push(z)
    dens.push(Math.min(1, d))
    bright.push(brightness(Math.random()))
    cls.push(c)
    seed.push(Math.random())
    // 광학 입자: 밝은 미세 입자 중 일부만 Additive로 뽑는다.
    optical.push(c === 0 && Math.random() < additiveRatio / Math.max(micro, 0.01) ? 1 : 0)
  }

  const n = oX.length
  const mainIdx: number[] = [], optIdx: number[] = []
  for (let i = 0; i < n; i++) (optical[i] ? optIdx : mainIdx).push(i)

  const pack = (idx: number[]) => {
    const m = idx.length
    const pos = new Float32Array(m * 3), org = new Float32Array(m * 3)
    const br = new Float32Array(m), de = new Float32Array(m)
    const cl = new Float32Array(m), sd = new Float32Array(m)
    idx.forEach((src, i) => {
      pos[i*3] = org[i*3] = oX[src]
      pos[i*3+1] = org[i*3+1] = oY[src]
      pos[i*3+2] = org[i*3+2] = oZ[src]
      br[i] = bright[src]; de[i] = dens[src]; cl[i] = cls[src]; sd[i] = seed[src]
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aOrigin',  new THREE.BufferAttribute(org, 3))
    g.setAttribute('aBright',  new THREE.BufferAttribute(br, 1))
    g.setAttribute('aDensity', new THREE.BufferAttribute(de, 1))
    g.setAttribute('aClass',   new THREE.BufferAttribute(cl, 1))
    g.setAttribute('aSeed',    new THREE.BufferAttribute(sd, 1))
    return g
  }

  return { main: pack(mainIdx), optical: pack(optIdx), coverage: tried ? n / tried : 0 }
}
