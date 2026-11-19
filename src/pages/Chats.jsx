import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { incomingList, sharedInterests, userOf, visibleConvs } from '../lib/selectors'
import { fmtTime } from '../lib/dates'
import { Avatar, BackLink, Empty, Icon, SafetyBanner, Tag } from '../components/ui'

export function ChatList() {
  const { state, api } = useStore()
  const nav = useNavigate()
  const incoming = incomingList(state)
  const convs = visibleConvs(state)
  const titleOf = (c) => (c.type === 'dm' ? userOf(state, c.members.find((m) => m !== 'me')).name : c.title)
  const preview = (c) => {
    const m = c.messages.at(-1)
    if (!m) return '還沒有訊息'
    return m.system ? m.text : `${m.from === 'me' ? '你' : userOf(state, m.from).name}：${m.text}`
  }
  return (
    <div className="list-wrap">
      <h1 className="page-title">聊天</h1>

      {incoming.length > 0 && (
        <section aria-label="收到的招呼">
          <h2 className="section-title">收到的招呼</h2>
          <div className="card-list">
            {incoming.map((id) => {
              const u = userOf(state, id)
              const shared = sharedInterests(state, u)
              return (
                <article key={id} className="incoming">
                  <Avatar user={u} size={48} />
                  <div className="incoming-body">
                    <strong>{u.name} <span aria-hidden="true">{u.flag}</span></strong>
                    <p className="muted">{u.job}{shared.length ? `・都喜歡${shared.slice(0, 2).join('、')}` : ''}</p>
                  </div>
                  <div className="incoming-actions">
                    <button type="button" className="btn btn-secondary btn-small" onClick={() => api.skip(id)}>略過</button>
                    <button type="button" className="btn btn-primary btn-small" onClick={() => { api.greet(id); nav(`/match/${id}`) }}>回打招呼</button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      <h2 className="section-title">對話</h2>
      {convs.length === 0 ? (
        <Empty title="還沒有對話" text="去搖一搖認識新朋友，或加入一個活動。" action={<Link to="/shake" className="btn btn-primary">去搖一搖</Link>} />
      ) : (
        <ul className="conv-list">
          {convs.map((c) => (
            <li key={c.id}>
              <NavLink to={`/chats/${c.id}`} className="conv">
                {c.type === 'dm' ? <Avatar user={userOf(state, c.members.find((m) => m !== 'me'))} size={44} /> : <span className="avatar group" aria-hidden="true">群</span>}
                <div className="conv-body">
                  <strong>{titleOf(c)}{c.type === 'activity' && <Tag tone="sand">群聊</Tag>}</strong>
                  <p className="muted ellipsis">{preview(c)}</p>
                </div>
                {c.unread > 0 && <span className="badge static" aria-label={`${c.unread} 則未讀`}>{c.unread}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ChatRoom() {
  const { id } = useParams()
  const { state, api } = useStore()
  const [text, setText] = useState('')
  const endRef = useRef(null)
  const conv = state.convs[id]
  const count = conv?.messages.length ?? 0
  const unread = conv?.unread ?? 0

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [count])
  useEffect(() => {
    if (unread > 0) api.readConv(id)
  }, [unread, id, api])

  if (!conv || (conv.type === 'dm' && state.blocked.includes(conv.members.find((m) => m !== 'me')))) {
    return (
      <div className="page">
        <BackLink to="/chats" />
        <Empty title="找不到這個對話" action={<Link to="/chats" className="btn btn-primary">回到聊天</Link>} />
      </div>
    )
  }
  const other = conv.type === 'dm' ? userOf(state, conv.members.find((m) => m !== 'me')) : null
  const send = (e) => {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    api.send(id, t)
    setText('')
  }
  return (
    <div className="chat">
      <header className="chat-head">
        <BackLink to="/chats" />
        <div className="chat-title">
          <h1>{other ? other.name : conv.title}</h1>
          {conv.type === 'activity' && <Link to={`/activities/${conv.activityId}`} className="btn-link">查看活動</Link>}
        </div>
        {other && <Link to={`/report/${other.id}`} className="icon-btn" aria-label={`檢舉或封鎖 ${other.name}`}><Icon name="more" /></Link>}
      </header>
      {conv.type === 'dm' && !conv.safetyDismissed && <SafetyBanner onClose={() => api.dismissSafety(id)} />}
      <ol className="messages" aria-label="訊息">
        {conv.messages.map((m) => {
          if (m.system) return <li key={m.id} className="msg-system">{m.text}</li>
          const mine = m.from === 'me'
          const u = userOf(state, m.from)
          return (
            <li key={m.id} className={`msg${mine ? ' mine' : ''}`}>
              {!mine && conv.type === 'activity' && (
                <span className="msg-name">{u.name}{u.isGuide && <Tag tone="gold">導遊</Tag>}</span>
              )}
              <span className="bubble">{m.text}</span>
              <span className="msg-meta">
                {fmtTime(m.ts)}
                {m.failed && (
                  <>
                    {' '}・傳送失敗 <button type="button" className="btn-link" onClick={() => { if (!api.retrySend(id, m.id)) api.notify('目前沒有網路，連上網路後再按重試') }}>重試</button>
                  </>
                )}
              </span>
            </li>
          )
        })}
        <li ref={endRef} aria-hidden="true" />
      </ol>
      <form className="composer" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="輸入訊息" aria-label="訊息內容" maxLength={500} />
        <button type="submit" className="btn btn-primary" disabled={!text.trim()}>送出</button>
      </form>
    </div>
  )
}
