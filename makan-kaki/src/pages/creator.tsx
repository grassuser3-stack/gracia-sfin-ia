import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDemo, creatorStats, sgd, type Session } from '../demo/store'
import { useLang } from '../demo/i18n'
import { CREATOR_SHARE, VISIT_FEE, type Creator } from '../demo/data'
import { fmtDate, fmtDateLong, fmtTime } from '../lib/format'
import { Alert, Avatar, DemoNote, Empty, Field, PageTitle, Stars, Stat, StatusChip } from '../components/ui'
import { QrImage, checkoutUrl, downloadCsv, timeAgo } from './owner'

function useCreator(): Creator {
  const { state, session } = useDemo()
  const id = (session as Exclude<Session, null>).id
  return state.creators.find((c) => c.id === id) ?? state.creators[0]
}

function PendingApproval({ c }: { c: Creator }) {
  return (
    <>
      <PageTitle title="Profile and approval" />
      <div className="card text-center">
        <div className="text-4xl" aria-hidden>⏳</div>
        <h2 className="mt-2 text-xl font-bold">{c.status === 'rejected' ? "Your application wasn't approved" : 'Waiting for approval'}</h2>
        <p className="mt-1 text-brown-soft">
          {c.status === 'rejected' ? 'Contact the Makan Kaki team on WhatsApp if you think this is a mistake.' : 'Makan Kaki checks for real followers, food content and engagement. This usually takes 1–2 working days.'}
        </p>
      </div>
      <div className="card mt-3 space-y-2 text-sm">
        <div className="flex items-center gap-3"><Avatar name={c.handle} /><div><div className="font-bold">{c.handle}</div><div className="text-brown-soft">{c.platform} · {c.followers.toLocaleString('en-SG')} followers</div></div></div>
        <div><span className="font-semibold">Languages:</span> {c.languages.join(', ')}</div>
        <div><span className="font-semibold">Cuisines:</span> {c.cuisines.join(', ')}</div>
        <div><span className="font-semibold">Sample posts:</span> {c.samplePosts.length}</div>
        <div><span className="font-semibold">PayNow:</span> {c.paynow || <span className="text-bad">not added yet</span>}</div>
      </div>
      <div className="mt-3"><DemoNote>Log in as the Admin to approve this creator.</DemoNote></div>
    </>
  )
}

const PAY_TEXT = `S$${VISIT_FEE} + 20% of commission`

// ---------- 4. Visit offers ----------

export function CreatorOffers() {
  const { state } = useDemo()
  const { t } = useLang()
  const c = useCreator()
  const [area, setArea] = useState('All')
  if (c.status !== 'approved') return <PendingApproval c={c} />
  const offers = state.visits.filter((v) => v.status === 'offered' && (v.creatorId === null || v.creatorId === c.id))
  const areas = ['All', ...new Set(offers.map((v) => state.outlets.find((o) => o.id === v.outletId)!.area))]
  const shown = offers.filter((v) => area === 'All' || state.outlets.find((o) => o.id === v.outletId)!.area === area)
  return (
    <>
      <PageTitle title={t('Visit offers')} subtitle="Paid visits across Singapore. Free meal included." />
      {!c.paynow && <div className="mb-4"><Alert kind="bad">Add your PayNow number before your first visit. <Link to="/creator/profile" className="underline">Add it</Link></Alert></div>}
      <div className="mb-4 flex gap-2 overflow-x-auto">{areas.map((a) => (
        <button key={a} onClick={() => setArea(a)} className={`min-h-[40px] shrink-0 rounded-full border-2 px-4 text-sm font-semibold ${area === a ? 'border-orange bg-orange-soft' : 'border-brown-line bg-white'}`}>{a}</button>
      ))}</div>
      {shown.length === 0 ? <Empty>No offers right now. New ones arrive by WhatsApp.</Empty> : (
        <div className="space-y-3">{shown.map((v) => {
          const o = state.outlets.find((x) => x.id === v.outletId)!
          const dishes = v.dishes.map((d) => state.dishes.find((x) => x.id === d)!).filter(Boolean)
          const forMe = v.creatorId === c.id
          return (
            <Link key={v.id} to={`/creator/offers/${v.id}`} className={`card block ${forMe ? 'ring-2 ring-ok' : ''}`}>
              {forMe && <div className="mb-2 text-xs font-bold uppercase tracking-wide text-ok">Matched to you</div>}
              <div className="flex items-start gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-orange-soft text-3xl">{dishes[0]?.emoji ?? '🍽'}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-heading text-lg font-bold leading-tight">{o.name}</div>
                  <div className="text-sm text-brown-soft">{o.area} · {o.cuisine}</div>
                  <div className="mt-1 text-sm font-semibold">{fmtDate(v.date)} · {fmtTime(v.time)}</div>
                </div>
                <div className="text-right"><div className="font-heading font-bold text-ok">S${VISIT_FEE}</div><div className="text-[10px] text-brown-soft">+ 20% of<br />commission</div></div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {dishes.map((d) => <span key={d.id} className="chip bg-cream text-brown">{d.emoji} {d.name}</span>)}
                {v.languagesWanted.map((l) => <span key={l} className="chip bg-ok-soft text-ok">{l}</span>)}
              </div>
            </Link>
          )
        })}</div>
      )}
    </>
  )
}

// ---------- 5. Accept and book ----------

export function OfferDetail() {
  const { id } = useParams()
  const { state, update, whatsapp } = useDemo()
  const { t } = useLang()
  const c = useCreator()
  const navigate = useNavigate()
  const v = state.visits.find((x) => x.id === id)
  const [time, setTime] = useState(v?.time ?? '11:00')
  if (!v || v.status !== 'offered') return <><PageTitle title="Offer no longer available" back="/creator" /><Empty>Another creator took this visit, or it was cancelled.</Empty></>
  const o = state.outlets.find((x) => x.id === v.outletId)!
  const dishes = v.dishes.map((d) => state.dishes.find((x) => x.id === d)!).filter(Boolean)
  const [h] = v.time.split(':').map(Number)
  const slots = [h - 1, h, h + 1].filter((x) => x >= 7 && x <= 20).map((x) => `${String(x).padStart(2, '0')}:${v.time.split(':')[1]}`)

  function accept() {
    update((s) => { const x = s.visits.find((q) => q.id === v!.id)!; x.status = 'accepted'; x.creatorId = c.id; x.time = time })
    whatsapp(c.name, `Booked! ${o.name}, ${fmtDate(v!.date)} at ${fmtTime(time)}. We'll remind you 24 hours and 2 hours before. Your brief is in the app.`)
    whatsapp(o.name, `${c.handle} (${c.followers.toLocaleString('en-SG')} followers) accepted your visit on ${fmtDate(v!.date)} at ${fmtTime(time)}.`)
    navigate(`/creator/visits/${v!.id}`)
  }
  return (
    <>
      <PageTitle title={o.name} back="/creator" subtitle={`${o.address}, ${o.unit}`} />
      <div className="card space-y-3">
        <div className="flex justify-between"><span className="font-semibold">{t('Pay')}</span><span className="font-heading font-bold text-ok">{PAY_TEXT}</span></div>
        <div className="text-xs text-brown-soft">Plus a free meal on check-in. Commission share = 20% of the 10% Makan Kaki earns on orders with your code.</div>
        <div><span className="font-semibold">{t('Dishes to feature')}:</span> {dishes.map((d) => `${d.emoji} ${d.name}`).join(', ')}</div>
        <div><span className="font-semibold">{t('Languages wanted')}:</span> {v.languagesWanted.join(', ')}</div>
      </div>
      <div className="card mt-3">
        <div className="label">{fmtDateLong(v.date)} · pick a time</div>
        <div className="grid grid-cols-3 gap-2">{slots.map((s) => (
          <button key={s} onClick={() => setTime(s)} className={`min-h-[48px] rounded-xl border-2 font-semibold ${time === s ? 'border-orange bg-orange-soft' : 'border-brown-line bg-white'}`}>{fmtTime(s)}</button>
        ))}</div>
      </div>
      <p className="mt-3 text-xs text-brown-soft">WhatsApp reminders 24 hours and 2 hours before. You can cancel free up to 24 hours ahead; later cancellations or no-shows give a strike.</p>
      <button className="btn-primary mt-4 w-full" disabled={!c.paynow} onClick={accept}>{t('Accept visit')}</button>
      {!c.paynow && <p className="mt-2 text-center text-sm text-bad">Add your PayNow number first.</p>}
    </>
  )
}

// ---------- My visits + 6. Visit brief ----------

export function CreatorVisits() {
  const { state } = useDemo()
  const { t } = useLang()
  const c = useCreator()
  if (c.status !== 'approved') return <PendingApproval c={c} />
  const mine = state.visits.filter((v) => v.creatorId === c.id && v.status !== 'offered').sort((a, b) => b.date.localeCompare(a.date))
  return (
    <>
      <PageTitle title={t('My visits')} />
      {mine.length === 0 ? <Empty>No visits yet. <Link className="link" to="/creator">See offers</Link></Empty> : (
        <div className="space-y-3">{mine.map((v) => {
          const o = state.outlets.find((x) => x.id === v.outletId)!
          return (
            <Link key={v.id} to={`/creator/visits/${v.id}`} className="card flex items-center gap-3">
              <div className="min-w-0 flex-1"><div className="font-bold">{o.name}</div><div className="text-sm text-brown-soft">{fmtDate(v.date)} · {fmtTime(v.time)} · {o.area}</div></div>
              <StatusChip status={v.status} />
            </Link>
          )
        })}</div>
      )}
    </>
  )
}

export function VisitBrief() {
  const { id } = useParams()
  const { state, update, whatsapp } = useDemo()
  const { t } = useLang()
  const c = useCreator()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const v = state.visits.find((x) => x.id === id && x.creatorId === c.id)
  if (!v) return <PageTitle title="Visit not found" back="/creator/visits" />
  const o = state.outlets.find((x) => x.id === v.outletId)!
  const dishes = v.dishes.map((d) => state.dishes.find((x) => x.id === d)!).filter(Boolean)
  const link = checkoutUrl(o.id, c.code)
  const hoursUntil = (new Date(`${v.date}T${v.time}:00+08:00`).getTime() - Date.now()) / 3600000

  function cancel() {
    const late = hoursUntil < 24
    if (!window.confirm(late ? 'Less than 24 hours to go: cancelling now gives you a strike. Three strikes pauses your account. Cancel anyway?' : 'Cancel this visit for free?')) return
    update((s) => {
      const x = s.visits.find((q) => q.id === v!.id)!; x.status = 'offered'; x.creatorId = null
      if (late) { const me = s.creators.find((q) => q.id === c.id)!; me.strikes += 1; if (me.strikes >= 3) me.status = 'paused' }
    })
    whatsapp(o.name, `${c.handle} cancelled the visit on ${fmtDate(v!.date)}. We're finding another creator.`)
    navigate('/creator/visits')
  }

  return (
    <>
      <PageTitle title={t('Visit brief')} back="/creator/visits" subtitle={`${o.name} · ${fmtDateLong(v.date)}, ${fmtTime(v.time)}`} />
      <div className="mb-3 flex items-center justify-between"><StatusChip status={v.status} /><span className="text-sm text-brown-soft">{o.address}, {o.unit}</span></div>
      <div className="card space-y-3">
        <div><div className="label">{t('Dishes to feature')}</div><div className="flex flex-wrap gap-2">{dishes.map((d) => <span key={d.id} className="chip bg-orange-soft px-3 py-1 text-sm text-brown">{d.emoji} {d.name}</span>)}</div></div>
        {v.dos && <div><div className="label">✅ {t("Do's")}</div><p className="text-sm">{v.dos}</p></div>}
        {v.donts && <div><div className="label">⛔ {t("Don'ts")}</div><p className="text-sm">{v.donts}</p></div>}
        <div><div className="label">{t('Languages wanted')}</div><p className="text-sm">{v.languagesWanted.join(', ')}</p></div>
      </div>
      <div className="card mt-3">
        <div className="label">Show this in your video and caption</div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white p-1 ring-1 ring-brown-line"><QrImage url={link} size={96} /></div>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-2xl font-bold">{c.code}</div>
            <div className="truncate text-xs text-brown-soft">{link}</div>
            <button className="mt-1 text-sm font-semibold underline" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true) } catch { /* blocked */ } }}>{copied ? t('Copied') : `${t('Copy')} link`}</button>
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-cream px-3 py-2 text-sm">Include a clear paid-post label, e.g. <b>#ad</b> or <b>#MakanKakiPartner</b></div>
      </div>
      <div className="mt-4 grid gap-2">
        {v.status === 'accepted' && <Link to={`/creator/visits/${v.id}/checkin`} className="btn-primary">📷 {t('Check in')} on arrival</Link>}
        {v.status === 'checked_in' && <Link to={`/creator/visits/${v.id}/post`} className="btn-primary">{t('Submit post')}</Link>}
        {v.status === 'posted' && <Alert kind="info">Makan Kaki is checking your post.</Alert>}
        {v.status === 'verified' && <Alert kind="ok">Post verified. Your S${VISIT_FEE} visit fee is in this month's payout.</Alert>}
        {v.status === 'accepted' && <button className="btn-secondary" onClick={cancel}>Cancel visit</button>}
      </div>
    </>
  )
}

// ---------- 7. Check in ----------

export function CheckIn() {
  const { id } = useParams()
  const { state, update, whatsapp } = useDemo()
  const { t } = useLang()
  const c = useCreator()
  const [phase, setPhase] = useState<'scan' | 'scanning' | 'done'>('scan')
  const v = state.visits.find((x) => x.id === id && x.creatorId === c.id)
  useEffect(() => {
    if (phase !== 'scanning' || !v) return
    const tm = setTimeout(() => {
      update((s) => { const x = s.visits.find((q) => q.id === v.id)!; x.status = 'checked_in'; x.checkedInAt = new Date().toISOString() })
      const o = state.outlets.find((x) => x.id === v.outletId)!
      whatsapp(o.name, `${c.handle} has checked in for their visit. Please serve their free meal: ${v.dishes.map((d) => state.dishes.find((x) => x.id === d)?.name).join(', ')}.`)
      whatsapp(c.name, 'Checked in! Remember to post within 48 hours with your code and #ad.')
      setPhase('done')
    }, 1600)
    return () => clearTimeout(tm)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!v) return <PageTitle title="Visit not found" back="/creator/visits" />
  const o = state.outlets.find((x) => x.id === v.outletId)!
  if (v.status !== 'accepted' && phase !== 'done') return (
    <><PageTitle title={t('Check in')} back={`/creator/visits/${v.id}`} /><Alert kind="ok">You're already checked in at {o.name}.</Alert>
      <Link to={`/creator/visits/${v.id}/post`} className="btn-primary mt-4 w-full">{t('Submit post')}</Link></>
  )
  return (
    <>
      <PageTitle title={t('Check in')} back={`/creator/visits/${v.id}`} subtitle={`Scan the QR stand at ${o.name}`} />
      {phase !== 'done' ? (
        <>
          <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl bg-brown">
            <div className="absolute inset-8 rounded-2xl border-4 border-white/80" />
            <div className="absolute inset-x-8 top-1/2 h-1 animate-pulse bg-orange" />
            <div className="absolute inset-0 flex items-center justify-center text-center text-sm font-semibold text-white/80">{phase === 'scanning' ? 'Reading QR…' : 'Point your camera at the stall QR'}</div>
          </div>
          <button className="btn-primary mt-5 w-full" disabled={phase === 'scanning'} onClick={() => setPhase('scanning')}>{phase === 'scanning' ? 'Scanning…' : 'Scan QR (simulated)'}</button>
          <div className="mt-3"><DemoNote>The camera is simulated. Tapping the button acts as a successful scan.</DemoNote></div>
        </>
      ) : (
        <div className="card text-center">
          <div className="text-5xl" aria-hidden>🎉</div>
          <h2 className="mt-2 text-xl font-bold">Visit confirmed</h2>
          <p className="mt-1 text-brown-soft">Your free meal is released. Show this screen at the counter.</p>
          <div className="mt-3 rounded-xl bg-ok-soft px-3 py-3 text-ok"><b>Free meal:</b> {v.dishes.map((d) => state.dishes.find((x) => x.id === d)?.name).join(' + ')}</div>
          <p className="mt-3 text-sm">Post within <b>48 hours</b> with your code <b className="font-mono">{c.code}</b> and <b>#ad</b>.</p>
          <Link to={`/creator/visits/${v.id}/post`} className="btn-primary mt-4 w-full">{t('Submit post')}</Link>
        </div>
      )}
    </>
  )
}

// ---------- 8. Submit post ----------

export function SubmitPost() {
  const { id } = useParams()
  const { state, update, whatsapp } = useDemo()
  const { t } = useLang()
  const c = useCreator()
  const navigate = useNavigate()
  const v = state.visits.find((x) => x.id === id && x.creatorId === c.id)
  const [url, setUrl] = useState('')
  const [hasCode, setHasCode] = useState(false)
  const [hasLabel, setHasLabel] = useState(false)
  const [checking, setChecking] = useState(false)
  if (!v) return <PageTitle title="Visit not found" back="/creator/visits" />
  const o = state.outlets.find((x) => x.id === v.outletId)!
  const left = v.checkedInAt ? Math.max(0, 48 - (Date.now() - new Date(v.checkedInAt).getTime()) / 3600000) : 48
  if (['posted', 'verified'].includes(v.status)) return (
    <><PageTitle title={t('Submit post')} back={`/creator/visits/${v.id}`} /><Alert kind="ok">Post submitted for {o.name}. {v.status === 'verified' ? 'Verified ✓' : 'Checking…'}</Alert>
      <Link className="btn-secondary mt-4 w-full" to="/creator/performance">See performance</Link></>
  )
  if (v.status !== 'checked_in') return (
    <><PageTitle title={t('Submit post')} back={`/creator/visits/${v.id}`} /><Alert kind="info">Check in at {o.name} first, then post within 48 hours.</Alert>
      <Link className="btn-primary mt-4 w-full" to={`/creator/visits/${v.id}/checkin`}>{t('Check in')}</Link></>
  )
  const okUrl = /^https?:\/\/\S+\.\S+/.test(url.trim())

  function submit() {
    setChecking(true)
    update((s) => { const x = s.visits.find((q) => q.id === v!.id)!; x.status = 'posted'; x.postUrl = url.trim(); x.postedAt = new Date().toISOString() })
    setTimeout(() => {
      update((s) => { const x = s.visits.find((q) => q.id === v!.id)!; x.status = 'verified'; x.checks = { link: true, code: true, label: true }; x.views = 2400 })
      whatsapp(c.name, `Your post for ${o.name} is verified ✓. S$${VISIT_FEE} visit fee added to this month's payout.`)
      whatsapp(o.name, `${c.handle} posted their video for you: ${url.trim()}`)
      navigate(`/creator/visits/${v!.id}`)
    }, 1800)
  }

  return (
    <>
      <PageTitle title={t('Submit post')} back={`/creator/visits/${v.id}`} subtitle={o.name} />
      <div className={`mb-3 rounded-xl px-4 py-3 font-semibold ${left < 12 ? 'bg-bad-soft text-bad' : 'bg-orange-soft'}`}>⏱ {Math.floor(left)} h {Math.floor((left % 1) * 60)} min left to post</div>
      <div className="card space-y-4">
        <Field label="Link to your post"><input className="input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/p/…" /></Field>
        <label className="flex items-center gap-3 font-semibold"><input type="checkbox" className="h-6 w-6 accent-[#D96B27]" checked={hasCode} onChange={(e) => setHasCode(e.target.checked)} /> My caption has my code <span className="font-mono">{c.code}</span></label>
        <label className="flex items-center gap-3 font-semibold"><input type="checkbox" className="h-6 w-6 accent-[#D96B27]" checked={hasLabel} onChange={(e) => setHasLabel(e.target.checked)} /> It has a paid-post label like #ad</label>
      </div>
      {checking && (
        <div className="card mt-3 space-y-1 text-sm">
          <div className="font-semibold">Makan Kaki is checking…</div>
          <div>✓ Link works</div><div>✓ Code {c.code} found</div><div className="animate-pulse">… Paid-post label</div>
        </div>
      )}
      <button className="btn-primary mt-4 w-full" disabled={!okUrl || !hasCode || !hasLabel || checking} onClick={submit}>{checking ? 'Checking…' : t('Submit post')}</button>
      <div className="mt-3"><DemoNote>Post checks are simulated and pass after a moment.</DemoNote></div>
    </>
  )
}

// ---------- 9. Code and link ----------

export function CreatorCode() {
  const { state } = useDemo()
  const { t } = useLang()
  const c = useCreator()
  const [copied, setCopied] = useState('')
  const outlets = [...new Set(state.visits.filter((v) => v.creatorId === c.id && ['checked_in', 'posted', 'verified', 'accepted'].includes(v.status)).map((v) => v.outletId))].map((id) => state.outlets.find((o) => o.id === id)!)
  const copy = async (s: string) => { try { await navigator.clipboard.writeText(s); setCopied(s) } catch { /* blocked */ } }
  return (
    <>
      <PageTitle title={t('My code')} back="/creator/profile" subtitle="One code, works at every outlet you visited. Put it in captions, comments and stories." />
      <div className="card text-center">
        <div className="font-mono text-4xl font-extrabold tracking-wider">{c.code}</div>
        <button className="btn-secondary mt-3 w-full" onClick={() => copy(c.code)}>{copied === c.code ? t('Copied') : `${t('Copy')} code`}</button>
      </div>
      <h2 className="mt-6 mb-3 text-lg font-bold">Your order links</h2>
      <p className="mb-3 text-sm text-brown-soft">Diners who tap your link get your code filled in automatically. Orders count for you for 7 days after they tap.</p>
      <div className="space-y-3">{outlets.map((o) => {
        const url = checkoutUrl(o.id, c.code)
        return (
          <div key={o.id} className="card flex items-center gap-3">
            <QrImage url={url} size={72} />
            <div className="min-w-0 flex-1"><div className="font-bold">{o.name}</div><div className="truncate text-xs text-brown-soft">{url}</div>
              <button className="text-sm font-semibold underline" onClick={() => copy(url)}>{copied === url ? t('Copied') : `${t('Copy')} link`}</button></div>
          </div>
        )
      })}</div>
    </>
  )
}

// ---------- 10. Performance ----------

export function CreatorPerformance() {
  const { state } = useDemo()
  const { t } = useLang()
  const c = useCreator()
  if (c.status !== 'approved') return <PendingApproval c={c} />
  const st = creatorStats(state, c)
  return (
    <>
      <PageTitle title={t('Performance')} subtitle="Your best videos win you more offers." />
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t('Views')} value={<span className="text-xl">{st.views.toLocaleString('en-SG')}</span>} />
        <Stat label={t('Coded orders')} value={<span className="text-xl">{st.orders.length}</span>} />
        <Stat label="Sales" value={<span className="text-xl">{sgd(st.orders.reduce((s, o) => s + o.total, 0))}</span>} />
      </div>
      <h2 className="mt-6 mb-3 text-lg font-bold">Your videos, best first</h2>
      {st.perVideo.length === 0 ? <Empty>No posted videos yet.</Empty> : (
        <div className="space-y-3">{st.perVideo.map((p, i) => (
          <div key={p.visit.id} className="card">
            <div className="flex items-center gap-3">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full font-heading font-bold ${i === 0 ? 'bg-orange text-white' : 'bg-cream'}`}>{i + 1}</span>
              <div className="min-w-0 flex-1"><div className="font-bold">{p.outlet.name}</div><div className="text-xs text-brown-soft">Posted {p.visit.postedAt ? timeAgo(p.visit.postedAt) : ''}</div></div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl bg-cream py-2"><div className="font-bold">{p.visit.views.toLocaleString('en-SG')}</div><div className="text-xs text-brown-soft">views</div></div>
              <div className="rounded-xl bg-cream py-2"><div className="font-bold">{p.orders}</div><div className="text-xs text-brown-soft">orders</div></div>
              <div className="rounded-xl bg-cream py-2"><div className="font-bold">{sgd(p.sales)}</div><div className="text-xs text-brown-soft">sales</div></div>
            </div>
          </div>
        ))}</div>
      )}
    </>
  )
}

// ---------- 11. Earnings ----------

export function CreatorEarnings() {
  const { state } = useDemo()
  const { t } = useLang()
  const c = useCreator()
  if (c.status !== 'approved') return <PendingApproval c={c} />
  const st = creatorStats(state, c)
  const history = state.payouts.filter((p) => p.to === 'creator' && p.targetId === c.id)
  return (
    <>
      <PageTitle title={t('Earnings')} subtitle={`Paid monthly to PayNow ${c.paynow || '(not set)'}`} />
      <div className="card">
        <div className="text-sm font-semibold text-brown-soft">This month so far</div>
        <div className="font-heading text-4xl font-extrabold text-ok">{sgd(st.total)}</div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-cream p-3"><div className="text-brown-soft">Visit fees</div><div className="font-bold">{st.visitsDone.length} × S${VISIT_FEE} = {sgd(st.visitFees)}</div></div>
          <div className="rounded-xl bg-cream p-3"><div className="text-brown-soft">Commission share</div><div className="font-bold">{Math.round(CREATOR_SHARE * 100)}% of {sgd(st.commission)} = {sgd(st.share)}</div></div>
        </div>
      </div>
      <h2 className="mt-6 mb-3 text-lg font-bold">By video</h2>
      <div className="card divide-y divide-brown-line p-0 text-sm">
        {st.perVideo.map((p) => (
          <div key={p.visit.id} className="flex justify-between px-4 py-3"><span>{p.outlet.name} · {p.orders} order{p.orders === 1 ? "" : "s"}</span><span className="font-semibold">{sgd(VISIT_FEE + p.share)}</span></div>
        ))}
        {st.perVideo.length === 0 && <div className="px-4 py-3 text-brown-soft">No completed visits yet.</div>}
      </div>
      <h2 className="mt-6 mb-3 text-lg font-bold">Payout history</h2>
      {history.length === 0 ? <Empty>No payouts yet.</Empty> : history.map((p) => (
        <div key={p.id} className="card mb-2 flex items-center justify-between py-3"><div><div className="font-semibold">{fmtDate(p.date)}</div><div className="text-xs text-brown-soft">{p.note}</div></div><span className="font-heading font-bold">{sgd(p.amount)}</span></div>
      ))}
      <button className="btn-secondary mt-4 w-full" onClick={() => downloadCsv(`${c.handle}-statement.csv`, ['outlet', 'visit date', 'coded orders', 'sales (SGD)', 'visit fee (SGD)', 'commission share (SGD)'],
        st.perVideo.map((p) => [p.outlet.name, p.visit.date, p.orders, p.sales.toFixed(2), VISIT_FEE.toFixed(2), p.share.toFixed(2)]))}>Download statement CSV</button>
    </>
  )
}

// ---------- Profile, payout setup, 12. Ratings ----------

export function CreatorProfile() {
  const { state, update } = useDemo()
  const { t } = useLang()
  const c = useCreator()
  const [paynow, setPaynow] = useState(c.paynow)
  const rated = state.visits.filter((v) => v.creatorId === c.id && v.ownerRating)
  return (
    <>
      <PageTitle title={t('Profile')} />
      <div className="card flex items-center gap-4">
        <Avatar name={c.handle} size={64} />
        <div className="min-w-0 flex-1">
          <div className="font-heading text-xl font-bold">{c.handle}</div>
          <div className="text-sm text-brown-soft">{c.name} · {c.platform} · {c.followers.toLocaleString('en-SG')} followers</div>
          <div className="mt-1"><StatusChip status={c.status} /></div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link to="/creator/code" className="btn-primary min-h-[52px] text-base">{t('My code')}: {c.code}</Link>
        <Link to="/creator/visits" className="btn-secondary min-h-[52px] text-base">{t('My visits')}</Link>
      </div>
      <div className="card mt-3 space-y-3">
        <Field label="PayNow number" hint="Needed before your first visit.">
          <div className="flex gap-2"><input className="input" value={paynow} onChange={(e) => setPaynow(e.target.value)} placeholder="8123 4567" />
            <button className="btn-secondary min-h-[52px] px-4 text-base" onClick={() => update((s) => { s.creators.find((x) => x.id === c.id)!.paynow = paynow })}>{t('Save')}</button></div>
        </Field>
        <div className="text-sm"><span className="font-semibold">Languages:</span> {c.languages.join(', ')} · <span className="font-semibold">Cuisines:</span> {c.cuisines.join(', ')}</div>
      </div>
      <h2 className="mt-6 mb-3 text-lg font-bold">{t('Ratings')}</h2>
      <div className="card flex items-center justify-between">
        <div><div className="font-heading text-3xl font-extrabold">{c.rating ? c.rating.toFixed(1) : '—'}</div><Stars value={c.rating} /></div>
        <div className="text-right"><div className="font-heading text-2xl font-bold">{c.strikes}/3</div><div className="text-xs text-brown-soft">strikes</div></div>
      </div>
      <p className="mt-2 text-xs text-brown-soft">Low ratings or no-shows reduce future offers. Three strikes pauses your account.</p>
      <div className="mt-3 space-y-2">{rated.map((v) => (
        <div key={v.id} className="card flex items-center justify-between py-3"><span className="font-semibold">{state.outlets.find((o) => o.id === v.outletId)!.name}</span><Stars value={v.ownerRating!} /></div>
      ))}</div>
    </>
  )
}
