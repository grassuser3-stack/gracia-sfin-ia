import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase, errorText } from '../lib/supabase'
import { HDB_TOWNS, LANGUAGES, PLANS, PLATFORMS, type Plan } from '../lib/format'
import { Alert, Field, Logo, LOGO_URL } from '../components/ui'
import { homeFor, type Role } from '../lib/auth'
import { resetDemoData } from '../lib/local/client'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../lib/local/setup'

function TopBar() {
  return (
    <div className="flex items-center justify-between py-4">
      <Link to="/"><Logo small /></Link>
      <Link to="/login" className="link text-sm">Log in</Link>
    </div>
  )
}

export function Landing() {
  return (
    <>
      <TopBar />
      <section className="pt-6">
        <img src={LOGO_URL} alt="Makan Kaki logo" className="mb-5 h-28 w-28" />
        <span className="chip bg-orange-soft text-brown">For hawkers, cafés &amp; local creators</span>
        <h1 className="mt-4 text-4xl font-extrabold leading-[1.1]">
          Local creators.<br />Real diners.<br /><span className="text-orange">Counted.</span>
        </h1>
        <p className="mt-4 text-lg text-brown-soft">
          Makan Kaki matches hawker stalls and cafés with nano-creators from the same HDB town. Every post gets a
          unique code, so you see exactly how many diners each video brought in.
        </p>
        <div className="mt-6 grid gap-3">
          <Link to="/signup/owner" className="btn-primary">I run a stall or café</Link>
          <Link to="/signup/creator" className="btn-secondary">I'm a creator</Link>
        </div>
      </section>

      <section className="mt-10 grid gap-3">
        {[
          ['1', 'Owners post visit slots', 'Pick a date and time a creator can come film.'],
          ['2', 'Creators book a makan', 'Approved creators in your HDB town book in under a minute and get a code like MK-JASON-4821.'],
          ['3', 'Diners show the code', 'Staff type it in at the counter. Each code counts as one diner.'],
          ['4', 'See what worked', 'Your dashboard shows diners per creator post and your cost per diner.'],
        ].map(([n, t, d]) => (
          <div key={n} className="card flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange font-heading text-lg font-bold text-white">{n}</div>
            <div>
              <h3 className="font-bold">{t}</h3>
              <p className="text-sm text-brown-soft">{d}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Simple plans</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(Object.keys(PLANS) as Plan[]).map((p) => (
            <div key={p} className="card">
              <div className="font-heading font-bold">{PLANS[p].label}</div>
              <div className="mt-1 font-heading text-2xl font-extrabold">S${PLANS[p].fee}<span className="text-sm font-semibold text-brown-soft">/mo</span></div>
              <div className="mt-1 text-sm text-brown-soft">{PLANS[p].visits} creator visits a month, plus S$1 per diner redeemed</div>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-10 text-center text-sm text-brown-soft">
        Counter staff? <Link to="/signup/staff" className="link">Set up your staff login</Link>
      </p>
    </>
  )
}

function useSignup(role: Role) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [checkEmail, setCheckEmail] = useState(false)

  async function submit(email: string, password: string, data: Record<string, unknown>, after: string) {
    setBusy(true); setError('')
    const { data: res, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { role, ...data } },
    })
    setBusy(false)
    if (error) { setError(errorText(error)); return }
    if (!res.session) { setCheckEmail(true); return }
    navigate(after, { replace: true })
  }
  return { busy, error, checkEmail, submit }
}

function CheckEmail() {
  return (
    <>
      <TopBar />
      <div className="card mt-6 text-center">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="mt-2 text-brown-soft">We sent you a link to confirm your account. Tap it, then log in.</p>
        <Link to="/login" className="btn-primary mt-5 w-full">Go to log in</Link>
      </div>
    </>
  )
}

function Account({ email, setEmail, password, setPassword }: {
  email: string; setEmail: (v: string) => void; password: string; setPassword: (v: string) => void
}) {
  return (
    <>
      <Field label="Email">
        <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Password" hint="At least 6 characters">
        <input className="input" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
    </>
  )
}

function TownSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className="input" required value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>Choose your HDB town</option>
      {HDB_TOWNS.map((t) => <option key={t}>{t}</option>)}
    </select>
  )
}

export function SignupChoose() {
  return (
    <>
      <TopBar />
      <h1 className="mt-4 text-3xl font-bold">Join Makan Kaki</h1>
      <p className="mt-1 text-brown-soft">Who are you signing up as?</p>
      <div className="mt-6 grid gap-3">
        <Link to="/signup/owner" className="card block border-2 border-transparent hover:border-orange">
          <div className="font-heading text-lg font-bold">Outlet owner</div>
          <div className="text-sm text-brown-soft">I run a hawker stall or café and want creators to visit.</div>
        </Link>
        <Link to="/signup/creator" className="card block border-2 border-transparent hover:border-orange">
          <div className="font-heading text-lg font-bold">Creator</div>
          <div className="text-sm text-brown-soft">I post food content and want to film at outlets in my HDB town.</div>
        </Link>
      </div>
      <p className="mt-6 text-center text-sm text-brown-soft">
        Counter staff? <Link to="/signup/staff" className="link">Set up your staff login</Link>
      </p>
    </>
  )
}

export function SignupOwner() {
  const { busy, error, checkEmail, submit } = useSignup('owner')
  const [f, setF] = useState({ name: '', phone: '', outlet_name: '', address: '', hdb_town: '', cuisine: '', plan: 'hawker' as Plan })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }))

  if (checkEmail) return <CheckEmail />
  return (
    <>
      <TopBar />
      <h1 className="mt-2 text-2xl font-bold">Register your outlet</h1>
      <p className="mt-1 text-brown-soft">Takes about a minute. Next you'll add visit slots.</p>
      <form className="mt-5 space-y-4" onSubmit={(e: FormEvent) => { e.preventDefault(); submit(email, password, f, '/owner/slots?welcome=1') }}>
        <div className="card space-y-4">
          <h2 className="font-bold">Your outlet</h2>
          <Field label="Outlet name"><input className="input" required placeholder="e.g. Ah Seng Fishball Noodle" value={f.outlet_name} onChange={(e) => set('outlet_name')(e.target.value)} /></Field>
          <Field label="Address"><input className="input" required placeholder="e.g. Blk 201D Tampines St 21, #01-12" value={f.address} onChange={(e) => set('address')(e.target.value)} /></Field>
          <Field label="HDB town"><TownSelect value={f.hdb_town} onChange={set('hdb_town')} /></Field>
          <Field label="Cuisine"><input className="input" required placeholder="e.g. Teochew noodles" value={f.cuisine} onChange={(e) => set('cuisine')(e.target.value)} /></Field>
          <div>
            <span className="label">Plan</span>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(PLANS) as Plan[]).map((p) => (
                <button type="button" key={p} onClick={() => set('plan')(p)}
                  className={`rounded-xl border-2 p-3 text-left ${f.plan === p ? 'border-orange bg-orange-soft' : 'border-brown-line bg-white'}`}>
                  <div className="font-bold">{PLANS[p].label}</div>
                  <div className="text-sm text-brown-soft">S${PLANS[p].fee}/mo · {PLANS[p].visits} visits</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="card space-y-4">
          <h2 className="font-bold">About you</h2>
          <Field label="Your name"><input className="input" required autoComplete="name" value={f.name} onChange={(e) => set('name')(e.target.value)} /></Field>
          <Field label="Phone"><input className="input" required type="tel" inputMode="tel" autoComplete="tel" placeholder="e.g. 9123 4567" value={f.phone} onChange={(e) => set('phone')(e.target.value)} /></Field>
          <Account email={email} setEmail={setEmail} password={password} setPassword={setPassword} />
        </div>
        {error && <Alert kind="bad">{error}</Alert>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Register my outlet'}</button>
        <p className="text-center text-xs text-brown-soft">We only collect what we need to run Makan Kaki (PDPA).</p>
      </form>
    </>
  )
}

export function SignupCreator() {
  const { busy, error, checkEmail, submit } = useSignup('creator')
  const [f, setF] = useState({ name: '', phone: '', social_handle: '', platform: 'TikTok', follower_count: '', hdb_town: '' })
  const [langs, setLangs] = useState<string[]>(['English'])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }))
  const toggle = (l: string) => setLangs((p) => (p.includes(l) ? p.filter((x) => x !== l) : [...p, l]))

  if (checkEmail) return <CheckEmail />
  return (
    <>
      <TopBar />
      <h1 className="mt-2 text-2xl font-bold">Sign up as a creator</h1>
      <p className="mt-1 text-brown-soft">Our team approves every creator before they can book visits.</p>
      <form className="mt-5 space-y-4" onSubmit={(e: FormEvent) => {
        e.preventDefault()
        submit(email, password, { ...f, social_handle: f.social_handle.trim().replace(/^@?/, '@'), follower_count: Number(f.follower_count), languages: langs }, '/creator')
      }}>
        <div className="card space-y-4">
          <Field label="Your name"><input className="input" required autoComplete="name" value={f.name} onChange={(e) => set('name')(e.target.value)} /></Field>
          <Field label="Phone"><input className="input" required type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => set('phone')(e.target.value)} /></Field>
          <Field label="Social handle"><input className="input" required placeholder="@yourhandle" value={f.social_handle} onChange={(e) => set('social_handle')(e.target.value)} /></Field>
          <Field label="Main platform">
            <select className="input" value={f.platform} onChange={(e) => set('platform')(e.target.value)}>
              {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Follower count"><input className="input" required type="number" inputMode="numeric" min={0} value={f.follower_count} onChange={(e) => set('follower_count')(e.target.value)} /></Field>
          <Field label="HDB town you live in"><TownSelect value={f.hdb_town} onChange={set('hdb_town')} /></Field>
          <div>
            <span className="label">Languages you post in</span>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button type="button" key={l} onClick={() => toggle(l)}
                  className={`min-h-[44px] rounded-full border-2 px-4 text-sm font-semibold ${langs.includes(l) ? 'border-orange bg-orange-soft' : 'border-brown-line bg-white'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <Account email={email} setEmail={setEmail} password={password} setPassword={setPassword} />
        </div>
        {error && <Alert kind="bad">{error}</Alert>}
        <button className="btn-primary w-full" disabled={busy || langs.length === 0}>{busy ? 'Creating…' : 'Sign me up'}</button>
        <p className="text-center text-xs text-brown-soft">We only collect what we need to run Makan Kaki (PDPA).</p>
      </form>
    </>
  )
}

export function SignupStaff() {
  const { busy, error, checkEmail, submit } = useSignup('staff')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  if (checkEmail) return <CheckEmail />
  return (
    <>
      <TopBar />
      <h1 className="mt-2 text-2xl font-bold">Counter staff login</h1>
      <p className="mt-1 text-brown-soft">Use the email your outlet owner added for you. Staff can only redeem codes.</p>
      <form className="card mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); submit(email, password, { name }, '/staff') }}>
        <Field label="Your name"><input className="input" required value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Account email={email} setEmail={setEmail} password={password} setPassword={setPassword} />
        {error && <Alert kind="bad">{error}</Alert>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create staff login'}</button>
      </form>
    </>
  )
}

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function logIn(em: string, pw: string) {
    setBusy(true); setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email: em.trim(), password: pw })
    if (error || !data.user) { setBusy(false); setError(errorText(error)); return }
    const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    setBusy(false)
    const home = homeFor(p?.role)
    navigate(from && from.startsWith(home) ? from : home, { replace: true })
  }
  function onSubmit(e: FormEvent) {
    e.preventDefault()
    logIn(email, password)
  }
  async function reset() {
    if (!window.confirm('Delete everything in this demo and restore the sample data?')) return
    setBusy(true)
    await resetDemoData()
    setBusy(false)
    setError('')
  }

  return (
    <>
      <TopBar />
      <h1 className="mt-4 text-3xl font-bold">Welcome back</h1>
      {from && <p className="mt-1 text-brown-soft">Please log in to continue.</p>}
      <form className="card mt-5 space-y-4" onSubmit={onSubmit}>
        <Field label="Email"><input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password"><input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {error && <Alert kind="bad">{error}</Alert>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <p className="mt-6 text-center text-brown-soft">New here? <Link to="/signup" className="link">Sign up</Link></p>

      <section className="mt-10">
        <h2 className="text-lg font-bold">Demo accounts</h2>
        <p className="text-sm text-brown-soft">Tap one to log in. Every demo password is <span className="font-mono font-semibold text-brown">{DEMO_PASSWORD}</span>.</p>
        <div className="mt-3 grid gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button key={a.email} disabled={busy} onClick={() => logIn(a.email, DEMO_PASSWORD)}
              className="card flex min-h-[56px] items-center justify-between gap-3 py-3 text-left transition active:scale-[0.99]">
              <span className="min-w-0">
                <span className="block font-bold">{a.label} <span className="font-normal text-brown-soft">· {a.note}</span></span>
                <span className="block truncate text-xs text-brown-soft">{a.email}</span>
              </span>
              <span aria-hidden className="text-xl text-brown-soft">›</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-brown-soft">
          Data is saved in this browser only. Each tab can be logged in as a different person.{' '}
          <button onClick={reset} disabled={busy} className="font-semibold text-brown underline underline-offset-2">Reset demo data</button>
        </p>
      </section>
    </>
  )
}
