---
name: webgl-fluid-field
description: R3F·GLSL·FBO 기반 포인터 유체장 구현 기준. 마우스/포인터 반응, velocity field, 파티클 운동, 셰이더 좌표 변형을 작성하거나 수정하기 전에 읽는다. "파티클이 커서를 따라온다", "공간이 통째로 흔들린다" 같은 증상의 진단 기준도 포함.
---

# WebGL Fluid Field

## 핵심 원칙

포인터는 **좌표를 옮기는 것이 아니라 속도장에 힘을 주입한다.**

커서 좌표를 입자 위치에 직접 더하거나, 커서 방향으로 공간면을 회전·기울이는
구현은 전부 폐기 대상이다. 그렇게 만들면 사용자가 마우스를 흔들 때 공간
전체가 고무판처럼 늘어나고, 이건 육안으로 즉시 티가 난다.

## 필수 파이프라인

```
raw pointer
  → normalized device coordinate
  → low-pass smoothing
  → pointer velocity
  → local force injection      ← 국소. 전역 아님
  → velocity field propagation
  → splat·fog·light의 서로 다른 지연 반응
  → damping
  → base flow 복귀
```

필요하면 Ping-pong FBO 또는 GPU Render Target 기반 velocity field를 구현한다.

### 힘 주입은 점이 아니라 선이다

포인터 힘을 **현재 좌표의 원형 반경에만** 적용하면 커서 주변에 원형 구멍이
생긴다. 직전 좌표와 현재 좌표 **사이의 이동 경로**에 넓게 주입해야 한다.
붓질, 또는 손으로 공기를 쓸어내는 느낌의 선형·곡선형 힘.

## 권장 초기값

```
pointer smoothing       0.025 ~ 0.05
velocity damping        0.965 ~ 0.985
pointer radius          화면 너비의 12 ~ 20%
local force             기존 직접반응의 20 ~ 35%
wake persistence        1.5 ~ 3.0초
base flow return        2.5 ~ 4.5초
maximum displacement    현재 구현의 30% 이하
```

## 레이어별 반응 지연

같은 속도로 반응하면 깊이가 사라진다. 반드시 어긋나게 한다.

```
미세 입자       0.10 ~ 0.20초
중형 splat      0.25 ~ 0.45초
대형 공간면     0.45 ~ 0.80초
스모그          0.35 ~ 0.65초
광원 방향       0.55 ~ 0.90초
```

스모그는 파티클과 **같은 velocity field**의 영향을 받되 더 느리게 움직인다.
별도로 따로 노는 스모그 오버레이는 금지.

## 실패 판정 — 마우스를 좌우로 빠르게 왕복했을 때

하나라도 나타나면 실패다.

- [ ] 공간면 전체가 통째로 좌우로 흔들림
- [ ] 입자 덩어리가 고무판처럼 늘어남
- [ ] 커서 주변에 원형 구멍이 발생
- [ ] 파티클이 즉시 방향을 반전
- [ ] 카메라와 모든 레이어가 같은 속도로 이동
- [ ] 인물과 텍스트까지 함께 흔들림

**성공 상태:** 이전 방향의 흐름이 남아 있는 동안 새로운 흐름이 부드럽게 섞여
작은 와류를 형성한다.

## 기하 구조 함정 (이 프로젝트에서 실제로 발생)

### 파티클 볼륨이 프러스텀보다 좁으면 중앙 덩어리가 된다

고정 크기 큐브(예: ±2.1)에 입자를 배치하면 화면비에 따라 좌우가 비어버린다.
`fov 55 / camera.z 3.5` 기준 mid-depth의 half-width는 약 3.9다.

볼륨 반경은 **카메라 프러스텀에서 유도**한다:

```ts
const halfH = Math.tan((fov * Math.PI/180) * 0.5) * (camera.position.z - Z_MID)
const span  = { x: halfH * camera.aspect * 1.05, y: halfH * 1.15 }
```

셰이더의 wrap도 하드코딩 상수(`fract(pos*0.25+0.5)*4.0-2.0`) 대신 span
uniform을 쓴다. 클러스터 좌표는 정규화(-1..1)해두고 span을 곱해 쓰면 어떤
화면비에서도 구도가 유지된다.

### wrap은 분포를 넓히지 않는다

이미 좁은 범위에 있는 값을 넓은 span으로 wrap해도 그대로 좁게 남는다.
분포를 넓히려면 **지오메트리 생성 시점**에 넓혀야 한다.

## 렌더링 체크리스트

- [ ] Geometry / Material이 레이어마다 분리돼 있는가
- [ ] 입자가 사각형으로 보이지 않는가 (Gaussian falloff 적용)
- [ ] Additive Blending이 전체가 아니라 10~15%로 제한돼 있는가
- [ ] 포인터가 영향을 주는 uniform이 국소 힘인가, 전역 좌표인가
- [ ] Canvas가 불필요하게 여러 개 생성되지 않는가
- [ ] 장면 프리셋이 실제로 분리돼 있는가 (색만 다른 게 아니라)

## 스택

이 프로젝트는 `three` + React 19 / Next 16이며 `@react-three/fiber`와
`@react-three/drei`가 이미 설치돼 있다. 새 렌더링 레이어는 명령형 Three.js
대신 R3F 컴포넌트로 작성해 레이어 분리를 강제하는 쪽을 우선 검토한다.

포스트프로세싱(Bloom 등)이 필요하면 `@react-three/postprocessing`을 추가해야
한다 — 현재 미설치다.

## 관련 스킬

- 색·구도·금지 문법 → `famoz-art-direction`
- 검수 절차 → `visual-qa`
- Tier·폴백 → `performance-tier`
