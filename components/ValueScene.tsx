'use client'

const VALUE_ITEMS = [
  { text: '이해하기 쉬워집니다', sub: '복잡한 정보가 감각으로 전달됩니다', accentColor: 'rgba(232,149,90,0.4)', highlight: true },
  { text: '직접 참여하게 됩니다', sub: '관람에서 경험의 주체로 바뀝니다', accentColor: 'rgba(82,191,255,0.4)', highlight: false },
  { text: '공간과 연결됩니다', sub: '장소가 관계로 기억됩니다', accentColor: 'rgba(61,201,146,0.4)', highlight: false },
  { text: '오래 기억하게 됩니다', sub: '경험은 의미로 전환됩니다', accentColor: 'rgba(192,122,181,0.4)', highlight: true },
]

export default function ValueScene() {
  return (
    <section
      id="value"
      style={{
        position: 'relative', overflow: 'hidden',
        background: 'var(--black)', paddingBlock: 'var(--section-gap)',
        minHeight: '140svh', display: 'flex', alignItems: 'center',
      }}
    >
      {/* Far layer */}
      <div
        aria-hidden="true"
        className="px-far"
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 60% at 35% 55%, #140a20 0%, var(--black) 60%)',
        }}
      />
      {/* Mid layer — action point lights */}
      <div
        aria-hidden="true"
        className="px-mid"
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 30% 30% at 15% 30%, rgba(232,149,90,0.07) 0%, transparent 70%), radial-gradient(ellipse 25% 25% at 80% 75%, rgba(192,122,181,0.07) 0%, transparent 70%)',
          animation: 'warm-glow 6s ease-in-out infinite',
        }}
      />

      <div className="shell" style={{ position: 'relative', zIndex: 2, width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'clamp(3rem, 6vw, 5rem)', alignItems: 'start' }}>
          {/* Headline */}
          <div style={{ maxWidth: '16ch' }} data-reveal>
            <p className="t-label" style={{ color: 'var(--ac-orange)', marginBottom: 'clamp(1.25rem, 2.5vh, 2rem)' }}>
              VALUE
            </p>
            <h2 className="t-scene">
              공간은 사람을 움직이고
              <br />
              <span style={{ color: 'rgba(237,232,224,0.4)' }}>
                참여는 기억으로
                <br />
                남습니다.
              </span>
            </h2>
          </div>

          {/* Keywords — with staggered reveals and light-pass on highlights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2rem, 4vw, 3.5rem)' }}>
            {VALUE_ITEMS.map((kw, i) => (
              <div
                key={i}
                data-reveal
                style={{
                  borderLeft: `2px solid ${kw.accentColor}`,
                  paddingLeft: '1.5rem',
                  transitionDelay: `${i * 0.15}s`,
                }}
              >
                <p
                  className={`t-keyword${kw.highlight ? ' kw-light is-visible' : ''}`}
                  style={{ color: kw.highlight ? undefined : 'var(--text)', marginBottom: '0.4rem' }}
                >
                  {kw.text}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{kw.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
