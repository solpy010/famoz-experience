'use client'
import { useRef, useEffect, useState } from 'react'

// Action → Reaction → Result sequence per report spec
const KEYWORDS = [
  {
    action: '복잡한 정보 앞에 선 관람객',
    reaction: '공간이 시각 언어로 풀어냅니다',
    result: '이해하기 쉬워집니다',
    sub: '복잡한 정보가 감각으로 전달됩니다',
    accentRgb: '232,149,90',
    lightPos: '30% 40%',
  },
  {
    action: '멈춰서 바라보는 순간',
    reaction: '공간이 반응하며 참여를 이끕니다',
    result: '직접 참여하게 됩니다',
    sub: '관람에서 경험의 주체로 바뀝니다',
    accentRgb: '82,191,255',
    lightPos: '65% 55%',
  },
  {
    action: '낯선 장소에 처음 들어설 때',
    reaction: '공간이 이야기를 건넵니다',
    result: '공간과 연결됩니다',
    sub: '장소가 관계로 기억됩니다',
    accentRgb: '61,201,146',
    lightPos: '40% 60%',
  },
  {
    action: '경험이 끝나고 문을 나설 때',
    reaction: '장면과 감정이 남습니다',
    result: '오래 기억하게 됩니다',
    sub: '경험은 의미로 전환됩니다',
    accentRgb: '192,122,181',
    lightPos: '55% 35%',
  },
]

export default function ValueScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    function onScroll() {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const totalScroll = el.offsetHeight - window.innerHeight
      if (totalScroll <= 0) return
      setProgress(Math.max(0, Math.min(1, -rect.top / totalScroll)))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const activeIdx = Math.min(KEYWORDS.length - 1, Math.floor(progress * KEYWORDS.length))
  const kwProgress = (progress * KEYWORDS.length) - activeIdx
  const kw = KEYWORDS[activeIdx]

  const actionVisible = kwProgress > 0.10
  const reactionVisible = kwProgress > 0.28
  const resultVisible = kwProgress > 0.48
  const subVisible = kwProgress > 0.65

  return (
    <section
      id="value"
      ref={containerRef}
      style={{ position: 'relative', background: 'var(--black)' }}
    >
      <div style={{ height: '400svh' }} />

      <div
        style={{
          position: 'sticky', top: 0, height: '100dvh', overflow: 'hidden',
          display: 'flex', alignItems: 'center',
          marginTop: '-400svh',
        }}
      >
        {/* L0: Persistent dark base */}
        <div
          aria-hidden="true"
          className="px-far"
          style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 90% 70% at 50% 50%, #0e0718 0%, var(--black) 65%)',
          }}
        />

        {/* L1: Action-point light */}
        <div
          aria-hidden="true"
          className="px-mid"
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(ellipse 55% 50% at ${kw.lightPos}, rgba(${kw.accentRgb},0.10) 0%, transparent 65%)`,
            transition: 'background 0.9s cubic-bezier(0.16,1,0.3,1)',
          }}
        />

        <div className="shell" style={{ position: 'relative', zIndex: 2, width: '100%' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
              gap: 'clamp(3rem, 6vw, 6rem)',
              alignItems: 'start',
            }}
          >
            {/* Left: action→reaction→result sequence */}
            <div>
              <p
                className="t-label"
                style={{ color: `rgba(${kw.accentRgb},0.9)`, marginBottom: '2.5rem', transition: 'color 0.5s' }}
              >
                VALUE
              </p>

              <div
                style={{
                  marginBottom: '1.2rem',
                  opacity: actionVisible ? 0.55 : 0,
                  transform: `translateY(${actionVisible ? 0 : 12}px)`,
                  transition: 'opacity 0.6s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  ACTION
                </p>
                <p style={{ fontSize: 'clamp(0.85rem, 1.2vw, 1rem)', color: 'var(--text-sub)', lineHeight: 1.6 }}>
                  {kw.action}
                </p>
              </div>

              <div
                style={{
                  marginBottom: '2rem',
                  paddingLeft: '1rem',
                  borderLeft: `2px solid rgba(${kw.accentRgb},0.3)`,
                  opacity: reactionVisible ? 0.75 : 0,
                  transform: `translateY(${reactionVisible ? 0 : 10}px)`,
                  transition: 'opacity 0.65s ease 0.1s, transform 0.75s cubic-bezier(0.16,1,0.3,1) 0.1s',
                }}
              >
                <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', color: `rgba(${kw.accentRgb},0.6)`, marginBottom: '4px', textTransform: 'uppercase' }}>
                  REACTION
                </p>
                <p style={{ fontSize: 'clamp(0.85rem, 1.2vw, 1rem)', color: 'var(--text-sub)', lineHeight: 1.6 }}>
                  {kw.reaction}
                </p>
              </div>

              <h2
                className="t-scene"
                style={{
                  maxWidth: '14ch',
                  opacity: resultVisible ? 1 : 0,
                  transform: `translateY(${resultVisible ? 0 : 20}px)`,
                  filter: `blur(${resultVisible ? 0 : 5}px)`,
                  transition: 'opacity 0.8s ease 0.15s, transform 1s cubic-bezier(0.16,1,0.3,1) 0.15s, filter 0.8s ease 0.15s',
                }}
              >
                <span className="kw-light is-visible" style={{ color: `rgba(${kw.accentRgb},1)` }}>
                  {kw.result}
                </span>
              </h2>

              <p
                className="t-body"
                style={{
                  marginTop: '0.75rem',
                  opacity: subVisible ? 1 : 0,
                  transform: `translateY(${subVisible ? 0 : 8}px)`,
                  transition: 'opacity 0.6s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                {kw.sub}
              </p>
            </div>

            {/* Right: accumulated results */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
              <p className="t-label" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                RESULT
              </p>
              {KEYWORDS.map((k, i) => {
                const isPast = i < activeIdx
                const isCurrent = i === activeIdx
                const vis = isPast || (isCurrent && resultVisible)
                return (
                  <div
                    key={i}
                    style={{
                      borderLeft: `2px solid rgba(${k.accentRgb},${vis ? 0.4 : 0.08})`,
                      paddingLeft: '1.2rem',
                      opacity: vis ? (isPast ? 0.55 : 1) : 0.1,
                      transform: `translateY(${vis ? 0 : 6}px)`,
                      transition: 'opacity 0.7s ease, transform 0.8s cubic-bezier(0.16,1,0.3,1), border-color 0.5s',
                    }}
                  >
                    <p
                      style={{
                        fontSize: 'clamp(0.9rem, 1.8vw, 1.6rem)',
                        fontWeight: 800, letterSpacing: '-0.02em',
                        color: vis ? `rgba(${k.accentRgb},${isPast ? 0.65 : 1})` : 'var(--text-muted)',
                        transition: 'color 0.5s',
                      }}
                    >
                      {k.result}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', right: 'clamp(16px, 3vw, 36px)', top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 5,
          }}
        >
          {KEYWORDS.map((k, i) => (
            <div
              key={i}
              style={{
                width: '4px', height: i === activeIdx ? '24px' : '4px',
                borderRadius: '2px',
                background: i <= activeIdx ? `rgba(${k.accentRgb},0.8)` : 'var(--text-muted)',
                transition: 'height 0.4s cubic-bezier(0.16,1,0.3,1), background 0.4s',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
