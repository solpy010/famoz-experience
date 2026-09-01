'use client'

const signs = [
  { id: 'A-01', text: '복잡한 정보의\n직관적 전달' },
  { id: 'A-02', text: '문화와 지역 이야기에\n대한 접근성 확대' },
  { id: 'A-03', text: '연령과 언어를 넘어서는\n참여 경험' },
  { id: 'A-04', text: '공공 공간의\n이용 편의와 안내 개선' },
  { id: 'A-05', text: '방문과 체류, 재참여를\n만드는 장소의 활력' },
]

export default function PublicValue() {
  return (
    <section
      id="public"
      style={{
        position: 'relative', overflow: 'hidden',
        background: 'transparent', paddingBlock: 'var(--section-gap)',
        minHeight: '100dvh', display: 'flex', alignItems: 'center',
      }}
    >
      {/* Far layer: base dark gradient */}
      <div
        aria-hidden="true"
        className="px-far"
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 58% 66% at 72% 38%, rgba(25,105,190,.19) 0%, transparent 66%),
            radial-gradient(ellipse 50% 58% at 28% 72%, rgba(99,69,193,.12) 0%, transparent 64%)
          `,
        }}
      />

      {/* Mid layer: network light nodes expanding */}
      <div
        aria-hidden="true"
        className="px-mid"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
      >
        {/* SVG network lines */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12 }}
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1000 700"
        >
          <g stroke="rgba(82,191,255,1)" strokeWidth="0.5" fill="none">
            <line x1="150" y1="120" x2="380" y2="280" />
            <line x1="380" y1="280" x2="620" y2="180" />
            <line x1="620" y1="180" x2="820" y2="350" />
            <line x1="380" y1="280" x2="500" y2="480" />
            <line x1="500" y1="480" x2="720" y2="530" />
            <line x1="620" y1="180" x2="500" y2="480" />
          </g>
          {[
            [150,120],[380,280],[620,180],[820,350],[500,480],[720,530],
          ].map(([x,y],i) => (
            <circle
              key={i}
              cx={x} cy={y} r="4"
              fill="rgba(82,191,255,0.6)"
              style={{ animation: `network-expand ${2 + i * 0.4}s ease-out ${i * 0.3}s infinite` }}
            />
          ))}
        </svg>
      </div>

      {/* Near layer: ambient character */}
      <div
        aria-hidden="true"
        className="px-near"
        style={{
          position: 'absolute',
          fontSize: 'clamp(14rem, 30vw, 28rem)', fontWeight: 900,
          color: 'rgba(255,255,255,0.012)', letterSpacing: '-0.05em', lineHeight: 1,
          right: '-2%', bottom: '-5%', pointerEvents: 'none', userSelect: 'none', zIndex: 'var(--z-haze)',
        }}
      >
        ∞
      </div>

      <div className="shell" data-guard style={{ position: 'relative', zIndex: 'var(--z-content)', width: '100%' }}>
        <div style={{ maxWidth: 'var(--copy-max)' }}>
          <p data-reveal className="t-label" style={{ color: 'var(--ac-cyan)', marginBottom: 'clamp(1.25rem, 2.5vh, 2rem)' }}>
            PUBLIC VALUE
          </p>
          <h2 data-reveal className="t-scene" style={{ marginBottom: 'clamp(1rem, 2vh, 1.75rem)' }}>
            더 많은 사람이
            <br />
            <span className="grd-cyan kw-light is-visible">이해하고 참여하고 연결되는</span>
            <br />
            경험을 만듭니다.
          </h2>
          <p data-reveal className="t-body" style={{ maxWidth: '42ch', transitionDelay: '0.15s' }}>
            화려한 감상 장치를 넘어 사람과 정보,
            <br />
            문화와 장소를 연결합니다.
          </p>
        </div>

        {/* Wayfinding sign grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))',
            gap: '0',
            marginTop: 'clamp(3rem, 6vw, 5rem)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {signs.map((sign, i) => (
            <div
              key={sign.id}
              data-reveal
              style={{
                padding: 'clamp(1.25rem, 2vw, 2rem) clamp(1rem, 1.5vw, 1.5rem)',
                borderTop: '1px solid var(--border)',
                borderRight: i < signs.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'border-color 0.4s',
                transitionDelay: `${i * 0.1}s`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(82,191,255,0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
                {sign.id}
              </p>
              <p style={{ fontSize: 'clamp(0.92rem, 1.3vw, 1.15rem)', fontWeight: 700, lineHeight: 1.4, color: 'var(--text)', whiteSpace: 'pre-line' }}>
                {sign.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
