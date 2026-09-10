import { Routes, Route } from 'react-router-dom'
import CustomerApp from './routes/CustomerApp'
import StaffApp from './routes/StaffApp'

export default function App() {
  return (
    <Routes>
      <Route path="/staff/*" element={<StaffApp />} />
      <Route path="/*" element={<CustomerApp />} />
    </Routes>
  )
}