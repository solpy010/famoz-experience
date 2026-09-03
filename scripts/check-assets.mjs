// 자산 규격 검증. manifest에 경로가 등록된 파일만 검사한다.
// 규격을 벗어나도 실패시키지 않는다 — 경고만 내고 판단은 사람이 한다.
// 원본을 재인코딩하거나 덮어쓰지 않는다.
//
//   node scripts/check-assets.mjs
//
// Node가 .ts를 직접 읽으므로 manifest가 그대로 단일 소스다.

import { readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import sharp from 'sharp'
import { EXPERIENCE_ASSETS } from '../content/experienceManifest.ts'

const PUBLIC = join(import.meta.dirname, '..', 'public')
const MB = 1024 * 1024

let warnings = 0
const warn = (slot, field, message) => { warnings++; console.warn(`  ⚠ ${slot} · ${field}\n    ${message}`) }

/** '1920×1080 (16:9)' → [1920, 1080]. 없으면 null. */
const parseSize = (text = '') => {
  const m = text.match(/(\d{3,5})\s*[×x]\s*(\d{3,5})/)
  return m ? [Number(m[1]), Number(m[2])] : null
}

/** '데스크톱 8MB / 모바일 4MB' → [8, 4]. '각 1.2MB 이하' → [1.2, 1.2].
    ponytail: 자유서술 필드에서 숫자만 뽑는다. 형식이 바뀌면 여기만 고치면 된다. */
const parseLimits = (text = '') => {
  const all = [...text.matchAll(/([\d.]+)\s*(MB|KB)/gi)]
    .map(([, n, unit]) => Number(n) * (unit.toUpperCase() === 'KB' ? 1 / 1024 : 1))
  if (!all.length) return null
  return all.length === 1 ? [all[0], all[0]] : [all[0], all[all.length - 1]]
}

/** format 필드에서 허용 확장자를 뽑는다. */
const allowedExt = (format = '') => {
  const found = ['mp4', 'webm', 'webp', 'png', 'jpg', 'jpeg']
    .filter((e) => new RegExp(e === 'mp4' ? 'mp4|h\\.?264' : e, 'i').test(format))
  return found.length ? found : null
}

async function checkFile(slot, field, relPath, limitMB, expectSize) {
  const abs = join(PUBLIC, relPath.replace(/^\//, ''))
  let info
  try {
    info = await stat(abs)
  } catch {
    warn(slot.id, field, `파일이 없습니다: public${relPath}`)
    return
  }

  const ext = extname(abs).slice(1).toLowerCase()
  const allowed = allowedExt(slot.format)
  if (allowed && !allowed.includes(ext)) {
    warn(slot.id, field, `확장자 .${ext} — 요청 형식은 "${slot.format}"`)
  }

  const sizeMB = info.size / MB
  if (limitMB && sizeMB > limitMB) {
    warn(slot.id, field, `${sizeMB.toFixed(2)}MB — 상한 ${limitMB}MB를 ${(sizeMB - limitMB).toFixed(2)}MB 초과`)
  }

  // ponytail: 해상도는 이미지만 확인한다. 영상 치수는 컨테이너 파싱이 필요해
  // 이 스크립트 범위를 넘는다. 필요해지면 ffprobe를 붙일 것.
  if (['mp4', 'webm'].includes(ext)) {
    console.log(`    ${field}: ${sizeMB.toFixed(2)}MB (영상 해상도는 수동 확인)`)
    return
  }
  if (!expectSize) return
  try {
    const { width, height } = await sharp(await readFile(abs)).metadata()
    const [w, h] = expectSize
    if (width < w || height < h) {
      warn(slot.id, field, `${width}×${height} — 요청 최소 ${w}×${h}보다 작습니다`)
    } else {
      console.log(`    ${field}: ${width}×${height}, ${sizeMB.toFixed(2)}MB`)
    }
  } catch (err) {
    warn(slot.id, field, `이미지를 읽지 못했습니다: ${err.message}`)
  }
}

/* 자유서술 필드를 파싱하므로 최소 점검을 남긴다: node scripts/check-assets.mjs --selftest */
if (process.argv.includes('--selftest')) {
  const { deepStrictEqual: eq } = await import('node:assert/strict')
  eq(parseSize('1920×1080 (16:9)'), [1920, 1080])
  eq(parseSize('최소 1600x2000, 투명 배경'), [1600, 2000])
  eq(parseSize('투명 배경'), null)
  eq(parseLimits('데스크톱 8MB / 모바일 4MB'), [8, 4])
  eq(parseLimits('각 1.2MB 이하'), [1.2, 1.2])
  eq(parseLimits('각 900KB 이하').map((n) => +n.toFixed(4)), [0.8789, 0.8789])
  eq(parseLimits('없음'), null)
  eq(allowedExt('MP4(H.264) + WebM, 무음'), ['mp4', 'webm'])
  eq(allowedExt('투명 PNG 또는 WebP'), ['webp', 'png'])
  console.log('selftest ok')
  process.exit(0)
}

const withSrc = EXPERIENCE_ASSETS.filter((a) => a.desktopSrc || a.mobileSrc || a.posterSrc)

console.log(`자산 슬롯 ${EXPERIENCE_ASSETS.length}개 중 경로가 등록된 ${withSrc.length}개를 검사합니다.\n`)

for (const slot of withSrc) {
  console.log(`▸ ${slot.id} (${slot.chapter})`)
  const limits = parseLimits(slot.maxSize)
  if (slot.desktopSrc) await checkFile(slot, 'desktop', slot.desktopSrc, limits?.[0], parseSize(slot.desktop))
  if (slot.mobileSrc) await checkFile(slot, 'mobile', slot.mobileSrc, limits?.[1], parseSize(slot.mobile))
  if (slot.posterSrc) await checkFile(slot, 'poster', slot.posterSrc, limits?.[0], parseSize(slot.desktop))
}

const pending = EXPERIENCE_ASSETS.filter((a) => a.status === 'needed' && !a.desktopSrc && !a.mobileSrc && !a.posterSrc)
if (pending.length) {
  console.log(`\n아직 도착하지 않은 슬롯 ${pending.length}개: ${pending.map((a) => a.id).join(', ')}`)
}
console.log(warnings ? `\n경고 ${warnings}건. 규격을 확인하세요.` : '\n규격 문제 없음.')
