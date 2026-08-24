import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FAMOZ VISUAL.LAB — 상상을 살아있는 공간 경험으로 디자인합니다",
  description: "콘텐츠·미디어·AI를 연결해 사람에게 반응하고 이야기를 이어가는 공간을 만듭니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
