import { WEEKDAYS } from './config'

export const DAY = 86400000
export const startOfDay = (ts) => new Date(ts).setHours(0, 0, 0, 0)

export const fmtDate = (ts) => {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`
}
export const fmtTime = (ts) => {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
export const fmtDateTime = (ts) => `${fmtDate(ts)} ${fmtTime(ts)}`

const p2 = (n) => String(n).padStart(2, '0')
export const toDateInput = (ts) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}
export const fromDateInput = (v) => (v ? new Date(`${v}T00:00:00`).getTime() : NaN)
export const toDateTimeInput = (ts) => `${toDateInput(ts)}T${p2(new Date(ts).getHours())}:${p2(new Date(ts).getMinutes())}`
export const fromDateTimeInput = (v) => (v ? new Date(v).getTime() : NaN)

// 下一個星期幾（0 = 週日）的指定整點
export function nextWeekday(weekday, hour, from = Date.now()) {
  const d = new Date(from)
  d.setHours(hour, 0, 0, 0)
  let diff = (weekday - d.getDay() + 7) % 7
  if (diff === 0 && d.getTime() <= from) diff = 7
  d.setDate(d.getDate() + diff)
  return d.getTime()
}

export function overlapDays(aStart, aEnd, bStart, bEnd) {
  const s = Math.max(aStart, bStart)
  const e = Math.min(aEnd, bEnd)
  return e < s ? 0 : Math.floor((e - s) / DAY) + 1
}

export const sameDay = (a, b) => startOfDay(a) === startOfDay(b)
