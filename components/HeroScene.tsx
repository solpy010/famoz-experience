'use client'
import { useEffect } from 'react'
import Link from 'next/link'

type Props = { introComplete: boolean }

export default function HeroScene({ introComplete }: Props) {

  // Trigger hero reveals after intro completes
  useEffect(() => {
    if (!introComplete) return
    const section = document.getElementById('hero')
    if (!section) return
    const items = section.querySelectorAll<HTMLElement>('[data-reveal]')
    items.forEach((el, i) => {
      setTimeout(() => el.classList.add('is-visible'), 100 + i * 160)
    })
  }, [introComplete])

  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        paddingBottom: 'clamp(60px, 12vh, 120px)',
        background: 'transparent',
        overflow: 'hidden',
      }}
    >
      {/* Layer 3 — Near: architectural accent lines (moves 14px with pointer) */}
      <div
        aria-hidden="true"
        className="px-near"
        style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}
      >
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }} xmlns="http://www.w3.org/2000/svg">
          <line x1="60%" y1="0" x2="55%" y2="100%" stroke="rgba(200,130,200,1)" strokeWidth="0.5" />
          <line x1="85%" y1="0" x2="90%" y2="100%" stroke="rgba(200,130,200,1)" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Nav logo — hidden during intro, revealed after */}
      <a
        href="#"
        data-reveal
        style={{
          position: 'absolute',
          top: 'clamp(24px, 4vh, 44px)',
          left: 'max(var(--gutter), env(safe-area-inset-left))',
          zIndex: 10,
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.6rem',
        }}
      >
        <span style={{ fontSize: 'clamp(0.9rem, 1.8vw, 1.2rem)', fontWeight: 900, letterSpacing: '-0.01em', color: 'var(--text)' }}>
          FAMOZ
        </span>
        <span style={{ fontSize: 'clamp(0.52rem, 0.65vw, 0.62rem)', fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ac-magenta)', textTransform: 'uppercase' }}>
          VISUAL.LAB
        </span>
      </a>

      {/* Copy */}
      <div className="shell" style={{ position: 'relative', zIndex: 3 }}>
        <div style={{ maxWidth: 'min(100%, 900px)' }}>
          <p
            data-reveal
            className="t-label"
            data-safe="body"
            style={{ color: 'var(--eyebrow)', marginBottom: 'clamp(1.5rem, 3vh, 2.5rem)' }}
          >
            공간 경험 디자인 스튜디오
          </p>
          <h1
            className="t-hero"
            style={{ marginBottom: 'clamp(1.75rem, 3.5vh, 3rem)' }}
          >
            {/* 의미 라인마다 안전영역. 블록 하나로 묶으면 큰 사각 암부가 생기고
                글자 사이에 밝은 입자가 끼는 것도 막지 못한다. */}
            <span data-reveal data-safe="headline" style={{ display: 'block' }}>상상을</span>
            <span data-reveal data-safe="headline" style={{ display: 'block' }}>
              살아있는 <span className="hl-champagne">공간 경험</span>으로
            </span>
            <span data-reveal data-safe="headline" style={{ display: 'block' }}>디자인합니다.</span>
          </h1>
          <p
            data-reveal
            className="t-body"
            data-safe="body"
            style={{ maxWidth: '42ch', marginBottom: 'clamp(2.5rem, 5vh, 4.5rem)' }}
          >
            콘텐츠·미디어·AI를 연결해
            <br />
            사람에게 반응하고 이야기를 이어가는 공간을 만듭니다.
          </p>
          <Link
            href="#works"
            data-reveal
            data-safe="cta"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              fontSize: 'clamp(0.82rem, 1vw, 0.92rem)', fontWeight: 700,
              color: 'var(--text)', textDecoration: 'none',
              borderBottom: '1px solid rgba(200,130,190,0.4)',
              paddingBottom: '3px', transition: 'color 0.3s, border-color 0.3s',
            }}
          >
            대표 프로젝트 보기 →
          </Link>
        </div>
      </div>

      {/* Scroll hint */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: 'clamp(24px, 4vh, 40px)',
          right: 'max(var(--gutter), env(safe-area-inset-right))',
          zIndex: 5, display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: 0.3,
        }}
      >
        <span className="t-label" style={{ fontSize: '0.6rem' }}>SCROLL</span>
        <span style={{ animation: 'scrollDown 2s ease-in-out infinite' }}>↓</span>
      </div>
    </section>
  )
}
