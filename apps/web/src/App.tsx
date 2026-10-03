import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { DashboardLayout } from './dashboard/DashboardLayout.tsx'
import { InventoryTab } from './dashboard/InventoryTab.tsx'

// The app's routes. The Dashboard frames every tab, each at its own path; "/" opens the last tab used (the
// Inventory tab the first time) and any unknown path goes back there.

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route path="inventory" element={<InventoryTab />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
