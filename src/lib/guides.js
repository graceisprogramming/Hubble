// 導遊配對的純函式：挑候選、安排示範用的回應計畫
export function candidateGuides(guides, lang, startsAt) {
  const wd = new Date(startsAt).getDay()
  return guides.filter((g) => g.active && g.langs.includes(lang) && g.days.includes(wd))
}

export function shuffle(arr, rand = Math.random) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 示範用：模擬每位導遊會接受、婉拒或不回應
export function makePlan(order, rand = Math.random) {
  const plan = {}
  for (const id of order) {
    const r = rand()
    if (r < 0.45) plan[id] = { decision: 'accept', delayMs: 4000 + Math.floor(rand() * 12000) }
    else if (r < 0.8) plan[id] = { decision: 'decline', delayMs: 3000 + Math.floor(rand() * 9000) }
    else plan[id] = { decision: 'ignore', delayMs: 0 }
  }
  return plan
}
