import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Works both at the site root and under a sub-path such as /gracia-sfin-ia/. */
export const LOGO_URL = `${import.meta.env.BASE_URL}logo.png`

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      <img src={LOGO_URL} alt="" className={small ? 'h-8 w-8' : 'h-11 w-11'} />
      <span className={`whitespace-nowrap font-heading font-extrabold tracking-tight text-brown ${small ? 'hidden text-base min-[430px]:inline' : 'text-2xl'}`}>
        Makan Kaki
      </span>
    </span>
  )
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-brown-soft">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-soft border-t-orange" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function PageTitle({ title, subtitle, back }: { title: string; subtitle?: ReactNode; back?: string }) {
  return (
    <div className="mb-5">
      {back && (
        <Link to={back} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-brown-soft">
          <span aria-hidden>←</span> Back
        </Link>
      )}
      <h1 className="text-2xl font-bold leading-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-brown-soft">{subtitle}</p>}
    </div>
  )
}

export function Alert({ kind, children }: { kind: 'ok' | 'bad' | 'info'; children: ReactNode }) {
  const cls = {
    ok: 'bg-ok-soft text-ok border-ok/30',
    bad: 'bg-bad-soft text-bad border-bad/30',
    info: 'bg-orange-soft text-brown border-orange/30',
  }[kind]
  return <div role={kind === 'bad' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 font-semibold ${cls}`}>{children}</div>
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-brown-soft">{hint}</span>}
    </label>
  )
}

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="card">
      <div className="text-sm font-semibold text-brown-soft">{label}</div>
      <div className="mt-1 font-heading text-2xl font-bold">{value}</div>
      {note && <div className="mt-0.5 text-xs text-brown-soft">{note}</div>}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border-2 border-dashed border-brown-line px-4 py-8 text-center text-brown-soft">{children}</div>
}

const statusStyle: Record<string, string> = {
  booked: 'bg-orange-soft text-brown',
  completed: 'bg-ok-soft text-ok',
  missed: 'bg-bad-soft text-bad',
  cancelled: 'bg-brown-line text-brown-soft',
  refunded: 'bg-brown-line text-brown-soft',
  open: 'bg-ok-soft text-ok',
  pending: 'bg-orange-soft text-brown',
  approved: 'bg-ok-soft text-ok',
  rejected: 'bg-bad-soft text-bad',
  paused: 'bg-bad-soft text-bad',
  new: 'bg-bad text-white',
  preparing: 'bg-orange-soft text-brown',
  ready: 'bg-ok text-white',
  requested: 'bg-orange-soft text-brown',
  offered: 'bg-orange-soft text-brown',
  accepted: 'bg-ok-soft text-ok',
  checked_in: 'bg-ok-soft text-ok',
  posted: 'bg-ok-soft text-ok',
  verified: 'bg-ok text-white',
  no_show: 'bg-bad-soft text-bad',
  paid: 'bg-ok-soft text-ok',
  scheduled: 'bg-orange-soft text-brown',
  resolved: 'bg-ok-soft text-ok',
}

const statusLabel: Record<string, string> = {
  checked_in: 'checked in', no_show: 'no-show', requested: 'finding creator', offered: 'offered to creators',
  verified: 'post verified', new: 'new',
}

export function StatusChip({ status, label }: { status: string; label?: string }) {
  return <span className={`chip capitalize ${statusStyle[status] ?? 'bg-brown-line text-brown'}`}>{label ?? statusLabel[status] ?? status}</span>
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-8 w-14 shrink-0 rounded-full transition ${on ? 'bg-ok' : 'bg-brown-line'}`}>
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${on ? 'left-7' : 'left-1'}`} />
    </button>
  )
}

/** Small "this is simulated" marker so viewers know which parts are mock-ups. */
export function DemoNote({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-orange/50 bg-orange-soft/50 px-3 py-2 text-xs text-brown-soft"><span className="font-semibold text-brown">Demo:</span> {children}</p>
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const colors = ['#D96B27', '#4A7C59', '#3B2314', '#B85618', '#6B5446']
  const c = colors[[...name].reduce((s, ch) => s + ch.charCodeAt(0), 0) % colors.length]
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full font-heading font-bold text-white"
      style={{ width: size, height: size, background: c, fontSize: size * 0.42 }}>
      {name.replace(/^@/, '').charAt(0).toUpperCase()}
    </span>
  )
}

export function Stars({ value }: { value: number }) {
  return <span aria-label={`${value} out of 5`} className="text-orange">{'★'.repeat(Math.round(value))}<span className="text-brown-line">{'★'.repeat(5 - Math.round(value))}</span></span>
}
