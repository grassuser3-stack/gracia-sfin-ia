import type { ReactNode } from 'react'
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { homeFor, useAuth, type Role } from '../lib/auth'
import { Logo, Spinner } from './ui'

type Tab = { to: string; label: string; icon: ReactNode; end?: boolean }

const I = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  cal: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  code: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10v4M10 10v4M13 10v4M17 10v4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  users: <><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-4-5.6" /></>,
  shop: <path d="M3 9l2-5h14l2 5M3 9h18v11H3zM3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />,
  money: <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /></>,
}
const icon = (p: ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{p}</svg>
)

const TABS: Record<Role, Tab[]> = {
  owner: [
    { to: '/owner', label: 'Dashboard', icon: icon(I.home), end: true },
    { to: '/owner/slots', label: 'Visit slots', icon: icon(I.cal) },
    { to: '/owner/redeem', label: 'Redeem', icon: icon(I.code) },
    { to: '/owner/staff', label: 'Staff', icon: icon(I.users) },
  ],
  creator: [
    { to: '/creator', label: 'Find visits', icon: icon(I.search), end: true },
    { to: '/creator/bookings', label: 'My bookings', icon: icon(I.list) },
  ],
  staff: [],
  admin: [
    { to: '/admin', label: 'Home', icon: icon(I.home), end: true },
    { to: '/admin/creators', label: 'Creators', icon: icon(I.users) },
    { to: '/admin/outlets', label: 'Outlets', icon: icon(I.shop) },
    { to: '/admin/bookings', label: 'Bookings', icon: icon(I.list) },
    { to: '/admin/billing', label: 'Billing', icon: icon(I.money) },
  ],
}

/** Logged-in layout: guards the route by role, shows header + bottom tabs. */
export function RoleShell({ role }: { role: Role }) {
  const { loading, session, profile, signOut } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!profile) return <Spinner label="Setting up your account…" />
  if (profile.role !== role) return <Navigate to={homeFor(profile.role)} replace />

  const tabs = TABS[role]
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-brown-line bg-cream/95 px-4 py-3 backdrop-blur">
        <Logo small />
        <button onClick={signOut} className="rounded-lg px-2 py-1 text-sm font-semibold text-brown-soft underline underline-offset-2">
          Log out
        </button>
      </header>
      <main className={`flex-1 px-4 pt-5 ${tabs.length ? 'pb-28' : 'pb-10'}`}>
        <Outlet />
      </main>
      {tabs.length > 0 && (
        <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-brown-line bg-white pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto flex max-w-xl">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? 'text-brown' : 'text-brown-soft/70'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`absolute inset-x-4 top-0 h-1 rounded-b-full ${isActive ? 'bg-orange' : 'bg-transparent'}`} />
                    <span className={isActive ? 'text-orange' : ''}>{t.icon}</span>
                    {t.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}

/** Public layout used for landing, sign-up and login. Logged-in users go to their home. */
export function PublicShell({ redirectIfLoggedIn = true }: { redirectIfLoggedIn?: boolean }) {
  const { loading, session, profile } = useAuth()
  if (loading) return <Spinner />
  if (redirectIfLoggedIn && session && profile) return <Navigate to={homeFor(profile.role)} replace />
  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 pb-12">
      <Outlet />
    </div>
  )
}
