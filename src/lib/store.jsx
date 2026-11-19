import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { reduce } from './reducer'
import { buildInitialState, withMe } from './seed'
import { candidateGuides, makePlan, shuffle } from './guides'
import { STORAGE_KEY, STATE_VERSION } from './config'

const Ctx = createContext(null)

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    return s && s.version === STATE_VERSION ? s : null
  } catch {
    return null
  }
}

let counter = 0
const uid = () => `${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`

const REPLIES = [
  '嗨！很高興認識你 👋',
  '你在清邁會待多久呢？',
  '今天要不要一起去喝咖啡？',
  '這個週末我想去走走，你有興趣嗎？',
  '我知道尼曼區附近有一間不錯的咖啡廳，一起去？',
]
const JOIN_TEXTS = ['大家好！我也想參加～', '這個時間我可以，期待見面！']
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

export function makeActions(dispatch, getState) {
  const d = (type, payload = {}) => dispatch({ type, now: Date.now(), id: uid(), ...payload })
  return {
    login: (email) => d('LOGIN', { email }),
    saveProfile: (profile) => d('SAVE_PROFILE', { profile }),
    acceptSafety: () => d('ACCEPT_SAFETY'),
    logout: () => d('LOGOUT'),
    setSettings: (patch) => d('SETTINGS', { patch }),
    resetAll: () => dispatch({ type: 'RESET', state: buildInitialState(Date.now()) }),
    resetDemo: () => dispatch({ type: 'RESET', state: withMe(buildInitialState(Date.now()), getState().me) }),
    notify: (text, link) => d('NOTIFY', { text, link }),

    setDistance: (distance) => d('SET_FILTER', { distance }),
    setUseRealLocation: (value) => d('SET_REAL_PREF', { value }),
    setRealLocation: (location) => d('SET_REAL_LOC', { location }),

    greet: (userId) => d('GREET', { userId, backWillGreet: Math.random() < 0.75, backDelay: 3000 + Math.random() * 5000 }),
    skip: (userId) => d('SKIP', { userId }),
    block: (userId) => d('BLOCK', { userId }),
    report: (userId, reason, note) => d('REPORT', { userId, reason, note }),
    reportAction: (reportId, status) => d('REPORT_ACTION', { reportId, status }),

    send: (convId, text) => {
      const conv = getState().convs[convId]
      d('SEND', {
        convId, text,
        failed: typeof navigator !== 'undefined' && navigator.onLine === false,
        replyText: conv?.type === 'dm' ? pick(REPLIES) : null,
        replyDelay: 1500 + Math.random() * 2000,
      })
    },
    retrySend: (convId, msgId) => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return false
      d('RETRY_SEND', { convId, msgId })
      return true
    },
    readConv: (convId) => d('READ', { convId }),
    dismissSafety: (convId) => d('DISMISS_SAFETY', { convId }),

    createActivity: (form) => {
      const s = getState()
      const pool = shuffle(s.users.filter((u) => !s.blocked.includes(u.id) && !s.suspended.includes(u.id)))
      const joiners = pool.slice(0, 2).map((u, i) => ({ userId: u.id, delay: 6000 + i * 6000, text: JOIN_TEXTS[i % JOIN_TEXTS.length] }))
      const id = `a${uid()}`
      dispatch({ type: 'CREATE_ACTIVITY', now: Date.now(), id, form, joiners })
      return id
    },
    joinActivity: (activityId) => d('JOIN_ACTIVITY', { activityId }),
    leaveActivity: (activityId) => d('LEAVE_ACTIVITY', { activityId }),
    confirmFormed: (activityId) => d('CONFIRM_FORMED', { activityId }),
    reschedule: (activityId, startsAt) => d('RESCHEDULE', { activityId, startsAt }),

    chooseGuide: (activityId, choice) => d('GUIDE_CHOICE', { activityId, choice }),
    requestGuide: (activityId, form) => {
      const s = getState()
      const act = s.activities.find((a) => a.id === activityId)
      const order = shuffle(candidateGuides(s.guides, form.lang, act.startsAt)).map((g) => g.id)
      d('GUIDE_REQUEST', { activityId, form, order, plan: makePlan(order) })
    },
    cancelGuide: (activityId) => d('GUIDE_CANCEL', { activityId }),
    guideFormAgain: (activityId) => d('GUIDE_FORM_AGAIN', { activityId }),
    noGuide: (activityId) => d('GUIDE_NONE', { activityId }),
    respondGuide: (activityId, guideId, accept) => d('GUIDE_RESPOND', { activityId, guideId, accept }),

    addEvent: (event) => d('ADD_EVENT', { event }),
    deleteEvent: (eventId) => d('DELETE_EVENT', { eventId }),
    addGuide: (guide) => d('ADD_GUIDE', { guide }),
    toggleGuide: (guideId) => d('TOGGLE_GUIDE', { guideId }),
  }
}

export function StoreProvider({ children, initialState }) {
  const [state, dispatch] = useReducer(reduce, undefined, () => initialState ?? load() ?? buildInitialState(Date.now()))
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* 儲存空間不足或被停用時，仍可繼續使用 */
    }
  }, [state])

  useEffect(() => {
    const t = setInterval(() => dispatch({ type: 'TICK', now: Date.now() }), 1000)
    return () => clearInterval(t)
  }, [])

  const api = useMemo(() => makeActions(dispatch, () => stateRef.current), [])
  const value = useMemo(() => ({ state, api }), [state, api])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore 必須在 StoreProvider 內使用')
  return v
}
