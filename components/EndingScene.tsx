'use client'

const TEAMS = [
  '크리에이티브 기획팀',
  '미디어 디자인팀',
  '인터랙티브 개발팀',
  'AI 솔루션팀',
  '프로젝트 운영팀',
]

const PARTNERS = [
  'LG전자', '삼성 SDI', '현대자동차', 'SK그룹', 'APEC 2025',
  '롯데그룹', '세종문화회관', '국립중앙박물관', '경기도',
  '한국관광공사', '포항시', '한국수력원자력',
]

const CONTACT = [
  { label: '전화', value: '02-332-8148', href: 'tel:02-332-8148' },
  { label: '팩스', value: '02-332-8147', href: undefined },
  { label: '대표 이메일', value: 'famoz@famoz.co.kr', href: 'mailto:famoz@famoz.co.kr' },
  { label: '주소', value: '(04075) 서울시 마포구 토정로 121-1', href: undefined },
  { label: '웹사이트', value: 'www.famoz.co.kr', href: 'https://www.famoz.co.kr' },
]

/** 사업자 정보 — 푸터 고지 */
const BUSINESS = [
  '㈜파모즈',
  '대표 원정환',
  '2013년 6월 1일 설립',
  '사업자등록번호 211-88-95804',
]

export default function EndingScene() {
  const doubled = [...PARTNERS, ...PARTNERS]

  return (
    <section
      id="ending"
      style={{
        position: 'relative',
        overflow: 'hidden',
        // Warm transition: black → warm brown → warm ivory
        background: 'linear-gradient(180deg, #0a0a0a 0%, #0e0a07 35%, #130f09 65%, #1a1208 100%)',
        paddingBlock: 'var(--section-gap)',
      }}
    >
      {/* Far layer: deep warm glow — light accumulates as scroll progresses */}
      <div
        aria-hidden="true"
        className="px-far"
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 70% 50% at 50% 90%, rgba(200,160,64,0.07) 0%, transparent 65%),
            radial-gradient(ellipse 40% 40% at 20% 30%, rgba(180,100,50,0.05) 0%, transparent 60%)
          `,
          animation: 'warm-glow 8s ease-in-out infinite',
        }}
      />
      {/* Mid layer: warm amber bleed */}
      <div
        aria-hidden="true"
        className="px-mid"
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 55% 40% at 75% 60%, rgba(232,149,90,0.04) 0%, transparent 70%)',
        }}
      />

      <div className="shell" style={{ position: 'relative', zIndex: 2 }}>

        {/* Trust statement + year */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'clamp(2rem, 4vw, 3.5rem)', alignItems: 'end', marginBottom: 'clamp(2rem, 4vw, 3.5rem)' }}>
          <div style={{ maxWidth: 'var(--copy-max)' }}>
            <p data-reveal className="t-label" style={{ color: 'var(--text-muted)', marginBottom: 'clamp(1.25rem, 2.5vh, 2rem)' }}>
              TRUST + TEAM + CONTACT
            </p>
            <h2 data-reveal className="t-scene" style={{ marginBottom: 'clamp(1rem, 2vh, 1.75rem)', transitionDelay: '0.1s' }}>
              공간 위에 <span className="kw-light is-visible">축적된 경험</span>이
              <br />
              <span style={{ color: 'rgba(237,232,224,0.38)' }}>
                새로운 가능성을
                <br />
                만듭니다.
              </span>
            </h2>
          </div>
          <div
            aria-label="2013년부터"
            style={{
              fontSize: 'clamp(5rem, 18vw, 18rem)', fontWeight: 900,
              letterSpacing: '-0.05em', lineHeight: 0.9,
              color: 'rgba(255,255,255,0.04)', textAlign: 'right', userSelect: 'none',
            }}
          >
            2013
          </div>
        </div>

        {/* Stats — grouped reveal */}
        <div
          data-reveal
          style={{
            display: 'flex', gap: 'clamp(1.5rem, 4vw, 4rem)', flexWrap: 'wrap',
            borderTop: '1px solid var(--border)',
            paddingTop: 'clamp(2rem, 4vw, 3.5rem)', marginTop: 'clamp(2rem, 4vw, 3.5rem)',
          }}
        >
          {[
            { num: '12년', desc: '공간 경험 축적' },
            { num: '200+', desc: '완성한 공간 프로젝트' },
            { num: '5', desc: '전문 팀' },
          ].map((stat) => (
            <div key={stat.desc} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span style={{ fontSize: 'clamp(1.75rem, 3vw, 2.8rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>
                {stat.num}
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{stat.desc}</span>
            </div>
          ))}
        </div>

        {/* Partner marquee */}
        <div style={{ marginTop: 'clamp(3rem, 6vw, 5rem)', borderTop: '1px solid var(--border)', paddingTop: 'clamp(2rem, 4vw, 3rem)', overflow: 'hidden' }}>
          <p className="t-label" style={{ marginBottom: '1.5rem' }}>함께한 파트너</p>
          <div aria-hidden="true" data-reveal style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', width: 'max-content', animation: 'marquee 30s linear infinite', gap: 'clamp(2.5rem, 6vw, 6rem)' }}>
              {doubled.map((p, i) => (
                <span
                  key={i}
                  style={{ fontSize: 'clamp(0.8rem, 1.1vw, 1rem)', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap', transition: 'color 0.3s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-sub)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Team — grouped container reveal */}
        <div style={{ marginTop: 'clamp(3rem, 6vw, 5rem)' }}>
          <h3 style={{ fontSize: 'clamp(0.9rem, 1.2vw, 1rem)', fontWeight: 700 }}>팀</h3>
          <div
            data-reveal
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
              gap: 0, borderTop: '1px solid var(--border)',
              marginTop: 'clamp(1rem, 2vw, 1.5rem)',
            }}
          >
            {TEAMS.map((name, i) => (
              <div
                key={name}
                style={{
                  padding: 'clamp(1.1rem, 2vw, 1.6rem) 0',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'baseline', gap: '1rem',
                }}
              >
                <span style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ fontSize: 'clamp(0.9rem, 1.15vw, 1.05rem)', fontWeight: 700, color: 'var(--text-sub)' }}>
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact — grouped container reveal */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 'clamp(3rem, 6vw, 5rem)', paddingTop: 'clamp(2.5rem, 5vw, 4rem)' }}>
          <h3 style={{ fontSize: 'clamp(0.9rem, 1.2vw, 1rem)', fontWeight: 700, marginBottom: 'clamp(1.5rem, 3vw, 2.5rem)' }}>연락처</h3>
          <div
            data-reveal
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
              gap: 'clamp(0rem, 2vw, 2rem)',
            }}
          >
            {CONTACT.map((row) => (
              <div
                key={row.label}
                style={{ display: 'flex', gap: 'clamp(1rem, 3vw, 2.5rem)', padding: '0.9rem 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start', flexWrap: 'wrap' }}
              >
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', minWidth: '5rem', flexShrink: 0, paddingTop: '0.1rem' }}>
                  {row.label}
                </span>
                {row.href ? (
                  <a
                    href={row.href}
                    target={row.href.startsWith('http') ? '_blank' : undefined}
                    rel={row.href.startsWith('http') ? 'noopener' : undefined}
                    style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', textDecoration: 'none', transition: 'color 0.25s', wordBreak: 'break-all' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ac-magenta)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text)')}
                  >
                    {row.value}
                  </a>
                ) : (
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{row.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'clamp(1.5rem, 3vw, 2.5rem)', marginTop: 'clamp(3rem, 6vw, 5rem)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <a href="#" style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', textDecoration: 'none' }}>
            <span style={{ fontSize: 'clamp(0.9rem, 1.8vw, 1.2rem)', fontWeight: 900, color: 'var(--text)' }}>FAMOZ</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ac-magenta)', textTransform: 'uppercase' }}>VISUAL.LAB</span>
          </a>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
            <div style={{
              display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end',
              gap: '0.35rem 0.9rem', fontSize: '0.74rem', color: 'var(--text-muted)',
            }}>
              {BUSINESS.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>&copy; 2025 FAMOZ Co., Ltd. All rights reserved.</span>
          </div>
        </div>

      </div>
    </section>
  )
}
