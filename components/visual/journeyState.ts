import { subscribeScroll } from '../scrollBus'

export const JOURNEY_IDS = ['hero', 'about', 'portal', 'capabilities', 'works', 'ending'] as const

/** 스크롤 이벤트에서는 숫자 하나만 갱신한다. WebGL 루프가 이 값을 보간한다. */
export class JourneyState {
  target = 0
  position = 0

  attach() {
    const update = () => {
      const anchors = JOURNEY_IDS
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => Boolean(el))
        .map((el) => el.offsetTop + Math.min(el.offsetHeight, innerHeight) * 0.5)
      if (anchors.length < 2) return
      const y = scrollY + innerHeight * 0.5
      let i = 0
      while (i < anchors.length - 2 && y >= anchors[i + 1]) i++
      const span = Math.max(1, anchors[i + 1] - anchors[i])
      const local = Math.max(0, Math.min(1, (y - anchors[i]) / span))
      this.target = Math.min(anchors.length - 1, i + local)
    }
    return subscribeScroll(update)
  }

  update(dt: number) {
    this.position += (this.target - this.position) * (1 - Math.exp(-dt * 4.8))
  }
}

