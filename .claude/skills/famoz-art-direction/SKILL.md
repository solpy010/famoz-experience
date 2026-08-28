---
name: famoz-art-direction
description: FAMOZ 랜딩페이지의 팔레트·공간·타이포·금지 문법. 배경/조명/파티클/색상과 관련된 시각 작업을 시작하기 전에 반드시 읽는다. 색을 고르거나, 배경 토큰을 만지거나, 장면 프리셋을 추가·수정할 때 트리거.
---

# FAMOZ Art Direction

## 이 스킬이 존재하는 이유

이 프로젝트는 "검정 배경 위에 보라색 발광 파티클이 흩어진 AI 홈페이지"로
보이면 **실패**다. 목표는 유색 암부 안에서 공간 이미지·볼류메트릭 광선·
스모그·Gaussian splat이 여러 깊이로 겹쳐진 화면이다.

입자는 스스로 빛나는 장식이 아니라 **외부 광원에 의해 부분적으로 드러나는
공간 물질**이어야 한다.

## 절대 금지 (하나라도 어기면 실패 판정)

| 금지 | 이유 |
|---|---|
| `#000000` / `#080808` 급 절대 블랙을 **면적 배경**으로 사용 | 유색 암부가 죽는다. 아래 팔레트 참조 |
| 화면 중앙 단일 `radial-gradient` 하나로 배경 끝내기 | 최소 3개 저주파 컬러 필드 중첩 |
| 파티클 전체에 `AdditiveBlending` | 전부 네온처럼 빛난다. 10~15%만 |
| 파티클 색을 vertex에서 고정 발광색으로 지정 | 색은 외부 광원의 산란 결과여야 함 |
| 모든 장면에 동일 파티클 프리셋 재사용 | 색만 바뀐 같은 장면 반복 |
| 커서 좌표를 입자 전체 위치에 직접 더하기 | `webgl-fluid-field` 스킬 참조 |
| 텍스트 전면에 밝은 입자 배치 | 가독성 파괴 |
| 참조 이미지 없이 감각적 수식어를 코드로 추측 | `visual-qa` 스킬 참조 |

## 유색 암부 팔레트 (L0 Chromatic Backdrop)

```
Deep Indigo Black   #0A0E19
Dark Petrol         #0B2024
Deep Plum           #241329
Graphite Violet     #191721
Warm Charcoal       #211D1C
```

- `#000000`은 **화면 가장자리와 음영에서만**, 전체 면적의 10~15% 이내.
- 배경 한 면 = 최소 3개의 저주파 컬러 필드 중첩. 단일 그라데이션 금지.

### 이 프로젝트에서 반복적으로 발생한 실패

`app/globals.css`의 `--black: #080808`이 섹션 배경으로 불투명하게 깔리면,
그 아래 z-index의 유색 배경 레이어는 **렌더링되지만 영원히 보이지 않는다.**
배경색을 바꿨는데 화면이 그대로면 색 값이 아니라 **페인트 스택**을 의심할 것.
검증 방법은 `visual-qa` 스킬의 페인트 스택 점검 참조.

## 장면별 팔레트

색은 입자의 고정 발광색이 아니라 **광원 + 산란광**으로 표현한다.

| 장면 | 배경 | 주광원 | 보조광 | 포인트 |
|---|---|---|---|---|
| HERO | Deep Plum + Graphite Indigo | Smoky Lavender | Champagne Amber | Muted Rose |
| 이야기 공간 | Graphite Indigo + Dark Petrol | Petrol Teal | Warm Ivory | Muted Violet |
| 상호작용 공간 | Deep Plum + Warm Charcoal | Dusty Coral | Champagne Amber | Muted Rose |
| AI 도움 공간 | Dark Petrol + Deep Indigo | Mist Cyan | Muted Violet | Digital Blue |
| PUBLIC VALUE | Deep Emerald + Graphite Indigo | Mist Cyan | Warm Ivory | Champagne Amber |
| WORKS | *대표 이미지에서 저채도 색 2~3개 추출* | 이미지 유래 | 이미지 유래 | 이미지 유래 |
| CONTACT | Warm Charcoal + Deep Plum | Champagne Amber | Warm Ivory | Muted Rose |

WORKS는 프로젝트 이미지가 교체되면 조명과 스모그 색도 함께 바뀌어야 한다.

## 장면별 미술 사건

색상만 바뀌는 동일한 파티클 배경이면 실패다. 각 장면은 다른 **사건**을 갖는다.

- **HERO** — 흩어진 공간면이 로고와 헤드라인 주변에서 깨어남
- **이야기** — splat이 넓은 공간면과 장면의 문을 형성
- **반응** — 사람의 움직임이 넓은 파동과 흐름을 발생
- **AI 도움** — 흩어진 흐름이 안내 경로와 목적지로 정렬
- **PUBLIC VALUE** — 여러 광원이 연결망으로 합쳐짐
- **WORKS** — 프로젝트 이미지가 splat 공간과 실제 화면 사이를 오감
- **CONTACT** — 움직임이 줄고 입자와 빛이 안정된 공간으로 정착

## 레이어 규약

전체 장면을 하나의 입자층으로 만들지 않는다. 여섯 레이어를 독립 구성한다.

```
L0  Chromatic Backdrop      유색 암부, 3+ 저주파 컬러 필드
L1  Spatial Image Field     이미지의 명암을 광원/밀집/공백으로 변환
L2  Volumetric Light        후경→전경 볼류메트릭 광원 2~3개
L3  Fog / Atmospheric       저주파 3D noise, 후경 색면·중경 산란·전경 안개
L4  Gaussian Splat Field    density field 기반 soft splat
L5  Foreground Drift        소수의 큰 splat, 원근감 전용
L6  DOM Text and Content    WebGL 밖, 뒤에 국소 암부 확보
```

### L2 Volumetric Light
파티클 자체 발광 금지. 후경에서 전경으로 퍼지는 광원 2~3개.
- 주광원: 공간 후방 → 전방 확산
- 측면광: splat 가장자리와 인물 실루엣 형성
- 보조 산란광: 전경의 깊이와 색감
- 광선은 레이저처럼 날카롭지 않고 **스모그를 통과할 때만** 형태가 드러남

### L4 Gaussian Splat Field
- 크기군 비율 — 미세 15~20% / 중형 55~65% / 대형 20~25%
  (현재처럼 미세 입자가 화면 대부분을 차지하면 안 됨)
- 분포는 균등 random 금지. density field로 제어:
  밀집 흐름 덩어리 3~5개 + 연결하는 중간 밀도 흐름 + 입자 없는 통로·음영
- 전체 화면 중 입자가 존재하는 비율 **45~65%**
- 큰 공간면이 먼저 보이고, 가까이 봤을 때 splat 집합임이 드러나야 함

### 파티클 재질
대부분 Alpha/Normal Blending. Additive는 광학 입자 10~15%에만.
기본적으로 낮은 채도·낮은 명도. 외부 광원에 닿을 때만 색이 드러남.

- 광원을 향한 splat → 입사광 색상 + 약한 표면광
- 광원의 측면 → 부드러운 림 라이트
- 광원을 등진 splat → 낮은 명도, 그림자 밀도
- 후경 splat → 낮은 대비·채도·선명도
- 전경 splat → 크지만 일부만 선명

**모든 입자가 동시에 네온처럼 빛나면 실패로 판정한다.**

## 인물·캐릭터 합성

파티클 위에 붙은 PNG처럼 보이면 실패다.
- 발밑 접지 음영
- 장면의 측면광과 일치하는 림 라이트
- 인물 **뒤쪽을 지나가는** splat + **앞쪽을 지나는** 소수의 낮은 밀도 splat
- 인물과 공간 사이의 중간 스모그
- 인물이 바라보는 방향으로 열리는 빛과 흐름
- 배경 광원 색이 인물 외곽에 약하게 반영
- 얼굴과 핵심 실루엣은 입자가 가리지 않게

## DOM 텍스트 (L6)

- 헤드라인·본문은 WebGL 안에 넣지 않는다 (DOM 유지)
- 텍스트 뒤에 국소 암부 확보
- 텍스트 전면에 밝은 입자 배치 금지
- 키워드 주변의 광원과 흐름만 반응
- 텍스트 자체를 포인터에 따라 흔들지 않음

## 관련 스킬

- 유체/포인터 물리 → `webgl-fluid-field`
- 스크린샷 검수와 합격 판정 → `visual-qa`
- Tier·폴백 → `performance-tier`
