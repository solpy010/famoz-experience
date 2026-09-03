import { PROJECTS } from './WorksFilm'

/**
 * Hero 다음 한 화면 (IA §6-2). 방문자가 스크롤 19.6화면을 지나야 첫 증거를
 * 만나던 구조를 여기서 끊는다.
 *
 * 문장은 전부 기존 ValueScene·PublicValue·Hero에 있던 것을 그대로 옮겼다.
 * 새 문구나 수치를 만들지 않는다.
 */

/* ValueScene에 있던 네 축 */
const AXES = [
  { title: '이해하기 쉬워집니다', desc: '복잡한 정보가 감각으로 전달됩니다' },
  { title: '직접 참여하게 됩니다', desc: '관람객의 행동이 경험의 주체가 됩니다' },
  { title: '공간과 연결됩니다', desc: '장소가 관계로 기억됩니다' },
  { title: '오래 기억하게 됩니다', desc: '경험은 의미로 전환됩니다' },
]

/* Hero 보조 문구에 있던 수행 범위 */
const SCOPE = ['기획', '미디어 콘텐츠', '인터랙션', 'AI 프로덕션']

export default function CompanyProof() {
  const lead = PROJECTS[0]

  return (
    <section id="about" className="proof" aria-labelledby="proof-title">
      <div className="shell proof__grid">
        <div className="proof__copy" data-guard>
          <p className="t-label">WHAT FAMOZ DOES</p>
          <h2 id="proof-title" className="t-scene">
            <span>화려한 감상 장치를 넘어</span>
            <span>사람과 정보, 문화와 장소를 연결합니다.</span>
          </h2>
          <ul className="proof__scope" aria-label="수행 범위">
            {SCOPE.map((s) => <li key={s}>{s}</li>)}
          </ul>
          <ul className="proof__axes">
            {AXES.map((a) => (
              <li key={a.title}><strong>{a.title}</strong><span>{a.desc}</span></li>
            ))}
          </ul>
        </div>

        {/* 대표 프로젝트를 여기서 바로 보여준다 */}
        <a className="proof__lead" href="#works">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lead.images[0].src}
            alt={lead.images[0].alt}
            loading="eager"
            decoding="async"
            style={{ objectPosition: lead.images[0].focal.desktop }}
          />
          <span className="proof__lead-meta">
            <em>대표 프로젝트</em>
            <strong>{lead.title}</strong>
            <b>{lead.field}</b>
            <p>{lead.desc}</p>
            <i>프로젝트 전체 보기 →</i>
          </span>
        </a>
      </div>
    </section>
  )
}
