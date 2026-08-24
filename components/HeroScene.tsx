'use client'
import { useRef, useEffect } from 'react'
import Link from 'next/link'

function useParticleCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    const COUNT = window.innerWidth < 768 ? 35 : 90
    const W = () => canvas.width
    const H = () => canvas.height

    const resize = () => {
      canvas.width = canvas.offsetWidth * Math.min(devicePixelRatio, 2)
      canvas.height = canvas.offsetHeight * Math.min(devicePixelRatio, 2)
    }
    resize()
    window.addEventListener('resize', resize)

    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; da: number }
    const particles: P[] = Array.from({ length: COUNT }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00015,
      vy: (Math.random() - 0.5) * 0.0001,
      r: Math.random() * 1.8 + 0.6,
      a: Math.random() * 0.45 + 0.08,
      da: (Math.random() - 0.5) * 0.003,
    }))

    let mouse = { x: 0.5, y: 0.5 }
    const onMouse = (e: MouseEvent) => { mouse = { x: e.clientX / innerWidth, y: e.clientY / innerHeight } }
    window.addEventListener('mousemove', onMouse)

    const draw = () => {
      ctx.clearRect(0, 0, W(), H())

      // Beam — deep plum
      const beam = ctx.createRadialGradient(W() * 0.7, H() * 0.2, 0, W() * 0.7, H() * 0.2, W() * 0.65)
      beam.addColorStop(0, 'rgba(80,20,120,0.12)')
      beam.addColorStop(1, 'transparent')
      ctx.fillStyle = beam
      ctx.fillRect(0, 0, W(), H())

      // Architectural lines
      ;[0.18, 0.44, 0.79].forEach((x, i) => {
        const g = ctx.createLinearGradient(0, 0, 0, H())
        g.addColorStop(0, 'transparent')
        g.addColorStop(0.35, `rgba(170,90,210,${[0.07, 0.04, 0.05][i]})`)
        g.addColorStop(1, 'transparent')
        ctx.strokeStyle = g
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(W() * x, 0)
        ctx.lineTo(W() * x, H())
        ctx.stroke()
      })

      particles.forEach((p) => {
        p.vx += (mouse.x - p.x) * 0.000008
        p.vy += (mouse.y - p.y) * 0.000005
        p.vx *= 0.998; p.vy *= 0.998
        p.x = (p.x + p.vx + 1) % 1
        p.y = (p.y + p.vy + 1) % 1
        p.a = Math.max(0.05, Math.min(0.6, p.a + p.da))
        if (p.a <= 0.05 || p.a >= 0.6) p.da *= -1
        ctx.beginPath()
        ctx.arc(p.x * W(), p.y * H(), p.r * Math.min(devicePixelRatio, 2), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(192,122,181,${p.a})`
        ctx.fill()
      })

      raf = requestAnimationFrame(draw)
    }

    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { raf || draw() } else { cancelAnimationFrame(raf); raf = 0 } }, { threshold: 0 })
    io.observe(canvas)
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouse)
      io.disconnect()
    }
  }, [canvasRef])
}

interface Props { introComplete?: boolean }

export default function HeroScene({ introComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useParticleCanvas(canvasRef)

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
        background: 'var(--black)',
        overflow: 'hidden',
      }}
    >
      {/* Layer 1 — Far: deep gradient (moves 4px with pointer) */}
      <div
        aria-hidden="true"
        className="px-far"
        style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 70% 65% at 70% 20%, rgba(40,8,70,0.85) 0%, transparent 65%),
            radial-gradient(ellipse 50% 60% at 15% 85%, rgba(12,4,30,0.7) 0%, transparent 60%)
          `,
        }}
      />

      {/* Layer 2 — Mid: canvas particle field (moves 10px with pointer) */}
      <div
        aria-hidden="true"
        className="px-mid"
        style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}
      >
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      </div>

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
            style={{ color: 'var(--ac-magenta)', marginBottom: 'clamp(1.5rem, 3vh, 2.5rem)' }}
          >
            공간 경험 디자인 스튜디오
          </p>
          <h1
            className="t-hero"
            style={{ marginBottom: 'clamp(1.75rem, 3.5vh, 3rem)' }}
          >
            <span data-reveal style={{ display: 'block' }}>상상을</span>
            <span data-reveal style={{ display: 'block' }}>
              <span className="kw-glitch grd-magenta" data-text="살아있는 공간 경험">살아있는 공간 경험</span>으로
            </span>
            <span data-reveal style={{ display: 'block' }}>디자인합니다.</span>
          </h1>
          <p
            data-reveal
            className="t-body"
            style={{ maxWidth: '42ch', marginBottom: 'clamp(2.5rem, 5vh, 4.5rem)' }}
          >
            콘텐츠·미디어·AI를 연결해
            <br />
            사람에게 반응하고 이야기를 이어가는 공간을 만듭니다.
          </p>
          <Link
            href="#works"
            data-reveal
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
