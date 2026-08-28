'use client'
import { useRef, useEffect, useState } from 'react'

interface Props {
  color1: string
  color2?: string
  opacity?: number
  mouseForce?: number
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function DistortionCanvasInner({ color1, color2, opacity = 1, mouseForce = 2 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const c1 = hexToRgb(color1)
    const c2 = color2 ? hexToRgb(color2) : { r: c1.r, g: c1.g, b: c1.b }

    // Particle tiers for volumetric look
    const COUNT_STAR = 600    // tiny dim stars — fill field
    const COUNT_GLOW = 120    // large glowing orbs — aurora columns
    const COUNT_NEBULA = 80   // scattered nebula clusters

    const SPRING_K = 0.055
    const DAMPING = 0.70
    const MOUSE_RADIUS = 260

    type Particle = {
      ox: number; oy: number
      x: number; y: number
      vx: number; vy: number
      r: number
      drift: number
      tier: 'star' | 'glow' | 'nebula'
      colT: number  // 0-1 color blend
    }

    let particles: Particle[] = []
    let w = 0, h = 0
    let raf = 0
    let t = 0
    // smooth mouse
    let smx = 0.5, smy = 0.5

    const resize = () => {
      w = canvas.width = canvas.offsetWidth * window.devicePixelRatio
      h = canvas.height = canvas.offsetHeight * window.devicePixelRatio

      const make = (tier: 'star' | 'glow' | 'nebula', count: number): Particle[] =>
        Array.from({ length: count }, () => {
          const ox = Math.random() * w
          const oy = Math.random() * h
          let r: number
          if (tier === 'star') r = 0.6 + Math.random() * 1.2
          else if (tier === 'glow') r = 8 + Math.random() * 22
          else r = 3 + Math.random() * 8
          return { ox, oy, x: ox, y: oy, vx: 0, vy: 0, r, drift: Math.random() * Math.PI * 2, tier, colT: Math.random() }
        })

      particles = [
        ...make('star', COUNT_STAR),
        ...make('glow', COUNT_GLOW),
        ...make('nebula', COUNT_NEBULA),
      ]
    }

    const loop = () => {
      t += 0.006
      const root = document.documentElement
      const px = parseFloat(root.style.getPropertyValue('--pointer-x') || '0')
      const py = parseFloat(root.style.getPropertyValue('--pointer-y') || '0')
      // smooth lerp
      smx += ((px + 0.5) * w - smx) * 0.08
      smy += ((py + 0.5) * h - smy) * 0.08

      ctx.clearRect(0, 0, w, h)

      // ── Draw glow particles first (bottom layer) ──
      for (const p of particles) {
        if (p.tier !== 'glow') continue

        const ambX = Math.sin(t * 0.35 + p.drift) * 1.8
        const ambY = Math.cos(t * 0.25 + p.drift * 1.1) * 1.4

        const dx = smx - p.x
        const dy = smy - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < MOUSE_RADIUS && dist > 0) {
          const strength = (1 - dist / MOUSE_RADIUS) ** 1.6 * mouseForce * 1.4
          p.vx -= (dx / dist) * strength
          p.vy -= (dy / dist) * strength
        }

        p.vx += (p.ox - p.x) * SPRING_K + ambX * 0.03
        p.vy += (p.oy - p.y) * SPRING_K + ambY * 0.03
        p.vx *= DAMPING
        p.vy *= DAMPING
        p.x += p.vx
        p.y += p.vy

        const displacement = Math.sqrt((p.x - p.ox) ** 2 + (p.y - p.oy) ** 2)
        const glow = Math.min(1, displacement / 60)

        const t_frac = p.colT + Math.sin(t * 0.3 + p.drift) * 0.2
        const tf = Math.max(0, Math.min(1, t_frac))
        const r = Math.round(c1.r + (c2.r - c1.r) * tf)
        const g = Math.round(c1.g + (c2.g - c1.g) * tf)
        const bv = Math.round(c1.b + (c2.b - c1.b) * tf)

        const baseAlpha = 0.04 + glow * 0.12
        const radius = p.r * (1 + glow * 1.5)

        // Soft radial gradient for aurora column feel
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3)
        grad.addColorStop(0, `rgba(${r},${g},${bv},${baseAlpha + 0.06})`)
        grad.addColorStop(0.4, `rgba(${r},${g},${bv},${baseAlpha})`)
        grad.addColorStop(1, `rgba(${r},${g},${bv},0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius * 3, 0, Math.PI * 2)
        ctx.fill()
      }

      // ── Nebula clusters (mid layer) ──
      for (const p of particles) {
        if (p.tier !== 'nebula') continue

        const ambX = Math.sin(t * 0.5 + p.drift) * 0.8
        const ambY = Math.cos(t * 0.35 + p.drift * 1.4) * 0.6

        const dx = smx - p.x
        const dy = smy - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < MOUSE_RADIUS * 0.8 && dist > 0) {
          const strength = (1 - dist / (MOUSE_RADIUS * 0.8)) ** 2 * mouseForce
          p.vx -= (dx / dist) * strength * 0.9
          p.vy -= (dy / dist) * strength * 0.9
        }

        p.vx += (p.ox - p.x) * SPRING_K * 1.2 + ambX * 0.04
        p.vy += (p.oy - p.y) * SPRING_K * 1.2 + ambY * 0.04
        p.vx *= DAMPING + 0.04
        p.vy *= DAMPING + 0.04
        p.x += p.vx
        p.y += p.vy

        const displacement = Math.sqrt((p.x - p.ox) ** 2 + (p.y - p.oy) ** 2)
        const glow = Math.min(1, displacement / 40)

        const tf = Math.max(0, Math.min(1, p.colT + Math.sin(t * 0.4 + p.drift) * 0.3))
        const r = Math.round(c1.r + (c2.r - c1.r) * tf)
        const g = Math.round(c1.g + (c2.g - c1.g) * tf)
        const bv = Math.round(c1.b + (c2.b - c1.b) * tf)

        const alpha = 0.12 + glow * 0.3
        ctx.shadowColor = `rgba(${r},${g},${bv},${0.4 + glow * 0.4})`
        ctx.shadowBlur = p.r * (2 + glow * 4)
        ctx.fillStyle = `rgba(${r},${g},${bv},${alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * (0.8 + glow), 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // ── Constellation connections (between nearby stars) ──
      const CONNECT = 90
      const stars = particles.filter(p => p.tier === 'star')
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const a = stars[i], b = stars[j]
          const ddx = a.x - b.x, ddy = a.y - b.y
          const d = Math.sqrt(ddx * ddx + ddy * ddy)
          if (d < CONNECT) {
            const tf = (a.x / w + b.x / w) / 2
            const r = Math.round(c1.r + (c2.r - c1.r) * tf)
            const g = Math.round(c1.g + (c2.g - c1.g) * tf)
            const bv = Math.round(c1.b + (c2.b - c1.b) * tf)
            ctx.strokeStyle = `rgba(${r},${g},${bv},${(1 - d / CONNECT) * 0.22})`
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // ── Stars (top layer) ──
      for (const p of stars) {
        const ambX = Math.sin(t * 0.7 + p.drift) * 0.25
        const ambY = Math.cos(t * 0.5 + p.drift * 1.2) * 0.2

        const dx = smx - p.x
        const dy = smy - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < MOUSE_RADIUS * 0.9 && dist > 0) {
          const strength = (1 - dist / (MOUSE_RADIUS * 0.9)) ** 2 * mouseForce * 1.1
          p.vx -= (dx / dist) * strength
          p.vy -= (dy / dist) * strength
        }

        p.vx += (p.ox - p.x) * SPRING_K * 1.3 + ambX * 0.05
        p.vy += (p.oy - p.y) * SPRING_K * 1.3 + ambY * 0.05
        p.vx *= DAMPING + 0.05
        p.vy *= DAMPING + 0.05
        p.x += p.vx
        p.y += p.vy

        const displacement = Math.sqrt((p.x - p.ox) ** 2 + (p.y - p.oy) ** 2)
        const glow = Math.min(1, displacement / 25)

        const tf = Math.max(0, Math.min(1, p.x / w))
        const r = Math.round(c1.r + (c2.r - c1.r) * tf)
        const g = Math.round(c1.g + (c2.g - c1.g) * tf)
        const bv = Math.round(c1.b + (c2.b - c1.b) * tf)
        const alpha = 0.3 + glow * 0.65

        if (glow > 0.12) {
          ctx.shadowColor = `rgba(${r},${g},${bv},0.8)`
          ctx.shadowBlur = 6 * glow
        } else {
          ctx.shadowBlur = 0
        }

        ctx.fillStyle = `rgba(${r},${g},${bv},${alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r + glow * 1.8, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      raf = requestAnimationFrame(loop)
    }

    resize()
    loop()
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [color1, color2, mouseForce])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        opacity,
      }}
    />
  )
}


/**
 * 뷰포트 근처일 때만 캔버스를 마운트한다.
 *
 * 이 컴포넌트는 세 섹션에 항상 붙어 있어 Hero를 보는 동안에도 canvas 3개와
 * RAF 3개를 점유하고 있었다. 통합 목표인 "안정 상태 Canvas 1개"를 위해
 * IntersectionObserver로 게이트한다. 언마운트 시 내부 훅의 cleanup이
 * RAF와 리스너를 정리한다.
 */
export default function DistortionCanvas(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => setNear(e.isIntersecting),
      { rootMargin: '25% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={hostRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {near && <DistortionCanvasInner {...props} />}
    </div>
  )
}
