/**
 * Particle geometry builders — pure data, no Three.js scene logic.
 * These functions are stable: improving shaders or interaction never
 * requires touching the geometry layout.
 */

import * as THREE from 'three'

/** S-curve cluster centers [x, y, z, spread] */
const CLUSTERS: [number, number, number, number][] = [
  [-1.2,  0.9, -2.2, 1.1],  // upper-left back
  [-0.4,  0.1, -1.6, 0.9],  // center-left mid
  [ 0.5, -0.5, -1.1, 0.85], // center mid
  [ 1.0,  0.6, -0.7, 0.8],  // center-right front
  [ 0.2, -1.1, -0.4, 0.75], // lower-center front
]

function randomClusteredPos(): { x: number; y: number; z: number; clusterStr: number } {
  if (Math.random() < 0.70) {
    const c = CLUSTERS[Math.floor(Math.random() * CLUSTERS.length)]
    const sp = c[3]
    const x = c[0] + (Math.random()-0.5)*sp*2
    const y = c[1] + (Math.random()-0.5)*sp*2
    const z = c[2] + (Math.random()-0.5)*sp*1.2
    const distC = Math.sqrt((x-c[0])**2 + (y-c[1])**2)
    const clusterStr = Math.max(0, 1 - distC/sp)
    return { x, y, z, clusterStr }
  }
  return {
    x: (Math.random()-0.5)*4.2,
    y: (Math.random()-0.5)*4.2,
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
export function buildMicroGeometry(count: number): THREE.BufferGeometry {
  const pos    = new Float32Array(count * 3)
  const orig   = new Float32Array(count * 3)
  const bright = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const x = (Math.random()-0.5)*4.2
    const y = (Math.random()-0.5)*4.2
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
export function buildClusteredGeometry(count: number): THREE.BufferGeometry {
  const pos     = new Float32Array(count * 3)
  const orig    = new Float32Array(count * 3)
  const bright  = new Float32Array(count)
  const cluster = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const { x, y, z, clusterStr } = randomClusteredPos()
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
