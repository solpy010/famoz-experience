import { EXPERIENCE_CHAPTERS } from '@/content/experienceManifest'

const CHARACTERS = {
  dorothy: '/mascot/dorothy.png',
  scaremuse: '/mascot/scarecrow.png',
  roarlink: '/mascot/lion.png',
  tinai: '/mascot/robot.png',
} as const

const chapters = EXPERIENCE_CHAPTERS.filter((chapter) => chapter.character)

/**
 * 세계관의 선택 허브. 기존 WebGL 공간 위에 DOM 탐색 구조만 추가한다.
 * oz-portal-poster가 도착하면 배경 슬롯에 연결하고, 현재 캐릭터 이미지는
 * 새 투명 원본이 도착할 때까지 레이아웃 폴백으로 유지한다.
 */
export default function OzPortalHub() {
  return (
    <section id="portal" className="oz-portal" data-experience-chapter="portal">
      <div className="oz-portal__media" aria-hidden="true" data-resource-slot="oz-portal-poster">
        <span className="oz-portal__aperture" />
      </div>

      <div className="shell oz-portal__layout" data-guard>
        <div className="oz-portal__copy">
          <p className="t-label">FANTASY AI · MEDIA OZ</p>
          <h2>하나의 공간,<br /><span>네 개의 가능성.</span></h2>
          <p>
            길을 선택해 각 역량으로 바로 들어가거나,
            스크롤을 이어 전체 경험을 순서대로 살펴보세요.
          </p>
          <a href="#chapter-dorothy" className="oz-portal__continue">첫 번째 공간으로 들어가기 <span>↓</span></a>
        </div>

        <nav className="oz-portal__routes" aria-label="FAMOZ 역량 공간 선택">
          {chapters.map((chapter) => (
            <a
              key={chapter.id}
              href={`#chapter-${chapter.id}`}
              className="oz-portal__route"
              style={{ '--route-accent': chapter.accent } as React.CSSProperties}
            >
              <span className="oz-portal__route-number">{chapter.number}</span>
              <span className="oz-portal__route-figure" data-resource-slot={chapter.id === 'dorothy' ? 'dorothy-character' : 'character-group'}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={CHARACTERS[chapter.id as keyof typeof CHARACTERS]} alt="" decoding="async" loading="lazy" />
              </span>
              <span className="oz-portal__route-copy">
                <small>{chapter.character}</small>
                <strong>{chapter.role}</strong>
                <em>{chapter.headline}</em>
              </span>
              <span className="oz-portal__route-arrow" aria-hidden="true">↘</span>
            </a>
          ))}
        </nav>
      </div>
    </section>
  )
}
