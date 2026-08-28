import * as THREE from 'three'
import { nearestSheet, corridorCPU, SHEETS } from './sheets'

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

/**
 * 입자를 L1 시트에 **종속**시켜 배치한다 (지시서 §4).
 * 별가루처럼 화면 전체에 균등 확률로 뿌리지 않는다.
 *
 *   role 0 sheet-bound  65~75%   시트 주변
 *   role 1 corridor     15~20%   통로 방향 흐름
 *   role 2 far          나머지    저밀도 후경
 *   role 3 near         ≤5%      전경 가장자리
 */
const ROLE_MIX = [0.72, 0.18, 0.05, 0.05]

/** 월드 좌표 → 화면비 보정 화면 좌표. 셰이더의 p와 같은 공간. */
function toScreen(x: number, y: number, z: number, cam: CamInfo) {
  const k = 1 / (2 * cam.tanHalfFov * (cam.z - z))
  return { sx: x * k, sy: y * k }
}

export type CamInfo = { z: number; tanHalfFov: number; aspect: number }

export function buildSplatField(
  count: number,
  span: Span,
  cam: CamInfo,
  opts: { threshold: number; contrast: number; micro: number; medium: number;
          additiveRatio: number; nearRatio: number },
): SplatBuffers {
  const { threshold, contrast, additiveRatio } = opts

  const oX: number[] = [], oY: number[] = [], oZ: number[] = []
  const bright: number[] = [], dens: number[] = [], cls: number[] = []
  const seed: number[] = [], band: number[] = [], role: number[] = []
  const optical: number[] = []

  const BANDS = [
    { z0: -3.00, z1: -1.90 },  // far
    { z0: -1.90, z1: -0.70 },  // mid
    { z0: -0.70, z1:  0.35 },  // near
  ]
  const roleTotal = ROLE_MIX.reduce((a, b) => a + b, 0)

  let tried = 0
  const maxTries = count * 60
  while (oX.length < count && tried < maxTries) {
    tried++

    // 역할을 먼저 뽑고, 그 역할이 성립하는 자리만 채택한다
    let r = Math.random() * roleTotal, rl = 0
    for (let i = 0; i < ROLE_MIX.length; i++) { if (r < ROLE_MIX[i]) { rl = i; break } r -= ROLE_MIX[i] }

    const bi = rl === 3 ? 2 : rl === 2 ? 0 : rl === 1 ? 1 : (Math.random() < 0.35 ? 0 : 1)
    const B = BANDS[bi]
    const x = (Math.random() - 0.5) * 2 * span.x
    const y = (Math.random() - 0.5) * 2 * span.y
    const z = B.z0 + Math.random() * (B.z1 - B.z0)

    const { sx, sy } = toScreen(x, y, z, cam)
    if (Math.abs(sx) > cam.aspect * 0.56 || Math.abs(sy) > 0.56) continue

    const prox = nearestSheet(sx, sy).proximity
    const corr = corridorCPU(sx, sy)

    if (rl === 0 && prox < 0.30) continue                 // 시트에서 멀면 버린다
    if (rl === 1 && (corr < 0.35 || prox > 0.45)) continue // 통로 안, 시트 밖
    if (rl === 2 && prox > 0.22) continue                  // 후경 저밀도는 시트 밖만
    if (rl === 3) {
      const edge = Math.abs(sx) > cam.aspect * 0.34 || Math.abs(sy) > 0.34
      if (!edge) continue
    }

    let d = density(x, y, z, span)
    d = Math.pow(Math.max(0, d), contrast)
    // 시트 종속 입자는 밀도장 임계를 완화한다. 시트 근접도가 이미 구조를 준다.
    if (d < threshold * (rl === 0 ? 0.55 : 1.0)) continue

    let c: number
    const q = Math.random()
    if (bi === 0)      c = q < 0.86 ? 0 : q < 0.98 ? 1 : 2
    else if (bi === 1) c = q < 0.30 ? 0 : q < 0.88 ? 1 : 2
    else               c = q < 0.10 ? 1 : 2

    oX.push(x); oY.push(y); oZ.push(z)
    dens.push(Math.min(1, Math.max(d, prox * 0.9)))
    bright.push(brightness(Math.random()))
    cls.push(c); band.push(bi); role.push(rl)
    seed.push(Math.random())
    optical.push(rl === 0 && c === 0 && Math.random() < additiveRatio * 1.6 ? 1 : 0)
  }

  const n = oX.length
  const mainIdx: number[] = [], optIdx: number[] = []
  for (let i = 0; i < n; i++) (optical[i] ? optIdx : mainIdx).push(i)

  const pack = (idx: number[]) => {
    const m = idx.length
    const pos = new Float32Array(m * 3), org = new Float32Array(m * 3)
    const br = new Float32Array(m), de = new Float32Array(m)
    const cl = new Float32Array(m), sd = new Float32Array(m)
    const bd = new Float32Array(m), rl = new Float32Array(m)
    idx.forEach((src, i) => {
      pos[i*3] = org[i*3] = oX[src]
      pos[i*3+1] = org[i*3+1] = oY[src]
      pos[i*3+2] = org[i*3+2] = oZ[src]
      br[i] = bright[src]; de[i] = dens[src]; cl[i] = cls[src]
      sd[i] = seed[src]; bd[i] = band[src]; rl[i] = role[src]
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aOrigin',  new THREE.BufferAttribute(org, 3))
    g.setAttribute('aBright',  new THREE.BufferAttribute(br, 1))
    g.setAttribute('aDensity', new THREE.BufferAttribute(de, 1))
    g.setAttribute('aClass',   new THREE.BufferAttribute(cl, 1))
    g.setAttribute('aSeed',    new THREE.BufferAttribute(sd, 1))
    g.setAttribute('aBand',    new THREE.BufferAttribute(bd, 1))
    g.setAttribute('aRole',    new THREE.BufferAttribute(rl, 1))
    return g
  }

  return { main: pack(mainIdx), optical: pack(optIdx), coverage: tried ? n / tried : 0 }
}
