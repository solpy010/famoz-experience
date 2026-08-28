import type { MetadataRoute } from 'next'
import { SITE_URL, IS_PUBLIC } from './layout'

/**
 * 도메인 확정 전(임시 URL)에는 전체를 막는다.
 * 확정 후에는 디버그 페이지만 제외한다.
 */
export default function robots(): MetadataRoute.Robots {
  if (!IS_PUBLIC) {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/visual-lab'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
