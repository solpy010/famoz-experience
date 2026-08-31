'use client'
import { useEffect, useRef, useState } from 'react'
import DistortionCanvas from './DistortionCanvas'
import { subscribeScroll } from './scrollBus'

const VALUE_ITEMS = [
  { text: '이해하기 쉬워집니다', sub: '복잡한 정보가 감각으로 전달됩니다', color: '#FFAD66' },
  { text: '직접 참여하게 됩니다', sub: '관람객의 행동이 경험의 주체가 됩니다', color: '#FFD06F' },
  { text: '공간과 연결됩니다', sub: '장소가 관계로 기억됩니다', color: '#FF8B72' },
  { text: '오래 기억하게 됩니다', sub: '경험은 의미로 전환됩니다', color: '#D69CFF' },
]

const THRESHOLDS = [0.18, 0.38, 0.58, 0.78]

export default function ValueScene() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = wrapRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const total = el.offsetHeight - window.innerHeight
      const scrolled = Math.max(0, -rect.top)
      setProgress(Math.min(1, scrolled / total))
    }
    return subscribeScroll(onScroll)
  }, [])

  const beamFill = Math.max(0, Math.min(1, (progress - 0.04) / 0.88))

  return (
    <div ref={wrapRef} id="value" style={{ position: 'relative', height: '500vh' }}>
      <section style={{
        position: 'sticky', top: 0,
        height: '100svh', overflow: 'hidden',
        background: 'transparent',
        display: 'flex', alignItems: 'center',
      }}>
        {/* Ambient gradient */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 66% 58% at 22% 42%, rgba(255,108,61,.22) 0%, rgba(255,190,72,.10) 48%, transparent 76%)',
        }} />

        {/* Canvas distortion — warm orange/magenta */}
        <DistortionCanvas color1="#FF8A62" color2="#FFD06F" mouseForce={0.82} opacity={0.52} />

        <div className="shell" data-guard style={{ position: 'relative', zIndex: 'var(--z-content)', width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', gap: 'clamp(2.5rem, 5vh, 4rem)' }}>

            {/* ── Headline ── */}
            <div data-reveal>
              <p className="t-label" style={{ color: '#FFAD66', marginBottom: '1.25rem' }}>VALUE</p>
              <h2 className="t-scene" style={{ maxWidth: '24ch' }}>
                공간은 사람을 움직이고
                <br />
                <span style={{ color: 'rgba(201,211,242,.50)' }}>참여는 기억으로 남습니다.</span>
              </h2>
            </div>

            {/* ── Beam + Items ── */}
            <div style={{ display: 'flex', gap: 'clamp(2rem, 4vw, 5rem)', alignItems: 'stretch' }}>

              {/* Beam track */}
              <div style={{ position: 'relative', width: '1px', flexShrink: 0, minHeight: '240px' }}>
                {/* Track */}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.05)' }} />
                {/* Active beam */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  height: `${beamFill * 100}%`,
                  background: 'linear-gradient(to bottom, #FFD06F 0%, #FF9A62 52%, #D69CFF 100%)',
                  transition: 'height 0.25s cubic-bezier(0.4,0,0.2,1)',
                }} />
                {/* Beam glow tip */}
                {beamFill > 0.02 && (
                  <div style={{
                    position: 'absolute',
                    left: '-5px',
                    top: `calc(${beamFill * 100}% - 5px)`,
                    width: '11px', height: '11px',
                    borderRadius: '50%',
                    background: 'white',
                    boxShadow: '0 0 16px 6px rgba(255,255,255,0.5)',
                    transition: 'top 0.25s cubic-bezier(0.4,0,0.2,1)',
                  }} />
                )}
              </div>

              {/* Items */}
              <div style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                gap: 'clamp(1.25rem, 3vh, 2.5rem)',
                justifyContent: 'space-between',
              }}>
                {VALUE_ITEMS.map((item, i) => {
                  const active = progress >= THRESHOLDS[i]
                  const subVisible = progress >= THRESHOLDS[i] + 0.07
                  return (
                    <div key={i} style={{
                      opacity: active ? 1 : 0.1,
                      transform: active ? 'translateX(0)' : 'translateX(-6px)',
                      transition: 'opacity 0.5s cubic-bezier(0.4,0,0.2,1), transform 0.5s cubic-bezier(0.4,0,0.2,1)',
                    }}>
                      <p style={{
                        fontFamily: "'Paperlogy', 'Pretendard', sans-serif",
                        fontSize: 'clamp(1rem, 2vw, 1.9rem)',
                        fontWeight: 400,
                        letterSpacing: '-0.01em',
                        lineHeight: 1.2,
                        color: active ? item.color : 'var(--text-muted)',
                        transition: 'color 0.5s cubic-bezier(0.4,0,0.2,1)',
                        marginBottom: '0.4rem',
                      }}>
                        {item.text}
                      </p>
                      <p style={{
                        fontFamily: "'A2G', 'Pretendard', sans-serif",
                        fontSize: 'clamp(0.75rem, 0.95vw, 0.95rem)',
                        color: 'var(--text-sub)',
                        opacity: subVisible ? 1 : 0,
                        transform: subVisible ? 'translateY(0)' : 'translateY(5px)',
                        transition: 'opacity 0.5s cubic-bezier(0.4,0,0.2,1) 0.1s, transform 0.5s cubic-bezier(0.4,0,0.2,1) 0.1s',
                      }}>
                        {item.sub}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
