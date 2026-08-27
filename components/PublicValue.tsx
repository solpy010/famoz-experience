'use client'
import { useRef, useEffect, useState } from 'react'

// Spatial distributed positions — each value occupies a unique zone
// rather than a table/grid, per report spec
const VALUES = [
  {
    id: '01',
    title: '복잡한 정보의 직관적 전달',
    sub: '어려운 내용이 공간에서 감각으로 닿습니다',
    pos: { left: '6%', top: '14%' },
    delay: 0,
    accentRgb: '82,191,255',
    nodePos: { left: '14%', top: '22%' },
  },
  {
    id: '02',
    title: '문화와 지역 이야기에 대한 접근성',
    sub: '더 많은 사람이 더 깊이 이해합니다',
    pos: { right: '8%', top: '18%' },
    delay: 0.15,
    accentRgb: '61,201,146',
    nodePos: { right: '16%', top: '26%' },
  },
  {
    id: '03',
    title: '모두가 참여할 수 있는 공공 경험',
    sub: '배경과 능력에 관계없이 함께 참여합니다',
    pos: { left: '3%', top: '48%' },
    delay: 0.30,
    accentRgb: '192,122,181',
    nodePos: { left: '12%', top: '54%' },
  },
  {
    id: '04',
    title: '공간이 남기는 사회적 기억',
    sub: '장소가 공동체의 이야기로 축적됩니다',
    pos: { right: '5%', top: '52%' },
    delay: 0.45,
    accentRgb: '232,149,90',
    nodePos: { right: '13%', top: '58%' },
  },
  {
    id: '05',
    title: '지속 가능한 공공 인프라로서의 미디어',
    sub: '콘텐츠와 기술이 장소와 함께 성장합니다',
    pos: { left: '25%', bottom: '10%' },
    delay: 0.60,
    accentRgb: '200,160,64',
    nodePos: { left: '30%', bottom: '18%' },
  },
]

// SVG connection lines between nodes (approximate)
const CONNECTIONS = [
  { x1: '14%', y1: '22%', x2: '84%', y2: '26%' },
  { x1: '14%', y1: '22%', x2: '12%', y2: '54%' },
  { x1: '84%', y1: '26%', x2: '87%', y2: '58%' },
  { x1: '12%', y1: '54%', x2: '30%', y2: '82%' },
  { x1: '87%', y1: '58%', x2: '30%', y2: '82%' },
]

export default function PublicValue() {
  const sectionRef = useRef<HTMLElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setProgress(1)
      },
      { threshold: 0.25 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      id="public-value"
      ref={sectionRef}
      style={{
        position: 'relative',
        minHeight: '100dvh',
        overflow: 'hidden',
        background: 'var(--black)',
        paddingBlock: 'var(--section-gap)',
      }}
    >
      {/* L0: Base background */}
      <div
        aria-hidden="true"
        className="px-far"
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 70% at 50% 45%, #050e18 0%, var(--black) 60%)',
        }}
      />

      {/* L1: Central connecting network glow */}
      <div
        aria-hidden="true"
        className="px-mid"
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          opacity: progress,
          transition: 'opacity 1.2s ease 0.3s',
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(82,191,255,0.06) 0%, transparent 65%)',
        }}
      />

      {/* SVG Network lines */}
      <svg
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none', zIndex: 1,
        }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="line-grd" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(82,191,255,0.18)" />
            <stop offset="50%" stopColor="rgba(192,122,181,0.12)" />
            <stop offset="100%" stopColor="rgba(61,201,146,0.18)" />
          </linearGradient>
        </defs>
        {CONNECTIONS.map((c, i) => (
          <line
            key={i}
            x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
            stroke="url(#line-grd)"
            strokeWidth="1"
            style={{
              opacity: progress,
              strokeDasharray: '4 6',
              transition: `opacity 0.8s ease ${0.4 + i * 0.12}s`,
            }}
          />
        ))}
        {/* Network nodes */}
        {VALUES.map((v, i) => (
          <circle
            key={i}
            cx={v.nodePos.left ?? `calc(100% - ${v.nodePos.right})`}
            cy={v.nodePos.top ?? `calc(100% - ${v.nodePos.bottom})`}
            r="3"
            fill={`rgba(${v.accentRgb},0.7)`}
            style={{
              opacity: progress,
              transition: `opacity 0.6s ease ${0.2 + i * 0.15}s`,
            }}
          />
        ))}
      </svg>

      {/* Section label */}
      <div className="shell" style={{ position: 'relative', zIndex: 2, marginBottom: 'clamp(3rem, 6vh, 5rem)' }}>
        <p
          className="t-label"
          data-reveal
          style={{ color: 'var(--ac-cyan)' }}
        >
          PUBLIC VALUE
        </p>
        <h2
          className="t-scene"
          data-reveal
          style={{ maxWidth: '20ch', marginTop: '1rem' }}
        >
          더 많은 사람이
          <br />
          <span className="kw-light grd-cyan is-visible">연결되는 경험</span>을
          <br />
          <span style={{ color: 'rgba(237,232,224,0.35)' }}>설계합니다.</span>
        </h2>
      </div>

      {/* Spatially distributed value items */}
      {VALUES.map((v, i) => (
        <div
          key={v.id}
          data-reveal
          style={{
            position: 'absolute',
            ...v.pos,
            zIndex: 2,
            maxWidth: 'clamp(180px, 22vw, 260px)',
            opacity: progress,
            transform: `translateY(${progress ? 0 : 14}px)`,
            transition: `opacity 0.7s ease ${0.2 + v.delay}s, transform 0.85s cubic-bezier(0.16,1,0.3,1) ${0.2 + v.delay}s`,
          }}
        >
          <div
            style={{
              padding: '1rem 1.2rem',
              background: `rgba(${v.accentRgb},0.05)`,
              border: `1px solid rgba(${v.accentRgb},0.15)`,
              borderRadius: '4px',
              backdropFilter: 'blur(8px)',
            }}
          >
            <p
              style={{
                fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em',
                color: `rgba(${v.accentRgb},0.8)`, marginBottom: '6px',
                textTransform: 'uppercase',
              }}
            >
              {v.id}
            </p>
            <p
              style={{
                fontSize: 'clamp(0.8rem, 1vw, 0.95rem)',
                fontWeight: 700, lineHeight: 1.45,
                color: 'var(--text)', marginBottom: '4px',
              }}
            >
              {v.title}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {v.sub}
            </p>
          </div>
        </div>
      ))}

      {/* Large background infinity symbol */}
      <div
        aria-hidden="true"
        className="px-near"
        style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 'clamp(20rem, 50vw, 60rem)',
          fontWeight: 900, lineHeight: 1,
          color: 'rgba(82,191,255,0.025)',
          pointerEvents: 'none', userSelect: 'none',
          zIndex: 0,
        }}
      >
        ∞
      </div>
    </section>
  )
}
