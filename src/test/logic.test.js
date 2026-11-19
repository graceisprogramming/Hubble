import { describe, expect, it } from 'vitest'
import { reduce } from '../lib/reducer'
import { buildInitialState, demoMe, withMe } from '../lib/seed'
import { GUIDE_BATCH, GUIDE_TIMEOUT_MS } from '../lib/config'
import { candidatesFor } from '../lib/selectors'
import { formatDistance } from '../lib/geo'
import { nextWeekday } from '../lib/dates'

const NOW = new Date('2026-11-19T10:00:00').getTime()
const base = () => withMe(buildInitialState(NOW), demoMe(NOW))

function formedActivity(startsAt = nextWeekday(6, 9, NOW)) {
  let s = base()
  s = reduce(s, { type: 'CREATE_ACTIVITY', now: NOW, id: 'ax', form: { title: '測試活動', type: '其他', startsAt, place: '公園或廣場｜測試', max: 4, lang: 'zh', desc: '' }, joiners: [] })
  return reduce(s, { type: 'CONFIRM_FORMED', now: NOW, activityId: 'ax' })
}

describe('導遊配對', () => {
  it('一次邀請 3 位，最先接受的獲得這場，其餘邀請失效', () => {
    let s = formedActivity()
    const plan = {
      g1: { decision: 'decline', delayMs: 1000 },
      g2: { decision: 'accept', delayMs: 2000 },
      g3: { decision: 'ignore', delayMs: 0 },
      g4: { decision: 'accept', delayMs: 500 },
    }
    s = reduce(s, { type: 'GUIDE_REQUEST', now: NOW, activityId: 'ax', form: { topic: '古城', lang: 'zh', note: '' }, order: ['g1', 'g2', 'g3', 'g4'], plan })
    let req = s.guideRequests.ax
    expect(req.status).toBe('matching')
    expect(req.invites.filter((i) => i.status === 'inviting')).toHaveLength(GUIDE_BATCH)

    s = reduce(s, { type: 'TICK', now: NOW + 1500 }) // g1 婉拒，g4 遞補
    req = s.guideRequests.ax
    expect(req.invites.map((i) => [i.guideId, i.status])).toEqual([['g1', 'declined'], ['g2', 'inviting'], ['g3', 'inviting'], ['g4', 'inviting']])

    s = reduce(s, { type: 'TICK', now: NOW + 2500 }) // g2 接受
    req = s.guideRequests.ax
    expect(req.status).toBe('success')
    expect(req.accepted).toBe('g2')
    expect(req.invites.find((i) => i.guideId === 'g4').status).toBe('expired')
    expect(s.convs['c-ax'].members).toContain('guide:g2')
  })

  it('沒有候選時直接是「無人可接」', () => {
    let s = formedActivity()
    s = reduce(s, { type: 'GUIDE_REQUEST', now: NOW, activityId: 'ax', form: { topic: 'x', lang: 'th', note: '' }, order: [], plan: {} })
    expect(s.guideRequests.ax.status).toBe('none')
  })

  it('30 分鐘（示範加速後）沒回應就逾時，全部逾時就是無人可接', () => {
    let s = formedActivity()
    s = reduce(s, { type: 'GUIDE_REQUEST', now: NOW, activityId: 'ax', form: { topic: 'x', lang: 'zh', note: '' }, order: ['g1'], plan: { g1: { decision: 'ignore', delayMs: 0 } } })
    s = reduce(s, { type: 'TICK', now: NOW + GUIDE_TIMEOUT_MS - 1 })
    expect(s.guideRequests.ax.status).toBe('matching')
    s = reduce(s, { type: 'TICK', now: NOW + GUIDE_TIMEOUT_MS + 1 })
    expect(s.guideRequests.ax.invites[0].status).toBe('timeout')
    expect(s.guideRequests.ax.status).toBe('none')
  })

  it('導遊端手動接受後，其他邀請失效', () => {
    let s = formedActivity()
    s = reduce(s, { type: 'GUIDE_REQUEST', now: NOW, activityId: 'ax', form: { topic: 'x', lang: 'zh', note: '' }, order: ['g1', 'g2', 'g3'], plan: {} })
    s = reduce(s, { type: 'GUIDE_RESPOND', now: NOW + 10, activityId: 'ax', guideId: 'g3', accept: true })
    expect(s.guideRequests.ax.accepted).toBe('g3')
    expect(s.guideRequests.ax.invites.filter((i) => i.status === 'expired')).toHaveLength(2)
  })

  it('改期後導遊配對失效，導遊移出群聊', () => {
    let s = formedActivity()
    s = reduce(s, { type: 'GUIDE_REQUEST', now: NOW, activityId: 'ax', form: { topic: 'x', lang: 'zh', note: '' }, order: ['g1'], plan: { g1: { decision: 'accept', delayMs: 100 } } })
    s = reduce(s, { type: 'TICK', now: NOW + 200 })
    expect(s.guideRequests.ax.status).toBe('success')
    s = reduce(s, { type: 'RESCHEDULE', now: NOW + 300, activityId: 'ax', startsAt: NOW + 86400000 * 9 })
    expect(s.guideRequests.ax).toBeUndefined()
    expect(s.convs['c-ax'].members.some((m) => m.startsWith('guide:'))).toBe(false)
  })
})

describe('搖一搖與距離', () => {
  it('距離篩選只留下範圍內的人', () => {
    let s = base()
    const ids = () => candidatesFor(s).map((u) => u.id).sort()
    expect(ids()).toHaveLength(12)
    s = reduce(s, { type: 'SET_FILTER', distance: 'near1' })
    expect(ids()).toEqual(['u1', 'u2'])
    s = reduce(s, { type: 'SET_FILTER', distance: 'near2' })
    expect(ids()).toEqual(['u1', 'u2', 'u3', 'u4', 'u5', 'u7', 'u9'])
  })

  it('打過招呼、略過、封鎖的人不會再被搖到', () => {
    let s = base()
    s = reduce(s, { type: 'SKIP', userId: 'u1' })
    s = reduce(s, { type: 'GREET', now: NOW, id: 'x', userId: 'u3', backWillGreet: false, backDelay: 0 })
    s = reduce(s, { type: 'BLOCK', userId: 'u4' })
    const ids = candidatesFor(s).map((u) => u.id)
    expect(ids).not.toContain('u1')
    expect(ids).not.toContain('u3')
    expect(ids).not.toContain('u4')
  })

  it('雙方都打招呼才配對成功：先收到對方招呼時立刻成立', () => {
    let s = base()
    expect(s.incoming).toContain('u2')
    s = reduce(s, { type: 'GREET', now: NOW, id: 'x', userId: 'u2', backWillGreet: false, backDelay: 0 })
    expect(s.matches).toContain('u2')
    expect(s.convs['c-dm-u2']).toBeTruthy()
  })

  it('我先打招呼，對方稍後回應才成立', () => {
    let s = base()
    s = reduce(s, { type: 'GREET', now: NOW, id: 'x', userId: 'u5', backWillGreet: true, backDelay: 1000 })
    expect(s.matches).not.toContain('u5')
    s = reduce(s, { type: 'TICK', now: NOW + 1100 })
    expect(s.matches).toContain('u5')
  })

  it('距離只顯示約略值', () => {
    expect(formatDistance(0.2)).toBe('不到 0.5 公里')
    expect(formatDistance(1.1)).toBe('約 1.5 公里')
    expect(formatDistance(2)).toBe('約 2 公里')
  })
})

describe('揪團', () => {
  it('額滿自動成團，已額滿不能再加入', () => {
    let s = base()
    const a2 = s.activities.find((a) => a.id === 'a2') // 3/4
    expect(a2.status).toBe('recruiting')
    s = reduce(s, { type: 'JOIN_ACTIVITY', now: NOW, activityId: 'a2' })
    expect(s.activities.find((a) => a.id === 'a2').status).toBe('formed')
    const before = s
    expect(reduce(s, { type: 'JOIN_ACTIVITY', now: NOW, activityId: 'a2' })).toBe(before)
  })
})
