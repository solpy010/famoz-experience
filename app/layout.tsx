import type { Metadata } from "next";
import "./globals.css";

/**
 * 회사 소개 홈페이지용 메타데이터.
 *
 * 도메인 확정 전에는 Vercel이 준 임시 URL로 배포된다. 그 임시 URL이 검색에
 * 색인되면 나중에 실제 도메인과 중복 콘텐츠로 경쟁하므로,
 * NEXT_PUBLIC_SITE_URL이 설정되기 전까지는 noindex로 둔다.
 *
 * 도메인을 붙일 때 할 일은 하나다:
 *   Vercel 프로젝트 환경변수에 NEXT_PUBLIC_SITE_URL=https://www.famoz.co.kr 추가
 * 그러면 canonical·OG·사이트맵이 실제 도메인으로 맞춰지고 색인이 열린다.
 */
const CONFIGURED_URL = process.env.NEXT_PUBLIC_SITE_URL;
const VERCEL_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const SITE_URL =
  CONFIGURED_URL ??
  (VERCEL_URL ? `https://${VERCEL_URL}` : "http://localhost:3000");

/** 실제 도메인이 지정된 경우에만 검색 색인을 허용한다. */
export const IS_PUBLIC = Boolean(CONFIGURED_URL);

const TITLE = "FAMOZ VISUAL.LAB — 상상을 살아있는 공간 경험으로 디자인합니다";
const DESCRIPTION =
  "㈜파모즈는 콘텐츠·미디어·AI를 연결해 사람에게 반응하고 이야기를 이어가는 공간을 만듭니다. 전시·공공·미디어 공간 경험 디자인 스튜디오.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s | FAMOZ VISUAL.LAB" },
  description: DESCRIPTION,
  applicationName: "FAMOZ VISUAL.LAB",
  keywords: [
    "파모즈", "FAMOZ", "공간 경험 디자인", "전시 디자인", "미디어아트",
    "인터랙티브 미디어", "공공 공간", "체험 전시",
  ],
  authors: [{ name: "㈜파모즈", url: SITE_URL }],
  creator: "㈜파모즈",
  publisher: "㈜파모즈",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "FAMOZ VISUAL.LAB",
    title: TITLE,
    description: DESCRIPTION,
    // TODO: 전용 OG 이미지(1200×630)로 교체. 지금은 실제 프로젝트 이미지를 임시 사용.
    images: [{ url: "/works/immersive-01.png", width: 1200, height: 630, alt: "FAMOZ VISUAL.LAB" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/works/immersive-01.png"],
  },
  robots: IS_PUBLIC
    ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } }
    : { index: false, follow: false, nocache: true },
  formatDetection: { telephone: false, address: false, email: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* 외부 폰트 CDN — 연결을 미리 열어 첫 렌더의 폰트 지연을 줄인다 */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css"
        />
        {/* 검색 결과에 회사 정보가 정확히 노출되도록 하는 구조화 데이터 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "㈜파모즈",
              alternateName: "FAMOZ VISUAL.LAB",
              url: SITE_URL,
              description: DESCRIPTION,
              foundingDate: "2013-06-01",
              email: "famoz@famoz.co.kr",
              telephone: "+82-2-332-8148",
              faxNumber: "+82-2-332-8147",
              address: {
                "@type": "PostalAddress",
                streetAddress: "토정로 121-1",
                addressLocality: "마포구",
                addressRegion: "서울",
                postalCode: "04075",
                addressCountry: "KR",
              },
              founder: { "@type": "Person", name: "원정환" },
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
