/**
 * Mouse fluid interaction — completely isolated from rendering.
 * Three velocity layers with different inertia so each particle size class
 * can respond at its own pace. All values live in plain objects so
 * WebGL shaders can read them every frame without React re-renders.
 */

import * as THREE from 'three'

export type FluidState = {
  /** raw pointer in NDC [-1,1] */
  pointer: THREE.Vector2
  /** smoothed pointer for camera drift */
  smoothPtr: THREE.Vector2
  /** fast fluid layer  — micro particles   (lerp 0.045, decay 0.976) */
  fast: THREE.Vector2
  /** mid fluid layer   — medium splats     (lerp 0.026, decay 0.981) */
  mid: THREE.Vector2
  /** slow fluid layer  — large splats      (lerp 0.014, decay 0.987) */
  slow: THREE.Vector2
  /** integrated offset — smoke planes + particle sustained displacement */
  offset: THREE.Vector2
}

export function createFluidState(): FluidState {
  return {
    pointer:   new THREE.Vector2(0, 0),
    smoothPtr: new THREE.Vector2(0, 0),
    fast:      new THREE.Vector2(0, 0),
    mid:       new THREE.Vector2(0, 0),
    slow:      new THREE.Vector2(0, 0),
    offset:    new THREE.Vector2(0, 0),
  }
}

const _prev = new THREE.Vector2(0, 0)

export function tickFluid(state: FluidState): void {
  const rawX = state.pointer.x - _prev.x
  const rawY = state.pointer.y - _prev.y
  _prev.copy(state.pointer)

  /* smooth pointer for camera drift */
  state.smoothPtr.x += (state.pointer.x - state.smoothPtr.x) * 0.032
  state.smoothPtr.y += (state.pointer.y - state.smoothPtr.y) * 0.032

  /* fast: quick lerp-in, moderate decay */
  state.fast.x += (rawX - state.fast.x) * 0.045
  state.fast.y += (rawY - state.fast.y) * 0.045
  state.fast.multiplyScalar(0.976)

  /* mid: slower lerp-in */
  state.mid.x += (rawX - state.mid.x) * 0.026
  state.mid.y += (rawY - state.mid.y) * 0.026
  state.mid.multiplyScalar(0.981)

  /* slow: very inertial */
  state.slow.x += (rawX - state.slow.x) * 0.014
  state.slow.y += (rawY - state.slow.y) * 0.014
  state.slow.multiplyScalar(0.987)

  /* integrated offset: accumulate slow velocity, slow return to 0 */
  state.offset.x += state.slow.x * 0.55
  state.offset.y += state.slow.y * 0.55
  state.offset.multiplyScalar(0.993)
}

export function attachPointerListener(state: FluidState): () => void {
  const handler = (e: PointerEvent) => {
    state.pointer.x =  (e.clientX / window.innerWidth)  * 2 - 1
    state.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
  }
  window.addEventListener('pointermove', handler, { passive: true })
  return () => window.removeEventListener('pointermove', handler)
}
