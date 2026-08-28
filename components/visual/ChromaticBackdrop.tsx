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

/* 지시서 §3 Hero 팔레트를 암부 레벨로 낮춘 값.
   순수 red/green/magenta/cyan은 쓰지 않는다. */
const L0 = {
  graphitePlum: '#13101A',   // 기저 유색 암부
  aubergine:    '#24172D',   // 주광원 쪽 색면
  slate:        '#171C22',   // mist blue를 암부로
  warmShadow:   '#1E1A18',   // dusty amber를 암부로
  edge:         '#08070C',
}

export default function ChromaticBackdrop() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: [
          // 주광원 방향(좌상)에서 번지는 오베르진 색면 — 가장 넓은 면적
          `radial-gradient(ellipse 82% 70% at 28% 26%, ${L0.aubergine} 0%, transparent 66%)`,
          // 측면광(우하) 쪽 따뜻한 암부. 주광원보다 좁고 약하게
          `radial-gradient(ellipse 58% 54% at 80% 76%, ${L0.warmShadow} 0%, transparent 58%)`,
          // 중경을 낮게 채우는 차가운 면 — 깊이를 만들되 보색 충돌은 피한다
          `radial-gradient(ellipse 96% 50% at 56% 54%, ${L0.slate} 0%, transparent 62%)`,
          // 기저 유색 암부. 가장자리에서만 블랙에 가까워진다
          `radial-gradient(ellipse 130% 98% at 48% 46%, ${L0.graphitePlum} 0%, #0D0B12 74%, ${L0.edge} 100%)`,
        ].join(', '),
      }}
    />
  )
}
