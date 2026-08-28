'use client'
import { useEffect, useRef } from 'react'
import { labParams } from './labParams'

/**
 * L1 — Spatial Image Field  (z-index 1)
 *
 * 프로젝트 이미지를 "배경사진"으로 깔지 않는다. 명암 구조만 남기고 색과 형태를
 * 공간 요소로 환원한다 (famoz-art-direction L1):
 *   밝은 영역 → 후경 광원 / 중간 명도 → 공간면 / 어두운 영역 → 입자 공백
 *
 * 구현: 원본을 강하게 블러·저채도화해 큰 형태만 남긴 색면 + 그 위에 대비를 올린
 * 두 번째 사본을 screen 합성해 후경 광원처럼 보이게 한다. 가장자리는 마스크로
 * 감쇄시켜 사각 프레임이 드러나지 않게 한다.
 */
export default function SpatialImageField({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null)

  // Leva가 opacity를 바꿔도 리렌더 없이 반영
  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const el = ref.current
      if (el) el.style.opacity = String(labParams.imageFieldOpacity)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const mask =
    'radial-gradient(ellipse 82% 78% at 50% 48%, #000 8%, rgba(0,0,0,0.55) 52%, transparent 88%)'

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
        opacity: labParams.imageFieldOpacity,
        maskImage: mask, WebkitMaskImage: mask,
      }}
    >
      {/* 큰 공간면 — 형태만 남기고 색은 거의 지운다 */}
      <div style={{
        position: 'absolute', inset: '-8%',
        backgroundImage: `url(${src})`,
        backgroundSize: 'cover', backgroundPosition: '58% 42%',
        filter: 'blur(72px) saturate(0.22) brightness(0.62) contrast(1.15)',
        mixBlendMode: 'screen',
      }}/>
      {/* 후경 광원 — 밝은 영역만 크게 살려 빛 덩어리로 */}
      <div style={{
        position: 'absolute', inset: '-14%',
        backgroundImage: `url(${src})`,
        backgroundSize: 'cover', backgroundPosition: '58% 42%',
        filter: 'blur(140px) saturate(0.45) brightness(1.25) contrast(2.1)',
        mixBlendMode: 'screen', opacity: 0.55,
      }}/>
    </div>
  )
}
