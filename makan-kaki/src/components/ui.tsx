import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Works both at the site root and under a sub-path such as /gracia-sfin-ia/. */
export const LOGO_URL = `${import.meta.env.BASE_URL}logo.png`

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <img src={LOGO_URL} alt="" className={small ? 'h-9 w-9' : 'h-11 w-11'} />
      <span className={`font-heading font-extrabold tracking-tight text-brown ${small ? 'text-lg' : 'text-2xl'}`}>
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
  open: 'bg-ok-soft text-ok',
  pending: 'bg-orange-soft text-brown',
  approved: 'bg-ok-soft text-ok',
  rejected: 'bg-bad-soft text-bad',
}

export function StatusChip({ status }: { status: string }) {
  return <span className={`chip capitalize ${statusStyle[status] ?? 'bg-brown-line text-brown'}`}>{status}</span>
}
