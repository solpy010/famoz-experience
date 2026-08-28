import type { Metadata } from 'next'

/**
 * /visual-lab은 배경 시스템 검수용 내부 페이지다.
 * 회사 소개 사이트의 일부가 아니므로 색인에서 제외한다.
 */
export const metadata: Metadata = {
  title: 'Visual Lab (internal)',
  robots: { index: false, follow: false, nocache: true },
}

export default function VisualLabLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
