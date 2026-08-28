---
name: visual-qa
description: 시각 결과물의 스크린샷 검수와 합격/실패 판정 절차. 배경·파티클·조명·레이아웃을 수정한 뒤 "됐다"고 말하기 전에 반드시 실행한다. 헤드리스 브라우저 실행 레시피, 페인트 스택 점검, 10항목 채점 루브릭 포함.
---

# Visual QA

## 이 스킬이 존재하는 이유

**코드를 잘 작성한 것과 디자인이 좋아진 것은 다르다.**
눈으로 확인하지 않으면 이 둘을 구분할 수 없다.

수치를 바꾸고 타입체크가 통과했다는 이유로 "개선했습니다"라고 보고하지 않는다.
스크린샷을 만들고, 읽고, 루브릭으로 채점한 뒤에만 판정한다.

## 헤드리스 스크린샷 실행 레시피

이 프로젝트에는 Playwright가 설치돼 있지 않다. 두 가지 경로가 있다.

### A. 설치된 patchright 재사용 (즉시 사용 가능, 소프트웨어 GL)

```js
import { chromium } from 'file:///C:/Users/user/.vscode/extensions/danielsanmedium.dscodegpt-3.24.43/standalone/node_modules/patchright/index.mjs'

const b = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const p = await (await b.newContext({
  viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1,
})).newPage()
await p.goto('http://localhost:3001', { waitUntil: 'load' })
await p.waitForTimeout(1200)
await p.mouse.click(720, 450)      // 인트로 시퀀스 해제
await p.waitForTimeout(4000)       // WebGL 프레임 누적
await p.screenshot({ path: 'hero.png' })
await b.close()
```

**주의 사항**

- `--enable-unsafe-swiftshader` 없으면 WebGL 컨텍스트가 안 잡힌다.
- 페이지 진입 직후 `IntroSequence`가 화면을 덮는다. 클릭으로 해제해야 배경이 보인다.
- 파티클이 자리를 잡으려면 최소 3~4초의 rAF 누적이 필요하다. 즉시 찍으면 빈 화면.
- **swiftshader는 소프트웨어 렌더러라 FPS 측정에 쓸 수 없다.** 구도·색·밀도 판정용.
- `.claude/skills/browser-automation`의 `--script` 옵션은 Windows에서 ESM 경로
  오류(`ERR_UNSUPPORTED_ESM_URL_SCHEME`)가 난다. 위처럼 직접 스크립트를 쓸 것.

### B. Playwright 설치 (FPS/실GPU 측정이 필요할 때)

```bash
npm i -D playwright && npx playwright install chromium
```

## 필수 캡처 세트

매 단계마다 다음을 생성한다.

| # | 조건 |
|---|---|
| 1 | 1440×900 정지 스크린샷 |
| 2 | 포인터 정지 상태 5초 |
| 3 | 포인터를 왼쪽→오른쪽으로 천천히 이동한 5초 |
| 4 | 포인터를 빠르게 왕복한 5초 |
| 5 | 모바일 390×844 |
| 6 | reduced-motion 상태 |
| 7 | FPS와 GPU 메모리 (실GPU 필요) |

화면비 회귀를 잡으려면 1440×900 외에 **2560×1080(울트라와이드)**과
**1366×768**도 함께 찍는다. 고정 크기 볼륨 버그는 16:9에서만 보면 놓친다.

## 페인트 스택 점검 (색이 안 바뀔 때 제일 먼저)

배경색을 고쳤는데 화면이 그대로면, 색 값이 아니라 **무엇이 위에 그려지는지**를
의심한다. 이 프로젝트에서 실제로 유색 배경 레이어 전체가 불투명 섹션 배경에
가려져 한 번도 보인 적이 없었다.

```js
await p.evaluate(() => document.elementsFromPoint(60, 820).map(e => {
  const s = getComputedStyle(e)
  return `${e.tagName}${e.id ? '#' + e.id : ''} z=${s.zIndex} pos=${s.position} bg=${s.backgroundColor}`
}))
```

최상단에 불투명 `rgb(8,8,8)` 같은 게 있으면 그 아래 레이어는 전부 죽은 코드다.

## 채점 루브릭

매 반복마다 참조 이미지와 결과를 나란히 놓고 10점 만점으로 채점한다.

| 항목 | 점수 |
|---|---|
| 유색 공간 배경 | /10 |
| 공간 깊이 | /10 |
| 광원의 방향성 | /10 |
| 스모그 산란 | /10 |
| splat의 부드러움 | /10 |
| 밀집과 공백 | /10 |
| 포인터 관성 | /10 |
| 인물의 공간 통합 | /10 |
| 텍스트 가독성 | /10 |
| FAMOZ 브랜드 적합성 | /10 |

**각 항목이 7점 미만이면 홈페이지 본편에 적용하지 않는다.**

## 필수 통과 조건 (3개 전부)

1. 모션을 정지해도 공간의 깊이와 미술 완성도가 보인다.
2. 빠른 포인터 왕복에도 공간 전체가 떡처럼 흔들리지 않는다.
3. 배경을 회색조로 바꿔도 광원·밀도·원근의 구조가 구분된다.

3번은 이렇게 검증한다:

```js
await p.evaluate(() => document.documentElement.style.filter = 'grayscale(1)')
```

색을 빼고도 구조가 읽히지 않으면, 색으로 부족한 미술을 덮고 있었다는 뜻이다.

## 완료 보고 형식

"수정했습니다"라고만 답하지 않는다. 다음을 포함한다.

- 변경한 렌더링 구조
- 삭제·비활성화한 기존 코드
- 신규 컴포넌트 목록
- 포인터 물리 구조
- 장면별 팔레트
- 성능 Tier
- 정지 화면 평가 / 느린 포인터 / 빠른 포인터 / 모바일 테스트
- 남은 미술적 문제
- 스크린샷 및 영상 경로

## 관련 스킬

- 색·구도 기준 → `famoz-art-direction`
- 포인터 물리 실패 판정 → `webgl-fluid-field`
- Tier·폴백 → `performance-tier`
