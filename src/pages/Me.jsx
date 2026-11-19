import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { REPORT_REASONS } from '../lib/config'
import { userOf } from '../lib/selectors'
import { Avatar, BackLink, Empty, Icon } from '../components/ui'
import { BasicFields, IntentFields, WorkFields } from './profileFields'

export function Me() {
  const { state, api } = useStore()
  const nav = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const me = state.me
  const patch = (x) => api.saveProfile(x)
  return (
    <div className="page">
      <h1 className="page-title">我的</h1>
      <div className="me-head">
        <Avatar user={userOf(state, 'me')} size={64} />
        <div>
          <strong>{me.name}</strong>
          <p className="muted">{me.email}</p>
        </div>
      </div>

      <section className="panel">
        <h2 className="section-title">個人檔案</h2>
        <p className="muted small">修改會立刻儲存。</p>
        <BasicFields value={me} onChange={patch} />
        <WorkFields value={me} onChange={patch} />
      </section>
      <section className="panel">
        <h2 className="section-title">社交意圖</h2>
        <IntentFields value={me} onChange={patch} />
      </section>

      <section className="panel">
        <h2 className="section-title">設定</h2>
        <label className="check">
          <input type="checkbox" checked={state.settings.notify} onChange={(e) => api.setSettings({ notify: e.target.checked })} />
          <span>顯示通知（配對成功、新訊息、活動提醒）</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={state.useRealLocation} onChange={(e) => api.setUseRealLocation(e.target.checked)} />
          <span>使用真實定位算距離<small>關閉時，位置固定在清邁尼曼區，方便示範。開啟後，選距離篩選時才會請求定位授權。</small></span>
        </label>
        <p className="muted">介面語言：繁體中文</p>
      </section>

      <section className="panel">
        <h2 className="section-title">示範工具</h2>
        <div className="actions wrap">
          <button type="button" className="btn btn-secondary" onClick={() => { if (window.confirm('重置後，配對、活動、聊天都會回到初始狀態。個人檔案會保留。')) api.resetDemo() }}>重置示範資料</button>
          <Link to="/guide-portal" className="btn btn-secondary">導遊端（示範）</Link>
          <Link to="/admin" className="btn btn-secondary">營運後台（示範）</Link>
        </div>
      </section>

      <section className="panel">
        <div className="actions wrap">
          <button type="button" className="btn btn-secondary" onClick={() => { api.logout(); nav('/welcome') }}>登出</button>
          <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>刪除帳號</button>
        </div>
        {confirming && (
          <div className="confirm" role="alertdialog" aria-label="確認刪除帳號">
            <p><strong>確定要刪除帳號嗎？</strong>你的檔案、配對、活動和聊天都會被清除，無法復原。</p>
            <div className="actions">
              <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)}>先不要</button>
              <button type="button" className="btn btn-danger" onClick={() => { api.resetAll(); nav('/welcome') }}>確認刪除</button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export function Report() {
  const { userId } = useParams()
  const { state, api } = useStore()
  const nav = useNavigate()
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [alsoBlock, setAlsoBlock] = useState(true)
  const [done, setDone] = useState(null)
  const user = userOf(state, userId)
  if (userId === 'me' || userId?.startsWith('guide:')) {
    return <div className="page"><BackLink to="/shake" /><Empty title="這個對象不能被檢舉" /></div>
  }
  if (done) {
    return (
      <div className="page">
        <Empty
          title={done === 'report' ? '已收到你的檢舉' : '已封鎖'}
          text={done === 'report' ? '我們會盡快處理。' : `${user.name} 不會再出現在搖一搖和聊天裡。`}
          action={<Link to="/shake" className="btn btn-primary">回到搖一搖</Link>}
        />
      </div>
    )
  }
  return (
    <div className="page">
      <button type="button" className="back-link" onClick={() => nav(-1)}><Icon name="back" size={20} /><span>返回</span></button>
      <h1 className="page-title">檢舉或封鎖 {user.name}</h1>
      <fieldset className="radios">
        <legend className="field-label">原因</legend>
        {REPORT_REASONS.map((r) => (
          <label key={r} className="check">
            <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} />
            <span>{r}</span>
          </label>
        ))}
      </fieldset>
      <label className="field">
        <span className="field-label">補充說明（選填）</span>
        <textarea rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <label className="check">
        <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} />
        <span>同時封鎖對方</span>
      </label>
      <div className="actions">
        <button type="button" className="btn btn-secondary" onClick={() => { api.block(userId); setDone('block') }}>只封鎖</button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!reason}
          onClick={() => {
            api.report(userId, reason, note.trim())
            if (alsoBlock) api.block(userId)
            setDone('report')
          }}
        >
          送出檢舉
        </button>
      </div>
    </div>
  )
}
