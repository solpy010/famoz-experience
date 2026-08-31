'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { subscribeScroll } from './scrollBus'

const SCENES = [
  { id: 'visitor', mascot: '/mascot/dorothy.png', background: '/scenes/visitor.webp', name: '도로시', role: '관람객 중심', number: '01', headline: '공간의 주인공은\n언제나 당신입니다.', desc: '모든 경험은 관람객 한 사람의 시선과 움직임에서 시작됩니다.', accent: '#ffb47f', wash: 'rgba(196, 93, 87, .22)' },
  { id: 'idea', mascot: '/mascot/scarecrow.png', background: '/scenes/idea.webp', name: '허수아비', role: '기획과 설계', number: '02', headline: '아이디어가\n공간을 설계합니다.', desc: '생각의 선이 동선이 되고, 이야기의 구조가 하나의 공간으로 확장됩니다.', accent: '#ffe086', wash: 'rgba(106, 114, 216, .24)' },
  { id: 'memory', mascot: '/mascot/lion.png', background: '/scenes/memory.webp', name: '사자', role: '몰입과 기억', number: '03', headline: '체험의 순간이\n기억이 됩니다.', desc: '몸으로 반응하고 감정으로 남는 순간을 오래 기억되는 장면으로 만듭니다.', accent: '#91efc8', wash: 'rgba(29, 102, 126, .25)' },
  { id: 'ai', mascot: '/mascot/robot.png', background: '/scenes/ai.webp', name: '로봇', role: 'AI와 진화', number: '04', headline: 'AI가 공간을\n진화시킵니다.', desc: '데이터와 맥락을 읽고 반응하며, 방문할 때마다 새롭게 살아나는 공간입니다.', accent: '#8fd8ff', wash: 'rgba(75, 93, 205, .26)' },
] as const

const STAGE_VH = 155
const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const smooth = (value: number) => { const t = clamp01(value); return t * t * (3 - 2 * t) }

export default function MascotScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef(-1)
  const [progress, setProgress] = useState(0)

  useEffect(() => subscribeScroll(() => {
    const element = containerRef.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    const total = Math.max(1, element.offsetHeight - window.innerHeight)
    const next = clamp01(-rect.top / total)
    if (Math.abs(next - progressRef.current) > 0.001) {
      progressRef.current = next
      setProgress(next)
    }
  }), [])

  const position = progress * (SCENES.length - 1)

  return (
    <div ref={containerRef} className="mascot-story" style={{ height: `${SCENES.length * STAGE_VH}vh` }}>
      <section className="mascot-stage" aria-label="파모즈가 만드는 네 가지 경험">
        {SCENES.map((scene, index) => {
          const weight = smooth(1 - Math.abs(position - index))
          const entering = clamp01(position - index + 1)
          const leaving = clamp01(position - index)
          const copyProgress = smooth(clamp01(entering * 1.55 - 0.22))
          const backgroundProgress = smooth(clamp01(entering * 1.35))
          const mascotProgress = smooth(clamp01(entering * 1.45 - 0.10))
          const vars = {
            '--scene-weight': weight, '--scene-accent': scene.accent, '--scene-wash': scene.wash,
            '--copy-progress': copyProgress, '--background-progress': backgroundProgress,
            '--mascot-progress': mascotProgress, '--scene-leave': leaving,
          } as CSSProperties

          return (
            <article className={`mascot-scene mascot-scene--${scene.id}`} key={scene.id} aria-hidden={weight < 0.05} style={vars}>
              <div className="mascot-background" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={scene.background} alt="" loading={index === 0 ? 'eager' : 'lazy'} decoding="async" />
              </div>
              <div className="mascot-safety" aria-hidden="true" />
              <div className="mascot-halo" aria-hidden="true" />
              <div className="mascot-copy">
                <div className="mascot-eyebrow"><span>{scene.number}</span><span>{scene.role}</span></div>
                <h2>{scene.headline.split('\n').map((line) => <span key={line}>{line}</span>)}</h2>
                <p>{scene.desc}</p>
              </div>
              <div className="mascot-figure" aria-label={scene.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={scene.mascot} alt={`${scene.name} 캐릭터`} decoding="async" />
              </div>
            </article>
          )
        })}
        <div className="mascot-progress" aria-hidden="true">
          {SCENES.map((scene, index) => <span key={scene.id} className={Math.abs(position - index) < .5 ? 'is-active' : ''} />)}
        </div>
      </section>
    </div>
  )
}
