import { GUIDE_BATCH, GUIDE_TIMEOUT_MS } from './config'

export const dmConvId = (userId) => `c-dm-${userId}`
export const activityConvId = (activityId) => `c-${activityId}`

const schedule = (s, e) => ({ ...s, scheduled: [...s.scheduled, e] })

function notice(s, text, link, now) {
  const n = { id: `n${s.nseq}`, text, link, ts: now }
  return { ...s, nseq: s.nseq + 1, notifications: [...s.notifications, n].slice(-40) }
}

function addMessage(s, convId, msg) {
  const conv = s.convs[convId]
  if (!conv) return s
  return { ...s, convs: { ...s.convs, [convId]: { ...conv, messages: [...conv.messages, msg], lastTs: msg.ts } } }
}

function bumpUnread(s, convId) {
  const conv = s.convs[convId]
  if (!conv) return s
  return { ...s, convs: { ...s.convs, [convId]: { ...conv, unread: (conv.unread || 0) + 1 } } }
}

function updateActivity(s, id, patch) {
  return { ...s, activities: s.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)) }
}

function makeMatch(s, userId, now) {
  const user = s.users.find((u) => u.id === userId)
  if (!user) return s
  const cid = dmConvId(userId)
  const convs = s.convs[cid]
    ? s.convs
    : {
        ...s.convs,
        [cid]: {
          id: cid, type: 'dm', title: user.name, members: ['me', userId],
          messages: [{ id: `${cid}-sys`, system: true, text: '你們已配對成功，可以開始聊天了。', ts: now }],
          unread: 0, lastTs: now, safetyDismissed: false,
        },
      }
  const next = {
    ...s,
    convs,
    matches: s.matches.includes(userId) ? s.matches : [...s.matches, userId],
    greetings: { ...s.greetings, [userId]: 'matched' },
    incoming: s.incoming.filter((i) => i !== userId),
  }
  return notice(next, `與 ${user.name} 配對成功！`, `/match/${userId}`, now)
}

// ---- 導遊配對 ----
function resolveInvite(req, guideId, accept) {
  if (req.status !== 'matching') return req
  const hit = req.invites.some((i) => i.guideId === guideId && i.status === 'inviting')
  if (!hit) return req
  const invites = req.invites.map((i) => (i.guideId === guideId && i.status === 'inviting' ? { ...i, status: accept ? 'accepted' : 'declined' } : i))
  if (accept) {
    return {
      ...req,
      status: 'success',
      accepted: guideId,
      invites: invites.map((i) => (i.status === 'inviting' ? { ...i, status: 'expired' } : i)),
    }
  }
  return { ...req, invites }
}

// 同時維持最多 GUIDE_BATCH 位導遊在邀請中；候選用完而且沒有人在邀請中，就是「無人可接」
function refill(req, now) {
  if (req.status !== 'matching') return req
  let invites = req.invites
  let inviting = invites.filter((i) => i.status === 'inviting').length
  while (inviting < GUIDE_BATCH && invites.length < req.order.length) {
    invites = [...invites, { guideId: req.order[invites.length], status: 'inviting', sentAt: now }]
    inviting += 1
  }
  if (inviting === 0) return { ...req, invites, status: 'none' }
  return invites === req.invites ? req : { ...req, invites }
}

function applyGuideResult(s, activityId, oldReq, newReq, now) {
  let next = { ...s, guideRequests: { ...s.guideRequests, [activityId]: newReq } }
  const activity = s.activities.find((a) => a.id === activityId)
  const link = `/activities/${activityId}/guide`
  if (newReq.status === 'success' && oldReq?.status !== 'success') {
    const guide = s.guides.find((g) => g.id === newReq.accepted)
    const cid = activityConvId(activityId)
    const conv = next.convs[cid]
    if (conv && guide) {
      const gid = `guide:${guide.id}`
      next = {
        ...next,
        convs: { ...next.convs, [cid]: { ...conv, members: conv.members.includes(gid) ? conv.members : [...conv.members, gid] } },
      }
      next = addMessage(next, cid, { id: `${cid}-g-sys-${now}`, system: true, text: `導遊 ${guide.name} 已加入群聊`, ts: now })
      next = addMessage(next, cid, { id: `${cid}-g-hi-${now}`, from: gid, text: `大家好，我是 ${guide.name}，這場由我為大家講解。`, ts: now + 1 })
      next = bumpUnread(next, cid)
    }
    next = notice(next, `導遊${guide ? ` ${guide.name}` : ''}已接受「${activity?.title ?? '活動'}」`, link, now)
  } else if (newReq.status === 'none' && oldReq?.status !== 'none') {
    next = notice(next, '目前沒有導遊能接這場，你可以改期或這次不安排導遊', link, now)
  }
  return next
}

function tickGuides(s, now) {
  let changed = false
  let next = s
  for (const [activityId, req] of Object.entries(s.guideRequests)) {
    if (req.status !== 'matching') continue
    let r = req
    for (const inv of req.invites.filter((i) => i.status === 'inviting')) {
      if (r.status !== 'matching') break
      const plan = r.plan?.[inv.guideId] ?? { decision: 'ignore', delayMs: 0 }
      const elapsed = now - inv.sentAt
      if (plan.decision !== 'ignore' && elapsed >= plan.delayMs) {
        r = resolveInvite(r, inv.guideId, plan.decision === 'accept')
      } else if (elapsed >= GUIDE_TIMEOUT_MS) {
        r = { ...r, invites: r.invites.map((i) => (i.guideId === inv.guideId && i.status === 'inviting' ? { ...i, status: 'timeout' } : i)) }
      }
    }
    r = refill(r, now)
    if (r !== req) {
      changed = true
      next = applyGuideResult(next, activityId, req, r, now)
    }
  }
  return changed ? next : s
}

function applyScheduled(s, e, now) {
  switch (e.type) {
    case 'GREET_BACK':
      if (s.greetings[e.userId] === 'sent' && !s.blocked.includes(e.userId)) return makeMatch(s, e.userId, now)
      return s
    case 'SIM_REPLY': {
      if (s.blocked.includes(e.from)) return s
      const withMsg = addMessage(s, e.convId, { id: e.id, from: e.from, text: e.text, ts: now })
      return bumpUnread(withMsg, e.convId)
    }
    case 'SIM_JOIN': {
      const act = s.activities.find((a) => a.id === e.activityId)
      if (!act || act.members.includes(e.userId) || act.members.length >= act.max || s.blocked.includes(e.userId)) return s
      return joinActivity(s, act, e.userId, now, e.text)
    }
    default:
      return s
  }
}

function joinActivity(s, act, userId, now, text) {
  const members = [...act.members, userId]
  const full = members.length >= act.max
  let next = updateActivity(s, act.id, { members, status: full && act.status === 'recruiting' ? 'formed' : act.status })
  const cid = activityConvId(act.id)
  const conv = next.convs[cid]
  if (conv) {
    next = { ...next, convs: { ...next.convs, [cid]: { ...conv, members: [...conv.members.filter((m) => m !== userId), userId] } } }
    const who = userId === 'me' ? '你' : next.users.find((u) => u.id === userId)?.name ?? '新成員'
    next = addMessage(next, cid, { id: `${cid}-j-${userId}-${now}`, system: true, text: `${who} 加入了活動`, ts: now })
    if (text && userId !== 'me') {
      next = addMessage(next, cid, { id: `${cid}-t-${userId}-${now}`, from: userId, text, ts: now + 1 })
      next = bumpUnread(next, cid)
    }
  }
  if (full && act.status === 'recruiting') {
    next = notice(next, `「${act.title}」人數已滿，已成團`, `/activities/${act.id}`, now)
  }
  return next
}

export function reduce(state, a) {
  switch (a.type) {
    case 'RESET':
      return a.state
    case 'LOGIN': {
      const me = { ...(state.me || {}), id: 'me', email: a.email }
      return { ...state, me, onboarded: !!(me.name && me.adult) }
    }
    case 'SAVE_PROFILE':
      return { ...state, me: { ...(state.me || { id: 'me' }), ...a.profile } }
    case 'ACCEPT_SAFETY':
      return { ...state, onboarded: true, me: { ...state.me, adult: true } }
    case 'LOGOUT':
      return { ...state, onboarded: false }
    case 'SETTINGS':
      return { ...state, settings: { ...state.settings, ...a.patch } }
    case 'SET_FILTER':
      return { ...state, distance: a.distance }
    case 'SET_REAL_PREF':
      return { ...state, useRealLocation: a.value, realLocation: a.value ? state.realLocation : null, distance: a.value ? state.distance : state.distance }
    case 'SET_REAL_LOC':
      return { ...state, realLocation: a.location }
    case 'NOTIFY':
      return notice(state, a.text, a.link, a.now)

    case 'GREET': {
      if (state.greetings[a.userId]) return state
      let s = { ...state, greetings: { ...state.greetings, [a.userId]: 'sent' } }
      if (s.incoming.includes(a.userId)) return makeMatch(s, a.userId, a.now)
      if (a.backWillGreet) s = schedule(s, { id: `${a.id}-b`, at: a.now + a.backDelay, type: 'GREET_BACK', userId: a.userId })
      return s
    }
    case 'SKIP':
      return { ...state, greetings: { ...state.greetings, [a.userId]: 'skipped' }, incoming: state.incoming.filter((i) => i !== a.userId) }

    case 'SEND': {
      const conv = state.convs[a.convId]
      if (!conv) return state
      let s = addMessage(state, a.convId, { id: a.id, from: 'me', text: a.text, ts: a.now, failed: !!a.failed })
      if (conv.type === 'dm' && a.replyText && !a.failed) {
        const other = conv.members.find((m) => m !== 'me')
        s = schedule(s, { id: `${a.id}-r`, at: a.now + a.replyDelay, type: 'SIM_REPLY', convId: a.convId, from: other, text: a.replyText })
      }
      return s
    }
    case 'RETRY_SEND': {
      const conv = state.convs[a.convId]
      if (!conv) return state
      return { ...state, convs: { ...state.convs, [a.convId]: { ...conv, messages: conv.messages.map((m) => (m.id === a.msgId ? { ...m, failed: false } : m)) } } }
    }
    case 'READ': {
      const conv = state.convs[a.convId]
      if (!conv || !conv.unread) return state
      return { ...state, convs: { ...state.convs, [a.convId]: { ...conv, unread: 0 } } }
    }
    case 'DISMISS_SAFETY': {
      const conv = state.convs[a.convId]
      if (!conv) return state
      return { ...state, convs: { ...state.convs, [a.convId]: { ...conv, safetyDismissed: true } } }
    }

    case 'BLOCK':
      return {
        ...state,
        blocked: state.blocked.includes(a.userId) ? state.blocked : [...state.blocked, a.userId],
        incoming: state.incoming.filter((i) => i !== a.userId),
      }
    case 'REPORT': {
      const report = { id: a.id, userId: a.userId, reason: a.reason, note: a.note, ts: a.now, status: 'open' }
      return notice({ ...state, reports: [...state.reports, report] }, '已收到你的檢舉，我們會盡快處理', null, a.now)
    }
    case 'REPORT_ACTION': {
      const reports = state.reports.map((r) => (r.id === a.reportId ? { ...r, status: a.status } : r))
      const target = state.reports.find((r) => r.id === a.reportId)
      const suspended = a.status === 'suspended' && target && !state.suspended.includes(target.userId) ? [...state.suspended, target.userId] : state.suspended
      return { ...state, reports, suspended }
    }

    case 'CREATE_ACTIVITY': {
      const act = {
        id: a.id, organizer: 'me', title: a.form.title, type: a.form.type, startsAt: a.form.startsAt,
        place: a.form.place, max: a.form.max, lang: a.form.lang, desc: a.form.desc,
        status: 'recruiting', members: ['me'], guideChoice: null, createdAt: a.now,
      }
      const cid = activityConvId(a.id)
      let s = {
        ...state,
        activities: [act, ...state.activities],
        convs: {
          ...state.convs,
          [cid]: {
            id: cid, type: 'activity', activityId: a.id, title: act.title, members: ['me'],
            messages: [{ id: `${cid}-sys`, system: true, text: '活動群聊已建立', ts: a.now }],
            unread: 0, lastTs: a.now,
          },
        },
      }
      for (const j of a.joiners || []) {
        s = schedule(s, { id: `${a.id}-j-${j.userId}`, at: a.now + j.delay, type: 'SIM_JOIN', activityId: a.id, userId: j.userId, text: j.text })
      }
      return s
    }
    case 'JOIN_ACTIVITY': {
      const act = state.activities.find((x) => x.id === a.activityId)
      if (!act || act.members.includes('me') || act.members.length >= act.max) return state
      return joinActivity(state, act, 'me', a.now)
    }
    case 'LEAVE_ACTIVITY': {
      const act = state.activities.find((x) => x.id === a.activityId)
      if (!act || !act.members.includes('me') || act.organizer === 'me') return state
      const cid = activityConvId(act.id)
      let s = updateActivity(state, act.id, { members: act.members.filter((m) => m !== 'me') })
      const conv = s.convs[cid]
      if (conv) s = { ...s, convs: { ...s.convs, [cid]: { ...conv, members: conv.members.filter((m) => m !== 'me') } } }
      return s
    }
    case 'CONFIRM_FORMED': {
      const act = state.activities.find((x) => x.id === a.activityId)
      if (!act || act.status !== 'recruiting') return state
      let s = updateActivity(state, act.id, { status: 'formed' })
      s = addMessage(s, activityConvId(act.id), { id: `${act.id}-formed-${a.now}`, system: true, text: '發起人已確認成團', ts: a.now })
      return notice(s, `「${act.title}」已成團`, `/activities/${act.id}`, a.now)
    }
    case 'RESCHEDULE': {
      const act = state.activities.find((x) => x.id === a.activityId)
      if (!act) return state
      let s = updateActivity(state, act.id, { startsAt: a.startsAt })
      const req = s.guideRequests[act.id]
      if (req) {
        const { [act.id]: _drop, ...rest } = s.guideRequests
        s = { ...s, guideRequests: rest }
        const cid = activityConvId(act.id)
        const conv = s.convs[cid]
        if (conv) s = { ...s, convs: { ...s.convs, [cid]: { ...conv, members: conv.members.filter((m) => !m.startsWith('guide:')) } } }
        s = addMessage(s, cid, { id: `${act.id}-resched-${a.now}`, system: true, text: '活動時間已更改，導遊配對失效，需要重新配對', ts: a.now })
        s = notice(s, '活動時間已更改，導遊配對失效，請重新配對', `/activities/${act.id}/guide`, a.now)
      }
      return s
    }

    case 'GUIDE_CHOICE':
      return updateActivity(state, a.activityId, { guideChoice: a.choice })
    case 'GUIDE_REQUEST': {
      const base = {
        status: 'matching', topic: a.form.topic, lang: a.form.lang, note: a.form.note,
        order: a.order, plan: a.plan, invites: [], accepted: null, startedAt: a.now,
      }
      const req = refill(base, a.now)
      let s = updateActivity(state, a.activityId, { guideChoice: 'yes' })
      return applyGuideResult(s, a.activityId, null, req, a.now)
    }
    case 'GUIDE_CANCEL': {
      const req = state.guideRequests[a.activityId]
      if (!req || req.status !== 'matching') return state
      const r = { ...req, status: 'cancelled', invites: req.invites.map((i) => (i.status === 'inviting' ? { ...i, status: 'expired' } : i)) }
      return { ...state, guideRequests: { ...state.guideRequests, [a.activityId]: r } }
    }
    case 'GUIDE_FORM_AGAIN': {
      const { [a.activityId]: _drop, ...rest } = state.guideRequests
      return { ...state, guideRequests: rest }
    }
    case 'GUIDE_NONE': {
      const { [a.activityId]: _drop, ...rest } = state.guideRequests
      return updateActivity({ ...state, guideRequests: rest }, a.activityId, { guideChoice: 'no' })
    }
    case 'GUIDE_RESPOND': {
      const req = state.guideRequests[a.activityId]
      if (!req) return state
      const r = refill(resolveInvite(req, a.guideId, a.accept), a.now)
      if (r === req) return state
      return applyGuideResult(state, a.activityId, req, r, a.now)
    }

    case 'ADD_EVENT':
      return { ...state, official: [...state.official, { id: a.id, taken: 0, ...a.event }].sort((x, y) => x.startsAt - y.startsAt) }
    case 'DELETE_EVENT':
      return { ...state, official: state.official.filter((e) => e.id !== a.eventId) }
    case 'ADD_GUIDE':
      return { ...state, guides: [...state.guides, { id: a.id, active: true, ...a.guide }] }
    case 'TOGGLE_GUIDE':
      return { ...state, guides: state.guides.map((g) => (g.id === a.guideId ? { ...g, active: !g.active } : g)) }

    case 'TICK': {
      let s = state
      const due = s.scheduled.filter((e) => e.at <= a.now).sort((x, y) => x.at - y.at)
      if (due.length) {
        s = { ...s, scheduled: s.scheduled.filter((e) => e.at > a.now) }
        for (const e of due) s = applyScheduled(s, e, a.now)
      }
      return tickGuides(s, a.now)
    }
    default:
      return state
  }
}
