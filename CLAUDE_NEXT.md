# Claude 작업 인수인계 — OZ 구조 개발 단계

기준일: 2026-09-03  
작업 브랜치: `fix/hero-canvas-clear`

## 1. 반드시 먼저 읽을 문서

다음 순서를 지킨다.

1. `AUDIT.md`
2. `HANDOFF.md`
3. `.claude/skills/famoz-art-direction/SKILL.md`
4. `.claude/skills/webgl-fluid-field/SKILL.md`
5. `.claude/skills/performance-tier/SKILL.md`
6. `.claude/skills/visual-qa/SKILL.md`
7. `RESOURCE_REQUEST.md`
8. `content/experienceManifest.ts`

## 2. 현재 완료된 구조

- 전체 페이지는 기존 `VisualSystemCanvas` 하나를 공유한다.
- Hero 이후 `OzPortalHub`가 추가됐다.
- OZ 허브에서 Dorothy, ScareMuse, RoarLink, TinAI 장면으로 이동할 수 있다.
- `ChapterNavigation`이 Portal부터 Contact까지 전체 여정을 연결한다.
- 모바일에서는 챕터 내비게이션이 하단 레일로 바뀐다.
- `MascotScene` 내부에 캐릭터별 실제 스크롤 앵커가 있다.
- 캐릭터 역할과 카피를 세계관 설정에 맞게 교정했다.
- Intro, Portal, 캐릭터, Works, Contact에 `data-resource-slot` 계약이 적용됐다.
- `/resource-guide`에서 필요한 영상·이미지 규격과 전달 순서를 확인할 수 있다.
- 실제 자산은 아직 연결하지 않았다. 기존 이미지가 레이아웃 폴백이다.

## 3. 구조의 단일 소스

`content/experienceManifest.ts`를 캐릭터·챕터·자산 슬롯의 단일 소스로 사용한다.

- 새 캐릭터명이나 역할을 컴포넌트에 다시 하드코딩하지 않는다.
- 자산 파일이 도착하면 기존 슬롯 ID를 바꾸지 않는다.
- 파일 경로와 상태만 manifest에 추가한다.
- 홈페이지와 `/resource-guide`가 같은 manifest를 읽도록 유지한다.

## 4. Claude가 우선 처리해도 되는 개발 작업

디자인 판단이 거의 필요 없는 아래 항목부터 처리한다.

### P1. 자산 슬롯 로더

- manifest에 `desktopSrc`, `mobileSrc`, `posterSrc` 선택 필드 추가
- 현재 자산이 없으면 기존 이미지 또는 CSS 공간을 유지
- `<video preload="none" muted playsInline>` 기본 계약
- 현재 장면과 다음 장면만 preload
- 로드 실패 시 poster 또는 기존 이미지로 복귀

### P1. 자산 검증 스크립트

- manifest에 경로가 등록된 파일의 존재 여부 확인
- 영상·이미지의 해상도, 용량, 확장자 검사
- `RESOURCE_REQUEST.md` 기준을 벗어나면 오류가 아니라 명확한 경고 출력
- 원본 자산을 자동 재인코딩하거나 덮어쓰지 않음

### P1. 내비게이션 안정화

- 키보드 포커스와 `aria-current` 확인
- 해시 직접 진입 시 올바른 장면으로 이동
- 브라우저 뒤로가기 시 장면 상태 동기화
- 모바일 하단 레일이 Contact·CTA를 가리지 않도록 safe-area 확인
- 기존 `scrollBus` 외에 새 전역 스크롤 리스너를 만들지 않음

### P2. 콘텐츠 중복 제거

- `MascotScene`의 장면 카피를 manifest에서 읽도록 통합
- Works 데이터는 별도 유지하되 연결용 chapter ID만 manifest와 맞춤
- 기존 What/Value/Public 섹션의 카피를 임의로 삭제하지 않음

### P2. 테스트 가능한 빈 상태

- 실제 영상이 없을 때 콘솔 오류와 404가 없어야 함
- WebGL이 없을 때 OZ 허브와 모든 텍스트가 읽혀야 함
- `prefers-reduced-motion`에서는 영상 대신 poster 슬롯 사용
- 빈 슬롯 안내 문구는 일반 방문자 화면에 노출하지 않음

## 5. 이번 단계에서 하지 말아야 할 작업

- 새 Canvas 또는 별도 Three.js renderer 추가
- 파티클 수·셰이더·포인터 물리 변경
- WebGL 장면의 색상·광원·밀도 재조정
- OZ 허브를 게임 선택 화면처럼 과도하게 장식
- 실제 자산이 없는데 임시 생성형 영상을 최종 자산처럼 연결
- 기존 Works 이미지와 회사 정보를 삭제하거나 축약
- `public/works/expo-03.png`를 다시 압축하거나 원본으로 되돌림
- main/master 브랜치에 직접 커밋

## 6. 자산 도착 후 연결 순서

1. `intro-scroll-desktop.mp4`
2. `intro-scroll-mobile.mp4`
3. `oz-portal-desktop.webp`
4. `oz-portal-mobile.webp`
5. Dorothy 배경과 캐릭터
6. 나머지 캐릭터 3종
7. 역량별 전환 영상과 poster
8. Contact 풀백 영상

첫 네 파일을 연결한 뒤 다음 항목을 검증하기 전에는 나머지 영상을 한꺼번에 넣지 않는다.

- 첫 로드 용량
- 스크롤 영상 프레임 인계
- 영상 마지막 프레임과 WebGL 공간의 연결
- 모바일 크롭
- reduced-motion 폴백
- 실제 GPU 포인터 성능

## 7. 검증 명령과 완료 조건

```bash
npm install
npm run build
```

현재 프로젝트에는 별도 lint·테스트 스크립트가 없으며 `npm run build`가 TypeScript
검사를 포함한다.

코드가 통과했다는 이유만으로 디자인이 완료됐다고 보고하지 않는다. 화면 변경이
있는 작업은 `.claude/skills/visual-qa/SKILL.md`에 따라 WebGL과 WebGL 비활성 환경을
각각 확인한다. SwiftShader FPS는 성능 근거로 사용하지 않는다.

## 8. 현재 주의사항

- `app/page.tsx`는 Client Component이며 `PointerField`와 `JourneyState` 인스턴스를 소유한다.
- `VisualSystemCanvas`의 effect dependency에 인라인 콜백을 넣으면 WebGL 장면이 재생성될 수 있다.
- 캐릭터별 앵커는 긴 sticky 섹션 내부의 실제 진행 위치를 가리킨다.
- Portal은 JourneyState의 새 WebGL 프리셋을 만들지 않고 Hero→Mascot 사이의 기존 공간을 사용한다.
- 실제 영상 연결 전까지 Portal의 중앙 윤곽은 공간 위치를 확인하는 임시 구조선이다.

## 9. 다음 디자인 단계로 돌려보낼 조건

아래까지 완료되면 디자인·영상 합성 작업을 위해 다시 검토 요청한다.

- 자산 슬롯 로더와 폴백 완료
- 내비게이션 해시·키보드·모바일 동작 완료
- 빈 슬롯 상태에서 404·콘솔 오류 없음
- 빌드 통과
- 변경 파일과 남은 TODO가 이 문서에 갱신됨

파티클 미술, 영상 합성 강도, 캐릭터 크기, OZ 입구의 최종 구도는 Claude가 임의로
완성 판정하지 않고 다음 디자인 검토 단계에 남긴다.
