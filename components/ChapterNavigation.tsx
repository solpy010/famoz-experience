'use client'

import { useEffect, useRef, useState } from 'react'
import { subscribeScroll } from './scrollBus'

const ITEMS = [
  { id: 'portal', number: '00', label: 'OZ' },
  { id: 'chapter-dorothy', number: '01', label: 'Design' },
  { id: 'chapter-scaremuse', number: '02', label: 'Immersive' },
  { id: 'chapter-roarlink', number: '03', label: 'Interactive' },
  { id: 'chapter-tinai', number: '04', label: 'AI' },
  { id: 'works', number: '05', label: 'Works' },
  { id: 'ending', number: '06', label: 'Contact' },
] as const

export default function ChapterNavigation({ visible }: { visible: boolean }) {
  const [activeId, setActiveId] = useState<string>('portal')
  const activeRef = useRef<string>(activeId)

  useEffect(() => subscribeScroll(() => {
    const y = scrollY + innerHeight * .46
    let nearest: string = ITEMS[0].id
    for (const item of ITEMS) {
      const element = document.getElementById(item.id)
      const documentTop = element ? element.getBoundingClientRect().top + scrollY : Number.POSITIVE_INFINITY
      if (documentTop <= y) nearest = item.id
    }
    if (nearest !== activeRef.current) {
      activeRef.current = nearest
      setActiveId(nearest)
    }
  }), [])

  return (
    <nav className={`chapter-nav${visible ? ' is-visible' : ''}`} aria-label="페이지 장면 이동">
      {ITEMS.map((item) => (
        <a key={item.id} href={`#${item.id}`} className={activeId === item.id ? 'is-active' : undefined} aria-current={activeId === item.id ? 'location' : undefined}>
          <span>{item.number}</span><em>{item.label}</em>
        </a>
      ))}
    </nav>
  )
}
