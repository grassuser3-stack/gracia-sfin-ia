export const HDB_TOWNS = [
  'Ang Mo Kio', 'Bedok', 'Bishan', 'Bukit Batok', 'Bukit Merah', 'Bukit Panjang', 'Bukit Timah',
  'Central Area', 'Choa Chu Kang', 'Clementi', 'Geylang', 'Hougang', 'Jurong East', 'Jurong West',
  'Kallang/Whampoa', 'Marine Parade', 'Pasir Ris', 'Punggol', 'Queenstown', 'Sembawang', 'Sengkang',
  'Serangoon', 'Tampines', 'Tengah', 'Toa Payoh', 'Woodlands', 'Yishun',
]

export const PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'Xiaohongshu', 'Other']
export const LANGUAGES = ['English', 'Mandarin', 'Malay', 'Tamil', 'Hokkien', 'Cantonese', 'Other']

export const PLANS = {
  hawker: { label: 'Hawker', fee: 99, visits: 2 },
  cafe: { label: 'Café', fee: 299, visits: 5 },
} as const
export type Plan = keyof typeof PLANS

const TZ = 'Asia/Singapore'

/** Today's date in Singapore as YYYY-MM-DD. */
export function sgToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

/** "2026-11" for the current Singapore month. */
export function sgMonth(): string {
  return sgToday().slice(0, 7)
}

function dateFromYmd(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 4)) // noon-ish SGT, avoids day shifts
}

export function fmtDate(ymd: string) {
  return new Intl.DateTimeFormat('en-SG', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' }).format(dateFromYmd(ymd))
}

export function fmtDateLong(ymd: string) {
  return new Intl.DateTimeFormat('en-SG', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(dateFromYmd(ymd))
}

export function fmtTime(hms: string) {
  const [h, m] = hms.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

export function fmtMonth(ym: string) {
  return new Intl.DateTimeFormat('en-SG', { timeZone: TZ, month: 'long', year: 'numeric' }).format(dateFromYmd(ym + '-01'))
}

export function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-SG', { timeZone: TZ, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

export function sgd(n: number) {
  return 'S$' + n.toFixed(2)
}

/** Outlets pay 10% of each redeemed diner's bill; creators get a fifth of that (2%). */
export const COMMISSION_RATE = 0.1
export const CREATOR_RATE = 0.02

export const round2 = (n: number) => Math.round(n * 100) / 100

/** (plan fee + 10% of diners' bills) ÷ redemptions, or null when there are none. */
export function costPerDiner(plan: Plan, redemptions: number, spend: number): number | null {
  if (redemptions <= 0) return null
  return (PLANS[plan].fee + round2(spend * COMMISSION_RATE)) / redemptions
}

export function daysBetween(fromYmd: string, toYmd: string) {
  return Math.round((dateFromYmd(toYmd).getTime() - dateFromYmd(fromYmd).getTime()) / 86400000)
}
