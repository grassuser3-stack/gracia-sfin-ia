import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDemo, outletStats, creatorStats, ownerNetOf, commissionOf, sgd, r2 } from '../demo/store'
import { PLANS, addDays, sgToday, type Creator, type Visit } from '../demo/data'
import { fmtDate, fmtTime } from '../lib/format'
import { Alert, Avatar, DemoNote, Empty, PageTitle, Stat, StatusChip } from '../components/ui'
import { downloadCsv, timeAgo } from './owner'

export function AdminHome() {
  const { state } = useDemo()
  const pending = state.creators.filter((c) => c.status === 'pending').length
  const toMatch = state.visits.filter((v) => v.status === 'requested').length
  const disputes = state.disputes.filter((d) => d.status === 'open').length
  const coded = state.orders.filter((o) => o.code && !['cancelled', 'refunded'].includes(o.status))
  const gmv = r2(coded.reduce((s, o) => s + o.total, 0))
  const commission = r2(coded.reduce((s, o) => s + commissionOf(o), 0))
  const subs = state.outlets.reduce((s, o) => s + PLANS[o.plan].fee, 0)
  return (
    <>
      <PageTitle title="Makan Kaki admin" subtitle="Whampoa pilot" />
      <div className="space-y-2">
        {pending > 0 && <Link to="/admin/creators" className="block"><Alert kind="info">👤 {pending} creator{pending > 1 ? 's' : ''} waiting for approval →</Alert></Link>}
        {toMatch > 0 && <Link to="/admin/matching" className="block"><Alert kind="info">🔗 {toMatch} visit request{toMatch > 1 ? 's' : ''} to match →</Alert></Link>}
        {disputes > 0 && <Link to="/admin/disputes" className="block"><Alert kind="bad">⚑ {disputes} open dispute{disputes > 1 ? 's' : ''} →</Alert></Link>}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Outlets" value={state.outlets.length} note="Pilot target 15" />
        <Stat label="Approved creators" value={state.creators.filter((c) => c.status === 'approved').length} note="Pilot target 20" />
        <Stat label="Coded order sales" value={sgd(gmv)} note={`${coded.length} orders`} />
        <Stat label="Revenue" value={sgd(subs + commission)} note={`${sgd(subs)} plans + ${sgd(commission)} commission`} />
      </div>
      <h2 className="mt-8 mb-3 text-lg font-bold">Outlets</h2>
      <div className="space-y-2">{state.outlets.map((o) => {
        const st = outletStats(state, o)
        return (
          <div key={o.id} className="card flex items-center justify-between gap-3 py-3">
            <div className="min-w-0"><div className="font-bold">{o.name}</div><div className="text-xs text-brown-soft">{o.area} · {PLANS[o.plan].label}{o.launchPack ? ' · launch pack' : ''}{o.paused ? ' · paused' : ''}</div></div>
            <div className="text-right text-sm"><div className="font-bold">{st.coded.length} coded</div><div className="text-xs text-brown-soft">{sgd(st.sales)}</div></div>
          </div>
        )
      })}</div>
    </>
  )
}

function followerOk(c: Creator) { return c.followers >= 1000 && c.followers <= 10000 }

export function AdminCreators() {
  const { state, update, whatsapp } = useDemo()
  const [tab, setTab] = useState<'pending' | 'all'>('pending')
  const shown = state.creators.filter((c) => tab === 'all' || c.status === 'pending')
  const set = (c: Creator, status: Creator['status']) => {
    update((s) => { s.creators.find((x) => x.id === c.id)!.status = status })
    whatsapp(c.name, status === 'approved' ? 'You are approved on Makan Kaki! 🎉 Visit offers will appear in the app.' : 'Thanks for applying to Makan Kaki. We can’t approve your account right now.')
  }
  return (
    <>
      <PageTitle title="Creator approvals" subtitle="Check real followers, food content and engagement." />
      <div className="mb-4 grid grid-cols-2 gap-2">{(['pending', 'all'] as const).map((k) => (
        <button key={k} onClick={() => setTab(k)} className={`min-h-[44px] rounded-full border-2 text-sm font-semibold ${tab === k ? 'border-orange bg-orange-soft' : 'border-brown-line bg-white'}`}>{k === 'pending' ? 'Waiting' : 'All creators'}</button>
      ))}</div>
      {shown.length === 0 ? <Empty>No creators waiting.</Empty> : (
        <div className="space-y-3">{shown.map((c) => (
          <div key={c.id} className="card">
            <div className="flex items-center gap-3">
              <Avatar name={c.handle} size={48} />
              <div className="min-w-0 flex-1"><div className="font-bold">{c.handle} <span className="font-normal text-brown-soft">· {c.name}</span></div><div className="text-xs text-brown-soft">{c.platform} · {c.area}</div></div>
              <StatusChip status={c.status} />
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              <li>{followerOk(c) ? '✅' : '❌'} {c.followers.toLocaleString('en-SG')} followers (1,000–10,000)</li>
              <li>{c.engagement >= 3 ? '✅' : '⚠️'} {c.engagement}% engagement</li>
              <li>✅ Food content in {c.samplePosts.length} sample post{c.samplePosts.length === 1 ? '' : 's'}</li>
              <li>{c.paynow ? '✅' : '⚠️'} PayNow {c.paynow ? 'added' : 'missing'}</li>
              <li className="text-brown-soft">{c.languages.join(', ')} · {c.cuisines.join(', ')}</li>
            </ul>
            {c.status === 'pending' && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="btn-ok min-h-[48px] text-base" onClick={() => set(c, 'approved')}>Approve</button>
                <button className="btn-secondary min-h-[48px] text-base" onClick={() => set(c, 'rejected')}>Reject</button>
              </div>
            )}
            {c.status === 'paused' && <button className="btn-secondary mt-3 w-full min-h-[48px] text-base" onClick={() => update((s) => { const x = s.creators.find((q) => q.id === c.id)!; x.status = 'approved'; x.strikes = 0 })}>Unpause and clear strikes</button>}
          </div>
        ))}</div>
      )}
    </>
  )
}

/** Simple score: shared languages and cuisines, plus rating, minus strikes. */
function score(v: Visit, c: Creator, cuisine: string) {
  const lang = v.languagesWanted.filter((l) => c.languages.includes(l)).length
  const cui = c.cuisines.some((x) => cuisine.toLowerCase().includes(x.toLowerCase()) || x === 'Hawker' || x === 'Café') ? 1 : 0
  return lang * 2 + cui + c.rating / 5 - c.strikes
}

export function AdminMatching() {
  const { state, update, whatsapp } = useDemo()
  const requests = state.visits.filter((v) => v.status === 'requested')
  const offered = state.visits.filter((v) => v.status === 'offered')
  const approved = state.creators.filter((c) => c.status === 'approved')
  function offer(v: Visit, c: Creator | null) {
    const o = state.outlets.find((x) => x.id === v.outletId)!
    update((s) => { const x = s.visits.find((q) => q.id === v.id)!; x.status = 'offered'; x.creatorId = c?.id ?? null })
    if (c) whatsapp(c.name, `New visit offer: ${o.name} (${o.area}), ${fmtDate(v.date)} at ${fmtTime(v.time)}. Pay S$30 + 20% of commission. Open the app to accept.`)
    else whatsapp('all matching creators', `New visit offer at ${o.name}, ${fmtDate(v.date)}. First to accept gets it.`)
  }
  return (
    <>
      <PageTitle title="Match visits" subtitle="Suggested creators are ranked by language and cuisine." />
      {requests.length === 0 ? <Empty>No visit requests waiting. Book one as an owner to see matching.</Empty> : (
        <div className="space-y-4">{requests.map((v) => {
          const o = state.outlets.find((x) => x.id === v.outletId)!
          const ranked = [...approved].sort((a, b) => score(v, b, o.cuisine) - score(v, a, o.cuisine)).slice(0, 3)
          return (
            <div key={v.id} className="card">
              <div className="font-heading text-lg font-bold">{o.name}</div>
              <div className="text-sm text-brown-soft">{fmtDate(v.date)} · {fmtTime(v.time)} · wants {v.languagesWanted.join(', ')}</div>
              <div className="mt-3 space-y-2">{ranked.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl bg-cream p-2">
                  <Avatar name={c.handle} size={36} />
                  <div className="min-w-0 flex-1"><div className="text-sm font-bold">{c.handle}{i === 0 && <span className="ml-1 chip bg-ok-soft text-ok">Best match</span>}</div><div className="text-xs text-brown-soft">{c.languages.join(', ')} · ★ {c.rating.toFixed(1)}</div></div>
                  <button className="btn-primary min-h-[40px] px-3 text-sm" onClick={() => offer(v, c)}>Offer</button>
                </div>
              ))}</div>
              <button className="mt-2 w-full py-1 text-sm font-semibold text-brown-soft underline" onClick={() => offer(v, null)}>Offer to all approved creators</button>
            </div>
          )
        })}</div>
      )}
      <h2 className="mt-8 mb-3 text-lg font-bold">Waiting for a creator to accept</h2>
      {offered.length === 0 ? <Empty>None.</Empty> : (
        <div className="space-y-2">{offered.map((v) => {
          const o = state.outlets.find((x) => x.id === v.outletId)!; const c = v.creatorId ? state.creators.find((x) => x.id === v.creatorId) : null
          return <div key={v.id} className="card flex justify-between py-3 text-sm"><span className="font-semibold">{o.name} · {fmtDate(v.date)}</span><span className="text-brown-soft">{c ? c.handle : 'open to all'}</span></div>
        })}</div>
      )}
    </>
  )
}

export function AdminPayouts() {
  const { state, update, whatsapp } = useDemo()
  const today = sgToday()
  const ownerDue = state.outlets.map((o) => {
    const orders = state.orders.filter((x) => x.outletId === o.id && x.status === 'completed' && x.createdAt.slice(0, 10) >= addDays(today, -1))
    return { o, orders, amount: r2(orders.reduce((s, x) => s + ownerNetOf(x), 0)) }
  }).filter((r) => r.amount > 0)
  const creatorDue = state.creators.filter((c) => c.status !== 'pending').map((c) => ({ c, st: creatorStats(state, c) })).filter((r) => r.st.total > 0)
  const [sent, setSent] = useState<string[]>([])

  function payOwners() {
    update((s) => { ownerDue.forEach((r) => s.payouts.unshift({ id: `p${Date.now()}${r.o.id}`, to: 'owner', targetId: r.o.id, amount: r.amount, date: addDays(today, 1), note: 'Coded orders minus 10%', status: 'scheduled' })) })
    ownerDue.forEach((r) => whatsapp(r.o.name, `PayNow payout of ${sgd(r.amount)} for ${r.orders.length} orders is scheduled for ${fmtDate(addDays(today, 1))}.`))
    setSent((p) => [...p, 'owners'])
  }
  function payCreators() {
    update((s) => { creatorDue.forEach((r) => s.payouts.unshift({ id: `p${Date.now()}${r.c.id}`, to: 'creator', targetId: r.c.id, amount: r.st.total, date: today, note: `${r.st.visitsDone.length} visit(s) + commission share`, status: 'paid' })) })
    creatorDue.forEach((r) => whatsapp(r.c.name, `Your Makan Kaki payout of ${sgd(r.st.total)} has been sent to PayNow ${r.c.paynow}.`))
    setSent((p) => [...p, 'creators'])
  }

  return (
    <>
      <PageTitle title="Payouts" subtitle="Owners: coded order value minus 10%, next working day. Creators: S$30 per visit + 20% of commission, monthly." />
      <h2 className="mb-3 text-lg font-bold">Owners · due {fmtDate(addDays(today, 1))}</h2>
      {ownerDue.length === 0 ? <Empty>Nothing due.</Empty> : (
        <div className="card divide-y divide-brown-line p-0">{ownerDue.map((r) => (
          <div key={r.o.id} className="flex justify-between px-4 py-3 text-sm"><span><b>{r.o.name}</b> · {r.orders.length} order{r.orders.length === 1 ? "" : "s"} · PayNow {r.o.paynow}</span><span className="font-heading font-bold">{sgd(r.amount)}</span></div>
        ))}</div>
      )}
      <button className="btn-primary mt-3 w-full" disabled={!ownerDue.length || sent.includes('owners')} onClick={payOwners}>{sent.includes('owners') ? 'Owner payouts scheduled ✓' : 'Send owner payouts by PayNow'}</button>

      <h2 className="mt-8 mb-3 text-lg font-bold">Creators · this month</h2>
      {creatorDue.length === 0 ? <Empty>Nothing due.</Empty> : (
        <div className="card divide-y divide-brown-line p-0">{creatorDue.map((r) => (
          <div key={r.c.id} className="flex justify-between px-4 py-3 text-sm">
            <span><b>{r.c.handle}</b><br /><span className="text-xs text-brown-soft">{r.st.visitsDone.length} × S$30 + 20% of {sgd(r.st.commission)}</span></span>
            <span className="font-heading font-bold">{sgd(r.st.total)}</span>
          </div>
        ))}</div>
      )}
      <button className="btn-primary mt-3 w-full" disabled={!creatorDue.length || sent.includes('creators')} onClick={payCreators}>{sent.includes('creators') ? 'Creator payouts sent ✓' : 'Send creator payouts by PayNow'}</button>
      <button className="btn-secondary mt-3 w-full" onClick={() => downloadCsv('makan-kaki-payouts.csv', ['to', 'name', 'amount (SGD)', 'date', 'note', 'status'],
        state.payouts.map((p) => [p.to, p.to === 'owner' ? state.outlets.find((o) => o.id === p.targetId)?.name ?? '' : state.creators.find((c) => c.id === p.targetId)?.handle ?? '', p.amount.toFixed(2), p.date, p.note, p.status]))}>Download payout history CSV</button>
      <div className="mt-3"><DemoNote>PayNow transfers are simulated.</DemoNote></div>
    </>
  )
}

export function AdminDisputes() {
  const { state, update, whatsapp } = useDemo()
  return (
    <>
      <PageTitle title="Disputes" subtitle="Refund problems, late posts and no-shows." />
      <div className="space-y-3">{state.disputes.map((d) => (
        <div key={d.id} className="card">
          <div className="flex items-start justify-between gap-3"><div className="font-bold">{d.title}</div><StatusChip status={d.status} /></div>
          <p className="mt-1 text-sm">{d.detail}</p>
          <div className="mt-1 text-xs text-brown-soft">{d.party} · {timeAgo(d.at)}</div>
          {d.status === 'open' && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="btn-secondary min-h-[44px] text-sm" onClick={() => whatsapp(d.party, `Hi from Makan Kaki about "${d.title}". Could you reply here with an update?`)}>WhatsApp them</button>
              <button className="btn-ok min-h-[44px] text-sm" onClick={() => update((s) => { s.disputes.find((x) => x.id === d.id)!.status = 'resolved' })}>Mark resolved</button>
            </div>
          )}
        </div>
      ))}</div>
      <h2 className="mt-8 mb-3 text-lg font-bold">Platform rules</h2>
      <ul className="card list-disc space-y-1 pl-8 text-sm">
        <li>Free cancellation up to 24 hours before a visit. Later: the visit counts for the owner, or the creator gets a strike.</li>
        <li>A no-show returns the visit to the owner and gives a strike. Three strikes pauses the account.</li>
        <li>Post within 48 hours with the code and a paid-post label such as #ad.</li>
        <li>Orders count for a creator when the diner enters their code or arrives through their link within 7 days.</li>
        <li>Refunded orders earn no commission for Makan Kaki or the creator.</li>
      </ul>
    </>
  )
}
