'use client'
import { useEffect, useRef } from 'react'
import { labParams, LAYER_RESPONSE } from './labParams'
import type { PointerField } from './pointerField'

/**
 * L2 — Volumetric Light  (z-index 2)
 *
 * 파티클 자체 발광 대신 외부 광원을 만든다 (famoz-art-direction L2):
 *   주광원  후방 → 전방 확산
 *   측면광  splat 가장자리와 인물 실루엣 형성
 *   보조광  전경의 깊이와 색감
 *
 * 포인터에 대해 **위치는 거의 움직이지 않고 산란 방향과 노출만** 변한다
 * (문서 §10 "광원: 실제 위치는 거의 움직이지 않고 산란 방향과 노출만 변화").
 * 최대 이동량 2~4px.
 */
export default function VolumetricLight({ pointer }: { pointer: PointerField }) {
  const mainRef = useRef<HTMLDivElement>(null)
  const sideRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const t = (performance.now() - t0) / 1000
      // 광원은 포인터를 거의 따라가지 않는다. 지연이 가장 크고 힘이 가장 약하다.
      const d = pointer.delayed(LAYER_RESPONSE.light.lag)
      const ex = 1 + d.speed * labParams.exposureResponse * 14

      // 이동량 상한 4px (문서 §8: 광원·스모그 2~4px)
      const px = Math.max(-4, Math.min(4, d.vx * 260))
      const py = Math.max(-4, Math.min(4, d.vy * 260))

      if (mainRef.current) {
        mainRef.current.style.transform =
          `translate3d(${px * 0.5}px, ${py * 0.5}px, 0)`
        mainRef.current.style.opacity =
          String(Math.min(1, (0.52 + Math.sin(t * 0.09) * 0.06) * ex))
      }
      if (sideRef.current) {
        sideRef.current.style.transform = `translate3d(${px}px, ${py}px, 0)`
        sideRef.current.style.opacity =
          String(Math.min(1, (0.40 + Math.cos(t * 0.073) * 0.05) * ex))
      }
      if (fillRef.current) {
        fillRef.current.style.opacity =
          String(Math.min(1, (0.30 + Math.sin(t * 0.055 + 1.7) * 0.05) * ex))
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [pointer])

  const layer: React.CSSProperties = {
    position: 'absolute', inset: 0, mixBlendMode: 'screen',
    willChange: 'transform, opacity',
  }

  return (
    <div aria-hidden="true" style={{
      position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none',
    }}>
      {/* 주광원 — Smoky Lavender, 좌상 후방에서 전방으로 확산 */}
      <div ref={mainRef} style={{
        ...layer,
        background:
          'radial-gradient(ellipse 64% 68% at 24% 22%, rgba(142,122,168,0.30) 0%, rgba(110,95,134,0.14) 38%, transparent 76%)',
        filter: 'blur(28px)',
      }}/>
      {/* 측면광 — Champagne Amber, 우하에서 실루엣을 만든다 */}
      <div ref={sideRef} style={{
        ...layer,
        background:
          'radial-gradient(ellipse 40% 46% at 82% 74%, rgba(182,129,90,0.15) 0%, rgba(140,100,70,0.06) 42%, transparent 74%)',
        filter: 'blur(34px)',
      }}/>
      {/* 보조 산란광 — 중경 전체를 낮게 채워 깊이를 만든다 */}
      <div ref={fillRef} style={{
        ...layer,
        background:
          'radial-gradient(ellipse 104% 48% at 54% 56%, rgba(120,149,166,0.13) 0%, transparent 70%)',
        filter: 'blur(48px)',
      }}/>
    </div>
  )
}
