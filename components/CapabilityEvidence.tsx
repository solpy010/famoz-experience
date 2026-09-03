import { EXPERIENCE_CHAPTERS } from '@/content/experienceManifest'
import { PROJECTS } from './WorksFilm'

/**
 * 역량 + 증거. MascotScene·WhatWeCreate·ValueScene·PublicValue 네 섹션이
 * 같은 선언을 세 번 반복하던 16.4화면을 대체한다.
 *
 * 네 역량 모두 같은 정보 문법을 쓴다 (IA §6-4):
 *   역량명 → 파모즈가 한 일 → 실제 프로젝트 이미지 → 산출물·기술 → 상세 진입
 * "고객의 문제"는 확인된 문장이 없어 비워 둔다. manifest의 problem이 채워지면
 * 자동으로 나타난다.
 *
 * 미술 사건과 색조는 역량마다 고유하게 유지한다 (accent). 파티클 공간은
 * 공유 캔버스가 계속 담당하므로 여기서는 DOM만 얹는다.
 */

const CHARACTERS: Record<string, string> = {
  dorothy: '/mascot/dorothy.png',
  scaremuse: '/mascot/scarecrow.png',
  roarlink: '/mascot/lion.png',
  tinai: '/mascot/robot.png',
}

const capabilities = EXPERIENCE_CHAPTERS.filter((c) => c.character)

export default function CapabilityEvidence() {
  return (
    <section id="capabilities" className="cap" aria-labelledby="cap-title">
      <div className="shell" data-guard>
        <p className="t-label">CAPABILITIES</p>
        <h2 id="cap-title" className="t-scene">
          네 가지 역량이 하나의 공간 경험으로 이어집니다.
        </h2>
      </div>

      <div className="cap-list">
        {capabilities.map((cap, index) => {
          const evidence = (cap.evidenceProjects ?? [])
            .map((id) => PROJECTS.find((p) => p.id === id))
            .filter((p): p is NonNullable<typeof p> => Boolean(p))

          return (
            <article
              key={cap.id}
              id={`chapter-${cap.id}`}
              className="cap-item"
              data-experience-chapter={cap.id}
              style={{ '--cap-accent': cap.accent } as React.CSSProperties}
            >
              <div className="shell cap-item__grid">
                <div className="cap-item__copy" data-guard>
                  <p className="cap-item__eyebrow">
                    <span>{cap.number}</span><span>{cap.role}</span>
                  </p>
                  <h3 className="t-scene">
                    {cap.headline.split('\n').map((line) => <span key={line}>{line}</span>)}
                  </h3>
                  {cap.problem && <p className="cap-item__problem">{cap.problem}</p>}
                  <p className="t-body">{cap.description}</p>

                  {evidence.length > 0 && (
                    <ul className="cap-item__tags">
                      {[...new Set(evidence.flatMap((p) => p.tags))].slice(0, 5)
                        .map((tag) => <li key={tag}>{tag}</li>)}
                    </ul>
                  )}

                  <a className="cap-item__more" href="#works">
                    관련 프로젝트 보기 <span aria-hidden="true">→</span>
                  </a>
                </div>

                <div className="cap-item__evidence">
                  {evidence.map((project) => (
                    <a key={project.id} href="#works" className="cap-shot">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={project.images[0].src}
                        alt={project.images[0].alt}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                        style={{ objectPosition: project.images[0].focal.desktop }}
                      />
                      <span>
                        <strong>{project.title}</strong>
                        <em>{project.field}</em>
                        {project.famozRole && <b>{project.famozRole}</b>}
                      </span>
                    </a>
                  ))}
                  {/* 캐릭터는 선택의 표지판이지 주인공이 아니다 (IA §6-3) */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="cap-item__guide" src={CHARACTERS[cap.id]} alt={`${cap.character} 안내 캐릭터`} loading="lazy" decoding="async" />
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
