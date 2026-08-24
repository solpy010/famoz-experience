'use client'
import { useRef, useEffect, useState } from 'react'

interface Stage {
  accent: string
  label: string
  bg: string
  kw: string
  kwColor: string
  headingClass: string
  headingLines: string[]
  highlightLine: number
  body: string
  // Scene-specific effect layer
  effectLayer: React.CSSProperties
}

const STAGES: Stage[] = [
  {
    accent: 'var(--ac-emerald)',
    label: 'WHAT WE CREATE · 01',
    bg: 'radial-gradient(ellipse 65% 70% at 40% 40%, #0d1a12 0%, var(--black) 60%)',
    kw: '몰입',
    kwColor: 'rgba(61,201,146,0.08)',
    headingClass: 'grd-emerald',
    headingLines: ['이야기가', '장면으로 펼쳐지는', '몰입형 미디어 공간.'],
    highlightLine: 1,
    body: '다면 미디어가 관람객의 이동 경로에 맞춰\n순차적으로 활성화됩니다.',
    // Emerald: flowing spatial surface
    effectLayer: {
      background: 'radial-gradient(ellipse 80% 60% at 35% 55%, rgba(61,201,146,0.12) 0%, transparent 70%)',
      animation: 'emerald-drift 8s ease-in-out infinite',
    },
  },
  {
    accent: 'var(--ac-orange)',
    label: 'WHAT WE CREATE · 02',
    bg: 'radial-gradient(ellipse 65% 70% at 60% 50%, #1a0e05 0%, var(--black) 60%)',
    kw: '반응',
    kwColor: 'rgba(232,149,90,0.08)',
    headingClass: 'grd-gold',
    headingLines: ['움직임과 선택에', '반응하는', '인터랙티브 경험.'],
    highlightLine: 1,
    body: '방문객의 행동이 장면을 결정합니다.\n똑같은 경험은 없습니다.',
    // Coral+Gold: reaction pulse rings
    effectLayer: {
      background: 'radial-gradient(ellipse 55% 55% at 55% 45%, rgba(200,160,64,0.15) 0%, rgba(232,149,90,0.1) 40%, transparent 70%)',
      animation: 'coral-pulse 4s ease-in-out infinite',
    },
  },
  {
    accent: 'var(--ac-magenta)',
    label: 'WHAT WE CREATE · 03',
    bg: 'radial-gradient(ellipse 65% 70% at 50% 60%, #180d28 0%, var(--black) 60%)',
    kw: '연결',
    kwColor: 'rgba(180,100,220,0.08)',
    headingClass: 'grd-magenta',
    headingLines: ['위치와 상황을 이해해', '도움을 주는', 'AI 공간 서비스.'],
    highlightLine: 1,
    body: '필요한 순간, 공간이 먼저 알아채고\n적절한 안내를 건네줍니다.',
    // Violet+Cyan: guidance path
    effectLayer: {
      background: 'linear-gradient(135deg, rgba(82,191,255,0.08) 0%, rgba(192,122,181,0.12) 50%, transparent 80%)',
      animation: 'emerald-drift 10s ease-in-out infinite reverse',
    },
  },
]

export default function WhatWeCreate() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [stageIdx, setStageIdx] = useState(0)

  useEffect(() => {
    function onScroll() {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const h = el.offsetHeight
      const vh = window.innerHeight
      const progress = -rect.top / (h - vh)
      const clamped = Math.max(0, Math.min(0.999, progress))
      setStageIdx(Math.min(2, Math.floor(clamped * 3)))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const s = STAGES[stageIdx] ?? STAGES[0]

  return (
    <section id="what" ref={containerRef} style={{ position: 'relative', background: 'var(--black)' }}>
      <div style={{ height: '300vh' }} />

      <div
        style={{
          position: 'sticky', top: 0, height: '100dvh', overflow: 'hidden',
          display: 'flex', alignItems: 'center', marginTop: '-300vh',
        }}
      >
        {/* Far layer: base gradient (px-far) */}
        <div
          aria-hidden="true"
          className="px-far"
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: s.bg,
            transition: 'background 0.9s cubic-bezier(0.16,1,0.3,1)',
          }}
        />

        {/* Mid layer: scene-specific animated effect (px-mid) */}
        <div
          aria-hidden="true"
          className="px-mid"
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            transition: 'opacity 0.7s ease',
            ...s.effectLayer,
          }}
        />

        {/* Near layer: decorative keyword (px-near) */}
        <div
          aria-hidden="true"
          className="px-near"
          style={{
            position: 'absolute', bottom: '8%', right: '-2%',
            fontSize: 'clamp(8rem, 20vw, 20rem)', fontWeight: 900,
            letterSpacing: '-0.05em', lineHeight: 1,
            color: s.kwColor, transition: 'color 0.7s ease',
            pointerEvents: 'none', userSelect: 'none',
          }}
        >
          {s.kw}
        </div>

        {/* Content */}
        <div className="shell" style={{ position: 'relative', zIndex: 2, width: '100%' }}>
          <p
            className="t-label"
            style={{ color: s.accent, marginBottom: 'clamp(1.5rem, 3vh, 2.5rem)', transition: 'color 0.4s' }}
          >
            {s.label}
          </p>
          <h2 className="t-scene" style={{ maxWidth: '14ch', marginBottom: 'clamp(1.25rem, 2.5vh, 2rem)' }}>
            {s.headingLines.map((line, i) => (
              <span key={`${stageIdx}-${i}`}>
                {i === s.highlightLine ? (
                  <span
                    className={`kw-light ${s.headingClass} is-visible`}
                    style={{ display: 'inline-block' }}
                  >
                    {line}
                  </span>
                ) : line}
                {i < s.headingLines.length - 1 && <br />}
              </span>
            ))}
          </h2>
          <p className="t-body" style={{ maxWidth: '36ch', whiteSpace: 'pre-line' }}>
            {s.body}
          </p>
        </div>

        {/* Progress dots */}
        <div
          role="presentation"
          aria-hidden="true"
          style={{
            position: 'absolute', right: 'clamp(20px, 4vw, 44px)', top: '50%',
            transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 5,
          }}
        >
          {STAGES.map((_, i) => (
            <div
              key={i}
              style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: i === stageIdx ? s.accent : 'var(--text-muted)',
                transform: i === stageIdx ? 'scale(1.5)' : 'scale(1)',
                transition: 'background 0.4s, transform 0.4s',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
