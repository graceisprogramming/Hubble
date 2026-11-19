import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { DEMO_SPEEDUP, GUIDE_BATCH, GUIDE_LANGS, GUIDE_TIMEOUT_MIN, guideLangLabel } from '../lib/config'
import { fmtDateTime, fromDateTimeInput, toDateTimeInput } from '../lib/dates'
import { activityConvId } from '../lib/reducer'
import { TEAM_LABEL } from '../lib/seed'
import { BackLink, ChipGroup, Empty, Field, GuideCard, Ripples, Tag } from '../components/ui'

function DemoNote() {
  if (DEMO_SPEEDUP <= 1) return null
  return (
    <p className="demo-note">
      示範模式：時間加速 {DEMO_SPEEDUP} 倍，{GUIDE_TIMEOUT_MIN} 分鐘的逾時在這裡只要 {Math.round((GUIDE_TIMEOUT_MIN * 60) / DEMO_SPEEDUP)} 秒。導遊的回應是系統模擬的。
    </p>
  )
}

export function GuidePage() {
  const { id } = useParams()
  const { state, api } = useStore()
  const nav = useNavigate()
  const [form, setForm] = useState({ topic: '', lang: 'zh', note: '' })
  const [resched, setResched] = useState(false)
  const [when, setWhen] = useState('')
  const activity = state.activities.find((a) => a.id === id)
  const back = `/activities/${id}`

  if (!activity || activity.organizer !== 'me' || activity.status !== 'formed') {
    return (
      <div className="page">
        <BackLink to={back} />
        <Empty title="現在還不能安排導遊" text="活動要先成團，而且由發起人來安排。" action={<Link to={back} className="btn btn-primary">回到活動</Link>} />
      </div>
    )
  }
  const req = state.guideRequests[id]
  const showForm = !req || req.status === 'cancelled'
  const set = (patch) => setForm((c) => ({ ...c, ...patch }))

  if (showForm) {
    return (
      <form
        className="page"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (form.topic.trim()) api.requestGuide(id, { ...form, topic: form.topic.trim(), note: form.note.trim() })
        }}
      >
        <BackLink to={back} />
        <h1 className="page-title">配對導遊講解</h1>
        <dl className="kv readonly">
          <dt>活動</dt><dd>{activity.title}</dd>
          <dt>時間</dt><dd>{fmtDateTime(activity.startsAt)}</dd>
          <dt>地點</dt><dd>{activity.place}</dd>
          <dt>人數</dt><dd>{activity.members.length} 人</dd>
        </dl>
        <Field label="想聽的講解主題" hint="例如：古城歷史、寺廟文化、夜市美食">
          <input value={form.topic} maxLength={40} onChange={(e) => set({ topic: e.target.value })} />
        </Field>
        <div className="field">
          <span className="field-label">講解語言</span>
          <ChipGroup single options={GUIDE_LANGS} value={form.lang} onChange={(lang) => set({ lang })} label="講解語言" />
        </div>
        <Field label="備註（選填）"><textarea rows={3} maxLength={150} value={form.note} onChange={(e) => set({ note: e.target.value })} /></Field>
        <DemoNote />
        <div className="actions sticky-actions">
          <button type="submit" className="btn btn-primary btn-block" disabled={!form.topic.trim()}>一鍵配對導遊</button>
        </div>
      </form>
    )
  }

  const count = (s) => req.invites.filter((i) => i.status === s).length
  const guide = req.status === 'success' ? state.guides.find((g) => g.id === req.accepted) : null

  return (
    <div className="page">
      <BackLink to={back} />
      <h1 className="page-title">導遊配對</h1>

      {req.status === 'matching' && (
        <section className="status status-matching" aria-live="polite">
          <Ripples size={120} animate />
          <h2>正在邀請導遊</h2>
          <p className="muted">每次邀請 {GUIDE_BATCH} 位，最先接受的導遊會加入你們的群聊。</p>
          <p>已邀請 {req.invites.length} 位，共 {req.order.length} 位候選・邀請中 {count('inviting')}・已婉拒 {count('declined')}・逾時 {count('timeout')}</p>
          <DemoNote />
          <button type="button" className="btn btn-secondary" onClick={() => api.cancelGuide(id)}>取消配對</button>
        </section>
      )}

      {req.status === 'success' && (
        <section className="status">
          <h2>配對成功</h2>
          <GuideCard guide={guide} status="已接受" />
          <p className="muted">導遊已加入活動群聊。</p>
          <Link to={`/chats/${activityConvId(id)}`} className="btn btn-primary">進入群聊</Link>
        </section>
      )}

      {req.status === 'none' && (
        <section className="status">
          <h2>無人可接</h2>
          <p>目前沒有導遊能接這個時段。你可以改期，或這次不安排導遊。</p>
          {resched ? (
            <>
              <Field label="新的時間" error={when && fromDateTimeInput(when) < Date.now() ? '時間不能早於現在' : ''}>
                <input type="datetime-local" value={when} min={toDateTimeInput(Date.now())} onChange={(e) => setWhen(e.target.value)} />
              </Field>
              <div className="actions">
                <button type="button" className="btn btn-secondary" onClick={() => setResched(false)}>取消</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!when || fromDateTimeInput(when) < Date.now()}
                  onClick={() => {
                    api.reschedule(id, fromDateTimeInput(when))
                    api.guideFormAgain(id)
                    setResched(false)
                  }}
                >
                  儲存並重新配對
                </button>
              </div>
            </>
          ) : (
            <div className="actions">
              <button type="button" className="btn btn-secondary" onClick={() => { setWhen(toDateTimeInput(activity.startsAt)); setResched(true) }}>改期</button>
              <button type="button" className="btn btn-primary" onClick={() => { api.noGuide(id); nav(back) }}>改為不需要導遊</button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

// S17：導遊端。示範用，先選一位導遊，再看他收到的邀請
export function GuidePortal() {
  const { state, api } = useStore()
  const [gid, setGid] = useState(state.guides[0]?.id ?? '')
  const guide = state.guides.find((g) => g.id === gid)
  const rows = Object.entries(state.guideRequests).flatMap(([activityId, req]) =>
    req.invites
      .filter((i) => i.guideId === gid)
      .map((i) => ({ activityId, req, invite: i, activity: state.activities.find((a) => a.id === activityId) })),
  )
  const label = { inviting: '等你回覆', accepted: '你已接受', declined: '你已婉拒', timeout: '已逾時', expired: '邀請已失效' }
  return (
    <div className="page portal">
      <Link to="/" className="back-link">返回 App</Link>
      <h1 className="page-title">導遊端（示範）</h1>
      <Field label="目前身份">
        <select value={gid} onChange={(e) => setGid(e.target.value)}>
          {state.guides.map((g) => <option key={g.id} value={g.id}>{g.name}（{TEAM_LABEL[g.team]}）</option>)}
        </select>
      </Field>
      {guide && <p className="muted">講解語言：{guide.langs.map(guideLangLabel).join('、')}</p>}
      {rows.length === 0 ? (
        <Empty title="目前沒有邀請" text="有活動需要導遊時，邀請會出現在這裡。" />
      ) : (
        <div className="card-list">
          {rows.map(({ activityId, req, invite, activity }) => (
            <article key={`${activityId}-${invite.guideId}`} className="panel">
              <Tag tone={invite.status === 'inviting' ? 'teal' : 'gray'}>{label[invite.status]}</Tag>
              <h3>{activity?.title ?? '活動'}</h3>
              <dl className="kv">
                <dt>時間</dt><dd>{activity ? fmtDateTime(activity.startsAt) : '-'}</dd>
                <dt>地點</dt><dd>{activity?.place}</dd>
                <dt>人數</dt><dd>{activity?.members.length} 人</dd>
                <dt>講解主題</dt><dd>{req.topic}</dd>
                <dt>語言</dt><dd>{guideLangLabel(req.lang)}</dd>
                <dt>費用</dt><dd>{guide?.fee}</dd>
              </dl>
              {invite.status === 'inviting' ? (
                <div className="actions">
                  <button type="button" className="btn btn-secondary" onClick={() => api.respondGuide(activityId, gid, false)}>婉拒</button>
                  <button type="button" className="btn btn-primary" onClick={() => api.respondGuide(activityId, gid, true)}>接受</button>
                </div>
              ) : (invite.status === 'expired' || invite.status === 'timeout') ? (
                <p className="muted small">這個邀請已經失效。</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
