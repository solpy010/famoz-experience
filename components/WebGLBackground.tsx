'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { PRESETS, lerpPreset, detectTier, particleCount, type ScenePreset } from './sceneStore'

/* ─────────────────────────────────────────
   GLSL Shaders
───────────────────────────────────────── */

const vertexShader = /* glsl */`
  uniform float uTime;
  uniform float uSize;
  uniform float uDPR;
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec2  uPointer;       // NDC -1..1
  uniform vec2  uPointerVel;    // delta NDC per frame
  uniform float uPointerForce;
  uniform float uTurbulence;
  uniform float uIdleSpeed;
  uniform vec3  uFlowDir;
  uniform float uDensityMask;   // 0-1, particles above this index are hidden

  attribute float aIndex;       // 0..1 normalized particle index
  attribute vec3  aOrigin;      // initial random position -1..1

  varying vec3  vColor;
  varying float vAlpha;
  varying float vGlow;

  // Pseudo-random helpers
  float hash(float n) { return fract(sin(n) * 43758.5453); }

  // 3-axis simplex-like noise (fast approx)
  vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314*r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x2_ = x_ * ns.x + ns.yyyy;
    vec4 y2_ = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x2_) - abs(y2_);
    vec4 b0 = vec4(x2_.xy, y2_.xy);
    vec4 b1 = vec4(x2_.zw, y2_.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // Curl noise — divergence-free velocity field
  vec3 curlNoise(vec3 p) {
    float e = 0.1;
    float n1,n2,a,b;
    n1 = snoise(vec3(p.x, p.y+e, p.z)); n2 = snoise(vec3(p.x, p.y-e, p.z));
    a = (n1-n2)/(2.0*e);
    n1 = snoise(vec3(p.x, p.y, p.z+e)); n2 = snoise(vec3(p.x, p.y, p.z-e));
    b = (n1-n2)/(2.0*e);
    float cx = a - b;
    n1 = snoise(vec3(p.x, p.y, p.z+e)); n2 = snoise(vec3(p.x, p.y, p.z-e));
    a = (n1-n2)/(2.0*e);
    n1 = snoise(vec3(p.x+e, p.y, p.z)); n2 = snoise(vec3(p.x-e, p.y, p.z));
    b = (n1-n2)/(2.0*e);
    float cy = a - b;
    n1 = snoise(vec3(p.x+e, p.y, p.z)); n2 = snoise(vec3(p.x-e, p.y, p.z));
    a = (n1-n2)/(2.0*e);
    n1 = snoise(vec3(p.x, p.y+e, p.z)); n2 = snoise(vec3(p.x, p.y-e, p.z));
    b = (n1-n2)/(2.0*e);
    float cz = a - b;
    return vec3(cx, cy, cz);
  }

  void main() {
    // Density mask — hide particles beyond threshold
    if (aIndex > uDensityMask) {
      gl_Position = vec4(9999.0);
      gl_PointSize = 0.0;
      vAlpha = 0.0;
      return;
    }

    vec3 pos = aOrigin;

    // Curl noise idle flow
    float t = uTime * uIdleSpeed;
    vec3 noisePos = pos * 0.5 + vec3(t * 0.12, t * 0.08, t * 0.06);
    vec3 curl = curlNoise(noisePos) * uTurbulence;
    pos += curl;

    // Global flow drift
    pos += uFlowDir * uTime * 0.015;
    // Wrap space
    pos = fract(pos * 0.5 + 0.5) * 2.0 - 1.0;

    // Pointer force — velocity-based fluid push
    // Convert 3D pos to a 2D approximation for pointer proximity
    vec2 pos2d = pos.xy * 0.5;  // map -1..1 to roughly screen
    vec2 delta = pos2d - uPointer * 0.85;
    float dist2 = dot(delta, delta);
    float radius = 0.18;
    float influence = exp(-dist2 / (radius * radius));
    vec2 push = uPointerVel * influence * uPointerForce * 5.0;
    pos.xy += push;

    // Color — blend A→B by noise-driven factor
    float colorFactor = snoise(aOrigin * 0.8 + uTime * 0.04) * 0.5 + 0.5;
    vColor = mix(uColorA, uColorB, colorFactor);

    // Brightness — base + displacement glow
    float displace = length(push);
    vGlow = clamp(displace * 8.0, 0.0, 1.0);
    float brightness = 0.28 + vGlow * 0.55;

    // Alpha — vary by layer depth (z)
    float depth = pos.z * 0.5 + 0.5;
    vAlpha = brightness * (0.35 + depth * 0.65);

    // Size — near particles are bigger
    float baseSize = uSize * uDPR;
    gl_PointSize = baseSize * (0.6 + depth * 1.4) * (1.0 + vGlow * 2.0);

    // Project
    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;
  }
`

const fragmentShader = /* glsl */`
  varying vec3  vColor;
  varying float vAlpha;
  varying float vGlow;

  void main() {
    // Soft circular particle
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    float alpha = smoothstep(0.5, 0.0, d);

    // Inner glow core
    float core = smoothstep(0.2, 0.0, d) * vGlow * 0.8;

    vec3 col = vColor + core * vec3(0.6, 0.6, 0.8);
    float finalAlpha = alpha * vAlpha;

    if (finalAlpha < 0.005) discard;
    gl_FragColor = vec4(col, finalAlpha);
  }
`

/* ─────────────────────────────────────────
   Component
───────────────────────────────────────── */

export interface WebGLBgHandle {
  setPreset: (name: string, customPreset?: Partial<ScenePreset>) => void
}

export default function WebGLBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Share mutable refs so RAF loop doesn't cause re-renders
  const stateRef = useRef({
    currentPreset: { ...PRESETS.hero },
    targetPreset:  { ...PRESETS.hero },
    lerpT: 1,
    pointer:     new THREE.Vector2(0, 0),
    pointerVel:  new THREE.Vector2(0, 0),
    prevPointer: new THREE.Vector2(0, 0),
    time: 0,
    tier: 2 as 0 | 1 | 2 | 3,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const tier = detectTier()
    const count = particleCount(tier)
    stateRef.current.tier = tier

    if (tier === 0 || count === 0) return  // CSS fallback only

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier === 1 ? 1.0 : 1.5))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)

    /* ── Scene / Camera ── */
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100)
    camera.position.z = 2.2

    /* ── Geometry — distributed in a -1..1 cube ── */
    const positions = new Float32Array(count * 3)
    const indices   = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 2
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2
      indices[i] = i / count  // 0..1
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aOrigin',  new THREE.BufferAttribute(positions.slice(), 3))
    geo.setAttribute('aIndex',   new THREE.BufferAttribute(indices, 1))

    /* ── Material ── */
    const p = stateRef.current.currentPreset
    const uniforms = {
      uTime:        { value: 0 },
      uSize:        { value: tier === 1 ? 2.2 : tier === 2 ? 2.8 : 3.5 },
      uDPR:         { value: renderer.getPixelRatio() },
      uColorA:      { value: new THREE.Vector3(...p.colorA) },
      uColorB:      { value: new THREE.Vector3(...p.colorB) },
      uPointer:     { value: new THREE.Vector2(0, 0) },
      uPointerVel:  { value: new THREE.Vector2(0, 0) },
      uPointerForce:{ value: p.pointerForce },
      uTurbulence:  { value: p.turbulence },
      uIdleSpeed:   { value: p.idleSpeed },
      uFlowDir:     { value: new THREE.Vector3(...p.flowDir) },
      uDensityMask: { value: p.density },
    }

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const points = new THREE.Points(geo, mat)
    scene.add(points)

    /* ── Pointer tracking ── */
    const onPointerMove = (e: PointerEvent) => {
      const s = stateRef.current
      s.pointer.x =  (e.clientX / window.innerWidth)  * 2 - 1
      s.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })

    /* ── Scroll → scene detection ── */
    const sections: { id: string; el: Element | null; preset: string }[] = [
      { id: 'hero',   el: document.querySelector('#hero'),    preset: 'hero' },
      { id: 'what',   el: document.querySelector('#what'),         preset: 'whatA' },
      { id: 'value',  el: document.querySelector('#value'),        preset: 'value' },
      { id: 'public', el: document.querySelector('#public'),       preset: 'publicValue' },
      { id: 'works',  el: document.querySelector('#works'),        preset: 'works' },
      { id: 'ending', el: document.querySelector('#ending'),       preset: 'ending' },
    ]

    let lastPresetName = 'hero'

    const detectSection = () => {
      const mid = window.innerHeight * 0.45
      let active = 'hero'
      for (const s of sections) {
        if (!s.el) continue
        const r = s.el.getBoundingClientRect()
        if (r.top <= mid && r.bottom > mid) { active = s.preset; break }
      }
      if (active !== lastPresetName) {
        lastPresetName = active
        const s = stateRef.current
        s.targetPreset = { ...PRESETS[active] ?? PRESETS.hero }
        s.lerpT = 0
      }
    }
    window.addEventListener('scroll', detectSection, { passive: true })
    detectSection()

    /* ── WhatWeCreate sub-state (3 stages) ── */
    const whatEl = document.querySelector('#what')
    const updateWhatStage = () => {
      if (!whatEl) return
      const r = whatEl.getBoundingClientRect()
      const totalH = whatEl.scrollHeight - window.innerHeight
      const scrolled = Math.max(0, -r.top)
      const prog = Math.min(1, scrolled / totalH)
      const stage = prog < 0.33 ? 'whatA' : prog < 0.66 ? 'whatB' : 'whatC'
      if (lastPresetName.startsWith('what') && stage !== lastPresetName) {
        lastPresetName = stage
        stateRef.current.targetPreset = { ...PRESETS[stage] }
        stateRef.current.lerpT = 0
      }
    }
    window.addEventListener('scroll', updateWhatStage, { passive: true })

    /* ── Resize ── */
    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight)
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    /* ── RAF loop ── */
    let rafId = 0
    const clock = new THREE.Clock()

    const frame = () => {
      rafId = requestAnimationFrame(frame)
      const dt = clock.getDelta()
      const s = stateRef.current

      s.time += dt

      // Pointer velocity with damping
      s.pointerVel.x = (s.pointer.x - s.prevPointer.x) * 0.9 + s.pointerVel.x * 0.1
      s.pointerVel.y = (s.pointer.y - s.prevPointer.y) * 0.9 + s.pointerVel.y * 0.1
      s.pointerVel.multiplyScalar(0.90)
      s.prevPointer.copy(s.pointer)

      // Lerp preset over ~1.5s
      s.lerpT = Math.min(1, s.lerpT + dt / 1.5)
      const cur = lerpPreset(s.currentPreset, s.targetPreset, smoothstep(s.lerpT))
      if (s.lerpT >= 1) s.currentPreset = { ...s.targetPreset }

      // Push to uniforms
      uniforms.uTime.value        = s.time
      uniforms.uPointer.value.copy(s.pointer)
      uniforms.uPointerVel.value.copy(s.pointerVel)
      uniforms.uColorA.value.set(...cur.colorA)
      uniforms.uColorB.value.set(...cur.colorB)
      uniforms.uPointerForce.value = cur.pointerForce
      uniforms.uTurbulence.value   = cur.turbulence
      uniforms.uIdleSpeed.value    = cur.idleSpeed
      uniforms.uFlowDir.value.set(...cur.flowDir)
      uniforms.uDensityMask.value  = cur.density

      // Subtle camera drift
      camera.position.x = Math.sin(s.time * 0.08) * 0.04
      camera.position.y = Math.cos(s.time * 0.06) * 0.025

      renderer.render(scene, camera)
    }

    rafId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('scroll', detectSection)
      window.removeEventListener('scroll', updateWhatStage)
      window.removeEventListener('resize', onResize)
      geo.dispose()
      mat.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}
