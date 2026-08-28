'use client'
import { useRef, useEffect, useState } from 'react'
import DistortionCanvas from './DistortionCanvas'

const EASE = 'cubic-bezier(0.4,0,0.2,1)'

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
  effectLayer: React.CSSProperties
  canvas1: string
  canvas2: string
  canvasForce: number
}

const STAGES: Stage[] = [
  {
    accent: 'var(--ac-emerald)',
    label: 'WHAT WE CREATE · 01',
    bg: 'radial-gradient(ellipse 65% 70% at 40% 40%, #0d1a12 0%, var(--black) 60%)',
    kw: 'Immersive',
    kwColor: 'rgba(61,201,146,0.07)',
    headingClass: 'grd-emerald',
    headingLines: ['이야기가', '장면으로 펼쳐지는', '몰입형 미디어 공간.'],
    highlightLine: 1,
    body: '다면 미디어가 관람객의 이동 경로에 맞춰\n순차적으로 활성화됩니다.',
    effectLayer: {
      background: 'radial-gradient(ellipse 80% 60% at 35% 55%, rgba(61,201,146,0.1) 0%, transparent 70%)',
    },
    canvas1: '#3DC992',
    canvas2: '#52BFFF',
    canvasForce: 2,
  },
  {
    accent: 'var(--ac-orange)',
    label: 'WHAT WE CREATE · 02',
    bg: 'radial-gradient(ellipse 65% 70% at 60% 50%, #1a0e05 0%, var(--black) 60%)',
    kw: 'Reactive',
    kwColor: 'rgba(232,149,90,0.07)',
    headingClass: 'grd-gold',
    headingLines: ['움직임과 선택에', '반응하는', '인터랙티브 경험.'],
    highlightLine: 1,
    body: '방문객의 행동이 장면을 결정합니다.\n똑같은 경험은 없습니다.',
    effectLayer: {
      background: 'radial-gradient(ellipse 55% 55% at 55% 45%, rgba(200,160,64,0.12) 0%, rgba(232,149,90,0.08) 40%, transparent 70%)',
    },
    canvas1: '#E8955A',
    canvas2: '#C8A040',
    canvasForce: 3.5,
  },
  {
    accent: 'var(--ac-magenta)',
    label: 'WHAT WE CREATE · 03',
    bg: 'radial-gradient(ellipse 65% 70% at 50% 60%, #180d28 0%, var(--black) 60%)',
    kw: 'Spatial',
    kwColor: 'rgba(192,122,181,0.07)',
    headingClass: 'grd-magenta',
    headingLines: ['위치와 상황을 이해해', '도움을 주는', 'AI 공간 서비스.'],
    highlightLine: 1,
    body: '필요한 순간, 공간이 먼저 알아채고\n적절한 안내를 건네줍니다.',
    effectLayer: {
      background: 'linear-gradient(135deg, rgba(82,191,255,0.07) 0%, rgba(192,122,181,0.1) 50%, transparent 80%)',
    },
    canvas1: '#C07AB5',
    canvas2: '#52BFFF',
    canvasForce: 1.5,
  },
]

// Sub-progress thresholds — low enough to show content quickly on stage entry
const T = { label: 0.001, line0: 0.04, line1: 0.12, line2: 0.22, body: 0.35 }

function revealStyle(visible: boolean, delay = 0): React.CSSProperties {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(16px)',
    filter: visible ? 'blur(0)' : 'blur(4px)',
    transition: `opacity 0.55s ${EASE} ${delay}s, transform 0.55s ${EASE} ${delay}s, filter 0.55s ${EASE} ${delay}s`,
  }
}

export default function WhatWeCreate() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [stageIdx, setStageIdx] = useState(0)
  const [sub, setSub] = useState(0)

  useEffect(() => {
    function onScroll() {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const total = el.offsetHeight - window.innerHeight
      const progress = Math.max(0, Math.min(0.9999, -rect.top / total))
      const stageFloat = progress * 3
      const idx = Math.min(2, Math.floor(stageFloat))
      setSub(stageFloat - idx)
      setStageIdx(idx)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const s = STAGES[stageIdx]
  const show = (threshold: number) => sub >= threshold

  return (
    <div id="what" ref={containerRef} style={{ position: 'relative', height: '600vh' }}>
      <section style={{
        position: 'sticky', top: 0, height: '100dvh', overflow: 'hidden',
        display: 'flex', alignItems: 'center',
        background: 'transparent',
      }}>
        {/* Far layer — base gradient + parallax */}
        <div
          aria-hidden
          className="px-far"
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: s.bg,
            transition: `background 1s ${EASE}`,
          }}
        />

        {/* Mid layer — scene-specific + parallax */}
        <div
          aria-hidden
          className="px-mid"
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            transition: `opacity 0.8s ${EASE}`,
            ...s.effectLayer,
          }}
        />

        {/* Canvas distortion — per-stage color */}
        <DistortionCanvas
          color1={s.canvas1}
          color2={s.canvas2}
          mouseForce={s.canvasForce}
          opacity={0.55}
        />

        {/* Near layer — decorative keyword + parallax */}
        <div
          aria-hidden
          className="px-near"
          style={{
            position: 'absolute', bottom: '6%', right: '-2%',
            fontSize: 'clamp(8rem, 20vw, 20rem)', fontWeight: 900,
            letterSpacing: '-0.05em', lineHeight: 1,
            fontFamily: "'Paperlogy', 'Pretendard', sans-serif",
            color: s.kwColor,
            transition: `color 0.8s ${EASE}`,
            pointerEvents: 'none', userSelect: 'none',
          }}
        >
          {s.kw}
        </div>

        {/* Content — sequential reveal */}
        <div className="shell" style={{ position: 'relative', zIndex: 2, width: '100%' }}>

          {/* Label */}
          <p
            className="t-label"
            style={{
              color: s.accent,
              marginBottom: 'clamp(1.5rem, 3vh, 2.5rem)',
              transition: `color 0.5s ${EASE}`,
              ...revealStyle(show(T.label)),
            }}
          >
            {s.label}
          </p>

          {/* Heading lines — revealed one by one */}
          <h2
            className="t-scene"
            style={{ maxWidth: '16ch', marginBottom: 'clamp(1.25rem, 2.5vh, 2rem)' }}
          >
            {s.headingLines.map((line, i) => {
              const threshold = i === 0 ? T.line0 : i === 1 ? T.line1 : T.line2
              return (
                <span
                  key={`${stageIdx}-line-${i}`}
                  style={{ display: 'block', ...revealStyle(show(threshold), i * 0.04) }}
                >
                  {i === s.highlightLine ? (
                    <span className={`kw-light ${s.headingClass} is-visible`}>
                      {line}
                    </span>
                  ) : line}
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
              ...revealStyle(show(T.body)),
            }}
          >
            {s.body}
          </p>
        </div>

        {/* Progress dots */}
        <div
          aria-hidden
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
                transition: `background 0.5s ${EASE}, transform 0.5s ${EASE}`,
              }}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
