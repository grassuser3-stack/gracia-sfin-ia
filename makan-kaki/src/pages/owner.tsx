import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { supabase, errorText } from '../lib/supabase'
import { costPerDiner, fmtDate, fmtDateLong, fmtDateTime, fmtMonth, fmtTime, PLANS, sgd, sgMonth, sgToday, type Plan } from '../lib/format'
import { Alert, Empty, Field, PageTitle, Spinner, Stat, StatusChip } from '../components/ui'

type Outlet = { id: string; name: string; address: string; hdb_town: string; cuisine: string; plan: Plan }
type OwnerBooking = {
  booking_id: string; code: string; status: string; booked_at: string; post_link: string | null
  slot_date: string; start_time: string; creator_name: string; social_handle: string; platform: string
  redemptions_month: number; redemptions_total: number
}
type Slot = { id: string; slot_date: string; start_time: string; status: 'open' | 'booked' }

function useOutlet() {
  const [outlet, setOutlet] = useState<Outlet | null>(null)
  useEffect(() => {
    supabase.from('outlets').select('id, name, address, hdb_town, cuisine, plan').maybeSingle().then(({ data }) => setOutlet(data as Outlet))
  }, [])
  return outlet
}

function useOwnerBookings() {
  const [rows, setRows] = useState<OwnerBooking[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    supabase.rpc('owner_bookings').then(({ data, error }) => {
      if (error) setError(errorText(error))
      setRows((data as OwnerBooking[]) ?? [])
    })
  }, [])
  return { rows, error }
}

export function OwnerDashboard() {
  const outlet = useOutlet()
  const { rows, error } = useOwnerBookings()
  if (!outlet || !rows) return <Spinner />

  const today = sgToday()
  const month = sgMonth()
  const live = rows.filter((r) => r.status !== 'cancelled')
  const upcoming = live.filter((r) => r.slot_date >= today && r.status === 'booked').sort((a, b) => (a.slot_date + a.start_time).localeCompare(b.slot_date + b.start_time))
  const redemptionsMonth = rows.reduce((s, r) => s + Number(r.redemptions_month), 0)
  const cpd = costPerDiner(outlet.plan, redemptionsMonth)
  const plan = PLANS[outlet.plan]
  const visitsThisMonth = live.filter((r) => r.slot_date.startsWith(month)).length
  const results = rows
    .filter((r) => Number(r.redemptions_month) > 0 || (r.slot_date.startsWith(month) && r.status !== 'cancelled'))
    .sort((a, b) => Number(b.redemptions_month) - Number(a.redemptions_month))

  return (
    <>
      <PageTitle title={outlet.name} subtitle={<>{outlet.hdb_town} · {plan.label} plan</>} />
      {error && <Alert kind="bad">{error}</Alert>}

      <Link to="/owner/redeem" className="btn-primary mb-5 w-full text-xl">Redeem code</Link>

      <div className="grid grid-cols-2 gap-3">
        <Stat label={`Diners in ${fmtMonth(month).split(' ')[0]}`} value={redemptionsMonth} note="Codes redeemed this month" />
        <Stat label="Cost per diner" value={cpd === null ? <span className="text-base">No redemptions yet</span> : sgd(cpd)}
          note={`S$${plan.fee} plan + S$1 per diner`} />
      </div>
      <div className="mt-3 card flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-brown-soft">Creator visits this month</div>
          <div className="font-heading text-xl font-bold">{visitsThisMonth} of {plan.visits} booked</div>
        </div>
        <Link to="/owner/slots" className="btn-secondary min-h-[44px] px-4 text-base">Visit slots</Link>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-bold">Upcoming visits</h2>
      {upcoming.length === 0 ? <Empty>No upcoming creator visits. <Link to="/owner/slots" className="link">Add visit slots</Link></Empty> : (
        <div className="space-y-3">
          {upcoming.map((r) => (
            <Link key={r.booking_id} to={`/owner/bookings/${r.booking_id}`} className="card flex items-center justify-between gap-3">
              <div>
                <div className="font-bold">{r.creator_name} <span className="font-normal text-brown-soft">{r.social_handle}</span></div>
                <div className="text-sm text-brown-soft">{fmtDate(r.slot_date)} · {fmtTime(r.start_time)} · {r.platform}</div>
              </div>
              <span aria-hidden className="text-xl text-brown-soft">›</span>
            </Link>
          ))}
        </div>
      )}

      <h2 className="mt-8 mb-1 text-lg font-bold">Diners per creator post</h2>
      <p className="mb-3 text-sm text-brown-soft">{fmtMonth(month)}</p>
      {results.length === 0 ? <Empty>No creator posts this month yet.</Empty> : (
        <div className="space-y-3">
          {results.map((r) => (
            <Link key={r.booking_id} to={`/owner/bookings/${r.booking_id}`} className="card flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-bold">{r.social_handle}</div>
                <div className="text-sm text-brown-soft">Visited {fmtDate(r.slot_date)} · <StatusChip status={r.status} /></div>
              </div>
              <div className="text-right">
                <div className="font-heading text-2xl font-bold">{r.redemptions_month}</div>
                <div className="text-xs text-brown-soft">diners</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

export function OwnerBookingDetail() {
  const { id } = useParams()
  const { rows } = useOwnerBookings()
  if (!rows) return <Spinner />
  const b = rows.find((r) => r.booking_id === id)
  if (!b) return <><PageTitle title="Visit not found" back="/owner" /><Empty>This visit doesn't exist or isn't at your outlet.</Empty></>
  return (
    <>
      <PageTitle title={b.creator_name} subtitle={<>{b.social_handle} · {b.platform}</>} back="/owner" />
      <div className="card space-y-3">
        <Row k="Visit" v={`${fmtDateLong(b.slot_date)}, ${fmtTime(b.start_time)}`} />
        <Row k="Status" v={<StatusChip status={b.status} />} />
        <Row k="Creator's code" v={<span className="font-mono font-bold">{b.code}</span>} />
        <Row k="Post link" v={b.post_link ? <a href={b.post_link} target="_blank" rel="noreferrer" className="link break-all">Open post</a> : <span className="text-brown-soft">Not submitted yet</span>} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Stat label="Diners this month" value={b.redemptions_month} />
        <Stat label="Diners all time" value={b.redemptions_total} />
      </div>
    </>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm font-semibold text-brown-soft">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  )
}

export function ManageSlots() {
  const outlet = useOutlet()
  const [params] = useSearchParams()
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('11:00')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null)
  const today = sgToday()

  const load = useCallback(async () => {
    const { data } = await supabase.from('visit_slots').select('id, slot_date, start_time, status').gte('slot_date', today).order('slot_date').order('start_time')
    setSlots((data as Slot[]) ?? [])
  }, [today])
  useEffect(() => { load() }, [load])

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!outlet) return
    setBusy(true); setMsg(null)
    const { error } = await supabase.from('visit_slots').insert({ outlet_id: outlet.id, slot_date: date, start_time: time })
    setBusy(false)
    if (error) { setMsg({ kind: 'bad', text: error.message.includes('row-level security') ? 'Pick today or a future date.' : errorText(error) }); return }
    setMsg({ kind: 'ok', text: `Added ${fmtDate(date)}, ${fmtTime(time + ':00')}` })
    load()
  }

  async function remove(id: string) {
    await supabase.from('visit_slots').delete().eq('id', id).eq('status', 'open')
    load()
  }

  if (!outlet || !slots) return <Spinner />
  const plan = PLANS[outlet.plan]
  return (
    <>
      {params.get('welcome') && <div className="mb-4"><Alert kind="ok">Your outlet is registered! Now add a few visit slots.</Alert></div>}
      <PageTitle title="Visit slots" subtitle={`Times a creator can come and film. Your ${plan.label} plan includes ${plan.visits} creator visits a month.`} />
      <form onSubmit={add} className="card space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><input className="input" type="date" required min={today} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Start time"><input className="input" type="time" required step={900} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Adding…' : 'Add visit slot'}</button>
      </form>

      <h2 className="mt-8 mb-3 text-lg font-bold">Upcoming slots</h2>
      {slots.length === 0 ? <Empty>No slots yet. Add your first one above.</Empty> : (
        <div className="space-y-3">
          {slots.map((s) => (
            <div key={s.id} className="card flex items-center justify-between gap-3">
              <div>
                <div className="font-bold">{fmtDate(s.slot_date)}</div>
                <div className="text-sm text-brown-soft">{fmtTime(s.start_time)}</div>
              </div>
              <div className="flex items-center gap-3">
                <StatusChip status={s.status} />
                {s.status === 'open' && (
                  <button onClick={() => remove(s.id)} className="min-h-[44px] px-2 text-sm font-semibold text-brown-soft underline underline-offset-2">Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

/** One big box, one big button. Used by owners and staff. */
export function RedeemCode({ outletName }: { outletName?: string }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; code: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const c = code.trim()
    if (!c) return
    setBusy(true)
    const { data, error } = await supabase.rpc('redeem_code', { p_code: c })
    setBusy(false)
    setResult({ ok: !error && data === true, code: c.toUpperCase() })
    setCode('')
    inputRef.current?.focus()
  }

  return (
    <div className="flex min-h-[70vh] flex-col">
      <PageTitle title="Redeem code" subtitle={outletName ?? "Type the diner's code"} />
      <form onSubmit={submit} className="flex flex-1 flex-col gap-4">
        <input
          ref={inputRef}
          autoFocus
          aria-label="Diner's code"
          className="w-full rounded-2xl border-4 border-brown-line bg-white px-4 py-6 text-center font-mono text-3xl font-bold uppercase tracking-wider text-brown placeholder:text-brown-line focus:border-orange focus:outline-none"
          placeholder="AA-NAME-1234"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          value={code}
          onChange={(e) => { setCode(e.target.value); setResult(null) }}
        />
        {result && (
          <div role="status" className={`rounded-2xl px-4 py-5 text-center text-xl font-bold text-white ${result.ok ? 'bg-ok' : 'bg-bad'}`}>
            {result.ok ? '✓ Code redeemed' : '✕ Code not found'}
            <div className="mt-1 font-mono text-base font-semibold opacity-90">{result.code}</div>
          </div>
        )}
        <button className="btn-primary mt-auto min-h-[72px] w-full text-2xl" disabled={busy || !code.trim()}>
          {busy ? 'Checking…' : 'Redeem code'}
        </button>
      </form>
    </div>
  )
}

export function OwnerRedeem() {
  const outlet = useOutlet()
  return <RedeemCode outletName={outlet?.name} />
}

type StaffRow = { id: string; email: string; user_id: string | null; created_at: string }

export function OwnerStaff() {
  const [rows, setRows] = useState<StaffRow[] | null>(null)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('staff_members').select('id, email, user_id, created_at').order('created_at')
    setRows((data as StaffRow[]) ?? [])
  }, [])
  useEffect(() => { load() }, [load])

  async function add(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.rpc('add_staff', { p_email: email })
    setBusy(false)
    if (error) { setError(errorText(error)); return }
    setEmail('')
    load()
  }
  async function remove(id: string) {
    await supabase.from('staff_members').delete().eq('id', id)
    load()
  }

  if (!rows) return <Spinner />
  const full = rows.length >= 3
  return (
    <>
      <PageTitle title="Counter staff" subtitle="Staff can only use the Redeem code screen. They can't see your dashboard, results or creator details." />
      <form onSubmit={add} className="card space-y-4">
        <Field label="Staff email" hint={full ? 'You have 3 staff, the maximum. Remove one to add another.' : `${3 - rows.length} of 3 places left`}>
          <input className="input" type="email" required disabled={full} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@example.com" />
        </Field>
        {error && <Alert kind="bad">{error}</Alert>}
        <button className="btn-primary w-full" disabled={busy || full}>Add staff</button>
      </form>
      <div className="mt-4 rounded-xl bg-orange-soft px-4 py-3 text-sm">
        Tell your staff to go to <span className="font-semibold">Sign up → Counter staff</span> and use this exact email.
      </div>
      <h2 className="mt-8 mb-3 text-lg font-bold">Your staff</h2>
      {rows.length === 0 ? <Empty>No staff added yet.</Empty> : (
        <div className="space-y-3">
          {rows.map((s) => (
            <div key={s.id} className="card flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{s.email}</div>
                <div className="text-xs text-brown-soft">{s.user_id ? 'Login active' : `Invited ${fmtDateTime(s.created_at)}, not signed up yet`}</div>
              </div>
              <button onClick={() => remove(s.id)} className="min-h-[44px] px-2 text-sm font-semibold text-brown-soft underline underline-offset-2">Remove</button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
