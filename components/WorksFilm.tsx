'use client'
import { useState } from 'react'

type FilmItem = {
  seed: string
  title: string
  desc: string
  tags: string[]
  size: 'feature' | 'secondary'
  themeColor: string // unique project color for bleed effect
}

const films: FilmItem[] = [
  {
    seed: 'osaka-expo2025-main/1920/1080',
    title: '2025 오사카·간사이 엑스포 한국관',
    desc: '국가관의 메시지를 다면 미디어 장면으로 구현했습니다.',
    tags: ['공간 연출', '영상 콘텐츠', '관람 경험'],
    size: 'feature',
    themeColor: 'rgba(61,201,146,0.15)',
  },
  {
    seed: 'apec-light2025/960/720',
    title: 'APEC 2025 미디어아트 빛광장',
    desc: '미디어와 빛을 연결해 광장 전체를 하나의 장면으로 구성했습니다.',
    tags: ['미디어아트', '빛·영상 동기화'],
    size: 'secondary',
    themeColor: 'rgba(82,191,255,0.15)',
  },
  {
    seed: 'sports-monster-01/960/720',
    title: 'SPORTS MONSTER',
    desc: '움직임을 실시간 콘텐츠와 연결해 반복 가능한 체험을 구현했습니다.',
    tags: ['인터랙티브', '게임 연출'],
    size: 'secondary',
    themeColor: 'rgba(232,149,90,0.15)',
  },
  {
    seed: 'media-forest-famoz/1920/900',
    title: 'MEDIA FOREST',
    desc: '자연의 흐름과 미디어를 연결한 감응형 공간을 디자인했습니다.',
    tags: ['자연형 미디어', '생성 그래픽'],
    size: 'secondary',
    themeColor: 'rgba(61,201,146,0.12)',
  },
  {
    seed: 'smart-hospital-ai/960/720',
    title: 'SMART HOSPITAL AI',
    desc: '이동 맥락에 맞춰 필요한 정보를 안내하는 공간 서비스를 설계합니다.',
    tags: ['AI 안내', '동선 서비스'],
    size: 'secondary',
    themeColor: 'rgba(200,160,200,0.15)',
  },
  {
    seed: 'immersive-room-famoz/960/720',
    title: '몰입형 미디어 전시관',
    desc: '360도 미디어 환경 안에서 이야기가 관람객을 감싸는 공간을 완성했습니다.',
    tags: ['몰입형 전시', '미디어 파사드'],
    size: 'secondary',
    themeColor: 'rgba(192,122,181,0.18)',
  },
]

function FilmCard({ film, paired }: { film: FilmItem; paired?: boolean }) {
  const [hovered, setHovered] = useState(false)
  const height = film.size === 'feature' ? 'clamp(55vh, 85vh, 95vh)' : 'clamp(45vh, 65vh, 75vh)'

  return (
    <div
      data-reveal
      className="film-item"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', width: '100%', height, overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}
    >
      {/* Project color bleed — unique per project */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: `radial-gradient(ellipse 80% 80% at 30% 60%, ${film.themeColor} 0%, transparent 70%)`,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.8s ease',
        }}
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="film-img"
        src={`https://picsum.photos/seed/${film.seed}`}
        alt={film.title}
        loading="lazy"
        decoding="async"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* Gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'linear-gradient(to top, rgba(8,8,8,0.9) 0%, rgba(8,8,8,0.3) 40%, transparent 70%)' }} />

      {/* Info */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3,
          padding: paired
            ? 'clamp(1.25rem, 3vw, 2rem) clamp(1.5rem, 4vw, 3rem)'
            : 'clamp(1.5rem, 4vw, 3rem) var(--gutter)',
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {film.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--ac-gold)', padding: '0.2rem 0.7rem',
                border: '1px solid rgba(200,160,64,0.25)', borderRadius: '100px',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        <h3
          style={{
            fontSize: paired ? 'clamp(1.1rem, 2.5vw, 2rem)' : 'clamp(1.3rem, 3.5vw, 3rem)',
            fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1, color: 'var(--text)',
          }}
        >
          {film.title}
        </h3>
        <p style={{ fontSize: 'clamp(0.82rem, 1vw, 0.95rem)', color: 'rgba(237,232,224,0.55)', maxWidth: '48ch' }}>
          {film.desc}
        </p>
      </div>
    </div>
  )
}

export default function WorksFilm() {
  const feature1 = films[0]
  const pair1 = films.slice(1, 3)
  const feature2 = films[3]
  const pair2 = films.slice(4, 6)
  const sep = <div style={{ height: '1px', background: 'rgba(255,255,255,0.04)' }} />

  return (
    <section id="works" style={{ background: '#0a0a0a', paddingTop: 'var(--section-gap)' }}>
      {/* Header */}
      <div className="shell" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        <p data-reveal className="t-label" style={{ color: 'var(--ac-gold)', marginBottom: 'clamp(1.25rem, 2.5vh, 2rem)' }}>
          SELECTED WORKS
        </p>
        <h2 data-reveal className="t-scene" style={{ maxWidth: '18ch', transitionDelay: '0.12s' }}>
          각 공간의 목적을
          <br />
          <span className="grd-gold kw-light is-visible">기억에 남는 장면</span>으로
          <br />
          완성합니다.
        </h2>
      </div>

      <FilmCard film={feature1} />
      {sep}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))' }}>
        {pair1.map((f) => <FilmCard key={f.seed} film={f} paired />)}
      </div>
      {sep}
      <FilmCard film={feature2} />
      {sep}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))' }}>
        {pair2.map((f) => <FilmCard key={f.seed} film={f} paired />)}
      </div>
    </section>
  )
}
