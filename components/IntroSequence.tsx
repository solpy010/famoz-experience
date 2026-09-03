'use client'
import { useRef, useEffect, useCallback, useState } from 'react'

interface Props {
  onEntered: () => void
}

export default function IntroSequence({ onEntered }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [triggered, setTriggered] = useState(false)

  // Ambient particle field around logo
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const COUNT = window.innerWidth < 768 ? 35 : 70
    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; da: number; converge: boolean }
    const cx = () => canvas.width / 2
    const cy = () => canvas.height / 2

    const particles: P[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.6 + 0.4,
      a: Math.random() * 0.3 + 0.05,
      da: (Math.random() - 0.5) * 0.004,
      converge: false,
    }))

    let converging = false

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        if (converging) {
          // Pull toward center
          const dx = cx() - p.x
          const dy = cy() - p.y
          p.vx += dx * 0.002
          p.vy += dy * 0.002
          p.a = Math.min(0.8, p.a + 0.01)
        } else {
          p.a = Math.max(0.05, Math.min(0.45, p.a + p.da))
          if (p.a <= 0.05 || p.a >= 0.45) p.da *= -1
        }

        p.vx *= 0.97
        p.vy *= 0.97
        p.x += p.vx
        p.y += p.vy

        // Wrap
        if (!converging) {
          if (p.x < -10) p.x = canvas.width + 10
          if (p.x > canvas.width + 10) p.x = -10
          if (p.y < -10) p.y = canvas.height + 10
          if (p.y > canvas.height + 10) p.y = -10
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(192,122,181,${p.a})`
        ctx.fill()
      })

      raf = requestAnimationFrame(draw)
    }
    draw()

    // Expose converge trigger
    ;(canvas as unknown as { startConverge: () => void }).startConverge = () => { converging = true }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const enter = useCallback(() => {
    if (triggered) return
    setTriggered(true)

    const logo = logoRef.current
    const overlay = overlayRef.current
    const hint = hintRef.current
    const canvas = canvasRef.current

    // Start particle convergence
    if (canvas) {
      ;(canvas as unknown as { startConverge: () => void }).startConverge?.()
    }

    if (hint) {
      hint.style.opacity = '0'
    }

    if (!logo) { onEntered(); return }

    // FLIP animation: measure current position
    const first = logo.getBoundingClientRect()
    const cx = first.left + first.width / 2
    const cy_ = first.top + first.height / 2

    // Phase 1: logo brightens briefly (200ms)
    logo.style.filter = 'brightness(1.8) drop-shadow(0 0 20px rgba(192,122,181,0.8))'

    setTimeout(() => {
      logo.style.filter = 'brightness(1)'

      // Target nav position: top-left corner
      // HeroScene nav logo is at: top=clamp(24px,4vh,44px), left=max(gutter,safe-area)
      const gutter = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter').trim()) || 24
      const navTop = Math.min(Math.max(24, window.innerHeight * 0.04), 44)
      const navLeft = Math.max(gutter, 24)

      // Target center of nav logo (approximate: ~60px wide, ~28px tall)
      const targetCX = navLeft + 40
      const targetCY = navTop + 14
      const scale = 0.28 // nav logo is much smaller

      // Compute translation needed (from -50%,-50% transform origin = logo center)
      const dx = targetCX - cx
      const dy = targetCY - cy_

      // Apply transition
      logo.style.transition = 'transform 1.1s cubic-bezier(0.16, 1, 0.3, 1), filter 0.3s ease, opacity 0.4s ease 0.75s'
      logo.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${scale})`
      logo.style.opacity = '0'
    }, 220)

    // Fade overlay
    setTimeout(() => {
      if (overlay) {
        overlay.style.opacity = '0'
        overlay.style.pointerEvents = 'none'
      }
    }, 450)

    // Complete
    setTimeout(() => {
      onEntered()
    }, 1300)
  }, [triggered, onEntered])

  // Input listeners
  useEffect(() => {
    const onWheel = (e: WheelEvent) => { if (e.deltaY > 0) enter() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') enter() }
    const onTouch = () => enter()

    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('keydown', onKey)
    window.addEventListener('touchstart', onTouch, { passive: true })

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('touchstart', onTouch)
    }
  }, [enter])

  return (
    <>
      {/* Canvas particle field */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9500,
          pointerEvents: 'none',
          transition: 'opacity 0.8s ease 0.3s',
          opacity: triggered ? 0 : 1,
        }}
      />

      {/* Overlay background */}
      <div
        ref={overlayRef}
        id="intro-overlay"
        aria-hidden="true"
        data-resource-slot="intro-scroll-film"
        data-poster-slot="oz-portal-poster"
        style={{ transition: 'opacity 0.8s ease' }}
      />

      {/* Logo — FLIP animated */}
      <div
        ref={logoRef}
        id="intro-logo"
        role="button"
        tabIndex={0}
        aria-label="FAMOZ 홈페이지 진입"
        onClick={enter}
        onKeyDown={(e) => { if (e.key === 'Enter') enter() }}
        style={{ transition: 'filter 0.3s ease' }}
      >
        <span className="logo-name">FAMOZ</span>
        <span className="logo-sub">VISUAL.LAB</span>
      </div>

      {/* Enter hint */}
      <div ref={hintRef} id="intro-hint" style={{ transition: 'opacity 0.5s ease' }}>
        SCROLL OR CLICK TO ENTER
      </div>
    </>
  )
}
