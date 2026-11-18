// Shared demo state. Saved in this browser (localStorage) and synced live across
// tabs, so an order placed in the diner checkout pops up in the owner's Live orders.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { COMMISSION, CREATOR_SHARE, DEMO_VERSION, VISIT_FEE, seed, type Creator, type DemoState, type Order, type Outlet } from './data'

const KEY = 'mk-demo-state'
const SESSION_KEY = 'mk-demo-session'

export type Session = { role: 'owner'; id: string } | { role: 'creator'; id: string } | { role: 'admin'; id: 'admin' } | null

function load(): DemoState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as DemoState | null
    if (s && s.version === DEMO_VERSION) return s
  } catch { /* storage blocked or bad data */ }
  return seed()
}
function save(s: DemoState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* storage blocked */ }
}
function readSession(): Session {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') } catch { return null }
}

type Toast = { id: number; kind: 'whatsapp' | 'ok' | 'order'; title: string; text: string }

type Ctx = {
  state: DemoState
  update: (fn: (s: DemoState) => void) => void
  session: Session
  setSession: (s: Session) => void
  reset: () => void
  toasts: Toast[]
  toast: (t: Omit<Toast, 'id'>) => void
  /** Logs a simulated WhatsApp message and shows it as a toast. */
  whatsapp: (to: string, text: string) => void
}

const DemoContext = createContext<Ctx | null>(null)

/** Short, loud-ish two-tone alert for new orders (Web Audio, no files needed). */
export function playOrderAlert() {
  try {
    const ac = new AudioContext()
    ;[0, 0.22, 0.44].forEach((t, i) => {
      const o = ac.createOscillator(); const g = ac.createGain()
      o.frequency.value = i % 2 ? 660 : 990
      g.gain.setValueAtTime(0.25, ac.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t + 0.2)
      o.connect(g).connect(ac.destination); o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.2)
    })
  } catch { /* audio blocked until the user interacts */ }
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(load)
  const [session, setSessionState] = useState<Session>(readSession)
  const [toasts, setToasts] = useState<Toast[]>([])
  const lastOrderCount = useRef(state.orders.length)

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random()
    setToasts((p) => [...p.slice(-2), { ...t, id }])
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 5000)
  }, [])

  const update = useCallback((fn: (s: DemoState) => void) => {
    setState((prev) => {
      const next = structuredClone(prev)
      fn(next)
      save(next)
      return next
    })
  }, [])

  const whatsapp = useCallback((to: string, text: string) => {
    update((s) => { s.messages.unshift({ id: `m${Date.now()}`, to, text, at: new Date().toISOString() }) })
    toast({ kind: 'whatsapp', title: `WhatsApp to ${to}`, text })
  }, [toast, update])

  // Other tabs changed the data: pick it up. Alert owners about new orders.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return
      const next = load()
      setState(next)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    const count = state.orders.length
    if (count > lastOrderCount.current && session?.role === 'owner') {
      const newest = state.orders[state.orders.length - 1]
      if (newest.outletId === session.id) {
        playOrderAlert()
        toast({ kind: 'order', title: `New order #${newest.number}`, text: `${newest.code ? `Code ${newest.code} · ` : ''}S$${newest.total.toFixed(2)}` })
      }
    }
    lastOrderCount.current = count
  }, [state.orders, session, toast])

  const setSession = (s: Session) => {
    try { s ? sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)) : sessionStorage.removeItem(SESSION_KEY) } catch { /* blocked */ }
    setSessionState(s)
  }
  const reset = () => { const s = seed(); save(s); setState(s); lastOrderCount.current = s.orders.length }

  return (
    <DemoContext.Provider value={{ state, update, session, setSession, reset, toasts, toast, whatsapp }}>
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  const c = useContext(DemoContext)
  if (!c) throw new Error('useDemo outside DemoProvider')
  return c
}

// ---------- money and results maths (shared by every screen) ----------

export const r2 = (n: number) => Math.round(n * 100) / 100
const counted = (o: Order) => o.status !== 'cancelled' && o.status !== 'refunded'

/** 10% commission, only on orders placed with a creator code. Refunds earn nothing. */
export const commissionOf = (o: Order) => (o.code && counted(o) ? r2(o.total * COMMISSION) : 0)
/** What the owner receives by PayNow for an order: value minus commission. */
export const ownerNetOf = (o: Order) => (counted(o) ? r2(o.total - commissionOf(o)) : 0)

export function outletStats(s: DemoState, outlet: Outlet) {
  const orders = s.orders.filter((o) => o.outletId === outlet.id && counted(o))
  const coded = orders.filter((o) => o.code)
  const sales = r2(coded.reduce((t, o) => t + o.total, 0))
  const commission = r2(coded.reduce((t, o) => t + commissionOf(o), 0))
  const planFee = outlet.plan === 'hawker' ? 99 : 299
  const dishCount = new Map<string, number>()
  coded.forEach((o) => o.items.forEach((i) => dishCount.set(i.name, (dishCount.get(i.name) ?? 0) + i.qty)))
  const bestDish = [...dishCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
  const perVideo = s.visits
    .filter((v) => v.outletId === outlet.id && v.creatorId && ['posted', 'verified', 'checked_in'].includes(v.status))
    .map((v) => {
      const c = s.creators.find((x) => x.id === v.creatorId)!
      const vo = coded.filter((o) => o.creatorId === v.creatorId)
      return { visit: v, creator: c, orders: vo.length, sales: r2(vo.reduce((t, o) => t + o.total, 0)), views: v.views }
    })
    .sort((a, b) => b.sales - a.sales)
  return {
    orders, coded, sales, commission, planFee,
    costPerNewDiner: coded.length ? r2((planFee + commission) / coded.length) : null,
    views: perVideo.reduce((t, v) => t + v.views, 0),
    bestCreator: perVideo[0]?.creator ?? null,
    bestDish, perVideo,
    netToOwner: r2(orders.reduce((t, o) => t + ownerNetOf(o), 0)),
  }
}

export function creatorStats(s: DemoState, creator: Creator) {
  const orders = s.orders.filter((o) => o.creatorId === creator.id && counted(o))
  const visitsDone = s.visits.filter((v) => v.creatorId === creator.id && v.status === 'verified')
  const commission = r2(orders.reduce((t, o) => t + commissionOf(o), 0))
  const share = r2(commission * CREATOR_SHARE)
  const visitFees = visitsDone.length * VISIT_FEE
  const perVideo = s.visits
    .filter((v) => v.creatorId === creator.id && ['posted', 'verified'].includes(v.status))
    .map((v) => {
      const outlet = s.outlets.find((o) => o.id === v.outletId)!
      const vo = orders.filter((o) => o.outletId === v.outletId)
      return { visit: v, outlet, orders: vo.length, sales: r2(vo.reduce((t, o) => t + o.total, 0)), share: r2(vo.reduce((t, o) => t + commissionOf(o), 0) * CREATOR_SHARE) }
    })
    .sort((a, b) => b.sales - a.sales)
  return { orders, visitsDone, commission, share, visitFees, total: r2(share + visitFees), perVideo, views: perVideo.reduce((t, v) => t + v.visit.views, 0) }
}

export function sgd(n: number) { return 'S$' + n.toFixed(2) }
