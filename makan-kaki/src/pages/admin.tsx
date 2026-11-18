import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, errorText } from '../lib/supabase'
import { fmtDate, fmtMonth, fmtTime, PLANS, sgd, sgMonth, type Plan } from '../lib/format'
import { Alert, Empty, Field, PageTitle, Spinner, Stat, StatusChip } from '../components/ui'

type AdminCreator = {
  id: string; name: string; email: string; phone: string; social_handle: string; platform: string
  follower_count: number; hdb_town: string; languages: string[]; approval_status: string; created_at: string
}
type AdminOutlet = {
  id: string; name: string; address: string; hdb_town: string; cuisine: string; plan: Plan
  owner_name: string; owner_email: string; owner_phone: string
  open_slots: number; bookings_month: number; redemptions_month: number; spend_month: string
}
type AdminBooking = {
  booking_id: string; code: string; status: string; booked_at: string; post_link: string | null
  slot_date: string; start_time: string; outlet_name: string; hdb_town: string
  creator_name: string; social_handle: string; platform: string; redemptions: number; spend: string
}
type BillingRow = {
  outlet_name: string; plan: Plan; plan_fee: string; redemptions: number
  diner_spend: string; commission: string; total_owed: string; creator_payouts: string
}
type PayoutRow = { creator_name: string; social_handle: string; email: string; phone: string; redemptions: number; diner_spend: string; payout: string }

function useRpc<T>(fn: string) {
  const [rows, setRows] = useState<T[] | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc(fn)
    if (error) setError(errorText(error))
    setRows((data as T[]) ?? [])
  }, [fn])
  useEffect(() => { load() }, [load])
  return { rows, error, load }
}

export function AdminHome() {
  const creators = useRpc<AdminCreator>('admin_creators')
  const outlets = useRpc<AdminOutlet>('admin_outlets')
  const bookings = useRpc<AdminBooking>('admin_bookings')
  if (!creators.rows || !outlets.rows || !bookings.rows) return <Spinner />

  const pending = creators.rows.filter((c) => c.approval_status === 'pending').length
  const missed = bookings.rows.filter((b) => b.status === 'missed')
  const month = sgMonth()
  const redemptions = outlets.rows.reduce((s, o) => s + Number(o.redemptions_month), 0)

  return (
    <>
      <PageTitle title="Admin" subtitle={fmtMonth(month)} />
      {pending > 0 && (
        <Link to="/admin/creators" className="mb-4 block"><Alert kind="info">{pending} creator{pending > 1 ? 's' : ''} waiting for approval →</Alert></Link>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Outlets" value={outlets.rows.length} />
        <Stat label="Approved creators" value={creators.rows.filter((c) => c.approval_status === 'approved').length} />
        <Stat label="Live bookings" value={bookings.rows.filter((b) => b.status === 'booked').length} />
        <Stat label="Diners this month" value={redemptions} />
      </div>

      <h2 className="mt-8 mb-1 text-lg font-bold">Missed posts</h2>
      <p className="mb-3 text-sm text-brown-soft">No post link 7 days after the visit.</p>
      {missed.length === 0 ? <Empty>No missed posts.</Empty> : (
        <div className="space-y-3">
          {missed.map((b) => (
            <div key={b.booking_id} className="card border-l-4 border-bad">
              <div className="font-bold">{b.creator_name} <span className="font-normal text-brown-soft">{b.social_handle}</span></div>
              <div className="text-sm text-brown-soft">{b.outlet_name} · visited {fmtDate(b.slot_date)} · <span className="font-mono">{b.code}</span></div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export function AdminCreators() {
  const { rows, error, load } = useRpc<AdminCreator>('admin_creators')
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [busyId, setBusyId] = useState('')

  async function setStatus(id: string, status: string) {
    setBusyId(id)
    await supabase.rpc('admin_set_creator_status', { p_id: id, p_status: status })
    await load()
    setBusyId('')
  }

  if (!rows) return <Spinner />
  const shown = filter === 'pending' ? rows.filter((r) => r.approval_status === 'pending') : rows
  return (
    <>
      <PageTitle title="Creators" />
      {error && <Alert kind="bad">{error}</Alert>}
      <Tabs value={filter} onChange={setFilter} options={[['pending', 'Awaiting approval'], ['all', 'All creators']]} />
      {shown.length === 0 ? <Empty>{filter === 'pending' ? 'No creators waiting for approval.' : 'No creators yet.'}</Empty> : (
        <div className="space-y-3">
          {shown.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-heading text-lg font-bold">{c.name}</div>
                  <div className="text-sm">{c.social_handle} · {c.platform} · {c.follower_count.toLocaleString('en-SG')} followers</div>
                </div>
                <StatusChip status={c.approval_status} />
              </div>
              <div className="mt-2 grid gap-0.5 text-sm text-brown-soft">
                <span>{c.hdb_town} · {c.languages.join(', ')}</span>
                <span className="break-all">{c.email} · {c.phone}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {c.approval_status !== 'approved' && (
                  <button className="btn-ok min-h-[48px] text-base" disabled={busyId === c.id} onClick={() => setStatus(c.id, 'approved')}>Approve</button>
                )}
                {c.approval_status !== 'rejected' && (
                  <button className="btn-secondary min-h-[48px] text-base" disabled={busyId === c.id} onClick={() => setStatus(c.id, 'rejected')}>Reject</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export function AdminOutlets() {
  const { rows, error } = useRpc<AdminOutlet>('admin_outlets')
  if (!rows) return <Spinner />
  return (
    <>
      <PageTitle title="All outlets" subtitle={`${rows.length} outlets · figures for ${fmtMonth(sgMonth())}`} />
      {error && <Alert kind="bad">{error}</Alert>}
      {rows.length === 0 ? <Empty>No outlets yet.</Empty> : (
        <div className="space-y-3">
          {rows.map((o) => (
            <div key={o.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-heading text-lg font-bold">{o.name}</div>
                  <div className="text-sm text-brown-soft">{o.cuisine} · {o.hdb_town}</div>
                </div>
                <span className="chip bg-orange-soft text-brown">{PLANS[o.plan].label}</span>
              </div>
              <div className="mt-1 text-sm text-brown-soft">{o.address}</div>
              <div className="mt-1 break-all text-sm text-brown-soft">{o.owner_name} · {o.owner_email} · {o.owner_phone}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Mini label="Open slots" v={o.open_slots} />
                <Mini label="Visits" v={`${o.bookings_month}/${PLANS[o.plan].visits}`} />
                <Mini label={`Diners · ${sgd(Number(o.spend_month))}`} v={o.redemptions_month} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function Mini({ label, v }: { label: string; v: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-cream py-2">
      <div className="font-heading text-lg font-bold">{v}</div>
      <div className="text-xs text-brown-soft">{label}</div>
    </div>
  )
}

function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto">
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)}
          className={`min-h-[44px] shrink-0 rounded-full border-2 px-4 text-sm font-semibold ${value === v ? 'border-orange bg-orange-soft' : 'border-brown-line bg-white'}`}>
          {l}
        </button>
      ))}
    </div>
  )
}

export function AdminBookings() {
  const { rows, error, load } = useRpc<AdminBooking>('admin_bookings')
  const [filter, setFilter] = useState<'all' | 'booked' | 'completed' | 'missed' | 'cancelled'>('all')
  const [editing, setEditing] = useState<AdminBooking | null>(null)

  if (!rows) return <Spinner />
  const shown = filter === 'all' ? rows : rows.filter((r) => r.status === filter)
  return (
    <>
      <PageTitle title="All bookings" />
      {error && <Alert kind="bad">{error}</Alert>}
      <Tabs value={filter} onChange={setFilter} options={[['all', 'All'], ['booked', 'Booked'], ['completed', 'Completed'], ['missed', 'Missed'], ['cancelled', 'Cancelled']]} />
      {shown.length === 0 ? <Empty>No bookings.</Empty> : (
        <div className="space-y-3">
          {shown.map((b) => (
            <div key={b.booking_id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold">{b.outlet_name}</div>
                  <div className="text-sm text-brown-soft">{b.creator_name} {b.social_handle}</div>
                  <div className="text-sm text-brown-soft">{fmtDate(b.slot_date)} · {fmtTime(b.start_time)}</div>
                </div>
                <StatusChip status={b.status} />
              </div>
              <div className="mt-2 flex items-center justify-between rounded-xl bg-cream px-3 py-2 text-sm">
                <span className="font-mono font-bold">{b.code}</span>
                <span>{b.redemptions} diners · {sgd(Number(b.spend))}</span>
              </div>
              {b.post_link && <a href={b.post_link} target="_blank" rel="noreferrer" className="link mt-2 inline-block break-all text-sm">{b.post_link}</a>}
              {b.status !== 'cancelled' && (
                <button onClick={() => setEditing(b)} className="btn-secondary mt-3 min-h-[44px] w-full text-base">Edit or cancel</button>
              )}
            </div>
          ))}
        </div>
      )}
      {editing && <EditBooking b={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </>
  )
}

function EditBooking({ b, onClose, onSaved }: { b: AdminBooking; onClose: () => void; onSaved: () => void }) {
  const [link, setLink] = useState(b.post_link ?? '')
  const [status, setStatus] = useState(b.status)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)

  async function save() {
    setBusy(true); setError('')
    const { error } = await supabase.rpc('admin_update_booking', { p_id: b.booking_id, p_post_link: link, p_status: status })
    setBusy(false)
    if (error) setError(errorText(error)); else onSaved()
  }
  async function cancel() {
    setBusy(true); setError('')
    const { error } = await supabase.rpc('admin_cancel_booking', { p_id: b.booking_id })
    setBusy(false)
    if (error) setError(errorText(error)); else onSaved()
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-brown/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-xl rounded-t-3xl bg-cream p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold">Edit booking</h2>
        <p className="text-sm text-brown-soft">{b.outlet_name} · {b.creator_name} · <span className="font-mono">{b.code}</span></p>
        <div className="mt-4 space-y-4">
          <Field label="Post link"><input className="input" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" /></Field>
          <Field label="Status">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="booked">Booked</option>
              <option value="completed">Completed</option>
              <option value="missed">Missed</option>
            </select>
          </Field>
          {error && <Alert kind="bad">{error}</Alert>}
          <button className="btn-primary w-full" disabled={busy} onClick={save}>Save changes</button>
          {!confirmCancel ? (
            <button className="btn-secondary w-full" disabled={busy} onClick={() => setConfirmCancel(true)}>Cancel booking</button>
          ) : (
            <div className="rounded-2xl border-2 border-bad/30 bg-bad-soft p-4">
              <p className="text-sm font-semibold text-bad">The code {b.code} will stop working. If the visit date hasn't passed, the slot reopens for other creators.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="btn-danger min-h-[48px] text-base" disabled={busy} onClick={cancel}>Yes, cancel it</button>
                <button className="btn-secondary min-h-[48px] text-base" onClick={() => setConfirmCancel(false)}>Keep it</button>
              </div>
            </div>
          )}
          <button className="w-full py-2 text-sm font-semibold text-brown-soft underline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function csvCell(v: string | number) {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadCsv(filename: string, head: string[], rows: (string | number)[][]) {
  const lines = rows.map((r) => r.map(csvCell).join(','))
  const blob = new Blob(['﻿' + [head.join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

const money = (v: string | number) => Number(v).toFixed(2)

export function AdminBilling() {
  const [month, setMonth] = useState(sgMonth())
  const [rows, setRows] = useState<BillingRow[] | null>(null)
  const [payouts, setPayouts] = useState<PayoutRow[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setRows(null); setPayouts(null)
    const p_month = `${month}-01`
    supabase.rpc('admin_billing', { p_month }).then(({ data, error }) => {
      if (error) setError(errorText(error))
      setRows((data as BillingRow[]) ?? [])
    })
    supabase.rpc('admin_creator_payouts', { p_month }).then(({ data, error }) => {
      if (error) setError(errorText(error))
      setPayouts((data as PayoutRow[]) ?? [])
    })
  }, [month])

  function downloadBilling() {
    if (!rows) return
    downloadCsv(`makan-kaki-billing-${month}.csv`,
      ['outlet name', 'plan', 'plan fee (SGD)', 'number of redemptions', 'diner spend (SGD)', 'commission 10% (SGD)', 'total amount owed (SGD)', 'creator payouts 2% (SGD)'],
      rows.map((r) => [r.outlet_name, PLANS[r.plan].label, money(r.plan_fee), r.redemptions, money(r.diner_spend), money(r.commission), money(r.total_owed), money(r.creator_payouts)]))
  }
  function downloadPayouts() {
    if (!payouts) return
    downloadCsv(`makan-kaki-creator-payouts-${month}.csv`,
      ['creator name', 'social handle', 'email', 'phone', 'number of redemptions', 'diner spend (SGD)', 'payout 2% (SGD)'],
      payouts.map((p) => [p.creator_name, p.social_handle, p.email, p.phone, p.redemptions, money(p.diner_spend), money(p.payout)]))
  }

  const sum = (k: keyof BillingRow) => rows?.reduce((s, r) => s + Number(r[k]), 0) ?? 0
  const owed = sum('total_owed')
  const toCreators = payouts?.reduce((s, p) => s + Number(p.payout), 0) ?? 0
  return (
    <>
      <PageTitle title="Monthly billing" subtitle="Outlets pay their plan + 10% of diners' bills. Creators get a fifth of that commission (2% of bills). Settle by PayNow." />
      <div className="card space-y-4">
        <Field label="Month"><input className="input" type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-primary min-h-[52px] px-3 text-base" disabled={!rows || rows.length === 0} onClick={downloadBilling}>Outlet billing CSV</button>
          <button className="btn-secondary min-h-[52px] px-3 text-base" disabled={!payouts || payouts.length === 0} onClick={downloadPayouts}>Creator payouts CSV</button>
        </div>
      </div>
      {error && <div className="mt-4"><Alert kind="bad">{error}</Alert></div>}
      {!rows || !payouts ? <Spinner /> : (
        <>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <Mini label="Outlets owe" v={sgd(owed)} />
            <Mini label="To creators" v={sgd(toCreators)} />
            <Mini label="We keep" v={sgd(owed - toCreators)} />
          </div>

          <h2 className="mt-6 mb-3 text-lg font-bold">Outlets · {fmtMonth(month)}</h2>
          {rows.length === 0 ? <Empty>No outlets for {fmtMonth(month)}.</Empty> : (
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.outlet_name} className="card">
                  <div className="flex justify-between gap-3">
                    <div className="font-bold">{r.outlet_name}</div>
                    <div className="font-heading font-bold">{sgd(Number(r.total_owed))}</div>
                  </div>
                  <div className="mt-1 text-sm text-brown-soft">
                    {PLANS[r.plan].label} plan {sgd(Number(r.plan_fee))} + 10% of {sgd(Number(r.diner_spend))} from {r.redemptions} diners = {sgd(Number(r.commission))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 className="mt-8 mb-3 text-lg font-bold">Creator payouts · {fmtMonth(month)}</h2>
          {payouts.length === 0 ? <Empty>No redemptions this month, so no payouts.</Empty> : (
            <div className="space-y-3">
              {payouts.map((p) => (
                <div key={p.email} className="card">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold">{p.creator_name} <span className="font-normal text-brown-soft">{p.social_handle}</span></div>
                      <div className="text-sm text-brown-soft">{p.redemptions} diners spent {sgd(Number(p.diner_spend))}</div>
                    </div>
                    <div className="font-heading font-bold text-ok">{sgd(Number(p.payout))}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}
