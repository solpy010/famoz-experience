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
/**
 * 지시서 §4 구성:
 *   넓고 흐릿한 중간 밀도 공간면 2~3개 + 국소 고밀도 cluster 1~2개.
 * 파티클이 화면의 주인공이 되면 안 되므로, 면적은 넓은 공간면이 갖고
 * 시선을 잡는 밀도 피크는 좁은 cluster 두 개만 갖는다.
 */
const CLUMPS: [number, number, number, number, number][] = [
  // x, y, z, spread, weight
  // 넓고 흐릿한 공간면
  [-0.55,  0.30, -2.6, 1.05, 0.62],  // 후경 좌상 — 주광원이 통과하는 면
  [ 0.35, -0.15, -1.6, 0.95, 0.55],  // 중경 전체를 낮게 채우는 면
  [ 0.10,  0.55, -0.9, 0.80, 0.44],  // 상단 전경 면
  // 국소 고밀도 cluster
  [-0.30, -0.05, -2.0, 0.32, 1.00],  // 주광원 근처 밀도 피크
  [ 0.72, -0.40, -0.7, 0.26, 0.88],  // 전경 우하 피크
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
  return r < 0.74 ? 0.14 + Math.random() * 0.22
       : r < 0.94 ? 0.40 + Math.random() * 0.24
       :            0.70 + Math.random() * 0.28
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
