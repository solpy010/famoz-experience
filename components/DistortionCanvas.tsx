'use client'

import { useEffect, useRef, useState } from 'react'

interface Props { color1: string; color2?: string; opacity?: number; mouseForce?: number }
type Dot = { ox: number; oy: number; x: number; y: number; vx: number; vy: number; size: number; depth: number; phase: number; mix: number }

function rgb(hex: string) {
  const value = hex.replace('#', '')
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)] as const
}

function DistortionCanvasInner({ color1, color2, opacity = 1, mouseForce = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const a = rgb(color1)
    const b = rgb(color2 ?? color1)
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = matchMedia('(pointer: coarse)').matches
    const count = coarse ? 210 : 420
    let dots: Dot[] = []
    let width = 1, height = 1, dpr = 1, raf = 0, time = 0
    let pointerX = .5, pointerY = .5, rawX = .5, rawY = .5
    const onPointer = (event: PointerEvent) => {
      rawX = event.clientX / innerWidth
      rawY = event.clientY / innerHeight
    }

    const resize = () => {
      dpr = Math.min(devicePixelRatio, 1)
      width = Math.max(1, canvas.offsetWidth)
      height = Math.max(1, canvas.offsetHeight)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      dots = Array.from({ length: count }, (_, index) => {
        const depth = (index % 9) / 8
        const ox = Math.random() * width
        const oy = Math.random() * height
        return { ox, oy, x: ox, y: oy, vx: 0, vy: 0, size: .45 + depth * 1.25, depth, phase: Math.random() * Math.PI * 2, mix: Math.random() }
      })
    }

    const frame = () => {
      time += .006
      const targetX = rawX * width
      const targetY = rawY * height
      pointerX += (targetX - pointerX) * .055
      pointerY += (targetY - pointerY) * .055
      ctx.clearRect(0, 0, width, height)

      for (const dot of dots) {
        const drift = .12 + dot.depth * .22
        const dx = pointerX - dot.x
        const dy = pointerY - dot.y
        const distance2 = dx * dx + dy * dy
        const radius = 120 + dot.depth * 70
        if (!reduced && distance2 < radius * radius && distance2 > 1) {
          const distance = Math.sqrt(distance2)
          const influence = (1 - distance / radius) ** 2 * mouseForce * (.08 + dot.depth * .15)
          dot.vx -= dx / distance * influence
          dot.vy -= dy / distance * influence
        }
        dot.vx += (dot.ox - dot.x) * .008 + Math.sin(time + dot.phase) * drift * .008
        dot.vy += (dot.oy - dot.y) * .008 + Math.cos(time * .78 + dot.phase) * drift * .007
        dot.vx *= .91
        dot.vy *= .91
        dot.x += dot.vx
        dot.y += dot.vy

        const mix = Math.max(0, Math.min(1, dot.mix + Math.sin(time * .35 + dot.phase) * .08))
        const r = Math.round(a[0] + (b[0] - a[0]) * mix)
        const g = Math.round(a[1] + (b[1] - a[1]) * mix)
        const blue = Math.round(a[2] + (b[2] - a[2]) * mix)
        const alpha = .12 + dot.depth * .28
        ctx.fillStyle = `rgba(${r},${g},${blue},${alpha})`
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(frame)
    }

    resize()
    frame()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointer, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
    }
  }, [color1, color2, mouseForce])

  return <canvas ref={canvasRef} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity }} />
}

export default function DistortionCanvas(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const element = hostRef.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: '12% 0px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return <div ref={hostRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>{near && <DistortionCanvasInner {...props} />}</div>
}
