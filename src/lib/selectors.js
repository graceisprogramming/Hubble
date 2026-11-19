import { distanceKm } from './geo'
import { withinDistance } from './geo'
import { NIMMAN } from './config'
import { overlapDays } from './dates'

export function myLocation(state) {
  return state.useRealLocation && state.realLocation ? state.realLocation : NIMMAN
}

export function userOf(state, id) {
  if (id === 'me') return { id: 'me', name: state.me?.name || '我', photo: state.me?.photo, color: '#0e7c86' }
  if (typeof id === 'string' && id.startsWith('guide:')) {
    const g = state.guides.find((x) => x.id === id.slice(6))
    return { id, name: g?.name ?? '導遊', isGuide: true, color: '#b9822d' }
  }
  return state.users.find((u) => u.id === id) || { id, name: '已離開的使用者', color: '#9a9ea5' }
}

export const sharedInterests = (state, user) => (state.me?.interests ?? []).filter((i) => user.interests?.includes(i))
export const stayOverlap = (state, user) =>
  state.me?.stayStart ? overlapDays(state.me.stayStart, state.me.stayEnd, user.stayStart, user.stayEnd) : 0
export const distanceTo = (state, user) => (user.coords ? distanceKm(myLocation(state), user.coords) : null)

// 搖一搖可以抽到的人：沒封鎖、沒停權、還沒打過招呼或略過，而且符合距離篩選
export function candidatesFor(state) {
  return state.users.filter(
    (u) =>
      !state.blocked.includes(u.id) &&
      !state.suspended.includes(u.id) &&
      !state.greetings[u.id] &&
      withinDistance(distanceTo(state, u), state.distance),
  )
}

export const visibleConvs = (state) =>
  Object.values(state.convs)
    .filter((c) => {
      if (c.type === 'dm') return !state.blocked.includes(c.members.find((m) => m !== 'me'))
      return c.members.includes('me')
    })
    .sort((a, b) => b.lastTs - a.lastTs)

export const unreadTotal = (state) => visibleConvs(state).reduce((n, c) => n + (c.unread || 0), 0)
export const incomingList = (state) =>
  state.incoming.filter((id) => !state.blocked.includes(id) && !state.suspended.includes(id) && state.greetings[id] !== 'skipped')
