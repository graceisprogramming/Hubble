import { useState } from 'react'
import { AREAS, INTENTS, INTERESTS, NATIONALITIES, PROFILE_LANGS, WORK_STYLES } from '../lib/config'
import { fromDateInput, toDateInput } from '../lib/dates'
import { Avatar, ChipGroup, Field } from '../components/ui'

export const defaultProfile = (today = Date.now()) => ({
  name: '', photo: null, nationality: '', native: '', languages: [],
  job: '', workStyle: '', interests: [], area: '', stayStart: new Date(today).setHours(0, 0, 0, 0),
  stayEnd: new Date(today).setHours(0, 0, 0, 0) + 27 * 86400000, bio: '', intents: [],
})

export const step1Valid = (p) => p.name.trim() && p.nationality && p.native && p.languages.length > 0
export const step2Valid = (p) =>
  p.job.trim() && p.workStyle && p.interests.length > 0 && p.area && !Number.isNaN(p.stayStart) && !Number.isNaN(p.stayEnd) && p.stayEnd >= p.stayStart
export const step3Valid = (p) => p.intents.length > 0

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('請選擇圖片檔'))
    if (file.size > 5 * 1024 * 1024) return reject(new Error('圖片不能超過 5 MB，請換一張小一點的'))
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('讀取圖片失敗，請再試一次'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('這張圖片無法開啟，請換一張'))
      img.onload = () => {
        const size = 256
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        const s = Math.min(img.width, img.height)
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export function BasicFields({ value, onChange }) {
  const [photoError, setPhotoError] = useState('')
  const set = (patch) => onChange(patch)
  const onPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError('')
    try {
      set({ photo: await resizeImage(file) })
    } catch (err) {
      setPhotoError(`${err.message}。可以再選一次。`)
    }
    e.target.value = ''
  }
  return (
    <>
      <div className="photo-row">
        <Avatar user={{ name: value.name || '?', photo: value.photo }} size={72} />
        <div>
          <label className="btn btn-secondary btn-small">
            上傳照片
            <input type="file" accept="image/*" onChange={onPhoto} hidden />
          </label>
          {value.photo && (
            <button type="button" className="btn-link" onClick={() => set({ photo: null })}>
              移除
            </button>
          )}
          {photoError && <p className="field-error" role="alert">{photoError}</p>}
        </div>
      </div>
      <Field label="暱稱">
        <input value={value.name} onChange={(e) => set({ name: e.target.value })} maxLength={20} autoComplete="nickname" />
      </Field>
      <Field label="國籍">
        <select value={value.nationality} onChange={(e) => set({ nationality: e.target.value })}>
          <option value="">請選擇</option>
          {NATIONALITIES.map((n) => (
            <option key={n.name} value={n.name}>{n.flag} {n.name}</option>
          ))}
        </select>
      </Field>
      <Field label="母語">
        <select value={value.native} onChange={(e) => set({ native: e.target.value })}>
          <option value="">請選擇</option>
          {PROFILE_LANGS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </Field>
      <div className="field">
        <span className="field-label">我會使用的語言（可複選）</span>
        <ChipGroup options={PROFILE_LANGS} value={value.languages} onChange={(languages) => set({ languages })} label="使用語言" />
      </div>
    </>
  )
}

export function WorkFields({ value, onChange }) {
  const set = (patch) => onChange(patch)
  const rangeError = value.stayEnd < value.stayStart ? '離開日期不能早於抵達日期' : ''
  return (
    <>
      <Field label="職業或產業">
        <input value={value.job} onChange={(e) => set({ job: e.target.value })} maxLength={30} />
      </Field>
      <Field label="工作型態">
        <select value={value.workStyle} onChange={(e) => set({ workStyle: e.target.value })}>
          <option value="">請選擇</option>
          {WORK_STYLES.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </Field>
      <div className="field">
        <span className="field-label">興趣（可複選）</span>
        <ChipGroup options={INTERESTS} value={value.interests} onChange={(interests) => set({ interests })} label="興趣" />
      </div>
      <div className="row-2">
        <Field label="抵達日期">
          <input type="date" value={Number.isNaN(value.stayStart) ? '' : toDateInput(value.stayStart)} onChange={(e) => set({ stayStart: fromDateInput(e.target.value) })} />
        </Field>
        <Field label="離開日期" error={rangeError}>
          <input type="date" value={Number.isNaN(value.stayEnd) ? '' : toDateInput(value.stayEnd)} onChange={(e) => set({ stayEnd: fromDateInput(e.target.value) })} />
        </Field>
      </div>
      <Field label="住宿區域" hint="只顯示大範圍區域，不會顯示精確住址。">
        <select value={value.area} onChange={(e) => set({ area: e.target.value })}>
          <option value="">請選擇</option>
          {AREAS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </Field>
      <Field label="自我介紹（選填）">
        <textarea rows={3} maxLength={120} value={value.bio} onChange={(e) => set({ bio: e.target.value })} />
      </Field>
    </>
  )
}

export function IntentFields({ value, onChange }) {
  return (
    <div className="field">
      <span className="field-label">這次想找什麼（可複選）</span>
      <ChipGroup options={INTENTS} value={value.intents} onChange={(intents) => onChange({ intents })} label="社交意圖" />
    </div>
  )
}
