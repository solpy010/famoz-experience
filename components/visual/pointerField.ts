import * as THREE from 'three'
import { visualParams } from './visualParams'

/**
 * 포인터 입력 처리 (문서 §6·§7)
 *
 * Raw pointer를 셰이더에 직접 넘기지 않는다. 다음을 각각 관리한다:
 *   raw / smooth / previous / velocity / smoothVelocity / activity / idleTime
 *
 * 그리고 **점이 아니라 이동 경로**에 힘을 주입하기 위해 최근 포인터 좌표를
 * 스트로크 히스토리로 유지한다. 셰이더는 연속한 두 점이 이루는 선분에서
 * 가장 가까운 점까지의 거리로 영향을 계산한다.
 *
 * 좌표계: Z_MID 평면의 월드 XY. 파티클 위치와 같은 공간이므로 셰이더에서
 * 투영을 다시 하지 않아도 된다.
 */

export const MAX_STROKE = 5           // 점 5개 = 선분 4개. 약 0.7초의 wake를 유지한다.
const HISTORY_SECONDS = 1.2           // delayed() 조회 범위
const HISTORY_CAPACITY = 96

type Sample = { t: number; vx: number; vy: number; speed: number }

export type DelayedSample = { vx: number; vy: number; speed: number }

export class PointerField {
  raw = new THREE.Vector2()
  smooth = new THREE.Vector2()
  previous = new THREE.Vector2()
  velocity = new THREE.Vector2()
  smoothVelocity = new THREE.Vector2()
  activity = 0
  idleTime = 0
  /** 느린 탐색/체류가 공간 구조로 바뀌는 0..1 신호와 그 잔상 */
  dwell = 0
  memory = 0
  inside = false

  /** (x, y, age, speed) — 셰이더 uniform으로 그대로 올린다 */
  strokes: THREE.Vector4[] = Array.from({ length: MAX_STROKE }, () => new THREE.Vector4(0, 0, 999, 0))
  strokeCount = 0

  private halfH = 1
  private aspect = 1
  private ndc = new THREE.Vector2()
  private history: Sample[] = Array.from({ length: HISTORY_CAPACITY }, () => ({ t: -99, vx: 0, vy: 0, speed: 0 }))
  private historyHead = 0
  private historyCount = 0
  private clock = 0
  private seeded = false
  private lastMoveT = -99
  private pendingX = 0
  private pendingY = 0
  private hasPending = false

  /** 스트로크 점 사이 최소 시간 간격(초). MAX_STROKE와 곱하면 wake 길이가 된다. */
  private static readonly STROKE_INTERVAL = 0.18
  /** 이 시간 이상 raw 입력이 없으면 입력이 끝난 것으로 본다. */
  private static readonly INPUT_TIMEOUT = 0.15

  /** 카메라가 바뀌면 호출. NDC → Z_MID 평면 월드 좌표 변환에 쓰인다. */
  setView(halfH: number, aspect: number) {
    this.halfH = halfH
    this.aspect = aspect
  }

  attach(target: Window | HTMLElement = window): () => void {
    const onMove = (e: PointerEvent) => {
      /* 고주사율 마우스는 한 프레임 사이에 수십 이벤트를 보낸다. 이벤트에서는
         숫자 두 개만 덮어쓰고, NDC 변환·seed·속도 처리는 update()에서 프레임당
         한 번 수행한다. DOM 입력 속도와 WebGL 루프가 경쟁하지 않게 한다. */
      this.pendingX = e.clientX
      this.pendingY = e.clientY
      this.hasPending = true
      this.inside = true
    }
    const onLeave = () => { this.inside = false }
    const t = target as Window
    t.addEventListener('pointermove', onMove as EventListener, { passive: true })
    t.addEventListener('pointerleave', onLeave as EventListener, { passive: true })
    return () => {
      t.removeEventListener('pointermove', onMove as EventListener)
      t.removeEventListener('pointerleave', onLeave as EventListener)
    }
  }

  update(dt: number) {
    const p = visualParams
    this.clock += dt

    if (this.hasPending) {
      this.hasPending = false
      this.ndc.set(
        (this.pendingX / window.innerWidth) * 2 - 1,
        -((this.pendingY / window.innerHeight) * 2 - 1),
      )
      this.raw.set(this.ndc.x * this.halfH * this.aspect, this.ndc.y * this.halfH)
      if (!this.seeded || this.idleTime > 0.5) {
        this.smooth.copy(this.raw)
        this.previous.copy(this.raw)
        this.smoothVelocity.set(0, 0)
        this.seeded = true
      }
      this.lastMoveT = this.clock
    }

    /* 모든 감쇠·평활 계수는 60fps 기준으로 정규화한다. 그렇지 않으면 문서가
       초 단위로 지정한 wake persistence·복귀 시간이 프레임레이트에 따라 달라진다. */
    const k = Math.min(dt * 60, 3)
    const inputActive = (this.clock - this.lastMoveT) < PointerField.INPUT_TIMEOUT

    // 위치 저역통과 → 속도 → 속도 저역통과 → 감쇠 (문서 §6 권장 구조)
    this.smooth.lerp(this.raw, 1 - Math.pow(1 - p.pointerSmoothing, k))
    this.velocity.copy(this.smooth).sub(this.previous).divideScalar(Math.max(k, 1e-3))

    /* 입력이 끝난 뒤에도 평활 좌표는 낡은 raw를 향해 계속 수렴한다. 그 잔여
       이동을 속도로 계속 흡수하면 흐름이 영원히 멈추지 않으므로, 입력이 끊기면
       새 속도를 받지 않고 감쇠만 적용한다. */
    if (inputActive) {
      this.smoothVelocity.lerp(this.velocity, 1 - Math.pow(1 - p.velocitySmoothing, k))
    }
    this.smoothVelocity.multiplyScalar(Math.pow(p.velocityDamping, k))
    this.previous.copy(this.smooth)

    const speed = this.smoothVelocity.length()
    this.idleTime = inputActive ? 0 : this.idleTime + dt
    this.activity += ((inputActive ? 1 : 0) - this.activity) * Math.min(1, dt * 3)

    /* 체류는 밝은 자석 점을 만들기 위한 값이 아니다. 움직임이 충분히 느리고
       0.22초 이상 한 영역을 탐색했을 때만 공간면 정렬을 시작한다. 이동하면
       dwell은 빠르게 풀리고 memory만 2~3초 남아 사용자의 흔적을 보존한다. */
    const settled = this.inside && this.seeded && this.idleTime > 0.22 && speed < 0.006
    const dwellTarget = settled ? 1 : 0
    const dwellRate = dwellTarget > this.dwell ? 1.25 : 3.8
    this.dwell += (dwellTarget - this.dwell) * Math.min(1, dt * dwellRate)
    this.memory = Math.max(this.memory * Math.pow(0.972, k), this.dwell * 0.92)

    const sample = this.history[this.historyHead]
    sample.t = this.clock
    sample.vx = this.smoothVelocity.x
    sample.vy = this.smoothVelocity.y
    sample.speed = speed
    this.historyHead = (this.historyHead + 1) % HISTORY_CAPACITY
    this.historyCount = Math.min(this.historyCount + 1, HISTORY_CAPACITY)

    /* 스트로크 히스토리.
       거리 조건만 쓰면 매 프레임 점이 밀려나 10칸 버퍼가 0.5초 만에 소진되고
       wake가 남지 않는다. 최소 **시간 간격**을 함께 걸어 버퍼가 실제로
       MAX_STROKE * STROKE_INTERVAL 만큼의 과거를 담게 한다. */
    const head = this.strokes[0]
    const moved = Math.hypot(this.smooth.x - head.x, this.smooth.y - head.y)
    const farEnough = moved > this.halfH * 0.02
    const oldEnough = head.z >= PointerField.STROKE_INTERVAL
    if (inputActive && (this.strokeCount === 0 || (farEnough && oldEnough))) {
      for (let i = MAX_STROKE - 1; i > 0; i--) this.strokes[i].copy(this.strokes[i - 1])
      this.strokes[0].set(this.smooth.x, this.smooth.y, 0, Math.min(speed, p.maxPointerSpeed))
      this.strokeCount = Math.min(this.strokeCount + 1, MAX_STROKE)
    }
    // 나이는 매 프레임 증가. 오래된 점은 셰이더에서 지수 감쇠로 사라진다.
    for (let i = 0; i < MAX_STROKE; i++) this.strokes[i].z += dt
  }

  /** lag초 전의 속도 샘플. DOM 레이어(광원 등)의 지연 반응에 쓴다. */
  delayed(lag: number): DelayedSample {
    const want = this.clock - lag
    for (let offset = 1; offset <= this.historyCount; offset++) {
      const index = (this.historyHead - offset + HISTORY_CAPACITY) % HISTORY_CAPACITY
      const s = this.history[index]
      if (this.clock - s.t > HISTORY_SECONDS) break
      if (s.t <= want) {
        return { vx: s.vx, vy: s.vy, speed: s.speed }
      }
    }
    return { vx: 0, vy: 0, speed: 0 }
  }
}
