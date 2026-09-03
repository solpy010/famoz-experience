import Link from 'next/link'
import { EXPERIENCE_ASSETS, EXPERIENCE_CHAPTERS } from '@/content/experienceManifest'

const kindLabel = { video: '영상', image: '이미지', 'image-sequence': 'PNG 시퀀스' }
const statusLabel = { needed: '제작 필요', existing: '기존 자산', optional: '선택 제작' }

export const metadata = {
  title: 'FAMOZ Experience Resource Guide',
  robots: { index: false, follow: false },
}

export default function ResourceGuidePage() {
  return (
    <main className="resource-guide">
      <header className="resource-guide__header">
        <Link href="/" className="resource-guide__brand">FAMOZ <span>EXPERIENCE MAP</span></Link>
        <p className="resource-guide__kicker">RESOURCE CONTRACT · V1</p>
        <h1>세계관을 담을 자리를<br />먼저 확정했습니다.</h1>
        <p className="resource-guide__lead">
          기존 WebGL·파티클·실적 구조를 유지하고, 아래 슬롯에 자산을 순서대로 연결합니다.
          영상 안에는 문구를 넣지 않고 홈페이지의 DOM 타이포그래피를 사용합니다.
        </p>
      </header>

      <section className="resource-guide__journey" aria-labelledby="journey-title">
        <div className="resource-guide__section-heading">
          <p>01 · EXPERIENCE STRUCTURE</p>
          <h2 id="journey-title">확정된 여정</h2>
        </div>
        <ol>
          {EXPERIENCE_CHAPTERS.map((chapter) => (
            <li key={chapter.id} style={{ '--slot-accent': chapter.accent } as React.CSSProperties}>
              <span>{chapter.number}</span>
              <div>
                <p>{chapter.character ? `${chapter.character} · ` : ''}{chapter.role}</p>
                <h3>{chapter.headline}</h3>
                <small>{chapter.description}</small>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="asset-title">
        <div className="resource-guide__section-heading">
          <p>02 · ASSET SLOTS</p>
          <h2 id="asset-title">필요한 리소스</h2>
        </div>
        <div className="resource-guide__grid">
          {EXPERIENCE_ASSETS.map((asset, index) => (
            <article key={asset.id} id={asset.id} className="resource-slot-card">
              <div className="resource-slot-card__preview" aria-hidden="true">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{asset.chapter}</strong>
                <small>{asset.desktop}</small>
              </div>
              <div className="resource-slot-card__title">
                <div>
                  <p>{asset.placement}</p>
                  <h3>{asset.deliveryName}</h3>
                </div>
                <span>{statusLabel[asset.status]}</span>
              </div>
              <dl>
                <div><dt>유형</dt><dd>{kindLabel[asset.kind]}{asset.duration ? ` · ${asset.duration}` : ''}</dd></div>
                <div><dt>데스크톱</dt><dd>{asset.desktop}</dd></div>
                <div><dt>모바일</dt><dd>{asset.mobile}</dd></div>
                <div><dt>형식</dt><dd>{asset.format}</dd></div>
                <div><dt>용량</dt><dd>{asset.maxSize}</dd></div>
                <div><dt>연출</dt><dd>{asset.direction}</dd></div>
                <div><dt>안전영역</dt><dd>{asset.safeArea}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="resource-guide__delivery" aria-labelledby="delivery-title">
        <div className="resource-guide__section-heading">
          <p>03 · DELIVERY ORDER</p>
          <h2 id="delivery-title">전달 우선순위</h2>
        </div>
        <ol>
          <li><strong>1차</strong><span>인트로 영상 + OZ 문 포스터</span></li>
          <li><strong>2차</strong><span>도로시 배경·캐릭터 + 나머지 캐릭터 분리본</span></li>
          <li><strong>3차</strong><span>ScareMuse·RoarLink·TinAI 전환 영상과 포스터</span></li>
          <li><strong>4차</strong><span>마지막 제작 현장 풀백 영상</span></li>
          <li><strong>선택</strong><span>세계관과 실적을 연결하는 쇼릴 브리지</span></li>
        </ol>
      </section>
    </main>
  )
}
