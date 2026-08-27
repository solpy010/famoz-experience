'use client'
import { useRef, useEffect, useState } from 'react'

interface Project {
  id: string
  title: string
  subtitle: string
  category: string
  year: string
  tags: string[]
  themeColor: string
  themeColorRgb: string
  bgGradient: string
  panels: { label: string; value: string }[]
}

const PROJECTS: Project[] = [
  {
    id: 'osaka-expo',
    title: '오사카 엑스포 2025',
    subtitle: '한국관 미디어 파사드',
    category: 'MEDIA ARCHITECTURE',
    year: '2025',
    tags: ['미디어 파사드', '공공 전시', '국제 행사'],
    themeColor: '#E8955A',
    themeColorRgb: '232,149,90',
    bgGradient: 'radial-gradient(ellipse 80% 70% at 40% 40%, #1a0d04 0%, #080808 60%)',
    panels: [
      { label: 'SCALE', value: '2,400㎡' },
      { label: 'VISITORS', value: '280만+' },
      { label: 'TECH', value: 'LED Matrix · Real-time Render' },
    ],
  },
  {
    id: 'apec',
    title: 'APEC 2025',
    subtitle: '정상회의 미디어 공간',
    category: 'IMMERSIVE SPACE',
    year: '2025',
    tags: ['인터랙티브', '외교 공간', 'AI 반응'],
    themeColor: '#52BFFF',
    themeColorRgb: '82,191,255',
    bgGradient: 'radial-gradient(ellipse 80% 70% at 60% 35%, #040d1a 0%, #080808 60%)',
    panels: [
      { label: 'NATIONS', value: '21개국' },
      { label: 'SPACES', value: '6개 전시존' },
      { label: 'TECH', value: 'AI Vision · Spatial Audio' },
    ],
  },
  {
    id: 'sports-monster',
    title: '스포츠 몬스터',
    subtitle: '체험형 스포츠 엔터테인먼트',
    category: 'INTERACTIVE ATTRACTION',
    year: '2024',
    tags: ['체험형', '스포츠', '게임 인터랙션'],
    themeColor: '#3DC992',
    themeColorRgb: '61,201,146',
    bgGradient: 'radial-gradient(ellipse 80% 70% at 35% 55%, #041510 0%, #080808 60%)',
    panels: [
      { label: 'ATTRACTIONS', value: '18종' },
      { label: 'DAILY', value: '3,000명+' },
      { label: 'TECH', value: 'Motion Capture · Real-time VFX' },
    ],
  },
  {
    id: 'media-forest',
    title: '미디어 포레스트',
    subtitle: '자연과 디지털의 융합 전시',
    category: 'MEDIA INSTALLATION',
    year: '2024',
    tags: ['생성형 AI', '자연 미디어', '몰입형'],
    themeColor: '#3DC992',
    themeColorRgb: '61,201,146',
    bgGradient: 'radial-gradient(ellipse 80% 70% at 45% 50%, #031209 0%, #080808 60%)',
    panels: [
      { label: 'AREA', value: '1,800㎡' },
      { label: 'AI MODEL', value: 'Generative Visual' },
      { label: 'TECH', value: 'Stable Diffusion · Projection' },
    ],
  },
  {
    id: 'hospital-ai',
    title: '스마트 병원 AI 안내',
    subtitle: '공간 인지 기반 AI 서비스',
    category: 'AI SPATIAL SERVICE',
    year: '2023',
    tags: ['AI 공간', '의료', '접근성'],
    themeColor: '#C07AB5',
    themeColorRgb: '192,122,181',
    bgGradient: 'radial-gradient(ellipse 80% 70% at 50% 45%, #120818 0%, #080808 60%)',
    panels: [
      { label: 'LANGUAGES', value: '12개국어' },
      { label: 'ACCURACY', value: '98.3%' },
      { label: 'TECH', value: 'NLP · Computer Vision' },
    ],
  },
  {
    id: 'immersive-gallery',
    title: '몰입형 갤러리',
    subtitle: '디지털 아트 상설 전시관',
    category: 'DIGITAL ART SPACE',
    year: '2023',
    tags: ['디지털 아트', '상설 전시', '몰입형'],
    themeColor: '#C8A040',
    themeColorRgb: '200,160,64',
    bgGradient: 'radial-gradient(ellipse 80% 70% at 55% 40%, #1a1404 0%, #080808 60%)',
    panels: [
      { label: 'ARTWORKS', value: '42점' },
      { label: 'RESOLUTION', value: '8K Render' },
      { label: 'TECH', value: 'Unreal Engine · LED Volume' },
    ],
  },
]

function ProjectScene({ project, isActive }: { project: Project; isActive: boolean }) {
  const [panelsIn, setPanelsIn] = useState(false)

  useEffect(() => {
    if (isActive) {
      const t = setTimeout(() => setPanelsIn(true), 420)
      return () => clearTimeout(t)
    } else {
      setPanelsIn(false)
    }
  }, [isActive])

  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        opacity: isActive ? 1 : 0,
        transition: 'opacity 0.85s cubic-bezier(0.16,1,0.3,1)',
        pointerEvents: isActive ? 'auto' : 'none',
      }}
    >
      {/* L0: Project theme background */}
      <div
        className="px-far"
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: project.bgGradient }}
      />

      {/* L1: Ambient color bleed */}
      <div
        className="px-mid"
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 90% 70% at 50% 50%, rgba(${project.themeColorRgb},0.07) 0%, transparent 70%)`,
        }}
      />

      {/* L2: Large category ghost text */}
      <div
        aria-hidden="true"
        className="px-near"
        style={{
          position: 'absolute', bottom: '6%', left: '-1%',
          fontSize: 'clamp(3.5rem, 9vw, 10rem)',
          fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1,
          color: `rgba(${project.themeColorRgb},0.04)`,
          pointerEvents: 'none', userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {project.category}
      </div>

      {/* L3: Floating evidence panels — top right */}
      <div
        style={{
          position: 'absolute',
          right: 'clamp(20px, 6vw, 80px)',
          top: '18%',
          display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 3,
        }}
      >
        {project.panels.map((panel, i) => (
          <div
            key={i}
            style={{
              padding: '0.65rem 1.1rem',
              background: `rgba(${project.themeColorRgb},0.06)`,
              border: `1px solid rgba(${project.themeColorRgb},0.18)`,
              borderRadius: '3px',
              backdropFilter: 'blur(12px)',
              minWidth: '170px',
              opacity: panelsIn ? 1 : 0,
              transform: `translateX(${panelsIn ? 0 : 18}px) rotate(${['-1.5deg', '2deg', '-2.5deg'][i % 3]})`,
              transition: `opacity 0.55s ease ${i * 0.11}s, transform 0.65s cubic-bezier(0.16,1,0.3,1) ${i * 0.11}s`,
            }}
          >
            <p style={{
              fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.15em',
              color: `rgba(${project.themeColorRgb},0.65)`, marginBottom: '3px',
              textTransform: 'uppercase',
            }}>
              {panel.label}
            </p>
            <p style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)' }}>
              {panel.value}
            </p>
          </div>
        ))}
      </div>

      {/* L4: Core message — bottom left */}
      <div
        className="shell"
        style={{
          position: 'absolute',
          bottom: 'clamp(60px, 10vh, 120px)',
          left: 0, right: 0, zIndex: 4,
        }}
      >
        <p
          className="t-label"
          style={{
            color: project.themeColor, marginBottom: '0.9rem',
            opacity: isActive ? 1 : 0,
            transform: `translateY(${isActive ? 0 : 10}px)`,
            transition: 'opacity 0.55s ease 0.08s, transform 0.65s cubic-bezier(0.16,1,0.3,1) 0.08s',
          }}
        >
          {project.category} · {project.year}
        </p>

        <h3
          style={{
            fontSize: 'clamp(2rem, 5.5vw, 6.5rem)',
            fontWeight: 800, lineHeight: 1.0, letterSpacing: '-0.04em',
            color: 'var(--text)', marginBottom: '0.55rem', maxWidth: '14ch',
            opacity: isActive ? 1 : 0,
            transform: `translateY(${isActive ? 0 : 22}px)`,
            filter: `blur(${isActive ? 0 : 5}px)`,
            transition: 'opacity 0.75s ease 0.16s, transform 0.9s cubic-bezier(0.16,1,0.3,1) 0.16s, filter 0.75s ease 0.16s',
          }}
        >
          {project.title}
        </h3>

        <p
          style={{
            fontSize: 'clamp(0.85rem, 1.3vw, 1.1rem)',
            color: 'var(--text-sub)', marginBottom: '1.3rem',
            opacity: isActive ? 1 : 0,
            transform: `translateY(${isActive ? 0 : 10}px)`,
            transition: 'opacity 0.65s ease 0.26s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.26s',
          }}
        >
          {project.subtitle}
        </p>

        <div
          style={{
            display: 'flex', gap: '7px', flexWrap: 'wrap',
            opacity: isActive ? 1 : 0,
            transform: `translateY(${isActive ? 0 : 8}px)`,
            transition: 'opacity 0.55s ease 0.36s, transform 0.75s cubic-bezier(0.16,1,0.3,1) 0.36s',
          }}
        >
          {project.tags.map(tag => (
            <span
              key={tag}
              style={{
                fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', padding: '3px 9px',
                border: `1px solid rgba(${project.themeColorRgb},0.24)`,
                borderRadius: '2px', color: `rgba(${project.themeColorRgb},0.8)`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function WorksFilm() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    function onScroll() {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const totalScroll = el.offsetHeight - window.innerHeight
      if (totalScroll <= 0) return
      const p = Math.max(0, Math.min(0.999, -rect.top / totalScroll))
      setActiveIdx(Math.floor(p * PROJECTS.length))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section id="works" ref={containerRef} style={{ position: 'relative', background: 'var(--black)' }}>
      {/* 6 projects × 120svh scroll space */}
      <div style={{ height: `${PROJECTS.length * 120}svh` }} />

      <div
        style={{
          position: 'sticky', top: 0, height: '100dvh', overflow: 'hidden',
          marginTop: `-${PROJECTS.length * 120}svh`,
        }}
      >
        {/* Section header */}
        <div
          style={{
            position: 'absolute',
            top: 'clamp(24px, 4vh, 44px)',
            left: 'max(var(--gutter), env(safe-area-inset-left))',
            zIndex: 10,
          }}
        >
          <p className="t-label" style={{ color: 'var(--text-muted)' }}>SELECTED WORKS</p>
        </div>

        {/* Counter */}
        <div
          style={{
            position: 'absolute',
            top: 'clamp(24px, 4vh, 44px)',
            right: 'max(var(--gutter), env(safe-area-inset-right))',
            zIndex: 10,
          }}
        >
          <p className="t-label" style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            {String(activeIdx + 1).padStart(2, '0')} / {String(PROJECTS.length).padStart(2, '0')}
          </p>
        </div>

        {/* Project scenes */}
        {PROJECTS.map((project, i) => (
          <ProjectScene key={project.id} project={project} isActive={i === activeIdx} />
        ))}

        {/* Progress bar bottom */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '2px', background: 'rgba(255,255,255,0.05)', zIndex: 10,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${((activeIdx + 1) / PROJECTS.length) * 100}%`,
              background: PROJECTS[activeIdx]?.themeColor ?? 'var(--ac-magenta)',
              transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1), background 0.5s',
            }}
          />
        </div>
      </div>
    </section>
  )
}
