import { Routes, Route } from 'react-router-dom'
import StaffLayout from '../layouts/StaffLayout'
import PublicOnlyRoute from './PublicOnlyRoute'
import ProtectedRoute from './ProtectedRoute'
import StaffLogin from '../pages/staff/Login'
import StaffDashboard from '../pages/staff/Dashboard'
import StaffBookingList from '../pages/staff/BookingList'
import StaffBookingDetail from '../pages/staff/BookingDetail'
import StaffPaymentList from '../pages/staff/PaymentList'
import StaffPaymentDetail from '../pages/staff/PaymentDetail'
import StaffRooms from '../pages/staff/Rooms'
import StaffRoomForm from '../pages/staff/RoomForm'
import StaffRoomTypes from '../pages/staff/RoomTypes'
import StaffRoomTypeForm from '../pages/staff/RoomTypeForm'
import StaffRoomTypeImages from '../pages/staff/RoomTypeImages'
import StaffInvoiceList from '../pages/staff/InvoiceList'
import StaffInvoiceDetail from '../pages/staff/InvoiceDetail'
import StaffDiscountList from '../pages/staff/DiscountList'
import StaffDiscountForm from '../pages/staff/DiscountForm'
import NotFound from '../pages/NotFound'

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
              <StaffBookingList />
            </ProtectedRoute>
          }
        />
        <Route
          path="bookings/:id"
          element={
            <ProtectedRoute actor="staff">
              <StaffBookingDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="rooms"
          element={
            <ProtectedRoute actor="staff">
              <StaffRooms />
            </ProtectedRoute>
          }
        />
        <Route
          path="rooms/new"
          element={
            <ProtectedRoute actor="staff" roles={['admin', 'manager']}>
              <StaffRoomForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="rooms/:id/edit"
          element={
            <ProtectedRoute actor="staff" roles={['admin', 'manager']}>
              <StaffRoomForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="room-types"
          element={
            <ProtectedRoute actor="staff">
              <StaffRoomTypes />
            </ProtectedRoute>
          }
        />
        <Route
          path="room-types/new"
          element={
            <ProtectedRoute actor="staff" roles={['admin', 'manager']}>
              <StaffRoomTypeForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="room-types/:id/edit"
          element={
            <ProtectedRoute actor="staff" roles={['admin', 'manager']}>
              <StaffRoomTypeForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="room-types/:id/images"
          element={
            <ProtectedRoute actor="staff" roles={['admin', 'manager']}>
              <StaffRoomTypeImages />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments"
          element={
            <ProtectedRoute actor="staff">
              <StaffPaymentList />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments/:id"
          element={
            <ProtectedRoute actor="staff">
              <StaffPaymentDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="invoices"
          element={
            <ProtectedRoute actor="staff">
              <StaffInvoiceList />
            </ProtectedRoute>
          }
        />
        <Route
          path="invoices/:id"
          element={
            <ProtectedRoute actor="staff">
              <StaffInvoiceDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="discounts"
          element={
            <ProtectedRoute actor="staff" roles={['admin', 'manager']}>
              <StaffDiscountList />
            </ProtectedRoute>
          }
        />
        <Route
          path="discounts/new"
          element={
            <ProtectedRoute actor="staff" roles={['admin', 'manager']}>
              <StaffDiscountForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="discounts/:id/edit"
          element={
            <ProtectedRoute actor="staff" roles={['admin', 'manager']}>
              <StaffDiscountForm />
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