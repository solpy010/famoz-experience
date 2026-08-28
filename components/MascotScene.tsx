'use client'
import { useRef, useEffect, useState } from 'react'

const EASE = 'cubic-bezier(0.4,0,0.2,1)'

const CHARACTERS = [
  {
    id: 'dorothy',
    src: '/mascot/dorothy.png',
    name: '도로시',
    role: '관람객',
    headline: '공간의 주인공은\n언제나 당신입니다.',
    desc: '모든 경험은 관람객 한 사람을 위해 설계됩니다. 파모즈가 만드는 공간은 감상이 아닌 참여에서 시작됩니다.',
    accent: '#E8955A',
    glow: 'rgba(232,149,90,0.18)',
    position: 0,  // leftmost
  },
  {
    id: 'scarecrow',
    src: '/mascot/scarecrow.png',
    name: '허수아비',
    role: '기획·아이디어',
    headline: '아이디어가\n공간을 설계합니다.',
    desc: '좋은 경험은 탁월한 기획에서 출발합니다. 콘텐츠의 의미와 동선, 감정의 흐름을 하나의 이야기로 엮어냅니다.',
    accent: '#C8A040',
    glow: 'rgba(200,160,64,0.18)',
    position: 1,
  },
  {
    id: 'lion',
    src: '/mascot/lion.png',
    name: '사자',
    role: '즐거운 체험',
    headline: '체험의 순간이\n기억이 됩니다.',
    desc: '몸으로 느끼고, 움직이며 반응하는 인터랙티브 경험. 즐거움은 단순한 감각을 넘어 오래 남는 인상으로 전환됩니다.',
    accent: '#3DC992',
    glow: 'rgba(61,201,146,0.18)',
    position: 2,
  },
  {
    id: 'robot',
    src: '/mascot/robot.png',
    name: '로봇',
    role: 'AI·기술',
    headline: 'AI가 공간을\n진화시킵니다.',
    desc: '실시간 데이터와 맥락 인식으로 공간이 스스로 반응합니다. 기술은 경험의 배경이 아닌 경험 그 자체입니다.',
    accent: '#52BFFF',
    glow: 'rgba(82,191,255,0.18)',
    position: 3,
  },
]

// Stage 0: all together (intro), Stages 1-4: each character spotlight
const TOTAL_STAGES = 5  // 0=all, 1=dorothy, 2=scarecrow, 3=lion, 4=robot
const STAGE_VH = 140
const INTRO_VH = 80
const TOTAL_VH = INTRO_VH + TOTAL_STAGES * STAGE_VH

export default function MascotScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const total = el.offsetHeight - window.innerHeight
      setProgress(Math.max(0, Math.min(1, -rect.top / total)))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Convert progress to stage
  const totalVH = TOTAL_VH
  const scrolledVH = progress * totalVH

  // Stage index: 0 = intro group, 1-4 = spotlight
  let stageIdx = 0
  let stageSub = 0  // 0-1 within current stage

  if (scrolledVH < INTRO_VH) {
    stageIdx = 0
    stageSub = scrolledVH / INTRO_VH
  } else {
    const afterIntro = scrolledVH - INTRO_VH
    const rawStage = afterIntro / STAGE_VH
    stageIdx = Math.min(TOTAL_STAGES - 1, Math.floor(rawStage) + 1)
    stageSub = rawStage - Math.floor(rawStage)
  }

  const isIntro = stageIdx === 0
  const spotIdx = isIntro ? -1 : stageIdx - 1  // 0-3 which character is spotlit
  const activeChar = spotIdx >= 0 ? CHARACTERS[spotIdx] : null

  // Text reveal: show after 30% of stage
  const textVisible = stageSub > 0.3

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', height: `${TOTAL_VH}vh`, background: 'transparent' }}
    >
      <section style={{
        position: 'sticky', top: 0, height: '100dvh', overflow: 'hidden',
        display: 'flex', alignItems: 'center',
        background: 'transparent',
      }}>

        {/* Dynamic background glow per active character */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: activeChar
            ? `radial-gradient(ellipse 70% 60% at 65% 50%, ${activeChar.glow} 0%, transparent 70%)`
            : 'radial-gradient(ellipse 80% 60% at 50% 60%, rgba(255,255,255,0.02) 0%, transparent 70%)',
          transition: `background 1s ${EASE}`,
        }} />

        {/* ── Intro label ── */}
        <div style={{
          position: 'absolute', top: 'clamp(2rem, 5vh, 4rem)', left: '50%',
          transform: 'translateX(-50%)',
          opacity: isIntro ? Math.min(1, stageSub * 3) : 0,
          transition: `opacity 0.6s ${EASE}`,
          textAlign: 'center', zIndex: 5, whiteSpace: 'nowrap',
        }}>
          <p className="t-label" style={{ color: 'var(--ac-magenta)', marginBottom: '0.5rem' }}>
            OUR CHARACTER
          </p>
          <p style={{
            fontFamily: "'A2G','Pretendard',sans-serif",
            fontSize: 'clamp(0.8rem, 1vw, 0.95rem)',
            color: 'var(--text-sub)',
          }}>
            파모즈의 네 가지 정체성을 소개합니다
          </p>
        </div>

        {/* ── Character group ── */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          paddingBottom: isIntro ? '0' : '2vh',
          gap: isIntro ? 'clamp(1rem, 3vw, 3rem)' : '0',
          transition: `gap 0.8s ${EASE}, padding-bottom 0.8s ${EASE}`,
        }}>
          {CHARACTERS.map((char, ci) => {
            const isActive = spotIdx === ci
            const isInactive = spotIdx >= 0 && !isActive

            // Position during spotlight: active = center, others = hidden left/right
            let translateX = '0'
            let scale = 1
            let opacity = 1

            if (!isIntro) {
              if (isActive) {
                translateX = '0'
                scale = 1
                opacity = 1
              } else {
                // Push inactive characters off to their side
                const offset = ci < spotIdx ? -120 : 120
                translateX = `${offset}%`
                scale = 0.7
                opacity = 0
              }
            } else {
              // Intro: all float up from below
              const entryDelay = ci * 0.08
              const entryProg = Math.max(0, Math.min(1, (stageSub - entryDelay) / (1 - entryDelay)))
              const eased = 1 - Math.pow(1 - entryProg, 3)
              translateX = '0'
              scale = 0.85 + eased * 0.15
              opacity = eased
            }

            const charHeight = isIntro
              ? 'clamp(260px, 45vh, 480px)'
              : isActive ? 'clamp(320px, 62vh, 600px)' : '0'

            return (
              <div
                key={char.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flexShrink: 0,
                  transform: `translateX(${translateX}) scale(${scale})`,
                  opacity,
                  transition: `transform 0.9s ${EASE}, opacity 0.7s ${EASE}, flex 0.8s ${EASE}`,
                  flex: isIntro ? 1 : isActive ? '0 0 auto' : '0 0 0px',
                  overflow: isActive || isIntro ? 'visible' : 'hidden',
                  maxWidth: isIntro ? 'calc(25% - 0.75rem)' : isActive ? '320px' : '0',
                  position: 'relative',
                  zIndex: isActive ? 3 : 2,
                }}
              >
                {/* Name badge (intro only) */}
                {isIntro && (
                  <p style={{
                    fontFamily: "'Paperlogy','Pretendard',sans-serif",
                    fontSize: 'clamp(0.6rem, 0.9vw, 0.78rem)',
                    fontWeight: 400,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: char.accent,
                    marginBottom: '0.5rem',
                    opacity: stageSub > 0.5 ? 1 : 0,
                    transition: `opacity 0.5s ${EASE} ${ci * 0.06}s`,
                  }}>
                    {char.role}
                  </p>
                )}

                {/* Character image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={char.src}
                  alt={char.name}
                  style={{
                    height: charHeight,
                    width: 'auto',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    objectPosition: 'bottom center',
                    display: 'block',
                    transition: `height 0.9s ${EASE}, filter 0.7s ${EASE}`,
                    /* dropShadow는 CSS 속성이 아니다. filter 안의 drop-shadow()로
                       넣어야 실제로 적용된다. (기존 코드에서 무효였고 빌드도 막았다) */
                    filter: [
                      isInactive ? 'brightness(0.3)' : 'brightness(1)',
                      isActive ? `drop-shadow(0 0 40px ${char.accent}60)` : '',
                    ].filter(Boolean).join(' '),
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* ── Spotlight text panel ── */}
        {activeChar && (
          <div style={{
            position: 'absolute',
            left: 'var(--gutter)',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            maxWidth: 'clamp(260px, 36vw, 480px)',
            opacity: textVisible ? 1 : 0,
            transition: `opacity 0.6s ${EASE}`,
          }}>
            {/* Role chip */}
            <span style={{
              display: 'inline-block',
              fontFamily: "'Paperlogy','Pretendard',sans-serif",
              fontSize: '0.68rem', fontWeight: 400,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: activeChar.accent,
              border: `1px solid ${activeChar.accent}50`,
              borderRadius: '100px',
              padding: '0.25rem 0.85rem',
              marginBottom: '1.25rem',
            }}>
              {activeChar.role}
            </span>

            {/* Headline */}
            <h2 style={{
              fontFamily: "'Paperlogy','Pretendard',sans-serif",
              fontSize: 'clamp(1.8rem, 3.2vw, 3.8rem)',
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
              whiteSpace: 'pre-line',
              marginBottom: '1.25rem',
              transform: textVisible ? 'translateY(0)' : 'translateY(16px)',
              transition: `transform 0.6s ${EASE} 0.1s`,
            }}>
              {activeChar.headline}
            </h2>

            {/* Description */}
            <p style={{
              fontFamily: "'A2G','Pretendard',sans-serif",
              fontSize: 'clamp(0.82rem, 1vw, 0.96rem)',
              color: 'var(--text-sub)',
              lineHeight: 1.85,
              maxWidth: '38ch',
              transform: textVisible ? 'translateY(0)' : 'translateY(12px)',
              transition: `transform 0.6s ${EASE} 0.18s`,
            }}>
              {activeChar.desc}
            </p>
          </div>
        )}

        {/* ── Stage progress dots ── */}
        <div style={{
          position: 'absolute',
          bottom: 'clamp(1.5rem, 4vh, 3rem)',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', gap: '10px', zIndex: 5,
        }}>
          {/* Intro dot */}
          <div style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: isIntro ? 'var(--ac-magenta)' : 'rgba(255,255,255,0.2)',
            transform: isIntro ? 'scale(1.5)' : 'scale(1)',
            transition: `background 0.4s ${EASE}, transform 0.4s ${EASE}`,
          }} />
          {CHARACTERS.map((char, ci) => (
            <div key={char.id} style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: spotIdx === ci ? char.accent : 'rgba(255,255,255,0.2)',
              transform: spotIdx === ci ? 'scale(1.5)' : 'scale(1)',
              transition: `background 0.4s ${EASE}, transform 0.4s ${EASE}`,
            }} />
          ))}
        </div>

      </section>
    </div>
  )
}
