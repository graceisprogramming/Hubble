export const STORAGE_KEY = 'cm-shake-state-v1'
export const STATE_VERSION = 1

// 導遊邀請：30 分鐘逾時、一次邀請 3 位、先接先贏
export const GUIDE_TIMEOUT_MIN = 30
export const GUIDE_BATCH = 3
// 示範模式把時間加速，讓 30 分鐘的逾時在 30 秒內就能看到。設為 1 就是真實時間。
export const DEMO_SPEEDUP = Number(import.meta.env.VITE_DEMO_SPEEDUP ?? 60) || 1
export const GUIDE_TIMEOUT_MS = (GUIDE_TIMEOUT_MIN * 60 * 1000) / DEMO_SPEEDUP

// 示範位置：清邁尼曼區
export const NIMMAN = { lat: 18.7961, lng: 98.968 }

// 官方行程報名：MVP 導向雄獅既有的報名方式，請換成實際的報名連結
export const OFFICIAL_SIGNUP_URL = 'https://www.liontravel.com/'

export const SHAKE_THRESHOLD = 30
export const SHAKE_COOLDOWN_MS = 2000

export const INTENTS = [
  { id: 'cowork', label: '共工' },
  { id: 'meal', label: '吃飯' },
  { id: 'weekend', label: '週末出遊' },
  { id: 'language', label: '語言交換' },
  { id: 'career', label: '職涯交流' },
  { id: 'friends', label: '純交朋友' },
]
export const intentLabel = (id) => INTENTS.find((i) => i.id === id)?.label ?? id

export const INTERESTS = ['咖啡', '夜市', '登山', '瑜伽', '攝影', '寺廟', '美食', '騎車', '健身', '閱讀', '桌遊', '音樂']
export const WORK_STYLES = ['全職遠端', '自由工作者', '創業者', '學生或間隔年']
export const AREAS = ['尼曼區', '古城區', '河畔區', '其他區域']
export const PROFILE_LANGS = ['國語', 'English', 'ภาษาไทย', '日本語', '한국어', 'Français', 'Deutsch']

export const NATIONALITIES = [
  { name: '台灣', flag: '🇹🇼' },
  { name: '日本', flag: '🇯🇵' },
  { name: '韓國', flag: '🇰🇷' },
  { name: '美國', flag: '🇺🇸' },
  { name: '英國', flag: '🇬🇧' },
  { name: '德國', flag: '🇩🇪' },
  { name: '法國', flag: '🇫🇷' },
  { name: '澳洲', flag: '🇦🇺' },
  { name: '其他', flag: '🌏' },
]
export const flagOf = (name) => NATIONALITIES.find((n) => n.name === name)?.flag ?? '🌏'

// 導遊講解使用的語言
export const GUIDE_LANGS = [
  { id: 'zh', label: '繁體中文（國語）' },
  { id: 'en', label: 'English' },
  { id: 'th', label: 'ภาษาไทย' },
]
export const guideLangLabel = (id) => GUIDE_LANGS.find((l) => l.id === id)?.label ?? id

export const ACTIVITY_TYPES = ['咖啡廳共工', '夜市', '美食', '戶外運動', '語言交換', '其他']
export const PUBLIC_PLACE_TYPES = ['公共咖啡廳', '夜市（公共區域）', '公園或廣場', '寺廟（公開參拜區）', '商場或美食街', '公開市集']
export const REPORT_REASONS = ['騷擾或不當言行', '垃圾訊息或詐騙', '假冒身份', '不當照片或內容', '其他']
export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
export const DISTANCE_OPTIONS = [
  { id: 'all', label: '不限' },
  { id: 'near1', label: '1 公里內' },
  { id: 'near2', label: '2 公里內' },
]
