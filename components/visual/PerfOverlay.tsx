'use client'
import { useEffect, useRef, useState } from 'react'
import type { VisualStats } from './VisualSystemCanvas'

/**
 * 개발 모드 성능 오버레이 (지시서 §9).
 *
 * swiftshader FPS는 실제 성능이 아니다. 사용자의 실제 GPU에서 측정할 수 있도록
 * 10초 자동 측정과 복사 가능한 JSON을 제공한다.
 *
 * Canvas/RAF 수는 DOM과 rAF 래핑으로 직접 센다.
 */

export type PerfSample = VisualStats & { canvasCount: number; rafCount: number }

const empty: PerfSample = {
  fps: 0, points: 0, coverage: 0, tier: 0, dpr: 0, frameMs: 0,
  gpuMs: -1, longFrames: 0,
  drawCalls: 0, geometries: 0, textures: 0, programs: 0,
  zoneCounts: [0, 0, 0, 0, 0], zRange: [0, 0],
  canvasCount: 0, rafCount: 0,
}

export default function PerfOverlay({
  statsRef, preset,
}: {
  statsRef: React.RefObject<VisualStats>
  preset: string
}) {
  const [live, setLive] = useState<PerfSample>(empty)
  const [result, setResult] = useState<string>('')
  const [testing, setTesting] = useState(false)
  const rafMeter = useRef({ sched: 0, frames: 0, loops: 0 })

  /* rAF를 감싸 동시 실행 루프 수를 센다. 루프는 매 프레임 재등록되므로
     스케줄 횟수 / 프레임 수 ≈ 활성 루프 수. */
  useEffect(() => {
    const orig = window.requestAnimationFrame.bind(window)
    const m = rafMeter.current
    window.requestAnimationFrame = (cb: FrameRequestCallback) => { m.sched++; return orig(cb) }
    let alive = true
    const tick = () => { if (!alive) return; m.frames++; orig(tick) }
    orig(tick)
    const id = setInterval(() => {
      m.loops = m.frames ? +(m.sched / m.frames).toFixed(2) : 0
      m.sched = 0; m.frames = 0
    }, 1000)
    return () => {
      alive = false
      clearInterval(id)
      window.requestAnimationFrame = orig
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setLive({
        ...(statsRef.current ?? empty),
        canvasCount: document.querySelectorAll('canvas').length,
        rafCount: rafMeter.current.loops,
      })
    }, 400)
    return () => clearInterval(id)
  }, [statsRef])

  const runTest = () => {
    setTesting(true)
    const frames: number[] = []
    let raf = 0
    let last = performance.now()
    const t0 = last
    const step = () => {
      const now = performance.now()
      frames.push(now - last)
      last = now
      if (now - t0 < 10_000) { raf = requestAnimationFrame(step); return }
      cancelAnimationFrame(raf)
      const sorted = [...frames].sort((a, b) => b - a)
      const onePctIdx = Math.max(0, Math.floor(sorted.length * 0.01) - 1)
      const avgMs = frames.reduce((a, b) => a + b, 0) / frames.length
      const s = statsRef.current ?? empty
      const out = {
        deviceTier: s.tier,
        dpr: s.dpr,
        particleCount: s.points,
        averageFps: +(1000 / avgMs).toFixed(1),
        onePercentLow: +(1000 / sorted[onePctIdx]).toFixed(1),
        averageFrameMs: +avgMs.toFixed(2),
        drawCalls: s.drawCalls,
        textures: s.textures,
        geometries: s.geometries,
        programs: s.programs,
        canvasCount: document.querySelectorAll('canvas').length,
        rafCount: rafMeter.current.loops,
        preset,
        userAgent: navigator.userAgent,
      }
      const json = JSON.stringify(out, null, 2)
      setResult(json)
      setTesting(false)
      // eslint-disable-next-line no-console
      console.log('[GPU TEST 10s]', out)
    }
    raf = requestAnimationFrame(step)
  }

  const row = (k: string, v: string | number) => (
    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
      <span style={{ opacity: 0.6 }}>{k}</span><b>{v}</b>
    </div>
  )

  return (
    <div style={{
      position: 'fixed', right: 12, bottom: 12, zIndex: 30,
      width: 232, padding: '10px 12px',
      font: '11px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace',
      color: '#C6CBD2', background: 'rgba(13,11,20,.82)',
      border: '1px solid rgba(255,255,255,.08)', borderRadius: 8,
      backdropFilter: 'blur(10px)', pointerEvents: 'auto',
    }}>
      {row('fps', live.fps.toFixed(0))}
      {row('frame ms', live.frameMs.toFixed(1))}
      {row('gpu ms', live.gpuMs < 0 ? 'n/a' : live.gpuMs.toFixed(2))}
      {row('long frames', live.longFrames)}
      {row('dpr', live.dpr.toFixed(2))}
      {row('particles', live.points.toLocaleString())}
      {row('zones A–E', live.zoneCounts.map(n => n.toLocaleString()).join(' / '))}
      {row('z range', `${live.zRange[0].toFixed(2)}…${live.zRange[1].toFixed(2)}`)}
      {row('draw calls', live.drawCalls)}
      {row('geometries', live.geometries)}
      {row('textures', live.textures)}
      {row('programs', live.programs)}
      {row('canvas', live.canvasCount)}
      {row('raf loops', live.rafCount)}
      {row('tier', live.tier)}
      {row('preset', preset)}
      <button
        onClick={runTest}
        disabled={testing}
        style={{
          marginTop: 8, width: '100%', padding: '6px 0',
          font: 'inherit', letterSpacing: '.06em',
          color: testing ? '#7A8189' : '#EEE8DF',
          background: 'rgba(142,122,168,.20)',
          border: '1px solid rgba(142,122,168,.45)', borderRadius: 5,
          cursor: testing ? 'default' : 'pointer',
        }}
      >
        {testing ? 'MEASURING…' : 'START 10S GPU TEST'}
      </button>
      {result && (
        <textarea
          readOnly
          value={result}
          onFocus={(e) => e.currentTarget.select()}
          style={{
            marginTop: 8, width: '100%', height: 110, resize: 'vertical',
            font: '10px/1.45 ui-monospace, monospace', color: '#C6CBD2',
            background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 5, padding: 6,
          }}
        />
      )}
    </div>
  )
}
