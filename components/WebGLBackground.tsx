'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { PRESETS, lerpPreset, detectTier } from './sceneStore'

/* ── Density: keep particles SMALL but many ───────────────────── */
function mkCount(tier: 0 | 1 | 2 | 3): number {
  switch (tier) {
    case 3: return 120_000
    case 2: return  60_000
    case 1: return  20_000
    default: return 0
  }
}

/* ── Per-section background gradient ─────────────────────────── */
const SECTION_BG: Record<string, string> = {
  hero:        'radial-gradient(ellipse 85% 65% at 72% 22%, #2e0c48 0%, #120420 55%, #04020c 100%)',
  whatA:       'radial-gradient(ellipse 75% 58% at 22% 58%, #062818 0%, #030e09 55%, #010303 100%)',
  whatB:       'radial-gradient(ellipse 95% 55% at 58% 35%, #321400 0%, #140800 55%, #060100 100%)',
  whatC:       'radial-gradient(ellipse 72% 68% at 78% 32%, #160642 0%, #080220 55%, #020008 100%)',
  value:       'radial-gradient(ellipse 95% 62% at 50% 55%, #1c1800 0%, #0a0900 55%, #030300 100%)',
  publicValue: 'radial-gradient(ellipse 72% 60% at 32% 58%, #041e12 0%, #020b07 55%, #010300 100%)',
  works:       'radial-gradient(ellipse 78% 62% at 68% 38%, #200e00 0%, #0c0700 55%, #040100 100%)',
  ending:      'radial-gradient(ellipse 82% 62% at 50% 72%, #140e00 0%, #090700 55%, #030200 100%)',
}

/* ══════════════════════════════════════════════════════════════
   VERTEX SHADER — 3D curl noise, Z-depth, glitch jitter
══════════════════════════════════════════════════════════════ */
const vertexShader = /* glsl */`
  uniform float uTime;
  uniform float uSize;
  uniform float uDPR;
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec2  uPointer;
  uniform vec2  uPointerVel;
  uniform float uPointerForce;
  uniform float uTurbulence;
  uniform float uIdleSpeed;
  uniform vec3  uFlowDir;
  uniform float uGlitch;     // 0-1

  attribute float aIndex;
  attribute vec3  aOrigin;   // initial pos in [-2,2]^3
  attribute float aBright;   // 0-1 pre-baked brightness tier

  varying vec3  vColor;
  varying float vAlpha;
  varying float vBright;

  /* ── Simplex 3D (Ian McEwan) ─────────────────── */
  vec3 mod289v3(vec3 x){return x-floor(x*(1./289.))*289.;}
  vec4 mod289v4(vec4 x){return x-floor(x*(1./289.))*289.;}
  vec4 permute(vec4 x){return mod289v4(((x*34.)+1.)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1./6.,1./3.);
    const vec4 D=vec4(0.,.5,1.,2.);
    vec3 i=floor(v+dot(v,C.yyy));
    vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);
    vec3 l=1.-g;
    vec3 i1=min(g.xyz,l.zxy);
    vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;
    vec3 x2=x0-i2+C.yyy;
    vec3 x3=x0-D.yyy;
    i=mod289v3(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
    float n_=.142857142857;
    vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z);
    vec4 y_=floor(j-7.*x_);
    vec4 x2_=x_*ns.x+ns.yyyy;
    vec4 y2_=y_*ns.x+ns.yyyy;
    vec4 h=1.-abs(x2_)-abs(y2_);
    vec4 b0=vec4(x2_.xy,y2_.xy);
    vec4 b1=vec4(x2_.zw,y2_.zw);
    vec4 s0=floor(b0)*2.+1.;
    vec4 s1=floor(b1)*2.+1.;
    vec4 sh=-step(h,vec4(0.));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
    vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);
    vec3 p1=vec3(a0.zw,h.y);
    vec3 p2=vec3(a1.xy,h.z);
    vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
    m=m*m;
    return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  /* ── Curl noise (divergence-free) ───────────────── */
  vec3 curlNoise(vec3 p){
    const float e=.08;
    float n1,n2,a,b;
    n1=snoise(vec3(p.x,p.y+e,p.z));n2=snoise(vec3(p.x,p.y-e,p.z));a=(n1-n2)/(2.*e);
    n1=snoise(vec3(p.x,p.y,p.z+e));n2=snoise(vec3(p.x,p.y,p.z-e));b=(n1-n2)/(2.*e);float cx=a-b;
    n1=snoise(vec3(p.x,p.y,p.z+e));n2=snoise(vec3(p.x,p.y,p.z-e));a=(n1-n2)/(2.*e);
    n1=snoise(vec3(p.x+e,p.y,p.z));n2=snoise(vec3(p.x-e,p.y,p.z));b=(n1-n2)/(2.*e);float cy=a-b;
    n1=snoise(vec3(p.x+e,p.y,p.z));n2=snoise(vec3(p.x-e,p.y,p.z));a=(n1-n2)/(2.*e);
    n1=snoise(vec3(p.x,p.y+e,p.z));n2=snoise(vec3(p.x,p.y-e,p.z));b=(n1-n2)/(2.*e);float cz=a-b;
    return vec3(cx,cy,cz);
  }

  void main(){
    vec3 pos = aOrigin;

    /* Curl noise idle flow */
    float t = uTime * uIdleSpeed;
    vec3 np = pos * 0.38 + vec3(t*0.10, t*0.07, t*0.055);
    pos += curlNoise(np) * uTurbulence * 0.55;

    /* Global drift */
    pos += uFlowDir * uTime * 0.006;

    /* Wrap in 3D box [-2, 2] */
    pos = fract(pos * 0.25 + 0.5) * 4.0 - 2.0;

    /* Glitch jitter — snaps to quantized positions when active */
    if (uGlitch > 0.02) {
      float gAmt = uGlitch;
      float jx = snoise(aOrigin * 14.0 + uTime * 60.0) * gAmt * 0.12;
      float jy = snoise(aOrigin * 11.0 + uTime * 55.0) * gAmt * 0.10;
      /* Digital snap: quantize to grid */
      float snap = 0.04;
      pos.x += floor(jx / snap) * snap;
      pos.y += floor(jy / snap) * snap;
    }

    /* Pointer fluid push */
    vec2 pos2d  = pos.xy * 0.42;
    vec2 delta  = pos2d - uPointer * 0.82;
    float dist2 = dot(delta, delta);
    float infl  = exp(-dist2 / 0.05);
    vec2 push   = uPointerVel * infl * uPointerForce * 7.0;
    pos.xy += push;

    /* Color */
    float ct = snoise(aOrigin * 0.65 + uTime * 0.025) * 0.5 + 0.5;
    vColor = mix(uColorA, uColorB, ct);

    /* Project */
    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);

    /* Depth-aware brightness */
    float depth = clamp(pos.z * 0.25 + 0.5, 0.0, 1.0);
    float pushStr = length(push);
    float glowBoost = clamp(pushStr * 12.0, 0.0, 1.2);
    vAlpha = aBright * (0.12 + depth * 0.78) * (1.0 + glowBoost * 0.8);
    vBright = aBright;

    /* Perspective-correct size — near=bigger, far=tiny */
    float camDist = max(-mvPos.z, 0.4);
    float perspFactor = 2.2 / camDist;
    gl_PointSize = uSize * uDPR * perspFactor * (0.4 + aBright * 1.6);
    gl_PointSize = clamp(gl_PointSize, 0.5, 6.0);  // hard cap: max 6px

    gl_Position = projectionMatrix * mvPos;
  }
`

/* ══════════════════════════════════════════════════════════════
   FRAGMENT SHADER — soft disk + 4-point star spike + bloom core
══════════════════════════════════════════════════════════════ */
const fragmentShader = /* glsl */`
  varying vec3  vColor;
  varying float vAlpha;
  varying float vBright;

  void main(){
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);

    /* Soft disk */
    float disk = smoothstep(0.5, 0.1, d);

    /* Bright core */
    float core = smoothstep(0.14, 0.0, d) * min(vBright * 1.8, 1.0);

    /* 4-point diffraction spike — only for brightest stars */
    float spike = 0.0;
    if(vBright > 0.75){
      float ax=abs(uv.x), ay=abs(uv.y);
      float s1=smoothstep(0.45,0.0,ax)*smoothstep(0.08,0.0,ay);
      float s2=smoothstep(0.45,0.0,ay)*smoothstep(0.08,0.0,ax);
      spike=(max(s1,s2))*(vBright-0.75)*3.5;
    }

    vec3  col   = vColor + core*vec3(0.5,0.4,0.6) + spike*0.9;
    float alpha = (disk + spike*0.25)*vAlpha;

    if(alpha < 0.004) discard;
    gl_FragColor = vec4(col, alpha);
  }
`

/* ══════════════════════════════════════════════════════════════
   CHROMATIC ABERRATION PASS (full-screen quad over render target)
══════════════════════════════════════════════════════════════ */
const chromaVert = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv=uv; gl_Position=vec4(position,1.0); }
`
const chromaFrag = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform float uStrength;
  uniform float uTime;
  varying vec2 vUv;
  void main(){
    float s   = uStrength * 0.009;
    float ang = uTime * 8.5;
    vec2  off = s * vec2(cos(ang), sin(ang));
    /* Offset scanline glitch — row-level jitter */
    float row = floor(vUv.y * 200.0);
    float rowJitter = sin(row * 1.7 + uTime * 40.0) * uStrength * 0.004;
    vec2 jitterOff = vec2(rowJitter, 0.0);
    vec4 r = texture2D(tDiffuse, vUv + off   + jitterOff);
    vec4 g = texture2D(tDiffuse, vUv         + jitterOff * 0.5);
    vec4 b = texture2D(tDiffuse, vUv - off);
    float a = max(r.a, max(g.a, b.a));
    gl_FragColor = vec4(r.r, g.g, b.b, a);
  }
`

/* ══════════════════════════════════════════════════════════════
   NEBULA SPRITE SHADER (large glow blobs — light & volume)
══════════════════════════════════════════════════════════════ */
const nebulaFrag = /* glsl */`
  uniform vec3  uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main(){
    vec2  uv = vUv - 0.5;
    float d  = length(uv);
    float g  = smoothstep(0.5, 0.0, d);
    g *= g; /* sharper falloff center */
    gl_FragColor = vec4(uColor * g, g * uOpacity);
  }
`
const nebulaVert = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`

/* ══════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════ */
export default function WebGLBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bgRef     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const bgEl   = bgRef.current
    if (!canvas) return

    const tier  = detectTier()
    const count = mkCount(tier)
    if (tier === 0 || count === 0) return

    /* ── Renderer ────────────────────────────────────── */
    const dpr = Math.min(window.devicePixelRatio, tier >= 3 ? 1.5 : 1.0)
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true })
    renderer.setPixelRatio(dpr)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)

    /* ── Scene / Camera ──────────────────────────────── */
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 50)
    camera.position.z = 3.5

    /* ── Geometry: 3D distribution in [-2,2]^3 ──────── */
    const pos3    = new Float32Array(count * 3)
    const origins = new Float32Array(count * 3)
    const indices = new Float32Array(count)
    const brights = new Float32Array(count)

    // Brightness distribution: 80% dim, 15% medium, 5% bright/sparkle
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 4
      const y = (Math.random() - 0.5) * 4
      const z = (Math.random() - 0.5) * 5   // deeper Z for star parallax
      pos3[i*3]=x; pos3[i*3+1]=y; pos3[i*3+2]=z
      origins[i*3]=x; origins[i*3+1]=y; origins[i*3+2]=z
      indices[i] = i / count
      const r = Math.random()
      brights[i] = r < 0.80 ? 0.15 + Math.random()*0.35   // dim
                 : r < 0.95 ? 0.55 + Math.random()*0.25   // medium
                 :             0.85 + Math.random()*0.15   // sparkle
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos3, 3))
    geo.setAttribute('aOrigin',  new THREE.BufferAttribute(origins, 3))
    geo.setAttribute('aIndex',   new THREE.BufferAttribute(indices, 1))
    geo.setAttribute('aBright',  new THREE.BufferAttribute(brights, 1))

    /* ── Particle material ───────────────────────────── */
    const p0 = PRESETS.hero
    const uniforms = {
      uTime:         { value: 0 },
      uSize:         { value: tier >= 3 ? 3.2 : tier === 2 ? 2.8 : 2.4 },
      uDPR:          { value: dpr },
      uColorA:       { value: new THREE.Vector3(...p0.colorA) },
      uColorB:       { value: new THREE.Vector3(...p0.colorB) },
      uPointer:      { value: new THREE.Vector2(0, 0) },
      uPointerVel:   { value: new THREE.Vector2(0, 0) },
      uPointerForce: { value: p0.pointerForce },
      uTurbulence:   { value: p0.turbulence },
      uIdleSpeed:    { value: p0.idleSpeed },
      uFlowDir:      { value: new THREE.Vector3(...p0.flowDir) },
      uGlitch:       { value: 0 },
    }
    const mat = new THREE.ShaderMaterial({
      vertexShader, fragmentShader, uniforms,
      transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    scene.add(new THREE.Points(geo, mat))

    /* ── Nebula sprites (volumetric light blobs) ─────── */
    const nebulaDefs = [
      { pos: [ 1.2,  0.6, -1.5], scale: 2.8, color: [0.55, 0.20, 0.90], opacity: 0.18 },
      { pos: [-1.0, -0.4, -2.0], scale: 3.5, color: [0.15, 0.55, 0.80], opacity: 0.14 },
      { pos: [ 0.3,  1.2, -2.5], scale: 2.2, color: [0.80, 0.35, 0.20], opacity: 0.12 },
      { pos: [-1.5,  0.8, -1.0], scale: 1.8, color: [0.20, 0.70, 0.50], opacity: 0.10 },
      { pos: [ 1.0, -1.0, -3.0], scale: 4.0, color: [0.45, 0.10, 0.70], opacity: 0.16 },
      { pos: [-0.5,  0.2, -0.8], scale: 1.4, color: [0.90, 0.60, 0.15], opacity: 0.08 },
    ]
    const nebulaPlaneGeo = new THREE.PlaneGeometry(1, 1)
    const nebulaMeshes: THREE.Mesh[] = []
    for (const def of nebulaDefs) {
      const nm = new THREE.ShaderMaterial({
        vertexShader: nebulaVert,
        fragmentShader: nebulaFrag,
        uniforms: {
          uColor:   { value: new THREE.Vector3(...def.color) },
          uOpacity: { value: def.opacity },
        },
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
      const mesh = new THREE.Mesh(nebulaPlaneGeo, nm)
      mesh.position.set(...(def.pos as [number,number,number]))
      mesh.scale.setScalar(def.scale)
      mesh.userData.baseOpacity = def.opacity
      scene.add(mesh)
      nebulaMeshes.push(mesh)
    }

    /* ── Render target + Chroma pass ─────────────────── */
    const rt = new THREE.WebGLRenderTarget(
      window.innerWidth * dpr, window.innerHeight * dpr,
      { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat }
    )
    const chromaMat = new THREE.ShaderMaterial({
      vertexShader: chromaVert,
      fragmentShader: chromaFrag,
      uniforms: {
        tDiffuse:  { value: null },
        uStrength: { value: 0 },
        uTime:     { value: 0 },
      },
      transparent: true, depthWrite: false,
    })
    const quadGeo   = new THREE.PlaneGeometry(2, 2)
    const quadScene = new THREE.Scene()
    const quadCam   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    quadScene.add(new THREE.Mesh(quadGeo, chromaMat))
    chromaMat.uniforms.tDiffuse.value = rt.texture

    /* ── State ───────────────────────────────────────── */
    let currentPreset = { ...PRESETS.hero }
    let targetPreset  = { ...PRESETS.hero }
    let lerpT = 1
    const pointer    = new THREE.Vector2(0, 0)
    const pointerVel = new THREE.Vector2(0, 0)
    const prevPtr    = new THREE.Vector2(0, 0)
    let glitchLevel  = 0
    let time         = 0
    let lastPreset   = 'hero'

    /* ── Pointer ─────────────────────────────────────── */
    const onPointer = (e: PointerEvent) => {
      pointer.x =  (e.clientX / window.innerWidth)  * 2 - 1
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onPointer, { passive: true })

    /* ── Scroll → section detection ──────────────────── */
    const SECTIONS = [
      { id: '#hero',   preset: 'hero' },
      { id: '#what',   preset: 'whatA' },
      { id: '#value',  preset: 'value' },
      { id: '#public', preset: 'publicValue' },
      { id: '#works',  preset: 'works' },
      { id: '#ending', preset: 'ending' },
    ]

    const detectSection = () => {
      const mid = window.innerHeight * 0.42
      let hit = 'hero'
      for (const s of SECTIONS) {
        const el = document.querySelector(s.id)
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (r.top <= mid && r.bottom > mid) { hit = s.preset; break }
      }
      // WhatWeCreate sub-stages
      if (hit === 'whatA') {
        const el = document.querySelector('#what')
        if (el) {
          const r = el.getBoundingClientRect()
          const prog = Math.min(1, Math.max(0, -r.top) / (el.scrollHeight - window.innerHeight))
          hit = prog < 0.33 ? 'whatA' : prog < 0.66 ? 'whatB' : 'whatC'
        }
      }
      if (hit !== lastPreset) {
        targetPreset = { ...PRESETS[hit] ?? PRESETS.hero }
        lerpT = 0
        lastPreset = hit
        // Trigger glitch burst on section change
        glitchLevel = Math.min(glitchLevel + 0.6, 1.0)
        // Update CSS background
        if (bgEl) bgEl.style.background = SECTION_BG[hit] ?? SECTION_BG.hero
      }
    }
    window.addEventListener('scroll', detectSection, { passive: true })

    /* ── Resize ──────────────────────────────────────── */
    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight)
      rt.setSize(window.innerWidth * dpr, window.innerHeight * dpr)
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    /* Initial bg */
    if (bgEl) bgEl.style.background = SECTION_BG.hero

    /* ── RAF loop ────────────────────────────────────── */
    let rafId = 0
    let last = performance.now()

    const frame = () => {
      rafId = requestAnimationFrame(frame)
      const now = performance.now()
      const dt  = Math.min((now - last) / 1000, 0.05)
      last = now
      time += dt

      /* Pointer velocity */
      pointerVel.x = (pointer.x - prevPtr.x) * 0.85 + pointerVel.x * 0.15
      pointerVel.y = (pointer.y - prevPtr.y) * 0.85 + pointerVel.y * 0.15
      pointerVel.multiplyScalar(0.88)
      prevPtr.copy(pointer)

      /* Glitch: high pointer velocity spikes glitch */
      const speed = pointerVel.length()
      if (speed > 0.018) glitchLevel = Math.min(glitchLevel + speed * 3, 1.0)
      glitchLevel = Math.max(0, glitchLevel - dt * 1.8)   // decay

      /* Preset lerp */
      lerpT = Math.min(1, lerpT + dt / 1.4)
      const cur = lerpPreset(currentPreset, targetPreset, smoothstep(lerpT))
      if (lerpT >= 1) currentPreset = { ...targetPreset }

      /* Update uniforms */
      uniforms.uTime.value         = time
      uniforms.uPointer.value.copy(pointer)
      uniforms.uPointerVel.value.copy(pointerVel)
      uniforms.uColorA.value.set(...cur.colorA)
      uniforms.uColorB.value.set(...cur.colorB)
      uniforms.uPointerForce.value = cur.pointerForce
      uniforms.uTurbulence.value   = cur.turbulence
      uniforms.uIdleSpeed.value    = cur.idleSpeed
      uniforms.uFlowDir.value.set(...cur.flowDir)
      uniforms.uGlitch.value       = glitchLevel

      /* Nebula breathing — slow pulse */
      for (const m of nebulaMeshes) {
        const nm = m.material as THREE.ShaderMaterial
        const pulse = 1.0 + Math.sin(time * 0.3 + m.position.x) * 0.15
        nm.uniforms.uOpacity.value = m.userData.baseOpacity * pulse
        /* Slowly drift nebulas */
        m.position.x += Math.sin(time * 0.05 + m.position.z) * 0.0004
        m.position.y += Math.cos(time * 0.04 + m.position.x) * 0.0003
        /* Face camera (billboard) */
        m.lookAt(camera.position)
      }

      /* Subtle camera drift */
      camera.position.x = Math.sin(time * 0.07) * 0.06 + pointer.x * 0.04
      camera.position.y = Math.cos(time * 0.055) * 0.04 + pointer.y * 0.03

      /* ── Render: particles → RT → chroma → screen ── */
      if (glitchLevel > 0.02) {
        renderer.setRenderTarget(rt)
        renderer.setClearColor(0x000000, 0)
        renderer.clear()
        renderer.render(scene, camera)
        renderer.setRenderTarget(null)

        chromaMat.uniforms.uStrength.value = glitchLevel
        chromaMat.uniforms.uTime.value     = time
        renderer.render(quadScene, quadCam)
      } else {
        renderer.setRenderTarget(null)
        renderer.render(scene, camera)
      }
    }
    rafId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('scroll', detectSection)
      window.removeEventListener('resize', onResize)
      geo.dispose(); mat.dispose()
      rt.dispose(); chromaMat.dispose(); quadGeo.dispose()
      nebulaPlaneGeo.dispose()
      nebulaMeshes.forEach(m => (m.material as THREE.ShaderMaterial).dispose())
      renderer.dispose()
    }
  }, [])

  return (
    <>
      {/* Ambient depth gradient — shifts per section */}
      <div
        ref={bgRef}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          transition: 'background 2.2s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
      {/* WebGL particle + nebula canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      {/* Subtle scanline texture overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0,
          zIndex: 2,
          pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
          mixBlendMode: 'overlay',
        }}
      />
    </>
  )
}

function smoothstep(t: number): number { return t * t * (3 - 2 * t) }
