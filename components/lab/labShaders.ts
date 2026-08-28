import { NOISE_GLSL } from '../webgl/shaders'

/**
 * /visual-lab GLSL.
 *
 * 설계 규칙 (webgl-fluid-field + 문서 §7~§10):
 *  - 포인터는 전역 좌표를 옮기지 않는다. 이동 **경로(선분)** 주변에만 국소 변위.
 *  - 레이어마다 지연·힘·복귀가 다르다. 같은 속도로 움직이면 실패.
 *  - 파티클은 자체 발광하지 않는다. 외부 광원의 산란으로만 드러난다.
 *  - 콘텐츠 안전영역에서는 밝은 입자만 억제하고 어두운 입자는 남긴다.
 *
 * GLSL ES 1.0 제약: uniform 배열을 비상수 인덱스로 접근할 수 없다.
 * 클래스별 값은 배열 대신 step/mix 혼합으로 고른다.
 */

export const MAX_STROKE = 10
export const MAX_RECTS = 6

/* ── 포인터: 이동 경로에 힘 주입 (문서 §7) ─────────────────── */
const STROKE_GLSL = /* glsl */`
  uniform vec4  uStrokes[${MAX_STROKE}];   /* x, y, age, speed */
  uniform float uStrokeCount;
  uniform float uPointerRadius, uPointerForce, uMaxDisp, uSwirl, uMaxPointerSpeed;

  vec2 closestPointOnSegment(vec2 p, vec2 a, vec2 b){
    vec2 ab = b - a;
    float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
    return a + ab * t;
  }

  /* 반환: 월드 XY 변위. exposure는 흐름이 스모그를 가른 정도(§9). */
  vec2 strokeForce(vec2 p, float lag, float forceScale, float tau, out float exposure){
    vec2 disp = vec2(0.0);
    exposure = 0.0;
    const float GAIN = 26.0;

    for (int i = 0; i < ${MAX_STROKE - 1}; i++){
      vec4 A = uStrokes[i];      /* 최신 */
      vec4 B = uStrokes[i + 1];  /* 이전 */

      /* 유효한 선분인가 + 레이어 지연을 넘겼는가 (break 없이 마스킹) */
      float valid = step(float(i + 2), uStrokeCount + 0.5);
      float age   = A.z - lag;
      float alive = step(0.0, age) * valid;
      float decay = exp(-max(age, 0.0) / max(tau, 0.05)) * alive;

      vec2  seg    = A.xy - B.xy;
      float segLen = length(seg);
      vec2  dir    = seg / max(segLen, 1e-4);
      vec2  perp   = vec2(-dir.y, dir.x);

      vec2  c    = closestPointOnSegment(p, B.xy, A.xy);
      float d    = distance(p, c);
      float infl = exp(-(d * d) / max(uPointerRadius * uPointerRadius, 1e-5));

      float side = sign(dot(p - c, perp) + 1e-6);
      float spd  = min(A.w, uMaxPointerSpeed) * GAIN;
      float w    = infl * decay * spd * forceScale;

      /* 경로 방향 밀기 + 수직 성분으로 작은 와류 */
      disp      += (dir * uPointerForce + perp * side * uSwirl) * w;
      exposure  += w;
    }

    /* 빠른 왕복에서 힘이 무한 누적되지 않도록 반드시 clamp (§7) */
    float L = length(disp);
    disp = L > uMaxDisp ? disp * (uMaxDisp / L) : disp;
    return disp;
  }
`

/* ── 콘텐츠 안전영역 (문서 §3) ──────────────────────────────── */
const MASK_GLSL = /* glsl */`
  uniform vec4      uContentRects[${MAX_RECTS}];  /* x, y, w, h — 화면 UV */
  uniform float     uContentCount, uContentFeather;
  uniform sampler2D uCharTex;
  uniform vec4      uCharRect;
  uniform vec2      uCharTexSize;
  uniform float     uCharEnabled, uCharFeather;

  /* 1.0 = 자유,  0.0 = 완전 억제 */
  float contentMask(vec2 suv){
    float m = 1.0;
    for (int i = 0; i < ${MAX_RECTS}; i++){
      vec4 r = uContentRects[i];
      float valid = step(float(i + 1), uContentCount + 0.5);
      vec2 c = r.xy + r.zw * 0.5;
      vec2 h = r.zw * 0.5;
      vec2 d = abs(suv - c) - h;
      float outside = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
      float s = smoothstep(0.0, uContentFeather, outside);
      m = min(m, mix(1.0, s, valid));
    }
    return m;
  }

  /* 인물 alpha mask — 불투명 픽셀 위로는 입자가 지나가지 않는다 */
  float charMask(vec2 suv){
    if (uCharEnabled < 0.5) return 1.0;
    vec2 half_ = uCharRect.zw * 0.5;
    vec2 ctr   = uCharRect.xy + half_;
    vec2 d     = abs(suv - ctr) - half_;
    float outside = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
    if (outside > 0.0) return smoothstep(0.0, uCharFeather, outside);

    vec2 uv = (suv - uCharRect.xy) / uCharRect.zw;
    uv.y = 1.0 - uv.y;
    vec2 o = 1.6 / max(uCharTexSize, vec2(1.0));
    float a = texture2D(uCharTex, uv).a * 0.44
            + texture2D(uCharTex, uv + vec2( o.x, 0.0)).a * 0.14
            + texture2D(uCharTex, uv + vec2(-o.x, 0.0)).a * 0.14
            + texture2D(uCharTex, uv + vec2(0.0,  o.y)).a * 0.14
            + texture2D(uCharTex, uv + vec2(0.0, -o.y)).a * 0.14;
    return 1.0 - smoothstep(0.10, 0.62, a);
  }
`

/* ── 외부 광원 산란 (famoz-art-direction L2 / 문서 §9) ──────── */
const LIGHT_GLSL = /* glsl */`
  uniform vec3  uMainLight, uMainColor, uSideLight, uSideColor, uAmbient;
  uniform vec3  uCamPos;
  uniform float uAnisotropy, uReflectance;

  float henyeyGreenstein(float cosT, float g){
    float gg = g * g;
    return min((1.0 - gg) / pow(max(1.0 + gg - 2.0 * g * cosT, 1e-3), 1.5), 6.0);
  }

  /* 파티클은 발광하지 않는다. 광원에서 온 빛의 전방 산란만 돌려준다. */
  vec3 externalLight(vec3 pos, out float lit){
    vec3 V = normalize(pos - uCamPos);
    vec3 dM = pos - uMainLight;
    vec3 dS = pos - uSideLight;

    /* 감쇠는 볼륨 전체(반경 ~4)에 걸쳐 방향성이 남을 만큼 완만해야 한다.
       계수가 크면 광원 바로 옆만 밝고 나머지는 전부 검게 죽는다. */
    /* 감쇠가 너무 완만하면 두 광원이 어디서나 같이 닿아 색이 회색으로 섞인다.
       주광원 영역(라벤더)과 측면광 영역(앰버)이 공간적으로 갈라질 만큼은 세운다. */
    float attM = 1.0 / (1.0 + dot(dM, dM) * 0.155);
    float attS = 1.0 / (1.0 + dot(dS, dS) * 0.235);

    float sM = attM * henyeyGreenstein(dot(normalize(dM), V), uAnisotropy) * 3.4;
    float sS = attS * henyeyGreenstein(dot(normalize(dS), V), uAnisotropy * 0.8) * 2.6;

    lit = sM + sS;
    return (uMainColor * sM + uSideColor * sS) * uReflectance;
  }
`

/* ════════════════════════════════════════════════════════════
   L4 — Gaussian Splat Field
════════════════════════════════════════════════════════════ */
export const splatVert = /* glsl */`
  uniform float uTime, uDPR, uSizeScale, uOpacity;
  uniform float uBaseCurlScale, uBaseCurlStrength;
  uniform float uContentSuppress, uBrightSuppress, uPointerSuppress;
  uniform float uExposure, uRevealCap;
  uniform float uLagMicro, uLagMedium, uLagLarge;
  uniform float uForceMicro, uForceMedium, uForceLarge;
  uniform float uTauMicro, uTauMedium, uTauLarge;
  uniform float uView;

  attribute vec3  aOrigin;
  attribute float aBright, aDensity, aClass, aSeed;

  varying vec3  vColor;
  varying float vAlpha, vSoft;

  ${NOISE_GLSL}
  ${STROKE_GLSL}
  ${MASK_GLSL}
  ${LIGHT_GLSL}

  void main(){
    vec3  origin = aOrigin;
    float depth  = clamp((origin.z + 3.0) / 3.6, 0.0, 1.0);

    float isMicro  = step(aClass, 0.5);
    float isLarge  = step(1.5, aClass);
    float isMedium = 1.0 - isMicro - isLarge;

    float lag   = isMicro*uLagMicro   + isMedium*uLagMedium   + isLarge*uLagLarge;
    float fsc   = isMicro*uForceMicro + isMedium*uForceMedium + isLarge*uForceLarge;
    float tau   = isMicro*uTauMicro   + isMedium*uTauMedium   + isLarge*uTauLarge;

    /* 기본 대기 흐름 — 포인터가 있어도 덮어쓰지 않는다 (§11) */
    float t = uTime * 0.05;
    vec3 baseFlow = curlNoise(origin * uBaseCurlScale + vec3(t*0.9, t*0.7, t*0.5))
                  * uBaseCurlStrength;
    vec3 pos = origin + baseFlow * (0.4 + depth * 0.8);

    /* 변위 전 화면좌표로 포인터 힘 억제량을 먼저 구한다 */
    vec4 clip0 = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    vec2 suv0  = clip0.xy / max(abs(clip0.w), 1e-4) * 0.5 + 0.5;
    float gate = mix(1.0 - uPointerSuppress, 1.0, contentMask(suv0));

    float exposure;
    pos.xy += strokeForce(pos.xy, lag, fsc * gate, tau, exposure);

    vec4 mv   = modelViewMatrix * vec4(pos, 1.0);
    vec4 clip = projectionMatrix * mv;
    vec2 suv  = clip.xy / max(abs(clip.w), 1e-4) * 0.5 + 0.5;
    float cm  = min(contentMask(suv), charMask(suv));

    /* ── 조명 ── */
    float lit;
    vec3  recv    = externalLight(pos, lit);
    vec3  ambient = uAmbient * (0.5 + depth * 0.5);
    /* 흐름이 갈라진 만큼 후경광이 드러난다. 상한을 둬 동시에 번쩍이지 않게. */
    float reveal  = 1.0 + clamp(exposure * uExposure, 0.0, uRevealCap);
    vec3  color   = ambient + recv * aBright * reveal;

    /* 밝은 입자만 억제한다. 어두운 입자는 남겨 검은 구멍을 막는다 (§3). */
    float brightW = smoothstep(0.28, 0.88, aBright);
    color *= mix(1.0 - uBrightSuppress * brightW, 1.0, cm);

    float a = uOpacity * (0.25 + aBright * 0.75) * (0.45 + aDensity * 0.55) * (0.50 + depth * 0.50);
    a *= mix(1.0 - uContentSuppress * brightW, 1.0, cm);

    /* ── 크기 ── */
    float baseSize = isMicro * 1.7 + isMedium * 5.0 + isLarge * 14.0;
    float sz = uSizeScale * baseSize * uDPR * (1.5 / max(-mv.z, 0.4))
             * (0.45 + depth * 0.75) * (0.72 + lit * 1.1);
    float lo = isMicro * 0.6 + isMedium * 2.4 + isLarge * 7.0;
    float hi = isMicro * 3.0 + isMedium * 12.0 + isLarge * 42.0;

    /* 클래스마다 다른 Gaussian softness — 전경일수록 부드럽다 */
    vSoft = isMicro * 4.2 + isMedium * 2.4 + isLarge * 1.15;

    /* ── 디버그 뷰 ── */
    float vVel   = step(4.5, uView) * step(uView, 5.5);
    float vMask  = step(5.5, uView) * step(uView, 6.5);
    float vDepth = step(6.5, uView);
    color = mix(color, vec3(clamp(exposure * 3.0, 0.0, 1.0), 0.12, 0.55), vVel);
    color = mix(color, vec3(1.0 - cm, cm * 0.55, 0.25), vMask);
    color = mix(color, vec3(depth, 0.25, 1.0 - depth), vDepth);
    a     = mix(a, max(a, 0.35), max(vVel, max(vMask, vDepth)));

    vColor = color;
    vAlpha = a;
    gl_PointSize = clamp(sz, lo, hi);
    gl_Position  = clip;
  }
`

export const splatFrag = /* glsl */`
  uniform float uSoftness;
  varying vec3  vColor;
  varying float vAlpha, vSoft;
  void main(){
    vec2  uv = gl_PointCoord - 0.5;
    float g  = exp(-dot(uv, uv) * 4.0 * vSoft * uSoftness);
    float a  = g * vAlpha;
    if (a < 0.002) discard;
    gl_FragColor = vec4(vColor, a);
  }
`

/* ════════════════════════════════════════════════════════════
   L3 — Fog / Atmospheric Density
   스모그는 파티클과 같은 velocity field를 쓰되 더 느리게 반응하고
   더 천천히 복귀한다 (§10).
════════════════════════════════════════════════════════════ */
export const fogVert = /* glsl */`
  varying vec2 vUv;
  varying vec3 vWorld;
  void main(){
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

export const fogFrag = /* glsl */`
  precision highp float;
  uniform float uTime, uLayer, uFogDensity, uFogScattering, uOpacity;
  uniform float uLagFog, uForceFog, uTauFog, uExposure;
  uniform float uContentSuppress;
  uniform vec2  uResolution;
  uniform float uView;
  varying vec2 vUv;
  varying vec3 vWorld;

  ${NOISE_GLSL}
  ${STROKE_GLSL}
  ${MASK_GLSL}
  ${LIGHT_GLSL}

  void main(){
    /* 스모그도 같은 스트로크 필드를 읽는다 — 단, 가장 늦게 복귀한다 */
    float exposure;
    vec2 warp = strokeForce(vWorld.xy, uLagFog, uForceFog, uTauFog, exposure);

    vec3 p = vec3(vWorld.xy + warp, vWorld.z);
    float t = uTime * (0.012 + uLayer * 0.008);

    /* 저주파 3D noise 3옥타브 — 큰 색면이 먼저 읽혀야 한다 */
    float n = snoise(p * 0.38 + vec3(t, t * 0.7, uLayer * 3.1)) * 0.58
            + snoise(p * 0.92 + vec3(-t * 1.3, t * 0.5, 7.2)) * 0.28
            + snoise(p * 2.10 + vec3(t * 0.6, -t, 2.4)) * 0.14;
    n = n * 0.5 + 0.5;

    /* 가장자리 감쇄 — 평면 경계가 드러나지 않게 */
    float edge = 1.0 - smoothstep(0.16, 0.48, length(vUv - 0.5));
    /* 임계를 높게 잡아 균일한 우윳빛 막이 아니라 덩어리진 형태만 남긴다 */
    float d = smoothstep(0.46, 0.92, n * (0.55 + uFogDensity * 0.9)) * edge;

    float lit;
    vec3 scat = externalLight(vWorld, lit) * uFogScattering;
    vec3 col  = uAmbient * 0.6 + scat;

    /* 흐름이 갈라진 곳에서 후경광이 더 드러난다 */
    col *= 1.0 + clamp(exposure * uExposure * 0.6, 0.0, 0.30);

    vec2 suv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
    float cm = contentMask(suv);
    float a  = d * uOpacity * mix(1.0 - uContentSuppress * 0.45, 1.0, cm);

    float vVel = step(4.5, uView) * step(uView, 5.5);
    col = mix(col, vec3(clamp(exposure * 3.0, 0.0, 1.0), 0.05, 0.35), vVel);

    if (a < 0.002) discard;
    gl_FragColor = vec4(col, a);
  }
`
