import { Routes, Route } from 'react-router-dom'
import StaffLayout from '../layouts/StaffLayout'
import PublicOnlyRoute from './PublicOnlyRoute'
import ProtectedRoute from './ProtectedRoute'
import StaffLogin from '../pages/staff/Login'
import StaffDashboard from '../pages/staff/Dashboard'
import ComingSoon from '../pages/ComingSoon'
import NotFound from '../pages/NotFound'

function StaffModule({ title }) {
  return <ComingSoon title={title} />
}

export default function StaffApp() {
  return (
    <Routes>
      <Route element={<StaffLayout />}>
        <Route
          index
          element={
            <ProtectedRoute actor="staff">
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute actor="staff">
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="bookings"
          element={
            <ProtectedRoute actor="staff">
              <StaffModule title="Bookings" />
            </ProtectedRoute>
          }
        />
        <Route
          path="rooms"
          element={
            <ProtectedRoute actor="staff">
              <StaffModule title="Rooms" />
            </ProtectedRoute>
          }
        />
        <Route
          path="room-types"
          element={
            <ProtectedRoute actor="staff">
              <StaffModule title="Room Types" />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments"
          element={
            <ProtectedRoute actor="staff">
              <StaffModule title="Payments" />
            </ProtectedRoute>
          }
        />
        <Route
          path="invoices"
          element={
            <ProtectedRoute actor="staff">
              <StaffModule title="Invoices" />
            </ProtectedRoute>
          }
        />
        <Route
          path="discounts"
          element={
            <ProtectedRoute actor="staff" roles={['admin', 'manager']}>
              <StaffModule title="Discounts" />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route
        path="login"
        element={
          <PublicOnlyRoute actor="staff">
            <StaffLogin />
          </PublicOnlyRoute>
        }
      />
    </Routes>
  )
}