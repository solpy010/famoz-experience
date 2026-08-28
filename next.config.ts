import type { NextConfig } from "next";

/**
 * Vercel 배포용 설정.
 *
 * 정적 export(output: 'export')는 쓰지 않는다. Vercel은 Next를 네이티브로
 * 실행하므로 export 없이 그대로 배포되고, 나중에 서버 기능(폼 전송, OG 이미지
 * 생성 등)을 추가할 때 설정을 되돌릴 필요가 없다.
 */
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
