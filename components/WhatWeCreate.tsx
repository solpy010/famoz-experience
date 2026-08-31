'use client'

import { useEffect, useRef, useState } from 'react'
import DistortionCanvas from './DistortionCanvas'
import { subscribeScroll } from './scrollBus'

const STAGES = [
  { accent: '#66e8c1', label: 'WHAT WE CREATE · 01', bg: 'radial-gradient(ellipse 72% 78% at 28% 48%, rgba(28,160,144,.20) 0%, rgba(15,75,102,.10) 42%, transparent 76%)', kw: 'Immersive', kwColor: 'rgba(90,232,205,.065)', lines: ['이야기가', '장면으로 펼쳐지는', '몰입형 미디어 공간.'], highlight: 1, body: '다면 미디어가 관람객의 이동 경로에 맞춰\n순차적으로 활성화됩니다.' },
  { accent: '#8ebcff', label: 'WHAT WE CREATE · 02', bg: 'radial-gradient(ellipse 68% 74% at 62% 44%, rgba(67,118,246,.22) 0%, rgba(111,88,232,.10) 46%, transparent 77%)', kw: 'Reactive', kwColor: 'rgba(112,155,255,.065)', lines: ['움직임과 선택에', '반응하는', '인터랙티브 경험.'], highlight: 1, body: '방문객의 행동이 장면을 결정합니다.\n똑같은 경험은 없습니다.' },
  { accent: '#c4a4ff', label: 'WHAT WE CREATE · 03', bg: 'radial-gradient(ellipse 70% 76% at 48% 56%, rgba(128,84,238,.22) 0%, rgba(31,130,220,.10) 48%, transparent 78%)', kw: 'Spatial', kwColor: 'rgba(188,155,255,.065)', lines: ['위치와 상황을 이해해', '도움을 주는', 'AI 공간 서비스.'], highlight: 1, body: '필요한 순간, 공간이 먼저 알아채고\n적절한 안내를 건네줍니다.' },
] as const

const clamp = (value: number) => Math.max(0, Math.min(1, value))
const ease = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t) }

export default function WhatWeCreate() {
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef(-1)
  const [progress, setProgress] = useState(0)

  useEffect(() => subscribeScroll(() => {
    const element = containerRef.current
    if (!element) return
    const total = Math.max(1, element.offsetHeight - innerHeight)
    const next = clamp(-element.getBoundingClientRect().top / total)
    if (Math.abs(next - progressRef.current) > .001) { progressRef.current = next; setProgress(next) }
  }), [])

  const position = progress * (STAGES.length - 1)
  const nearest = Math.round(position)

  return (
    <div id="what" ref={containerRef} className="scene-flow" style={{ position: 'relative', height: '520vh' }}>
      <section style={{ position: 'sticky', top: 0, height: '100dvh', overflow: 'hidden', display: 'flex', alignItems: 'center', background: 'transparent' }}>
        {STAGES.map((stage, index) => {
          const weight = ease(1 - Math.abs(position - index))
          const local = ease(clamp(position - index + 1))
          return (
            <div key={stage.label} aria-hidden={weight < .04} style={{ position: 'absolute', inset: 0, opacity: weight, pointerEvents: 'none' }}>
              <div className="px-far" style={{ position: 'absolute', inset: 0, background: stage.bg }} />
              <div className="px-near" style={{ position: 'absolute', bottom: '5%', right: '-2%', fontSize: 'clamp(8rem,20vw,20rem)', fontWeight: 800, letterSpacing: '-.06em', lineHeight: 1, fontFamily: "'Paperlogy','Pretendard',sans-serif", color: stage.kwColor, userSelect: 'none' }}>{stage.kw}</div>
              <div className="shell" data-guard style={{ position: 'absolute', top: '50%', left: 0, transform: `translate3d(0,calc(-50% + ${(1 - local) * 28}px),0)`, opacity: local }}>
                <p className="t-label" style={{ color: stage.accent, marginBottom: 'clamp(1.5rem,3vh,2.5rem)' }}>{stage.label}</p>
                <h2 className="t-scene" style={{ maxWidth: '16ch', marginBottom: 'clamp(1.25rem,2.5vh,2rem)' }}>
                  {stage.lines.map((line, lineIndex) => <span key={line} style={{ display: 'block', color: lineIndex === stage.highlight ? stage.accent : undefined }}>{line}</span>)}
                </h2>
                <p className="t-body" style={{ maxWidth: '36ch', whiteSpace: 'pre-line' }}>{stage.body}</p>
              </div>
            </div>
          )
        })}
        <DistortionCanvas color1="#5f8dff" color2="#a27cff" mouseForce={1.15} opacity={0.52} />
        <div aria-hidden style={{ position: 'absolute', right: 'clamp(20px,4vw,44px)', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 12, zIndex: 5 }}>
          {STAGES.map((stage, index) => <span key={stage.label} style={{ width: 5, height: 5, borderRadius: '50%', background: index === nearest ? stage.accent : 'rgba(170,190,225,.28)', transform: index === nearest ? 'scale(1.5)' : 'scale(1)', transition: 'background .45s ease, transform .45s ease' }} />)}
        </div>
      </section>
    </div>
  )
}
