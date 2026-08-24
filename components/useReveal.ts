'use client'
import { useEffect, useRef } from 'react'

export function useReveal() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('in')
          io.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -5% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return ref
}

export function useRevealAll(selector = '.reveal') {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(selector)
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -5% 0px' }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}
