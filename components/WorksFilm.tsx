'use client'
import { useRef, useEffect, useState } from 'react'
import { subscribeScroll } from './scrollBus'

const EASE = 'cubic-bezier(0.4,0,0.2,1)'

type Project = {
  id: string
  title: string
  desc: string
  tags: string[]
  accent: string
  images: string[]
  // Desktop: always 'contain'. Mobile cover exceptions:
  // alwaysContain=true → contain even on mobile (flow diagrams, UI screenshots)
  // mobilePosition → object-position for cover mode on mobile
  alwaysContain?: boolean
  mobilePosition?: string  // e.g. 'center top', '50% 30%'
}

const PROJECTS: Project[] = [
  {
    id: 'expo',
    title: '2025 오사카·간사이 엑스포 한국관',
    desc: '국가관의 메시지를 다면 미디어 장면으로 구현. 관람객의 이동 경로에 따라 이야기가 순차적으로 펼쳐지는 공간 연출.',
    tags: ['공간 연출', '영상 콘텐츠', '관람 경험'],
    accent: '#3DC992',
    images: ['/works/expo-01.png', '/works/expo-02.png', '/works/expo-03.png'],
    mobilePosition: 'center center',
  },
  {
    id: 'apec',
    title: 'APEC 2025 미디어아트 빛광장',
    desc: '미디어와 빛을 연결해 광장 전체를 하나의 장면으로 구성. 자연 환경과 동기화된 실시간 빛의 흐름.',
    tags: ['미디어아트', '빛·영상 동기화', '공공 설치'],
    accent: '#52BFFF',
    images: ['/works/apec-01.png', '/works/apec-02.png', '/works/apec-03.png'],
    mobilePosition: 'center center',
  },
  {
    id: 'sports',
    title: 'SPORTS MONSTER',
    desc: '방문객의 움직임을 실시간 콘텐츠와 연결. 동작과 반응이 만드는 반복 가능한 체험 공간.',
    tags: ['인터랙티브', '게임 연출', '체험 설계'],
    accent: '#FF9A62',
    images: ['/works/sports-01.png', '/works/sports-02.png', '/works/sports-03.png', '/works/sports-04.png'],
    mobilePosition: 'center 30%',  // 핵심 액션 화면 상단부
  },
  {
    id: 'forest',
    title: 'MEDIA FOREST',
    desc: '자연의 흐름과 미디어를 연결한 감응형 공간. 관람객의 존재가 공간의 생태계를 변화시킵니다.',
    tags: ['자연형 미디어', '생성 그래픽', '몰입 환경'],
    accent: '#3DC992',
    images: ['/works/forest-01.png', '/works/forest-02.png', '/works/forest-03.png'],
    mobilePosition: 'center center',
  },
  {
    id: 'hospital',
    title: 'SMART HOSPITAL AI',
    desc: '이동 맥락에 맞춰 필요한 정보를 안내하는 공간 서비스. AI가 공간 안에서 사람의 필요를 먼저 인식합니다.',
    tags: ['AI 안내', '동선 서비스', '공간 지능'],
    accent: '#C07AB5',
    images: ['/works/hospital-01.png', '/works/hospital-02.png', '/works/hospital-03.png', '/works/hospital-04.png'],
    alwaysContain: true,  // 플로우 다이어그램 — 전체 보임 필수
  },
  {
    id: 'immersive',
    title: '몰입형 미디어 전시관',
    desc: '360도 미디어 환경 안에서 이야기가 관람객을 감싸는 공간. 벽과 천장, 바닥이 하나의 화면이 됩니다.',
    tags: ['몰입형 전시', '미디어 파사드', '360° 연출'],
    accent: '#C07AB5',
    images: ['/works/immersive-01.png', '/works/immersive-02.png', '/works/immersive-03.png', '/works/immersive-04.png'],
    mobilePosition: 'center 40%',  // 중앙 몰입 공간 강조
  },
]

// Total scroll = sum of (images.length * SLIDE_VH) per project + HEADER_VH
const SLIDE_VH = 120  // vh per image slide
const HEADER_VH = 60  // vh for the section header

function getProjectRanges() {
  let offset = HEADER_VH
  return PROJECTS.map((p) => {
    const height = p.images.length * SLIDE_VH
    const range = { start: offset, end: offset + height }
    offset += height
    return range
  })
}

const RANGES = getProjectRanges()
const TOTAL_VH = RANGES[RANGES.length - 1].end

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return mobile
}

function useIsTablet() {
  const [tablet, setTablet] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px) and (max-width: 1100px)')
    setTablet(mq.matches)
    const handler = (e: MediaQueryListEvent) => setTablet(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return tablet
}

export default function WorksFilm() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollVH, setScrollVH] = useState(0)
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const infoHeight = isMobile ? '40%' : isTablet ? '34%' : '31%'

  useEffect(() => {
    const onScroll = () => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const scrolledPx = Math.max(0, -rect.top)
      const vh = (scrolledPx / window.innerHeight) * 100
      setScrollVH(vh)
    }
    return subscribeScroll(onScroll)
  }, [])

  // Find which project + image index is active
  let activeProject = 0
  let activeImage = 0
  let imageProgress = 0  // 0-1 within current image's scroll window

  for (let pi = 0; pi < PROJECTS.length; pi++) {
    const range = RANGES[pi]
    if (scrollVH >= range.start && scrollVH < range.end) {
      activeProject = pi
      const localVH = scrollVH - range.start
      const rawIdx = localVH / SLIDE_VH
      activeImage = Math.min(PROJECTS[pi].images.length - 1, Math.floor(rawIdx))
      imageProgress = rawIdx - Math.floor(rawIdx)
      break
    }
    if (scrollVH >= range.end) {
      activeProject = pi
      activeImage = PROJECTS[pi].images.length - 1
      imageProgress = 1
    }
  }

  const project = PROJECTS[activeProject]
  const inHeader = scrollVH < HEADER_VH

  return (
    <div
      ref={containerRef}
      id="works"
      style={{ position: 'relative', height: `${TOTAL_VH}vh`, background: 'transparent' }}
    >
      <div style={{ position: 'sticky', top: 0, height: '100dvh', overflow: 'hidden' }}>

        {/* ── Image display area ── */}
        <div style={{
          position: 'absolute', inset: 0,
          background: '#07101f',
          overflow: 'hidden',
        }}>
          {/* Project-tinted background wash */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse 70% 70% at 50% 40%, ${project.accent}14 0%, transparent 70%)`,
            transition: `background 0.8s ${EASE}`,
            pointerEvents: 'none',
          }} />

          {PROJECTS.map((proj, pi) =>
            proj.images.map((src, ii) => {
              const isActive = pi === activeProject && ii === activeImage
              const isNext = pi === activeProject && ii === activeImage + 1
              const isPrev = pi === activeProject && ii === activeImage - 1
              const prevProject = pi === activeProject - 1 && ii === PROJECTS[pi].images.length - 1
              const projectEntry = activeProject > 0 && activeImage === 0
              const entryBlend = Math.min(1, imageProgress / 0.34)

              let opacity = 0
              if (isActive) opacity = projectEntry ? entryBlend : 1
              else if (isNext) opacity = Math.max(0, (imageProgress - 0.6) / 0.4)
              else if (prevProject) opacity = 1 - entryBlend
              else if (isPrev) opacity = 0

              // 모든 화면을 채우되 원본 비율은 유지한다. 모바일·태블릿은
              // 프로젝트별 핵심 초점 위치를 스냅 기준으로 사용한다.
              const pos = (isMobile || isTablet)
                ? (proj.mobilePosition ?? 'center center')
                : 'center center'

              return (
                <img
                  key={`${proj.id}-${ii}`}
                  src={src}
                  alt={`${proj.title} ${ii + 1}`}
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover',
                    objectPosition: pos,
                    padding: 0,
                    opacity,
                    transition: isActive || isNext ? `opacity 0.8s ${EASE}` : 'none',
                    willChange: 'opacity',
                  }}
                />
              )
            })
          )}
        </div>

        {/* 이미지의 상·하단을 어두운 공간으로 연결한다. 검은 박스를 추가하지
            않고 이미지 위의 연속 음영으로 텍스트·태그·진행 바를 보호한다. */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
          background: `
            linear-gradient(180deg, rgba(3,7,17,.86) 0%, rgba(3,7,17,.24) 18%, transparent 38%),
            linear-gradient(0deg, rgba(3,7,17,.98) 0%, rgba(4,9,22,.88) ${infoHeight}, rgba(4,9,22,.30) 54%, transparent 72%)
          `,
        }} />

        {/* Separator line between image and info */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: infoHeight,
          zIndex: 5,
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${project.accent}40, transparent)`,
          transition: `background 0.8s ${EASE}`,
        }} />

        {/* ── Section header (visible only in header zone) ── */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 'var(--z-media)',
          display: 'flex', alignItems: 'flex-end',
          padding: 'var(--section-gap) var(--gutter) clamp(2rem,4vh,3rem)',
          opacity: inHeader ? 1 : 0,
          transform: inHeader ? 'translateY(0)' : 'translateY(-16px)',
          transition: `opacity 0.6s ${EASE}, transform 0.6s ${EASE}`,
          pointerEvents: inHeader ? 'auto' : 'none',
        }}>
          <div>
            <p className="t-label" style={{ color: 'var(--ac-gold)', marginBottom: 'clamp(1rem, 2vh, 1.5rem)' }}>
              SELECTED WORKS
            </p>
            <h2 className="t-scene" style={{ maxWidth: '18ch' }}>
              각 공간의 목적을
              <br />
              <span className="grd-gold kw-light is-visible">기억에 남는 장면</span>으로
              <br />
              완성합니다.
            </h2>
          </div>
        </div>

        {/* ── Project info overlay ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          minHeight: infoHeight, zIndex: 'var(--z-media)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '0 var(--gutter)',
          opacity: inHeader ? 0 : 1,
          transform: inHeader ? 'translateY(20px)' : 'translateY(0)',
          transition: `opacity 0.6s ${EASE}, transform 0.6s ${EASE}`,
        }}>
          {/* Progress bar */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '1.5rem' }}>
            {project.images.map((_, i) => (
              <div key={i} style={{
                height: '2px', flex: 1, borderRadius: '2px',
                background: i <= activeImage
                  ? project.accent
                  : 'rgba(255,255,255,0.15)',
                transition: `background 0.4s ${EASE}`,
                overflow: 'hidden',
              }}>
                {i === activeImage && (
                  <div style={{
                    height: '100%',
                    background: project.accent,
                    width: `${imageProgress * 100}%`,
                    transition: 'none',
                  }} />
                )}
              </div>
            ))}
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {project.tags.map((tag) => (
              <span key={tag} style={{
                fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: project.accent, padding: '0.2rem 0.7rem',
                border: `1px solid ${project.accent}40`, borderRadius: '100px',
                transition: `color 0.5s ${EASE}, border-color 0.5s ${EASE}`,
              }}>
                {tag}
              </span>
            ))}
          </div>

          {/* Title */}
          <h3 style={{
            fontFamily: "'Paperlogy','Pretendard',sans-serif",
            fontSize: 'clamp(1.6rem, 3.5vw, 3.2rem)',
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            color: 'var(--text)',
            marginBottom: '0.6rem',
            transition: `opacity 0.5s ${EASE}`,
          }}>
            {project.title}
          </h3>

          {/* Desc + counter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '2rem' }}>
            <p style={{
              fontFamily: "'A2G','Pretendard',sans-serif",
              fontSize: 'clamp(0.82rem, 1vw, 0.95rem)',
              color: 'rgba(237,232,224,0.5)',
              maxWidth: '52ch',
              lineHeight: 1.7,
            }}>
              {project.desc}
            </p>
            <span style={{
              fontFamily: "'Paperlogy','Pretendard',sans-serif",
              fontSize: 'clamp(0.75rem, 1vw, 0.85rem)',
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: '0.1em',
              flexShrink: 0,
            }}>
              {String(activeImage + 1).padStart(2, '0')} / {String(project.images.length).padStart(2, '0')}
            </span>
          </div>

          {/* Project index dots */}
          <div style={{
            position: 'absolute', right: 'var(--gutter)', top: '-100%',
            transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            {PROJECTS.map((_, pi) => (
              <div key={pi} style={{
                width: '4px', height: '4px', borderRadius: '50%',
                background: pi === activeProject ? project.accent : 'rgba(255,255,255,0.2)',
                transform: pi === activeProject ? 'scale(1.6)' : 'scale(1)',
                transition: `background 0.4s ${EASE}, transform 0.4s ${EASE}`,
              }} />
            ))}
          </div>
        </div>

        {/* Scroll hint (visible only at top) */}
        {inHeader && (
          <div style={{
            position: 'absolute', bottom: 'clamp(1.5rem, 4vh, 3rem)', right: 'var(--gutter)',
            zIndex: 'var(--z-content)', display: 'flex', alignItems: 'center', gap: '0.5rem',
            color: 'rgba(237,232,224,0.3)', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase',
          }}>
            <span>Scroll</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M3.5 8.5L7 12l3.5-3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
