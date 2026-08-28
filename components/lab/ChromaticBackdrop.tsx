'use client'

/**
 * L0 — Chromatic Backdrop  (z-index 0)
 *
 * 유색 암부. 저주파 컬러 필드 4개를 겹친다. 단일 radial-gradient 금지.
 * 절대 블랙은 화면 가장자리 감쇄에서만 나타나며 면적의 10~15%를 넘지 않는다.
 *
 * 팔레트는 famoz-art-direction 의 HERO 행:
 *   배경 Deep Plum + Graphite Indigo
 */

const L0 = {
  indigo:   '#0A0E19',
  petrol:   '#0B2024',
  plum:     '#241329',
  graphite: '#191721',
  charcoal: '#211D1C',
}

export default function ChromaticBackdrop() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: [
          // 주광원 방향(좌상)에서 번지는 플럼 색면
          `radial-gradient(ellipse 78% 66% at 26% 24%, ${L0.plum} 0%, transparent 64%)`,
          // 보조광(우하) 쪽 따뜻한 차콜
          `radial-gradient(ellipse 62% 58% at 78% 74%, ${L0.charcoal} 0%, transparent 60%)`,
          // 중경을 채우는 페트롤 — 플럼과 보색에 가까워 깊이를 만든다
          `radial-gradient(ellipse 90% 52% at 58% 52%, ${L0.petrol} 0%, transparent 58%)`,
          // 기저 유색 암부. 가장자리에서만 블랙에 가까워진다
          `radial-gradient(ellipse 128% 96% at 48% 46%, ${L0.graphite} 0%, ${L0.indigo} 72%, #05070C 100%)`,
        ].join(', '),
      }}
    />
  )
}
