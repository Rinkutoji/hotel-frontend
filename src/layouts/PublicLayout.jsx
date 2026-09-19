import { Outlet } from 'react-router-dom'
import Navbar from '../components/customer/Navbar'
import Footer from '../components/customer/Footer'
import SkipLink from '../components/common/SkipLink'

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col dark:bg-slate-950">
      <SkipLink />
      <Navbar />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}