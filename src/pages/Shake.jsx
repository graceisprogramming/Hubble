import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { useShake } from '../lib/shake'
import { DISTANCE_OPTIONS, flagOf, intentLabel } from '../lib/config'
import { formatDistance } from '../lib/geo'
import { candidatesFor, distanceTo, sharedInterests, stayOverlap, userOf } from '../lib/selectors'
import { Avatar, Empty, Icon, Ripples, Tag } from '../components/ui'
import { dmConvId } from '../lib/reducer'

export function MatchCard({ user, onGreet, onSkip, status }) {
  const { state } = useStore()
  const shared = sharedInterests(state, user)
  const overlap = stayOverlap(state, user)
  const dist = distanceTo(state, user)
  return (
    <article className="match-card" aria-label={`${user.name} 的配對卡`}>
      <div className="match-card-head">
        <Avatar user={user} size={72} />
        <div>
          <h2>{user.name} <span aria-hidden="true">{user.flag}</span></h2>
          <p className="muted">{user.nationality}・{user.job}・{user.area}</p>
        </div>
        <Link to={`/report/${user.id}`} className="icon-btn" aria-label={`檢舉或封鎖 ${user.name}`}>
          <Icon name="more" />
        </Link>
      </div>
      {user.bio && <p className="bio">{user.bio}</p>}
      <div className="facts">
        <div><strong>{formatDistance(dist)}</strong><span>距離</span></div>
        <div><strong>{overlap} 天</strong><span>停留重疊</span></div>
        <div><strong>{shared.length}</strong><span>共同興趣</span></div>
      </div>
      {shared.length > 0 && (
        <p className="tags">{shared.map((i) => <Tag key={i} tone="teal">{i}</Tag>)}</p>
      )}
      <p className="tags">{user.intents.map((i) => <Tag key={i} tone="sand">{intentLabel(i)}</Tag>)}</p>
      {status === 'sent' ? (
        <p className="waiting" role="status">已打招呼，等對方回應</p>
      ) : (
        <div className="actions">
          <button type="button" className="btn btn-secondary" onClick={onSkip}>略過</button>
          <button type="button" className="btn btn-primary" onClick={onGreet}>打招呼</button>
        </div>
      )}
    </article>
  )
}

export default function Shake() {
  const { state, api } = useStore()
  const nav = useNavigate()
  const [phase, setPhase] = useState('idle')
  const [candId, setCandId] = useState(null)
  const timer = useRef(null)
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => () => clearTimeout(timer.current), [])

  const doShake = () => {
    if (phaseRef.current === 'loading') return
    setPhase('loading')
    if (typeof navigator !== 'undefined') navigator.vibrate?.(60)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const pool = candidatesFor(stateRef.current)
      if (!pool.length) {
        setCandId(null)
        setPhase('empty')
        return
      }
      setCandId(pool[Math.floor(Math.random() * pool.length)].id)
      setPhase('card')
    }, 700)
  }
  const motion = useShake(doShake)

  const changeDistance = (v) => {
    if (v !== 'all' && state.useRealLocation && !state.realLocation) {
      if (!navigator.geolocation) {
        api.notify('這個瀏覽器不支援定位，距離篩選維持「不限」')
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          api.setRealLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          api.setDistance(v)
        },
        () => {
          api.setDistance('all')
          api.notify('沒有取得定位授權，距離篩選維持「不限」。可以到瀏覽器設定開啟定位後再試。')
        },
        { timeout: 8000 },
      )
      return
    }
    api.setDistance(v)
  }

  const cand = candId ? state.users.find((u) => u.id === candId) : null
  const status = cand ? state.greetings[cand.id] : null
  const greet = () => {
    const wasIncoming = state.incoming.includes(cand.id)
    api.greet(cand.id)
    if (wasIncoming) nav(`/match/${cand.id}`)
  }
  const skip = () => {
    api.skip(cand.id)
    setCandId(null)
    setPhase('idle')
  }

  return (
    <div className="page shake-page">
      <header className="shake-head">
        <h1 className="page-title">搖一搖</h1>
        <div className="segmented" role="radiogroup" aria-label="距離篩選">
          {DISTANCE_OPTIONS.map((o) => (
            <button key={o.id} type="button" role="radio" aria-checked={state.distance === o.id} className={state.distance === o.id ? 'on' : ''} onClick={() => changeDistance(o.id)}>
              {o.label}
            </button>
          ))}
        </div>
        <p className="muted small">
          {state.useRealLocation && state.realLocation ? '用你目前的位置計算距離' : '示範位置：清邁尼曼區（可在「我的」改用真實定位）'}
        </p>
      </header>

      {phase !== 'card' && (
        <div className="shake-stage">
          <button type="button" className={`shake-btn${phase === 'loading' ? ' shaking' : ''}`} onClick={doShake} disabled={phase === 'loading'} aria-label="搖一搖">
            <Ripples size={220} animate={phase === 'loading'} />
            <span className="shake-icon"><Icon name="shake" size={44} /></span>
          </button>
          <p className="shake-hint" aria-live="polite">
            {phase === 'loading' ? '正在找人…' : motion.status === 'granted' ? '搖動手機，或按一下圓形按鈕' : '按一下圓形按鈕，找一位同期的夥伴'}
          </p>
          {motion.status === 'needs-permission' && (
            <div className="notice">
              <p>想用搖的，需要先允許動作感應器。</p>
              <button type="button" className="btn btn-secondary btn-small" onClick={motion.request}>開啟搖一搖</button>
            </div>
          )}
          {motion.status === 'denied' && <p className="muted small">沒有允許動作感應器，請用按鈕搖一搖。</p>}
        </div>
      )}

      {phase === 'empty' && (
        <Empty
          title="這輪沒有新朋友"
          text={state.distance === 'all' ? '稍後再搖一次，或等更多人加入。' : '附近暫時沒有人，試試把距離改成「不限」。'}
          action={state.distance !== 'all' ? <button type="button" className="btn btn-secondary" onClick={() => api.setDistance('all')}>改成不限</button> : null}
        />
      )}

      {phase === 'card' && cand && (
        <>
          <MatchCard user={cand} status={status} onGreet={greet} onSkip={skip} />
          {status === 'sent' && (
            <button type="button" className="btn btn-primary btn-block" onClick={() => { setCandId(null); setPhase('idle') }}>
              再搖一次
            </button>
          )}
        </>
      )}
    </div>
  )
}

export function MatchSuccess() {
  const { id } = useParams()
  const { state } = useStore()
  const user = userOf(state, id)
  const shared = sharedInterests(state, user)
  return (
    <div className="page match-success">
      <div className="pair">
        <Avatar user={userOf(state, 'me')} size={88} />
        <span className="pair-ripple"><Ripples size={72} animate /></span>
        <Avatar user={user} size={88} />
      </div>
      <h1 className="page-title">你和 {user.name} 配對成功</h1>
      <p className="muted">{shared.length ? `你們都喜歡：${shared.join('、')}` : `${flagOf(user.nationality)} ${user.nationality ?? ''}・${user.job ?? ''}`}</p>
      <div className="safety-banner" role="note">
        <p>第一次見面請選公共場所，並告訴朋友你的行程。</p>
      </div>
      <Link to={`/chats/${dmConvId(id)}`} className="btn btn-primary btn-block">開始聊天</Link>
      <Link to="/shake" className="btn btn-secondary btn-block">繼續搖</Link>
    </div>
  )
}
