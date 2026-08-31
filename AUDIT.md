# 감사 결과 — 2026-08-31

`integration/hero-visual-system` (`5fae5a2`) 기준.

측정 환경: Chromium headless, swiftshader(소프트웨어 렌더러), 프로덕션 빌드
(`next build && next start`). **모든 항목은 실제로 실행해서 확인했으며,
확인하지 못한 것은 그렇다고 적었습니다.**

---

## 요약

| 판정 | 개수 |
|---|---|
| 수정 완료 | 1 |
| 확인된 결함 | 7 |
| 재현되지 않음 | 1 |
| 통과 | 4 |
| 미검증 | 1 |

---

## 수정 완료

### ✅ WebGL 부재 시 사이트 전체 붕괴 (P0)

**수정 전:** WebGL을 차단하면 HTTP 200이 오는데도 `sections: 0`, 헤드라인
`null`, 배경 흰색. CSS 폴백 배경조차 나오지 않았습니다.

원인은 `new THREE.WebGLRenderer`가 effect 안에서 예외를 던져 React 트리 전체가
언마운트된 것입니다. 폴백 디자인은 있었지만 폴백 **실행 구조**가 없었습니다.

**수정 후:** `sections: 6`, 헤드라인 정상, 유색 암부 정상, `tier 0 / particles 0`.

3중 방어: 렌더러 생성 try/catch · `webglcontextlost` 처리 ·
`VisualErrorBoundary` · 최후 수단 `app/error.tsx`.

> 이 결함을 놓친 이유: 모든 검증을 swiftshader **활성** 상태로만 했습니다.
> 앞으로 `--disable-3d-apis --disable-gpu` 검증을 반드시 병행할 것.

---

## 확인된 결함

### 1. Hero 프리셋이 다른 장면까지 따라온다 — 육안 확인

Works 장면 캡처에서 **Hero 파티클이 프로젝트 사진 위를 덮고 있습니다.**
성능 오버레이도 그 지점에서 `preset: hero`, `particles: 40,000`을 표시합니다.

원인: `VisualSystemCanvas`는 비활성 시 렌더 루프만 조기 종료합니다
(`if (!activeRef.current) return`). `renderer.clear()` 를 호출하지 않으므로
**마지막 Hero 프레임이 프레임버퍼에 남아** 뒤 장면에 겹칩니다.

`app/page.tsx` 주석의 "다음 장면에 Hero 프리셋이 남지 않는다"는 의도와
실제 동작이 다릅니다.

### 2. 안정 상태 Canvas 1개는 Hero에서만 성립

이전 보고의 "Canvas 6→1"은 **Hero 구간 한정**이었습니다. 실측:

| 스크롤 위치 | Canvas | 내역 |
|---|---:|---|
| 인트로 | 2 | 시각 시스템 + 인트로 (의도됨) |
| hero | **1** | `visual-canvas` (fixed, z=1) |
| what | 2 | + DistortionCanvas |
| value | 2 | + DistortionCanvas |
| **public** | **3** | + DistortionCanvas ×2 (인접 섹션이 뷰포트에서 겹침) |
| works | 1 | |
| ending | 1 | |

`public` 지점에서 WebGL 컨텍스트 3개가 동시에 살아 있습니다.

### 3. 전역 스크롤 리스너 7개 중복

`MascotScene` · `ParallaxSystem` · `SectionBackdrop` · `ValueScene` ·
`WhatWeCreate` · `WorksFilm` · `VisualSystemCanvas` 가 각각 등록합니다.
여기에 WebGL RAF와 DOM 패럴랙스 RAF가 더해집니다.

### 4. 장면 단계가 `Math.floor()` 로 즉시 교체

`MascotScene.tsx:90`, `WhatWeCreate.tsx:102`. 경계에서 배경·색·문구가
동시에 바뀝니다. 개별 요소에 transition이 있어도 토대가 먼저 교체됩니다.

### 5. 인트로 로고 인계가 잘린다

`IntroSequence.tsx` — 220ms 이동 시작, **1300ms 언마운트**.
로고 퇴장이 끝나기 전에 컴포넌트가 사라지고 Hero 로고가 새 객체로 등장합니다.
하나의 로고가 이동하는 연출이 아니라 두 로고가 교대하는 연출입니다.

### 6. Works 이미지 77MB

| 항목 | 값 |
|---|---|
| 저장소 총량 | **77MB** (21개) |
| 최대 단일 파일 | 6.3MB (`expo-03.png`) |
| 스크롤 1회 실제 다운로드 | 9.6MB (25건) |
| `loading="lazy"` | **없음** |
| WebP/AVIF | 없음 |
| 반응형 크기 | 없음 |

### 7. 이미지 대체텍스트 21개가 일반명

`"프로젝트명 1"` 형태로, 이미지가 전달하는 내용을 알 수 없습니다.

### 8. 섹션 3개에 id가 없다

`hero` · `public` · `ending` 만 id를 가집니다. 나머지 3개는 앵커 링크와
분석 도구 타겟팅이 불가능합니다.

---

## 재현되지 않음

### 인트로 접근성 구조 충돌

`aria-hidden` 영역 안의 포커스 가능 요소를 측정했으나 **0개**였습니다.
다만 측정 시점이 인트로 **종료 후**였으므로, 인트로 진행 중에는 다를 수
있습니다. 인트로 활성 상태에서의 재측정이 필요합니다.

---

## 통과

- **반응형** 1920×1080 / 1440×900 / 1280×720 / 390×844 / 844×390 —
  전부 Canvas 1개, 가로 오버플로 없음, 헤드라인 표시됨
- **reduced-motion** — Canvas 렌더 안 함, 카피 전부 표시, 6개 섹션 정상
- **콘솔 에러 0건 / 실패 요청 0건**
- **문서 구조** — `lang="ko"`, `h1` 1개, `alt` 누락 0개

---

## 미검증

### 실제 GPU 성능

swiftshader는 소프트웨어 렌더러입니다. **여기서 나온 FPS는 성능 근거가
될 수 없습니다.** 실제 측정은 `npm run dev` 후 우하단
`START 10S GPU TEST` 로 해야 합니다.

미측정 항목: 실 FPS · 1% low · frame time · 리사이즈 전후 메모리 ·
인트로 종료 전후 메모리.

---

## 권장 순서

1. **Hero 이탈 시 canvas clear** — 작업량이 작고 육안으로 확인된 결함
2. **장면 전환 연속화** — `Math.floor` 즉시 교체를 이전/현재/다음 겹침으로
3. **스크롤 측정 중앙화** — 리스너 7개를 1개로, RAF에서 배분
4. **Works 이미지 최적화** — WebP 변환 · lazy loading · 프로젝트 간 교차 페이드
5. **나머지 5개 장면 시각 시스템 통합** — 단, Hero 프리셋 복제 금지
   (`.claude/skills/famoz-art-direction/SKILL.md` 참조)
6. **실제 GPU 성능 측정 후 입자 수 확정**
7. 섹션 id 부여 · 대체텍스트 개선 · 인트로 중 접근성 재측정
