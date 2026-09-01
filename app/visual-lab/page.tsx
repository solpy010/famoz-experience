'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import ChromaticBackdrop from '../../components/visual/ChromaticBackdrop'
import VolumetricLight from '../../components/visual/VolumetricLight'
import VisualSystemCanvas from '../../components/visual/VisualSystemCanvas'
import DebugPanel from '../../components/visual/DebugPanel'
import { PointerField } from '../../components/visual/pointerField'
import { visualParams } from '../../components/visual/visualParams'

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

const CHARACTER   = '/mascot/robot.png'

export default function VisualLab() {
  const pointer = useMemo(() => new PointerField(), [])
  const [stats, setStats] = useState({
    fps: 0, points: 0, coverage: 0, tier: 3, dpr: 0, frameMs: 0,
    gpuMs: -1, longFrames: 0, drawCalls: 0, geometries: 0, textures: 0, programs: 0,
  })
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
      const v = node.dataset.view as typeof visualParams.view | undefined
      if (v && v !== visualParams.view) visualParams.view = v
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
  const [view, setView] = useState(visualParams.view)
  const [panel, setPanel] = useState(true)
  useEffect(() => {
    const id = setInterval(() => {
      setView(visualParams.view)
      setPanel(document.getElementById('lab-debug')?.dataset.panel !== 'off')
    }, 200)
    return () => clearInterval(id)
  }, [])

  /* L0는 L1/L2 캡처에서도 바탕으로 필요하다. 순수 L0만 볼 때는 'l0'. */
  const showBackdrop = view !== 'far' && view !== 'mid' && view !== 'near' && view !== 'velocity'
  const showContent  = view === 'composite' || view === 'masks'
  const showHaze     = view === 'composite'

  return (
    <main className="lab-root">
      <style>{LAB_CSS}</style>

      {showBackdrop && <ChromaticBackdrop />}
      {/* L1 공간면과 L2 광원은 캔버스 안의 전체화면 패스로 옮겼다.
          "광원이 공간면에 닿은 부분만 밝아짐"을 만들려면 L2가 L1의 필드를
          알아야 하고, DOM gradient 두 장으로는 표면 반사를 만들 수 없다. */}
      {view === 'composite' && <VolumetricLight pointer={pointer} />}

      <VisualSystemCanvas
        pointer={pointer}
        onStats={(s) => { statRef.current = s }}
      />

      {/* ── z 4 — 전경 대기 haze. 저밀도만, 콘텐츠를 덮지 않는다 ── */}
      {showHaze && <div className="fg-haze" aria-hidden="true" />}

      {/* ── z 10 — 인물. 파티클은 이 위로 지나가지 않는다 ── */}
      <div className="visual-character" style={{ opacity: showContent ? 1 : 0,
        ["--char" as string]: `url(${CHARACTER})` }}>
        {/* 인물 광학 합성 (지시서 §6).
            파티클을 인물 위로 올리는 방식이 아니라, 실루엣 마스크로 만든
            별도 light overlay를 이미지 **아래**에 깔아 외곽에서만 보이게 한다.
            캐릭터 자체 색은 바꾸지 않는다. */}
        <div className="char-ground" aria-hidden="true" />
        <div className="char-sep"  aria-hidden="true" />
        <div className="char-edge" aria-hidden="true" />
        <div className="char-warm" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img data-occlude src={CHARACTER} alt="테스트용 캐릭터" draggable={false} />
      </div>

      {/* ── z 20 — DOM 타이포그래피 ── */}
      <div className="visual-content" style={{ opacity: showContent ? 1 : 0 }}>
        <div className="visual-copy">
          <p className="eyebrow" data-safe="soft">공간 경험 디자인 스튜디오</p>
          {/* 제목은 라인 단위 마스크. 블록 하나로 묶으면 큰 사각 암부가 생기고,
              글자 사이에 밝은 입자가 끼는 것도 막지 못한다. */}
          <h1>
            <span className="line" data-safe="strong">상상을</span>
            <span className="line" data-safe="strong">
              살아있는 <span className="hl">공간 경험</span>으로
            </span>
            <span className="line" data-safe="strong">디자인합니다.</span>
          </h1>
          <p className="body">
            <span className="line" data-safe="soft">콘텐츠·미디어·AI를 연결해</span>
            <span className="line" data-safe="soft">사람에게 반응하고 이야기를 이어가는 공간을 만듭니다.</span>
          </p>
        </div>
        <a className="cta" href="#" data-safe="soft" onClick={(e) => e.preventDefault()}>
          대표 프로젝트 보기 <span aria-hidden="true">→</span>
        </a>
      </div>

      {/* ── 성능 정보 ── */}
      <div className="lab-stats" data-safe="soft">
        <b>{stats.fps.toFixed(0)}</b> fps
        <span>{stats.points.toLocaleString()} pts</span>
        <span>coverage {(stats.coverage * 100).toFixed(0)}%</span>
        <span>tier {stats.tier}</span>
        <span>DPR {stats.dpr.toFixed(2)}</span>
        <span>{stats.frameMs.toFixed(1)} ms</span>
        <span>GPU {stats.gpuMs < 0 ? 'n/a' : `${stats.gpuMs.toFixed(2)} ms`}</span>
        <span>{stats.drawCalls} draw</span>
        <span>{stats.longFrames} long</span>
      </div>

      {view === 'dist' && <DiagnosticField pointer={pointer} />}

      <div id="lab-debug" data-view="composite" data-panel="on" hidden />
      {panel && <DebugPanel />}
    </main>
  )
}

function DiagnosticField({ pointer }: { pointer: PointerField }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const el = ref.current
      if (!el) return
      el.style.setProperty('--px', `${(pointer.smooth.x / 9 + .5) * 100}%`)
      el.style.setProperty('--py', `${(-pointer.smooth.y / 5 + .5) * 100}%`)
      el.style.setProperty('--rot', `${Math.atan2(-pointer.smoothVelocity.y, pointer.smoothVelocity.x)}rad`)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [pointer])
  return (
    <div ref={ref} className="diagnostic-field" aria-hidden="true">
      <div className="diagnostic-radius" />
      <div className="diagnostic-key">
        <span className="far">후경</span><span className="mid">중경</span><span className="near">전경</span>
        <small>점의 긴 축 = 유동 방향 · 타원 = 포인터 영향장</small>
      </div>
    </div>
  )
}

const LAB_CSS = `
.lab-root {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  /* 유색 암부 기저면 — 캔버스가 뜨기 전이나 tier 0에서도 검게 비지 않는다 */
  background:
    radial-gradient(ellipse 82% 70% at 28% 26%, #24172D 0%, transparent 66%),
    radial-gradient(ellipse 58% 54% at 80% 76%, #1E1A18 0%, transparent 58%),
    radial-gradient(ellipse 96% 50% at 56% 54%, #171C22 0%, transparent 62%),
    radial-gradient(ellipse 130% 98% at 48% 46%, #13101A 0%, #0D0B12 74%, #08070C 100%);
}
.diagnostic-field { position:fixed; inset:0; z-index:29; pointer-events:none; --px:50%; --py:50%; --rot:0rad; }
.diagnostic-radius { position:absolute; left:var(--px); top:var(--py); width:26vw; height:16vw; max-height:26vh; transform:translate(-50%,-50%) rotate(var(--rot)); border:1px dashed rgba(255,255,255,.5); border-radius:50%; background:rgba(255,255,255,.018); }
.diagnostic-key { position:absolute; left:20px; bottom:20px; display:flex; align-items:center; gap:12px; padding:10px 12px; color:#eef3ff; background:rgba(4,7,14,.78); border:1px solid rgba(255,255,255,.16); font:11px/1.4 ui-monospace,monospace; }
.diagnostic-key span::before { content:''; display:inline-block; width:8px; height:8px; margin-right:5px; border-radius:50%; background:currentColor; }
.diagnostic-key .far { color:#387aff; }.diagnostic-key .mid { color:#38f5a3; }.diagnostic-key .near { color:#ffa833; }
.diagnostic-key small { opacity:.62; }

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
    rgba(13, 11, 20, .70) 0%,
    rgba(36, 23, 45, .40) 48%,
    transparent 78%
  );
  filter: blur(22px);
}
.eyebrow {
  font-size: clamp(.66rem, .82vw, .78rem);
  letter-spacing: .22em;
  color: #B5C4CB;   /* Pale Mist */
  margin-bottom: 1.4rem;
}
.visual-content h1 .line,
.visual-content .body .line { display: block; }
.visual-content h1 {
  font-size: clamp(2.4rem, 5.6vw, 4.6rem);
  line-height: 1.16;
  letter-spacing: -.02em;
  color: #EEE8DF;   /* Warm Ivory — 주광원이 글자 뒤에 있으므로 Ivory 고정 */
  text-shadow: 0 2px 30px rgba(13, 11, 20, .72);
  word-break: keep-all;
}
/* 강조는 한 단어에만. 라벤더는 배경 주광원과 같은 색이라 묻힌다. */
.visual-content h1 .hl { color: #D8CDBD; }  /* Pale Champagne */
.visual-content .body {
  margin-top: 1.6rem;
  font-size: clamp(.95rem, 1.1vw, 1.12rem);
  line-height: 1.85;
  color: #C3BCB4;
  text-shadow: 0 1px 16px rgba(8, 10, 20, .5);
}
.cta {
  align-self: flex-start;
  font-size: .9rem;
  color: #EEE8DF;
  text-decoration: none;
  padding: .55rem .2rem;
  border-bottom: 1px solid rgba(238, 232, 223, .34);
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
  filter: drop-shadow(-14px -6px 26px rgba(142, 122, 168, .22))
          drop-shadow(18px 10px 30px rgba(182, 129, 90, .12));
}
/* 발밑 diffuse contact shadow */
.char-ground {
  position: absolute;
  left: 50%; bottom: -1%;
  width: 116%; height: 15%;
  transform: translateX(-50%);
  background: radial-gradient(ellipse at 50% 60%, rgba(8, 7, 12, .88) 0%, rgba(8,7,12,.40) 46%, transparent 72%);
  filter: blur(12px);
}
/* 실루엣 마스크에 방향 마스크를 교차시킨다. 외곽 전체에 같은 glow를 두르면
   보라색 테두리가 되므로, 각 광원은 자기 방향의 외곽에만 나타난다. */
.char-sep, .char-edge, .char-warm {
  position: absolute;
  inset: 0;
  -webkit-mask-size: contain, 100% 100%; mask-size: contain, 100% 100%;
  -webkit-mask-repeat: no-repeat, no-repeat; mask-repeat: no-repeat, no-repeat;
  -webkit-mask-position: center, center; mask-position: center, center;
  -webkit-mask-composite: source-in; mask-composite: intersect;
  pointer-events: none;
}
/* 주광원(좌상)을 향한 외곽에만 cool edge light */
.char-edge {
  background: #8E7AA8;
  -webkit-mask-image: var(--char), linear-gradient(145deg, #000 0%, rgba(0,0,0,.55) 32%, transparent 58%);
  mask-image: var(--char), linear-gradient(145deg, #000 0%, rgba(0,0,0,.55) 32%, transparent 58%);
  opacity: .62;
  transform: translate(-5px, -6px);
  filter: blur(3px);
  mix-blend-mode: screen;
}
/* 반대쪽 하단에만 약한 warm bounce. 광원을 등진 외곽은 어둡게 남는다. */
.char-warm {
  background: #B6815A;
  -webkit-mask-image: var(--char), linear-gradient(325deg, #000 0%, rgba(0,0,0,.45) 26%, transparent 52%);
  mask-image: var(--char), linear-gradient(325deg, #000 0%, rgba(0,0,0,.45) 26%, transparent 52%);
  opacity: .26;
  transform: translate(6px, 6px);
  filter: blur(6px);
  mix-blend-mode: screen;
}
/* 대기 분리 — 균일한 outline이 아니라 배경이 밝은 상단부에만 */
.char-sep {
  background: #7895A6;
  -webkit-mask-image: var(--char), linear-gradient(170deg, #000 0%, rgba(0,0,0,.4) 38%, transparent 66%);
  mask-image: var(--char), linear-gradient(170deg, #000 0%, rgba(0,0,0,.4) 38%, transparent 66%);
  opacity: .20;
  transform: scale(1.03);
  filter: blur(16px);
  mix-blend-mode: screen;
}

/* ── z 4 전경 대기 haze ──────────────────────────────────
   저밀도만 허용한다. 콘텐츠(z10/z20)보다 아래이므로 타이포와 인물을 덮지
   않으며, 화면 가장자리에서만 존재감이 생기도록 마스크를 건다. */
.fg-haze {
  position: fixed;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  opacity: .5;
  background:
    radial-gradient(ellipse 62% 46% at 12% 88%, rgba(142, 122, 168, .10) 0%, transparent 70%),
    radial-gradient(ellipse 54% 40% at 92% 14%, rgba(120, 149, 166, .08) 0%, transparent 68%);
  mask-image: radial-gradient(ellipse 72% 66% at 50% 50%, transparent 34%, #000 100%);
  -webkit-mask-image: radial-gradient(ellipse 72% 66% at 50% 50%, transparent 34%, #000 100%);
  filter: blur(26px);
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
  color: #7A8189;
  background: rgba(13, 11, 20, .55);
  padding: 6px 12px;
  border-radius: 6px;
  backdrop-filter: blur(8px);
}
.lab-stats b { color: #8E7AA8; font-size: 13px; }

@media (max-width: 760px) {
  .visual-character { height: 46vh; right: -4%; opacity: .85; }
  .visual-content { max-width: none; padding-bottom: 34vh; }
}

@media (prefers-reduced-motion: reduce) {
  .visual-character, .visual-content { transition: none; }
}
`
