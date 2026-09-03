'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { subscribeScroll } from './scrollBus'

const STAGES = [
  { accent: '#66e8c1', label: 'WHAT WE CREATE · 01', bg: 'radial-gradient(ellipse 72% 78% at 28% 48%, rgba(28,160,144,.20) 0%, rgba(15,75,102,.10) 42%, transparent 76%)', image: '/works/immersive-03.png', imagePosition: '68% center', mobileImagePosition: '58% 24%', kw: 'Immersive', kwColor: 'rgba(90,232,205,.075)', lines: ['이야기가', '장면으로 펼쳐지는', '몰입형 미디어 공간.'], highlight: 1, body: '공간의 스케일과 관람 동선을 해석해\n영상·빛·사운드가 하나의 장면으로 이어지는\n몰입 환경을 설계합니다.' },
  { accent: '#ffad66', label: 'WHAT WE CREATE · 02', bg: 'radial-gradient(ellipse 68% 74% at 62% 44%, rgba(255,112,62,.24) 0%, rgba(255,190,83,.12) 44%, transparent 76%)', image: '/works/sports-04.png', imagePosition: '72% center', mobileImagePosition: '58% 20%', kw: 'Reactive', kwColor: 'rgba(255,157,91,.085)', lines: ['움직임과 선택에', '반응하는', '인터랙티브 경험.'], highlight: 1, body: '센서와 인터랙티브 미디어를 연결해\n관람객의 움직임과 선택이 장면을 바꾸는\n참여 구조를 만듭니다.' },
  { accent: '#d69cff', label: 'WHAT WE CREATE · 03', bg: 'radial-gradient(ellipse 70% 76% at 48% 56%, rgba(190,91,255,.23) 0%, rgba(46,190,255,.12) 48%, transparent 78%)', image: '/works/hospital-01.png', imagePosition: '76% center', mobileImagePosition: '58% 20%', kw: 'Spatial', kwColor: 'rgba(214,156,255,.085)', lines: ['위치와 상황을 이해해', '도움을 주는', 'AI 공간 서비스.'], highlight: 1, body: '콘텐츠·미디어·AI를 공간 조건과 운영 흐름에 결합해\n필요한 순간에 반응하는 공간 서비스를 구축합니다.' },
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
    <div id="what" ref={containerRef} className="scene-flow" data-experience-support="capability-detail" style={{ position: 'relative', height: '520vh' }}>
      <section style={{ position: 'sticky', top: 0, height: '100dvh', overflow: 'hidden', display: 'flex', alignItems: 'center', background: 'transparent' }}>
        {STAGES.map((stage, index) => {
          const weight = ease(1 - Math.abs(position - index))
          const local = ease(clamp(position - index + 1))
          return (
            <div key={stage.label} aria-hidden={weight < .04} style={{ position: 'absolute', inset: 0, opacity: weight, pointerEvents: 'none' }}>
              <div className="px-far" style={{ position: 'absolute', inset: 0, background: stage.bg }} />
              <img
                src={stage.image}
                alt=""
                loading="lazy"
                className="px-mid what-stage-image"
                style={{
                  '--stage-position': stage.imagePosition,
                  '--stage-mobile-position': stage.mobileImagePosition,
                  opacity: .24, filter: 'saturate(.82) contrast(1.08)',
                } as CSSProperties}
              />
              <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(5,11,24,.88) 0%, rgba(5,11,24,.58) 42%, rgba(5,11,24,.12) 75%, rgba(5,11,24,.42) 100%)' }} />
              <div className="px-near what-stage-keyword" style={{ color: stage.kwColor }}>{stage.kw}</div>
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
        <div aria-hidden style={{ position: 'absolute', right: 'clamp(20px,4vw,44px)', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 12, zIndex: 5 }}>
          {STAGES.map((stage, index) => <span key={stage.label} style={{ width: 5, height: 5, borderRadius: '50%', background: index === nearest ? stage.accent : 'rgba(170,190,225,.28)', transform: index === nearest ? 'scale(1.5)' : 'scale(1)', transition: 'background .45s ease, transform .45s ease' }} />)}
        </div>
      </section>
    </div>
  )
}
