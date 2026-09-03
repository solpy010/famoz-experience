'use client'

import { useEffect, useRef, useState } from 'react'
import { subscribeScroll } from './scrollBus'

/**
 * 일반적인 회사 사이트 고정 메뉴 (IA §7-1).
 * 챕터 번호 레일을 대체한다 — 방문자는 장면 번호가 아니라 섹션 이름을 찾는다.
 *
 * 스크롤 구독은 기존 scrollBus 하나만 쓴다.
 */

const ITEMS = [
  { id: 'about', label: 'About' },
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'works', label: 'Works' },
  { id: 'process', label: 'Process' },
  { id: 'ending', label: 'Contact' },
] as const

export default function SiteNav({ visible }: { visible: boolean }) {
  const [activeId, setActiveId] = useState<string>('')
  const [open, setOpen] = useState(false)
  const activeRef = useRef('')

  useEffect(() => subscribeScroll(() => {
    const line = scrollY + innerHeight * 0.4
    let nearest = ''
    for (const item of ITEMS) {
      const el = document.getElementById(item.id)
      if (el && el.getBoundingClientRect().top + scrollY <= line) nearest = item.id
    }
    if (nearest !== activeRef.current) {
      activeRef.current = nearest
      setActiveId(nearest)
    }
  }), [])

  // 메뉴를 고른 뒤에는 닫는다. 해시 이동은 브라우저에 맡긴다.
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    addEventListener('hashchange', close)
    return () => removeEventListener('hashchange', close)
  }, [open])

  return (
    <header className={`site-nav${visible ? ' is-visible' : ''}${open ? ' is-open' : ''}`}>
      <a className="site-nav__brand" href="#hero">
        FAMOZ<span>VISUAL.LAB</span>
      </a>

      <button
        type="button"
        className="site-nav__toggle"
        aria-expanded={open}
        aria-controls="site-nav-menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">{open ? '✕' : '☰'}</span>
        <span className="sr-only">메뉴 {open ? '닫기' : '열기'}</span>
      </button>

      <nav id="site-nav-menu" aria-label="주요 섹션">
        {ITEMS.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={activeId === item.id ? 'true' : undefined}
            className={activeId === item.id ? 'is-active' : undefined}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  )
}
