import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router'
import { LoginScreen } from './auth/LoginScreen.tsx'
import { DashboardLayout } from './dashboard/DashboardLayout.tsx'
import { InventoryTab } from './dashboard/InventoryTab.tsx'

// The app's routes. /login is the login screen. The Dashboard frames every tab, each at its own path; "/" opens
// the last tab used (the Inventory tab the first time) and any unknown path goes back there.

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<DashboardLayout />}>
          <Route path="inventory" element={<InventoryTab />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

// Goes on to the Dashboard once the login is sent; the mocked check of the user and password comes with #63.
function LoginPage() {
  const navigate = useNavigate()
  return <LoginScreen onSubmit={() => navigate('/')} />
}
