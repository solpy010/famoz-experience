'use client'

/**
 * 라우트 단위 최후 방어선.
 *
 * 여기까지 온 예외는 이미 배경 경계를 넘어선 것이므로 페이지를 복구할 수는
 * 없다. 다만 흰 화면 대신 회사 정보와 다시 시도 수단은 남긴다.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24,
      background: 'radial-gradient(ellipse 120% 90% at 50% 45%, #24172D 0%, #13101A 70%, #08070C 100%)',
      color: '#EEE8DF', fontFamily: "'Pretendard', system-ui, sans-serif", textAlign: 'center',
    }}>
      <p style={{ letterSpacing: '.24em', fontSize: 12, color: '#8E7AA8' }}>FAMOZ VISUAL.LAB</p>
      <h1 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.9rem)', fontWeight: 600 }}>
        화면을 불러오지 못했습니다.
      </h1>
      <p style={{ color: '#9A948E', fontSize: 14, lineHeight: 1.8 }}>
        잠시 후 다시 시도해 주세요.<br />
        문의: <a href="mailto:famoz@famoz.co.kr" style={{ color: '#D8CDBD' }}>famoz@famoz.co.kr</a>
        {' · '}02-332-8148
      </p>
      <button
        onClick={reset}
        style={{
          marginTop: 8, padding: '10px 22px', fontSize: 14, cursor: 'pointer',
          color: '#EEE8DF', background: 'transparent',
          border: '1px solid rgba(238,232,223,.4)', borderRadius: 2,
        }}
      >
        다시 시도
      </button>
    </main>
  )
}
