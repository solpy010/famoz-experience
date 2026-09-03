'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { subscribeScroll } from './scrollBus'
import { EXPERIENCE_CHAPTERS } from '@/content/experienceManifest'

const SCENES = [
  { id: 'dorothy', mascot: '/mascot/dorothy.png', background: '/scenes/idea.webp', name: '도로시', role: 'PLANNING & DESIGN', number: '01', headline: '아이디어가\n공간을 설계합니다.', desc: '방문자의 여정을 관찰하고 콘텐츠·동선·매체를 하나의 경험 구조로 설계합니다.', accent: '#ffb47f', wash: 'rgba(196, 93, 87, .22)', assetSlot: 'dorothy-environment' },
  { id: 'scaremuse', mascot: '/mascot/scarecrow.png', background: '/scenes/visitor.webp', name: 'ScareMuse', role: 'IMMERSIVE MEDIA', number: '02', headline: '이야기가 공간 전체로\n펼쳐집니다.', desc: '영상·빛·사운드가 관람 동선과 만나 하나의 몰입 장면을 만듭니다.', accent: '#91efc8', wash: 'rgba(29, 102, 126, .25)', assetSlot: 'scaremuse-transition' },
  { id: 'roarlink', mascot: '/mascot/lion.png', background: '/scenes/memory.webp', name: 'RoarLink', role: 'INTERACTIVE MEDIA', number: '03', headline: '공간의 주인공은\n언제나 당신입니다.', desc: '사용자의 움직임과 선택이 공간을 작동시키고 새로운 장면을 엽니다.', accent: '#ffad66', wash: 'rgba(196, 93, 87, .22)', assetSlot: 'roarlink-transition' },
  { id: 'tinai', mascot: '/mascot/robot.png', background: '/scenes/ai.webp', name: 'TinAI', role: 'AI PRODUCTION & SOLUTION', number: '04', headline: 'AI가 공간을\n진화시킵니다.', desc: '행동을 감지하고 흐름을 해석해, 필요한 순간에 반응하는 공간을 만듭니다.', accent: '#8fd8ff', wash: 'rgba(75, 93, 205, .26)', assetSlot: 'tinai-transition' },
] as const

if (process.env.NODE_ENV !== 'production') {
  const chapterIds = new Set(EXPERIENCE_CHAPTERS.map((chapter) => chapter.id))
  SCENES.forEach((scene) => { if (!chapterIds.has(scene.id)) console.warn(`Unknown experience chapter: ${scene.id}`) })
}

const STAGE_VH = 155
const ANCHOR_STEP_VH = (SCENES.length * STAGE_VH - 100) / (SCENES.length - 1)
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
    <div id="mascot" ref={containerRef} className="mascot-story" style={{ height: `${SCENES.length * STAGE_VH}vh` }}>
      {SCENES.map((scene, index) => (
        <span
          key={`anchor-${scene.id}`}
          id={`chapter-${scene.id}`}
          className="mascot-chapter-anchor"
          style={{ top: `${index * ANCHOR_STEP_VH}vh` }}
          aria-hidden="true"
        />
      ))}
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
            <article className={`mascot-scene mascot-scene--${scene.id}`} key={scene.id} aria-hidden={weight < 0.05} style={vars} data-experience-chapter={scene.id}>
              <div className="mascot-background" aria-hidden="true" data-resource-slot={scene.assetSlot}>
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
              <div className="mascot-figure" aria-label={scene.name} data-resource-slot={scene.id === 'dorothy' ? 'dorothy-character' : 'character-group'}>
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
