'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import ResourceSlot from './ResourceSlot'
import { subscribeScroll } from './scrollBus'
import { EXPERIENCE_CHAPTERS } from '@/content/experienceManifest'

/* 카피·역할·번호·강조색은 manifest가 단일 소스다.
   여기에는 장면의 시각 자산만 남긴다. */
const SCENE_VISUALS = {
  dorothy:   { mascot: '/mascot/dorothy.png',   background: '/scenes/idea.webp',    wash: 'rgba(196, 93, 87, .22)',  assetSlot: 'dorothy-environment' },
  scaremuse: { mascot: '/mascot/scarecrow.png', background: '/scenes/visitor.webp', wash: 'rgba(29, 102, 126, .25)', assetSlot: 'scaremuse-transition' },
  roarlink:  { mascot: '/mascot/lion.png',      background: '/scenes/memory.webp',  wash: 'rgba(196, 93, 87, .22)',  assetSlot: 'roarlink-transition' },
  tinai:     { mascot: '/mascot/robot.png',     background: '/scenes/ai.webp',      wash: 'rgba(75, 93, 205, .26)',  assetSlot: 'tinai-transition' },
} as const

type SceneId = keyof typeof SCENE_VISUALS

const SCENES = EXPERIENCE_CHAPTERS
  .filter((chapter): chapter is typeof chapter & { id: SceneId; character: string } =>
    chapter.id in SCENE_VISUALS && Boolean(chapter.character))
  .map((chapter) => ({
    id: chapter.id,
    name: chapter.character,
    role: chapter.role,
    number: chapter.number,
    headline: chapter.headline,
    desc: chapter.description,
    accent: chapter.accent,
    ...SCENE_VISUALS[chapter.id],
  }))

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
              <ResourceSlot id={scene.assetSlot} className="mascot-background" active={weight > 0.02} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={scene.background} alt="" loading={index === 0 ? 'eager' : 'lazy'} decoding="async" />
              </ResourceSlot>
              <div className="mascot-safety" aria-hidden="true" />
              <div className="mascot-halo" aria-hidden="true" />
              <div className="mascot-copy">
                <div className="mascot-eyebrow"><span>{scene.number}</span><span>{scene.role}</span></div>
                <h2>{scene.headline.split('\n').map((line) => <span key={line}>{line}</span>)}</h2>
                <p>{scene.desc}</p>
              </div>
              <ResourceSlot id={scene.id === 'dorothy' ? 'dorothy-character' : 'character-group'} className="mascot-figure" active={weight > 0.02} aria-label={scene.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={scene.mascot} alt={`${scene.name} 캐릭터`} decoding="async" />
              </ResourceSlot>
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
