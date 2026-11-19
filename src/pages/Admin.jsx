import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { GUIDE_LANGS, WEEKDAYS, guideLangLabel } from '../lib/config'
import { fmtDateTime, fromDateTimeInput, toDateTimeInput } from '../lib/dates'
import { TEAM_LABEL } from '../lib/seed'
import { ChipGroup, Empty, Field, Tag } from '../components/ui'
import { userOf } from '../lib/selectors'

const TABS = [
  { id: 'events', label: '官方行程' },
  { id: 'guides', label: '導遊名單' },
  { id: 'reports', label: '檢舉處理' },
]

function EventsTab() {
  const { state, api } = useStore()
  const [f, setF] = useState({ title: '', startsAt: '', meet: '', price: '', includes: '', capacity: 20 })
  const set = (p) => setF((c) => ({ ...c, ...p }))
  const ts = fromDateTimeInput(f.startsAt)
  const valid = f.title.trim() && f.meet.trim() && !Number.isNaN(ts) && Number(f.capacity) > 0
  return (
    <>
      <div className="card-list">
        {state.official.map((e) => (
          <article key={e.id} className="panel row-between">
            <div>
              <strong>{e.title}</strong>
              <p className="muted">{fmtDateTime(e.startsAt)}・{e.meet}・{e.taken}/{e.capacity} 人</p>
            </div>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => { if (window.confirm(`刪除「${e.title}」？`)) api.deleteEvent(e.id) }}>刪除</button>
          </article>
        ))}
        {state.official.length === 0 && <Empty title="還沒有官方行程" text="用下面的表單新增一個。" />}
      </div>
      <form
        className="panel"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          api.addEvent({ title: f.title.trim(), startsAt: ts, meet: f.meet.trim(), price: f.price.trim() || '未定', includes: f.includes.trim() || '未定', capacity: Number(f.capacity) })
          setF({ title: '', startsAt: '', meet: '', price: '', includes: '', capacity: 20 })
        }}
      >
        <h2 className="section-title">新增行程</h2>
        <Field label="標題"><input value={f.title} onChange={(e) => set({ title: e.target.value })} /></Field>
        <Field label="日期時間"><input type="datetime-local" value={f.startsAt} min={toDateTimeInput(Date.now())} onChange={(e) => set({ startsAt: e.target.value })} /></Field>
        <Field label="集合點"><input value={f.meet} onChange={(e) => set({ meet: e.target.value })} /></Field>
        <Field label="費用"><input value={f.price} onChange={(e) => set({ price: e.target.value })} /></Field>
        <Field label="包含項目"><input value={f.includes} onChange={(e) => set({ includes: e.target.value })} /></Field>
        <Field label="名額"><input type="number" min={1} value={f.capacity} onChange={(e) => set({ capacity: e.target.value })} inputMode="numeric" /></Field>
        <button type="submit" className="btn btn-primary" disabled={!valid}>儲存行程</button>
      </form>
    </>
  )
}

function GuidesTab() {
  const { state, api } = useStore()
  const [f, setF] = useState({ name: '', team: 'tw', langs: ['zh'], days: [6, 0], topics: '' })
  const set = (p) => setF((c) => ({ ...c, ...p }))
  const valid = f.name.trim() && f.langs.length && f.days.length
  return (
    <>
      <div className="card-list">
        {state.guides.map((g) => (
          <article key={g.id} className={`panel row-between${g.active ? '' : ' off'}`}>
            <div>
              <strong>{g.name}</strong> <Tag tone={g.team === 'tw' ? 'teal' : 'sand'}>{TEAM_LABEL[g.team]}</Tag>
              <p className="muted">{g.langs.map(guideLangLabel).join('、')}・每週 {g.days.map((d) => WEEKDAYS[d]).join('、')}・{g.topics.join('、')}</p>
            </div>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => api.toggleGuide(g.id)}>{g.active ? '暫停接單' : '恢復接單'}</button>
          </article>
        ))}
      </div>
      <form
        className="panel"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          api.addGuide({ name: f.name.trim(), team: f.team, langs: f.langs, days: f.days, topics: f.topics.split(/[、,，]/).map((t) => t.trim()).filter(Boolean), fee: '範例：THB 1,500 / 場' })
          setF({ name: '', team: 'tw', langs: ['zh'], days: [6, 0], topics: '' })
        }}
      >
        <h2 className="section-title">新增導遊</h2>
        <Field label="名稱"><input value={f.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="組別">
          <select value={f.team} onChange={(e) => set({ team: e.target.value })}>
            {Object.entries(TEAM_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <div className="field">
          <span className="field-label">講解語言</span>
          <ChipGroup options={GUIDE_LANGS} value={f.langs} onChange={(langs) => set({ langs })} label="講解語言" />
        </div>
        <div className="field">
          <span className="field-label">可接單的星期</span>
          <ChipGroup options={WEEKDAYS.map((w, i) => ({ id: i, label: `週${w}` }))} value={f.days} onChange={(days) => set({ days })} label="可接單的星期" />
        </div>
        <Field label="擅長主題" hint="用頓號分隔，例如：古城歷史、夜市美食"><input value={f.topics} onChange={(e) => set({ topics: e.target.value })} /></Field>
        <button type="submit" className="btn btn-primary" disabled={!valid}>加入名單</button>
      </form>
    </>
  )
}

function ReportsTab() {
  const { state, api } = useStore()
  const label = { open: '待處理', warned: '已警告', suspended: '已停權', closed: '已結案' }
  if (!state.reports.length) return <Empty title="沒有檢舉" text="使用者送出檢舉後，會出現在這裡。" />
  return (
    <div className="card-list">
      {[...state.reports].reverse().map((r) => (
        <article key={r.id} className="panel">
          <Tag tone={r.status === 'open' ? 'coral' : 'gray'}>{label[r.status]}</Tag>
          <h3>{userOf(state, r.userId).name}・{r.reason}</h3>
          {r.note && <p className="bio">{r.note}</p>}
          <p className="muted small">{fmtDateTime(r.ts)}</p>
          <div className="actions wrap">
            <button type="button" className="btn btn-secondary btn-small" onClick={() => api.reportAction(r.id, 'warned')}>警告</button>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => api.reportAction(r.id, 'suspended')}>停權</button>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => api.reportAction(r.id, 'closed')}>結案</button>
          </div>
        </article>
      ))}
    </div>
  )
}

export default function Admin() {
  const [tab, setTab] = useState('events')
  return (
    <div className="page admin">
      <Link to="/" className="back-link">返回 App</Link>
      <h1 className="page-title">營運後台（示範）</h1>
      <p className="muted small">示範版沒有登入驗證，資料只存在這個瀏覽器。正式上線前要加上權限控管。</p>
      <div className="tabs" role="tablist" aria-label="後台功能">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {tab === 'events' && <EventsTab />}
      {tab === 'guides' && <GuidesTab />}
      {tab === 'reports' && <ReportsTab />}
    </div>
  )
}
