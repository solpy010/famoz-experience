/**
 * Particle geometry builders — pure data, no Three.js scene logic.
 * These functions are stable: improving shaders or interaction never
 * requires touching the geometry layout.
 */

import * as THREE from 'three'

/**
 * Half-extent of the particle volume in world units. X and Y differ so the
 * field matches the camera frustum's aspect instead of being a cube that
 * under-fills the viewport horizontally.
 */
export type Span = { x: number; y: number }

/**
 * S-curve cluster centers [x, y, z, spread].
 * x/y and spread are NORMALISED to the span (-1..1) so the composition holds
 * its shape on any aspect ratio. z is absolute world depth.
 */
const CLUSTERS: [number, number, number, number][] = [
  [-0.85,  0.55, -2.4, 0.55],  // far upper-left, deep back
  [-0.42, -0.30, -1.9, 0.48],  // left mid
  [ 0.05,  0.35, -1.4, 0.45],  // center
  [ 0.46, -0.18, -0.9, 0.42],  // center-right
  [ 0.80,  0.40, -0.5, 0.40],  // right front
  [ 0.30, -0.62, -0.3, 0.38],  // lower center-right front
]

function randomClusteredPos(span: Span): { x: number; y: number; z: number; clusterStr: number } {
  if (Math.random() < 0.70) {
    const c = CLUSTERS[Math.floor(Math.random() * CLUSTERS.length)]
    const spX = c[3] * span.x, spY = c[3] * span.y
    const x = c[0]*span.x + (Math.random()-0.5)*spX*2
    const y = c[1]*span.y + (Math.random()-0.5)*spY*2
    const z = c[2] + (Math.random()-0.5)*c[3]*2.4
    const dx = (x - c[0]*span.x)/spX, dy = (y - c[1]*span.y)/spY
    const clusterStr = Math.max(0, 1 - Math.sqrt(dx*dx + dy*dy))
    return { x, y, z, clusterStr }
  }
  return {
    x: (Math.random()-0.5)*2*span.x,
    y: (Math.random()-0.5)*2*span.y,
    z: (Math.random()-0.5)*5,
    clusterStr: Math.random()*0.15,
  }
}

function randomBright(): number {
  const r = Math.random()
  return r < 0.65 ? 0.20+Math.random()*0.30
       : r < 0.88 ? 0.55+Math.random()*0.25
       :              0.85+Math.random()*0.15
}

/** Micro particles: uniform scatter (background texture layer) */
export function buildMicroGeometry(count: number, span: Span): THREE.BufferGeometry {
  const pos    = new Float32Array(count * 3)
  const orig   = new Float32Array(count * 3)
  const bright = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const x = (Math.random()-0.5)*2*span.x
    const y = (Math.random()-0.5)*2*span.y
    const r = Math.random()
    const z = r < 0.30 ? -2.0-Math.random()*0.5
            : r < 0.70 ? -1.0-Math.random()*1.0
            :              0.0-Math.random()*1.0
    pos[i*3]=x; pos[i*3+1]=y; pos[i*3+2]=z
    orig[i*3]=x; orig[i*3+1]=y; orig[i*3+2]=z
    bright[i] = 0.12 + Math.random()*0.32
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aOrigin',  new THREE.BufferAttribute(orig, 3))
  g.setAttribute('aBright',  new THREE.BufferAttribute(bright, 1))
  return g
}

/** Medium/Large clustered splats: non-uniform S-curve density */
export function buildClusteredGeometry(count: number, span: Span): THREE.BufferGeometry {
  const pos     = new Float32Array(count * 3)
  const orig    = new Float32Array(count * 3)
  const bright  = new Float32Array(count)
  const cluster = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const { x, y, z, clusterStr } = randomClusteredPos(span)
    pos[i*3]=x; pos[i*3+1]=y; pos[i*3+2]=z
    orig[i*3]=x; orig[i*3+1]=y; orig[i*3+2]=z
    bright[i]  = randomBright()
    cluster[i] = clusterStr
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aOrigin',  new THREE.BufferAttribute(orig, 3))
  g.setAttribute('aBright',  new THREE.BufferAttribute(bright, 1))
  g.setAttribute('aCluster', new THREE.BufferAttribute(cluster, 1))
  return g
}
