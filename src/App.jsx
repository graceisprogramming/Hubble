import { Navigate, Route, Routes } from 'react-router-dom'
import { useStore } from './lib/store'
import { DetailPlaceholder, MainLayout, SplitLayout } from './components/ui'
import { Onboarding, Safety, Welcome } from './pages/Onboarding'
import Shake, { MatchSuccess } from './pages/Shake'
import { ActivityDetail, ActivityList, CreateActivity, OfficialDetail } from './pages/Activities'
import { GuidePage, GuidePortal } from './pages/Guide'
import { ChatList, ChatRoom } from './pages/Chats'
import { Me, Report } from './pages/Me'
import Admin from './pages/Admin'

function Home() {
  const { state } = useStore()
  return <Navigate to={state.onboarded ? '/shake' : '/welcome'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/safety" element={<Safety />} />
      <Route path="/guide-portal" element={<GuidePortal />} />
      <Route path="/admin" element={<Admin />} />
      <Route element={<MainLayout />}>
        <Route path="/shake" element={<Shake />} />
        <Route path="/match/:id" element={<MatchSuccess />} />
        <Route path="/activities" element={<SplitLayout base="/activities" list={<ActivityList />} />}>
          <Route index element={<DetailPlaceholder text="選一個活動，在這裡看詳情" />} />
          <Route path="new" element={<CreateActivity />} />
          <Route path="official/:eid" element={<OfficialDetail />} />
          <Route path=":id" element={<ActivityDetail />} />
          <Route path=":id/guide" element={<GuidePage />} />
        </Route>
        <Route path="/chats" element={<SplitLayout base="/chats" list={<ChatList />} />}>
          <Route index element={<DetailPlaceholder text="選一個對話，在這裡聊天" />} />
          <Route path=":id" element={<ChatRoom />} />
        </Route>
        <Route path="/me" element={<Me />} />
        <Route path="/report/:userId" element={<Report />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
