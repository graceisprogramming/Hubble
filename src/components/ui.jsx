import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useStore } from '../lib/store'
import { unreadTotal, incomingList } from '../lib/selectors'
import { fmtDateTime } from '../lib/dates'
import { guideLangLabel } from '../lib/config'
import { TEAM_LABEL } from '../lib/seed'

export function Icon({ name, size = 24 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  switch (name) {
    case 'shake':
      return (
        <svg {...common}>
          <rect x="8" y="5" width="8" height="14" rx="2" />
          <path d="M4.5 9v6M2 10.5v3M19.5 9v6M22 10.5v3" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M4 10h16M9 3v4M15 3v4" />
        </svg>
      )
    case 'chat':
      return (
        <svg {...common}>
          <path d="M5 6h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-7l-4 3.5V16H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />
        </svg>
      )
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="9" r="3.5" />
          <path d="M5 20c.8-3.4 3.6-5 7-5s6.2 1.6 7 5" />
        </svg>
      )
    case 'back':
      return (
        <svg {...common}>
          <path d="M15 5l-7 7 7 7" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    case 'more':
      return (
        <svg {...common}>
          <circle cx="5" cy="12" r="1.4" fill="currentColor" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" />
          <circle cx="19" cy="12" r="1.4" fill="currentColor" />
        </svg>
      )
    case 'pin':
      return (
        <svg {...common}>
          <path d="M12 21s6-5.4 6-10a6 6 0 1 0-12 0c0 4.6 6 10 6 10z" />
          <circle cx="12" cy="11" r="2.2" />
        </svg>
      )
    default:
      return null
  }
}

// 水波紋：搖一搖的主視覺
export function Ripples({ size = 240, animate = false }) {
  return (
    <svg className={`ripples${animate ? ' is-live' : ''}`} width={size} height={size} viewBox="0 0 240 240" aria-hidden="true">
      <circle className="rp r4" cx="120" cy="120" r="112" />
      <circle className="rp r3" cx="120" cy="120" r="88" />
      <circle className="rp r2" cx="120" cy="120" r="64" />
      <circle className="rp r1" cx="120" cy="120" r="40" />
      <circle cx="120" cy="120" r="14" fill="var(--coral)" />
    </svg>
  )
}

export function Avatar({ user, size = 44 }) {
  if (user?.photo) return <img className="avatar" src={user.photo} alt="" style={{ width: size, height: size }} />
  return (
    <span className="avatar" aria-hidden="true" style={{ width: size, height: size, fontSize: size * 0.42, background: user?.color || 'var(--teal)' }}>
      {(user?.name || '?').slice(0, 1).toUpperCase()}
    </span>
  )
}

export function Tag({ children, tone = 'gray' }) {
  return <span className={`tag tag-${tone}`}>{children}</span>
}

export function BackLink({ to, children = '返回' }) {
  return (
    <Link to={to} className="back-link">
      <Icon name="back" size={20} />
      <span>{children}</span>
    </Link>
  )
}

export function Empty({ title, text, action }) {
  return (
    <div className="empty">
      <Ripples size={96} />
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {action}
    </div>
  )
}

export function DetailPlaceholder({ text }) {
  return (
    <div className="detail-placeholder">
      <Ripples size={120} />
      <p>{text}</p>
    </div>
  )
}

export function ChipGroup({ options, value, onChange, single = false, label }) {
  const opts = options.map((o) => (typeof o === 'string' ? { id: o, label: o } : o))
  const selected = single ? [value] : value
  const toggle = (id) => {
    if (single) return onChange(id)
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }
  return (
    <div className="chips" role="group" aria-label={label}>
      {opts.map((o) => (
        <button type="button" key={o.id} className="chip" aria-pressed={selected.includes(o.id)} onClick={() => toggle(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, hint, error, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error" role="alert">{error}</span>}
    </label>
  )
}

export function GuideCard({ guide, status }) {
  if (!guide) return null
  return (
    <div className="guide-card">
      <div className="guide-card-head">
        <Avatar user={{ name: guide.name, color: '#b9822d' }} size={48} />
        <div>
          <strong>{guide.name}</strong>
          <div className="muted">{TEAM_LABEL[guide.team]}</div>
        </div>
        {status && <Tag tone={status === '已接受' ? 'green' : 'sand'}>{status}</Tag>}
      </div>
      <dl className="kv">
        <dt>使用語言</dt>
        <dd>{guide.langs.map(guideLangLabel).join('、')}</dd>
        <dt>擅長主題</dt>
        <dd>{guide.topics.join('、')}</dd>
        <dt>費用</dt>
        <dd>{guide.fee}</dd>
      </dl>
    </div>
  )
}

export function ActivityCard({ item }) {
  const full = item.count >= item.max
  return (
    <NavLink to={item.href} className="activity-card">
      <div className="activity-card-top">
        <Tag tone={item.official ? 'teal' : 'sand'}>{item.official ? '官方' : '朋友揪的'}</Tag>
        {item.badge && <Tag tone={item.badge.tone}>{item.badge.text}</Tag>}
      </div>
      <h3>{item.title}</h3>
      <p className="muted">{fmtDateTime(item.startsAt)}</p>
      <p className="muted line-icon"><Icon name="pin" size={16} />{item.place}</p>
      <p className="people-count">{full ? '已額滿' : `${item.count} / ${item.max} 人`}</p>
    </NavLink>
  )
}

export function SafetyBanner({ onClose }) {
  return (
    <div className="safety-banner" role="note">
      <p>第一次見面請選公共場所，並告訴朋友你的行程。</p>
      {onClose && (
        <button type="button" className="btn-link" onClick={onClose}>
          知道了
        </button>
      )}
    </div>
  )
}

export function ToastHost() {
  const { state } = useStore()
  const [toast, setToast] = useState(null)
  const last = useRef(state.notifications.at(-1)?.id ?? null)
  useEffect(() => {
    const n = state.notifications.at(-1)
    if (!n || n.id === last.current) return undefined
    last.current = n.id
    if (!state.settings.notify) return undefined
    setToast(n)
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [state.notifications, state.settings.notify])
  if (!toast) return null
  return (
    <div className="toast" role="status" aria-live="polite">
      {toast.link ? <Link to={toast.link} onClick={() => setToast(null)}>{toast.text}</Link> : <span>{toast.text}</span>}
      <button type="button" className="toast-close" aria-label="關閉通知" onClick={() => setToast(null)}>×</button>
    </div>
  )
}

const NAV = [
  { to: '/shake', label: '搖一搖', icon: 'shake' },
  { to: '/activities', label: '活動', icon: 'calendar' },
  { to: '/chats', label: '聊天', icon: 'chat' },
  { to: '/me', label: '我的', icon: 'user' },
]

function Nav({ variant }) {
  const { state } = useStore()
  const badge = unreadTotal(state) + incomingList(state).length
  return (
    <nav className={variant === 'side' ? 'sidenav' : 'bottomnav'} aria-label="主要導覽">
      {variant === 'side' && <div className="sidenav-brand">搖一搖<small>清邁試住夥伴</small></div>}
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} className="nav-item">
          <span className="nav-icon">
            <Icon name={n.icon} />
            {n.to === '/chats' && badge > 0 && <span className="badge" aria-label={`${badge} 則未讀`}>{badge}</span>}
          </span>
          <span>{n.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export function MainLayout() {
  const { state } = useStore()
  if (!state.onboarded) return <Navigate to="/welcome" replace />
  return (
    <div className="shell">
      <Nav variant="side" />
      <main className="main">
        <Outlet />
      </main>
      <Nav variant="bottom" />
      <ToastHost />
    </div>
  )
}

// 手機一次只顯示列表或詳情；桌機左右並排
export function SplitLayout({ base, list }) {
  const loc = useLocation()
  const hasDetail = loc.pathname.replace(/\/$/, '') !== base
  return (
    <div className={`split${hasDetail ? ' has-detail' : ''}`}>
      <section className="pane-list" aria-label="列表">{list}</section>
      <section className="pane-detail">
        <Outlet />
      </section>
    </div>
  )
}
