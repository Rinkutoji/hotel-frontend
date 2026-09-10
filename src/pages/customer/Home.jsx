import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { publicRooms } from '../../api/roomApi'
import useApi from '../../hooks/useApi'
import RoomTypeCard from '../../components/customer/RoomTypeCard'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'

const FETCH_FEATURED = () => publicRooms.listRoomTypes({ per_page: 3, sort: 'name', direction: 'asc' })

export default function Home() {
  const { isAuthenticated, isCustomer, isStaff } = useAuth()

  const { data: featured, error, isLoading, refetch } = useApi(FETCH_FEATURED)

  if (isAuthenticated && isStaff) {
    return <Navigate to="/staff/dashboard" replace />
  }

  const featuredTypes = Array.isArray(featured) && featured.length > 0 ? featured : null

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="rounded-2xl bg-slate-900 px-6 py-16 text-center text-white sm:px-12">
        <p className="text-sm font-medium uppercase tracking-widest text-brand-400">Welcome to</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-5xl">GrandVista Hotel</h1>
        <p className="mx-auto mt-4 max-w-2xl text-slate-300">
          Discover rooms and suites crafted for comfortable stays. Explore our rooms, check
          availability for your dates, and experience hospitality that remembers you.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link to="/rooms" className="btn-primary">
            Browse Rooms
          </Link>
          <Link to="/availability" className="btn-outline bg-white/10 text-white hover:bg-white/20">
            Check Availability
          </Link>
        </div>
      </section>

      <section className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Featured rooms & suites</h2>
            <p className="mt-1 text-sm text-slate-500">A selection of what we have to offer.</p>
          </div>
          <Link to="/rooms" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View all rooms →
          </Link>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="py-8">
              <LoadingState label="Loading featured rooms…" />
            </div>
          ) : error ? (
            <ErrorState
              error={error}
              fallback="We couldn't load the featured rooms right now."
              onRetry={refetch}
            />
          ) : featuredTypes ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredTypes.map((roomType) => (
                <RoomTypeCard key={roomType.id} roomType={roomType} />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-14 grid gap-6 sm:grid-cols-3">
        {[
          { title: 'Browse Rooms', body: 'Explore our rooms and suites with transparent nightly pricing.' },
          { title: 'Check Availability', body: 'See which rooms are free for the dates that suit you.' },
          { title: 'Your Account', body: 'Keep your details up to date and track everything in your profile.' },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-800">{f.title}</h2>
            <p className="mt-2 text-sm text-slate-500">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-14 rounded-2xl bg-brand-600 px-6 py-12 text-center text-white">
        <h2 className="text-2xl font-bold">Looking for the perfect stay?</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-brand-100">
          Browse our rooms and check availability for your travel dates.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {isAuthenticated && isCustomer ? (
            <Link to="/rooms" className="btn bg-white text-brand-700 hover:bg-slate-100">
              Browse Rooms
            </Link>
          ) : (
            <>
              <Link to="/availability" className="btn bg-white text-brand-700 hover:bg-slate-100">
                Check Availability
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  )
}