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

export const MAX_STROKE = 5
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

/* ── 3단계 콘텐츠 마스크 (지시서 §1) ───────────────────────────
   A Core Occlusion / B Soft Safety Field / C Ambient Field.
   rect 루프 대신 화면 정렬 마스크 텍스처 2장을 읽는다. 페더가 blur로 구워져
   있으므로 경계가 사각형으로 보이지 않고, soft의 기울기를 그대로 흐름 편향에
   쓸 수 있다. maskField.ts 참조. */
const MASK_GLSL = /* glsl */`
  uniform sampler2D uCoreTex;   /* a: 1 = 실루엣 내부 (완전 차폐) */
  uniform sampler2D uSoftTex;   /* a: 1 = 완전 억제 → 페더 밖 0 */
  uniform vec2      uMaskTexel;

  float coreMask(vec2 suv){ return texture2D(uCoreTex, vec2(suv.x, 1.0 - suv.y)).a; }
  float softMask(vec2 suv){ return texture2D(uSoftTex, vec2(suv.x, 1.0 - suv.y)).a; }

`

/* ── 외부 광원 산란 (famoz-art-direction L2 / 문서 §9) ──────── */
const LIGHT_GLSL = /* glsl */`
  uniform vec3  uMainLight, uMainColor, uSideLight, uSideColor, uAmbient;
  uniform vec3  uAlbedoNear, uAlbedoFar;
  uniform vec3  uCamPos;
  uniform float uAnisotropy, uReflectance, uSideLevel, uFogAbsorb;

  /* 두 저주파 광원의 거리 감쇠만 계산한다. 이전 HG pow 연산은 작은 점에서
     시각 차이가 거의 없으면서 모든 vertex 비용을 크게 올렸다. */
  vec3 externalLight(vec3 pos, out float lit){
    vec3 dM = pos - uMainLight;
    vec3 dS = pos - uSideLight;
    float sM = 1.35 / (1.0 + dot(dM, dM) * 0.075);
    float sS = 1.10 / (1.0 + dot(dS, dS) * 0.105) * uSideLevel;

    lit = sM + sS;
    return (uMainColor * sM + uSideColor * sS) * uReflectance;
  }

  /* 입자는 고유색을 갖지 않는다. 저채도 albedo가 빛에 노출된 만큼만 색을 띤다.
     후경일수록 fog absorption으로 채도와 대비가 낮아진다. */
  vec3 shadeParticle(vec3 pos, float depth, float bright, out float lit){
    vec3 albedo = mix(uAlbedoFar, uAlbedoNear, depth);
    vec3 scat   = externalLight(pos, lit);
    vec3 col    = albedo * (uAmbient + scat * bright);
    float luma  = dot(col, vec3(0.299, 0.587, 0.114));
    return mix(col, vec3(luma), (1.0 - depth) * uFogAbsorb);
  }
`

/* ════════════════════════════════════════════════════════════
   L4 — Gaussian Splat Field
════════════════════════════════════════════════════════════ */
export const splatVert = /* glsl */`
  uniform float uTime, uDPR, uSizeScale, uOpacity;
  uniform float uBaseCurlScale, uBaseCurlStrength;
  uniform float uContentSuppress, uBrightSuppress, uPointerSuppress;
  uniform float uCoreOcclusion, uDeflect;
  uniform float uExposure, uRevealCap;
  uniform float uLagMicro, uLagMedium, uLagLarge;
  uniform float uForceMicro, uForceMedium, uForceLarge;
  uniform float uTauMicro, uTauMedium, uTauLarge;
  uniform float uView;

  uniform float uLayerFilter;   /* -1 전부, 0 far, 1 mid, 2 near */
  uniform float uSplatAniso, uAspect, uSheetBind;
  uniform vec2  uSpan;
  uniform vec2  uLightOrigin;
  uniform float uLightZ;

  attribute vec3  aOrigin;
  attribute float aBright, aDensity, aClass, aSeed, aBand, aRole;

  varying vec3  vColor;
  varying float vAlpha, vSoft, vAngle, vAniso;

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
    float speed = 0.035 + depth * 0.075;
    float travel = uTime * speed;
    vec3 pos = origin;
    pos.x = mod(origin.x + uSpan.x + travel + sin(origin.y * 1.4 + aSeed * 6.283) * .08, uSpan.x * 2.0) - uSpan.x;
    float wave = sin(pos.x * .72 + origin.y * 1.18 + uTime * (.10 + depth * .04) + aSeed * 3.2);
    vec3 baseFlow = vec3(1.0, wave * .62, cos(wave + aSeed * 5.1) * .18) * uBaseCurlStrength;
    pos.y += wave * (.035 + depth * .075);

    float exposure;
    pos.xy += strokeForce(pos.xy, lag, fsc, tau, exposure) * (0.55 + depth * 0.85);

    vec4 mv   = modelViewMatrix * vec4(pos, 1.0);
    vec4 clip = projectionMatrix * mv;
    vec2 suv  = clip.xy / max(abs(clip.w), 1e-4) * 0.5 + 0.5;

    float core = coreMask(suv);   /* A */
    float soft = softMask(suv);   /* B */

    /* ── 깊이 레이어별 초점 분리 (지시서 §4) ──────────────────
       부드러움을 전체 blur로 만들지 않는다. 레이어마다 대비·채도·초점이 다르다. */
    float isFar  = step(aBand, 0.5);
    float isNear = step(1.5, aBand);
    float isMid  = 1.0 - isFar - isNear;

    /* ── 조명 ── */
    /* 흐름이 갈라진 만큼 후경광이 드러난다. 상한을 둬 동시에 번쩍이지 않게. */
    float reveal = 1.0 + clamp(exposure * uExposure, 0.0, uRevealCap);
    float lit;
    vec3  color  = shadeParticle(pos, depth, aBright * reveal, lit);

    /* 깊이마다 독립된 색온도를 갖게 해 전체가 보라 안개로 섞이지 않게 한다. */
    float luma2 = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(color, vec3(luma2), isFar * 0.10);
    color = mix(color, vec3(0.16, 0.40, 0.95), isFar * 0.28);
    color = mix(color, vec3(0.56, 0.38, 1.00), isMid * smoothstep(0.18, 0.92, lit) * 0.24);
    color = mix(color, vec3(0.48, 0.92, 1.00), isNear * 0.32);
    color *= isFar * 0.70 + isMid * 1.18 + isNear * 0.88;
    /* mid는 광원에 닿은 일부만 선명해진다 */
    color *= 1.0 + isMid * smoothstep(0.25, 0.9, lit) * 0.5;

    /* B. Soft Safety Field — 밝은 입자일수록 강하게 감쇠한다.
       어두운 입자는 남겨 검은 구멍이 생기지 않게 한다. */
    float brightW = smoothstep(0.22, 0.85, aBright);
    color *= 1.0 - uBrightSuppress * brightW * soft;

    /* 밀도를 제곱으로 실어 고밀도 cluster만 드러나게 한다. 선형이면 성긴
       영역까지 같이 올라와 화면 전체가 균일한 점묘가 된다. */
    float a = uOpacity * (0.34 + aBright * 0.66)
            * (0.42 + aDensity * aDensity * 0.78) * (0.58 + depth * 0.42)
            /* far는 "일부만 표시". 저대비로 남기고 별가루가 되지 않게 한다. */
            * (1.0 - isFar * 0.24);
    a *= 1.0 - uContentSuppress * brightW * soft;

    /* A. Core Occlusion — 실루엣 내부는 입자가 보이지 않는다 */
    a *= 1.0 - uCoreOcclusion * smoothstep(0.10, 0.55, core);

    /* ── 크기 ── */
    /* 디버그: 특정 깊이 레이어만 보기 (검수 캡처 05~07) */
    float wantAll = step(uLayerFilter, -0.5);
    float keep = wantAll + (1.0 - wantAll) * step(abs(aBand - uLayerFilter), 0.5);
    a *= keep;

    /* ── 형태 ──
       원형만 반복하지 않는다. mid의 절반은 흐름 방향으로 늘어난 타원형이라
       흐름 방향을 판독할 수 있다 (지시서 §5). */
    vAngle = atan(baseFlow.y, baseFlow.x + 1e-5);
    vAniso = 1.0 + uSplatAniso * isMid * step(aSeed, 0.62)
                 * (0.5 + aDensity * 0.5);

    float baseSize = isMicro * 1.35 + isMedium * 3.8 + isLarge * 10.0;
    float sz = uSizeScale * baseSize * uDPR * (1.5 / max(-mv.z, 0.4))
             * (0.45 + depth * 0.75) * (0.72 + lit * 1.1);
    float lo = isMicro * 1.0 + isMedium * 2.2 + isLarge * 5.0;
    float hi = isMicro * 2.3 + isMedium * 5.4 + isLarge * 10.0;

    /* large는 점이 아니라 흐릿한 공간면으로 읽혀야 한다 (지시서 §4).
       흐림은 falloff를 눕혀서가 아니라 **크기**로 얻는다.
       프래그먼트는 exp(-dot(uv,uv)*4*vSoft)이고 스프라이트 모서리의
       dot(uv,uv)는 0.5이므로, vSoft가 2.0 아래로 내려가면 모서리 알파가
       남아 입자가 정사각형으로 보인다. 하한 2.0을 지킬 것. */
    vSoft = isMicro * 5.0 + isMedium * 3.2 + isLarge * 2.8;
    a *= isMicro * 1.0 + isMedium * 0.76 + isLarge * 0.38;

    /* ── 디버그 뷰 ── */
    /* VIEW_INDEX와 반드시 같이 움직여야 한다: masks = 8, velocity = 9, dist = 10 */
    float vMask = step(7.5, uView) * step(uView, 8.5);
    float vVel  = step(8.5, uView) * step(uView, 9.5);
    float vDist = step(9.5, uView);
    /* E: 역할별 색 — sheet 라벤더 / corridor 청록 / far 회청 / near 앰버 */
    vec3 roleCol = step(aRole, 0.5) * vec3(0.68, 0.55, 0.86)
                 + step(0.5, aRole) * step(aRole, 1.5) * vec3(0.30, 0.72, 0.70)
                 + step(1.5, aRole) * step(aRole, 2.5) * vec3(0.36, 0.44, 0.56)
                 + step(2.5, aRole) * vec3(0.88, 0.62, 0.34);
    color = mix(color, roleCol, vDist);
    a     = mix(a, max(a * 2.2, 0.28), vDist);
    color = mix(color, vec3(clamp(exposure * 3.0, 0.0, 1.0), 0.12, 0.55), vVel);
    /* 마스크 뷰: Core = 적색, Soft = 청색, 둘 다 = 자홍, 자유 = 어두움 */
    color = mix(color, vec3(core, 0.10, soft * 0.95), vMask);
    a     = mix(a, max(a, 0.35), vVel);
    /* 마스크 뷰에서는 차폐로 사라지면 코어를 볼 수 없으므로 알파를 고정한다 */
    a     = mix(a, 0.5, vMask);

    vColor = color;
    vAlpha = a;
    gl_PointSize = clamp(sz, lo, hi);
    gl_Position  = clip;
  }
`

export const splatFrag = /* glsl */`
  uniform float uSoftness;
  varying vec3  vColor;
  varying float vAlpha, vSoft, vAngle, vAniso;
  void main(){
    vec2 uv = gl_PointCoord - 0.5;
    /* 흐름 방향으로 회전한 뒤 그 축으로 늘인다. 스프라이트는 정사각형이므로
       늘인 축을 나누고 반대 축을 곱해 넓이를 보존한다. */
    float c = cos(vAngle), s = sin(vAngle);
    vec2  r = vec2(c * uv.x + s * uv.y, -s * uv.x + c * uv.y);
    r.x /= vAniso;
    r.y *= vAniso;
    float g = exp(-dot(r, r) * 4.0 * vSoft * uSoftness);
    float a = g * vAlpha;
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
    vec3 col  = mix(uAlbedoFar, uAlbedoNear, uLayer) * (uAmbient + scat);

    /* 흐름이 갈라진 곳에서 후경광이 더 드러난다 */
    col *= 1.0 + clamp(exposure * uExposure * 0.6, 0.0, 0.30);

    vec2 suv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
    float core = coreMask(suv);
    float soft = softMask(suv);
    /* 스모그는 저밀도라 콘텐츠를 가리지 않지만, 실루엣 내부에서는 완전히 뺀다 */
    float a  = d * uOpacity
             * (1.0 - uContentSuppress * 0.40 * soft)
             * (1.0 - smoothstep(0.10, 0.55, core));

    float vVel = step(4.5, uView) * step(uView, 5.5);
    col = mix(col, vec3(clamp(exposure * 3.0, 0.0, 1.0), 0.05, 0.35), vVel);

    if (a < 0.002) discard;
    gl_FragColor = vec4(col, a);
  }
`
