import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { StoreProvider } from '../lib/store'
import { buildInitialState, demoMe, withMe } from '../lib/seed'
import { reduce } from '../lib/reducer'
import { nextWeekday } from '../lib/dates'

function renderAt(path, state) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <StoreProvider initialState={state ?? withMe(buildInitialState(Date.now()), demoMe())}>
        <App />
      </StoreProvider>
    </MemoryRouter>,
  )
}

describe('各頁面都能正常顯示', () => {
  const routes = [
    ['/shake', '搖一搖'],
    ['/activities', '活動'],
    ['/activities/a1', '週三咖啡廳共工'],
    ['/activities/new', '建立活動'],
    ['/activities/official/o1', '古城寺廟半日導覽'],
    ['/chats', '收到的招呼'],
    ['/chats/c-a1', '週三咖啡廳共工'],
    ['/me', '個人檔案'],
    ['/report/u1', '檢舉或封鎖'],
    ['/match/u2', '配對成功'],
    ['/admin', '營運後台'],
    ['/guide-portal', '導遊端'],
    ['/activities/a1/guide', '現在還不能安排導遊'],
  ]
  for (const [path, text] of routes) {
    it(path, () => {
      renderAt(path)
      expect(screen.getAllByText(new RegExp(text)).length).toBeGreaterThan(0)
    })
  }

  it('未登入會回到歡迎頁', () => {
    renderAt('/shake', buildInitialState(Date.now()))
    expect(screen.getByText('搖一搖，在清邁遇見你的下一個旅伴')).toBeTruthy()
  })
})

describe('主要流程', () => {
  it('搖一搖 → 配對卡 → 打招呼', async () => {
    renderAt('/shake')
    fireEvent.click(screen.getByRole('button', { name: '搖一搖' }))
    const card = await screen.findByLabelText(/的配對卡/, {}, { timeout: 3000 })
    expect(card).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '打招呼' }))
    expect(screen.getByText('已打招呼，等對方回應')).toBeTruthy()
  })

  it('距離篩選：1 公里內只會搖到近的人', async () => {
    renderAt('/shake')
    fireEvent.click(screen.getByRole('radio', { name: '1 公里內' }))
    fireEvent.click(screen.getByRole('button', { name: '搖一搖' }))
    await screen.findByLabelText(/的配對卡/, {}, { timeout: 3000 })
    expect(screen.getByText(/不到 0.5 公里|約 [01](\.5)? 公里/)).toBeTruthy()
  })

  it('導遊配對：成團後填表單，一鍵配對進入配對中', async () => {
    const now = Date.now()
    let s = withMe(buildInitialState(now), demoMe(now))
    s = reduce(s, { type: 'CREATE_ACTIVITY', now, id: 'ax', form: { title: '週六古城散步', type: '其他', startsAt: nextWeekday(6, 9, now), place: '公園或廣場｜測試', max: 4, lang: 'zh', desc: '' }, joiners: [] })
    s = reduce(s, { type: 'CONFIRM_FORMED', now, activityId: 'ax' })
    renderAt('/activities/ax/guide', s)
    const topic = screen.getByLabelText(/想聽的講解主題/)
    fireEvent.change(topic, { target: { value: '古城歷史' } })
    fireEvent.click(screen.getByRole('button', { name: '一鍵配對導遊' }))
    await waitFor(() => expect(screen.getByText('正在邀請導遊')).toBeTruthy())
  })

  it('平日沒有導遊可接時，顯示無人可接與兩個出路', async () => {
    const now = Date.now()
    let s = withMe(buildInitialState(now), demoMe(now))
    s = reduce(s, { type: 'CREATE_ACTIVITY', now, id: 'ay', form: { title: '週二小聚', type: '其他', startsAt: nextWeekday(2, 10, now), place: '公園或廣場｜測試', max: 4, lang: 'zh', desc: '' }, joiners: [] })
    s = reduce(s, { type: 'CONFIRM_FORMED', now, activityId: 'ay' })
    renderAt('/activities/ay/guide', s)
    fireEvent.change(screen.getByLabelText(/想聽的講解主題/), { target: { value: '古城歷史' } })
    fireEvent.click(screen.getByRole('button', { name: '一鍵配對導遊' }))
    await waitFor(() => expect(screen.getByText('無人可接')).toBeTruthy())
    expect(screen.getByRole('button', { name: '改期' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '改為不需要導遊' })).toBeTruthy()
  })
})
