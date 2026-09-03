'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { getExperienceAsset } from '@/content/experienceManifest'

/**
 * 자산 슬롯. manifest에 파일 경로가 없으면 children(기존 이미지·CSS 공간)을
 * 그대로 쓴다. 그래서 자산이 도착하기 전에도 화면이 달라지지 않는다.
 *
 * 계약
 *  - 영상은 preload="none" muted playsInline. active일 때만 src를 붙이므로
 *    보이지 않는 장면의 영상은 내려받지 않는다.
 *  - reduced-motion이면 영상 대신 poster를 쓴다.
 *  - 로드에 실패하면 poster → children 순으로 물러난다.
 */
export default function ResourceSlot({
  id, active = false, className, children, ...rest
}: {
  id: string
  /** 현재 장면(또는 다음 장면)일 때만 true. 이때만 영상을 내려받는다. */
  active?: boolean
  className?: string
  children?: ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  const asset = getExperienceAsset(id)
  const [failed, setFailed] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    setMobile(matchMedia('(max-width: 767px)').matches)
    setReduced(matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  const src = (mobile && asset?.mobileSrc) || asset?.desktopSrc
  const poster = asset?.posterSrc

  const wrap = (inner: ReactNode) => (
    <div className={className} data-resource-slot={id} {...rest}>{inner}</div>
  )

  if (!asset || failed || (!src && !poster)) return wrap(children)

  // 영상이 있고 모션을 허용하면 영상. 그 외에는 poster 정지 화면.
  if (asset.kind === 'video' && src && !reduced) {
    return wrap(
      <video
        preload="none" muted playsInline autoPlay loop
        poster={poster}
        onError={() => setFailed(true)}
        {...(active ? { src } : {})}
      />,
    )
  }

  const still = asset.kind === 'video' ? poster : (src ?? poster)
  if (!still) return wrap(children)
  // eslint-disable-next-line @next/next/no-img-element
  return wrap(<img src={still} alt="" decoding="async" loading={active ? 'eager' : 'lazy'} onError={() => setFailed(true)} />)
}
