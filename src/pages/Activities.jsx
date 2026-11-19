import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { ACTIVITY_TYPES, GUIDE_LANGS, OFFICIAL_SIGNUP_URL, PUBLIC_PLACE_TYPES, guideLangLabel } from '../lib/config'
import { fmtDateTime, fromDateTimeInput, sameDay, toDateInput, toDateTimeInput } from '../lib/dates'
import { dmConvId, activityConvId } from '../lib/reducer'
import { userOf } from '../lib/selectors'
import { ActivityCard, Avatar, BackLink, ChipGroup, Empty, GuideCard, Icon, Tag, Field } from '../components/ui'

const TABS = [
  { id: 'all', label: '全部' },
  { id: 'official', label: '官方' },
  { id: 'friends', label: '朋友揪的' },
]

function activityBadge(a) {
  if (a.members.includes('me')) return { text: '已加入', tone: 'green' }
  if (a.members.length >= a.max) return { text: '額滿', tone: 'gray' }
  if (a.status === 'formed') return { text: '已成團', tone: 'teal' }
  return null
}

export function ActivityList() {
  const { state } = useStore()
  const [tab, setTab] = useState('all')
  const [date, setDate] = useState('')

  const items = useMemo(() => {
    const official = state.official.map((e) => ({
      official: true, id: e.id, href: `/activities/official/${e.id}`, title: e.title, startsAt: e.startsAt,
      place: e.meet, count: e.taken, max: e.capacity,
    }))
    const friends = state.activities.map((a) => ({
      official: false, id: a.id, href: `/activities/${a.id}`, title: a.title, startsAt: a.startsAt,
      place: a.place, count: a.members.length, max: a.max, badge: activityBadge(a),
    }))
    return [...official, ...friends]
      .filter((i) => (tab === 'all' ? true : tab === 'official' ? i.official : !i.official))
      .filter((i) => (date ? sameDay(i.startsAt, new Date(`${date}T00:00:00`).getTime()) : true))
      .sort((x, y) => x.startsAt - y.startsAt)
  }, [state.official, state.activities, tab, date])

  return (
    <div className="list-wrap">
      <h1 className="page-title">活動</h1>
      <div className="tabs" role="tablist" aria-label="活動類型">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="date-filter">
        <label>
          <span className="field-label">日期</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        {date && <button type="button" className="btn-link" onClick={() => setDate('')}>清除日期</button>}
      </div>
      {items.length === 0 ? (
        <Empty title="這天沒有活動" text="換一天看看，或自己揪一場。" action={<Link to="/activities/new" className="btn btn-primary">建立活動</Link>} />
      ) : (
        <div className="card-list">
          {items.map((i) => <ActivityCard key={i.id} item={i} />)}
        </div>
      )}
      <Link to="/activities/new" className="fab" aria-label="建立活動">
        <Icon name="plus" size={26} />
        <span>建立活動</span>
      </Link>
    </div>
  )
}

function GuideSection({ activity }) {
  const { state, api } = useStore()
  const nav = useNavigate()
  const isOrganizer = activity.organizer === 'me'
  const req = state.guideRequests[activity.id]
  const guide = req?.status === 'success' ? state.guides.find((g) => g.id === req.accepted) : null
  if (activity.status !== 'formed') return null

  let body
  if (guide) {
    body = (
      <>
        <GuideCard guide={guide} status="已接受" />
        <p className="muted small">導遊已加入活動群聊。</p>
      </>
    )
  } else if (activity.guideChoice === 'yes') {
    body = (
      <>
        <p>{req?.status === 'matching' ? '正在邀請導遊…' : req?.status === 'none' ? '目前沒有導遊能接這場。' : '已選擇需要導遊講解。'}</p>
        {isOrganizer && <Link to={`/activities/${activity.id}/guide`} className="btn btn-secondary">查看配對狀態</Link>}
      </>
    )
  } else if (activity.guideChoice === 'no') {
    body = <p className="muted">這次不安排導遊。</p>
    if (isOrganizer) {
      body = (
        <>
          {body}
          <button type="button" className="btn-link" onClick={() => api.chooseGuide(activity.id, null)}>改變主意</button>
        </>
      )
    }
  } else if (isOrganizer) {
    body = (
      <>
        <h3>需要導遊講解嗎？</h3>
        <p className="muted">成團了。需要的話，一鍵配對雄獅的導遊。</p>
        <div className="actions">
          <button type="button" className="btn btn-secondary" onClick={() => api.chooseGuide(activity.id, 'no')}>不需要</button>
          <button type="button" className="btn btn-primary" onClick={() => { api.chooseGuide(activity.id, 'yes'); nav(`/activities/${activity.id}/guide`) }}>需要</button>
        </div>
      </>
    )
  } else {
    body = <p className="muted">發起人還沒決定是否安排導遊。</p>
  }
  return <section className="panel guide-section">{isOrganizer && !guide && activity.guideChoice == null ? null : <h3>導遊講解</h3>}{body}</section>
}

export function ActivityDetail() {
  const { id } = useParams()
  const { state, api } = useStore()
  const [editing, setEditing] = useState(false)
  const [when, setWhen] = useState('')
  const activity = state.activities.find((a) => a.id === id)
  if (!activity) {
    return (
      <div className="page">
        <BackLink to="/activities" />
        <Empty title="找不到這個活動" text="它可能已經被刪除。" action={<Link to="/activities" className="btn btn-primary">回到活動列表</Link>} />
      </div>
    )
  }
  const isMember = activity.members.includes('me')
  const isOrganizer = activity.organizer === 'me'
  const full = activity.members.length >= activity.max
  const startEdit = () => {
    setWhen(toDateTimeInput(activity.startsAt))
    setEditing(true)
  }
  const saveTime = () => {
    const ts = fromDateTimeInput(when)
    if (Number.isNaN(ts) || ts < Date.now()) return
    api.reschedule(activity.id, ts)
    setEditing(false)
  }

  return (
    <div className="page detail">
      <BackLink to="/activities" />
      <div className="detail-head">
        <Tag tone="sand">朋友揪的</Tag>
        {activity.status === 'formed' && <Tag tone="teal">已成團</Tag>}
        <h1 className="page-title">{activity.title}</h1>
      </div>
      <dl className="kv">
        <dt>時間</dt>
        <dd>{fmtDateTime(activity.startsAt)}</dd>
        <dt>地點</dt>
        <dd>{activity.place}</dd>
        <dt>類型</dt>
        <dd>{activity.type}</dd>
        <dt>語言</dt>
        <dd>{guideLangLabel(activity.lang)}</dd>
        <dt>人數</dt>
        <dd>{activity.members.length} / {activity.max} 人</dd>
      </dl>
      {activity.desc && <p className="bio">{activity.desc}</p>}

      {isOrganizer && (
        <div className="panel">
          {editing ? (
            <>
              <Field label="新的時間" error={when && fromDateTimeInput(when) < Date.now() ? '時間不能早於現在' : ''}>
                <input type="datetime-local" value={when} min={toDateTimeInput(Date.now())} onChange={(e) => setWhen(e.target.value)} />
              </Field>
              <p className="muted small">改期後，已配對或配對中的導遊會失效，需要重新配對。</p>
              <div className="actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>取消</button>
                <button type="button" className="btn btn-primary" onClick={saveTime}>儲存時間</button>
              </div>
            </>
          ) : (
            <div className="actions">
              <button type="button" className="btn btn-secondary" onClick={startEdit}>修改時間</button>
              {activity.status === 'recruiting' && (
                <button type="button" className="btn btn-primary" disabled={activity.members.length < 2} onClick={() => api.confirmFormed(activity.id)}>
                  確認成團
                </button>
              )}
            </div>
          )}
          {activity.status === 'recruiting' && activity.members.length < 2 && !editing && <p className="muted small">至少要有 2 人才能確認成團。</p>}
        </div>
      )}

      <GuideSection activity={activity} />

      <h2 className="section-title">成員</h2>
      <ul className="members">
        {activity.members.map((m) => {
          const u = userOf(state, m)
          return (
            <li key={m}>
              <Avatar user={u} size={40} />
              <span>{m === 'me' ? '你' : u.name}{m === activity.organizer && <Tag tone="sand">發起人</Tag>}</span>
              {m !== 'me' && <Link to={`/report/${m}`} className="icon-btn" aria-label={`檢舉或封鎖 ${u.name}`}><Icon name="more" size={20} /></Link>}
            </li>
          )
        })}
      </ul>

      <div className="actions sticky-actions">
        {isMember ? (
          <>
            {!isOrganizer && (
              <button type="button" className="btn btn-secondary" onClick={() => api.leaveActivity(activity.id)}>退出活動</button>
            )}
            <Link to={`/chats/${activityConvId(activity.id)}`} className="btn btn-primary">進入群聊</Link>
          </>
        ) : (
          <button type="button" className="btn btn-primary btn-block" disabled={full} onClick={() => api.joinActivity(activity.id)}>
            {full ? '已額滿' : '加入活動'}
          </button>
        )}
      </div>
    </div>
  )
}

export function CreateActivity() {
  const { api } = useStore()
  const nav = useNavigate()
  const [f, setF] = useState({ title: '', type: ACTIVITY_TYPES[0], startsAt: '', placeType: PUBLIC_PLACE_TYPES[0], placeName: '', max: 6, lang: 'zh', desc: '' })
  const set = (patch) => setF((c) => ({ ...c, ...patch }))
  const ts = fromDateTimeInput(f.startsAt)
  const timeError = f.startsAt && ts < Date.now() ? '時間不能早於現在' : ''
  const valid = f.title.trim() && f.placeName.trim() && !Number.isNaN(ts) && ts >= Date.now() && f.max >= 2 && f.max <= 20

  const submit = (e) => {
    e.preventDefault()
    if (!valid) return
    const id = api.createActivity({
      title: f.title.trim(), type: f.type, startsAt: ts, place: `${f.placeType}｜${f.placeName.trim()}`,
      max: Number(f.max), lang: f.lang, desc: f.desc.trim(),
    })
    nav(`/activities/${id}`)
  }
  return (
    <form className="page" onSubmit={submit} noValidate>
      <BackLink to="/activities" />
      <h1 className="page-title">建立活動</h1>
      <Field label="標題"><input value={f.title} maxLength={30} onChange={(e) => set({ title: e.target.value })} /></Field>
      <div className="field">
        <span className="field-label">類型</span>
        <ChipGroup single options={ACTIVITY_TYPES} value={f.type} onChange={(type) => set({ type })} label="活動類型" />
      </div>
      <Field label="時間" error={timeError}>
        <input type="datetime-local" value={f.startsAt} min={toDateTimeInput(Date.now())} onChange={(e) => set({ startsAt: e.target.value })} />
      </Field>
      <Field label="地點類型" hint="為了安全，地點只能選公開場所。">
        <select value={f.placeType} onChange={(e) => set({ placeType: e.target.value })}>
          {PUBLIC_PLACE_TYPES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </Field>
      <Field label="地點名稱"><input value={f.placeName} maxLength={40} onChange={(e) => set({ placeName: e.target.value })} /></Field>
      <Field label="人數上限（2 至 20 人）">
        <input type="number" min={2} max={20} value={f.max} onChange={(e) => set({ max: e.target.value })} inputMode="numeric" />
      </Field>
      <div className="field">
        <span className="field-label">使用語言</span>
        <ChipGroup single options={GUIDE_LANGS} value={f.lang} onChange={(lang) => set({ lang })} label="使用語言" />
      </div>
      <Field label="說明（選填）"><textarea rows={3} maxLength={200} value={f.desc} onChange={(e) => set({ desc: e.target.value })} /></Field>
      <div className="actions sticky-actions">
        <button type="submit" className="btn btn-primary btn-block" disabled={!valid}>發佈活動</button>
      </div>
    </form>
  )
}

export function OfficialDetail() {
  const { eid } = useParams()
  const { state, api } = useStore()
  const [picking, setPicking] = useState(false)
  const [chosen, setChosen] = useState([])
  const e = state.official.find((x) => x.id === eid)
  if (!e) {
    return (
      <div className="page">
        <BackLink to="/activities" />
        <Empty title="找不到這個行程" action={<Link to="/activities" className="btn btn-primary">回到活動列表</Link>} />
      </div>
    )
  }
  const full = e.taken >= e.capacity
  const friends = state.matches.filter((m) => !state.blocked.includes(m))
  const invite = () => {
    for (const id of chosen) {
      api.send(dmConvId(id), `我想報名「${e.title}」，一起來嗎？${OFFICIAL_SIGNUP_URL}`)
    }
    api.notify(`已把「${e.title}」的報名連結傳給 ${chosen.length} 位朋友`)
    setPicking(false)
    setChosen([])
  }
  return (
    <div className="page detail">
      <BackLink to="/activities" />
      <div className="detail-head">
        <Tag tone="teal">官方</Tag>
        <h1 className="page-title">{e.title}</h1>
      </div>
      <dl className="kv">
        <dt>日期時間</dt><dd>{fmtDateTime(e.startsAt)}</dd>
        <dt>集合點</dt><dd>{e.meet}</dd>
        <dt>費用</dt><dd>{e.price}</dd>
        <dt>包含項目</dt><dd>{e.includes}</dd>
        <dt>名額</dt><dd>{full ? '已額滿' : `剩 ${e.capacity - e.taken} 個（共 ${e.capacity} 個）`}</dd>
      </dl>
      <p className="muted small">這頁是示範資料。報名會導向雄獅既有的報名方式。</p>

      {picking ? (
        <section className="panel">
          <h3>選要揪的朋友</h3>
          {friends.length === 0 ? (
            <p className="muted">你還沒有配對成功的朋友，先去搖一搖吧。</p>
          ) : (
            <ul className="pick-list">
              {friends.map((id) => {
                const u = userOf(state, id)
                return (
                  <li key={id}>
                    <label className="check">
                      <input type="checkbox" checked={chosen.includes(id)} onChange={() => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))} />
                      <Avatar user={u} size={32} /><span>{u.name}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="actions">
            <button type="button" className="btn btn-secondary" onClick={() => setPicking(false)}>取消</button>
            <button type="button" className="btn btn-primary" disabled={!chosen.length} onClick={invite}>傳送報名連結</button>
          </div>
        </section>
      ) : (
        <div className="actions sticky-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setPicking(true)}>揪朋友一起報名</button>
          {full ? (
            <button type="button" className="btn btn-primary" disabled>已額滿</button>
          ) : (
            <a className="btn btn-primary" href={OFFICIAL_SIGNUP_URL} target="_blank" rel="noreferrer">報名</a>
          )}
        </div>
      )}
    </div>
  )
}
