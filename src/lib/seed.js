import { NIMMAN } from './config'
import { offsetFrom } from './geo'
import { DAY, nextWeekday, startOfDay } from './dates'

// 以下皆為虛構的示範資料
const USER_ROWS = [
  ['u1', 'Mika', '日本', '🇯🇵', 'UI 設計師', ['咖啡', '攝影', '寺廟'], ['cowork', 'meal'], '尼曼區', 0.3, 0.2, -2, ['日本語', 'English'], '想找人一起在咖啡廳工作。'],
  ['u2', 'Daniel', '美國', '🇺🇸', '後端工程師', ['登山', '咖啡', '桌遊'], ['cowork', 'weekend'], '尼曼區', 0.8, -0.4, 1, ['English'], '週末想去山上走走。'],
  ['u3', '小安', '台灣', '🇹🇼', '行銷顧問', ['夜市', '美食', '瑜伽'], ['meal', 'friends'], '古城區', 1.2, 0.6, -5, ['國語', 'English'], '夜市小吃都想吃一輪。'],
  ['u4', 'Sofia', '德國', '🇩🇪', '產品經理', ['騎車', '攝影', '音樂'], ['weekend', 'career'], '尼曼區', 1.6, -1.0, 3, ['Deutsch', 'English'], '喜歡騎車探索小路。'],
  ['u5', 'Jin', '韓國', '🇰🇷', '遊戲開發者', ['桌遊', '咖啡', '健身'], ['cowork', 'language'], '古城區', 1.9, 0.5, -1, ['한국어', 'English'], '想練習中文，也可以教韓文。'],
  ['u6', 'Chloe', '英國', '🇬🇧', '文案寫手', ['閱讀', '寺廟', '瑜伽'], ['language', 'friends'], '河畔區', 2.4, 1.2, 2, ['English'], '早上喜歡去寺廟散步。'],
  ['u7', '阿哲', '台灣', '🇹🇼', '前端工程師', ['咖啡', '登山', '夜市'], ['cowork', 'weekend', 'meal'], '尼曼區', 0.5, -0.9, -3, ['國語', 'English'], '平日共工、週末爬山。'],
  ['u8', 'Lucas', '法國', '🇫🇷', '攝影師', ['攝影', '美食', '騎車'], ['weekend', 'friends'], '河畔區', 3.0, -1.5, 0, ['Français', 'English'], '想拍清邁的日出。'],
  ['u9', 'Hana', '日本', '🇯🇵', '行銷經理', ['瑜伽', '美食', '音樂'], ['meal', 'career'], '古城區', 1.0, 1.0, 4, ['日本語', 'English'], '想認識其他產業的朋友。'],
  ['u10', 'Oliver', '澳洲', '🇦🇺', '創業者', ['登山', '健身', '咖啡'], ['career', 'weekend'], '尼曼區', 3.8, 0.8, -4, ['English'], '正在做第二個產品。'],
  ['u11', '小薇', '台灣', '🇹🇼', '自由譯者', ['閱讀', '咖啡', '寺廟'], ['language', 'cowork'], '古城區', 4.5, -2.0, 1, ['國語', 'English'], '想找人互相練習口說。'],
  ['u12', 'Emma', '美國', '🇺🇸', '資料分析師', ['音樂', '夜市', '桌遊'], ['meal', 'friends'], '河畔區', 2.8, 2.0, 5, ['English'], '想找人一起逛夜市。'],
]

const COLORS = ['#0e7c86', '#3e8e5a', '#d9654a', '#5a7d9a', '#8a6fb0', '#b9822d']

const GUIDE_ROWS = [
  // id, 名稱, 組別, 語言, 可接單的星期（0 = 週日）, 擅長主題
  ['g1', '阿凱', 'tw', ['zh'], [0, 6], ['古城歷史', '寺廟文化']],
  ['g2', '美玲', 'tw', ['zh', 'en'], [6], ['夜市美食']],
  ['g3', '子豪', 'tw', ['zh', 'th'], [0, 3, 6], ['山林健行']],
  ['g4', '小林', 'tw', ['zh'], [0, 5, 6], ['手作工藝']],
  ['g5', '佩珊', 'tw', ['zh', 'en'], [0, 3, 6], ['古城歷史', '咖啡文化']],
  ['g6', '志明', 'tw', ['zh'], [6], ['寺廟文化']],
  ['g7', '雅婷', 'tw', ['zh'], [0, 6], ['夜市美食', '手作工藝']],
  ['g8', '俊傑', 'tw', ['zh', 'en'], [0, 3, 6], ['山林健行']],
  ['g9', '怡君', 'tw', ['zh', 'th'], [0, 6], ['古城歷史']],
  ['g10', '宗翰', 'tw', ['zh'], [0, 4, 6], ['咖啡文化']],
  ['g11', '郁文', 'tw', ['zh'], [0, 5, 6], ['夜市美食']],
  ['g12', 'Vivian', 'intl', ['en', 'zh'], [0, 3, 6], ['古城歷史', '寺廟文化']],
  ['g13', 'Kevin', 'intl', ['en', 'th'], [0, 6], ['山林健行']],
  ['g14', 'Amy', 'intl', ['en', 'zh'], [0, 3, 5, 6], ['夜市美食', '手作工藝']],
]
export const TEAM_LABEL = { tw: '泰國產品部台灣組', intl: '大陸暨國際發展組' }

export function buildInitialState(now = Date.now()) {
  const today = startOfDay(now)
  const users = USER_ROWS.map(([id, name, nationality, flag, job, interests, intents, area, dx, dy, off, langs, bio], i) => ({
    id, name, nationality, flag, job, interests, intents, area, langs, bio,
    coords: offsetFrom(NIMMAN, dx, dy),
    stayStart: today + off * DAY,
    stayEnd: today + off * DAY + 27 * DAY,
    color: COLORS[i % COLORS.length],
  }))

  const guides = GUIDE_ROWS.map(([id, name, team, langs, days, topics]) => ({
    id, name, team, langs, days, topics, fee: '範例：THB 1,500 / 場', active: true,
  }))

  const official = [
    { id: 'o1', title: '古城寺廟半日導覽', startsAt: nextWeekday(6, 9, now), meet: '尼曼區集合點（範例）', price: '範例：NT$ 800', includes: '交通、導覽、礦泉水', capacity: 20, taken: 12 },
    { id: 'o2', title: '近郊山林健行一日遊', startsAt: nextWeekday(0, 8, now), meet: '古城東門集合點（範例）', price: '範例：NT$ 1,500', includes: '交通、午餐、嚮導', capacity: 16, taken: 16 },
    { id: 'o3', title: '夜市美食之夜', startsAt: nextWeekday(3, 18, now), meet: '夜市入口（範例）', price: '範例：NT$ 300', includes: '導覽、三種小吃試吃', capacity: 24, taken: 9 },
    { id: 'o4', title: '手作工藝體驗', startsAt: nextWeekday(6, 10, now) + 7 * DAY, meet: '河畔區工作坊（範例）', price: '範例：NT$ 900', includes: '材料、教學', capacity: 12, taken: 4 },
  ]

  const activities = [
    { id: 'a1', organizer: 'u7', title: '週三咖啡廳共工', type: '咖啡廳共工', startsAt: nextWeekday(3, 10, now), place: '公共咖啡廳｜尼曼區（範例）', max: 6, lang: 'zh', desc: '帶筆電一起工作，中午一起吃飯。', status: 'recruiting', members: ['u7', 'u2', 'u5'], guideChoice: null, createdAt: now },
    { id: 'a2', organizer: 'u3', title: '夜市小吃探險', type: '夜市', startsAt: nextWeekday(5, 18, now), place: '夜市（公共區域）｜古城區（範例）', max: 4, lang: 'zh', desc: '每人挑一樣想吃的，大家分著吃。', status: 'recruiting', members: ['u3', 'u9', 'u12'], guideChoice: null, createdAt: now },
  ]

  const convs = {}
  for (const a of activities) {
    convs[`c-${a.id}`] = {
      id: `c-${a.id}`, type: 'activity', activityId: a.id, title: a.title, members: a.members,
      messages: [
        { id: `${a.id}-m1`, system: true, text: '活動群聊已建立', ts: now - 3600000 },
        { id: `${a.id}-m2`, from: a.members[0], text: '歡迎大家加入！', ts: now - 3500000 },
      ],
      unread: 0, lastTs: now - 3500000,
    }
  }

  return {
    version: 1, me: null, onboarded: false,
    users, guides, official, activities, convs,
    greetings: {}, incoming: ['u2', 'u9'], matches: [], blocked: [], suspended: [], reports: [],
    guideRequests: {}, scheduled: [], notifications: [], nseq: 0,
    distance: 'all', useRealLocation: false, realLocation: null,
    settings: { notify: true },
  }
}

export function demoMe(now = Date.now()) {
  const today = startOfDay(now)
  return {
    id: 'me', email: 'demo@example.com', name: '小旅人', nationality: '台灣', native: '國語',
    languages: ['國語', 'English'], job: '前端工程師', workStyle: '全職遠端',
    interests: ['咖啡', '夜市', '登山'], area: '尼曼區',
    stayStart: today, stayEnd: today + 27 * DAY, bio: '', intents: ['cowork', 'meal', 'weekend'],
    adult: true, photo: null,
  }
}

export function withMe(state, me) {
  return { ...state, me, onboarded: !!me?.name }
}
