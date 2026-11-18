import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDemo, type Session } from '../demo/store'
import { useLang, LANGS } from '../demo/i18n'
import { PLANS, PILOT_DISCOUNT, type Lang, type PlanId, type Platform } from '../demo/data'
import { TOUR } from '../demo/tour'
import { useTour } from '../components/Shell'
import { Alert, Avatar, DemoNote, Field, LOGO_URL } from '../components/ui'

const LANE = ['Business owner', 'Makan Kaki', 'Creator', 'Diner'] as const
const laneColor: Record<string, string> = { 'Business owner': 'border-orange bg-orange-soft', 'Makan Kaki': 'border-brown bg-brown-line/60', Creator: 'border-ok bg-ok-soft', Diner: 'border-[#2563EB] bg-[#DBEAFE]' }

export function Landing() {
  const { go } = useTour()
  return (
    <>
      <section className="pt-6">
        <img src={LOGO_URL} alt="Makan Kaki logo" className="mb-5 h-24 w-24" />
        <span className="chip bg-orange-soft text-brown">Whampoa pilot · 15 outlets · 20 creators</span>
        <h1 className="mt-4 text-4xl font-extrabold leading-[1.1]">Every order traced back to the <span className="text-orange">video that brought it.</span></h1>
        <p className="mt-4 text-lg text-brown-soft">
          Hawkers and cafés pay for visits from local food creators. Creators post with their own code. Diners order through a QR checkout, no download needed.
        </p>
        <div className="mt-6 grid gap-3">
          <button onClick={() => go(1)} className="btn-primary">▶ Start the 11-step demo tour</button>
          <Link to="/login" className="btn-secondary">Log in with a demo account</Link>
          <Link to="/order/xnt" className="btn-secondary">Try the diner checkout</Link>
        </div>
        <div className="mt-4"><DemoNote>This is a clickable demo with sample data. Payments, WhatsApp and platform checks are simulated, and nothing leaves your browser.</DemoNote></div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Who uses Makan Kaki</h2>
        <div className="mt-3 grid gap-3">
          {[
            ['🧑‍🍳', 'Business owner', 'More diners without making content themselves', 'Owner app'],
            ['🎥', 'Creator', '1,000–10,000 followers. Paid food content close to home', 'Creator app'],
            ['🍜', 'Diner', 'A good meal they saw online', 'Web checkout, no account'],
            ['🤝', 'Makan Kaki team', 'Approves creators, matches visits, handles payouts', 'Admin panel'],
          ].map(([e, who, want, how]) => (
            <div key={who} className="card flex gap-3">
              <div className="text-3xl" aria-hidden>{e}</div>
              <div><div className="font-bold">{who}</div><div className="text-sm text-brown-soft">{want}</div><div className="mt-1 text-xs font-semibold">{how}</div></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">How one visit works</h2>
        <p className="mt-1 text-sm text-brown-soft">The creator code entered in step 7 links each order back to its video. Tap a step to see that screen.</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          {LANE.map((l) => <span key={l} className={`rounded-full border-l-4 px-2 py-0.5 ${laneColor[l]}`}>{l}</span>)}
        </div>
        <div className="mt-3 space-y-1.5">
          {TOUR.map((s) => {
            const col = LANE.indexOf(s.who)
            return (
              <button key={s.n} onClick={() => go(s.n)} style={{ marginLeft: `${col * 13}%`, width: '61%' }}
                className={`block rounded-xl border-l-4 px-3 py-2 text-left transition active:scale-[0.98] ${laneColor[s.who]} ${s.n === 7 ? 'ring-2 ring-[#2563EB]' : ''}`}>
                <div className="text-sm font-bold leading-tight">{s.n}. {s.title}</div>
                <div className="text-xs leading-tight text-brown-soft">{s.detail}</div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Plans</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(Object.keys(PLANS) as PlanId[]).map((p) => (
            <div key={p} className="card">
              <div className="font-heading font-bold">{PLANS[p].label}</div>
              <div className="mt-1 font-heading text-2xl font-extrabold">S${PLANS[p].fee}<span className="text-sm font-semibold text-brown-soft">/mo</span></div>
              <div className="mt-1 text-sm text-brown-soft">{PLANS[p].visits} creator visits a month + 10% on coded orders only</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm text-brown-soft">Pilot outlets get 50% off their first paid month. Creators earn S$30 per visit plus 20% of the commission their code earns.</p>
      </section>
    </>
  )
}

const DEMO_LOGINS: { label: string; note: string; session: Session; emoji: string }[] = [
  { label: 'Owner', note: 'Xiao Nong Tian (Hawker)', session: { role: 'owner', id: 'xnt' }, emoji: '🧑‍🍳' },
  { label: 'Owner', note: 'All Hands Café (Café)', session: { role: 'owner', id: 'ahc' }, emoji: '☕' },
  { label: 'Creator', note: 'Zelia · @foodieboonie', session: { role: 'creator', id: 'zelia' }, emoji: '🎥' },
  { label: 'Creator', note: 'Priya · @priyamakan', session: { role: 'creator', id: 'priya' }, emoji: '🎥' },
  { label: 'Creator', note: 'Chen Wei · waiting for approval', session: { role: 'creator', id: 'wei' }, emoji: '⏳' },
  { label: 'Admin', note: 'Makan Kaki team', session: { role: 'admin', id: 'admin' }, emoji: '🤝' },
]

const homeOf = (s: Session) => (s?.role === 'owner' ? '/owner' : s?.role === 'creator' ? '/creator' : s?.role === 'admin' ? '/admin' : '/')

export function Login() {
  const { setSession, reset } = useDemo()
  const { t } = useLang()
  const navigate = useNavigate()
  return (
    <>
      <h1 className="mt-6 text-3xl font-bold">Demo accounts</h1>
      <p className="mt-1 text-brown-soft">Tap one to log in. Each browser tab can be a different person, so try an owner in one tab and the diner checkout in another.</p>
      <div className="mt-5 grid gap-2">
        {DEMO_LOGINS.map((a) => (
          <button key={a.note} onClick={() => { setSession(a.session); navigate(homeOf(a.session)) }}
            className="card flex min-h-[60px] items-center gap-3 py-3 text-left transition active:scale-[0.99]">
            <span className="text-2xl" aria-hidden>{a.emoji}</span>
            <span className="min-w-0 flex-1"><span className="block font-bold">{a.label}</span><span className="block truncate text-sm text-brown-soft">{a.note}</span></span>
            <span aria-hidden className="text-xl text-brown-soft">›</span>
          </button>
        ))}
        <Link to="/order/xnt" className="card flex min-h-[60px] items-center gap-3 py-3">
          <span className="text-2xl" aria-hidden>🍜</span>
          <span className="flex-1"><span className="block font-bold">Diner</span><span className="block text-sm text-brown-soft">No account. Opens the QR checkout</span></span>
          <span aria-hidden className="text-xl text-brown-soft">›</span>
        </Link>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2">
        <Link to="/signup/owner" className="btn-secondary min-h-[48px] text-base">{t('Sign up')}: owner</Link>
        <Link to="/signup/creator" className="btn-secondary min-h-[48px] text-base">{t('Sign up')}: creator</Link>
      </div>
      <p className="mt-6 text-center text-xs text-brown-soft">
        Demo data is saved in this browser only.{' '}
        <button onClick={() => { if (window.confirm('Restore the original sample data?')) reset() }} className="font-semibold text-brown underline">{t('Reset demo')}</button>
      </p>
    </>
  )
}

// ---------- sign-up flows ----------

function Steps({ n, of, title, children }: { n: number; of: number; title: string; children: ReactNode }) {
  return (
    <div className="pt-5">
      <div className="mb-2 flex gap-1">{Array.from({ length: of }, (_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < n ? 'bg-orange' : 'bg-brown-line'}`} />)}</div>
      <div className="text-xs font-semibold text-brown-soft">Step {n} of {of}</div>
      <h1 className="mb-4 text-2xl font-bold">{title}</h1>
      {children}
    </div>
  )
}

/** Mobile number + simulated WhatsApp OTP. */
function OtpStep({ onDone, who }: { onDone: (mobile: string) => void; who: string }) {
  const { t } = useLang()
  const { whatsapp } = useDemo()
  const [mobile, setMobile] = useState('')
  const [sent, setSent] = useState(false)
  const [otp, setOtp] = useState('')
  return (
    <div className="card space-y-4">
      <Field label={t('Mobile number')}>
        <div className="flex gap-2">
          <span className="input flex w-20 items-center justify-center font-semibold">+65</span>
          <input className="input" inputMode="tel" placeholder="9123 4567" value={mobile} onChange={(e) => setMobile(e.target.value)} />
        </div>
      </Field>
      {!sent ? (
        <button className="btn-primary w-full" disabled={mobile.replace(/\D/g, '').length !== 8}
          onClick={() => { setSent(true); whatsapp(who, 'Your Makan Kaki code is 482913. It expires in 5 minutes.') }}>{t('Send WhatsApp code')}</button>
      ) : (
        <>
          <Field label={t('Enter the 6-digit code')} hint="Demo: the code was 'sent' by WhatsApp. Any 6 digits work.">
            <input className="input text-center font-mono text-2xl tracking-[0.4em]" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} autoFocus />
          </Field>
          <button className="btn-primary w-full" disabled={otp.length !== 6} onClick={() => onDone(mobile)}>{t('Verify')}</button>
        </>
      )}
    </div>
  )
}

function LangChooser() {
  const { lang, setLang } = useLang()
  return (
    <div className="mb-4 grid grid-cols-4 gap-2">
      {LANGS.map((l) => (
        <button key={l.id} onClick={() => setLang(l.id as Lang)}
          className={`min-h-[48px] rounded-xl border-2 text-sm font-bold ${lang === l.id ? 'border-orange bg-orange-soft' : 'border-brown-line bg-white'}`}>{l.label}</button>
      ))}
    </div>
  )
}

export function SignupOwner() {
  const { t } = useLang()
  const { update, setSession, whatsapp } = useDemo()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [mobile, setMobile] = useState('')
  const [f, setF] = useState({ name: '', address: '', unit: '', cuisine: '', hours: '', uen: '' })
  const [plan, setPlan] = useState<PlanId>('hawker')
  const [paynow, setPaynow] = useState('')
  const [paying, setPaying] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }))

  function finish() {
    const id = `o${Date.now()}`
    update((s) => {
      s.outlets.push({
        id, name: f.name, type: plan, area: 'Whampoa', address: f.address, unit: f.unit, cuisine: f.cuisine, hours: f.hours, uen: f.uen,
        plan, paynow, paused: false, qrRequested: false, launchPack: false, visitsUsed: 0, rollover: 0, ownerName: 'New owner', mobile,
      })
    })
    whatsapp(f.name, `Welcome to Makan Kaki! Your ${PLANS[plan].label} plan is active. Receipt: S$${(PLANS[plan].fee * PILOT_DISCOUNT).toFixed(2)} paid via HitPay.`)
    setSession({ role: 'owner', id })
    navigate('/owner/more/menu')
  }

  if (step === 1) return (
    <Steps n={1} of={4} title={`${t('Sign up')}: business owner`}>
      <p className="mb-2 text-sm font-semibold">{t('Choose your language')}</p>
      <LangChooser />
      <OtpStep who="new owner" onDone={(m) => { setMobile(m); setStep(2) }} />
    </Steps>
  )
  if (step === 2) return (
    <Steps n={2} of={4} title={t('Stall profile')}>
      <form className="card space-y-4" onSubmit={(e) => { e.preventDefault(); setStep(3) }}>
        <Field label="Stall name"><input className="input" required value={f.name} onChange={set('name')} placeholder="e.g. Whampoa Prawn Noodles" /></Field>
        <Field label="Hawker centre or address"><input className="input" required value={f.address} onChange={set('address')} placeholder="e.g. 90 Whampoa Drive" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit number"><input className="input" required value={f.unit} onChange={set('unit')} placeholder="#01-32" /></Field>
          <Field label="Cuisine"><input className="input" required value={f.cuisine} onChange={set('cuisine')} placeholder="Noodles" /></Field>
        </div>
        <Field label="Opening hours"><input className="input" required value={f.hours} onChange={set('hours')} placeholder="7 am – 2 pm, closed Tue" /></Field>
        <Field label="UEN (only if a company)"><input className="input" value={f.uen} onChange={set('uen')} placeholder="Optional" /></Field>
        <button className="btn-primary w-full">{t('Continue')}</button>
      </form>
    </Steps>
  )
  if (step === 3) return (
    <Steps n={3} of={4} title={t('Choose a plan')}>
      <div className="grid gap-3">
        {(Object.keys(PLANS) as PlanId[]).map((p) => (
          <button key={p} onClick={() => setPlan(p)} className={`card border-2 text-left ${plan === p ? 'border-orange' : 'border-transparent'}`}>
            <div className="flex items-baseline justify-between">
              <span className="font-heading text-lg font-bold">{PLANS[p].label}</span>
              <span className="font-heading text-xl font-extrabold">S${PLANS[p].fee}<span className="text-sm font-semibold text-brown-soft">/mo</span></span>
            </div>
            <div className="text-sm text-brown-soft">{PLANS[p].visits} creator visits a month. Unused visits roll over one month.</div>
            <div className="mt-1 text-sm">+ 10% commission on coded orders only</div>
          </button>
        ))}
      </div>
      <div className="mt-3"><Alert kind="info">Pilot offer: first paid month 50% off, S${(PLANS[plan].fee * PILOT_DISCOUNT).toFixed(2)}</Alert></div>
      <button onClick={() => setStep(4)} className="btn-primary mt-4 w-full">{t('Continue')}</button>
    </Steps>
  )
  return (
    <Steps n={4} of={4} title={t('Pay and payout setup')}>
      <div className="card space-y-3">
        <div className="flex items-center justify-between"><span className="font-semibold">{PLANS[plan].label} plan, first month</span><span className="font-heading font-bold">S${(PLANS[plan].fee * PILOT_DISCOUNT).toFixed(2)}</span></div>
        <div className="text-xs text-brown-soft">Then S${PLANS[plan].fee}/month, auto-renews. Receipts by email and WhatsApp.</div>
        <div className="rounded-xl bg-cream p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-brown-soft">HitPay checkout</div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            {['PayNow', 'Card', 'GrabPay'].map((m, i) => <div key={m} className={`rounded-lg border-2 py-2 ${i === 0 ? 'border-orange bg-white' : 'border-brown-line'}`}>{m}</div>)}
          </div>
        </div>
      </div>
      <div className="card mt-3 space-y-3">
        <Field label="PayNow number for your payouts" hint="Coded order money (minus 10%) is paid here the next working day.">
          <input className="input" inputMode="tel" value={paynow} onChange={(e) => setPaynow(e.target.value)} placeholder="9123 4567 or UEN" />
        </Field>
      </div>
      <div className="mt-3"><DemoNote>No real payment is made. Tapping Pay simulates a successful HitPay payment.</DemoNote></div>
      <button className="btn-primary mt-4 w-full" disabled={paying || !paynow.trim()} onClick={() => { setPaying(true); setTimeout(finish, 1200) }}>
        {paying ? 'Processing with HitPay…' : `Pay S$${(PLANS[plan].fee * PILOT_DISCOUNT).toFixed(2)}`}
      </button>
    </Steps>
  )
}

const PLATFORMS: Platform[] = ['TikTok', 'Instagram', 'Lemon8', 'Xiaohongshu']
const CREATOR_LANGS = ['English', 'Mandarin', 'Malay', 'Tamil', 'Hokkien', 'Cantonese']
const CUISINES = ['Hawker', 'Café', 'Chinese', 'Malay', 'Indian', 'Peranakan', 'Desserts', 'Western', 'Noodles', 'Prata']

export function SignupCreator() {
  const { t } = useLang()
  const { update, setSession } = useDemo()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [mobile, setMobile] = useState('')
  const [platform, setPlatform] = useState<Platform>('TikTok')
  const [handle, setHandle] = useState('')
  const [linking, setLinking] = useState(false)
  const [followers, setFollowers] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [langs, setLangs] = useState<string[]>(['English'])
  const [cuisines, setCuisines] = useState<string[]>(['Hawker'])
  const [samples, setSamples] = useState(['', ''])
  const [paynow, setPaynow] = useState('')
  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  const okFollowers = followers !== null && followers >= 1000 && followers <= 10000

  function link() {
    setLinking(true)
    // demo: pretend to read the follower count from the platform
    const n = 1000 + ([...handle].reduce((s, c) => s + c.charCodeAt(0), 0) * 37) % 9500
    setTimeout(() => { setFollowers(handle.toLowerCase().includes('big') ? 48200 : n); setLinking(false) }, 900)
  }
  function finish() {
    const id = `c${Date.now()}`
    const clean = handle.replace(/^@?/, '@')
    update((s) => {
      s.creators.push({
        id, name, handle: clean, platform, followers: followers ?? 0, languages: langs, cuisines, status: 'pending',
        code: `AA-${name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '') || 'KAKI'}`, paynow, rating: 0, strikes: 0, area: 'Singapore',
        samplePosts: samples.filter(Boolean), engagement: 5,
      })
    })
    setSession({ role: 'creator', id })
    navigate('/creator')
  }

  const chips = (all: string[], sel: string[], set: (v: string[]) => void) => (
    <div className="flex flex-wrap gap-2">
      {all.map((v) => (
        <button key={v} type="button" onClick={() => toggle(sel, set, v)}
          className={`min-h-[40px] rounded-full border-2 px-3 text-sm font-semibold ${sel.includes(v) ? 'border-orange bg-orange-soft' : 'border-brown-line bg-white'}`}>{v}</button>
      ))}
    </div>
  )

  if (step === 1) return (
    <Steps n={1} of={4} title={`${t('Sign up')}: creator`}>
      <LangChooser />
      <OtpStep who="new creator" onDone={(m) => { setMobile(m); setStep(2) }} />
      <input type="hidden" value={mobile} readOnly />
    </Steps>
  )
  if (step === 2) return (
    <Steps n={2} of={4} title="Link your account">
      <div className="card space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {PLATFORMS.map((p) => (
            <button key={p} onClick={() => { setPlatform(p); setFollowers(null) }}
              className={`min-h-[48px] rounded-xl border-2 text-sm font-bold ${platform === p ? 'border-orange bg-orange-soft' : 'border-brown-line bg-white'}`}>{p}</button>
          ))}
        </div>
        <Field label={`${platform} handle`}><input className="input" value={handle} onChange={(e) => { setHandle(e.target.value); setFollowers(null) }} placeholder="@yourhandle" /></Field>
        <button className="btn-secondary w-full" disabled={!handle.trim() || linking} onClick={link}>{linking ? 'Checking followers…' : `Link ${platform}`}</button>
        {followers !== null && (okFollowers
          ? <Alert kind="ok">✓ {followers.toLocaleString('en-SG')} followers, within 1,000–10,000</Alert>
          : <Alert kind="bad">{followers.toLocaleString('en-SG')} followers. Makan Kaki is for creators with 1,000–10,000 followers.</Alert>)}
        <DemoNote>The follower check is simulated. Try a handle containing "big" to see a rejection.</DemoNote>
      </div>
      <div className="card mt-3 space-y-4">
        <Field label="Your name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div><span className="label">Languages you post in</span>{chips(CREATOR_LANGS, langs, setLangs)}</div>
        <div><span className="label">Cuisines you like</span>{chips(CUISINES, cuisines, setCuisines)}</div>
        <p className="text-xs text-brown-soft">You can take visits anywhere in Singapore.</p>
      </div>
      <button className="btn-primary mt-4 w-full" disabled={!okFollowers || !name.trim() || !langs.length} onClick={() => setStep(3)}>{t('Continue')}</button>
    </Steps>
  )
  if (step === 3) return (
    <Steps n={3} of={4} title="Sample posts">
      <div className="card space-y-3">
        <p className="text-sm text-brown-soft">Add 2 recent food posts. Makan Kaki checks for real followers, food content and engagement.</p>
        {samples.map((s, i) => (
          <input key={i} className="input" type="url" placeholder="https://…" value={s} onChange={(e) => setSamples((p) => p.map((x, j) => (j === i ? e.target.value : x)))} />
        ))}
      </div>
      <button className="btn-primary mt-4 w-full" disabled={!samples[0].trim()} onClick={() => setStep(4)}>{t('Continue')}</button>
    </Steps>
  )
  return (
    <Steps n={4} of={4} title="Payout setup">
      <div className="card space-y-3">
        <div className="flex items-center gap-3"><Avatar name={name} /><div><div className="font-bold">{name}</div><div className="text-sm text-brown-soft">{handle} · {platform} · {followers?.toLocaleString('en-SG')} followers</div></div></div>
        <Field label="PayNow number" hint="Needed before your first visit. Visit fees and commission are paid monthly.">
          <input className="input" inputMode="tel" value={paynow} onChange={(e) => setPaynow(e.target.value)} placeholder="8123 4567" />
        </Field>
      </div>
      <button className="btn-primary mt-4 w-full" disabled={!paynow.trim()} onClick={finish}>Submit for approval</button>
    </Steps>
  )
}
