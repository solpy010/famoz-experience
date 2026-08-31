'use client'
import { useEffect, useRef } from 'react'
import { subscribeScroll } from './scrollBus'

/**
 * L0 Chromatic Backdrop — CSS 전용. Canvas도 RAF도 쓰지 않는다.
 *
 * 원래 이 파일은 WebGLBackground였고 전역 파티클 캔버스를 함께 들고 있었다.
 * Hero의 L1~L3은 이제 VisualSystemCanvas가 담당하므로, 같은 배경을 두 시스템이
 * 동시에 그리지 않도록 여기서는 **유색 암부만** 남긴다.
 * (렌더러·지오메트리·머티리얼·셰이더는 전부 삭제됐다.)
 *
 * Hero 항목은 /visual-lab에서 검증한 L0 팔레트와 같은 값을 쓴다.
 */

/* ── L0 Chromatic Backdrop ─────────────────────────────────────
   장면마다 저주파 컬러 필드를 3개 겹친다: 주광원 방향의 색면, 반대편
   보조 색면, 그리고 유색 암부 기저면. 단일 radial-gradient는 쓰지 않는다.
   절대 블랙은 가장자리 감쇄에서만 나타난다. */
const L0 = {
  indigo:   '#0A0E19',
  petrol:   '#092846',
  plum:     '#211B55',
  graphite: '#111B36',
  charcoal: '#111A34',
  emerald:  '#093743',
} as const

const field = (a: string, b: string, base: string) => [
  `radial-gradient(ellipse 85% 70% at 70% 30%, ${a} 0%, transparent 60%)`,
  `radial-gradient(ellipse 75% 80% at 20% 75%, ${b} 0%, transparent 58%)`,
  `radial-gradient(ellipse 130% 95% at 50% 50%, ${base} 0%, ${L0.indigo} 78%, #05070C 100%)`,
].join(', ')

const SECTION_BG: Record<string, string> = {
  // /visual-lab에서 검증한 Hero L0 (graphite plum 기저 + aubergine)
  hero: [
    'radial-gradient(ellipse 78% 72% at 12% 72%, #183963 0%, transparent 62%)',
    'radial-gradient(ellipse 54% 68% at 57% 38%, #281D63 0%, transparent 64%)',
    'radial-gradient(ellipse 44% 74% at 88% 56%, #062D58 0%, transparent 66%)',
    'radial-gradient(ellipse 130% 104% at 50% 52%, #0B1733 0%, #070E23 68%, #050A18 100%)',
  ].join(', '),
  whatA:       field('#0B4450', '#123A56', L0.indigo),
  whatB:       field('#5A2528', '#4C3721', L0.indigo),
  whatC:       field('#49266B', '#123C62', L0.indigo),
  value:       field('#5A252D', '#49351F', L0.graphite),
  publicValue: field('#0B4054', '#4A3B20', L0.indigo),
  works:       field('#132B52', '#28215F', L0.indigo),
  ending:      field('#4B2635', '#4A3820', L0.indigo),
}


const SECTIONS = [
  { id: '#hero', preset: 'hero' }, { id: '#what', preset: 'whatA' },
  { id: '#value', preset: 'value' }, { id: '#public', preset: 'publicValue' },
  { id: '#works', preset: 'works' }, { id: '#ending', preset: 'ending' },
]

export default function SectionBackdrop() {
  const bgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bgEl = bgRef.current
    if (!bgEl) return
    let last = ''

    const detect = () => {
      const mid = window.innerHeight * 0.42
      let hit = 'hero'
      for (const s of SECTIONS) {
        const el = document.querySelector(s.id)
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (r.top <= mid && r.bottom > mid) { hit = s.preset; break }
      }
      if (hit === 'whatA') {
        const el = document.querySelector('#what')
        if (el) {
          const r = el.getBoundingClientRect()
          const prog = Math.min(1, Math.max(0, -r.top) / (el.scrollHeight - window.innerHeight))
          hit = prog < 0.33 ? 'whatA' : prog < 0.66 ? 'whatB' : 'whatC'
        }
      }
      if (hit !== last) {
        last = hit
        bgEl.style.background = SECTION_BG[hit] ?? SECTION_BG.hero
      }
    }

    const unsubscribe = subscribeScroll(detect)
    window.addEventListener('resize', detect)
    return () => {
      unsubscribe()
      window.removeEventListener('resize', detect)
    }
  }, [])

  return (
    <div ref={bgRef} aria-hidden="true" style={{
      position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
      transition: 'background 2.5s cubic-bezier(0.4,0,0.2,1)',
      background: SECTION_BG.hero,
    }}/>
  )
}
