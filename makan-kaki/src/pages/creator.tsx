import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, errorText } from '../lib/supabase'
import { fmtDate, fmtDateLong, fmtTime, sgToday } from '../lib/format'
import { Alert, Empty, Field, PageTitle, Spinner, StatusChip } from '../components/ui'

type CreatorMe = { approval_status: 'pending' | 'approved' | 'rejected'; hdb_town: string }
type OpenSlot = { slot_id: string; slot_date: string; start_time: string; outlet_name: string; address: string; cuisine: string; hdb_town: string; plan: string }
type MyBooking = {
  booking_id: string; code: string; status: string; booked_at: string; post_link: string | null
  slot_date: string; start_time: string; outlet_name: string; address: string; cuisine: string
  redemptions: number; code_valid_until: string
}

function useCreatorMe() {
  const [me, setMe] = useState<CreatorMe | null>(null)
  useEffect(() => {
    supabase.from('creators').select('approval_status, hdb_town').maybeSingle().then(({ data }) => setMe(data as CreatorMe))
  }, [])
  return me
}

/** Open slots, refreshed every few seconds and whenever anyone books, so booked slots vanish quickly. */
function useOpenSlots(enabled: boolean) {
  const [slots, setSlots] = useState<OpenSlot[] | null>(null)
  const load = useCallback(async () => {
    const { data } = await supabase.rpc('open_slots_for_me')
    setSlots((data as OpenSlot[]) ?? [])
  }, [])
  useEffect(() => {
    if (!enabled) return
    load()
    const t = setInterval(load, 4000)
    const ch = supabase.channel('slots').on('broadcast', { event: 'changed' }, load).subscribe()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(t); supabase.removeChannel(ch); window.removeEventListener('focus', onFocus) }
  }, [enabled, load])
  return slots
}

function NotApproved({ status }: { status: 'pending' | 'rejected' }) {
  return status === 'pending' ? (
    <div className="card text-center">
      <div className="text-4xl" aria-hidden>⏳</div>
      <h2 className="mt-2 text-xl font-bold">Waiting for approval</h2>
      <p className="mt-1 text-brown-soft">Our team checks every creator. Once you're approved, open visit slots in your HDB town will show here.</p>
    </div>
  ) : (
    <div className="card text-center">
      <h2 className="text-xl font-bold">Your application wasn't approved</h2>
      <p className="mt-1 text-brown-soft">You can't book visits right now. Please contact the Makan Kaki team if you think this is a mistake.</p>
    </div>
  )
}

export function FindVisits() {
  const me = useCreatorMe()
  const slots = useOpenSlots(me?.approval_status === 'approved')
  if (!me) return <Spinner />
  if (me.approval_status !== 'approved') {
    return <><PageTitle title="Find visits" /><NotApproved status={me.approval_status} /></>
  }
  if (!slots) return <Spinner />
  return (
    <>
      <PageTitle title="Find visits" subtitle={<>Open slots in <span className="font-semibold text-brown">{me.hdb_town}</span></>} />
      {slots.length === 0 ? <Empty>No open slots in {me.hdb_town} right now. New ones appear here automatically.</Empty> : (
        <div className="space-y-3">
          {slots.map((s) => (
            <Link key={s.slot_id} to={`/creator/slots/${s.slot_id}`} className="card block transition active:scale-[0.99]">
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-orange-soft">
                  <span className="text-xs font-semibold uppercase">{fmtDate(s.slot_date).split(' ')[0].replace(',', '')}</span>
                  <span className="font-heading text-xl font-bold leading-none">{s.slot_date.slice(8)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-heading text-lg font-bold leading-tight">{s.outlet_name}</div>
                  <div className="text-sm text-brown-soft">{s.cuisine}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-sm">
                    <span className="chip bg-cream text-brown">{fmtTime(s.start_time)}</span>
                    <span className="chip bg-cream text-brown">{s.plan === 'cafe' ? 'Café' : 'Hawker'}</span>
                  </div>
                </div>
                <span aria-hidden className="self-center text-xl text-brown-soft">›</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

export function SlotDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const me = useCreatorMe()
  const slots = useOpenSlots(me?.approval_status === 'approved')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!me) return <Spinner />
  if (me.approval_status !== 'approved') return <><PageTitle title="Visit slot" back="/creator" /><NotApproved status={me.approval_status} /></>
  if (!slots) return <Spinner />
  const s = slots.find((x) => x.slot_id === id)

  async function book() {
    setBusy(true); setError('')
    const { data, error } = await supabase.rpc('book_slot', { p_slot_id: id })
    setBusy(false)
    if (error) { setError(errorText(error)); return }
    const row = (data as { booking_id: string; code: string }[])[0]
    await supabase.channel('slots').send({ type: 'broadcast', event: 'changed', payload: {} })
    navigate(`/creator/booked/${row.booking_id}`, { replace: true })
  }

  if (!s) {
    return (
      <>
        <PageTitle title="Slot no longer available" back="/creator" />
        <Empty>Someone else booked this slot, or it has passed. <Link to="/creator" className="link">See other slots</Link></Empty>
      </>
    )
  }
  return (
    <>
      <PageTitle title={s.outlet_name} subtitle={s.cuisine} back="/creator" />
      <div className="card space-y-4">
        <div>
          <div className="text-sm font-semibold text-brown-soft">When</div>
          <div className="font-heading text-xl font-bold">{fmtDateLong(s.slot_date)}</div>
          <div className="text-lg">{fmtTime(s.start_time)}</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-brown-soft">Where</div>
          <div>{s.address}</div>
          <div className="text-sm text-brown-soft">{s.hdb_town}</div>
        </div>
      </div>
      <div className="mt-4 rounded-xl bg-orange-soft px-4 py-3 text-sm">
        You'll get a unique code to put in your post. Each diner who shows it at the counter counts toward your results.
      </div>
      {error && <div className="mt-4"><Alert kind="bad">{error}</Alert></div>}
      <button onClick={book} disabled={busy} className="btn-primary mt-5 w-full">{busy ? 'Booking…' : 'Book a makan'}</button>
    </>
  )
}

function useMyBookings() {
  const [rows, setRows] = useState<MyBooking[] | null>(null)
  const load = useCallback(async () => {
    const { data } = await supabase.rpc('my_bookings')
    setRows((data as MyBooking[]) ?? [])
  }, [])
  useEffect(() => { load() }, [load])
  return { rows, load }
}

export function BookingConfirmed() {
  const { id } = useParams()
  const { rows } = useMyBookings()
  const [copied, setCopied] = useState(false)
  if (!rows) return <Spinner />
  const b = rows.find((r) => r.booking_id === id)
  if (!b) return <><PageTitle title="Booking not found" back="/creator/bookings" /></>
  return (
    <>
      <div className="mb-5"><Alert kind="ok">You're booked! See you at {b.outlet_name.replace(/\.$/, '')}.</Alert></div>
      <div className="card text-center">
        <div className="text-sm font-semibold text-brown-soft">Your unique code</div>
        <div className="my-3 break-all rounded-xl bg-cream px-3 py-4 font-mono text-3xl font-bold tracking-wider">{b.code}</div>
        <p className="text-sm text-brown-soft">Put this code in your post. Diners show it at the counter so we can count them.</p>
        <button
          onClick={async () => { try { await navigator.clipboard.writeText(b.code); setCopied(true) } catch { /* clipboard blocked */ } }}
          className="btn-secondary mt-4 w-full"
        >{copied ? 'Copied ✓' : 'Copy code'}</button>
      </div>
      <div className="card mt-3 space-y-1">
        <div className="font-bold">{b.outlet_name}</div>
        <div className="text-sm">{fmtDateLong(b.slot_date)}, {fmtTime(b.start_time)}</div>
        <div className="text-sm text-brown-soft">{b.address}</div>
        <div className="pt-2 text-xs text-brown-soft">After your visit, submit your post link within 7 days. The code works until {fmtDate(b.code_valid_until)}.</div>
      </div>
      <Link to="/creator/bookings" className="btn-primary mt-5 w-full">Go to my bookings</Link>
    </>
  )
}

export function MyBookings() {
  const { rows } = useMyBookings()
  if (!rows) return <Spinner />
  const today = sgToday()
  return (
    <>
      <PageTitle title="My bookings" />
      {rows.length === 0 ? <Empty>No bookings yet. <Link to="/creator" className="link">Find a visit</Link></Empty> : (
        <div className="space-y-3">
          {rows.map((b) => {
            const canSubmit = b.status === 'booked' && today >= b.slot_date
            return (
              <div key={b.booking_id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-heading text-lg font-bold leading-tight">{b.outlet_name}</div>
                    <div className="text-sm text-brown-soft">{fmtDate(b.slot_date)} · {fmtTime(b.start_time)}</div>
                  </div>
                  <StatusChip status={b.status} />
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-cream px-3 py-2">
                  <span className={`font-mono font-bold ${b.status === 'cancelled' ? 'line-through text-brown-soft' : ''}`}>{b.code}</span>
                  <span className="text-sm"><span className="font-heading text-lg font-bold">{b.redemptions}</span> diners</span>
                </div>
                {b.post_link && <a href={b.post_link} target="_blank" rel="noreferrer" className="link mt-2 inline-block text-sm">View my post</a>}
                {canSubmit && <Link to={`/creator/bookings/${b.booking_id}/post`} className="btn-primary mt-3 w-full">Submit my post</Link>}
                {b.status === 'booked' && today < b.slot_date && <p className="mt-2 text-xs text-brown-soft">You can submit your post link from your visit date.</p>}
                {b.status === 'missed' && <p className="mt-2 text-xs text-bad">No post link was submitted within 7 days of the visit.</p>}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

export function SubmitPost() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { rows } = useMyBookings()
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!rows) return <Spinner />
  const b = rows.find((r) => r.booking_id === id)
  if (!b) return <PageTitle title="Booking not found" back="/creator/bookings" />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.rpc('submit_post_link', { p_booking_id: id, p_link: link.trim() })
    setBusy(false)
    if (error) { setError(errorText(error)); return }
    navigate('/creator/bookings', { replace: true })
  }

  return (
    <>
      <PageTitle title="Submit my post" subtitle={`${b.outlet_name} · ${fmtDate(b.slot_date)}`} back="/creator/bookings" />
      <form onSubmit={submit} className="card space-y-4">
        <Field label="Link to your post" hint="Paste the TikTok, Instagram or other link to the video you made">
          <input className="input" type="url" inputMode="url" required placeholder="https://www.tiktok.com/@you/video/…" value={link} onChange={(e) => setLink(e.target.value)} />
        </Field>
        <div className="rounded-xl bg-cream px-3 py-2 text-sm">Did you include your code <span className="font-mono font-bold">{b.code}</span> in the post?</div>
        {error && <Alert kind="bad">{error}</Alert>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Submitting…' : 'Submit my post'}</button>
      </form>
    </>
  )
}
