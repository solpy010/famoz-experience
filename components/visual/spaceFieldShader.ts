import { NOISE_GLSL } from '../webgl/shaders'
import { SHEETS_GLSL, CORRIDOR_GLSL } from './sheets'

/**
 * L1 Spatial Field + L2 Volumetric Light — 전체화면 패스.
 *
 * 핵심 규칙 (지시서 §1~§3):
 *   - 공간면은 빛이 아니다. 기본 상태는 암부이고 source cone에 닿은 부분만 밝다.
 *   - warp noise는 표면 **위치**를 변형하는 데만 쓴다. noise 값을 그대로 밝기로
 *     쓰면 안개 리본이 된다.
 *   - 면마다 법선이 다르고, 곡률 때문에 같은 면 안에서도 광원을 향한 쪽과
 *     등진 쪽의 명도가 갈린다.
 *   - 색온도는 넓은 색 덩어리가 아니라 **어느 면에 어떤 빛이 닿았는가**의 결과다.
 *       라벤더  = source cone의 표면 반사   (주)
 *       mist blue = 통로와 후경의 산란에만  (15~20%)
 *       amber   = 전경 반사면에만          (5~10%)
 *
 * uFieldMode: 0 합성 / 1 L1 표면만 / 2 source cone만 / 3 표면 반사만
 */

export const spaceVert = /* glsl */`
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
  }
`

export const spaceFrag = /* glsl */`
  precision highp float;
  varying vec2 vUv;

  uniform float uTime, uAspect;
  uniform float uFieldMode;
  uniform float uWarp, uFieldLevel, uCorridor, uShadow;
  uniform vec3  uAmbientCol, uSurfaceCol, uShadowCol;
  uniform vec2  uLightOrigin, uWarmOrigin;
  uniform float uLightZ, uConeWidth, uConeFalloff, uConeLevel;
  uniform float uScatterLevel, uReflectLevel, uSideLevel, uCoolLevel;
  uniform vec3  uLightCol, uCoolCol, uWarmCol;

  ${NOISE_GLSL}
  ${SHEETS_GLSL}
  ${CORRIDOR_GLSL}

  float fbm2(vec2 p, float t){
    return snoise(vec3(p, t)) * 0.58
         + snoise(vec3(p * 2.3 + 11.0, t * 1.3)) * 0.28
         + snoise(vec3(p * 4.7 - 5.0, t * 0.7)) * 0.14;
  }

  void main(){
    vec2 p = vec2((vUv.x - 0.5) * uAspect, vUv.y - 0.5);
    float t = uTime * 0.012;

    /* warp는 표면 위치만 흔든다. 밝기로 쓰지 않는다. */
    vec2 w = p + vec2(
      fbm2(p * 1.15 + vec2(0.0, 3.1), t),
      fbm2(p * 1.15 + vec2(7.7, 0.0), t * 0.8)
    ) * uWarp;

    float corr  = corridorField(w);
    float carve = 1.0 - corr * uCorridor;

    /* 좌하단 음영면 — 본문·CTA 가독성 확보 영역 */
    float shad = exp(-pow((w.x + 0.46) / 0.42, 2.0)) * exp(-pow((w.y + 0.32) / 0.30, 2.0));

    /* ── 면별 조명 누적 ──────────────────────────────────────── */
    vec3  surfCol = vec3(0.0);
    float surfA   = 0.0;
    float litSum  = 0.0;      // 표면 반사 총량 (디버그 C)
    float depthMix = 0.0;

    for (int i = 0; i < SHEET_COUNT; i++){
      SheetDef s = getSheet(i);

      /* 불완전한 면: 저주파 noise로 일부만 존재하게 한다.
         경계를 전부 노출하지 않고 30~60%만 읽히게 하는 장치. */
      float pres = smoothstep(s.presBias - 0.22, s.presBias + 0.26,
                              fbm2(w * s.presScale + float(i) * 17.3, t * 0.6) * 0.5 + 0.5);
      float core = sheetCore(s, w) * pres * carve;
      if (core < 0.002) continue;

      /* 표면 방향 */
      vec3 N = sheetNormal(s, w.x);
      /* 광원까지의 3D 방향. 면 위 위치마다 다르므로 한 면 안에서도 명암이 갈린다. */
      vec3 L = normalize(vec3(uLightOrigin - w, uLightZ));

      float ndl  = max(dot(N, L), 0.0);
      float rr   = pow(ndl, mix(3.2, 0.7, s.rough));       // roughness response
      float dAtt = mix(0.45, 1.0, s.depth);                 // depth attenuation
      float edge = smoothstep(0.0, 0.35, core);             // edge falloff

      float surfaceLight = rr * dAtt * core * edge;

      /* 기본 상태는 암부. 흡수가 클수록 그늘이 더 깊다. */
      vec3 base = mix(uSurfaceCol * 0.30, uShadowCol, s.absorb);
      /* 닿은 빛의 색: 후경 냉색 편향, 전경 난색 편향 */
      vec3 tint = mix(uCoolCol, uWarmCol, clamp(s.tone * 0.5 + 0.5, 0.0, 1.0));
      vec3 lit  = mix(uLightCol, tint, abs(s.tone) * 0.55);

      surfCol += base * core + lit * surfaceLight * uReflectLevel;
      surfA   += core;
      litSum  += surfaceLight;
      depthMix += core * s.depth;
    }

    surfA = clamp(surfA, 0.0, 1.0);
    depthMix = surfA > 0.001 ? depthMix / surfA : 0.5;
    surfCol = mix(surfCol, uShadowCol, shad * uShadow);

    /* ── L2-1. source cone ──────────────────────────────────── */
    vec2  v    = p - uLightOrigin;
    float dist = length(v);
    vec2  cdir = normalize(vec2(0.85, -0.40));
    float ang  = acos(clamp(dot(v / max(dist, 1e-4), cdir), -1.0, 1.0));
    float cone = exp(-pow(ang / uConeWidth, 2.0)) * exp(-dist * uConeFalloff);

    /* ── L2-2. fog scattering — 통로와 후경에만 냉색이 실린다 ── */
    float fog1 = fbm2(w * 0.62 + vec2(2.0, 0.0), t * 1.1) * 0.5 + 0.5;
    float sc   = cone * fog1 * (1.0 - surfA * 0.65);
    /* mist blue는 통로와 후경 한정. 전체 면적의 15~20%만 차지하게 묶는다. */
    float coolMask = clamp(corr * 0.75 + (1.0 - depthMix) * 0.45, 0.0, 1.0) * (1.0 - surfA * 0.5);

    /* ── L2-3. 난색 반사 — 전경 반사면에만 ───────────────────── */
    vec2  vw   = p - uWarmOrigin;
    float warm = exp(-dot(vw, vw) * 3.4) * surfA * smoothstep(0.55, 0.95, depthMix);

    vec3 l2col = uLightCol * sc * uScatterLevel
               + uCoolCol  * sc * coolMask * uCoolLevel
               + uWarmCol  * warm * uSideLevel;
    float l2a  = clamp(sc * uScatterLevel * 0.8 + sc * coolMask * uCoolLevel * 0.7
                     + warm * uSideLevel * 0.9, 0.0, 1.0);

    /* ── 모드 분기 ──────────────────────────────────────────── */
    float mL1   = step(0.5, uFieldMode) * step(uFieldMode, 1.5);
    float mCone = step(1.5, uFieldMode) * step(uFieldMode, 2.5);
    float mRefl = step(2.5, uFieldMode);
    float mAll  = 1.0 - mL1 - mCone - mRefl;

    vec3  col = surfCol * uFieldLevel * (mAll + mL1) + l2col * (mAll) * uConeLevel;
    float a   = clamp(surfA * uFieldLevel * (mAll + mL1) + l2a * mAll * uConeLevel, 0.0, 1.0);

    /* B: source cone만 */
    col = mix(col, uLightCol * cone * 1.4, mCone);
    a   = mix(a,   clamp(cone * 1.2, 0.0, 1.0), mCone);
    /* C: 표면 반사만 */
    col = mix(col, uLightCol * litSum * uReflectLevel * 1.6, mRefl);
    a   = mix(a,   clamp(litSum * uReflectLevel * 1.8, 0.0, 1.0), mRefl);

    /* 후경일수록 채도를 낮춘다 */
    float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(col, vec3(luma), (1.0 - depthMix) * 0.34 * mAll);

    if (a < 0.002) discard;
    gl_FragColor = vec4(col, a);
  }
`
