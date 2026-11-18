// Diner web checkout: scan → language → menu → code → dine-in/takeaway → PayNow → status → receipt.
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { useEffect } from 'react'
import { useDemo, sgd, r2 } from '../demo/store'
import { useLang, LANGS } from '../demo/i18n'
import type { Lang, OrderStatus } from '../demo/data'
import { Alert, DemoNote, Empty, Field } from '../components/ui'

function useValidCode(outletId: string, code: string) {
  const { state } = useDemo()
  return useMemo(() => {
    const c = state.creators.find((x) => x.code === code.trim().toUpperCase() && x.status === 'approved')
    if (!c) return null
    const visited = state.visits.some((v) => v.outletId === outletId && v.creatorId === c.id && ['accepted', 'checked_in', 'posted', 'verified'].includes(v.status))
    return visited ? c : null
  }, [state, outletId, code])
}

export function DinerCheckout() {
  const { outletId = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { state, update } = useDemo()
  const { t, lang, setLang } = useLang()
  const outlet = state.outlets.find((o) => o.id === outletId)
  const [phase, setPhase] = useState<'lang' | 'menu' | 'review' | 'pay'>('lang')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [code, setCode] = useState(params.get('code') ?? '')
  const [codeTouched, setCodeTouched] = useState(Boolean(params.get('code')))
  const [mode, setMode] = useState<'dine_in' | 'takeaway'>('dine_in')
  const [table, setTable] = useState('')
  const [phone, setPhone] = useState('')
  const [paying, setPaying] = useState(false)
  const [payQr, setPayQr] = useState('')
  const creator = useValidCode(outletId, code)
  const fromLink = Boolean(params.get('code'))

  useEffect(() => {
    if (phase !== 'pay') return
    QRCode.toDataURL(`PAYNOW-DEMO|${outletId}|${Date.now()}`, { margin: 1, width: 500, color: { dark: '#7C1A78', light: '#FFFFFF' } }).then(setPayQr)
  }, [phase, outletId])

  if (!outlet) return <div className="pt-10"><Empty>This QR code isn't linked to a stall. <Link className="link" to="/">Back to Makan Kaki</Link></Empty></div>
  const menu = state.dishes.filter((d) => d.outletId === outlet.id)
  const featuredIds = new Set(
    creator ? state.visits.filter((v) => v.outletId === outlet.id && v.creatorId === creator.id).flatMap((v) => v.dishes) : menu.filter((d) => d.signature).map((d) => d.id),
  )
  const featured = menu.filter((d) => featuredIds.has(d.id))
  const rest = menu.filter((d) => !featuredIds.has(d.id))
  const lines = Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => { const d = menu.find((x) => x.id === id)!; return { d, qty } })
  const total = r2(lines.reduce((s, l) => s + l.qty * l.d.price, 0))
  const count = lines.reduce((s, l) => s + l.qty, 0)
  const add = (id: string, n: number) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + n) }))

  function placeOrder() {
    setPaying(true)
    setTimeout(() => {
      const id = `o${Date.now()}`
      update((s) => {
        s.orders.push({
          id, number: s.nextOrderNumber++, outletId: outlet!.id, code: creator ? creator.code : null, creatorId: creator?.id ?? null,
          items: lines.map((l) => ({ dishId: l.d.id, name: l.d.name, qty: l.qty, price: l.d.price })), total, mode, table: mode === 'dine_in' ? table : '',
          status: 'new', createdAt: new Date().toISOString(), lang: lang as Lang, phone: phone.trim(),
        })
      })
      navigate(`/order/${outlet!.id}/status/${id}`)
    }, 1400)
  }

  const header = (
    <div className="pt-4 pb-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-brown-soft">{outlet.area} · {outlet.unit}</div>
      <h1 className="text-2xl font-bold">{outlet.name}</h1>
      <div className="text-sm text-brown-soft">{outlet.hours}</div>
    </div>
  )

  // 2. language
  if (phase === 'lang') return (
    <>
      {header}
      <h2 className="mt-4 text-xl font-bold">{t('Choose your language')}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {LANGS.map((l) => (
          <button key={l.id} onClick={() => { setLang(l.id); setPhase('menu') }}
            className={`min-h-[72px] rounded-2xl border-2 font-heading text-xl font-bold ${lang === l.id ? 'border-orange bg-orange-soft' : 'border-brown-line bg-white'}`}>{l.label}</button>
        ))}
      </div>
      {fromLink && creator && <div className="mt-4"><Alert kind="ok">🎥 {t('Code applied')}: {creator.code} · {creator.handle}</Alert></div>}
      <div className="mt-6"><DemoNote>This is what a diner sees after scanning the stall's QR stand or tapping a creator's link. No app or account needed.</DemoNote></div>
    </>
  )

  const dishRow = (d: (typeof menu)[number]) => (
    <div key={d.id} className={`card flex items-center gap-3 py-3 ${d.soldOut ? 'opacity-50' : ''}`}>
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-cream text-3xl">{d.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="font-bold leading-tight">{d.name}</div>
        <div className="text-xs text-brown-soft">{d.desc}</div>
        <div className="mt-0.5 font-semibold">{sgd(d.price)}</div>
      </div>
      {d.soldOut ? <span className="chip bg-brown-line text-brown-soft">{t('Sold out')}</span> : cart[d.id] ? (
        <div className="flex items-center gap-2">
          <button aria-label={`Remove one ${d.name}`} onClick={() => add(d.id, -1)} className="h-10 w-10 rounded-full border-2 border-brown-line text-xl font-bold">−</button>
          <span className="w-5 text-center font-bold">{cart[d.id]}</span>
          <button aria-label={`Add one ${d.name}`} onClick={() => add(d.id, 1)} className="h-10 w-10 rounded-full bg-orange text-xl font-bold text-white">+</button>
        </div>
      ) : <button onClick={() => add(d.id, 1)} className="btn-primary min-h-[44px] px-4 text-base">{t('Add')}</button>}
    </div>
  )

  // 3. menu
  if (phase === 'menu') return (
    <>
      {header}
      {creator && <div className="mb-3"><Alert kind="ok">🎥 {t('Code applied')}: {creator.code} · {creator.handle}</Alert></div>}
      {featured.length > 0 && <>
        <h2 className="mb-2 text-lg font-bold">⭐ {t('Featured in the video')}</h2>
        <div className="space-y-2">{featured.map(dishRow)}</div>
      </>}
      <h2 className="mt-6 mb-2 text-lg font-bold">{t('Full menu')}</h2>
      <div className="space-y-2">{rest.map(dishRow)}</div>
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-xl p-3">
          <button onClick={() => setPhase('review')} className="btn-primary w-full justify-between px-6 text-lg shadow-card">
            <span>{count} · {t('Review order')}</span><span>{sgd(total)}</span>
          </button>
        </div>
      )}
    </>
  )

  // 4–5. code, dine-in / takeaway
  if (phase === 'review') {
    const codeState = !code.trim() ? 'none' : creator ? 'ok' : 'bad'
    return (
      <>
        {header}
        <button onClick={() => setPhase('menu')} className="mb-2 text-sm font-semibold text-brown-soft">← {t('Back')}</button>
        <h2 className="mb-2 text-lg font-bold">{t('Your order')}</h2>
        <div className="card space-y-1 text-sm">
          {lines.map((l) => <div key={l.d.id} className="flex justify-between"><span><b>{l.qty}×</b> {l.d.name}</span><span>{sgd(l.qty * l.d.price)}</span></div>)}
          <div className="flex justify-between border-t border-brown-line pt-2 font-heading text-lg font-bold"><span>{t('Total')}</span><span>{sgd(total)}</span></div>
        </div>
        <div className="card mt-3 space-y-2">
          <Field label={t('Creator code')}>
            <input className="input font-mono uppercase" value={code} onChange={(e) => { setCode(e.target.value); setCodeTouched(true) }} placeholder="AA-NAME" autoCapitalize="characters" />
          </Field>
          {codeTouched && codeState === 'ok' && <Alert kind="ok">✓ {t('Code applied')} · {creator!.handle}</Alert>}
          {codeTouched && codeState === 'bad' && <Alert kind="bad">{t('Not valid at this stall')}</Alert>}
          {codeState !== 'ok' && <p className="text-xs text-brown-soft">{t('No code? No problem. Your order still goes through.')}</p>}
        </div>
        <div className="card mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(['dine_in', 'takeaway'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`min-h-[56px] rounded-xl border-2 font-bold ${mode === m ? 'border-orange bg-orange-soft' : 'border-brown-line bg-white'}`}>
                {m === 'dine_in' ? `🍽 ${t('Dine in')}` : `🥡 ${t('Takeaway')}`}
              </button>
            ))}
          </div>
          {mode === 'dine_in' && <Field label={t('Table number')}><input className="input text-center text-2xl font-bold" inputMode="numeric" value={table} onChange={(e) => setTable(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="12" /></Field>}
          <Field label={t('Optional: get a WhatsApp when it is ready')}><input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9123 4567" /></Field>
        </div>
        <button onClick={() => setPhase('pay')} disabled={mode === 'dine_in' && !table} className="btn-primary mt-4 w-full">{t('Pay with PayNow')} · {sgd(total)}</button>
        <p className="mt-2 text-center text-xs text-brown-soft">Your number is used only for this order and its receipt (PDPA).</p>
      </>
    )
  }

  // 6. pay
  return (
    <>
      {header}
      <div className="card text-center">
        <div className="text-xs font-bold uppercase tracking-wide text-brown-soft">HitPay · PayNow</div>
        <div className="mt-1 font-heading text-3xl font-extrabold">{sgd(total)}</div>
        <div className="mx-auto mt-3 w-fit rounded-2xl border-4 border-[#7C1A78] p-2">
          {payQr ? <img src={payQr} alt="PayNow QR code (demo)" width={200} height={200} /> : <div className="h-[200px] w-[200px] animate-pulse bg-cream" />}
        </div>
        <p className="mt-2 text-sm text-brown-soft">{t('Scan with your banking app')}</p>
        <button className="btn-primary mt-4 w-full" disabled={paying} onClick={placeOrder}>{paying ? 'Confirming payment…' : t("I've paid")}</button>
        <button className="mt-2 text-sm font-semibold text-brown-soft underline" onClick={() => setPhase('review')}>{t('Back')}</button>
      </div>
      <div className="mt-3"><DemoNote>No money moves. This QR is a placeholder and "I've paid" simulates a HitPay confirmation.</DemoNote></div>
    </>
  )
}

const STEPS: { s: OrderStatus; label: string; icon: string }[] = [
  { s: 'new', label: 'We got your order', icon: '🧾' },
  { s: 'preparing', label: 'Your food is being prepared', icon: '👩‍🍳' },
  { s: 'ready', label: 'Your order is ready!', icon: '🔔' },
  { s: 'completed', label: 'Enjoy your meal', icon: '😋' },
]

// 7–8. status and receipt
export function DinerStatus() {
  const { outletId = '', orderId = '' } = useParams()
  const { state } = useDemo()
  const { t } = useLang()
  const o = state.orders.find((x) => x.id === orderId)
  const outlet = state.outlets.find((x) => x.id === outletId)
  if (!o || !outlet) return <div className="pt-10"><Empty>Order not found.</Empty></div>
  const idx = STEPS.findIndex((s) => s.s === o.status)
  const c = o.creatorId ? state.creators.find((x) => x.id === o.creatorId) : null
  return (
    <>
      <div className="pt-6 text-center">
        <div className="text-sm font-semibold text-brown-soft">{outlet.name}</div>
        <div className="text-sm">{t('Order number')}</div>
        <div className="font-heading text-6xl font-extrabold">#{o.number}</div>
        <div className="mt-1 font-semibold">{o.mode === 'dine_in' ? `🍽 ${t('Table number')} ${o.table}` : `🥡 ${t('Takeaway')}`}</div>
      </div>
      {['cancelled', 'refunded'].includes(o.status) ? (
        <div className="mt-6"><Alert kind="bad">This order was {o.status}. {o.status === 'refunded' ? 'Your money has been refunded.' : 'The stall will refund you.'}</Alert></div>
      ) : (
        <ol className="card mt-6 space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.s} className={`flex items-center gap-3 ${i === idx ? 'font-bold' : i < idx ? '' : 'opacity-40'}`}>
              <span className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${i <= idx ? 'bg-ok-soft' : 'bg-cream'} ${i === idx && s.s === 'ready' ? 'animate-bounce' : ''}`}>{s.icon}</span>
              <span>{t(s.label)}</span>
            </li>
          ))}
        </ol>
      )}
      {o.phone && <p className="mt-3 text-center text-sm text-brown-soft">We'll WhatsApp {o.phone} when it's ready.</p>}
      <h2 className="mt-6 mb-2 text-lg font-bold">{t('Receipt')}</h2>
      <div className="card space-y-1 text-sm">
        {o.items.map((i) => <div key={i.dishId} className="flex justify-between"><span>{i.qty}× {i.name}</span><span>{sgd(i.qty * i.price)}</span></div>)}
        <div className="flex justify-between border-t border-brown-line pt-2 font-bold"><span>{t('Total')} · PayNow</span><span>{sgd(o.total)}</span></div>
        {c && <div className="pt-1 text-xs text-brown-soft">Creator code {o.code} · thanks for supporting {c.handle}!</div>}
        <div className="text-xs text-brown-soft">{new Date(o.createdAt).toLocaleString('en-SG')}</div>
      </div>
      <Link to={`/order/${outlet.id}${o.code ? `?code=${o.code}` : ''}`} className="btn-secondary mt-4 w-full">{t('Order more')}</Link>
      <div className="mt-3"><DemoNote>Open the owner's Live orders in another tab and move this order along. This page updates by itself.</DemoNote></div>
    </>
  )
}

export function DinerShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-screen max-w-xl px-4 pb-44">{children}</div>
}
