/**
 * All GLSL shaders in one place.
 * Import only what you need — nothing here has side-effects.
 */

/* ── Shared noise library ──────────────────────────────────── */
export const NOISE_GLSL = /* glsl */`
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

/* ── Shared lighting helper ────────────────────────────────── */
const LIGHTING_GLSL = /* glsl */`
  vec3 computeLight(vec3 pos, float aBright,
                    vec3 lColorA, vec3 lColorB, vec3 ambient,
                    float uTime) {
    vec3 lA = vec3(sin(uTime*0.065)*2.8, cos(uTime*0.050)*2.0, -2.2);
    vec3 lB = vec3(cos(uTime*0.085)*2.2, sin(uTime*0.060)*1.6, -1.6);
    float atA = 1.0/(1.0+distance(pos,lA)*distance(pos,lA)*0.18);
    float atB = 1.0/(1.0+distance(pos,lB)*distance(pos,lB)*0.22);
    vec3 base   = ambient*0.30 + (lColorA+lColorB)*0.07*aBright;
    vec3 recv   = lColorA*atA*aBright*2.4 + lColorB*atB*aBright*1.8;
    return base + recv;
  }
  float lightProximity(vec3 pos, float uTime) {
    vec3 lA = vec3(sin(uTime*0.065)*2.8, cos(uTime*0.050)*2.0, -2.2);
    vec3 lB = vec3(cos(uTime*0.085)*2.2, sin(uTime*0.060)*1.6, -1.6);
    float atA = 1.0/(1.0+distance(pos,lA)*distance(pos,lA)*0.18);
    float atB = 1.0/(1.0+distance(pos,lB)*distance(pos,lB)*0.22);
    return max(atA, atB);
  }
`

/* ── Common uniforms block (all particle shaders share these) ─ */
const COMMON_UNIFORMS = /* glsl */`
  uniform float uTime, uSize, uDPR;
  uniform vec3  uLightColorA, uLightColorB, uAmbient;
  uniform float uPointerForce, uTurbulence, uIdleSpeed;
  uniform vec3  uFlowDir;
  uniform vec2  uSpan;          /* half-extent of the particle volume (x, y) */
  attribute vec3  aOrigin;
  attribute float aBright;

  /* Keep a particle inside the volume without collapsing it toward centre. */
  vec3 wrapSpan(vec3 p){
    vec2 full = uSpan * 2.0;
    p.xy = fract(p.xy/full + 0.5)*full - uSpan;
    return p;
  }
`

/* ── Position helper: fluid offset + curl + wrap ──────────── */
/* fluidScale: how strongly this layer responds to the pointer  */
const makePositionGLSL = (fluidUniform: string, fluidScale: number, noiseScale: number) => /* glsl */`
  vec3 posFromOrigin(vec3 origin, float depth) {
    vec3 pos = origin;
    /* fluid displacement using BOTH velocity and sustained offset */
    pos.xy += ${fluidUniform} * uPointerForce * (0.20 + depth*0.80) * ${fluidScale.toFixed(2)};
    /* autonomous curl motion */
    float t = uTime * uIdleSpeed;
    pos += curlNoise(pos*${noiseScale.toFixed(2)} + vec3(t*0.08,t*0.06,t*0.045)) * uTurbulence * 0.45;
    pos += uFlowDir * uTime * 0.003;
    /* wrap — apply AFTER displacement so offset is preserved within cycle */
    return wrapSpan(pos);
  }
`

/* ════════════════════════════════════════════════════════════
   MICRO particles — 1-2.5px, fast fluid response
════════════════════════════════════════════════════════════ */
export const microVert = /* glsl */`
  ${COMMON_UNIFORMS}
  uniform vec2 uFluidFast;
  varying vec3  vColor;
  varying float vAlpha;
  ${NOISE_GLSL}
  ${LIGHTING_GLSL}
  ${makePositionGLSL('uFluidFast', 1.8, 0.35)}
  void main(){
    float depth = clamp((aOrigin.z+2.5)/5.0, 0.0, 1.0);
    vec3 pos = posFromOrigin(aOrigin, depth);
    float fog = clamp((1.0-depth)*0.38 + (1.0-aBright)*0.08, 0.0, 1.0);
    vColor = mix(computeLight(pos, aBright, uLightColorA, uLightColorB, uAmbient, uTime),
                 uAmbient*0.25, fog*0.45);
    vAlpha = aBright * (0.30+depth*0.50) * (1.0-fog*0.30);
    vec4 mv = modelViewMatrix*vec4(pos,1.0);
    gl_PointSize = clamp(uSize*uDPR*(1.2/max(-mv.z,0.5))*(0.5+depth*0.5), 0.5, 2.5);
    gl_Position  = projectionMatrix*mv;
  }
`

export const microFrag = /* glsl */`
  varying vec3 vColor; varying float vAlpha;
  void main(){
    vec2 uv=gl_PointCoord-0.5;
    float g=exp(-dot(uv,uv)*4.0*4.5);
    float a=g*vAlpha;
    if(a<0.004) discard;
    gl_FragColor=vec4(vColor,a);
  }
`

/* ════════════════════════════════════════════════════════════
   MEDIUM splats — 3-8px, clustered, moderate response
════════════════════════════════════════════════════════════ */
export const mediumVert = /* glsl */`
  ${COMMON_UNIFORMS}
  uniform vec2  uFluidMid;
  uniform vec2  uFluidOffset;   /* sustained position offset */
  attribute float aCluster;
  varying vec3  vColor;
  varying float vAlpha;
  ${NOISE_GLSL}
  ${LIGHTING_GLSL}
  void main(){
    float depth = clamp((aOrigin.z+2.5)/5.0, 0.0, 1.0);
    vec3 pos = aOrigin;
    /* velocity layer */
    pos.xy += uFluidMid * uPointerForce * (0.15+depth*0.65) * 1.4;
    /* sustained offset — this is what gives persistent displacement */
    pos.xy += uFluidOffset * (0.6+depth*0.4) * 1.8;
    float t = uTime * uIdleSpeed * 0.85;
    pos += curlNoise(pos*0.28+vec3(t*0.07,t*0.05,t*0.04)) * uTurbulence * 0.45;
    pos += uFlowDir * uTime * 0.003;
    /* density field: discard sparse areas */
    float dn = snoise(aOrigin*0.55+vec3(uTime*0.008,0.,0.))*0.5+0.5;
    float density = aCluster*0.65 + dn*0.35;
    if(density < 0.30){ gl_Position=vec4(9999.); gl_PointSize=0.; return; }
    pos = wrapSpan(pos);
    float fog = clamp((1.0-depth)*0.35+(1.0-aBright)*0.10, 0.0, 1.0);
    float lp  = lightProximity(pos, uTime);
    vColor = mix(computeLight(pos, aBright, uLightColorA, uLightColorB, uAmbient, uTime),
                 uAmbient*0.30, fog*0.50);
    vAlpha = aBright * (0.32+depth*0.52+aCluster*0.35) * (1.0-fog*0.35);
    vec4 mv = modelViewMatrix*vec4(pos,1.0);
    float sz = uSize*2.4*uDPR*(1.4/max(-mv.z,0.4))*(0.5+depth*0.6)*(0.8+lp*0.5);
    gl_PointSize = clamp(sz, 2.5, 9.0);
    gl_Position  = projectionMatrix*mv;
  }
`

export const mediumFrag = /* glsl */`
  varying vec3 vColor; varying float vAlpha;
  void main(){
    vec2 uv=gl_PointCoord-0.5;
    float g=exp(-dot(uv,uv)*4.0*2.8);
    float a=g*vAlpha;
    if(a<0.003) discard;
    gl_FragColor=vec4(vColor,a);
  }
`

/* ════════════════════════════════════════════════════════════
   LARGE splats — 8-30px, atmospheric, slowest response
════════════════════════════════════════════════════════════ */
export const largeVert = /* glsl */`
  ${COMMON_UNIFORMS}
  uniform vec2  uFluidSlow;
  uniform vec2  uFluidOffset;   /* sustained position offset */
  attribute float aCluster;
  varying vec3  vColor;
  varying float vAlpha;
  ${NOISE_GLSL}
  ${LIGHTING_GLSL}
  void main(){
    float depth = clamp((aOrigin.z+2.5)/5.0, 0.0, 1.0);
    vec3 pos = aOrigin;
    pos.xy += uFluidSlow * uPointerForce * (0.10+depth*0.50) * 1.0;
    /* sustained offset at 0.4× for large splats */
    pos.xy += uFluidOffset * (0.4+depth*0.3) * 1.0;
    float t = uTime * uIdleSpeed * 0.6;
    pos += curlNoise(pos*0.22+vec3(t*0.05,t*0.04,t*0.03)) * uTurbulence * 0.35;
    pos += uFlowDir * uTime * 0.002;
    pos = wrapSpan(pos);
    float lp  = lightProximity(pos, uTime);
    float fog = clamp((1.0-depth)*0.45, 0.0, 1.0);
    vec3 base = uAmbient*0.22;
    vec3 recv = (uLightColorA+uLightColorB)*0.5*aBright*lp*1.6;
    vColor = mix(base+recv, uAmbient*0.40, fog*0.55);
    /* large splats: visible even at low light, key is large size */
    vAlpha = aBright * (0.18 + lp*0.38 + depth*0.14) * (1.0-fog*0.38);
    vec4 mv = modelViewMatrix*vec4(pos,1.0);
    float sz = uSize*6.0*uDPR*(1.6/max(-mv.z,0.3))*(0.4+depth*0.7)*(0.5+lp*1.2);
    gl_PointSize = clamp(sz, 8.0, 32.0);
    gl_Position  = projectionMatrix*mv;
  }
`

export const largeFrag = /* glsl */`
  varying vec3 vColor; varying float vAlpha;
  void main(){
    vec2 uv=gl_PointCoord-0.5;
    float g=exp(-dot(uv,uv)*4.0*1.4);
    float a=g*vAlpha;
    if(a<0.002) discard;
    gl_FragColor=vec4(vColor,a);
  }
`

/* ════════════════════════════════════════════════════════════
   SMOKE planes
════════════════════════════════════════════════════════════ */
export const smokeVert = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`
export const smokeFrag = /* glsl */`
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

/* ════════════════════════════════════════════════════════════
   LIGHT shafts
════════════════════════════════════════════════════════════ */
export const shaftVert = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`
export const shaftFrag = /* glsl */`
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
