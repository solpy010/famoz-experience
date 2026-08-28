# 배포 안내

## 현재 상태

| 항목 | 값 |
|---|---|
| 호스팅 | Vercel |
| 배포 URL | https://famoz-landing.vercel.app |
| 배포 방식 | `vercel deploy --temporary` (**미청구 임시 배포**) |
| 검색 색인 | **차단됨** (의도된 상태) |
| 브랜치 | `integration/hero-visual-system` |

임시 배포는 아직 어떤 계정에도 속해 있지 않습니다. 아래 1번을 해야 소유권이 넘어갑니다.

---

## 1. 배포를 계정으로 가져오기 (claim)

로컬에서:

```bash
npx vercel login
```

로그인 후 Vercel 대시보드에서 `famoz-landing` 프로젝트를 확인합니다.
임시 배포는 **일정 기간이 지나면 사라지므로**, 계속 쓰려면 GitHub 저장소를
연결해 정식 프로젝트로 만드는 편이 안전합니다.

권장: <https://vercel.com/new> 에서 `solpy010/famoz-experience` 저장소를 Import
→ Production Branch를 `integration/hero-visual-system`(또는 병합 후 `master`)로 지정.
이렇게 하면 push할 때마다 자동 배포되고 PR마다 미리보기 URL이 생깁니다.

---

## 2. 도메인 연결 (준비되면)

지금은 검색 엔진이 이 사이트를 **의도적으로 차단**하고 있습니다.
임시 URL이 색인되면 나중에 `www.famoz.co.kr`과 같은 내용으로 경쟁하기 때문입니다.

도메인을 붙일 때 할 일은 **환경변수 하나**입니다.

1. Vercel 프로젝트 → Settings → Domains 에서 도메인 추가
2. Settings → Environment Variables 에 추가:

   ```
   NEXT_PUBLIC_SITE_URL = https://www.famoz.co.kr
   ```

3. 재배포

이 변수가 설정되는 순간 canonical·Open Graph·`sitemap.xml`이 실제 도메인으로
바뀌고 색인이 함께 열립니다. 코드 수정은 필요 없습니다.
(동작은 `app/layout.tsx`의 `SITE_URL` / `IS_PUBLIC` 참조)

> `www.famoz.co.kr`에 기존 사이트가 운영 중이라면 DNS를 바꾸기 전에 반드시
> 기존 사이트를 백업하십시오.

---

## 3. 공개 전 남은 작업

- [ ] **OG 이미지** — 지금은 `/works/immersive-01.png`를 임시로 씁니다.
      1200×630 전용 이미지로 교체 (`app/layout.tsx`의 `openGraph.images`)
- [ ] **favicon** — `app/favicon.ico`가 create-next-app 기본값일 수 있습니다. 확인 후 교체
- [ ] **`/visual-lab`** — 내부 검수용 페이지입니다. 색인은 막혀 있지만 URL을 알면
      접근 가능합니다. 완전히 감추려면 라우트를 삭제하거나 프로덕션 빌드에서 제외
- [ ] **실제 GPU 성능 측정** — `npm run dev` 후 우하단 `START 10S GPU TEST`
      (프로덕션 빌드에서는 오버레이가 나오지 않습니다)
- [ ] **나머지 5개 장면** — Hero만 새 비주얼 시스템으로 이식됐습니다

---

## 명령어

```bash
npm run dev     # 개발 서버 (성능 오버레이 포함)
npm run build   # 프로덕션 빌드 검증
npx vercel      # 미리보기 배포
npx vercel --prod  # 프로덕션 배포
```

lint 스크립트와 테스트 스위트는 아직 이 프로젝트에 없습니다.
타입 검사는 `npm run build`에 포함되어 있습니다.
