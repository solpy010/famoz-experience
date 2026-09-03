export type AssetKind = 'video' | 'image' | 'image-sequence'
export type AssetStatus = 'needed' | 'existing' | 'optional'

export type ExperienceAssetSlot = {
  id: string
  chapter: string
  placement: string
  kind: AssetKind
  status: AssetStatus
  duration?: string
  desktop: string
  mobile: string
  format: string
  maxSize: string
  direction: string
  safeArea: string
  deliveryName: string
}

export type ExperienceChapter = {
  id: 'portal' | 'dorothy' | 'scaremuse' | 'roarlink' | 'tinai' | 'works' | 'contact'
  number: string
  character?: string
  role: string
  headline: string
  description: string
  accent: string
  assetSlots: string[]
}

/**
 * FAMOZ 세계관/홈페이지 자산의 단일 계약서.
 * 실제 파일이 도착하면 이 목록의 id를 유지한 채 src만 연결한다.
 */
export const EXPERIENCE_ASSETS: ExperienceAssetSlot[] = [
  {
    id: 'intro-scroll-film', chapter: 'INTRO', placement: '첫 진입 전체 화면', kind: 'video', status: 'needed',
    duration: '6–8초', desktop: '1920×1080 (16:9)', mobile: '1080×1440 (3:4) 별도 크롭',
    format: 'MP4(H.264) + WebM, 무음', maxSize: '데스크톱 8MB / 모바일 4MB',
    direction: '출발점에서 OZ 입구가 열리는 지점까지. 첫·마지막 프레임은 12프레임 이상 안정적으로 유지.',
    safeArea: '중앙 46%에는 로고와 진입 문구가 놓이므로 얼굴·핵심 오브젝트를 피함.',
    deliveryName: 'intro-scroll-desktop.mp4 / intro-scroll-mobile.mp4',
  },
  {
    id: 'oz-portal-poster', chapter: 'PORTAL', placement: '인트로 마지막 프레임·저사양 폴백', kind: 'image', status: 'needed',
    desktop: '2560×1440 (16:9)', mobile: '1080×1440 (3:4)', format: 'WebP 또는 PNG', maxSize: '각 1.2MB 이하',
    direction: '거대한 OZ 문과 네 공간의 입구가 읽히는 정지 장면. 게임 메뉴 UI나 글자는 이미지에 포함하지 않음.',
    safeArea: '좌측 36%는 헤드라인, 우측·중앙은 문과 깊이 표현.',
    deliveryName: 'oz-portal-desktop.webp / oz-portal-mobile.webp',
  },
  {
    id: 'dorothy-environment', chapter: 'DOROTHY', placement: '기획·디자인 장면 후경', kind: 'image', status: 'needed',
    desktop: '2400×1350', mobile: '1080×1440', format: 'WebP', maxSize: '1.5MB 이하',
    direction: '스케치·동선·구조가 실제 공간으로 확장되는 작업실과 공간 설계층. 이미지 안에 텍스트 금지.',
    safeArea: '좌측 40% 저정보량, 주요 구조는 중앙과 우측.', deliveryName: 'chapter-dorothy-bg.webp',
  },
  {
    id: 'dorothy-character', chapter: 'DOROTHY', placement: '우측 상반신 캐릭터', kind: 'image', status: 'needed',
    desktop: '최소 1600×2000, 투명 배경', mobile: '동일 원본 사용', format: '투명 PNG 또는 WebP', maxSize: '4MB 이하',
    direction: '태블릿·카메라를 든 현대적인 기획자. 현실적 비율, 시선은 좌측 공간을 향함.',
    safeArea: '머리 위 10%, 팔·도구 바깥 8% 투명 여백.', deliveryName: 'character-dorothy.webp',
  },
  {
    id: 'scaremuse-transition', chapter: 'SCAREMUSE', placement: '몰입형 미디어 챕터 진입', kind: 'video', status: 'needed',
    duration: '4–6초', desktop: '1920×1080', mobile: '1080×1440 별도 크롭', format: 'MP4 + WebM, 무음', maxSize: '6MB / 3MB',
    direction: '캐릭터가 문으로 이동하고 공간이 다면 미디어 장면으로 열림. 끝 프레임은 챕터 배경과 연결.',
    safeArea: '좌측 38%에는 챕터 제목이 늦게 등장.', deliveryName: 'transition-scaremuse-desktop.mp4',
  },
  {
    id: 'roarlink-transition', chapter: 'ROARLINK', placement: '인터랙티브 미디어 챕터 진입', kind: 'video', status: 'needed',
    duration: '4–6초', desktop: '1920×1080', mobile: '1080×1440 별도 크롭', format: 'MP4 + WebM, 무음', maxSize: '6MB / 3MB',
    direction: '사용자 움직임에 반응해 경로가 열리고 사자가 다음 공간으로 안내. 폭발·과도한 카메라 흔들림 금지.',
    safeArea: '좌측 38% 저정보량, 동작 중심은 우측 55%.', deliveryName: 'transition-roarlink-desktop.mp4',
  },
  {
    id: 'tinai-transition', chapter: 'TINAI', placement: 'AI 공간 솔루션 챕터 진입', kind: 'video', status: 'needed',
    duration: '4–6초', desktop: '1920×1080', mobile: '1080×1440 별도 크롭', format: 'MP4 + WebM, 무음', maxSize: '6MB / 3MB',
    direction: '시안 흐름이 행동을 감지하고 핵심 경로가 샴페인 골드로 정렬되는 공간 변화. 회로·뇌 아이콘 금지.',
    safeArea: '좌측 40% 타이포 안전영역, 활성 경로는 중앙→우측.', deliveryName: 'transition-tinai-desktop.mp4',
  },
  {
    id: 'character-group', chapter: 'PORTAL', placement: 'OZ 로비 캐릭터 선택', kind: 'image', status: 'needed',
    desktop: '각 캐릭터 최소 1400×1800', mobile: '동일 원본 사용', format: '캐릭터별 투명 WebP/PNG', maxSize: '각 3MB 이하',
    direction: 'ScareMuse·RoarLink·TinAI 개별 전신 또는 3/4신. 조명 방향과 눈높이를 통일.',
    safeArea: '외곽 8% 투명 여백, 캐릭터끼리 겹쳐도 얼굴과 도구가 가려지지 않음.',
    deliveryName: 'character-scaremuse.webp / character-roarlink.webp / character-tinai.webp',
  },
  {
    id: 'chapter-posters', chapter: 'CHAPTERS', placement: '영상 로딩·reduced-motion 폴백', kind: 'image', status: 'needed',
    desktop: '각 1920×1080', mobile: '각 1080×1440', format: 'WebP', maxSize: '각 900KB 이하',
    direction: '각 전환 영상의 마지막 프레임과 동일한 구도. 몰입형·인터랙티브·AI 장면 각 1세트.',
    safeArea: '각 장면 좌측 38–40% 저정보량.', deliveryName: 'poster-scaremuse / poster-roarlink / poster-tinai',
  },
  {
    id: 'behind-scenes-contact', chapter: 'CONTACT', placement: '마지막 현실 제작 현장 풀백', kind: 'video', status: 'needed',
    duration: '5–7초', desktop: '1920×1080', mobile: '1080×1440 별도 크롭', format: 'MP4 + WebM, 무음', maxSize: '7MB / 3.5MB',
    direction: '환상 공간에서 카메라가 빠져나오며 촬영 장비·문서·제작진이 있는 실제 현장이 드러남.',
    safeArea: '마지막 2초 좌측 48%는 연락처, 하단 18%는 회사 정보.', deliveryName: 'contact-pullback-desktop.mp4',
  },
  {
    id: 'showreel-bridge', chapter: 'WORKS', placement: '세계관에서 실적으로 연결되는 브리지', kind: 'video', status: 'optional',
    duration: '8–12초', desktop: '1920×1080', mobile: '1080×1350 또는 세로 편집본', format: 'MP4(H.264), 오디오 선택', maxSize: '12MB / 6MB',
    direction: '네 캐릭터의 움직임이 실제 프로젝트 장면으로 응집. 기존 Works 이미지는 유지하며 연결부만 담당.',
    safeArea: '텍스트는 영상에 굽지 않음. 시작·종료 1초는 안정 프레임.', deliveryName: 'showreel-bridge-desktop.mp4',
  },
]

export const EXPERIENCE_CHAPTERS: ExperienceChapter[] = [
  { id: 'portal', number: '00', role: 'FAMOZ WORLD', headline: '상상을 연결하고, 경험을 변화시킵니다.', description: 'OZ 문을 중심으로 네 역량을 선택하거나 일반 스크롤로 전체 여정을 이어갑니다.', accent: '#c898bd', assetSlots: ['intro-scroll-film', 'oz-portal-poster', 'character-group'] },
  { id: 'dorothy', number: '01', character: '도로시', role: 'PLANNING & DESIGN', headline: '아이디어가 공간을 설계합니다.', description: '방문자의 여정을 관찰하고 콘텐츠·동선·매체를 하나의 경험 구조로 설계합니다.', accent: '#ffb47f', assetSlots: ['dorothy-environment', 'dorothy-character'] },
  { id: 'scaremuse', number: '02', character: 'ScareMuse', role: 'IMMERSIVE MEDIA', headline: '이야기가 공간 전체로 펼쳐집니다.', description: '영상·빛·사운드가 관람 동선과 만나 하나의 몰입 장면을 만듭니다.', accent: '#91efc8', assetSlots: ['scaremuse-transition', 'chapter-posters'] },
  { id: 'roarlink', number: '03', character: 'RoarLink', role: 'INTERACTIVE MEDIA', headline: '공간의 주인공은 언제나 당신입니다.', description: '사용자의 움직임과 선택이 공간을 작동시키고 새로운 장면을 엽니다.', accent: '#ffad66', assetSlots: ['roarlink-transition', 'chapter-posters'] },
  { id: 'tinai', number: '04', character: 'TinAI', role: 'AI PRODUCTION & SOLUTION', headline: 'AI가 공간을 진화시킵니다.', description: '기술을 드러내기보다 행동을 감지하고 경험을 조직하는 보이지 않는 생명력으로 사용합니다.', accent: '#8fd8ff', assetSlots: ['tinai-transition', 'chapter-posters'] },
  { id: 'works', number: '05', role: 'SELECTED WORKS', headline: '체험의 순간이 기억이 됩니다.', description: '추상적인 세계관이 실제 프로젝트 결과로 응집되는 증명의 공간입니다.', accent: '#ffe086', assetSlots: ['showreel-bridge'] },
  { id: 'contact', number: '06', role: 'TRUST · TEAM · CONTACT', headline: '상상을 현실로 만드는 사람들과 연결됩니다.', description: '환상 공간에서 실제 제작 현장으로 물러나며 회사·팀·연락처를 보여줍니다.', accent: '#ffd0a0', assetSlots: ['behind-scenes-contact'] },
]

export const getExperienceAsset = (id: string) => EXPERIENCE_ASSETS.find((asset) => asset.id === id)
