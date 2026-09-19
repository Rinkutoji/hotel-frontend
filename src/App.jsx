import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import ErrorBoundary from './components/common/ErrorBoundary'
import LoadingState from './components/common/LoadingState'

const CustomerApp = lazy(() => import('./routes/CustomerApp'))
const StaffApp = lazy(() => import('./routes/StaffApp'))

function AppRoutes() {
  const location = useLocation()

  return (
    <ErrorBoundary key={location.pathname}>
      <Suspense
        fallback={<LoadingState fullScreen label="Loading…" />}
      >
        <Routes>
          <Route path="/staff/*" element={<StaffApp />} />
          <Route path="/*" element={<CustomerApp />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default function App() {
  return <AppRoutes />
}