'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { PRESETS, lerpPreset, detectTier } from './sceneStore'

/* ── Particle counts per GPU tier ─────────────────────────── */
function mkCounts(tier: 0|1|2|3) {
  // [micro, medium, large]
  if (tier === 3) return [18_000, 55_000, 12_000]
  if (tier === 2) return [ 9_000, 28_000,  6_000]
  if (tier === 1) return [ 3_000, 10_000,  2_000]
  return [0, 0, 0]
}

/* ── Colored dark section backgrounds ─────────────────────── */
const SECTION_BG: Record<string, string> = {
  hero:        'radial-gradient(ellipse 90% 75% at 68% 38%, #28172f 0%, #211326 30%, #17151f 62%, #090d18 100%)',
  whatA:       'radial-gradient(ellipse 85% 70% at 28% 55%, #11162b 0%, #0b2025 35%, #090d18 68%, #060810 100%)',
  whatB:       'radial-gradient(ellipse 95% 65% at 62% 38%, #321b1a 0%, #28120a 35%, #17100a 65%, #0e0805 100%)',
  whatC:       'radial-gradient(ellipse 80% 72% at 75% 35%, #0b1a2e 0%, #11162b 32%, #17151f 62%, #090d18 100%)',
  value:       'radial-gradient(ellipse 95% 68% at 50% 52%, #211c1b 0%, #1a1509 35%, #12100a 65%, #0a0807 100%)',
  publicValue: 'radial-gradient(ellipse 80% 65% at 35% 55%, #0b2025 0%, #11162b 32%, #090d18 65%, #060810 100%)',
  works:       'radial-gradient(ellipse 85% 68% at 65% 40%, #2a1508 0%, #1e0f05 35%, #130c05 65%, #090604 100%)',
  ending:      'radial-gradient(ellipse 88% 68% at 50% 68%, #211c1b 0%, #1a150a 35%, #120f08 62%, #090704 100%)',
}

/* ══════════════════════════════════════════════════════════════
   SHARED SIMPLEX NOISE + CURL
══════════════════════════════════════════════════════════════ */
const NOISE_GLSL = /* glsl */`
  vec3 mod289v3(vec3 x){return x-floor(x*(1./289.))*289.;}
  vec4 mod289v4(vec4 x){return x-floor(x*(1./289.))*289.;}
  vec4 permute(vec4 x){return mod289v4(((x*34.)+1.)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
    vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;
    vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
    i=mod289v3(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
    float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
    vec4 x2_=x_*ns.x+ns.yyyy;vec4 y2_=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x2_)-abs(y2_);
    vec4 b0=vec4(x2_.xy,y2_.xy);vec4 b1=vec4(x2_.zw,y2_.zw);
    vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
    return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
  vec3 curlNoise(vec3 p){
    const float e=.08;float n1,n2,a,b;
    n1=snoise(vec3(p.x,p.y+e,p.z));n2=snoise(vec3(p.x,p.y-e,p.z));a=(n1-n2)/(2.*e);
    n1=snoise(vec3(p.x,p.y,p.z+e));n2=snoise(vec3(p.x,p.y,p.z-e));b=(n1-n2)/(2.*e);float cx=a-b;
    n1=snoise(vec3(p.x,p.y,p.z+e));n2=snoise(vec3(p.x,p.y,p.z-e));a=(n1-n2)/(2.*e);
    n1=snoise(vec3(p.x+e,p.y,p.z));n2=snoise(vec3(p.x-e,p.y,p.z));b=(n1-n2)/(2.*e);float cy=a-b;
    n1=snoise(vec3(p.x+e,p.y,p.z));n2=snoise(vec3(p.x-e,p.y,p.z));a=(n1-n2)/(2.*e);
    n1=snoise(vec3(p.x,p.y+e,p.z));n2=snoise(vec3(p.x,p.y-e,p.z));b=(n1-n2)/(2.*e);float cz=a-b;
    return vec3(cx,cy,cz);
  }
`

/* ══════════════════════════════════════════════════════════════
   MICRO PARTICLE VERTEX — tiny 1-2.5px, fast fluid response
══════════════════════════════════════════════════════════════ */
const microVert = /* glsl */`
  uniform float uTime, uSize, uDPR;
  uniform vec3  uLightColorA, uLightColorB, uAmbient;
  uniform vec2  uFluidVel;
  uniform float uPointerForce, uTurbulence, uIdleSpeed;
  uniform vec3  uFlowDir;
  attribute vec3  aOrigin;
  attribute float aBright;
  varying vec3  vColor;
  varying float vAlpha;
  ${NOISE_GLSL}
  void main(){
    vec3 pos = aOrigin;
    float depth = clamp((aOrigin.z + 2.5)/5.0, 0.0, 1.0);
    pos.xy += uFluidVel * uPointerForce * (0.25 + depth*0.75) * 0.5;
    float t = uTime * uIdleSpeed;
    pos += curlNoise(pos*0.35 + vec3(t*0.08,t*0.06,t*0.045)) * uTurbulence * 0.4;
    pos += uFlowDir * uTime * 0.003;
    pos = fract(pos*0.25+0.5)*4.0-2.0;
    vec3 lA = vec3(sin(uTime*0.065)*2.8, cos(uTime*0.050)*2.0, -2.2);
    vec3 lB = vec3(cos(uTime*0.085)*2.2, sin(uTime*0.060)*1.6, -1.6);
    float atA = 1.0/(1.0+distance(pos,lA)*distance(pos,lA)*0.22);
    float atB = 1.0/(1.0+distance(pos,lB)*distance(pos,lB)*0.26);
    vec3 baseEmit = uAmbient*0.28 + (uLightColorA+uLightColorB)*0.06*aBright;
    vec3 received = uLightColorA*atA*aBright*2.2 + uLightColorB*atB*aBright*1.6;
    float fog = clamp((1.0-depth)*0.38+(1.0-aBright)*0.08, 0.0, 1.0);
    vColor = mix(baseEmit+received, uAmbient*0.25, fog*0.45);
    vAlpha = aBright * (0.30+depth*0.50) * (1.0-fog*0.30);
    vec4 mvPos = modelViewMatrix*vec4(pos,1.0);
    float camDist = max(-mvPos.z, 0.5);
    gl_PointSize = clamp(uSize*uDPR*(1.2/camDist)*(0.5+depth*0.5), 0.5, 2.5);
    gl_Position = projectionMatrix*mvPos;
  }
`

/* ══════════════════════════════════════════════════════════════
   MICRO FRAGMENT — tight gaussian (less noisy than hard circle)
══════════════════════════════════════════════════════════════ */
const microFrag = /* glsl */`
  varying vec3 vColor; varying float vAlpha;
  void main(){
    vec2 uv = gl_PointCoord-0.5;
    float d2 = dot(uv,uv)*4.0;
    float g = exp(-d2*4.5);
    float alpha = g*vAlpha;
    if(alpha<0.004) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`

/* ══════════════════════════════════════════════════════════════
   MEDIUM SPLAT VERTEX — 3-8px, clustered, moderate fluid delay
══════════════════════════════════════════════════════════════ */
const mediumVert = /* glsl */`
  uniform float uTime, uSize, uDPR;
  uniform vec3  uLightColorA, uLightColorB, uAmbient;
  uniform vec2  uFluidVelMid;
  uniform float uPointerForce, uTurbulence, uIdleSpeed;
  uniform vec3  uFlowDir;
  attribute vec3  aOrigin;
  attribute float aBright;
  attribute float aCluster; // 0-1: cluster strength
  varying vec3  vColor;
  varying float vAlpha;
  ${NOISE_GLSL}
  void main(){
    vec3 pos = aOrigin;
    float depth = clamp((aOrigin.z+2.5)/5.0, 0.0, 1.0);
    /* Medium splats: slower fluid response (×0.6) */
    pos.xy += uFluidVelMid * uPointerForce * (0.15+depth*0.65) * 0.4;
    float t = uTime * uIdleSpeed * 0.85;
    pos += curlNoise(pos*0.28+vec3(t*0.07,t*0.05,t*0.04)) * uTurbulence * 0.45;
    pos += uFlowDir * uTime * 0.003;
    pos = fract(pos*0.25+0.5)*4.0-2.0;
    vec3 lA = vec3(sin(uTime*0.065)*2.8, cos(uTime*0.050)*2.0, -2.2);
    vec3 lB = vec3(cos(uTime*0.085)*2.2, sin(uTime*0.060)*1.6, -1.6);
    float atA = 1.0/(1.0+distance(pos,lA)*distance(pos,lA)*0.18);
    float atB = 1.0/(1.0+distance(pos,lB)*distance(pos,lB)*0.22);
    /* Density field: discard sparse areas based on noise */
    float densityNoise = snoise(aOrigin*0.55+vec3(uTime*0.008,0.0,0.0))*0.5+0.5;
    float density = aCluster*0.7 + densityNoise*0.3;
    /* Keep ~55% of area populated */
    if(density < 0.38) {
      gl_Position = vec4(9999.0);
      gl_PointSize = 0.0;
      return;
    }
    vec3 baseEmit = uAmbient*0.32 + (uLightColorA+uLightColorB)*0.08*aBright;
    vec3 received = uLightColorA*atA*aBright*2.5 + uLightColorB*atB*aBright*1.8;
    float fog = clamp((1.0-depth)*0.35+(1.0-aBright)*0.10, 0.0, 1.0);
    vColor = mix(baseEmit+received, uAmbient*0.30, fog*0.50);
    /* Alpha: cluster areas denser */
    float clusterBoost = aCluster*0.4;
    vAlpha = aBright * (0.28+depth*0.48+clusterBoost) * (1.0-fog*0.35);
    vec4 mvPos = modelViewMatrix*vec4(pos,1.0);
    float camDist = max(-mvPos.z, 0.4);
    /* Medium splats: 3-8px based on depth and light proximity */
    float lightProx = max(atA, atB);
    float splatSize = uSize * 2.2 * uDPR * (1.4/camDist) * (0.5+depth*0.6) * (0.8+lightProx*0.5);
    gl_PointSize = clamp(splatSize, 2.5, 8.5);
    gl_Position = projectionMatrix*mvPos;
  }
`

/* ══════════════════════════════════════════════════════════════
   MEDIUM FRAGMENT — soft gaussian splat (the key aesthetic)
══════════════════════════════════════════════════════════════ */
const mediumFrag = /* glsl */`
  varying vec3 vColor; varying float vAlpha;
  void main(){
    vec2 uv = gl_PointCoord-0.5;
    float d2 = dot(uv,uv)*4.0;
    /* Soft gaussian — no hard edge, smooth falloff */
    float g = exp(-d2*2.8);
    float alpha = g*vAlpha;
    if(alpha<0.003) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`

/* ══════════════════════════════════════════════════════════════
   LARGE SPLAT VERTEX — 8-30px, atmospheric, slowest response
══════════════════════════════════════════════════════════════ */
const largeVert = /* glsl */`
  uniform float uTime, uSize, uDPR;
  uniform vec3  uLightColorA, uLightColorB, uAmbient;
  uniform vec2  uFluidVelSlow;
  uniform float uPointerForce, uTurbulence, uIdleSpeed;
  uniform vec3  uFlowDir;
  attribute vec3  aOrigin;
  attribute float aBright;
  attribute float aCluster;
  varying vec3  vColor;
  varying float vAlpha;
  ${NOISE_GLSL}
  void main(){
    vec3 pos = aOrigin;
    float depth = clamp((aOrigin.z+2.5)/5.0, 0.0, 1.0);
    /* Large splats: very slow fluid response (×0.3) */
    pos.xy += uFluidVelSlow * uPointerForce * (0.10+depth*0.50) * 0.3;
    float t = uTime * uIdleSpeed * 0.6;
    pos += curlNoise(pos*0.22+vec3(t*0.05,t*0.04,t*0.03)) * uTurbulence * 0.35;
    pos += uFlowDir * uTime * 0.002;
    pos = fract(pos*0.25+0.5)*4.0-2.0;
    vec3 lA = vec3(sin(uTime*0.065)*2.8, cos(uTime*0.050)*2.0, -2.2);
    vec3 lB = vec3(cos(uTime*0.085)*2.2, sin(uTime*0.060)*1.6, -1.6);
    float atA = 1.0/(1.0+distance(pos,lA)*distance(pos,lA)*0.14);
    float atB = 1.0/(1.0+distance(pos,lB)*distance(pos,lB)*0.16);
    float lightProx = max(atA, atB);
    vec3 baseEmit = uAmbient*0.20;
    vec3 received = (uLightColorA*atA + uLightColorB*atB) * aBright * 1.8;
    float fog = clamp((1.0-depth)*0.45, 0.0, 1.0);
    vColor = mix(baseEmit+received, uAmbient*0.40, fog*0.55);
    /* Large splats: very transparent, only visible where lit */
    vAlpha = aBright * (0.06+lightProx*0.22+depth*0.10) * (1.0-fog*0.40);
    vec4 mvPos = modelViewMatrix*vec4(pos,1.0);
    float camDist = max(-mvPos.z, 0.3);
    /* 8-30px — the key to "spatial mass" feel */
    float splatSize = uSize * 5.5 * uDPR * (1.6/camDist) * (0.4+depth*0.7) * (0.5+lightProx*1.2);
    gl_PointSize = clamp(splatSize, 7.0, 30.0);
    gl_Position = projectionMatrix*mvPos;
  }
`

/* ══════════════════════════════════════════════════════════════
   LARGE FRAGMENT — very soft gaussian (spatially diffuse)
══════════════════════════════════════════════════════════════ */
const largeFrag = /* glsl */`
  varying vec3 vColor; varying float vAlpha;
  void main(){
    vec2 uv = gl_PointCoord-0.5;
    float d2 = dot(uv,uv)*4.0;
    /* Very soft gaussian — like volumetric splat */
    float g = exp(-d2*1.4);
    float alpha = g*vAlpha;
    if(alpha<0.002) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`

/* ══════════════════════════════════════════════════════════════
   SMOKE LAYER SHADER
══════════════════════════════════════════════════════════════ */
const smokeVert = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`
const smokeFrag = /* glsl */`
  uniform vec3  uSmokeColor;
  uniform float uOpacity, uTime, uLayer;
  uniform vec2  uFluidOff;
  varying vec2 vUv;
  float fbm(vec2 p){
    float s=0.010+uLayer*0.007;
    float v=sin(p.x*1.5+uTime*s)*cos(p.y*1.3+uTime*s*0.85)*0.5
           +sin(p.x*3.2+uTime*s*1.5+1.2)*cos(p.y*2.8+uTime*s*1.3+0.7)*0.3
           +sin(p.x*6.5+uTime*s*2.4+2.8)*cos(p.y*5.8+uTime*s*2.0+1.5)*0.2;
    return v*0.5+0.5;
  }
  void main(){
    vec2 uv=vUv+uFluidOff*(0.06+uLayer*0.12);
    float d=fbm(uv*(1.3+uLayer*0.5));
    float e=1.0-smoothstep(0.22,0.50,length(vUv-0.5));
    d=smoothstep(0.25,0.75,d*e);
    float pulse=0.85+sin(uTime*0.16+uLayer*2.0)*0.15;
    gl_FragColor=vec4(uSmokeColor, d*uOpacity*pulse);
  }
`

/* ══════════════════════════════════════════════════════════════
   LIGHT SHAFT SHADER
══════════════════════════════════════════════════════════════ */
const shaftVert = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`
const shaftFrag = /* glsl */`
  uniform vec3 uColor; uniform float uOpacity,uTime,uPhase;
  varying vec2 vUv;
  void main(){
    vec2 uv=vUv-0.5;
    float s=exp(-uv.x*uv.x*20.0)*(1.0-smoothstep(0.26,0.5,abs(uv.y)));
    float c=exp(-length(uv)*3.2)*0.55;
    float b=0.72+sin(uTime*0.20+uPhase)*0.28;
    gl_FragColor=vec4(uColor,(s+c)*uOpacity*b);
  }
`

/* ══════════════════════════════════════════════════════════════
   HELPER: build clustered non-uniform positions
══════════════════════════════════════════════════════════════ */
function buildClusteredGeometry(count: number, clusters: number[][]) {
  const pos   = new Float32Array(count * 3)
  const orig  = new Float32Array(count * 3)
  const bright = new Float32Array(count)
  const cluster = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    let x: number, y: number, z: number, clusterStrength: number

    if (Math.random() < 0.72) {
      // Place near a cluster center
      const c = clusters[Math.floor(Math.random() * clusters.length)]
      const spread = c[3] ?? 1.2
      x = c[0] + (Math.random()-0.5)*spread*2
      y = c[1] + (Math.random()-0.5)*spread*2
      z = c[2] + (Math.random()-0.5)*spread*1.2
      // Higher cluster strength near center
      const distFromCenter = Math.sqrt((x-c[0])**2 + (y-c[1])**2)
      clusterStrength = Math.max(0, 1.0 - distFromCenter / spread)
    } else {
      // Sparse background scatter
      x = (Math.random()-0.5)*4
      y = (Math.random()-0.5)*4
      z = (Math.random()-0.5)*5
      clusterStrength = Math.random()*0.2
    }

    pos[i*3]=x; pos[i*3+1]=y; pos[i*3+2]=z
    orig[i*3]=x; orig[i*3+1]=y; orig[i*3+2]=z
    cluster[i] = clusterStrength

    const br = Math.random()
    bright[i] = br < 0.65 ? 0.20+Math.random()*0.30
              : br < 0.88 ? 0.55+Math.random()*0.25
              :              0.85+Math.random()*0.15
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aOrigin',  new THREE.BufferAttribute(orig, 3))
  geo.setAttribute('aBright',  new THREE.BufferAttribute(bright, 1))
  geo.setAttribute('aCluster', new THREE.BufferAttribute(cluster, 1))
  return geo
}

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

    const tier = detectTier()
    const [cntMicro, cntMedium, cntLarge] = mkCounts(tier)
    if (tier === 0 || cntMedium === 0) return

    /* ── Renderer ────────────────────────────────────── */
    const dpr = Math.min(window.devicePixelRatio, tier >= 3 ? 1.5 : 1.0)
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true })
    renderer.setPixelRatio(dpr)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)

    /* ── Scene / Camera ──────────────────────────────── */
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 50)
    camera.position.z = 3.5

    /* ── Cluster centers: S-curve flow through space ── */
    // [x, y, z, spread] — forms a flowing S-curve path
    const CLUSTERS = [
      [-1.0,  0.8, -2.2, 1.0],  // upper-left back
      [-0.2, -0.3, -1.5, 0.9],  // center-left mid
      [ 0.8,  0.4, -1.0, 0.85], // center-right mid
      [ 0.2, -0.9, -0.5, 0.8],  // lower-center front
      [ 1.1,  1.0, -0.8, 0.7],  // upper-right front
    ]

    const p0 = PRESETS.hero
    const baseUniforms = () => ({
      uTime:         { value: 0 },
      uSize:         { value: tier >= 3 ? 1.9 : tier === 2 ? 1.7 : 1.5 },
      uDPR:          { value: dpr },
      uLightColorA:  { value: new THREE.Vector3(...p0.lightColorA) },
      uLightColorB:  { value: new THREE.Vector3(...p0.lightColorB) },
      uAmbient:      { value: new THREE.Vector3(...p0.ambientColor) },
      uPointerForce: { value: p0.pointerForce },
      uTurbulence:   { value: p0.turbulence },
      uIdleSpeed:    { value: p0.idleSpeed },
      uFlowDir:      { value: new THREE.Vector3(...p0.flowDir) },
    })

    /* ── MICRO particles ─────────────────────────────── */
    const microGeo = (() => {
      // Micro: more uniform scatter (background texture)
      const pos   = new Float32Array(cntMicro * 3)
      const orig  = new Float32Array(cntMicro * 3)
      const bright = new Float32Array(cntMicro)
      for (let i = 0; i < cntMicro; i++) {
        const x = (Math.random()-0.5)*4
        const y = (Math.random()-0.5)*4
        const r = Math.random()
        const z = r < 0.3 ? -2.0-Math.random()*0.5
                : r < 0.7 ? -1.0-Math.random()*1.0
                :             0.0-Math.random()*1.0
        pos[i*3]=x; pos[i*3+1]=y; pos[i*3+2]=z
        orig[i*3]=x; orig[i*3+1]=y; orig[i*3+2]=z
        bright[i] = 0.15 + Math.random()*0.35
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      g.setAttribute('aOrigin',  new THREE.BufferAttribute(orig, 3))
      g.setAttribute('aBright',  new THREE.BufferAttribute(bright, 1))
      return g
    })()

    const microUnis = { ...baseUniforms(), uFluidVel: { value: new THREE.Vector2(0,0) } }
    const microMat = new THREE.ShaderMaterial({
      vertexShader: microVert, fragmentShader: microFrag,
      uniforms: microUnis, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    scene.add(new THREE.Points(microGeo, microMat))

    /* ── MEDIUM clustered splats ─────────────────────── */
    const mediumGeo = buildClusteredGeometry(cntMedium, CLUSTERS)
    const mediumUnis = { ...baseUniforms(), uFluidVelMid: { value: new THREE.Vector2(0,0) } }
    const mediumMat = new THREE.ShaderMaterial({
      vertexShader: mediumVert, fragmentShader: mediumFrag,
      uniforms: mediumUnis, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    scene.add(new THREE.Points(mediumGeo, mediumMat))

    /* ── LARGE atmospheric splats ────────────────────── */
    const largeGeo = buildClusteredGeometry(cntLarge, CLUSTERS)
    const largeUnis = { ...baseUniforms(), uFluidVelSlow: { value: new THREE.Vector2(0,0) } }
    const largeMat = new THREE.ShaderMaterial({
      vertexShader: largeVert, fragmentShader: largeFrag,
      uniforms: largeUnis, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    scene.add(new THREE.Points(largeGeo, largeMat))

    /* ── Smoke layers ────────────────────────────────── */
    const smokeDefs = [
      { z: -3.2, scale: 8.0, layer: 0.0, opacity: 0.22 },
      { z: -2.0, scale: 6.2, layer: 0.5, opacity: 0.15 },
      { z: -0.8, scale: 4.5, layer: 1.0, opacity: 0.08 },
    ]
    const smokePlaneGeo = new THREE.PlaneGeometry(1,1)
    const smokeMats: THREE.ShaderMaterial[] = []
    const smokeFluidOff = new THREE.Vector2(0,0)

    for (const def of smokeDefs) {
      const sm = new THREE.ShaderMaterial({
        vertexShader: smokeVert, fragmentShader: smokeFrag,
        uniforms: {
          uSmokeColor: { value: new THREE.Vector3(...p0.lightColorA).multiplyScalar(0.5) },
          uOpacity:    { value: def.opacity },
          uTime:       { value: 0 },
          uLayer:      { value: def.layer },
          uFluidOff:   { value: smokeFluidOff },
        },
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
      const m = new THREE.Mesh(smokePlaneGeo, sm)
      m.position.z = def.z
      m.scale.setScalar(def.scale)
      scene.add(m)
      smokeMats.push(sm)
    }

    /* ── Light shafts ────────────────────────────────── */
    const shaftDefs = [
      { pos: [ 0.9, 0.3, -3.0] as [number,number,number], sx: 1.4, sy: 6.0, rz:  0.18, phase: 0.0 },
      { pos: [-0.7,-0.4, -2.4] as [number,number,number], sx: 1.1, sy: 5.0, rz: -0.25, phase: 1.6 },
    ]
    const shaftGeo = new THREE.PlaneGeometry(1,1)
    const shaftMats: THREE.ShaderMaterial[] = []
    for (const def of shaftDefs) {
      const sm = new THREE.ShaderMaterial({
        vertexShader: shaftVert, fragmentShader: shaftFrag,
        uniforms: {
          uColor:   { value: new THREE.Vector3(...p0.lightColorA) },
          uOpacity: { value: 0.055 },
          uTime:    { value: 0 },
          uPhase:   { value: def.phase },
        },
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
      const m = new THREE.Mesh(shaftGeo, sm)
      m.position.set(...def.pos)
      m.scale.set(def.sx, def.sy, 1)
      m.rotation.z = def.rz
      scene.add(m)
      shaftMats.push(sm)
    }

    /* ── State ───────────────────────────────────────── */
    let currentPreset = { ...PRESETS.hero }
    let targetPreset  = { ...PRESETS.hero }
    let lerpT = 1, time = 0, lastPreset = 'hero'

    const pointer   = new THREE.Vector2(0,0)
    const prevPtr   = new THREE.Vector2(0,0)
    const smoothPtr = new THREE.Vector2(0,0)

    // Three fluid layers with different inertia
    const fluidFast = new THREE.Vector2(0,0)   // micro
    const fluidMid  = new THREE.Vector2(0,0)   // medium
    const fluidSlow = new THREE.Vector2(0,0)   // large
    const fluidOff  = new THREE.Vector2(0,0)   // smoke offset

    /* ── Events ──────────────────────────────────────── */
    const onPointer = (e: PointerEvent) => {
      pointer.x =  (e.clientX/window.innerWidth)*2-1
      pointer.y = -((e.clientY/window.innerHeight)*2-1)
    }
    window.addEventListener('pointermove', onPointer, { passive: true })

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
      if (hit === 'whatA') {
        const el = document.querySelector('#what')
        if (el) {
          const r = el.getBoundingClientRect()
          const prog = Math.min(1, Math.max(0, -r.top)/(el.scrollHeight-window.innerHeight))
          hit = prog < 0.33 ? 'whatA' : prog < 0.66 ? 'whatB' : 'whatC'
        }
      }
      if (hit !== lastPreset) {
        targetPreset = { ...PRESETS[hit] ?? PRESETS.hero }
        lerpT = 0; lastPreset = hit
        if (bgEl) bgEl.style.background = SECTION_BG[hit] ?? SECTION_BG.hero
      }
    }
    window.addEventListener('scroll', detectSection, { passive: true })

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight)
      camera.aspect = window.innerWidth/window.innerHeight
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)
    if (bgEl) bgEl.style.background = SECTION_BG.hero

    /* ── RAF ─────────────────────────────────────────── */
    let rafId = 0, last = performance.now()

    const frame = () => {
      rafId = requestAnimationFrame(frame)
      const now = performance.now()
      const dt  = Math.min((now-last)/1000, 0.05)
      last = now; time += dt

      const rawVelX = pointer.x - prevPtr.x
      const rawVelY = pointer.y - prevPtr.y
      prevPtr.copy(pointer)

      smoothPtr.x += (pointer.x - smoothPtr.x) * 0.032
      smoothPtr.y += (pointer.y - smoothPtr.y) * 0.032

      /* Three fluid layers — different lerp-in and decay rates */
      // Fast (micro): lerp 0.045, decay 0.976
      fluidFast.x += (rawVelX - fluidFast.x) * 0.045
      fluidFast.y += (rawVelY - fluidFast.y) * 0.045
      fluidFast.multiplyScalar(0.976)

      // Mid (medium): lerp 0.026, decay 0.981
      fluidMid.x += (rawVelX - fluidMid.x) * 0.026
      fluidMid.y += (rawVelY - fluidMid.y) * 0.026
      fluidMid.multiplyScalar(0.981)

      // Slow (large + smoke): lerp 0.014, decay 0.987
      fluidSlow.x += (rawVelX - fluidSlow.x) * 0.014
      fluidSlow.y += (rawVelY - fluidSlow.y) * 0.014
      fluidSlow.multiplyScalar(0.987)

      // Integrate into smoke offset
      fluidOff.x += fluidSlow.x * 0.38
      fluidOff.y += fluidSlow.y * 0.38
      fluidOff.multiplyScalar(0.993)

      /* Preset lerp */
      lerpT = Math.min(1, lerpT + dt/1.4)
      const cur = lerpPreset(currentPreset, targetPreset, smoothstep(lerpT))
      if (lerpT >= 1) currentPreset = { ...targetPreset }

      /* Update all shader uniforms */
      const updateCommon = (u: Record<string, {value: unknown}>) => {
        u.uTime.value = time
        ;(u.uLightColorA.value as THREE.Vector3).set(...cur.lightColorA)
        ;(u.uLightColorB.value as THREE.Vector3).set(...cur.lightColorB)
        ;(u.uAmbient.value as THREE.Vector3).set(...cur.ambientColor)
        u.uPointerForce.value = cur.pointerForce
        u.uTurbulence.value   = cur.turbulence
        u.uIdleSpeed.value    = cur.idleSpeed
        ;(u.uFlowDir.value as THREE.Vector3).set(...cur.flowDir)
      }

      updateCommon(microUnis as Record<string, {value: unknown}>)
      ;(microUnis.uFluidVel.value as THREE.Vector2).copy(fluidFast)

      updateCommon(mediumUnis as Record<string, {value: unknown}>)
      ;(mediumUnis.uFluidVelMid.value as THREE.Vector2).copy(fluidMid)

      updateCommon(largeUnis as Record<string, {value: unknown}>)
      ;(largeUnis.uFluidVelSlow.value as THREE.Vector2).copy(fluidSlow)

      /* Smoke */
      const smokeCA = new THREE.Vector3(...cur.lightColorA).multiplyScalar(0.50)
      const smokeCB = new THREE.Vector3(...cur.lightColorB).multiplyScalar(0.32)
      smokeFluidOff.copy(fluidOff)
      for (let i = 0; i < smokeMats.length; i++) {
        smokeMats[i].uniforms.uTime.value = time
        smokeMats[i].uniforms.uSmokeColor.value.copy(i % 2 === 0 ? smokeCA : smokeCB)
      }

      /* Light shafts */
      for (const sm of shaftMats) {
        sm.uniforms.uTime.value = time
        const t2 = Math.sin(time*0.14)*0.5+0.5
        sm.uniforms.uColor.value.copy(
          new THREE.Vector3(...cur.lightColorA).lerp(new THREE.Vector3(...cur.lightColorB), t2)
        )
      }

      /* Camera drift — very subtle breathing */
      camera.position.x = Math.sin(time*0.06)*0.05 + smoothPtr.x*0.032
      camera.position.y = Math.cos(time*0.048)*0.04 + smoothPtr.y*0.025

      renderer.setRenderTarget(null)
      renderer.render(scene, camera)
    }
    rafId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('scroll', detectSection)
      window.removeEventListener('resize', onResize)
      microGeo.dispose(); microMat.dispose()
      mediumGeo.dispose(); mediumMat.dispose()
      largeGeo.dispose(); largeMat.dispose()
      smokePlaneGeo.dispose(); smokeMats.forEach(m=>m.dispose())
      shaftGeo.dispose(); shaftMats.forEach(m=>m.dispose())
      renderer.dispose()
    }
  }, [])

  return (
    <>
      <div
        ref={bgRef}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 0,
          pointerEvents: 'none',
          transition: 'background 2.5s cubic-bezier(0.4,0,0.2,1)',
          // Deep colored dark base — no pure black
          background: 'radial-gradient(ellipse 90% 75% at 68% 38%, #28172f 0%, #211326 30%, #17151f 62%, #090d18 100%)',
        }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none', zIndex: 1,
        }}
      />
      {/* Vignette: dark edges to focus center */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 2,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse 75% 70% at 50% 50%, transparent 45%, rgba(6,4,12,0.55) 100%)',
        }}
      />
    </>
  )
}

function smoothstep(t: number): number { return t*t*(3-2*t) }
