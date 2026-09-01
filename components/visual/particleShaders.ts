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
  uniform vec2  uFocus, uPointerVelocity;
  uniform float uDwell, uMemory;

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

    /* live head — 현재 smooth pointer와 마지막 기록점 사이를 매 프레임 계산한다.
       기록점은 잔상 보존을 위해 0.18초 간격이지만, 영향 중심까지 그 간격으로
       점프하면 60fps에서도 5.5Hz 끊김으로 보인다. */
    vec2 liveSeg = uFocus - uStrokes[0].xy;
    float liveLen = length(liveSeg);
    vec2 liveDir = liveSeg / max(liveLen, 1e-4);
    vec2 livePerp = vec2(-liveDir.y, liveDir.x);
    vec2 liveC = closestPointOnSegment(p, uStrokes[0].xy, uFocus);
    float liveD = distance(p, liveC);
    float liveInfl = exp(-(liveD * liveD) / max(uPointerRadius * uPointerRadius, 1e-5));
    float liveSpeed = min(length(uPointerVelocity), uMaxPointerSpeed) * GAIN;
    float liveValid = step(0.5, uStrokeCount) * step(0.0001, liveLen);
    float liveSide = sign(dot(p - liveC, livePerp) + 1e-6);
    float liveW = liveInfl * liveSpeed * forceScale * liveValid;
    disp += (liveDir * uPointerForce + livePerp * liveSide * uSwirl) * liveW;
    exposure += liveW;

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

  /* 포인터 체류 시 깊이마다 다른 타원형 공간면을 만든다. 중심 집결이 아니라
     비어 있는 통로 + 세 겹 경계를 만들며 memory가 해체 전 잔상을 담당한다. */
  vec2 organizeField(vec2 p, float depth, float seed, out float ridge){
    vec2 q = p - uFocus;
    q.x /= 1.48;
    float d = length(q);
    float target = uPointerRadius * mix(0.38, 0.94, depth)
                 * (0.92 + sin(seed * 6.283) * 0.08);
    float local = exp(-(d * d) / max(uPointerRadius * uPointerRadius * 2.4, 1e-4));
    ridge = exp(-pow((d - target) / max(uPointerRadius * 0.18, 0.02), 2.0));
    vec2 n = q / max(d, 1e-4);
    n.x /= 1.48;
    float phase = uDwell * 0.92 + uMemory * 0.42;
    vec2 settle = -n * (d - target) * local * phase * (0.48 + depth * 0.34);
    /* 최근 진행 방향을 따라 통로가 조금 열리되, 카메라나 전체 공간은 움직이지 않는다. */
    vec2 tangent = length(uPointerVelocity) > 1e-5
      ? normalize(uPointerVelocity) : vec2(1.0, 0.0);
    settle += tangent * ridge * uMemory * (seed - 0.5) * 0.055;
    return settle;
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
    float isFar  = step(aBand, 0.5);
    float isNear = step(1.5, aBand);
    float isMid  = 1.0 - isFar - isNear;

    float lag   = isMicro*uLagMicro   + isMedium*uLagMedium   + isLarge*uLagLarge;
    float fsc   = isMicro*uForceMicro + isMedium*uForceMedium + isLarge*uForceLarge;
    float tau   = isMicro*uTauMicro   + isMedium*uTauMedium   + isLarge*uTauLarge;

    /* 기본 대기 흐름 — 포인터가 있어도 덮어쓰지 않는다 (§11) */
    /* 눈으로 판독 가능한 세 개의 깊이 속도. 이전 값(0.035~0.11)은 한 화면을
       가로지르는 데 수분이 걸려 정지 별가루처럼 보였다. 속도를 올리되 seed별
       위상과 깊이별 차이를 둬 전 화면이 한 장처럼 미끄러지지 않게 한다. */
    float speed = isFar * 0.10 + isMid * 0.22 + isNear * 0.38;
    float direction = step(1.5, aRole) > 0.5 ? -1.0 : 1.0;
    float travel = uTime * speed * direction;
    vec3 pos = origin;
    pos.x = mod(origin.x + uSpan.x + travel + sin(origin.y * 1.4 + aSeed * 6.283) * .08, uSpan.x * 2.0) - uSpan.x;
    float phase = pos.x * (0.62 + aRole * .11) + origin.y * .74 + aSeed * 1.9;
    float wave = sin(phase + uTime * (.12 + depth * .07));
    float lane = sin(pos.x * .34 + aRole * 1.73) * (.10 + isMid * .09);
    vec3 baseFlow = vec3(direction, wave * .38 + cos(phase * .47) * .16,
                         cos(phase + aSeed * 3.1) * .12) * uBaseCurlStrength;
    pos.y += lane + wave * (.045 + depth * .10);

    float exposure;
    pos.xy += strokeForce(pos.xy, lag, fsc, tau, exposure) * (0.55 + depth * 0.85);
    float organizedRidge;
    pos.xy += organizeField(pos.xy, depth, aSeed, organizedRidge);

    vec4 mv   = modelViewMatrix * vec4(pos, 1.0);
    vec4 clip = projectionMatrix * mv;
    vec2 suv  = clip.xy / max(abs(clip.w), 1e-4) * 0.5 + 0.5;

    float core = coreMask(suv);   /* A */
    float soft = softMask(suv);   /* B */

    /* ── 깊이 레이어별 초점 분리 (지시서 §4) ──────────────────
       부드러움을 전체 blur로 만들지 않는다. 레이어마다 대비·채도·초점이 다르다. */
    /* ── 조명 ── */
    /* 흐름이 갈라진 만큼 후경광이 드러난다. 상한을 둬 동시에 번쩍이지 않게. */
    float reveal = 1.0 + clamp(exposure * uExposure, 0.0, uRevealCap);
    float lit;
    vec3  color  = shadeParticle(pos, depth, aBright * reveal, lit);

    /* 깊이마다 독립된 색온도를 갖게 해 전체가 보라 안개로 섞이지 않게 한다. */
    float luma2 = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(color, vec3(luma2), isFar * 0.10);
    color = mix(color, vec3(0.20, 0.43, 0.90), isFar * 0.34);
    color = mix(color, vec3(0.63, 0.51, 0.96), isMid * smoothstep(0.12, 0.92, lit) * 0.34);
    color = mix(color, vec3(0.63, 0.88, 1.00), isNear * 0.38);
    color *= isFar * 0.82 + isMid * 1.34 + isNear * 1.02;
    /* mid는 광원에 닿은 일부만 선명해진다 */
    color *= 1.0 + isMid * smoothstep(0.25, 0.9, lit) * 0.5;
    /* 구조의 경계만 제한적으로 드러낸다. 중심 광구나 전 화면 Bloom은 없다. */
    color *= 1.0 + organizedRidge * (uDwell * 0.34 + uMemory * 0.14);

    /* B. Soft Safety Field — 밝은 입자일수록 강하게 감쇠한다.
       어두운 입자는 남겨 검은 구멍이 생기지 않게 한다. */
    float brightW = smoothstep(0.22, 0.85, aBright);
    color *= 1.0 - uBrightSuppress * brightW * soft;

    /* 밀도를 제곱으로 실어 고밀도 cluster만 드러나게 한다. 선형이면 성긴
       영역까지 같이 올라와 화면 전체가 균일한 점묘가 된다. */
    float ridge = smoothstep(0.38, 0.82, aDensity);
    float a = uOpacity * (0.42 + aBright * 0.58)
            * (0.48 + ridge * 0.82) * (0.62 + depth * 0.38)
            /* far는 "일부만 표시". 저대비로 남기고 별가루가 되지 않게 한다. */
            * (1.0 - isFar * 0.24);
    a *= 1.0 + organizedRidge * (uDwell * 0.46 + uMemory * 0.14);
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
    vAniso = 1.0 + (0.35 + uSplatAniso) * isMid * step(aSeed, 0.38)
                 * (0.55 + aDensity * 0.65);

    float baseSize = isMicro * 1.85 + isMedium * 4.6 + isLarge * 9.0;
    float sz = uSizeScale * baseSize * uDPR * (1.5 / max(-mv.z, 0.4))
             * (0.45 + depth * 0.75) * (0.72 + lit * 1.1);
    float lo = isMicro * 1.25 + isMedium * 2.8 + isLarge * 5.0;
    float hi = isMicro * 2.6 + isMedium * 6.2 + isLarge * 10.0;

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
    /* E: 깊이 진단색 — far blue / mid green / near amber. 진단 화면에서
       색만 보고도 세 층의 분포·크기·속도를 구별할 수 있어야 한다. */
    vec3 depthCol = isFar * vec3(0.30, 0.56, 1.00)
                  + isMid * vec3(0.20, 0.78, 0.55)
                  + isNear * vec3(1.00, 0.70, 0.24);
    color = mix(color, depthCol, vDist);
    a     = mix(a, max(a * 2.0, 0.48), vDist);
    /* 진단 모드의 짧은 dash는 별도 벡터 장식이 아니라 실제 입자의 긴 축이다.
       세 층이 서로 다른 길이를 가져 방향과 원근을 한 프레임에서도 판독한다. */
    vAniso = mix(vAniso, isFar * 1.35 + isMid * 2.55 + isNear * 1.70, vDist);
    color = mix(color, vec3(clamp(exposure * 3.0, 0.0, 1.0), 0.12, 0.55), vVel);
    /* 마스크 뷰: Core = 적색, Soft = 청색, 둘 다 = 자홍, 자유 = 어두움 */
    color = mix(color, vec3(core, 0.10, soft * 0.95), vMask);
    a     = mix(a, max(a, 0.35), vVel);
    /* 마스크 뷰에서는 차폐로 사라지면 코어를 볼 수 없으므로 알파를 고정한다 */
    a     = mix(a, 0.5, vMask);

    vColor = color;
    vAlpha = a;
    float diagnosticSize = isFar * 1.65 + isMid * 2.65 + isNear * 4.15;
    gl_PointSize = mix(clamp(sz, lo, hi), diagnosticSize * uDPR, vDist);
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
