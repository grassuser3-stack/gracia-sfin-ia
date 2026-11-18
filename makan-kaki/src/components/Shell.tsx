import { createContext, useContext, useState, type ReactNode } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDemo, type Session } from '../demo/store'
import { LanguagePicker, useLang } from '../demo/i18n'
import { TOUR, readTourStep, writeTourStep } from '../demo/tour'
import { Logo } from './ui'

type Role = 'owner' | 'creator' | 'admin'
type Tab = { to: string; label: string; icon: ReactNode; end?: boolean }

const I = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  bell: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
  cal: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  money: <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /></>,
  more: <><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  users: <><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-4-5.6" /></>,
  link: <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />,
  flag: <path d="M4 22V4M4 4h13l-2 4 2 4H4" />,
}
const icon = (p: ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{p}</svg>
)

function useTabs(role: Role): Tab[] {
  const { t } = useLang()
  if (role === 'owner') return [
    { to: '/owner', label: t('Results'), icon: icon(I.chart), end: true },
    { to: '/owner/orders', label: t('Orders'), icon: icon(I.bell) },
    { to: '/owner/visits', label: t('Visits'), icon: icon(I.cal) },
    { to: '/owner/payouts', label: t('Payouts'), icon: icon(I.money) },
    { to: '/owner/more', label: t('More'), icon: icon(I.more) },
  ]
  if (role === 'creator') return [
    { to: '/creator', label: t('Offers'), icon: icon(I.search), end: true },
    { to: '/creator/visits', label: t('My visits'), icon: icon(I.list) },
    { to: '/creator/performance', label: t('Performance'), icon: icon(I.chart) },
    { to: '/creator/earnings', label: t('Earnings'), icon: icon(I.money) },
    { to: '/creator/profile', label: t('Profile'), icon: icon(I.user) },
  ]
  return [
    { to: '/admin', label: t('Home'), icon: icon(I.home), end: true },
    { to: '/admin/creators', label: 'Approvals', icon: icon(I.users) },
    { to: '/admin/matching', label: 'Matching', icon: icon(I.link) },
    { to: '/admin/payouts', label: t('Payouts'), icon: icon(I.money) },
    { to: '/admin/disputes', label: 'Disputes', icon: icon(I.flag) },
  ]
}

function WhatsAppInbox({ onClose }: { onClose: () => void }) {
  const { state } = useDemo()
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-brown/40 sm:items-center" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-[#ECE5DD] p-4 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">WhatsApp messages sent</h2>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm font-semibold underline">Close</button>
        </div>
        <p className="mb-3 text-xs text-brown-soft">Demo: these are the reminders and updates Makan Kaki would send by WhatsApp.</p>
        <div className="space-y-2">
          {state.messages.map((m) => (
            <div key={m.id} className="ml-auto max-w-[90%] rounded-xl rounded-tr-sm bg-[#DCF8C6] px-3 py-2 shadow-sm">
              <div className="text-xs font-bold text-ok">To {m.to}</div>
              <div className="text-sm">{m.text}</div>
              <div className="mt-1 text-right text-[10px] text-brown-soft">{new Date(m.at).toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} ✓✓</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TopBar({ right }: { right?: ReactNode }) {
  const [inbox, setInbox] = useState(false)
  const { state } = useDemo()
  return (
    <>
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-brown-line bg-cream/95 px-4 py-2.5 backdrop-blur">
        <NavLink to="/"><Logo small /></NavLink>
        <div className="flex items-center gap-2">
          <LanguagePicker compact />
          <button onClick={() => setInbox(true)} aria-label="WhatsApp messages" className="relative rounded-lg p-1.5">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-ok" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.8-1.1-4.6-4-4.8-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.6 2 1.1 1 2 1.3 2.3 1.4.3.2.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3z" /></svg>
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-bad px-1 text-[10px] font-bold text-white">{state.messages.length}</span>
          </button>
          {right}
        </div>
      </header>
      {inbox && <WhatsAppInbox onClose={() => setInbox(false)} />}
    </>
  )
}

function sessionMatches(s: Session, role: Role) {
  return s?.role === role
}

/** Logged-in layout for one role: checks the demo session, shows header and bottom tabs. */
export function RoleShell({ role }: { role: Role }) {
  const { session, setSession } = useDemo()
  const { t } = useLang()
  const navigate = useNavigate()
  const location = useLocation()
  const tabs = useTabs(role)
  if (!sessionMatches(session, role)) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col">
      <TopBar right={
        <button onClick={() => { setSession(null); navigate('/login') }} className="whitespace-nowrap rounded-lg px-1 text-xs font-semibold text-brown-soft underline underline-offset-2">{t('Log out')}</button>
      } />
      <main className="flex-1 px-4 pb-40 pt-5"><Outlet /></main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-brown-line bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-xl">
          {tabs.map((tb) => (
            <NavLink key={tb.to} to={tb.to} end={tb.end}
              className={({ isActive }) => `relative flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? 'text-brown' : 'text-brown-soft/70'}`}>
              {({ isActive }) => (
                <>
                  <span className={`absolute inset-x-3 top-0 h-1 rounded-b-full ${isActive ? 'bg-orange' : 'bg-transparent'}`} />
                  <span className={isActive ? 'text-orange' : ''}>{tb.icon}</span>
                  <span className="max-w-full truncate px-0.5">{tb.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

export function PublicShell() {
  return (
    <div className="mx-auto min-h-screen max-w-xl pb-40">
      <TopBar />
      <div className="px-4"><Outlet /></div>
    </div>
  )
}

// ---------- toasts ----------

export function Toasts() {
  const { toasts } = useDemo()
  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-50 mx-auto flex max-w-xl flex-col gap-2 px-4">
      {toasts.map((t) => (
        <div key={t.id} role="status"
          className={`pointer-events-auto rounded-2xl px-4 py-3 shadow-card ${t.kind === 'order' ? 'animate-pulse bg-bad text-white' : t.kind === 'whatsapp' ? 'bg-[#DCF8C6] text-brown' : 'bg-ok text-white'}`}>
          <div className="text-sm font-bold">{t.kind === 'whatsapp' ? '💬 ' : t.kind === 'order' ? '🔔 ' : '✓ '}{t.title}</div>
          <div className="text-sm">{t.text}</div>
        </div>
      ))}
    </div>
  )
}

// ---------- guided tour ----------

const TourContext = createContext<{ step: number | null; go: (n: number | null) => void } | null>(null)

export function TourProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<number | null>(readTourStep)
  const { setSession } = useDemo()
  const navigate = useNavigate()
  const go = (n: number | null) => {
    writeTourStep(n); setStep(n)
    if (!n) return
    const s = TOUR[n - 1]
    if (s.session !== 'keep') setSession(s.session)
    navigate(s.path)
  }
  return <TourContext.Provider value={{ step, go }}>{children}</TourContext.Provider>
}

export function useTour() {
  const c = useContext(TourContext)
  if (!c) throw new Error('useTour outside TourProvider')
  return c
}

const whoColor: Record<string, string> = { 'Business owner': 'bg-orange', 'Makan Kaki': 'bg-brown', Creator: 'bg-ok', Diner: 'bg-[#2563EB]' }

export function TourBar() {
  const { step, go } = useTour()
  const { t } = useLang()
  if (!step) return null
  const s = TOUR[step - 1]
  return (
    <div className="fixed inset-x-0 bottom-[68px] z-30 mx-auto max-w-xl px-3">
      <div className="rounded-2xl bg-brown p-3 text-white shadow-card">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide opacity-80">
              <span className={`h-2 w-2 rounded-full ${whoColor[s.who]}`} /> {t('Demo tour')} · {step}/11 · {s.who}
            </div>
            <div className="truncate font-heading font-bold">{s.n}. {s.title} <span className="font-body text-sm font-normal opacity-80">· {s.detail}</span></div>
          </div>
          <button onClick={() => go(null)} aria-label="Close tour" className="shrink-0 rounded-lg px-2 py-1 text-lg leading-none opacity-80">×</button>
        </div>
        <div className="mt-2 flex gap-2">
          <button disabled={step === 1} onClick={() => go(step - 1)} className="min-h-[40px] flex-1 rounded-xl bg-white/15 text-sm font-bold disabled:opacity-40">← {t('Back')}</button>
          {step < 11
            ? <button onClick={() => go(step + 1)} className="min-h-[40px] flex-[2] rounded-xl bg-orange text-sm font-bold">Next: {TOUR[step].title} →</button>
            : <button onClick={() => go(null)} className="min-h-[40px] flex-[2] rounded-xl bg-ok text-sm font-bold">{t('Done')} ✓</button>}
        </div>
      </div>
    </div>
  )
}
