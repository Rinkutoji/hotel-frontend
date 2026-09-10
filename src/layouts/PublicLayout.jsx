import { Outlet } from 'react-router-dom'
import Navbar from '../components/customer/Navbar'
import Footer from '../components/customer/Footer'

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}