// Sample data for the Makan Kaki click-through demo. Nothing here is real or
// saved to a server: it lives in the viewer's browser and resets on demand.

export type Lang = 'en' | 'zh' | 'ms' | 'ta'
export type PlanId = 'hawker' | 'cafe'

export const PLANS: Record<PlanId, { label: string; fee: number; visits: number }> = {
  hawker: { label: 'Hawker', fee: 99, visits: 2 },
  cafe: { label: 'Café', fee: 299, visits: 5 },
}
export const COMMISSION = 0.1 // on coded orders only
export const CREATOR_SHARE = 0.2 // of the commission
export const VISIT_FEE = 30 // paid to the creator per completed visit
export const PILOT_DISCOUNT = 0.5 // first paid month

export type Outlet = {
  id: string; name: string; type: PlanId; area: string; address: string; unit: string; cuisine: string
  hours: string; uen: string; plan: PlanId; paynow: string; paused: boolean; qrRequested: boolean
  launchPack: boolean; visitsUsed: number; rollover: number; ownerName: string; mobile: string
}
export type Dish = {
  id: string; outletId: string; name: string; desc: string; price: number; emoji: string
  signature: boolean; soldOut: boolean
}
export type Platform = 'TikTok' | 'Instagram' | 'Lemon8' | 'Xiaohongshu'
export type Creator = {
  id: string; name: string; handle: string; platform: Platform; followers: number; languages: string[]
  cuisines: string[]; status: 'pending' | 'approved' | 'rejected' | 'paused'; code: string; paynow: string
  rating: number; strikes: number; area: string; samplePosts: string[]; engagement: number
}
export type VisitStatus = 'requested' | 'offered' | 'accepted' | 'checked_in' | 'posted' | 'verified' | 'cancelled' | 'no_show'
export type Visit = {
  id: string; outletId: string; creatorId: string | null; date: string; time: string; status: VisitStatus
  dishes: string[]; dos: string; donts: string; languagesWanted: string[]
  postUrl?: string; postedAt?: string; checkedInAt?: string; views: number; ownerRating?: number
  checks?: { link: boolean; code: boolean; label: boolean }
}
export type OrderStatus = 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'refunded'
export type Order = {
  id: string; number: number; outletId: string; code: string | null; creatorId: string | null
  items: { dishId: string; name: string; qty: number; price: number }[]; total: number
  mode: 'dine_in' | 'takeaway'; table: string; status: OrderStatus; createdAt: string; lang: Lang; phone: string
}
export type Staff = { id: string; outletId: string; name: string; mobile: string }
export type Payout = { id: string; to: 'owner' | 'creator'; targetId: string; amount: number; date: string; note: string; status: 'paid' | 'scheduled' }
export type Message = { id: string; to: string; text: string; at: string }
export type Dispute = { id: string; title: string; detail: string; status: 'open' | 'resolved'; party: string; at: string }

export type DemoState = {
  version: number
  outlets: Outlet[]
  dishes: Dish[]
  creators: Creator[]
  visits: Visit[]
  orders: Order[]
  staff: Staff[]
  payouts: Payout[]
  messages: Message[]
  disputes: Dispute[]
  nextOrderNumber: number
}

/** Date helpers relative to "today" in Singapore so the demo always looks current. */
export function sgToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore' }).format(new Date())
}
export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return t.toISOString().slice(0, 10)
}
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()

export const DEMO_VERSION = 1

export function seed(): DemoState {
  const today = sgToday()
  const outlets: Outlet[] = [
    {
      id: 'xnt', name: 'Xiao Nong Tian', type: 'hawker', area: 'Woodlands', address: 'Woodlands, Singapore (address to be confirmed)',
      unit: '#01-23', cuisine: 'Hawker food', hours: '7:00 am – 3:00 pm, closed Mon', uen: '', plan: 'hawker', paynow: '9123 4567',
      paused: false, qrRequested: true, launchPack: false, visitsUsed: 2, rollover: 0, ownerName: 'Xiao Nong Tian Owner', mobile: '9123 4567',
    },
    {
      id: 'ahc', name: 'All Hands Café', type: 'cafe', area: 'Woodlands', address: 'Woodlands, Singapore (address to be confirmed)',
      unit: '#01-05', cuisine: 'Café', hours: '8:00 am – 6:00 pm daily', uen: '202612345K', plan: 'cafe', paynow: '9876 5432',
      paused: false, qrRequested: false, launchPack: true, visitsUsed: 1, rollover: 1, ownerName: 'All Hands Café Owner', mobile: '9876 5432',
    },
    {
      id: 'wmp', name: 'Whampoa Prawn Noodles', type: 'hawker', area: 'Whampoa', address: '90 Whampoa Drive, Whampoa Makan Place', unit: '#01-32',
      cuisine: 'Prawn noodles', hours: '6:30 am – 1:30 pm', uen: '', plan: 'hawker', paynow: '9001 2233', paused: false, qrRequested: true,
      launchPack: true, visitsUsed: 0, rollover: 0, ownerName: 'Mdm Lee', mobile: '9001 2233',
    },
    {
      id: 'brk', name: 'Balestier Roti Kaki', type: 'hawker', area: 'Whampoa', address: '91 Whampoa Drive', unit: '#01-08', cuisine: 'Prata and roti',
      hours: '6:00 am – 12:00 pm', uen: '', plan: 'hawker', paynow: '9002 3344', paused: false, qrRequested: true, launchPack: false,
      visitsUsed: 1, rollover: 0, ownerName: 'Encik Rahman', mobile: '9002 3344',
    },
  ]
  const d = (outletId: string, id: string, name: string, desc: string, price: number, emoji: string, signature = false): Dish =>
    ({ id, outletId, name, desc, price, emoji, signature, soldOut: false })
  const dishes: Dish[] = [
    d('xnt', 'xnt1', 'Signature Fried Rice', 'Wok-fried with egg and spring onion', 6.5, '🍳', true),
    d('xnt', 'xnt2', 'Braised Pork Rice', 'Slow-braised pork belly, egg, pickles', 6.0, '🍚', true),
    d('xnt', 'xnt3', 'Fishball Noodles (Dry)', 'Handmade fishballs, chilli', 5.0, '🍜'),
    d('xnt', 'xnt4', 'Herbal Soup', 'Changes daily', 4.5, '🍲'),
    d('xnt', 'xnt5', 'Kopi O', 'Traditional black coffee', 1.6, '☕'),
    d('xnt', 'xnt6', 'Barley Drink', 'Cold, lightly sweet', 1.8, '🥤'),
    d('ahc', 'ahc1', 'Kaya Butter Toast Set', 'Toast, 2 soft-boiled eggs, kopi', 6.8, '🍞', true),
    d('ahc', 'ahc2', 'Pandan Pancakes', 'Gula melaka syrup, coconut cream', 12.5, '🥞', true),
    d('ahc', 'ahc3', 'Nasi Lemak Bowl', 'Chicken wing, sambal, egg', 13.0, '🍛'),
    d('ahc', 'ahc4', 'Iced Teh Tarik Latte', 'House blend', 6.0, '🧋'),
    d('ahc', 'ahc5', 'Ondeh Ondeh Cake', 'Slice', 7.5, '🍰'),
    d('wmp', 'wmp1', 'Prawn Noodle Soup', 'Pork rib and prawn broth', 6.0, '🦐', true),
    d('wmp', 'wmp2', 'Big Prawn Mee (Dry)', 'Large prawns, chilli', 10.0, '🍜'),
    d('brk', 'brk1', 'Egg Prata', 'With fish curry', 2.2, '🫓', true),
    d('brk', 'brk2', 'Mutton Murtabak', 'Medium', 8.0, '🥙'),
  ]
  const creators: Creator[] = [
    {
      id: 'zelia', name: 'Zelia', handle: '@foodieboonie', platform: 'Instagram', followers: 5000, languages: ['English', 'Mandarin'],
      cuisines: ['Hawker', 'Café', 'Desserts'], status: 'approved', code: 'AA-ZELIA', paynow: '8123 0000', rating: 4.8, strikes: 0,
      area: 'Woodlands', samplePosts: ['https://www.instagram.com/p/DGu-ZFMBo0r/'], engagement: 6.2,
    },
    {
      id: 'priya', name: 'Priya Nair', handle: '@priyamakan', platform: 'TikTok', followers: 8900, languages: ['English', 'Tamil'],
      cuisines: ['Indian', 'Hawker'], status: 'approved', code: 'AA-PRIYA', paynow: '8222 1111', rating: 4.5, strikes: 1,
      area: 'Tampines', samplePosts: ['https://www.tiktok.com/@priyamakan'], engagement: 4.9,
    },
    {
      id: 'wei', name: 'Chen Wei', handle: '@weiweifoodie', platform: 'Xiaohongshu', followers: 1500, languages: ['Mandarin'],
      cuisines: ['Noodles', 'Café'], status: 'pending', code: 'AA-WEI', paynow: '', rating: 0, strikes: 0,
      area: 'Toa Payoh', samplePosts: ['https://www.xiaohongshu.com/'], engagement: 7.1,
    },
    {
      id: 'aisyah', name: 'Nur Aisyah', handle: '@makanwithaisyah', platform: 'Lemon8', followers: 3200, languages: ['English', 'Malay'],
      cuisines: ['Malay', 'Prata'], status: 'pending', code: 'AA-AISYAH', paynow: '', rating: 0, strikes: 0,
      area: 'Bedok', samplePosts: ['https://www.lemon8-app.com/'], engagement: 5.4,
    },
  ]
  const visits: Visit[] = [
    {
      id: 'v1', outletId: 'xnt', creatorId: 'zelia', date: addDays(today, -6), time: '11:00', status: 'verified',
      dishes: ['xnt1', 'xnt2'], dos: 'Show the wok hei', donts: 'No filming of the kitchen staff faces', languagesWanted: ['English', 'Mandarin'],
      postUrl: 'https://www.instagram.com/p/DGu-ZFMBo0r/', postedAt: hoursAgo(6 * 24 - 20), checkedInAt: hoursAgo(6 * 24),
      views: 18400, ownerRating: 5, checks: { link: true, code: true, label: true },
    },
    {
      id: 'v2', outletId: 'xnt', creatorId: 'priya', date: addDays(today, -1), time: '12:30', status: 'checked_in',
      dishes: ['xnt3'], dos: 'Mention we open at 7am', donts: '', languagesWanted: ['English', 'Tamil'],
      checkedInAt: hoursAgo(26), views: 0,
    },
    {
      id: 'v3', outletId: 'ahc', creatorId: 'zelia', date: addDays(today, 2), time: '09:00', status: 'accepted',
      dishes: ['ahc2', 'ahc1'], dos: 'Natural light by the window seats', donts: 'Please do not show other customers', languagesWanted: ['English'], views: 0,
    },
    {
      id: 'v4', outletId: 'ahc', creatorId: null, date: addDays(today, 5), time: '15:00', status: 'requested',
      dishes: ['ahc5'], dos: 'Afternoon tea vibe', donts: '', languagesWanted: ['English', 'Malay'], views: 0,
    },
    {
      id: 'v5', outletId: 'wmp', creatorId: null, date: addDays(today, 3), time: '08:00', status: 'offered',
      dishes: ['wmp1', 'wmp2'], dos: 'Close-up of the broth pour', donts: '', languagesWanted: ['Mandarin', 'English'], views: 0,
    },
    {
      id: 'v6', outletId: 'brk', creatorId: null, date: addDays(today, 4), time: '07:30', status: 'offered',
      dishes: ['brk1'], dos: 'Film the prata flip', donts: 'Avoid the queue area', languagesWanted: ['Malay', 'Tamil', 'English'], views: 0,
    },
    {
      id: 'v7', outletId: 'ahc', creatorId: 'priya', date: addDays(today, -12), time: '10:00', status: 'verified',
      dishes: ['ahc3'], dos: '', donts: '', languagesWanted: ['English'], postUrl: 'https://www.tiktok.com/@priyamakan/video/1',
      postedAt: hoursAgo(12 * 24 - 30), checkedInAt: hoursAgo(12 * 24), views: 9100, ownerRating: 4, checks: { link: true, code: true, label: true },
    },
  ]
  // Past orders so results, payouts and earnings have something to show.
  const orders: Order[] = []
  let n = 1001
  const mk = (outletId: string, code: string | null, creatorId: string | null, h: number, picks: [string, number][], status: OrderStatus = 'completed', mode: Order['mode'] = 'dine_in') => {
    const items = picks.map(([id, qty]) => { const x = dishes.find((q) => q.id === id)!; return { dishId: id, name: x.name, qty, price: x.price } })
    orders.push({
      id: `o${n}`, number: n++, outletId, code, creatorId, items, total: Math.round(items.reduce((s, i) => s + i.qty * i.price, 0) * 100) / 100,
      mode, table: mode === 'dine_in' ? String(((n * 7) % 24) + 1) : '', status, createdAt: hoursAgo(h), lang: 'en', phone: '',
    })
  }
  for (let i = 0; i < 22; i++) mk('xnt', 'AA-ZELIA', 'zelia', 6 * 24 - 2 - i * 5, [['xnt1', 1 + (i % 2)], [i % 3 ? 'xnt5' : 'xnt6', 1]])
  for (let i = 0; i < 6; i++) mk('xnt', null, null, 3 * 24 - i * 7, [['xnt3', 1], ['xnt5', 1]])
  for (let i = 0; i < 4; i++) mk('xnt', 'AA-PRIYA', 'priya', 20 - i * 4, [['xnt3', 1], ['xnt2', 1]])
  for (let i = 0; i < 9; i++) mk('ahc', 'AA-PRIYA', 'priya', 12 * 24 - 10 - i * 20, [['ahc3', 1], ['ahc4', 1]])
  for (let i = 0; i < 5; i++) mk('ahc', null, null, 2 * 24 - i * 6, [['ahc1', 1]])
  mk('xnt', 'AA-ZELIA', 'zelia', 0.3, [['xnt1', 2], ['xnt6', 2]], 'preparing')
  mk('xnt', null, null, 0.1, [['xnt4', 1]], 'new', 'takeaway')

  return {
    version: DEMO_VERSION,
    outlets, dishes, creators, visits, orders,
    staff: [{ id: 's1', outletId: 'xnt', name: 'Kumar', mobile: '9333 4444' }],
    payouts: [
      { id: 'p1', to: 'owner', targetId: 'xnt', amount: 187.43, date: addDays(today, -5), note: 'Coded orders minus 10%', status: 'paid' },
      { id: 'p2', to: 'owner', targetId: 'xnt', amount: 96.12, date: addDays(today, -2), note: 'Coded orders minus 10%', status: 'paid' },
      { id: 'p3', to: 'creator', targetId: 'zelia', amount: 41.2, date: addDays(today, -19), note: 'Last month: 1 visit + commission share', status: 'paid' },
    ],
    messages: [
      { id: 'm1', to: 'Zelia', text: 'Reminder: your visit to All Hands Café is in 2 days at 9:00 am. Your brief is in the app.', at: hoursAgo(2) },
      { id: 'm2', to: 'Xiao Nong Tian', text: 'Your October report is ready: 31 coded orders, S$312.40 sales, best creator @foodieboonie.', at: hoursAgo(30) },
    ],
    disputes: [
      { id: 'd1', title: 'Order #1012 refund', detail: 'Diner says fried rice was missing an egg. Owner refunded S$6.50.', status: 'resolved', party: 'Xiao Nong Tian', at: hoursAgo(50) },
      { id: 'd2', title: 'Late post', detail: '@priyamakan checked in at Xiao Nong Tian 26 hours ago and has not posted yet (48h limit).', status: 'open', party: '@priyamakan', at: hoursAgo(2) },
    ],
    nextOrderNumber: n,
  }
}
