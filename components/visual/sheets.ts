/**
 * L1 공간면의 단일 정의.
 *
 * 같은 면을 두 곳이 알아야 한다:
 *   - 프래그먼트 셰이더가 표면 조명을 계산할 때
 *   - 지오메트리 빌더가 입자를 **시트에 종속시켜** 배치할 때
 * 그래서 파라미터를 여기 한 번만 적고 GLSL과 CPU 평가기를 모두 여기서 낸다.
 *
 * 좌표계: 화면비 보정 좌표. x ∈ [-aspect/2, aspect/2], y ∈ [-0.5, 0.5], 원점 중앙.
 *
 * 설계 규칙 (지시서 §1·§2):
 *   - 하나의 연속된 굵은 리본 금지. 서로 다른 깊이의 **불완전한 면 3개**.
 *   - 면 사이에 암부와 틈. 일부는 프레임 밖으로 이어진다.
 *   - 곡률·기울기·투명도·색온도를 전부 다르게 준다.
 *   - 면은 빛이 아니다. 기본 상태는 암부에 가깝고 source cone에 닿은 곳만 밝다.
 */

export type Sheet = {
  yc: number        // 중심선 오프셋
  amp: number       // 사인 진폭
  freq: number
  phase: number
  bend: number      // 2차 휘어짐
  thick: number     // 두께
  depth: number     // 0 후경 → 1 전경
  tilt: number      // 법선의 z 성분. 클수록 카메라를 정면으로 본다
  swing: number     // 기울기에 따라 법선이 흔들리는 정도
  rough: number     // 거칠기. 클수록 반사 로브가 넓고 평평하다
  absorb: number    // 흡수. 클수록 그늘에서 더 어둡다
  presScale: number // 불완전성 noise 스케일
  presBias: number  // 클수록 면이 더 많이 끊긴다
  tone: number      // -1 냉색 ~ +1 난색 편향
}

export const SHEETS: Sheet[] = [
  // 후경 — 크게 휘어 프레임 밖으로 나간다. 거의 암부. 냉색 편향.
  { yc: 0.34, amp: 0.10, freq: 1.35, phase: 0.5, bend: -0.52, thick: 0.105,
    depth: 0.10, tilt: 0.34, swing: 0.94, rough: 0.85, absorb: 0.80,
    presScale: 0.82, presBias: 0.52, tone: -0.70 },

  // 중경 — 주 표면. 곡률이 커서 한쪽은 광원을 보고 한쪽은 등진다.
  { yc: -0.04, amp: 0.145, freq: 0.95, phase: 2.6, bend: 0.34, thick: 0.064,
    depth: 0.55, tilt: 0.62, swing: 1.25, rough: 0.42, absorb: 0.55,
    presScale: 1.18, presBias: 0.62, tone: -0.15 },

  // 전경 우하 — 작고 기울어진 반사면. 난색 반사를 받는 유일한 면.
  { yc: -0.30, amp: 0.055, freq: 2.35, phase: 5.1, bend: 0.30, thick: 0.046,
    depth: 0.90, tilt: 0.48, swing: 1.05, rough: 0.30, absorb: 0.35,
    presScale: 1.72, presBias: 0.68, tone: 0.85 },
]

const f = (n: number) => n.toFixed(4)

/** GLSL 상수 블록 + 시트 평가 함수. spaceFieldShader / labShaders가 함께 쓴다. */
export const SHEETS_GLSL = /* glsl */`
  #define SHEET_COUNT ${SHEETS.length}

  struct SheetDef {
    float yc, amp, freq, phase, bend, thick;
    float depth, tilt, swing, rough, absorb;
    float presScale, presBias, tone;
  };

  SheetDef getSheet(int i){
    ${SHEETS.map((s, i) => `
    if (i == ${i}) return SheetDef(
      ${f(s.yc)}, ${f(s.amp)}, ${f(s.freq)}, ${f(s.phase)}, ${f(s.bend)}, ${f(s.thick)},
      ${f(s.depth)}, ${f(s.tilt)}, ${f(s.swing)}, ${f(s.rough)}, ${f(s.absorb)},
      ${f(s.presScale)}, ${f(s.presBias)}, ${f(s.tone)});`).join('')}
    return SheetDef(0.0,0.0,1.0,0.0,0.0,0.1, 0.5,0.5,1.0,0.5,0.5, 1.0,0.5,0.0);
  }

  float sheetCurve(SheetDef s, float x){
    return s.yc + sin(x * s.freq + s.phase) * s.amp + s.bend * x * x;
  }
  float sheetSlope(SheetDef s, float x){
    return cos(x * s.freq + s.phase) * s.amp * s.freq + 2.0 * s.bend * x;
  }
  /* 중심선까지의 정규화 거리 기반 가우시안. presence는 호출부에서 곱한다. */
  float sheetCore(SheetDef s, vec2 p){
    float d = (p.y - sheetCurve(s, p.x)) / s.thick;
    return exp(-d * d);
  }
  /* 표면 법선. 곡률을 따라 회전하므로 같은 면 안에서도 광원을 향한 쪽과
     등진 쪽의 명도가 갈린다. */
  vec3 sheetNormal(SheetDef s, float x){
    float m = sheetSlope(s, x);
    vec2 t = normalize(vec2(1.0, m));
    vec2 n2 = vec2(-t.y, t.x);
    return normalize(vec3(n2 * s.swing, s.tilt));
  }
  vec2 sheetTangent(SheetDef s, float x){
    return normalize(vec2(1.0, sheetSlope(s, x)));
  }
`

/* ── CPU 평가기 ────────────────────────────────────────────────
   지오메트리 빌더가 입자를 시트 근처에 배치할 때 쓴다.
   presence noise는 GLSL의 simplex와 정확히 일치시킬 수 없으므로 CPU에서는
   가우시안 코어만 본다. 최종 가시성은 셰이더의 sheetProximity가 다시 거르므로
   분포 단계에서는 이 근사로 충분하다. */

export function sheetCurveCPU(s: Sheet, x: number): number {
  return s.yc + Math.sin(x * s.freq + s.phase) * s.amp + s.bend * x * x
}

export function sheetCoreCPU(s: Sheet, x: number, y: number): number {
  const d = (y - sheetCurveCPU(s, x)) / s.thick
  return Math.exp(-d * d)
}

/** 가장 가까운 시트의 근접도와 그 인덱스 */
export function nearestSheet(x: number, y: number): { proximity: number; index: number } {
  let best = 0, bi = 0
  for (let i = 0; i < SHEETS.length; i++) {
    const v = sheetCoreCPU(SHEETS[i], x, y)
    if (v > best) { best = v; bi = i }
  }
  return { proximity: best, index: bi }
}

/** 사선 통로. 시트를 깎아내고 입자도 여기선 흐름만 남긴다. */
export function corridorCPU(x: number, y: number): number {
  const t = (y - (0.30 - 0.62 * x)) / 0.135
  return Math.exp(-t * t)
}

export const CORRIDOR_GLSL = /* glsl */`
  float corridorField(vec2 p){
    float t = (p.y - (0.30 - 0.62 * p.x)) / 0.135;
    return exp(-t * t);
  }
`
