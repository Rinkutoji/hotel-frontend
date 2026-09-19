import { Routes, Route } from 'react-router-dom'
import PublicLayout from '../layouts/PublicLayout'
import PublicOnlyRoute from './PublicOnlyRoute'
import ProtectedRoute from './ProtectedRoute'
import Home from '../pages/customer/Home'
import Rooms from '../pages/customer/Rooms'
import RoomDetails from '../pages/customer/RoomDetails'
import AvailabilitySearch from '../pages/customer/AvailabilitySearch'
import BookingCheckout from '../pages/customer/BookingCheckout'
import MyBookings from '../pages/customer/MyBookings'
import BookingDetail from '../pages/customer/BookingDetail'
import PaymentCreate from '../pages/customer/PaymentCreate'
import PaymentDetail from '../pages/customer/PaymentDetail'
import CustomerPaymentList from '../pages/customer/CustomerPaymentList'
import InvoiceList from '../pages/customer/InvoiceList'
import InvoiceDetail from '../pages/customer/InvoiceDetail'
import Login from '../pages/customer/Login'
import Register from '../pages/customer/Register'
import Profile from '../pages/customer/Profile'
import Forbidden from '../pages/Forbidden'
import NotFound from '../pages/NotFound'

export default function CustomerApp() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="rooms" element={<Rooms />} />
        <Route path="rooms/:id" element={<RoomDetails />} />
        <Route path="availability" element={<AvailabilitySearch />} />
        <Route
          path="book"
          element={
            <ProtectedRoute actor="customer">
              <BookingCheckout />
            </ProtectedRoute>
          }
        />
        <Route
          path="bookings"
          element={
            <ProtectedRoute actor="customer">
              <MyBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="bookings/:id"
          element={
            <ProtectedRoute actor="customer">
              <BookingDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments"
          element={
            <ProtectedRoute actor="customer">
              <CustomerPaymentList />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments/new/:bookingId"
          element={
            <ProtectedRoute actor="customer">
              <PaymentCreate />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments/:id"
          element={
            <ProtectedRoute actor="customer">
              <PaymentDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="invoices"
          element={
            <ProtectedRoute actor="customer">
              <InvoiceList />
            </ProtectedRoute>
          }
        />
        <Route
          path="invoices/:id"
          element={
            <ProtectedRoute actor="customer">
              <InvoiceDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="login"
          element={
            <PublicOnlyRoute actor="customer">
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="register"
          element={
            <PublicOnlyRoute actor="customer">
              <Register />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute actor="customer">
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="forbidden" element={<Forbidden />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}