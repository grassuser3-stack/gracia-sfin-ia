// Runs the Makan Kaki migration in an in-memory Postgres with a minimal Supabase
// auth stub, then checks the security rules and business rules.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

const migration = readFileSync(process.argv[2], 'utf8')
const db = new PGlite()
let pass = 0, fail = 0
const ok = (cond, name, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`) }

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`)
await db.exec(migration)

const q = async (sql, params = []) => (await db.query(sql, params)).rows
async function as(uid, sql, params = []) {
  return db.transaction(async (tx) => {
    await tx.query(`set local role ${uid ? 'authenticated' : 'anon'}`)
    if (uid) await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid])
    return (await tx.query(sql, params)).rows
  })
}
async function asErr(uid, sql, params = []) {
  try { await as(uid, sql, params); return null } catch (e) { return e.message }
}
async function signup(email, meta) {
  const r = await q(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [email, meta])
  return r[0].id
}

// dates: next month, so all visit slots share one month
const [{ d1, d2, d3, today }] = await q(`
  select (date_trunc('month', sg_today()) + interval '1 month' + interval '2 day')::date::text d1,
         (date_trunc('month', sg_today()) + interval '1 month' + interval '3 day')::date::text d2,
         (date_trunc('month', sg_today()) + interval '1 month' + interval '4 day')::date::text d3,
         sg_today()::text today`)

// --- sign-ups ---
const owner1 = await signup('owner1@test.local', { role: 'owner', name: 'Ah Seng', phone: '91234567', outlet_name: 'Ah Seng Noodle', address: 'Blk 201 Tampines', hdb_town: 'Tampines', cuisine: 'Noodles', plan: 'hawker' })
const owner2 = await signup('owner2@test.local', { role: 'owner', name: 'Mei', phone: '92222222', outlet_name: 'Mei Cafe', address: 'Bedok Nth', hdb_town: 'Bedok', cuisine: 'Cafe', plan: 'cafe' })
const cA = await signup('jason@test.local', { role: 'creator', name: 'Jason Tan', phone: '81111111', social_handle: '@jason', platform: 'TikTok', follower_count: 3000, hdb_town: 'Tampines', languages: ['English', 'Mandarin'] })
const cB = await signup('bee@test.local', { role: 'creator', name: 'Bee Lin', phone: '82222222', social_handle: '@bee', platform: 'Instagram', follower_count: 5000, hdb_town: 'Tampines', languages: ['English'] })
const cC = await signup('pending@test.local', { role: 'creator', name: 'Pen Ding', phone: '83333333', social_handle: '@pd', platform: 'TikTok', follower_count: 100, hdb_town: 'Tampines', languages: [] })
const cD = await signup('dee@test.local', { role: 'creator', name: 'Dee', phone: '84444444', social_handle: '@dee', platform: 'TikTok', follower_count: 900, hdb_town: 'Bedok', languages: ['Malay'] })
const admin = await signup('admin@test.local', { role: 'creator', name: 'Founder', phone: '', social_handle: '@f', platform: 'Other', follower_count: 0, hdb_town: 'Bedok', languages: [] })
await q(`delete from creators where id = $1`, [admin])
await q(`update profiles set role = 'admin' where id = $1`, [admin])

ok((await q(`select count(*)::int n from outlets`))[0].n === 2, 'owner sign-up creates outlet')
let e = null
try { await signup('evil@test.local', { role: 'admin', name: 'x' }) } catch (x) { e = x.message }
ok(e && e.includes('Invalid role'), 'cannot sign up as admin')

// --- slots ---
for (const d of [d1, d2, d3]) await as(owner1, `insert into visit_slots (outlet_id, slot_date, start_time) values (my_owned_outlet(), $1, '11:00')`, [d])
await as(owner2, `insert into visit_slots (outlet_id, slot_date, start_time) values (my_owned_outlet(), $1, '15:00')`, [d1])
ok(!!(await asErr(owner1, `insert into visit_slots (outlet_id, slot_date, start_time) values (my_owned_outlet(), (sg_today() - 1), '11:00')`)), 'owner cannot add a past slot')
ok(!!(await asErr(owner1, `insert into visit_slots (outlet_id, slot_date, start_time) values ((select id from outlets where owner_id = '${owner2}'), $1, '11:00')`, [d1])), "owner cannot add slot to another outlet")
ok((await as(owner1, `select count(*)::int n from visit_slots`))[0].n === 3, 'owner sees only own slots')
ok((await as(owner1, `select count(*)::int n from outlets`))[0].n === 1, 'owner sees only own outlet')

// --- approval ---
ok((await as(cA, `select count(*)::int n from open_slots_for_me()`))[0].n === 0, 'pending creator sees no slots')
const s1 = (await q(`select id from visit_slots where slot_date = $1 and outlet_id = (select id from outlets where owner_id=$2)`, [d1, owner1]))[0].id
ok((await asErr(cA, `select * from book_slot($1)`, [s1]))?.includes('approved'), 'pending creator cannot book')
ok(!!(await asErr(cA, `select admin_set_creator_status($1, 'approved')`, [cA])), 'creator cannot approve self via admin fn')
await as(cA, `update creators set approval_status = 'approved' where id = $1`, [cA])
ok((await q(`select approval_status from creators where id=$1`, [cA]))[0].approval_status === 'pending', 'creator cannot approve self via update')
for (const c of [cA, cB, cD]) await as(admin, `select admin_set_creator_status($1, 'approved')`, [c])

ok((await as(cA, `select count(*)::int n from open_slots_for_me()`))[0].n === 3, 'approved Tampines creator sees 3 Tampines slots')
ok((await as(cD, `select outlet_name from open_slots_for_me()`)).map(r => r.outlet_name).join() === 'Mei Cafe', 'Bedok creator sees only Bedok slots')
ok((await as(cC, `select count(*)::int n from open_slots_for_me()`))[0].n === 0, 'still-pending creator sees nothing')

// --- booking ---
const [bk1] = await as(cA, `select * from book_slot($1)`, [s1])
ok(/^AA-JASON-\d{4}$/.test(bk1.code), 'code format', bk1.code)
ok((await as(cB, `select count(*)::int n from open_slots_for_me()`))[0].n === 2, 'booked slot disappears for other creators')
ok((await asErr(cB, `select * from book_slot($1)`, [s1]))?.includes('just booked'), 'second booking of same slot fails')
ok((await asErr(cD, `select * from book_slot((select id from visit_slots where outlet_id = (select id from outlets where owner_id = '${owner1}') and slot_date = '${d2}'))`))?.length > 0, 'creator cannot book outside own town')
const s2 = (await q(`select id from visit_slots where slot_date = $1 and outlet_id = (select id from outlets where owner_id=$2)`, [d2, owner1]))[0].id
const [bk2] = await as(cB, `select * from book_slot($1)`, [s2])
ok(bk2.code !== bk1.code, 'codes differ')
ok((await as(cA, `select count(*)::int n from open_slots_for_me()`))[0].n === 0, 'hawker plan: 2 visits/month used -> remaining slot hidden')
const s3 = (await q(`select id from visit_slots where slot_date = $1`, [d3]))[0].id
ok((await asErr(cA, `select * from book_slot($1)`, [s3]))?.includes('no creator visits left'), 'hawker plan: 3rd booking in month rejected')

// --- visibility ---
ok((await as(cB, `select count(*)::int n from bookings`))[0].n === 1, 'creator sees only own bookings')
ok((await as(owner2, `select count(*)::int n from bookings`))[0].n === 0, "owner2 cannot see owner1's bookings")
ok((await as(owner1, `select count(*)::int n from bookings`))[0].n === 2, 'owner1 sees own bookings')
ok((await as(owner1, `select count(*)::int n from profiles`))[0].n === 1, 'owner cannot read creator profiles (email/phone)')
ok((await as(owner1, `select count(*)::int n from creators`))[0].n === 0, 'owner cannot read creators table')
const ob = await as(owner1, `select * from owner_bookings()`)
ok(ob.length === 2 && !('email' in ob[0]) && ob[0].social_handle, 'owner_bookings returns handle but no email')
ok((await asErr(cA, `select * from owner_bookings()`))?.includes('Not allowed'), 'creator cannot call owner_bookings')
ok((await asErr(owner1, `select * from admin_bookings()`))?.includes('Not allowed'), 'owner cannot call admin functions')
ok((await asErr(null, `select * from outlets`)) !== null || (await as(null, `select count(*)::int n from outlets`))[0].n === 0, 'anon cannot read outlets')
ok(!!(await asErr(null, `select * from open_slots_for_me()`)), 'anon cannot call functions')

// --- redeem ---
ok((await as(owner1, `select redeem_code($1, 10) r`, [bk1.code.toLowerCase()]))[0].r === true, 'redeem lowercase code works')
ok((await as(owner1, `select redeem_code($1, 10) r`, ['  ' + bk1.code + ' ']))[0].r === true, 'redeem with spaces works')
ok((await as(owner2, `select redeem_code($1, 10) r`, [bk1.code]))[0].r === false, "other outlet's code -> not found")
ok((await as(owner1, `select redeem_code('AA-NOPE-0000', 10) r`))[0].r === false, 'unknown code -> not found')
ok(!!(await asErr(cA, `select redeem_code($1, 10)`, [bk1.code])), 'creator cannot redeem')
ok((await as(owner1, `select redemptions_month::int n from owner_bookings() where code = $1`, [bk1.code]))[0].n === 2, 'redemption count = 2')
ok((await as(cA, `select redemptions::int n from my_bookings()`))[0].n === 2, 'creator sees own count')
ok((await as(cB, `select count(*)::int n from redemptions`))[0].n === 0, "creator can't see others' redemptions")

// --- staff ---
await as(owner1, `select add_staff('Staff1@Test.local')`)
await as(owner1, `select add_staff('staff2@test.local')`)
await as(owner1, `select add_staff('staff3@test.local')`)
ok((await asErr(owner1, `select add_staff('staff4@test.local')`))?.includes('up to 3'), 'max 3 staff')
const st = await signup('staff1@test.local', { role: 'staff', name: 'Kumar' })
ok((await as(st, `select claim_staff_access() n`))[0].n === 'Ah Seng Noodle', 'staff linked to outlet')
ok((await as(st, `select redeem_code($1, 10) r`, [bk2.code]))[0].r === true, 'staff can redeem')
ok((await as(st, `select count(*)::int n from bookings`))[0].n === 0, 'staff cannot see bookings')
ok((await as(st, `select count(*)::int n from redemptions`))[0].n === 0, 'staff cannot see redemptions')
ok(!!(await asErr(st, `select * from owner_bookings()`)), 'staff cannot see dashboard data')
ok((await as(owner2, `select redeem_code($1, 10) r`, [bk2.code]))[0].r === false, "staff code isn't redeemable at other outlet")
const rando = await signup('rando@test.local', { role: 'staff', name: 'R' })
ok((await as(rando, `select claim_staff_access() n`))[0].n === null, 'uninvited staff has no outlet')
ok(!!(await asErr(rando, `select redeem_code($1, 10)`, [bk2.code])), 'uninvited staff cannot redeem')
await as(owner1, `delete from staff_members where email = 'staff1@test.local'`)
ok(!!(await asErr(st, `select redeem_code($1, 10)`, [bk2.code])), 'removed staff loses access')

// --- cancel ---
await as(admin, `select admin_cancel_booking($1)`, [bk1.booking_id])
ok((await q(`select status from visit_slots where id=$1`, [s1]))[0].status === 'open', 'cancel reopens future slot')
ok((await as(owner1, `select redeem_code($1, 10) r`, [bk1.code]))[0].r === false, 'cancelled code stops working')
ok((await as(cB, `select count(*)::int n from open_slots_for_me()`))[0].n === 2, 'after cancel, visits left again and slots reappear')

// --- 30-day window, missed, post link (direct inserts as superuser) ---
const o1 = (await q(`select id from outlets where owner_id=$1`, [owner1]))[0].id
async function pastBooking(daysAgo, code, creator = cA) {
  const s = (await q(`insert into visit_slots (outlet_id, slot_date, start_time, status) values ($1, sg_today() - $2::int, '10:00', 'booked') returning id`, [o1, daysAgo]))[0].id
  return (await q(`insert into bookings (slot_id, creator_id, code) values ($1, $2, $3) returning id`, [s, creator, code]))[0].id
}
await pastBooking(31, 'AA-OLD-0031')
await pastBooking(30, 'AA-OLD-0030')
ok((await as(owner1, `select redeem_code('AA-OLD-0031', 10) r`))[0].r === false, 'code 31 days after visit -> not found')
ok((await as(owner1, `select redeem_code('AA-OLD-0030', 10) r`))[0].r === true, 'code exactly 30 days after visit -> ok')
const m8 = await pastBooking(8, 'AA-MISS-0008')
const p3 = await pastBooking(3, 'AA-POST-0003')
const mine = await as(cA, `select booking_id, status from my_bookings()`)
ok(mine.find(r => r.booking_id === m8)?.status === 'missed', 'no link 8 days after visit -> missed')
ok(mine.find(r => r.booking_id === p3)?.status === 'booked', '3 days after visit -> still booked')
ok((await asErr(cA, `select submit_post_link($1, 'not a link')`, [p3]))?.includes('https'), 'invalid link rejected')
ok((await asErr(cB, `select submit_post_link($1, 'https://tiktok.com/x')`, [p3]))?.includes('not found'), "can't submit for someone else's booking")
await as(cA, `select submit_post_link($1, 'https://www.tiktok.com/@jason/video/1')`, [p3])
ok((await q(`select status from bookings where id=$1`, [p3]))[0].status === 'completed', 'post link -> completed')
ok((await asErr(cA, `select submit_post_link($1, 'https://tiktok.com/x')`, [m8]))?.includes('7-day'), 'missed booking cannot submit')
ok((await asErr(cB, `select submit_post_link($1, 'https://tiktok.com/x')`, [bk2.booking_id]))?.includes('on or after'), 'cannot submit before visit date')
ok((await as(owner1, `select redeem_code('AA-MISS-0008', 10) r`))[0].r === true, 'missed booking code still redeemable within 30 days')
await as(admin, `select admin_cancel_booking($1)`, [m8])
ok((await q(`select s.status from visit_slots s join bookings b on b.slot_id = s.id where b.id=$1`, [m8]))[0].status === 'booked', 'cancel does not reopen past slot')

// --- bill amounts and commission ---
for (const bad of ['0', '-5', '1.234', '5000.01', 'null']) {
  ok((await asErr(owner1, `select redeem_code($1, ${bad})`, [bk2.code]))?.includes('bill amount'), `bill ${bad} rejected`)
}
ok((await as(owner1, `select redeem_code($1, 23.45) r`, [bk2.code]))[0].r === true, 'redeem with a real bill amount')
const bee = (await as(cB, `select earnings from my_bookings() where code = $1`, [bk2.code]))[0]
ok(Number(bee.earnings) === 0.67, 'creator earns 2% of bills (10 + 23.45 -> 0.67)', bee.earnings)
const ownerSpend = (await as(owner1, `select spend_month from owner_bookings() where code = $1`, [bk2.code]))[0]
ok(Number(ownerSpend.spend_month) === 33.45, 'owner sees diner spend per post', ownerSpend.spend_month)

// --- billing ---
const bill = await as(admin, `select * from admin_billing(sg_today())`)
const b1 = bill.find(r => r.outlet_name === 'Ah Seng Noodle')
const [{ n1, s1sum }] = await q(`select count(*)::int n1, sum(bill_amount)::float s1sum from redemptions r join bookings b on b.id=r.booking_id join visit_slots s on s.id=b.slot_id where s.outlet_id=$1`, [o1])
const commission = Math.round(s1sum * 10) / 100
ok(bill.length === 2 && Number(b1.redemptions) === n1 && Number(b1.diner_spend) === s1sum, 'billing counts redemptions and spend', JSON.stringify(b1))
ok(Number(b1.commission) === commission && Number(b1.total_owed) === Math.round((99 + commission) * 100) / 100, 'owed = plan fee + 10% of bills')
ok(Number(b1.creator_payouts) === Math.round(s1sum * 2) / 100, 'creator payouts = 2% of bills (a fifth of commission)')
const payouts = await as(admin, `select * from admin_creator_payouts(sg_today())`)
ok(payouts.reduce((t, p) => t + Number(p.payout), 0).toFixed(2) === (s1sum * 0.02).toFixed(2), 'per-creator payouts add up', JSON.stringify(payouts.map(p => [p.creator_name, p.payout])))
ok(!!(await asErr(cA, `select * from admin_creator_payouts(sg_today())`)), 'creator cannot see payout list')
ok(Number(bill.find(r => r.outlet_name === 'Mei Cafe').total_owed) === 299, 'cafe with no redemptions owes 299')
ok((await as(admin, `select count(*)::int n from admin_billing((sg_today() - interval '2 month')::date)`))[0].n === 0, 'billing excludes outlets not yet created')
ok(!!(await asErr(owner1, `select * from admin_billing(sg_today())`)), 'owner cannot export billing')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
