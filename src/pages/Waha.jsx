import { Navigate, Route, Routes } from 'react-router-dom'
import WahaDashboard from '../features/waha/pages/WahaDashboard'
import WahaBroadcastPage from '../features/waha/pages/WahaBroadcastPage'

const Waha = () => {
  return (
    <Routes>
      <Route index element={<Navigate to="/waha/session" replace />} />
      <Route path="session" element={<WahaDashboard defaultTab="session" />} />
      <Route path="send" element={<WahaDashboard defaultTab="send" />} />
      <Route path="broadcast" element={<WahaBroadcastPage />} />
      <Route path="notifications" element={<WahaDashboard defaultTab="notifications" />} />
      <Route path="*" element={<Navigate to="/waha/session" replace />} />
    </Routes>
  )
}

export default Waha
