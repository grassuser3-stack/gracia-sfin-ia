import type { Session } from './store'

/** The 11-step end-to-end flow. Each step opens the right screen as the right person. */
export type TourStep = { n: number; who: 'Business owner' | 'Makan Kaki' | 'Creator' | 'Diner'; title: string; detail: string; session: Session | 'keep'; path: string }

export const TOUR: TourStep[] = [
  { n: 1, who: 'Business owner', title: 'Signs up', detail: 'Picks a plan and pays', session: null, path: '/signup/owner' },
  { n: 2, who: 'Business owner', title: 'Books a visit', detail: 'Dates and dishes', session: { role: 'owner', id: 'ahc' }, path: '/owner/visits/new' },
  { n: 3, who: 'Makan Kaki', title: 'Matches creator', detail: 'By language and cuisine', session: { role: 'admin', id: 'admin' }, path: '/admin/matching' },
  { n: 4, who: 'Creator', title: 'Accepts visit', detail: 'WhatsApp reminders', session: { role: 'creator', id: 'zelia' }, path: '/creator' },
  { n: 5, who: 'Creator', title: 'Checks in', detail: 'Scans QR, free meal', session: { role: 'creator', id: 'zelia' }, path: '/creator/visits/v3/checkin' },
  { n: 6, who: 'Creator', title: 'Posts video', detail: 'With code, within 48h', session: { role: 'creator', id: 'zelia' }, path: '/creator/visits/v3/post' },
  { n: 7, who: 'Diner', title: 'Scans and orders', detail: 'Enters creator code', session: 'keep', path: '/order/ahc?code=AA-ZELIA' },
  { n: 8, who: 'Diner', title: 'Pays by PayNow', detail: 'Through HitPay', session: 'keep', path: '/order/ahc?code=AA-ZELIA' },
  { n: 9, who: 'Business owner', title: 'Completes order', detail: 'New to Completed', session: { role: 'owner', id: 'ahc' }, path: '/owner/orders' },
  { n: 10, who: 'Business owner', title: 'Sees results', detail: 'Orders per video', session: { role: 'owner', id: 'ahc' }, path: '/owner' },
  { n: 11, who: 'Makan Kaki', title: 'Pays out', detail: 'Owner next working day, creator monthly', session: { role: 'admin', id: 'admin' }, path: '/admin/payouts' },
]

const KEY = 'mk-demo-tour'
export function readTourStep(): number | null {
  try { const v = sessionStorage.getItem(KEY); return v ? Number(v) : null } catch { return null }
}
export function writeTourStep(n: number | null) {
  try { n ? sessionStorage.setItem(KEY, String(n)) : sessionStorage.removeItem(KEY) } catch { /* blocked */ }
}
