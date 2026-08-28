import * as THREE from 'three'

/**
 * 3단계 콘텐츠 마스크 (지시서 §1).
 *
 *   A. Core Occlusion    실루엣 내부 — 입자 alpha 95~100% 제거, additive 100% 제거
 *   B. Soft Safety Field 실루엣·타이포 주변 SDF 완충 영역 — 부드럽게 감쇠
 *   C. Ambient Field     완충 밖 — 정상 밀도와 포인터 상호작용
 *
 * rect 루프를 셰이더에서 도는 대신 화면 정렬 마스크 **텍스처 2장**을 만든다.
 *   coreTex.a  1 = 완전 차폐 (인물 alpha 실루엣, 불투명 사진 내부)
 *   softTex.a  1 = 완전 억제 → 페더 거리에 걸쳐 0으로
 *
 * 페더는 canvas 2D의 blur 필터로 만든다. 그래서 경계가 사각형으로 보이지 않고,
 * soft 텍스처의 기울기를 셰이더에서 그대로 흐름 편향(deflection)에 쓸 수 있다.
 *
 * DOM 계약:
 *   [data-occlude]        불투명 콘텐츠. img면 alpha를, 아니면 박스를 차폐로 그린다
 *   [data-safe="strong"]  제목 — 좁고 강한 완충
 *   [data-safe="soft"]    본문·CTA — 넓고 약한 완충
 */

/** 마스크 해상도 배율. 화면의 절반이면 충분하고 blur도 싸다. */
const SCALE = 0.5

/** 데스크톱 기준 완충 폭(px). 지시서 §1-B 24~80px */
const FEATHER = {
  strong: 30,   // 제목 — 글자 사이가 메워지도록 좁게, 대신 강하게
  soft:   64,   // 본문·CTA — 넓고 약하게
  char:   52,   // 인물 외곽 halo gap 32~64px
}
const WEIGHT = { strong: 1.0, soft: 0.62, char: 1.0 }

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = Math.max(2, Math.round(w))
  c.height = Math.max(2, Math.round(h))
  return c
}

export class MaskField {
  readonly coreTex: THREE.CanvasTexture
  readonly softTex: THREE.CanvasTexture
  private core: HTMLCanvasElement
  private soft: HTMLCanvasElement
  private w = 2
  private h = 2

  constructor() {
    this.core = makeCanvas(2, 2)
    this.soft = makeCanvas(2, 2)
    this.coreTex = new THREE.CanvasTexture(this.core)
    this.softTex = new THREE.CanvasTexture(this.soft)
    for (const t of [this.coreTex, this.softTex]) {
      t.minFilter = THREE.LinearFilter
      t.magFilter = THREE.LinearFilter
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
      /* 캔버스는 Y가 아래로 증가하고 화면 좌표도 그렇다. three의 기본
         flipY=true를 두면 마스크가 상하 반전되어 실루엣이 엉뚱한 곳에 걸린다. */
      t.flipY = false
    }
  }

  resize(W: number, H: number) {
    this.w = Math.round(W * SCALE)
    this.h = Math.round(H * SCALE)
    this.core = makeCanvas(this.w, this.h)
    this.soft = makeCanvas(this.w, this.h)
    this.coreTex.image = this.core
    this.softTex.image = this.soft
  }

  /** DOM을 읽어 두 마스크를 다시 그린다. 레이아웃이 바뀔 때만 호출한다. */
  update(W: number, H: number) {
    if (Math.round(W * SCALE) !== this.w || Math.round(H * SCALE) !== this.h) this.resize(W, H)
    const cc = this.core.getContext('2d')
    const sc = this.soft.getContext('2d')
    if (!cc || !sc) return

    cc.clearRect(0, 0, this.w, this.h)
    sc.clearRect(0, 0, this.w, this.h)

    const px = (v: number) => v * SCALE
    const blur = (ctx: CanvasRenderingContext2D, r: number) => {
      ctx.filter = r > 0 ? `blur(${(r * SCALE).toFixed(1)}px)` : 'none'
    }

    /* ── A. Core Occlusion ────────────────────────────── */
    const occluders = document.querySelectorAll<HTMLElement>('[data-occlude]')
    for (const el of occluders) {
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) continue
      const img = el as HTMLImageElement
      const isImg = el.tagName === 'IMG' && img.complete && img.naturalWidth > 0

      // 코어는 실루엣 그대로. 계단 제거용으로만 아주 약하게 흐린다.
      blur(cc, 1.5)
      if (isImg) cc.drawImage(img, px(r.left), px(r.top), px(r.width), px(r.height))
      else { cc.fillStyle = '#000'; cc.fillRect(px(r.left), px(r.top), px(r.width), px(r.height)) }

      // 같은 실루엣을 넓게 흐려 halo gap을 만든다. 발광 테두리가 아니라
      // opacity만 점진적으로 낮아지는 저밀도 영역이다.
      blur(sc, FEATHER.char)
      sc.globalAlpha = WEIGHT.char
      if (isImg) sc.drawImage(img, px(r.left), px(r.top), px(r.width), px(r.height))
      else { sc.fillStyle = '#000'; sc.fillRect(px(r.left), px(r.top), px(r.width), px(r.height)) }
      sc.globalAlpha = 1
    }

    /* ── B. Soft Safety Field ─────────────────────────── */
    const draw = (sel: string, feather: number, weight: number, pad: number) => {
      blur(sc, feather)
      sc.globalAlpha = weight
      sc.fillStyle = '#000'
      for (const el of document.querySelectorAll<HTMLElement>(sel)) {
        const r = el.getBoundingClientRect()
        if (r.width < 1 || r.height < 1) continue
        // 라인 단위 박스를 조금 부풀려 글자 사이가 메워지게 한다
        const x = px(r.left - pad), y = px(r.top - pad)
        const w = px(r.width + pad * 2), hh = px(r.height + pad * 2)
        const rad = Math.min(w, hh) * 0.32
        sc.beginPath()
        if (sc.roundRect) sc.roundRect(x, y, w, hh, rad)
        else sc.rect(x, y, w, hh)
        sc.fill()
      }
      sc.globalAlpha = 1
    }
    draw('[data-safe="strong"]', FEATHER.strong, WEIGHT.strong, 6)
    draw('[data-safe="soft"]',   FEATHER.soft,   WEIGHT.soft,   10)

    cc.filter = 'none'
    sc.filter = 'none'
    this.coreTex.needsUpdate = true
    this.softTex.needsUpdate = true
  }

  dispose() {
    this.coreTex.dispose()
    this.softTex.dispose()
  }
}
