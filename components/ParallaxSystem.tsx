'use client'
import { useEffect } from 'react'
import { subscribeScroll } from './scrollBus'

export default function ParallaxSystem() {
  useEffect(() => {
    // Pointer tracking with lerp
    const target = { x: 0, y: 0 }
    const current = { x: 0, y: 0 }
    let raf = 0
    const isMobile = window.matchMedia('(pointer: coarse)').matches
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!isMobile && !prefersReduced) {
      const loop = () => {
        current.x += (target.x - current.x) * 0.08
        current.y += (target.y - current.y) * 0.08
        document.documentElement.style.setProperty('--pointer-x', current.x.toFixed(4))
        document.documentElement.style.setProperty('--pointer-y', current.y.toFixed(4))
        const moving = Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > 0.0005
        raf = moving ? requestAnimationFrame(loop) : 0
      }
      const onPointer = (e: PointerEvent) => {
        target.x = e.clientX / innerWidth - 0.5
        target.y = e.clientY / innerHeight - 0.5
        if (!raf) raf = requestAnimationFrame(loop)
      }
      window.addEventListener('pointermove', onPointer, { passive: true })

      return () => {
        window.removeEventListener('pointermove', onPointer)
        cancelAnimationFrame(raf)
      }
    }

    // Mobile: scroll-based parallax
    if (isMobile && !prefersReduced) {
      const onScroll = () => {
        const progress = window.scrollY / (document.body.scrollHeight - innerHeight)
        document.documentElement.style.setProperty('--pointer-x', '0')
        document.documentElement.style.setProperty('--pointer-y', ((progress - 0.5) * 0.3).toFixed(4))
      }
      return subscribeScroll(onScroll)
    }
  }, [])

  // Intersection observer for [data-reveal] and .reveal elements
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            if (el.hasAttribute('data-reveal')) {
              el.classList.add('is-visible')
            } else {
              el.classList.add('in')
            }
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.12 }
    )

    const observe = () => {
      document.querySelectorAll('[data-reveal]:not(.is-visible)').forEach((el) => observer.observe(el))
      document.querySelectorAll('.reveal:not(.in)').forEach((el) => observer.observe(el))
    }

    // Initial scan + mutation observer for dynamic content
    observe()
    const mutation = new MutationObserver(observe)
    mutation.observe(document.body, { childList: true, subtree: true, attributes: false })

    return () => {
      observer.disconnect()
      mutation.disconnect()
    }
  }, [])

  return null
}
