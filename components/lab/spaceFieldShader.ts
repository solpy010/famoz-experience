import { NOISE_GLSL } from '../webgl/shaders'

/**
 * L1 Spatial Field + L2 Volumetric Light — 전체화면 패스.
 *
 * 왜 한 셰이더인가:
 *   "광원이 공간면에 닿은 부분만 밝아짐"을 구현하려면 L2가 L1의 필드를 알아야
 *   한다. 두 레이어를 분리한 DOM gradient로는 표면 반사를 만들 수 없다.
 *   대신 uFieldMode로 각각을 따로 볼 수 있게 해 검수 캡처 02/03/04를 만든다.
 *
 * L1은 승인된 공간 이미지가 없으므로 지시서 §2-B 경로를 쓴다:
 *   저주파 SDF 성격의 비정형 곡면 3개 + 깊이별 opacity field +
 *   방향성 noise distortion. 파티클을 꺼도 공간면과 통로가 남아야 한다.
 *
 * L2는 광학 마스크를 3개로 분리한다 (지시서 §3):
 *   1 source cone  2 fog scattering  3 surface reflection
 */

export const spaceVert = /* glsl */`
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);   /* 전체화면 삼각형/쿼드 */
  }
`

export const spaceFrag = /* glsl */`
  precision highp float;
  varying vec2 vUv;

  uniform float uTime, uAspect;
  uniform float uFieldMode;      /* 0 = L1+L2, 1 = L1만, 2 = L2만 */
  uniform float uWarp, uFieldLevel, uCorridor, uShadow;
  uniform vec3  uAmbientCol, uSurfaceCol, uShadowCol;
  uniform vec2  uLightOrigin, uLightDir;
  uniform float uConeWidth, uConeFalloff, uConeLevel;
  uniform float uScatterLevel, uReflectLevel, uSideLevel;
  uniform vec3  uLightCol, uCoolCol, uWarmCol;
  uniform vec2  uWarmOrigin;

  ${NOISE_GLSL}

  float fbm2(vec2 p, float t){
    return snoise(vec3(p, t)) * 0.58
         + snoise(vec3(p * 2.3 + 11.0, t * 1.3)) * 0.28
         + snoise(vec3(p * 4.7 - 5.0, t * 0.7)) * 0.14;
  }

  /* 비정형 곡면 한 장. 휘어진 중심선 주변의 가우시안 시트. */
  float sheet(vec2 p, float yc, float amp, float freq, float phase, float bend, float thick){
    float curve = yc + sin(p.x * freq + phase) * amp + bend * p.x * p.x;
    float d = (p.y - curve) / thick;
    return exp(-d * d);
  }

  void main(){
    /* 화면비 보정 좌표. 원점 중앙. */
    vec2 p = vec2((vUv.x - 0.5) * uAspect, vUv.y - 0.5);
    float t = uTime * 0.014;

    /* 방향성 noise distortion — 곡면이 기계적으로 보이지 않게 */
    vec2 w = p + vec2(
      fbm2(p * 1.15 + vec2(0.0, 3.1), t),
      fbm2(p * 1.15 + vec2(7.7, 0.0), t * 0.8)
    ) * uWarp;

    /* ── L1. 비정형 곡면 3개 + 깊이 ────────────────────────────
       depth 0 = 후경, 1 = 전경. 뒤로 갈수록 대비와 채도가 죽는다. */
    // 뒤로 휘어지는 대형 곡면
    float s0 = sheet(w, 0.30, 0.085, 1.7, 0.4, -0.30, 0.235);
    // 중경 주곡면 — 좌상에서 우중앙으로 흐른다
    float s1 = sheet(w, 0.02, 0.115, 1.2, 2.3, -0.16, 0.150);
    // 전경 하단 곡면
    float s2 = sheet(w, -0.34, 0.070, 2.1, 4.9,  0.22, 0.115);

    float dep0 = 0.12, dep1 = 0.52, dep2 = 0.86;

    /* 화면 안쪽으로 이어지는 사선 통로 — 밀도를 깎아 길을 낸다 */
    float corr = exp(-pow((w.y - (0.30 - 0.62 * w.x)) / 0.135, 2.0));
    /* 완전히 어두운 음영면 — 좌하단. 본문·CTA의 가독성 확보 영역 */
    float shad = exp(-pow((w.x + 0.46) / 0.42, 2.0)) * exp(-pow((w.y + 0.32) / 0.30, 2.0));

    float carve = (1.0 - corr * uCorridor);
    s0 *= carve; s1 *= carve; s2 *= carve;

    float field = s0 * 0.72 + s1 * 1.00 + s2 * 0.62;
    float depth = (s0 * dep0 * 0.72 + s1 * dep1 + s2 * dep2 * 0.62) / max(field, 1e-3);
    field = clamp(field, 0.0, 1.4);

    /* 깊이별 opacity field */
    float fieldA = field * uFieldLevel * (0.55 + depth * 0.45);

    vec3 l1col = mix(uAmbientCol, uSurfaceCol, depth) * (0.35 + depth * 0.65);
    l1col = mix(l1col, uShadowCol, shad * uShadow);

    /* ── L2. 광학 마스크 3개 ──────────────────────────────────── */
    // 1) source cone — 화면 좌상단 바깥에서 유입해 우중앙으로 사선 진행
    vec2  v    = p - uLightOrigin;
    float dist = length(v);
    float ang  = acos(clamp(dot(v / max(dist, 1e-4), normalize(uLightDir)), -1.0, 1.0));
    float cone = exp(-pow(ang / uConeWidth, 2.0)) * exp(-dist * uConeFalloff);

    // 2) fog scattering — 스모그 층을 통과하며 3단계로 산란
    float fog1 = fbm2(w * 1.05 + vec2(2.0, 0.0), t * 1.1) * 0.5 + 0.5;
    float fog2 = fbm2(w * 2.10 - vec2(4.0, 1.0), t * 1.6) * 0.5 + 0.5;
    float sc1 = cone * fog1;
    float sc2 = cone * smoothstep(0.18, 0.62, cone) * fog2;
    float sc3 = cone * smoothstep(0.45, 0.92, cone);
    float scatter = sc1 * 0.50 + sc2 * 0.32 + sc3 * 0.18;

    // 3) surface reflection — 공간면에 닿은 부분만 밝아진다
    float reflect_ = cone * field * (0.30 + depth * 0.70);

    // 보조광: 우하단 반사광. 주광원의 25~35%. 독립된 색 덩어리로 만들지 않는다.
    vec2  vw   = p - uWarmOrigin;
    float warm = exp(-dot(vw, vw) * 2.6) * field * (0.25 + depth * 0.75);

    vec3 l2col = uLightCol * scatter * uScatterLevel
               + uLightCol * reflect_ * uReflectLevel
               + uCoolCol  * sc1 * uScatterLevel * 0.42
               + uWarmCol  * warm * uSideLevel;
    float l2a = clamp(scatter * uScatterLevel * 0.9
                    + reflect_ * uReflectLevel * 1.1
                    + warm * uSideLevel * 0.9, 0.0, 1.0);

    /* ── 합성 / 디버그 분리 ──────────────────────────────────── */
    float onlyL1 = step(0.5, uFieldMode) * step(uFieldMode, 1.5);
    float onlyL2 = step(1.5, uFieldMode);
    float both   = 1.0 - onlyL1 - onlyL2;

    vec3  col = l1col * (fieldA * (both + onlyL1)) + l2col * (both + onlyL2) * uConeLevel;
    float a   = clamp(fieldA * (both + onlyL1) + l2a * (both + onlyL2) * uConeLevel, 0.0, 1.0);

    /* 후경일수록 채도를 낮춘다 */
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(luma), (1.0 - depth) * 0.38);

    if (a < 0.002) discard;
    gl_FragColor = vec4(col, a);
  }
`
