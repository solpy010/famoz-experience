# FAMOZ VISUAL.LAB

㈜파모즈 회사 소개 랜딩페이지. 전시·공공·미디어 공간 경험을 다루는 스튜디오의
공간감을 WebGL 배경으로 구현한다.

**작업을 이어받는다면 [HANDOFF.md](./HANDOFF.md) 를 먼저 읽으십시오.**
코드만 봐서는 알 수 없는 미술 판정 기준과 셰이더 함정이 정리돼 있습니다.

## 시작

```bash
git checkout integration/hero-visual-system   # 최신 브랜치. master는 뒤처져 있음
npm install
npm run dev        # http://localhost:3001
```

| 명령 | 용도 |
|---|---|
| `npm run dev` | 개발 서버 (우하단에 성능 오버레이 표시) |
| `npm run build` | 프로덕션 빌드 + 타입 검사 |
| `npm start` | 빌드 결과 실행 |

lint 스크립트와 테스트 스위트는 아직 없습니다.

## 라우트

- `/` — 회사 소개 (6개 장면)
- `/visual-lab` — 배경 시스템 검수용 내부 페이지. Leva 디버그 패널과 레이어별
  분리 뷰를 제공하며 검색 색인에서 제외됨

## 기술

Next.js 16 (App Router) · React 19 · Three.js 0.185 · TypeScript

배경은 CSS 유색 암부(L0) 위에 WebGL 캔버스 **하나**가 공간면(L1) · 방향성
광원(L2) · 시트 종속 파티클(L3)을 그리는 구조입니다. 타이포와 이미지는 항상
그 위에 오며, 콘텐츠 영역에서는 마스크가 입자를 억제해 가독성을 지킵니다.

자세한 구조와 레이어 계약은 [HANDOFF.md](./HANDOFF.md), 미술 기준은
`.claude/skills/famoz-art-direction/SKILL.md` 를 참조하십시오.

## 배포

Vercel. 현재 임시 배포 상태이며 도메인 연결 절차는 [DEPLOY.md](./DEPLOY.md) 참조.
