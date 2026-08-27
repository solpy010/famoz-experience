'use client'
import { useRef, useEffect, useState } from 'react'

// Progress binding per report spec
// State 0: 0.00–0.33  State 1: 0.33–0.66  State 2: 0.66–1.00
// Content reveal within each state follows 0-0.15/0.15-0.38/0.38-0.62/0.62-0.82/0.82-1.00

const STATES = [
  {
    accent: 'var(--ac-emerald)',
    label: 'WHAT WE CREATE · 01',
    accentRgb: '61,201,146',
    keyword: '이야기',
    // Persistent lighting overlay: emerald flowing surface
    lightColor: 'rgba(61,201,146,0.13)',
    lightPos: '35% 45%',
    // Guidance line direction
    lineAngle: '65deg',
    lineColor: 'rgba(61,201,146,0.18)',
    headingBlocks: ['이야기가 장면으로 펼쳐지는', '몰입형 미디어 공간.'],
    highlightIdx: 0,
    body: '다면 미디어가 관람객의 이동 경로에 맞춰\n순차적으로 활성화됩니다.',
    panelTexts: ['다면 미디어 시스템', '관람 경로 반응형', '공간 시퀀서'],
    panelColors: ['rgba(61,201,146,0.08)', 'rgba(61,201,146,0.05)', 'rgba(61,201,146,0.06)'],
  },
  {
    accent: 'var(--ac-orange)',
    label: 'WHAT WE CREATE · 02',
    accentRgb: '232,149,90',
    keyword: '반응',
    lightColor: 'rgba(200,160,64,0.14)',
    lightPos: '60% 40%',
    lineAngle: '110deg',
    lineColor: 'rgba(232,149,90,0.16)',
    headingBlocks: ['움직임과 선택에 반응하는', '인터랙티브 경험.'],
    highlightIdx: 0,
    body: '방문객의 행동이 장면을 결정합니다.\n똑같은 경험은 없습니다.',
    panelTexts: ['행동 인식 센서', '실시간 콘텐츠 변환', '반응 이력 데이터'],
    panelColors: ['rgba(232,149,90,0.08)', 'rgba(200,160,64,0.06)', 'rgba(232,149,90,0.07)'],
  },
  {
    accent: 'var(--ac-magenta)',
    label: 'WHAT WE CREATE · 03',
    accentRgb: '192,122,181',
    keyword: '도움',
    lightColor: 'rgba(82,191,255,0.10)',
    lightPos: '50% 55%',
    lineAngle: '145deg',
    lineColor: 'rgba(82,191,255,0.15)',
    headingBlocks: ['위치와 상황을 이해해 도움을 주는', 'AI 공간 서비스.'],
    highlightIdx: 0,
    body: '필요한 순간, 공간이 먼저 알아채고\n적절한 안내를 건네줍니다.',
    panelTexts: ['AI 공간 분석', '상황 인지 안내', '다국어 실시간 지원'],
    panelColors: ['rgba(82,191,255,0.08)', 'rgba(192,122,181,0.06)', 'rgba(82,191,255,0.07)'],
  },
]

export default function WhatWeCreate() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    function onScroll() {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const totalScroll = el.offsetHeight - window.innerHeight
      if (totalScroll <= 0) return
      const p = Math.max(0, Math.min(1, -rect.top / totalScroll))
      setProgress(p)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const stateIdx = progress < 0.33 ? 0 : progress < 0.66 ? 1 : 2
  const stateProgress = progress < 0.33
    ? progress / 0.33
    : progress < 0.66
    ? (progress - 0.33) / 0.33
    : (progress - 0.66) / 0.34

  const s = STATES[stateIdx]
  const prev = STATES[Math.max(0, stateIdx - 1)]

  // Within-state reveal timing per report spec
  const labelVisible = stateProgress > 0.05
  const heading0Visible = stateProgress > 0.15
  const heading1Visible = stateProgress > 0.30
  const panelsVisible = stateProgress > 0.55
  const bodyVisible = stateProgress > 0.70

  const ease = (v: number, threshold: number, range = 0.15) =>
    Math.max(0, Math.min(1, (v - threshold) / range))

  return (
    <section
      id="what"
      ref={containerRef}
      style={{ position: 'relative', background: 'var(--black)' }}
    >
      {/* 320svh scroll space — 3 states × ~100svh + transitions */}
      <div style={{ height: '320svh' }} />

      <div
        style={{
          position: 'sticky', top: 0, height: '100dvh', overflow: 'hidden',
          display: 'flex', alignItems: 'center', marginTop: '-320svh',
        }}
      >
        {/* ── L0: Persistent base space (never changes) ── */}
        <div
          aria-hidden="true"
          className="px-far"
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `
              radial-gradient(ellipse 100% 80% at 50% 50%, #0c0812 0%, var(--black) 65%),
              radial-gradient(ellipse 60% 40% at 20% 80%, #080510 0%, transparent 60%)
            `,
          }}
        />

        {/* ── L1: State lighting overlay (transitions with each state) ── */}
        <div
          aria-hidden="true"
          className="px-mid"
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(ellipse 70% 65% at ${s.lightPos}, ${s.lightColor} 0%, transparent 65%)`,
            transition: 'background 1.1s cubic-bezier(0.16,1,0.3,1)',
          }}
        />

        {/* ── L1: Guidance line layer ── */}
        <div
          aria-hidden="true"
          className="px-mid"
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `linear-gradient(${s.lineAngle}, ${s.lineColor} 0%, transparent 55%)`,
            transition: 'background 1.0s cubic-bezier(0.16,1,0.3,1)',
          }}
        />

        {/* ── L2: Large ambient keyword in background ── */}
        <div
          aria-hidden="true"
          className="px-near"
          style={{
            position: 'absolute',
            bottom: '5%', right: '-3%',
            fontSize: 'clamp(9rem, 22vw, 22rem)',
            fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1,
            color: `rgba(${s.accentRgb},0.05)`,
            transition: 'color 0.8s ease',
            pointerEvents: 'none', userSelect: 'none',
          }}
        >
          {s.keyword}
        </div>

        {/* ── L3: Floating evidence panels ── */}
        {s.panelTexts.map((text, i) => {
          const positions = [
            { right: 'clamp(24px, 8vw, 120px)', top: '18%' },
            { right: 'clamp(24px, 14vw, 200px)', top: '38%' },
            { right: 'clamp(24px, 6vw, 80px)', top: '58%' },
          ]
          const tilts = ['rotate(-2deg)', 'rotate(1.5deg)', 'rotate(-3deg)']
          const op = ease(stateProgress, 0.55 + i * 0.06) * (panelsVisible ? 1 : 0)
          const ty = panelsVisible ? 0 : 12
          return (
            <div
              key={`${stateIdx}-panel-${i}`}
              aria-hidden="true"
              style={{
                position: 'absolute',
                ...positions[i],
                zIndex: 3,
                padding: '0.7rem 1.1rem',
                background: s.panelColors[i],
                border: `1px solid rgba(${s.accentRgb},0.14)`,
                borderRadius: '4px',
                backdropFilter: 'blur(8px)',
                transform: `${tilts[i]} translateY(${ty}px)`,
                opacity: op,
                transition: 'opacity 0.6s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)',
                pointerEvents: 'none',
              }}
            >
              <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', color: `rgba(${s.accentRgb},0.85)`, textTransform: 'uppercase' }}>
                {text}
              </span>
            </div>
          )
        })}

        {/* ── L4: Core message — stable reading zone ── */}
        <div className="shell" style={{ position: 'relative', zIndex: 4, width: '100%' }}>
          {/* Label */}
          <p
            className="t-label"
            style={{
              color: s.accent,
              marginBottom: 'clamp(1.5rem, 3vh, 2.5rem)',
              opacity: labelVisible ? 1 : 0,
              transform: `translateY(${labelVisible ? 0 : 14}px)`,
              transition: 'opacity 0.6s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1), color 0.5s',
            }}
          >
            {s.label}
          </p>

          {/* Heading — 2 meaning blocks, sequential */}
          <h2
            className="t-scene"
            style={{ maxWidth: '18ch', marginBottom: 'clamp(1.25rem, 2.5vh, 2rem)' }}
          >
            {s.headingBlocks.map((block, i) => {
              const vis = i === 0 ? heading0Visible : heading1Visible
              const isHighlight = i === s.highlightIdx
              return (
                <span
                  key={`${stateIdx}-h${i}`}
                  style={{
                    display: 'block',
                    opacity: vis ? 1 : 0,
                    transform: `translateY(${vis ? 0 : 20}px)`,
                    filter: `blur(${vis ? 0 : 5}px)`,
                    transition: `opacity 0.75s ease ${i * 0.14}s, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${i * 0.14}s, filter 0.75s ease ${i * 0.14}s`,
                  }}
                >
                  {isHighlight ? (
                    <span
                      className={`kw-light ${stateIdx === 0 ? 'grd-emerald' : stateIdx === 1 ? 'grd-gold' : 'grd-magenta'} is-visible`}
                    >
                      {block}
                    </span>
                  ) : block}
                </span>
              )
            })}
          </h2>

          {/* Body */}
          <p
            className="t-body"
            style={{
              maxWidth: '36ch',
              whiteSpace: 'pre-line',
              opacity: bodyVisible ? 1 : 0,
              transform: `translateY(${bodyVisible ? 0 : 12}px)`,
              transition: 'opacity 0.7s ease, transform 0.8s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {s.body}
          </p>
        </div>

        {/* Progress indicator */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', right: 'clamp(16px, 3vw, 36px)', top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 5,
          }}
        >
          {STATES.map((st, i) => (
            <div
              key={i}
              style={{
                width: '4px', height: i === stateIdx ? '28px' : '4px',
                borderRadius: '2px',
                background: i === stateIdx ? s.accent : 'var(--text-muted)',
                transition: 'height 0.4s cubic-bezier(0.16,1,0.3,1), background 0.4s',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
