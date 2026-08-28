'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import ChromaticBackdrop from '../../components/lab/ChromaticBackdrop'
import SpatialImageField from '../../components/lab/SpatialImageField'
import VolumetricLight from '../../components/lab/VolumetricLight'
import LabCanvas from '../../components/lab/LabCanvas'
import DebugPanel from '../../components/lab/DebugPanel'
import { PointerField } from '../../components/lab/pointerField'
import { labParams } from '../../components/lab/labParams'

/**
 * /visual-lab — 배경 시스템 프로토타입.
 *
 * 레이어 순서 (문서 §2). WebGL Canvas는 모든 핵심 콘텐츠보다 아래에 있다.
 *   z 0   ChromaticBackdrop
 *   z 1   SpatialImageField
 *   z 2   VolumetricLight
 *   z 3   WebGL (Fog + Gaussian Splat)
 *   z 10  Character / Project image
 *   z 20  Typography
 *   z 30  Debug panel
 */

const IMAGE_FIELD = '/works/immersive-01.png'
const CHARACTER   = '/mascot/robot.png'

export default function VisualLab() {
  const pointer = useMemo(() => new PointerField(), [])
  const [stats, setStats] = useState({ fps: 0, points: 0, coverage: 0, tier: 3 })
  const statRef = useRef(stats)

  useEffect(() => pointer.attach(window), [pointer])

  /* 검수용 DOM 브리지.
     헤드리스 드라이버(patchright)는 스텔스를 위해 evaluate를 격리 JS 컨텍스트에서
     실행하므로 페이지가 window에 붙인 값이 보이지 않는다. DOM은 공유되므로
     속성으로 주고받는다 — data-view 를 쓰면 뷰가 바뀌고 data-state 로 읽는다.
     (visual-qa 스킬: 눈에 안 보이는 것은 추측하지 말고 측정한다) */
  useEffect(() => {
    const node = document.getElementById('lab-debug')
    if (!node) return
    let raf = 0, last = 0
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      const v = node.dataset.view as typeof labParams.view | undefined
      if (v && v !== labParams.view) labParams.view = v
      if (t - last < 100) return
      last = t
      node.dataset.state = JSON.stringify({
        sx: +pointer.smooth.x.toFixed(3), sy: +pointer.smooth.y.toFixed(3),
        speed: +pointer.smoothVelocity.length().toFixed(5),
        strokes: pointer.strokeCount,
        idle: +pointer.idleTime.toFixed(2),
        ages: pointer.strokes.slice(0, 4).map(s => +s.z.toFixed(2)),
      })
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [pointer])

  // FPS 표시는 0.5초에 한 번만 갱신해 렌더 루프와 분리한다
  useEffect(() => {
    const id = setInterval(() => setStats({ ...statRef.current }), 500)
    return () => clearInterval(id)
  }, [])

  // 디버그 뷰에 따라 DOM 레이어 표시를 바꾼다
  const [view, setView] = useState(labParams.view)
  useEffect(() => {
    const id = setInterval(() => setView(labParams.view), 200)
    return () => clearInterval(id)
  }, [])

  const showBackdrop = view === 'composite' || view === 'background' || view === 'light'
  const showImage    = view === 'composite' || view === 'background'
  const showLight    = view === 'composite' || view === 'light'
  const showContent  = view === 'composite' || view === 'masks'

  return (
    <main className="lab-root">
      <style>{LAB_CSS}</style>

      {showBackdrop && <ChromaticBackdrop />}
      {showImage && <SpatialImageField src={IMAGE_FIELD} />}
      {showLight && <VolumetricLight pointer={pointer} />}

      <LabCanvas
        pointer={pointer}
        onStats={(s) => { statRef.current = s }}
      />

      {/* ── z 10 — 인물. 파티클은 이 위로 지나가지 않는다 ── */}
      <div className="visual-character" style={{ opacity: showContent ? 1 : 0 }}>
        {/* 발밑 접지 음영 */}
        <div className="char-ground" aria-hidden="true" />
        {/* 측면광과 일치하는 림 라이트 */}
        <div className="char-rim" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img data-char src={CHARACTER} alt="테스트용 캐릭터" draggable={false} />
      </div>

      {/* ── z 20 — DOM 타이포그래피 ── */}
      <div className="visual-content" style={{ opacity: showContent ? 1 : 0 }}>
        <div className="visual-copy" data-safe>
          <p className="eyebrow">공간 경험 디자인 스튜디오</p>
          <h1>
            상상을<br />
            <span className="hl">살아있는 공간 경험</span>으로<br />
            디자인합니다.
          </h1>
          <p className="body">
            콘텐츠·미디어·AI를 연결해<br />
            사람에게 반응하고 이야기를 이어가는 공간을 만듭니다.
          </p>
        </div>
        <a className="cta" href="#" data-safe onClick={(e) => e.preventDefault()}>
          대표 프로젝트 보기 <span aria-hidden="true">→</span>
        </a>
      </div>

      {/* ── 성능 정보 ── */}
      <div className="lab-stats" data-safe>
        <b>{stats.fps.toFixed(0)}</b> fps
        <span>{stats.points.toLocaleString()} pts</span>
        <span>coverage {(stats.coverage * 100).toFixed(0)}%</span>
        <span>tier {stats.tier}</span>
      </div>

      <div id="lab-debug" data-view="composite" hidden />
      <DebugPanel />
    </main>
  )
}

const LAB_CSS = `
.lab-root {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  /* 유색 암부 기저면 — 캔버스가 뜨기 전이나 tier 0에서도 검게 비지 않는다 */
  background:
    radial-gradient(ellipse 78% 66% at 26% 24%, #241329 0%, transparent 64%),
    radial-gradient(ellipse 62% 58% at 78% 74%, #211D1C 0%, transparent 60%),
    radial-gradient(ellipse 128% 96% at 48% 46%, #191721 0%, #0A0E19 72%, #05070C 100%);
}

/* ── z 20 콘텐츠 ─────────────────────────────────────── */
.visual-content {
  position: relative;
  z-index: 20;
  isolation: isolate;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(24px, 3vh, 40px);
  padding: clamp(28px, 6vw, 96px);
  max-width: 46rem;
  transition: opacity .25s ease;
}
.visual-copy { position: relative; }
/* 검정 박스가 아니라 배경 톤과 이어지는 국소 유색 암부 (문서 §4) */
.visual-copy::before {
  content: "";
  position: absolute;
  inset: -12% -18%;
  z-index: -1;
  background: radial-gradient(
    ellipse at 35% 50%,
    rgba(10, 14, 25, .72) 0%,
    rgba(22, 19, 34, .42) 48%,
    transparent 78%
  );
  filter: blur(22px);
}
.eyebrow {
  font-size: clamp(.66rem, .82vw, .78rem);
  letter-spacing: .22em;
  color: #B9A8C8;
  margin-bottom: 1.4rem;
}
.visual-content h1 {
  font-size: clamp(2.4rem, 5.6vw, 4.6rem);
  line-height: 1.16;
  letter-spacing: -.02em;
  color: #EDE8E0;
  text-shadow: 0 2px 26px rgba(8, 10, 20, .55);
  word-break: keep-all;
}
.visual-content h1 .hl { color: #C6A9DC; }
.visual-content .body {
  margin-top: 1.6rem;
  font-size: clamp(.95rem, 1.1vw, 1.12rem);
  line-height: 1.85;
  color: #A9A29E;
  text-shadow: 0 1px 16px rgba(8, 10, 20, .5);
}
.cta {
  align-self: flex-start;
  font-size: .9rem;
  color: #EDE8E0;
  text-decoration: none;
  padding: .55rem .2rem;
  border-bottom: 1px solid rgba(237, 232, 224, .38);
  text-shadow: 0 1px 14px rgba(8, 10, 20, .6);
}

/* ── z 10 인물 ───────────────────────────────────────── */
.visual-character {
  position: absolute;
  right: clamp(2%, 6vw, 9%);
  bottom: 0;
  height: min(74vh, 620px);
  z-index: 10;
  pointer-events: none;
  transition: opacity .25s ease;
}
.visual-character img {
  height: 100%;
  width: auto;
  display: block;
  /* 배경 광원 색이 외곽에 약하게 반영 */
  filter: drop-shadow(-14px -6px 26px rgba(150, 126, 190, .26))
          drop-shadow(18px 10px 30px rgba(200, 158, 100, .16));
}
.char-ground {
  position: absolute;
  left: 50%; bottom: -2%;
  width: 128%; height: 12%;
  transform: translateX(-50%);
  background: radial-gradient(ellipse at 50% 50%, rgba(6, 8, 16, .72) 0%, transparent 70%);
  filter: blur(10px);
}
.char-rim {
  position: absolute;
  inset: -12% -18%;
  background: radial-gradient(ellipse at 76% 62%, rgba(214, 170, 106, .18) 0%, transparent 62%);
  mix-blend-mode: screen;
  filter: blur(24px);
}

/* ── 성능 정보 ───────────────────────────────────────── */
.lab-stats {
  position: fixed;
  left: 16px; bottom: 14px;
  z-index: 20;
  display: flex; gap: 14px; align-items: baseline;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  letter-spacing: .04em;
  color: #7E8797;
  background: rgba(10, 14, 25, .5);
  padding: 6px 12px;
  border-radius: 6px;
  backdrop-filter: blur(8px);
}
.lab-stats b { color: #C6A9DC; font-size: 13px; }

@media (max-width: 760px) {
  .visual-character { height: 46vh; right: -4%; opacity: .85; }
  .visual-content { max-width: none; padding-bottom: 34vh; }
}

@media (prefers-reduced-motion: reduce) {
  .visual-character, .visual-content { transition: none; }
}
`
