# 인수인계

다른 사람(또는 다른 AI 어시스턴트)이 이 작업을 이어받을 때 먼저 읽는 문서.

## 0. 시작하기 전에

```bash
git checkout integration/hero-visual-system   # ← 최신. master는 한참 뒤처져 있다
npm install
npm run dev                                    # localhost:3001
```

| 브랜치 | 상태 |
|---|---|
| `integration/hero-visual-system` | **최신.** Hero 통합 + 배포 준비 완료 |
| `visual-system-rebuild` | 시각 시스템 검증 시점 (태그 `visual-lab-v2`) |
| `master`, `main` | 낡음. 참고하지 말 것 |

**현재 결함 목록은 [AUDIT.md](./AUDIT.md) 에 있다.** 실제로 실행해서 확인한
것과 확인하지 못한 것을 구분해 적어뒀으니 거기서부터 시작할 것.

**작업 전 필독:** `.claude/skills/` 의 4개 문서. 특히 `famoz-art-direction/SKILL.md`
는 이 프로젝트의 미술 판정 기준이며, 여기 적힌 금지 항목을 어기면 실패로 본다.

---

## 1. 이 프로젝트가 무엇인가

㈜파모즈(FAMOZ)의 회사 소개 랜딩페이지. Next.js 16 + Three.js.

전시·공공·미디어 공간을 다루는 회사이므로, 배경은 **우주·SF·판타지가 아니라
전시 공간의 무게**를 가져야 한다. 이 구분이 이 프로젝트에서 가장 여러 번
반려된 지점이다.

## 2. 구조

```
app/
  page.tsx              6개 장면 조립
  visual-lab/           배경 시스템 검수용 내부 페이지 (색인 제외)
components/
  visual/               ★ 시각 엔진. 본편과 visual-lab이 같은 코드를 쓴다
    VisualSystemCanvas.tsx   단일 렌더러 (Canvas 1개, RAF 소유)
    sheets.ts                L1 공간면 정의 — GLSL과 CPU 평가기의 단일 소스
    spaceFieldShader.ts      L1 공간면 + L2 광원 (전체화면 패스)
    labShaders.ts            L3 파티클 (splat)
    labGeometry.ts           파티클 분포 (시트 종속)
    maskField.ts             콘텐츠 안전영역 마스크 (DOM → 텍스처)
    pointerField.ts          포인터 속도장 + 스트로크 히스토리
    labParams.ts             모든 파라미터의 단일 저장소
  SectionBackdrop.tsx   CSS 전용 유색 암부 (canvas 없음)
  HeroScene.tsx         ★ 새 시각 시스템이 적용된 유일한 장면
  WhatWeCreate / ValueScene / PublicValue / WorksFilm / MascotScene / EndingScene
                        아직 예전 렌더링. 이식 안 됨
```

### 레이어 계약 (`app/globals.css`의 `--z-*` 토큰)

```
0  backdrop      CSS 유색 암부
1  field         WebGL 캔버스
2  haze          전경 대기
10 media         이미지·캐릭터
20 content       타이포·CTA
30 debug
```

**배경은 전부 10 미만, 콘텐츠는 전부 10 이상.** 장면마다 z-index를 1~5로
임의로 정하면 고정 캔버스와 충돌한다 (실제로 그래서 한 번 깨졌다).

---

## 3. 미술 규칙 — 어긴 적이 있는 것들

`.claude/skills/famoz-art-direction/SKILL.md` 가 정본이고, 여기서는 **실제로
반려됐던 사례**만 적는다.

| 하지 말 것 | 왜 |
|---|---|
| noise 값을 그대로 밝기로 쓰기 | 매끈한 능선이 그대로 **발광 리본**이 된다. noise는 표면 **위치**만 변형할 것 |
| 파티클을 화면 전체에 균등 분포 | 별가루가 된다. 입자는 L1 시트에 종속시킬 것 |
| 공간면을 자체 발광시키기 | 면은 기본이 암부이고, 광원에 닿은 부분만 밝아져야 한다 |
| 고채도 두 색을 같은 면적·밝기로 | 보라+시안 AI 그라데이션이 된다. 보조광은 주광원의 25~35% |
| 텍스트 강조색을 배경 주광원과 같은 색으로 | 라벤더 헤드라인이 라벤더 광원에 묻혔다. 헤드라인은 Warm Ivory |
| 캐릭터 외곽에 균일한 glow | 보라색 테두리가 된다. 광원별로 자기 방향 외곽에만 |
| 파티클 수를 늘려 문제 해결 | "먼지 벽" 지적의 원인은 양이 아니라 **공간 구조의 부재**였다 |

### 팔레트 (Hero)

```
graphite plum   #13101A   암부 (화면의 35~45%)
deep aubergine  #24172D   중간 공간면
smoky lavender  #8E7AA8   주광원
mist blue       #7895A6   냉색 산란 — 후경 통로에만
dusty amber     #B6815A   난색 반사 — 전경 반사면에만
warm ivory      #EEE8DF   텍스트
```

순수 red / green / neon cyan / vivid magenta 금지.

---

## 4. 기술적 함정 (전부 실제로 당한 것)

1. **콜백을 `useEffect` deps에 넣지 말 것.** 인라인 화살표를 넘겼더니 WebGL 씬이
   200ms마다 통째로 재생성됐다. ref로 받을 것.
2. **스트로크 버퍼는 시간 간격도 걸 것.** 거리 조건만 쓰면 10칸이 0.5초에
   소진돼 wake가 안 남는다.
3. **입력이 끊기면 새 속도를 받지 말 것.** 평활 좌표가 낡은 raw를 계속 쫓아가
   흐름이 영원히 안 멈췄다.
4. **감쇠 계수는 `pow(x, dt*60)` 로 정규화.** 안 하면 프레임레이트에 따라
   초 단위 스펙이 달라진다.
5. **large splat이 정사각형으로 보이면** `vSoft`가 낮은 것. 프래그먼트가
   `exp(-dot(uv,uv)*4*vSoft)` 이고 스프라이트 모서리의 `dot(uv,uv)`는 0.5이므로
   **vSoft ≥ 2.0** 이어야 모서리 알파가 0이 된다. 흐림은 **크기**로 얻을 것.
6. **`THREE.CanvasTexture`는 기본 `flipY = true`.** 화면 정렬 마스크로 쓰려면
   꺼야 한다. 안 끄면 마스크가 상하 반전된다.
7. **디버그 뷰의 셰이더 분기는 `VIEW_INDEX`와 함께 수정할 것.** 인덱스만
   재배치했더니 엉뚱한 캡처가 나왔다.
8. **회색조 검증은 CSS `grayscale()` 말고 `feColorMatrix`** 로 Rec.709
   휘도(0.2126/0.7152/0.0722)를 전 레이어에 적용할 것.

---

## 5. 검증 방식

**코드를 고친 것만으로 "개선했다"고 하지 말 것.** 이 프로젝트의 규칙이다.
헤드리스 브라우저로 스크린샷을 찍어 눈으로 확인한 뒤에 판정한다.

```
--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader
```

- swiftshader는 **소프트웨어 렌더러**다. 구도·색·밀도 판단에만 쓰고
  **FPS는 절대 성능 근거로 쓰지 말 것.**
- 페이지가 2fps로 돌기 때문에 CSS 리빌 트랜지션이 실시간의 10배 이상 걸린다.
  **본편 캡처는 최소 15초 대기.** (7초에 헤드라인이 없어 버그로 오인한 적 있음)
- `/visual-lab` 의 `#lab-debug` 노드로 디버그 뷰를 바꾸고 상태를 읽을 수 있다
  (`data-view` 쓰기 / `data-state` 읽기). 자동화 드라이버가 격리 JS 컨텍스트에서
  돌아 `window` 전역이 안 보이므로 DOM으로 주고받는다.

성능은 `npm run dev` 후 우하단 **START 10S GPU TEST** 로 실제 GPU에서 측정한다.
(프로덕션 빌드에서는 오버레이가 나오지 않는다.)

---

## 6. 지금까지 된 것 / 안 된 것

**된 것**
- 시각 엔진 (공간면·광원·시트 종속 파티클·포인터 속도장·3단 마스크)
- Hero 한 장면 통합, Canvas 6→1 / RAF 7→3
- 전역 레이어 계약, 콘텐츠 가독성 확보
- 배포 준비 (메타데이터·OG·JSON-LD·robots·sitemap) 및 임시 배포

**안 된 것** (전체 목록은 `AUDIT.md`)
- **Hero 프리셋이 다른 장면까지 따라온다.** 비활성 시 `renderer.clear()` 를
  하지 않아 마지막 프레임이 남는다. Works 사진 위에 파티클이 겹치는 것을 육안 확인
- **Canvas 1개는 Hero 한정.** what/value 2개, public 3개
- **나머지 5개 장면 미이식.** Hero 프리셋을 그대로 복제하지 말 것 —
  장면마다 다른 "사건"을 가져야 한다 (art-direction 스킬 참조)
- **mist blue / dusty amber가 아직 반사광으로 읽히지 않는다.** 세기를 올리는
  방식은 금지(보라·시안 그라데이션, 갈색 얼룩이 된다). 표면 방향·깊이 분리·
  노출로 해결할 것
- **실제 GPU 성능 미측정**
- 실제 인물/프로젝트 이미지 합성 미검증 (현재 로봇 마스코트는 마스크 검증용)
- OG 이미지가 임시 (프로젝트 사진 전용) — 1200×630 전용 이미지 필요
- favicon이 create-next-app 기본값일 가능성

## 7. 배포

`DEPLOY.md` 참조. 요약하면 Vercel 임시 배포 상태이고
`NEXT_PUBLIC_SITE_URL` 환경변수 하나로 실제 도메인 전환과 색인 개방이 함께 된다.
