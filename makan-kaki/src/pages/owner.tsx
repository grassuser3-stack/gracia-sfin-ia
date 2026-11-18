import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { useDemo, outletStats, commissionOf, ownerNetOf, creatorStats, sgd, r2, type Session } from '../demo/store'
import { useLang, LanguagePicker } from '../demo/i18n'
import { PLANS, PILOT_DISCOUNT, addDays, sgToday, type Order, type OrderStatus, type Outlet, type PlanId, type Visit } from '../demo/data'
import { fmtDate, fmtDateLong, fmtTime } from '../lib/format'
import { Alert, Avatar, DemoNote, Empty, Field, PageTitle, Stars, Stat, StatusChip, Toggle } from '../components/ui'

function useOutlet(): Outlet {
  const { state, session } = useDemo()
  const id = (session as Exclude<Session, null>).id
  return state.outlets.find((o) => o.id === id) ?? state.outlets[0]
}

export function timeAgo(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`
}

function downloadCsv(filename: string, head: string[], rows: (string | number)[][]) {
  const cell = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const blob = new Blob(['﻿' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href)
}
export { downloadCsv }

// ---------- 9. Results dashboard (owner home) ----------

export function OwnerHome() {
  const { state, whatsapp } = useDemo()
  const { t } = useLang()
  const outlet = useOutlet()
  const st = outletStats(state, outlet)
  const newOrders = state.orders.filter((o) => o.outletId === outlet.id && o.status === 'new').length
  return (
    <>
      <PageTitle title={outlet.name} subtitle={<>{outlet.area} · {PLANS[outlet.plan].label} plan{outlet.paused ? ' · visits paused' : ''}</>} />
      <Link to="/owner/orders" className={`btn-primary mb-5 w-full text-xl ${newOrders ? 'animate-pulse' : ''}`}>
        🔔 {t('Live orders')}{newOrders ? ` · ${newOrders} ${t('New').toLowerCase()}` : ''}
      </Link>
      <h2 className="mb-3 text-lg font-bold">{t('Results')} <span className="text-sm font-normal text-brown-soft">· this month</span></h2>
      <div className="grid grid-cols-2 gap-3">
        <Stat label={t('Views')} value={st.views.toLocaleString('en-SG')} note="Across creator videos" />
        <Stat label={t('Coded orders')} value={st.coded.length} note="Orders with a creator code" />
        <Stat label={t('Sales from coded orders')} value={sgd(st.sales)} />
        <Stat label={t('Cost per new diner')} value={st.costPerNewDiner === null ? '—' : sgd(st.costPerNewDiner)} note={`S$${st.planFee} plan + ${sgd(st.commission)} commission`} />
        <Stat label={t('Best creator')} value={<span className="text-lg">{st.bestCreator?.handle ?? '—'}</span>} />
        <Stat label={t('Best dish')} value={<span className="text-lg">{st.bestDish}</span>} />
      </div>
      <h2 className="mt-8 mb-3 text-lg font-bold">What each video brought in</h2>
      {st.perVideo.length === 0 ? <Empty>No creator videos yet. <Link to="/owner/visits/new" className="link">Book a visit</Link></Empty> : (
        <div className="space-y-3">
          {st.perVideo.map((v) => (
            <Link key={v.visit.id} to={`/owner/visits/${v.visit.id}`} className="card flex items-center gap-3">
              <Avatar name={v.creator.handle} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{v.creator.handle}</div>
                <div className="text-xs text-brown-soft">Visited {fmtDate(v.visit.date)} · {v.views.toLocaleString('en-SG')} views</div>
              </div>
              <div className="text-right"><div className="font-heading text-xl font-bold">{v.orders}</div><div className="text-xs text-brown-soft">orders · {sgd(v.sales)}</div></div>
            </Link>
          ))}
        </div>
      )}
      <button className="btn-secondary mt-6 w-full" onClick={() => whatsapp(outlet.name,
        `Your monthly Makan Kaki report: ${st.coded.length} coded orders, ${sgd(st.sales)} sales, ${st.views.toLocaleString('en-SG')} views. Best creator ${st.bestCreator?.handle ?? '—'}, best dish ${st.bestDish}.`)}>
        Send me the monthly report on WhatsApp
      </button>
    </>
  )
}

// ---------- 8. Live orders ----------

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  new: { to: 'preparing', label: 'Start preparing' },
  preparing: { to: 'ready', label: 'Mark ready' },
  ready: { to: 'completed', label: 'Complete' },
}

export function LiveOrders() {
  const { state, update, whatsapp } = useDemo()
  const { t } = useLang()
  const outlet = useOutlet()
  const [tab, setTab] = useState<'active' | 'done'>('active')
  const orders = state.orders.filter((o) => o.outletId === outlet.id).sort((a, b) => b.number - a.number)
  const active = orders.filter((o) => ['new', 'preparing', 'ready'].includes(o.status))
  const done = orders.filter((o) => !['new', 'preparing', 'ready'].includes(o.status)).slice(0, 30)
  const order: Record<string, number> = { new: 0, preparing: 1, ready: 2 }
  const shown = tab === 'active' ? [...active].sort((a, b) => order[a.status] - order[b.status] || a.number - b.number) : done

  function move(o: Order, to: OrderStatus) {
    update((s) => { const x = s.orders.find((q) => q.id === o.id)!; x.status = to })
    if (to === 'ready' && o.phone) whatsapp(`diner ${o.phone}`, `Makan Kaki: your order #${o.number} at ${outlet.name} is ready! ${o.mode === 'dine_in' ? `We'll bring it to table ${o.table}.` : 'Please collect at the counter.'}`)
  }
  function simulate() {
    const menu = state.dishes.filter((d) => d.outletId === outlet.id && !d.soldOut)
    const creators = state.visits.filter((v) => v.outletId === outlet.id && v.creatorId).map((v) => state.creators.find((c) => c.id === v.creatorId)!)
    const c = creators.length && Math.random() < 0.75 ? creators[Math.floor(Math.random() * creators.length)] : null
    const picks = menu.sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 3))
    update((s) => {
      const items = picks.map((d) => ({ dishId: d.id, name: d.name, qty: 1 + Math.floor(Math.random() * 2), price: d.price }))
      const dine = Math.random() < 0.6
      s.orders.push({
        id: `o${Date.now()}`, number: s.nextOrderNumber++, outletId: outlet.id, code: c?.code ?? null, creatorId: c?.id ?? null, items,
        total: r2(items.reduce((t2, i) => t2 + i.qty * i.price, 0)), mode: dine ? 'dine_in' : 'takeaway', table: dine ? String(1 + Math.floor(Math.random() * 20)) : '',
        status: 'new', createdAt: new Date().toISOString(), lang: 'en', phone: '',
      })
    })
  }

  return (
    <>
      <PageTitle title={t('Live orders')} subtitle={`${active.filter((o) => o.status === 'new').length} ${t('New').toLowerCase()} · ${active.length} active`} />
      <div className="mb-4 grid grid-cols-2 gap-2">
        {(['active', 'done'] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`min-h-[44px] rounded-full border-2 text-sm font-semibold ${tab === k ? 'border-orange bg-orange-soft' : 'border-brown-line bg-white'}`}>
            {k === 'active' ? `Active (${active.length})` : 'Done and cancelled'}
          </button>
        ))}
      </div>
      {shown.length === 0 ? <Empty>No orders here yet.</Empty> : (
        <div className="space-y-3">
          {shown.map((o) => {
            const c = o.creatorId ? state.creators.find((x) => x.id === o.creatorId) : null
            const nx = NEXT[o.status]
            return (
              <div key={o.id} className={`card ${o.status === 'new' ? 'ring-4 ring-bad/60' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-heading text-2xl font-extrabold">#{o.number}</div>
                    <div className="text-sm font-semibold">{o.mode === 'dine_in' ? `🍽 Table ${o.table}` : '🥡 Takeaway'} · <span className="text-brown-soft">{timeAgo(o.createdAt)}</span></div>
                  </div>
                  <StatusChip status={o.status} label={t(o.status === 'new' ? 'New' : o.status[0].toUpperCase() + o.status.slice(1))} />
                </div>
                <ul className="mt-2 space-y-0.5 text-sm">{o.items.map((i) => <li key={i.dishId} className="flex justify-between"><span><b>{i.qty}×</b> {i.name}</span><span>{sgd(i.qty * i.price)}</span></li>)}</ul>
                <div className="mt-2 flex items-center justify-between border-t border-brown-line pt-2">
                  {o.code ? <span className="chip bg-ok-soft text-ok">🎥 {o.code}{c ? ` · ${c.handle}` : ''}</span> : <span className="chip bg-cream text-brown-soft">No code · no commission</span>}
                  <span className="font-heading font-bold">{sgd(o.total)}</span>
                </div>
                {nx && <button onClick={() => move(o, nx.to)} className="btn-primary mt-3 w-full">{t(nx.label)}</button>}
                {['new', 'preparing'].includes(o.status) && <button onClick={() => move(o, 'cancelled')} className="mt-2 w-full py-1 text-sm font-semibold text-brown-soft underline">{t('Cancel')}</button>}
                {o.status === 'cancelled' && <button onClick={() => move(o, 'refunded')} className="btn-secondary mt-3 w-full min-h-[44px] text-base">{t('Refund')} {sgd(o.total)}</button>}
              </div>
            )
          })}
        </div>
      )}
      <button onClick={simulate} className="btn-secondary mt-6 w-full">+ {t('Simulate a new order')}</button>
      <div className="mt-3"><DemoNote>Orders placed in the diner checkout (in any tab) appear here with a sound alert. You can also open <Link className="link" to={`/order/${outlet.id}`}>this stall's checkout</Link>.</DemoNote></div>
    </>
  )
}

// ---------- 6. Visits ----------

const VISIT_STEPS: { s: Visit['status']; label: string }[] = [
  { s: 'requested', label: 'Requested' }, { s: 'offered', label: 'Creator matched' }, { s: 'accepted', label: 'Accepted' },
  { s: 'checked_in', label: 'Checked in' }, { s: 'posted', label: 'Posted' }, { s: 'verified', label: 'Post verified' },
]

export function visitsLeft(o: Outlet) { return PLANS[o.plan].visits + o.rollover - o.visitsUsed }

export function OwnerVisits() {
  const { state } = useDemo()
  const outlet = useOutlet()
  const visits = state.visits.filter((v) => v.outletId === outlet.id).sort((a, b) => b.date.localeCompare(a.date))
  const today = sgToday()
  const up = visits.filter((v) => v.date >= today && !['cancelled', 'no_show'].includes(v.status))
  const past = visits.filter((v) => !up.includes(v))
  const left = visitsLeft(outlet)
  const row = (v: Visit) => {
    const c = v.creatorId ? state.creators.find((x) => x.id === v.creatorId) : null
    return (
      <Link key={v.id} to={`/owner/visits/${v.id}`} className="card flex items-center gap-3">
        {c ? <Avatar name={c.handle} /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream text-lg">🔎</span>}
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">{c?.handle ?? 'Finding a creator'}</div>
          <div className="text-xs text-brown-soft">{fmtDate(v.date)} · {fmtTime(v.time)}</div>
        </div>
        <StatusChip status={v.status} />
      </Link>
    )
  }
  return (
    <>
      <PageTitle title="Creator visits" subtitle={`${left} of ${PLANS[outlet.plan].visits}${outlet.rollover ? ` + ${outlet.rollover} rolled over` : ''} visits left this month`} />
      <Link to="/owner/visits/new" className="btn-primary mb-6 w-full" aria-disabled={left <= 0}>+ Book a creator visit</Link>
      <h2 className="mb-3 text-lg font-bold">Upcoming</h2>
      {up.length ? <div className="space-y-3">{up.map(row)}</div> : <Empty>No upcoming visits.</Empty>}
      <h2 className="mt-8 mb-3 text-lg font-bold">Past</h2>
      {past.length ? <div className="space-y-3">{past.map(row)}</div> : <Empty>No past visits yet.</Empty>}
    </>
  )
}

const LANG_OPTIONS = ['English', 'Mandarin', 'Malay', 'Tamil']
const TIMES = ['08:00', '09:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30']

export function BookVisit() {
  const { state, update, whatsapp } = useDemo()
  const { t } = useLang()
  const outlet = useOutlet()
  const navigate = useNavigate()
  const menu = state.dishes.filter((d) => d.outletId === outlet.id)
  const [date, setDate] = useState(addDays(sgToday(), 3))
  const [time, setTime] = useState('11:00')
  const [dishes, setDishes] = useState<string[]>(menu.filter((d) => d.signature).map((d) => d.id).slice(0, 2))
  const [dos, setDos] = useState('')
  const [donts, setDonts] = useState('')
  const [langs, setLangs] = useState<string[]>(['English'])
  const [launch, setLaunch] = useState(false)
  const left = visitsLeft(outlet)
  const count = launch ? Math.min(Math.max(left, 1), 4) : 1
  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  function submit(e: FormEvent) {
    e.preventDefault()
    update((s) => {
      for (let i = 0; i < count; i++) {
        s.visits.push({ id: `v${Date.now()}${i}`, outletId: outlet.id, creatorId: null, date: addDays(date, i * 7), time, status: 'requested', dishes, dos, donts, languagesWanted: langs, views: 0 })
      }
      const o = s.outlets.find((x) => x.id === outlet.id)!; o.visitsUsed += count; if (launch) o.launchPack = true
    })
    whatsapp(outlet.name, `Got it! We're matching a creator for ${count > 1 ? `${count} visits starting ` : ''}${fmtDate(date)} at ${fmtTime(time)}. We'll confirm on WhatsApp.`)
    navigate('/owner/visits')
  }

  return (
    <>
      <PageTitle title={t('Book creator visits')} back="/owner/visits" subtitle={`${left} visits left this month`} />
      {left <= 0 && <div className="mb-4"><Alert kind="bad">You've used this month's visits. Unused visits roll over one month only.</Alert></div>}
      <form onSubmit={submit} className="space-y-4">
        <div className="card space-y-4">
          <Field label="Date"><input type="date" className="input" min={addDays(sgToday(), 1)} value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
          <div><span className="label">Time slot</span>
            <div className="grid grid-cols-4 gap-2">{TIMES.map((x) => (
              <button type="button" key={x} onClick={() => setTime(x)} className={`min-h-[44px] rounded-xl border-2 text-sm font-semibold ${time === x ? 'border-orange bg-orange-soft' : 'border-brown-line bg-white'}`}>{fmtTime(x)}</button>
            ))}</div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div><div className="font-semibold">90-day launch pack</div><div className="text-xs text-brown-soft">Schedule most of your first 90 days' visits in the opening weeks (weekly from this date)</div></div>
            <Toggle on={launch} onChange={setLaunch} label="90-day launch pack" />
          </div>
        </div>
        <div className="card space-y-4">
          <div><span className="label">{t('Dishes to feature')}</span>
            <div className="flex flex-wrap gap-2">{menu.map((d) => (
              <button type="button" key={d.id} onClick={() => toggle(dishes, setDishes, d.id)} className={`min-h-[40px] rounded-full border-2 px-3 text-sm font-semibold ${dishes.includes(d.id) ? 'border-orange bg-orange-soft' : 'border-brown-line bg-white'}`}>{d.emoji} {d.name}</button>
            ))}</div>
          </div>
          <Field label={t("Do's")}><input className="input" value={dos} onChange={(e) => setDos(e.target.value)} placeholder="e.g. Show the wok hei" /></Field>
          <Field label={t("Don'ts")}><input className="input" value={donts} onChange={(e) => setDonts(e.target.value)} placeholder="e.g. Don't film the kitchen" /></Field>
          <div><span className="label">{t('Languages wanted')}</span>
            <div className="flex flex-wrap gap-2">{LANG_OPTIONS.map((l) => (
              <button type="button" key={l} onClick={() => toggle(langs, setLangs, l)} className={`min-h-[40px] rounded-full border-2 px-3 text-sm font-semibold ${langs.includes(l) ? 'border-orange bg-orange-soft' : 'border-brown-line bg-white'}`}>{l}</button>
            ))}</div>
          </div>
        </div>
        <button className="btn-primary w-full" disabled={left <= 0 || !dishes.length}>{count > 1 ? `Book ${count} visits` : 'Book visit'}</button>
      </form>
    </>
  )
}

export function OwnerVisitDetail() {
  const { id } = useParams()
  const { state, update, whatsapp } = useDemo()
  const outlet = useOutlet()
  const navigate = useNavigate()
  const v = state.visits.find((x) => x.id === id && x.outletId === outlet.id)
  const [resched, setResched] = useState(false)
  const [newDate, setNewDate] = useState(v?.date ?? '')
  if (!v) return <><PageTitle title="Visit not found" back="/owner/visits" /></>
  const c = v.creatorId ? state.creators.find((x) => x.id === v.creatorId) : null
  const idx = VISIT_STEPS.findIndex((s) => s.s === v.status)
  const hoursUntil = (new Date(`${v.date}T${v.time}:00+08:00`).getTime() - Date.now()) / 3600000
  const live = !['cancelled', 'no_show', 'verified', 'posted', 'checked_in'].includes(v.status)
  const dishes = v.dishes.map((d) => state.dishes.find((x) => x.id === d)).filter(Boolean)

  function cancel() {
    const late = hoursUntil < 24
    if (!window.confirm(late ? 'Less than 24 hours to go: cancelling now still counts as one of your visits. Cancel anyway?' : 'Cancel this visit? It is free and the visit goes back to your plan.')) return
    update((s) => { const x = s.visits.find((q) => q.id === v!.id)!; x.status = 'cancelled'; if (!late) s.outlets.find((o) => o.id === outlet.id)!.visitsUsed -= 1 })
    if (c) whatsapp(c.name, `${outlet.name} cancelled your visit on ${fmtDate(v!.date)}. Sorry! Check the app for new offers.`)
    navigate('/owner/visits')
  }

  return (
    <>
      <PageTitle title={`Visit · ${fmtDate(v.date)}`} back="/owner/visits" subtitle={`${fmtDateLong(v.date)}, ${fmtTime(v.time)}`} />
      {v.status === 'cancelled' ? <Alert kind="bad">This visit was cancelled.</Alert> : (
        <ol className="card space-y-2">
          {VISIT_STEPS.map((s, i) => (
            <li key={s.s} className="flex items-center gap-3 text-sm">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${i <= idx ? 'bg-ok text-white' : 'bg-brown-line text-brown-soft'}`}>{i <= idx ? '✓' : i + 1}</span>
              <span className={i <= idx ? 'font-semibold' : 'text-brown-soft'}>{s.label}</span>
            </li>
          ))}
        </ol>
      )}

      {c ? (
        <Link to={`/owner/creators/${c.id}`} className="card mt-3 flex items-center gap-3">
          <Avatar name={c.handle} size={48} />
          <div className="min-w-0 flex-1">
            <div className="font-bold">{c.handle} <span className="font-normal text-brown-soft">· {c.platform}</span></div>
            <div className="text-xs text-brown-soft">{c.followers.toLocaleString('en-SG')} followers · {c.languages.join(', ')}</div>
            <div className="text-xs"><Stars value={c.rating} /> {c.rating.toFixed(1)}</div>
          </div>
          <span aria-hidden className="text-xl text-brown-soft">›</span>
        </Link>
      ) : <div className="mt-3"><Alert kind="info">Makan Kaki is matching a creator by language and cuisine. You'll get a WhatsApp when one accepts.</Alert></div>}

      <div className="card mt-3 space-y-2 text-sm">
        <div><span className="font-semibold">Dishes:</span> {dishes.map((d) => `${d!.emoji} ${d!.name}`).join(', ')}</div>
        {v.dos && <div><span className="font-semibold">Do's:</span> {v.dos}</div>}
        {v.donts && <div><span className="font-semibold">Don'ts:</span> {v.donts}</div>}
        <div><span className="font-semibold">Languages:</span> {v.languagesWanted.join(', ')}</div>
        {v.postUrl && <div><span className="font-semibold">Post:</span> <a className="link break-all" href={v.postUrl} target="_blank" rel="noreferrer">{v.postUrl}</a> · {v.views.toLocaleString('en-SG')} views</div>}
      </div>

      {v.status === 'offered' && c && (
        <button className="btn-ok mt-4 w-full" onClick={() => { update((s) => { s.visits.find((q) => q.id === v.id)!.status = 'accepted' }); whatsapp(c.name, `${outlet.name} approved your visit on ${fmtDate(v.date)} at ${fmtTime(v.time)}. See you there!`) }}>Approve {c.handle}</button>
      )}
      {live && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="btn-secondary min-h-[48px] text-base" onClick={() => setResched(!resched)}>Reschedule</button>
          <button className="btn-secondary min-h-[48px] text-base" onClick={cancel}>Cancel visit</button>
        </div>
      )}
      {resched && (
        <div className="card mt-3 space-y-3">
          <Field label="New date"><input type="date" className="input" min={addDays(sgToday(), 1)} value={newDate} onChange={(e) => setNewDate(e.target.value)} /></Field>
          <button className="btn-primary w-full" onClick={() => { update((s) => { s.visits.find((q) => q.id === v.id)!.date = newDate }); if (c) whatsapp(c.name, `${outlet.name} moved your visit to ${fmtDate(newDate)} at ${fmtTime(v.time)}.`); setResched(false) }}>Save new date</button>
        </div>
      )}
      {(v.status === 'verified' || v.status === 'posted') && c && (
        <div className="card mt-4">
          <div className="mb-2 font-semibold">Rate this visit</div>
          <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => (
            <button key={n} aria-label={`${n} stars`} onClick={() => update((s) => { s.visits.find((q) => q.id === v.id)!.ownerRating = n })}
              className={`text-4xl ${n <= (v.ownerRating ?? 0) ? 'text-orange' : 'text-brown-line'}`}>★</button>
          ))}</div>
          <p className="mt-1 text-xs text-brown-soft">Low ratings or no-shows reduce the creator's future offers.</p>
        </div>
      )}
    </>
  )
}

// ---------- 7. Creator profile (owner view) ----------

export function OwnerCreatorProfile() {
  const { id } = useParams()
  const { state } = useDemo()
  const c = state.creators.find((x) => x.id === id)
  if (!c) return <PageTitle title="Creator not found" back="/owner/visits" />
  const st = creatorStats(state, c)
  return (
    <>
      <PageTitle title={c.handle} back="/owner/visits" subtitle={`${c.name} · ${c.platform}`} />
      <div className="card flex items-center gap-4">
        <Avatar name={c.handle} size={64} />
        <div className="grid flex-1 grid-cols-2 gap-2 text-sm">
          <div><div className="text-brown-soft">Followers</div><div className="font-bold">{c.followers.toLocaleString('en-SG')}</div></div>
          <div><div className="text-brown-soft">Rating</div><div className="font-bold"><Stars value={c.rating} /> {c.rating ? c.rating.toFixed(1) : 'New'}</div></div>
          <div><div className="text-brown-soft">Languages</div><div className="font-bold">{c.languages.join(', ')}</div></div>
          <div><div className="text-brown-soft">Cuisines</div><div className="font-bold">{c.cuisines.join(', ')}</div></div>
        </div>
      </div>
      <h2 className="mt-6 mb-3 text-lg font-bold">Past orders per video</h2>
      {st.perVideo.length === 0 ? <Empty>No past videos yet.</Empty> : (
        <div className="space-y-3">{st.perVideo.map((v) => (
          <div key={v.visit.id} className="card flex items-center justify-between">
            <div><div className="font-bold">{v.outlet.name}</div><div className="text-xs text-brown-soft">{fmtDate(v.visit.date)} · {v.visit.views.toLocaleString('en-SG')} views</div></div>
            <div className="text-right"><div className="font-heading text-xl font-bold">{v.orders}</div><div className="text-xs text-brown-soft">orders</div></div>
          </div>
        ))}</div>
      )}
    </>
  )
}

// ---------- 10. Payouts ----------

export function OwnerPayouts() {
  const { state } = useDemo()
  const outlet = useOutlet()
  const today = sgToday()
  const todays = state.orders.filter((o) => o.outletId === outlet.id && new Date(o.createdAt).toISOString().slice(0, 10) >= today && o.status === 'completed')
  const pending = r2(todays.reduce((t, o) => t + ownerNetOf(o), 0))
  const history = state.payouts.filter((p) => p.to === 'owner' && p.targetId === outlet.id)
  const recent = state.orders.filter((o) => o.outletId === outlet.id && ['completed', 'refunded'].includes(o.status)).sort((a, b) => b.number - a.number).slice(0, 15)
  return (
    <>
      <PageTitle title="Payouts" subtitle={`Order value minus 10% commission on coded orders, sent to PayNow ${outlet.paynow} the next working day.`} />
      <div className="card">
        <div className="text-sm font-semibold text-brown-soft">Next payout · {fmtDate(addDays(today, 1))}</div>
        <div className="font-heading text-3xl font-extrabold">{sgd(pending)}</div>
        <div className="text-xs text-brown-soft">From {todays.length} completed orders today</div>
      </div>
      <h2 className="mt-6 mb-3 text-lg font-bold">Recent orders</h2>
      <div className="card divide-y divide-brown-line p-0">
        {recent.map((o) => (
          <div key={o.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <div><span className="font-bold">#{o.number}</span> <span className="text-brown-soft">{o.code ?? 'no code'}</span>{o.status === 'refunded' && <span className="ml-1 text-bad">refunded</span>}</div>
            <div className="text-right"><div>{sgd(o.total)}{commissionOf(o) > 0 && <span className="text-brown-soft"> − {sgd(commissionOf(o))}</span>}</div><div className="text-xs font-semibold text-ok">{sgd(ownerNetOf(o))} to you</div></div>
          </div>
        ))}
      </div>
      <h2 className="mt-6 mb-3 text-lg font-bold">Payout history</h2>
      {history.length === 0 ? <Empty>No payouts yet.</Empty> : (
        <div className="space-y-2">{history.map((p) => (
          <div key={p.id} className="card flex items-center justify-between py-3"><div><div className="font-semibold">{fmtDate(p.date)}</div><div className="text-xs text-brown-soft">{p.note}</div></div><div className="flex items-center gap-2"><span className="font-heading font-bold">{sgd(p.amount)}</span><StatusChip status={p.status} /></div></div>
        ))}</div>
      )}
      <button className="btn-secondary mt-4 w-full" onClick={() => downloadCsv(`${outlet.name}-orders.csv`, ['order', 'date', 'creator code', 'order value (SGD)', 'commission (SGD)', 'paid to you (SGD)', 'status'],
        state.orders.filter((o) => o.outletId === outlet.id).map((o) => [o.number, o.createdAt.slice(0, 10), o.code ?? '', o.total.toFixed(2), commissionOf(o).toFixed(2), ownerNetOf(o).toFixed(2), o.status]))}>Download CSV</button>
    </>
  )
}

// ---------- More: menu, QR, staff, plan, settings ----------

export function OwnerMore() {
  const { t } = useLang()
  const items: [string, string, string, string][] = [
    ['/owner/more/menu', '📋', t('Menu'), 'Dishes, prices, sold out'],
    ['/owner/more/qr', '🔳', t('QR stand'), 'Your diner checkout QR'],
    ['/owner/more/staff', '👥', t('Staff accounts'), 'Helpers who manage orders'],
    ['/owner/more/plan', '💳', t('Plan and billing'), 'Plan, HitPay, receipts'],
    ['/owner/more/settings', '⚙️', t('Settings and support'), 'Language, hours, WhatsApp chat'],
  ]
  return (
    <>
      <PageTitle title={t('More')} />
      <div className="space-y-2">{items.map(([to, e, label, note]) => (
        <Link key={to} to={to} className="card flex min-h-[64px] items-center gap-3">
          <span className="text-2xl" aria-hidden>{e}</span>
          <span className="flex-1"><span className="block font-bold">{label}</span><span className="block text-sm text-brown-soft">{note}</span></span>
          <span aria-hidden className="text-xl text-brown-soft">›</span>
        </Link>
      ))}</div>
    </>
  )
}

export function OwnerMenu() {
  const { state, update } = useDemo()
  const { t } = useLang()
  const outlet = useOutlet()
  const menu = state.dishes.filter((d) => d.outletId === outlet.id)
  const [f, setF] = useState({ name: '', price: '', emoji: '🍽', desc: '' })
  const set = (id: string, patch: Partial<(typeof menu)[number]>) => update((s) => { Object.assign(s.dishes.find((d) => d.id === id)!, patch) })
  return (
    <>
      <PageTitle title={t('Menu')} back="/owner/more" subtitle="This menu feeds your diner checkout. Tap to mark items sold out." />
      {menu.length === 0 && <div className="mb-4"><Alert kind="info">Welcome! Add your dishes so diners can order.</Alert></div>}
      <div className="space-y-2">{menu.map((d) => (
        <div key={d.id} className={`card flex items-center gap-3 py-3 ${d.soldOut ? 'opacity-60' : ''}`}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cream text-2xl">{d.emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="font-bold">{d.name} {d.signature && <span className="chip bg-orange-soft text-brown">★ Signature</span>}</div>
            <div className="text-sm text-brown-soft">{sgd(d.price)} · {d.desc}</div>
            <button onClick={() => set(d.id, { signature: !d.signature })} className="text-xs font-semibold text-brown-soft underline">{d.signature ? 'Unmark signature' : 'Mark as signature'}</button>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Toggle on={!d.soldOut} onChange={(v) => set(d.id, { soldOut: !v })} label={`${d.name} available`} />
            <span className="text-[10px] font-semibold">{d.soldOut ? t('Sold out') : t('Available')}</span>
          </div>
        </div>
      ))}</div>
      <form className="card mt-4 space-y-3" onSubmit={(e) => {
        e.preventDefault()
        update((s) => { s.dishes.push({ id: `d${Date.now()}`, outletId: outlet.id, name: f.name, desc: f.desc, price: Number(f.price), emoji: f.emoji || '🍽', signature: false, soldOut: false }) })
        setF({ name: '', price: '', emoji: '🍽', desc: '' })
      }}>
        <h2 className="font-bold">{t('Add dish')}</h2>
        <div className="grid grid-cols-[64px_1fr] gap-2">
          <input className="input text-center text-2xl" value={f.emoji} onChange={(e) => setF({ ...f, emoji: e.target.value })} aria-label="Photo (emoji in this demo)" />
          <input className="input" required placeholder="Dish name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-2">
          <input className="input" required inputMode="decimal" placeholder="S$ price" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/[^\d.]/g, '') })} />
          <input className="input" placeholder="Short description" value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} />
        </div>
        <DemoNote>Photos are shown as emoji in this demo.</DemoNote>
        <button className="btn-primary w-full" disabled={!f.name || !Number(f.price)}>{t('Add dish')}</button>
      </form>
    </>
  )
}

export function checkoutUrl(outletId: string, code?: string) {
  return `${window.location.origin}${import.meta.env.BASE_URL}order/${outletId}${code ? `?code=${code}` : ''}`
}

export function QrImage({ url, size = 220 }: { url: string; size?: number }) {
  const [src, setSrc] = useState('')
  useEffect(() => { QRCode.toDataURL(url, { margin: 1, width: 600, color: { dark: '#3B2314', light: '#FFFFFF' } }).then(setSrc) }, [url])
  return src ? <img src={src} alt={`QR code for ${url}`} width={size} height={size} className="rounded-lg" /> : <div style={{ width: size, height: size }} className="animate-pulse rounded-lg bg-cream" />
}

export function OwnerQr() {
  const { update, whatsapp } = useDemo()
  const { t } = useLang()
  const outlet = useOutlet()
  const url = checkoutUrl(outlet.id)
  async function download() {
    const data = await QRCode.toDataURL(url, { margin: 2, width: 1200, color: { dark: '#3B2314', light: '#FFFFFF' } })
    const a = document.createElement('a'); a.href = data; a.download = `${outlet.name}-qr.png`; a.click()
  }
  return (
    <>
      <PageTitle title={t('QR stand')} back="/owner/more" subtitle="One QR per outlet, linked to your checkout. Scan it with your phone to try it." />
      <div className="mx-auto max-w-xs rounded-[28px] bg-orange p-5 text-center text-white shadow-card">
        <div className="font-heading text-xl font-extrabold">Scan to order</div>
        <div className="text-sm opacity-90">扫码点餐 · Imbas untuk pesan · ஸ்கேன் செய்து ஆர்டர்</div>
        <div className="mx-auto mt-3 w-fit rounded-2xl bg-white p-3"><QrImage url={url} /></div>
        <div className="mt-3 font-heading text-lg font-bold">{outlet.name}</div>
        <div className="text-xs opacity-90">Have a creator code? Enter it at checkout · Pay by PayNow</div>
      </div>
      <p className="mt-3 break-all text-center text-xs text-brown-soft">{url}</p>
      <div className="mt-4 grid gap-2">
        <button className="btn-primary" onClick={download}>Download QR (PNG)</button>
        <button className="btn-secondary" disabled={outlet.qrRequested} onClick={() => { update((s) => { s.outlets.find((o) => o.id === outlet.id)!.qrRequested = true }); whatsapp(outlet.name, 'Your printed QR stand is on the way. Delivery in 3–5 working days.') }}>
          {outlet.qrRequested ? 'Printed stand requested ✓' : 'Request a printed stand'}
        </button>
        <Link className="btn-secondary" to={`/order/${outlet.id}`}>Open the checkout</Link>
      </div>
    </>
  )
}

export function OwnerStaff() {
  const { state, update, whatsapp } = useDemo()
  const { t } = useLang()
  const outlet = useOutlet()
  const staff = state.staff.filter((s) => s.outletId === outlet.id)
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  return (
    <>
      <PageTitle title={t('Staff accounts')} back="/owner/more" subtitle="Helpers can manage orders only. They cannot see payouts, billing or the plan." />
      <div className="space-y-2">{staff.map((s) => (
        <div key={s.id} className="card flex items-center gap-3 py-3">
          <Avatar name={s.name} />
          <div className="flex-1"><div className="font-bold">{s.name}</div><div className="text-sm text-brown-soft">+65 {s.mobile} · Orders only</div></div>
          <button className="text-sm font-semibold text-brown-soft underline" onClick={() => update((st) => { st.staff = st.staff.filter((x) => x.id !== s.id) })}>Remove</button>
        </div>
      ))}</div>
      {staff.length === 0 && <Empty>No staff yet.</Empty>}
      <form className="card mt-4 space-y-3" onSubmit={(e) => {
        e.preventDefault()
        update((st) => { st.staff.push({ id: `s${Date.now()}`, outletId: outlet.id, name, mobile }) })
        whatsapp(name, `${outlet.name} added you as staff on Makan Kaki. Log in with this number to manage orders.`)
        setName(''); setMobile('')
      }}>
        <Field label="Name"><input className="input" required value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label={t('Mobile number')}><input className="input" required inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="9123 4567" /></Field>
        <button className="btn-primary w-full">Add helper</button>
      </form>
    </>
  )
}

export function OwnerPlan() {
  const { update, whatsapp } = useDemo()
  const { t } = useLang()
  const outlet = useOutlet()
  const plan = PLANS[outlet.plan]
  const today = sgToday()
  return (
    <>
      <PageTitle title={t('Plan and billing')} back="/owner/more" />
      <div className="card">
        <div className="flex items-baseline justify-between"><span className="font-heading text-xl font-bold">{plan.label} plan</span><span className="font-heading text-xl font-bold">S${plan.fee}/mo</span></div>
        <div className="text-sm text-brown-soft">{plan.visits} visits a month · {visitsLeft(outlet)} left{outlet.rollover ? ` (incl. ${outlet.rollover} rolled over)` : ''} · 10% on coded orders</div>
        <div className="mt-2 text-sm">Auto-renews {fmtDate(addDays(today, 12))} via HitPay</div>
      </div>
      <h2 className="mt-6 mb-3 text-lg font-bold">Change plan</h2>
      <div className="grid grid-cols-2 gap-3">{(Object.keys(PLANS) as PlanId[]).map((p) => (
        <button key={p} disabled={p === outlet.plan} onClick={() => { update((s) => { s.outlets.find((o) => o.id === outlet.id)!.plan = p }); whatsapp(outlet.name, `You're now on the ${PLANS[p].label} plan (S$${PLANS[p].fee}/month) from your next billing date.`) }}
          className={`card border-2 text-left ${p === outlet.plan ? 'border-orange' : 'border-transparent'}`}>
          <div className="font-bold">{PLANS[p].label}</div><div className="text-sm text-brown-soft">S${PLANS[p].fee}/mo · {PLANS[p].visits} visits</div>
          <div className="mt-1 text-xs font-semibold">{p === outlet.plan ? 'Current' : 'Switch'}</div>
        </button>
      ))}</div>
      <h2 className="mt-6 mb-3 text-lg font-bold">Receipts</h2>
      <div className="card divide-y divide-brown-line p-0 text-sm">
        {[0, 1].map((i) => (
          <div key={i} className="flex justify-between px-4 py-3">
            <span>{fmtDate(addDays(today, -18 - i * 30))} · HitPay</span>
            <span className="font-semibold">{sgd(i === 1 ? plan.fee * PILOT_DISCOUNT : plan.fee)}{i === 1 ? ' (pilot 50% off)' : ''}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-brown-soft">Receipts are sent by email and WhatsApp.</p>
    </>
  )
}

export function OwnerSettings() {
  const { update, whatsapp } = useDemo()
  const { t } = useLang()
  const outlet = useOutlet()
  const [hours, setHours] = useState(outlet.hours)
  const [chat, setChat] = useState<{ me: boolean; text: string }[]>([{ me: false, text: 'Hi! This is the Makan Kaki team. How can we help?' }])
  const [msg, setMsg] = useState('')
  return (
    <>
      <PageTitle title={t('Settings and support')} back="/owner/more" />
      <div className="card space-y-4">
        <div className="flex items-center justify-between"><span className="font-semibold">{t('Language')}</span><LanguagePicker /></div>
        <Field label="Opening hours">
          <div className="flex gap-2"><input className="input" value={hours} onChange={(e) => setHours(e.target.value)} />
            <button className="btn-secondary min-h-[52px] px-4 text-base" onClick={() => update((s) => { s.outlets.find((o) => o.id === outlet.id)!.hours = hours })}>{t('Save')}</button></div>
        </Field>
        <div className="flex items-center justify-between gap-3">
          <div><div className="font-semibold">Pause creator visits</div><div className="text-xs text-brown-soft">For holidays or renovations. Orders still work.</div></div>
          <Toggle on={outlet.paused} label="Pause creator visits" onChange={(v) => { update((s) => { s.outlets.find((o) => o.id === outlet.id)!.paused = v }); if (v) whatsapp(outlet.name, 'Creator visits are paused. Turn them back on any time in Settings.') }} />
        </div>
        <Link to="/owner/more/plan" className="flex items-center justify-between font-semibold"><span>Change plan</span><span aria-hidden>›</span></Link>
      </div>
      <h2 className="mt-6 mb-3 text-lg font-bold">WhatsApp the Makan Kaki team</h2>
      <div className="rounded-2xl bg-[#ECE5DD] p-3">
        <div className="space-y-2">{chat.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm shadow-sm ${m.me ? 'ml-auto bg-[#DCF8C6]' : 'bg-white'}`}>{m.text}</div>
        ))}</div>
        <form className="mt-3 flex gap-2" onSubmit={(e) => {
          e.preventDefault(); if (!msg.trim()) return
          setChat((c) => [...c, { me: true, text: msg }]); setMsg('')
          setTimeout(() => setChat((c) => [...c, { me: false, text: "Thanks! We'll get back to you within 1 working hour. (Demo reply)" }]), 900)
        }}>
          <input className="input" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Type a message" />
          <button className="btn-ok min-h-[52px] px-4 text-base">Send</button>
        </form>
      </div>
    </>
  )
}

// Small helper used by the admin app as well.
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return <><h2 className="mt-6 mb-3 text-lg font-bold">{title}</h2>{children}</>
}

export function useOutletMemo(id: string) {
  const { state } = useDemo()
  return useMemo(() => state.outlets.find((o) => o.id === id), [state.outlets, id])
}
