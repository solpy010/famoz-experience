---
name: performance-tier
description: PC·모바일·reduced-motion 성능 Tier와 폴백 기준. 파티클 수를 바꾸거나, 새 렌더 패스·포스트프로세싱을 추가하거나, 모바일 동작을 다룰 때 읽는다.
---

# Performance Tier

## Tier 판정

`components/sceneStore.ts`의 `detectTier()`가 단일 판정 지점이다.
새 판정 로직을 다른 곳에 중복 작성하지 않는다.

```
tier 0  reduced-motion  → WebGL 자체를 마운트하지 않음
tier 1  모바일          → 최소 구성
tier 2  코어 4~7        → 중간
tier 3  코어 8+         → 전체
```

`navigator.hardwareConcurrency`는 GPU 성능의 대리 지표일 뿐이다. 코어가 많아도
내장 GPU일 수 있다. 정점 비용이 큰 변경을 넣을 때는 코어 수를 믿지 말고 실제
프레임을 확인한다 (`visual-qa` 스킬).

## Tier별 예산

| | micro | medium | large | DPR |
|---|---|---|---|---|
| tier 3 | 28,000 | 82,000 | 15,000 | min(dpr, 1.5) |
| tier 2 | 14,000 | 42,000 | 8,000 | min(dpr, 1.0) |
| tier 1 | 4,500 | 15,000 | 2,600 | min(dpr, 1.0) |
| tier 0 | — | — | — | 렌더 없음 |

수치는 16:9 기준이며 화면비로 보정한다:
`k = clamp(aspect / 1.78, 0.85, 1.5)`

## 비용 구조 — 어디서 느려지는가

이 파티클 시스템은 **정점 비용이 지배적**이다. 프래그먼트가 아니다.

- `curlNoise()`는 내부에서 `snoise()`를 **12회** 호출한다.
- medium 82,000개 × 12 = 프레임당 약 100만 회 simplex 평가.
- 반면 fill rate는 여유롭다: large 15,000개 × 평균 18px² ≈ 490만 프래그먼트.

따라서:

- **파티클 수를 늘리는 변경은 곧 정점 셰이더 비용 증가다.** 크기·알파를 키우는
  변경보다 훨씬 비싸다.
- `curlNoise` 호출을 정점당 2회 이상으로 늘리지 않는다.
- 정말 필요하면 curl을 프레임마다 계산하지 말고 FBO에 캐시하는 쪽을 검토한다.

## reduced-motion (tier 0)

`prefers-reduced-motion: reduce`면 WebGL을 **마운트하지 않는다.**
파티클을 느리게 만드는 것으로 대체하지 않는다.

단, 이 경우에도 화면이 검게 비면 안 된다. L0 유색 암부 배경(CSS)은 그대로
남아 있어야 하고, 정지 상태로도 구도가 성립해야 한다.

## 새 렌더 패스를 추가할 때

포스트프로세싱(Bloom 등)은 현재 미설치이며(`@react-three/postprocessing`),
추가 시 전체 화면 패스가 늘어난다.

- tier 1(모바일)에서는 기본적으로 끈다.
- `render scale` / `DPR`을 파라미터 패널에 노출해 실측 후 고정한다.
- Bloom을 "밝기가 부족해서" 켜지 않는다. 그건 조명 설계 실패를 덮는 것이다
  (`famoz-art-direction` 참조).

## 체크리스트

- [ ] `detectTier()` 외의 곳에서 성능 분기를 만들지 않았는가
- [ ] tier 1에서 정점 수와 렌더 패스가 실제로 줄어드는가
- [ ] tier 0에서 캔버스가 아예 생성되지 않는가
- [ ] tier 0 상태의 정지 화면이 여전히 완성돼 보이는가
- [ ] 실제 GPU에서 프레임을 확인했는가 (swiftshader 측정치는 무효)

## 관련 스킬

- 실측 절차 → `visual-qa`
- 정점 비용의 출처 → `webgl-fluid-field`
