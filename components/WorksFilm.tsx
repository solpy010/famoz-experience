'use client'
import { useRef, useEffect, useState } from 'react'
import { subscribeScroll } from './scrollBus'

const EASE = 'cubic-bezier(0.4,0,0.2,1)'

type ViewportKind = 'desktop' | 'tabletLandscape' | 'tabletPortrait' | 'mobileLandscape' | 'mobilePortrait'
type FocalPoint = Record<ViewportKind, string>
type ProjectImage = { src: string; alt: string; focal: FocalPoint }

const shot = (
  src: string,
  alt: string,
  desktop = '50% 50%',
  tabletPortrait = desktop,
  mobilePortrait = tabletPortrait,
  landscape = desktop,
): ProjectImage => ({
  src, alt,
  focal: {
    desktop,
    tabletLandscape: landscape,
    tabletPortrait,
    mobileLandscape: landscape,
    mobilePortrait,
  },
})

type Project = {
  id: string
  title: string
  desc: string
  field: string
  tags: string[]
  accent: string
  shadeTop: string
  shadeBottom: string
  images: ProjectImage[]
}

const PROJECTS: Project[] = [
  {
    id: 'expo',
    title: '2025 오사카·간사이 엑스포 한국관',
    desc: '국가관의 메시지를 다면 미디어 장면으로 구현. 관람객의 이동 경로에 따라 이야기가 순차적으로 펼쳐지는 공간 연출.',
    field: '국가관 · 몰입형 미디어',
    tags: ['공간 연출', '영상 콘텐츠', '관람 경험'],
    accent: '#3DC992',
    shadeTop: 'rgba(4,14,20,.88)', shadeBottom: 'rgba(3,13,20,.98)',
    images: [
      shot('/works/expo-01.png', '한국관 다면 미디어가 이어진 전시 공간', '50% 50%', '58% 50%', '63% 50%'),
      shot('/works/expo-02.png', '관람객과 대형 미디어월이 함께 보이는 한국관', '54% 50%', '60% 50%', '65% 50%'),
      shot('/works/expo-03.png', '보라빛 미디어아트가 펼쳐진 한국관 무대', '50% 48%', '52% 48%', '54% 48%'),
    ],
  },
  {
    id: 'apec',
    title: 'APEC 2025 미디어아트 빛광장',
    desc: '미디어와 빛을 연결해 광장 전체를 하나의 장면으로 구성. 장소의 야간 경관과 함께 이어지는 빛의 흐름.',
    field: '공공 공간 · 야간 미디어아트',
    tags: ['미디어아트', '빛·영상 동기화', '공공 설치'],
    accent: '#52BFFF',
    shadeTop: 'rgba(4,12,25,.88)', shadeBottom: 'rgba(3,10,24,.98)',
    images: [
      shot('/works/apec-01.png', 'APEC 행사장과 주변 경관 전경', '53% 48%', '59% 48%', '62% 48%'),
      shot('/works/apec-02.png', '야간 광장에 펼쳐진 미디어 조명', '50% 52%', '54% 52%', '56% 52%'),
      shot('/works/apec-03.png', '건축 입면을 따라 확장된 청색 미디어 조명', '50% 50%', '52% 50%', '54% 50%'),
    ],
  },
  {
    id: 'sports',
    title: 'SPORTS MONSTER',
    desc: '방문객의 움직임을 실시간 콘텐츠와 연결. 동작과 반응이 장면을 바꾸는 참여형 체험 공간.',
    field: '스포츠 체험 · 인터랙티브 콘텐츠',
    tags: ['인터랙티브', '게임 연출', '체험 설계'],
    accent: '#FF9A62',
    shadeTop: 'rgba(27,11,8,.88)', shadeBottom: 'rgba(23,9,7,.98)',
    images: [
      shot('/works/sports-01.png', '스포츠 몬스터 체험 공간 입구', '50% 43%', '52% 38%', '54% 34%'),
      shot('/works/sports-02.png', '러닝 동작을 인식하는 인터랙티브 체험', '55% 46%', '58% 43%', '60% 40%'),
      shot('/works/sports-03.png', '사용자의 동작에 반응하는 축구 체험 화면', '50% 48%', '50% 43%', '50% 40%'),
      shot('/works/sports-04.png', '사용자와 실시간 화면이 연결된 축구 체험', '55% 50%', '58% 48%', '60% 47%'),
    ],
  },
  {
    id: 'forest',
    title: 'MEDIA FOREST',
    desc: '자연의 흐름과 미디어를 연결한 감응형 공간. 관람객의 존재가 공간의 생태계를 변화시킵니다.',
    field: '자연형 공간 · 감응형 미디어',
    tags: ['자연형 미디어', '생성 그래픽', '몰입 환경'],
    accent: '#3DC992',
    shadeTop: 'rgba(3,18,18,.88)', shadeBottom: 'rgba(3,16,17,.98)',
    images: [
      shot('/works/forest-01.png', '황금빛 미디어 오브제가 놓인 야간 숲길', '50% 52%', '50% 50%', '50% 48%'),
      shot('/works/forest-02.png', '푸른 빛으로 반응하는 미디어 숲', '50% 52%', '52% 50%', '54% 48%'),
      shot('/works/forest-03.png', '도시와 자연 사이에 펼쳐진 미디어 포레스트', '50% 52%', '54% 50%', '56% 48%'),
    ],
  },
  {
    id: 'hospital',
    title: 'SMART HOSPITAL AI',
    desc: '이동 맥락에 맞춰 필요한 정보를 안내하는 공간 서비스. AI가 공간 안에서 사람의 필요를 먼저 인식합니다.',
    field: '헬스케어 · AI 공간 안내',
    tags: ['AI 안내', '동선 서비스', '공간 지능'],
    accent: '#C07AB5',
    shadeTop: 'rgba(21,11,27,.88)', shadeBottom: 'rgba(18,9,25,.98)',
    images: [
      shot('/works/hospital-01.png', '스마트폰 안내를 보며 병원 공간을 이동하는 이용자', '56% 50%', '60% 50%', '64% 48%'),
      shot('/works/hospital-03.png', '병원 동선 안내와 연결된 환자 이동 장면', '55% 50%', '60% 50%', '63% 48%'),
      shot('/works/hospital-04.png', '스마트폰으로 병원 서비스를 안내받는 이용자', '58% 50%', '63% 50%', '66% 48%'),
    ],
  },
  {
    id: 'immersive',
    title: '몰입형 미디어 전시관',
    desc: '360도 미디어 환경 안에서 이야기가 관람객을 감싸는 공간. 벽과 천장, 바닥이 하나의 화면이 됩니다.',
    field: '전시 공간 · 다면 몰입 영상',
    tags: ['몰입형 전시', '미디어 파사드', '360° 연출'],
    accent: '#C07AB5',
    shadeTop: 'rgba(15,10,28,.88)', shadeBottom: 'rgba(12,8,25,.98)',
    images: [
      shot('/works/immersive-01.png', '벽과 천장을 잇는 다면 미디어 전시 공간', '52% 50%', '58% 48%', '62% 47%'),
      shot('/works/immersive-02.png', '황금빛 영상이 관람객을 감싸는 몰입 공간', '52% 50%', '54% 48%', '56% 47%'),
      shot('/works/immersive-03.png', '관람객 앞에 깊게 펼쳐지는 대형 몰입 영상', '55% 50%', '58% 48%', '60% 46%'),
      shot('/works/immersive-04.png', '건축 벽면과 결합된 원형 미디어 콘텐츠', '52% 47%', '54% 44%', '56% 42%'),
    ],
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

function useViewportKind() {
  const [kind, setKind] = useState<ViewportKind>('desktop')
  useEffect(() => {
    const update = () => {
      const landscape = innerWidth > innerHeight
      if (innerWidth <= 767) setKind(landscape ? 'mobileLandscape' : 'mobilePortrait')
      else if (innerWidth <= 1100) setKind(landscape ? 'tabletLandscape' : 'tabletPortrait')
      else setKind('desktop')
    }
    update()
    addEventListener('resize', update, { passive: true })
    return () => removeEventListener('resize', update)
  }, [])
  return kind
}

export default function WorksFilm() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollVH, setScrollVH] = useState(0)
  const viewportKind = useViewportKind()
  const infoHeight = viewportKind === 'mobilePortrait' ? '44%'
    : viewportKind === 'mobileLandscape' ? '56%'
      : viewportKind === 'tabletPortrait' ? '38%'
        : viewportKind === 'tabletLandscape' ? '34%'
          : '31%'

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
      data-experience-chapter="works"
      data-resource-slot="showreel-bridge"
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
            proj.images.map((image, ii) => {
              const isActive = pi === activeProject && ii === activeImage
              const isNext = pi === activeProject && ii === activeImage + 1
              const isPrev = pi === activeProject && ii === activeImage - 1
              const prevProject = pi === activeProject - 1 && ii === PROJECTS[pi].images.length - 1
              if (!isActive && !isNext && !isPrev && !prevProject) return null

              const projectEntry = activeProject > 0 && activeImage === 0
              const entryBlend = Math.min(1, imageProgress / 0.34)

              let opacity = 0
              if (isActive) opacity = projectEntry ? entryBlend : 1
              else if (isNext) opacity = Math.max(0, (imageProgress - 0.6) / 0.4)
              else if (prevProject) opacity = 1 - entryBlend
              else if (isPrev) opacity = 0

              return (
                <img
                  key={`${proj.id}-${ii}`}
                  src={image.src}
                  alt={image.alt}
                  loading={isActive ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={isActive ? 'high' : 'low'}
                  className="works-image"
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover',
                    objectPosition: image.focal[viewportKind],
                    padding: 0,
                    opacity,
                    transition: isActive || isNext ? `opacity 0.8s ${EASE}` : 'none',
                    willChange: 'opacity',
                    maskImage: 'radial-gradient(ellipse 96% 94% at 50% 48%, #000 48%, rgba(0,0,0,.96) 72%, rgba(0,0,0,.76) 100%)',
                    WebkitMaskImage: 'radial-gradient(ellipse 96% 94% at 50% 48%, #000 48%, rgba(0,0,0,.96) 72%, rgba(0,0,0,.76) 100%)',
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
            linear-gradient(180deg, ${project.shadeTop} 0%, color-mix(in srgb, ${project.shadeTop} 32%, transparent) 20%, transparent 39%),
            linear-gradient(0deg, ${project.shadeBottom} 0%, color-mix(in srgb, ${project.shadeBottom} 88%, transparent) ${infoHeight}, color-mix(in srgb, ${project.shadeBottom} 30%, transparent) 55%, transparent 74%),
            linear-gradient(90deg, color-mix(in srgb, ${project.shadeBottom} 26%, transparent) 0%, transparent 14%, transparent 86%, color-mix(in srgb, ${project.shadeBottom} 22%, transparent) 100%)
          `,
          transition: `background 0.8s ${EASE}`,
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

          {/* 프로젝트 분야 */}
          <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,.56)', letterSpacing: '.12em', marginBottom: '.55rem' }}>
            PROJECT {String(activeProject + 1).padStart(2, '0')} / {String(PROJECTS.length).padStart(2, '0')} · {project.field}
          </p>
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
            <p className="works-description" style={{
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
