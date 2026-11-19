import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Ripples } from '../components/ui'
import { BasicFields, IntentFields, WorkFields, defaultProfile, step1Valid, step2Valid, step3Valid } from './profileFields'

export function Welcome() {
  const { state, api } = useStore()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  if (state.onboarded) return <Navigate to="/shake" replace />

  const enter = (address) => {
    api.login(address)
    const hasProfile = !!state.me?.name && !!state.me?.stayStart
    nav(hasProfile ? (state.me?.adult ? '/shake' : '/safety') : '/onboarding')
  }
  const submit = (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('請輸入有效的電子郵件，例如 name@example.com')
      return
    }
    setError('')
    enter(email.trim())
  }
  return (
    <div className="welcome">
      <div className="welcome-hero">
        <Ripples size={200} animate />
        <h1>搖一搖，在清邁遇見你的下一個旅伴</h1>
        <p>28 天試住，認識同期的數位遊牧夥伴，一起共工、吃飯、週末出遊。</p>
      </div>
      <div className="welcome-panel">
        <form onSubmit={submit} noValidate>
          <label className="field">
            <span className="field-label">電子郵件</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
            {error && <span className="field-error" role="alert">{error}</span>}
          </label>
          <button type="submit" className="btn btn-primary btn-block">用電子郵件登入</button>
        </form>
        <button type="button" className="btn btn-secondary btn-block" onClick={() => enter('social@example.com')}>
          用社群帳號登入
        </button>
        <p className="muted small">示範版：不會寄出任何信件，資料只存在這個瀏覽器。</p>
        <details className="privacy">
          <summary>我們會收集什麼資料</summary>
          <p>只收集配對需要的資料：暱稱、國籍、語言、職業、興趣、停留日期與大範圍住宿區域。不會顯示精確住址，你可以隨時在「我的」刪除帳號與所有資料。</p>
        </details>
      </div>
    </div>
  )
}

const STEPS = ['基本資料', '工作與興趣', '社交意圖']

export function Onboarding() {
  const { state, api } = useStore()
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [p, setP] = useState(() => ({ ...defaultProfile(), ...(state.me || {}) }))
  if (state.onboarded) return <Navigate to="/shake" replace />
  const patch = (x) => setP((cur) => ({ ...cur, ...x }))
  const valid = [step1Valid(p), step2Valid(p), step3Valid(p)][step]
  const next = () => {
    if (step < 2) return setStep(step + 1)
    const { email, adult, ...rest } = p
    api.saveProfile({ ...rest, name: rest.name.trim(), job: rest.job.trim() })
    nav('/safety')
  }
  return (
    <div className="page">
      <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step + 1} aria-label="建立檔案進度">
        {STEPS.map((s, i) => (
          <span key={s} className={i <= step ? 'on' : ''} />
        ))}
      </div>
      <h1 className="page-title">{STEPS[step]}</h1>
      <p className="muted">第 {step + 1} 步，共 3 步</p>
      {step === 0 && <BasicFields value={p} onChange={patch} />}
      {step === 1 && <WorkFields value={p} onChange={patch} />}
      {step === 2 && <IntentFields value={p} onChange={patch} />}
      <div className="actions">
        {step > 0 && (
          <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)}>上一步</button>
        )}
        <button type="button" className="btn btn-primary" disabled={!valid} onClick={next}>
          {step < 2 ? '下一步' : '完成'}
        </button>
      </div>
    </div>
  )
}

export function Safety() {
  const { state, api } = useStore()
  const nav = useNavigate()
  const [ok, setOk] = useState(false)
  if (state.onboarded) return <Navigate to="/shake" replace />
  if (!state.me?.name) return <Navigate to="/welcome" replace />
  return (
    <div className="page">
      <h1 className="page-title">開始前，先看三件事</h1>
      <ol className="rules">
        <li><strong>雙方都打招呼才能聊天。</strong>你不想聊的人，不會收到你的訊息。</li>
        <li><strong>第一次見面選公共場所。</strong>並且告訴朋友你的行程。</li>
        <li><strong>位置只顯示大範圍區域。</strong>配對卡只顯示約略距離，不顯示精確位置。</li>
      </ol>
      <label className="check">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
        <span>我已年滿 18 歲，並同意以上原則</span>
      </label>
      <div className="actions">
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={!ok}
          onClick={() => {
            api.acceptSafety()
            nav('/shake')
          }}
        >
          開始搖一搖
        </button>
      </div>
    </div>
  )
}
