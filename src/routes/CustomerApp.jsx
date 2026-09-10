import { Routes, Route } from 'react-router-dom'
import PublicLayout from '../layouts/PublicLayout'
import PublicOnlyRoute from './PublicOnlyRoute'
import ProtectedRoute from './ProtectedRoute'
import Home from '../pages/customer/Home'
import Rooms from '../pages/customer/Rooms'
import RoomDetails from '../pages/customer/RoomDetails'
import AvailabilitySearch from '../pages/customer/AvailabilitySearch'
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