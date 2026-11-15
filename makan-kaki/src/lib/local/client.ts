// A small Supabase-style client backed by the in-browser Postgres.
// Every query runs as the logged-in user (role "authenticated" + their user id),
// so the row-level security rules in the SQL file apply exactly as on Supabase.
import { PGliteWorker } from '@electric-sql/pglite/worker'
import { checkPassword, hashPassword } from './hash'
import { resetDatabase } from './setup'

export type Session = { user: { id: string; email: string } }
type DbError = { message: string }
type Result<T = any> = { data: T; error: DbError | null } // eslint-disable-line @typescript-eslint/no-explicit-any

// Keep dates/times as plain strings, like Supabase's REST API does.
const asIso = (v: string) => new Date(v.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00')).toISOString()
const PARSERS = { 1082: (v: string) => v, 1083: (v: string) => v, 1114: asIso, 1184: asIso }

let dbPromise: Promise<PGliteWorker> | null = null
function getDb() {
  dbPromise ??= PGliteWorker.create(new Worker(new URL('./pg.worker.ts', import.meta.url), { type: 'module' }))
  return dbPromise
}

const SESSION_KEY = 'mk-session' // per tab, so you can be a different user in each tab
function readSession(): Session | null {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') } catch { return null }
}
function writeSession(s: Session | null) {
  try { s ? sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)) : sessionStorage.removeItem(SESSION_KEY) } catch { /* storage blocked */ }
}

/** SQL literal for a value (standard_conforming_strings is on, so only quotes need escaping). */
function lit(v: unknown): string {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'number') { if (!Number.isFinite(v)) throw new Error('Bad number'); return String(v) }
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return `'${s.replace(/'/g, "''")}'`
}

/**
 * Run one statement as the logged-in user. Everything is sent as a single
 * multi-statement message, which Postgres runs as one implicit transaction:
 * the role switch can't leak to other queries or tabs, and an error rolls it all back.
 */
async function runAs<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb()
  const uid = readSession()?.user.id
  const body = sql.replace(/\$(\d+)/g, (_, n) => lit(params[Number(n) - 1]))
  const results = await db.exec(
    `set local role ${uid ? 'authenticated' : 'anon'};
     select set_config('request.jwt.claim.sub', ${lit(uid ?? '')}, true);
     ${body};`,
    { parsers: PARSERS },
  )
  return results[results.length - 1].rows as T[]
}

const IDENT = /^[a-z_][a-z0-9_]*$/
function ident(name: string) {
  if (!IDENT.test(name)) throw new Error(`Bad name: ${name}`)
  return name
}
const fail = (e: unknown): Result<null> => ({ data: null, error: { message: (e as Error)?.message ?? String(e) } })

class Query implements PromiseLike<Result> {
  private op: 'select' | 'insert' | 'delete' = 'select'
  private cols = '*'
  private row: Record<string, unknown> = {}
  private filters: [string, string, unknown][] = []
  private orders: [string, boolean][] = []
  private mode: 'many' | 'single' | 'maybe' = 'many'
  private table: string
  constructor(table: string) { this.table = table }

  select(cols = '*') { this.cols = cols; return this }
  insert(row: Record<string, unknown>) { this.op = 'insert'; this.row = row; return this }
  delete() { this.op = 'delete'; return this }
  eq(col: string, v: unknown) { this.filters.push([col, '=', v]); return this }
  gte(col: string, v: unknown) { this.filters.push([col, '>=', v]); return this }
  order(col: string, opts: { ascending?: boolean } = {}) { this.orders.push([col, opts.ascending !== false]); return this }
  single() { this.mode = 'single'; return this }
  maybeSingle() { this.mode = 'maybe'; return this }

  then<A = Result, B = never>(ok?: ((r: Result) => A | PromiseLike<A>) | null, err?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return this.run().then(ok, err)
  }

  private async run(): Promise<Result> {
    try {
      const t = `public.${ident(this.table)}`
      const params: unknown[] = []
      const where = this.filters.length
        ? ' where ' + this.filters.map(([c, op, v]) => { params.push(v); return `${ident(c)} ${op} $${params.length}` }).join(' and ')
        : ''
      if (this.op === 'insert') {
        const keys = Object.keys(this.row).map(ident)
        await runAs(`insert into ${t} (${keys.join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')})`, Object.values(this.row))
        return { data: null, error: null }
      }
      if (this.op === 'delete') {
        await runAs(`delete from ${t}${where}`, params)
        return { data: null, error: null }
      }
      const cols = this.cols.trim() === '*' ? '*' : this.cols.split(',').map((c) => ident(c.trim())).join(', ')
      const order = this.orders.length ? ' order by ' + this.orders.map(([c, asc]) => `${ident(c)} ${asc ? 'asc' : 'desc'}`).join(', ') : ''
      const rows = await runAs(`select ${cols} from ${t}${where}${order}`, params)
      if (this.mode === 'many') return { data: rows, error: null }
      if (rows.length > 1) return fail(new Error('More than one row'))
      if (this.mode === 'single' && rows.length === 0) return fail(new Error('No row found'))
      return { data: rows[0] ?? null, error: null }
    } catch (e) { return fail(e) }
  }
}

// Functions that return one value (or nothing) rather than a table.
const SCALAR_FUNCTIONS = new Set([
  'redeem_code', 'claim_staff_access', 'submit_post_link', 'add_staff',
  'admin_set_creator_status', 'admin_cancel_booking', 'admin_update_booking',
])

type Listener = (event: string, session: Session | null) => void
const listeners = new Set<Listener>()
const emit = (event: string) => listeners.forEach((l) => l(event, readSession()))

const channels = new Map<string, BroadcastChannel>()

export const supabase = {
  from: (table: string) => new Query(table),

  async rpc(fn: string, args: Record<string, unknown> = {}): Promise<Result> {
    try {
      const keys = Object.keys(args).map(ident)
      const rows = await runAs<Record<string, unknown>>(
        `select * from public.${ident(fn)}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')})`, Object.values(args))
      if (SCALAR_FUNCTIONS.has(fn)) {
        const v = rows[0]?.[fn]
        return { data: v === '' || v === undefined ? null : v, error: null }
      }
      return { data: rows, error: null }
    } catch (e) { return fail(e) }
  },

  auth: {
    async getSession() { return { data: { session: readSession() } } },

    onAuthStateChange(cb: Listener) {
      listeners.add(cb)
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }
    },

    async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
      try {
        const e = email.trim().toLowerCase()
        if (password.length < 6) throw new Error('Password should be at least 6 characters')
        const db = await getDb()
        const exists = await db.query(`select 1 from auth.users where email = $1`, [e])
        if (exists.rows.length) throw new Error('User already registered')
        const hash = await hashPassword(password)
        const r = await db.query<{ id: string }>(
          `insert into auth.users (email, password_hash, raw_user_meta_data) values ($1, $2, $3) returning id`, [e, hash, options?.data ?? {}])
        const session = { user: { id: r.rows[0].id, email: e } }
        writeSession(session)
        emit('SIGNED_IN')
        return { data: { session, user: session.user }, error: null }
      } catch (err) {
        const m = (err as Error).message
        // the sign-up trigger raised an error (bad role, missing field…)
        const message = m === 'User already registered' || m.startsWith('Password') ? m : 'Database error saving new user'
        return { data: { session: null, user: null }, error: { message } }
      }
    },

    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const db = await getDb()
      const e = email.trim().toLowerCase()
      const r = await db.query<{ id: string; password_hash: string }>(`select id, password_hash from auth.users where email = $1`, [e])
      const u = r.rows[0]
      if (!u || !(await checkPassword(password, u.password_hash))) {
        return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } }
      }
      const session = { user: { id: u.id, email: e } }
      writeSession(session)
      emit('SIGNED_IN')
      return { data: { user: session.user, session }, error: null }
    },

    async signOut() {
      writeSession(null)
      emit('SIGNED_OUT')
      return { error: null }
    },
  },

  /** Cross-tab "something changed" messages (e.g. a slot was booked). */
  channel(name: string) {
    const bc = channels.get(name) ?? new BroadcastChannel(`mk-${name}`)
    channels.set(name, bc)
    const api = {
      on(_type: 'broadcast', filter: { event: string }, cb: () => void) {
        bc.addEventListener('message', (m) => { if (m.data?.event === filter.event) cb() })
        return api
      },
      subscribe() { return api },
      async send(msg: { type: 'broadcast'; event: string; payload: unknown }) { bc.postMessage({ event: msg.event }) },
      close() { bc.close(); channels.delete(name) },
    }
    return api
  },
  removeChannel(ch: { close: () => void }) { ch.close() },
}

/** Wipe everything and restore the demo data. */
export async function resetDemoData() {
  const db = await getDb()
  await resetDatabase(db)
  writeSession(null)
  emit('SIGNED_OUT')
  new BroadcastChannel('mk-slots').postMessage({ event: 'changed' })
}
