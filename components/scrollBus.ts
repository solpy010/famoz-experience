'use client'

type ScrollSubscriber = () => void

const subscribers = new Set<ScrollSubscriber>()
let frame = 0
let listening = false

function flush() {
  frame = 0
  subscribers.forEach((subscriber) => subscriber())
}

function onScroll() {
  if (!frame) frame = window.requestAnimationFrame(flush)
}

export function subscribeScroll(subscriber: ScrollSubscriber) {
  subscribers.add(subscriber)
  if (!listening) {
    window.addEventListener('scroll', onScroll, { passive: true })
    listening = true
  }
  subscriber()

  return () => {
    subscribers.delete(subscriber)
    if (subscribers.size === 0 && listening) {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
      frame = 0
      listening = false
    }
  }
}
