'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import IntroSequence from '@/components/IntroSequence'
import HeroScene from '@/components/HeroScene'
import WorksFilm from '@/components/WorksFilm'
import EndingScene from '@/components/EndingScene'
import OzPortalHub from '@/components/OzPortalHub'
import CompanyProof from '@/components/CompanyProof'
import CapabilityEvidence from '@/components/CapabilityEvidence'
import SiteNav from '@/components/SiteNav'
import SectionBackdrop from '@/components/SectionBackdrop'
import VisualSystemCanvas, { type VisualStats } from '@/components/visual/VisualSystemCanvas'
import PerfOverlay from '@/components/visual/PerfOverlay'
import VisualErrorBoundary from '@/components/visual/VisualErrorBoundary'
import { PointerField } from '@/components/visual/pointerField'
import { JourneyState } from '@/components/visual/journeyState'

/**
 * 레이어 계약
 *   z0   SectionBackdrop     — CSS 전용 유색 암부 (Canvas 없음)
 *   z3   VisualSystemCanvas  — L1 공간면 + L2 입사광 + L3 시트 종속 파티클
 *   z10+ 각 섹션 DOM (타이포·이미지·CTA)
 *   z30  PerfOverlay (dev 전용)
 *
 * 안정 상태에서 Hero 구간의 Canvas는 VisualSystemCanvas 1개다.
 * 인트로 동안만 IntroSequence의 캔버스가 더해져 최대 2개가 되고,
 * 인트로가 끝나면 언마운트되면서 1개로 돌아온다.
 */

/** 인트로 종료 후 파티클 밀도가 목표치까지 오르는 시간 (지시서 §6: 1.2~1.8초) */
const RAMP_MS = 1500

export default function Home() {
  const [introComplete, setIntroComplete] = useState(false)
  const [intensity, setIntensity] = useState(0.08)   // 인트로 중에는 0~10%
  const pointer = useMemo(() => new PointerField(), [])
  const journey = useMemo(() => new JourneyState(), [])
  const statsRef = useRef<VisualStats>({
    fps: 0, points: 0, coverage: 0, tier: 0, dpr: 0, frameMs: 0,
    gpuMs: -1, longFrames: 0,
    drawCalls: 0, geometries: 0, textures: 0, programs: 0,
    zoneCounts: [0, 0, 0, 0, 0], zRange: [0, 0],
  })

  useEffect(() => {
    document.body.classList.add('intro-active')
    document.body.style.overflow = 'hidden'
  }, [])

  useEffect(() => pointer.attach(window), [pointer])
  useEffect(() => journey.attach(), [journey])

  const handleEntered = () => {
    setIntroComplete(true)
    document.body.classList.remove('intro-active')
    document.body.classList.add('experience-entered')
    document.body.style.overflow = ''

    // 파티클 밀도 0.08 → 1.0 램프. 공간면과 입사광도 함께 올라온다.
    const t0 = performance.now()
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / RAMP_MS)
      const eased = k * k * (3 - 2 * k)
      setIntensity(0.08 + eased * 0.92)
      if (k < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  return (
    <>
      <SectionBackdrop />
      {/* 배경은 장식이다. 렌더링에 실패하더라도 본문은 그대로 남아야 한다.
          실패 시 SectionBackdrop의 CSS 유색 암부만 남는다. */}
      <VisualErrorBoundary>
        <VisualSystemCanvas
          pointer={pointer}
          journey={journey}
          active
          intensity={intensity}
          onStats={(s) => { statsRef.current = s }}
        />
      </VisualErrorBoundary>
      {!introComplete && <IntroSequence onEntered={handleEntered} />}
      <SiteNav visible={introComplete} />

      <main data-experience-schema="famoz-ia-v2">
        <HeroScene introComplete={introComplete} />
        {/* 선언 → 증거 순서. 첫 증거를 19.6화면 뒤가 아니라 여기서 만난다. */}
        <CompanyProof />
        <OzPortalHub />
        <CapabilityEvidence />
        <WorksFilm />
        <EndingScene />
      </main>

      {process.env.NODE_ENV !== 'production' && (
        <PerfOverlay statsRef={statsRef} preset="hero" />
      )}
    </>
  )
}
