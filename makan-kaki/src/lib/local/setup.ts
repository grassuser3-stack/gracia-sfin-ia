// Creates the database on first run: a tiny stand-in for Supabase's auth schema,
// then the real Makan Kaki schema (same SQL file Supabase would use), then demo data.
import type { PGliteInterface } from '@electric-sql/pglite'
import migration from '../../../supabase/migrations/20261115000000_init.sql?raw'
import { hashPassword } from './hash'

const BOOTSTRAP = `
  do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
  do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
  create schema if not exists auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    password_hash text not null,
    raw_user_meta_data jsonb,
    created_at timestamptz not null default now()
  );
  create or replace function auth.uid() returns uuid language sql stable as
    $f$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`

/** Password for every demo account. Shown on the login page. */
export const DEMO_PASSWORD = 'makan123'

export const DEMO_ACCOUNTS = [
  { email: 'admin@makankaki.test', label: 'Admin', note: 'Founder' },
  { email: 'owner@makankaki.test', label: 'Owner', note: 'Ah Seng Fishball Noodle (Hawker)' },
  { email: 'cafe@makankaki.test', label: 'Owner', note: 'Kopi & Toast Co. (Café)' },
  { email: 'staff@makankaki.test', label: 'Staff', note: 'Counter staff at Ah Seng' },
  { email: 'jason@makankaki.test', label: 'Creator', note: 'Approved, Tampines' },
  { email: 'priya@makankaki.test', label: 'Creator', note: 'Approved, Tampines' },
  { email: 'wei@makankaki.test', label: 'Creator', note: 'Waiting for approval' },
]

export async function setupIfNeeded(db: PGliteInterface) {
  const r = await db.query<{ t: string | null }>(`select to_regclass('public.profiles')::text t`)
  if (r.rows[0].t) return
  await db.exec(BOOTSTRAP)
  await db.exec(migration)
  await seed(db)
}

export async function resetDatabase(db: PGliteInterface) {
  await db.exec(`drop schema public cascade; drop schema auth cascade; create schema public;`)
  await setupIfNeeded(db)
}

async function seed(db: PGliteInterface) {
  const pw = await hashPassword(DEMO_PASSWORD)
  const add = async (email: string, meta: Record<string, unknown>) =>
    (await db.query<{ id: string }>(`insert into auth.users (email, password_hash, raw_user_meta_data) values ($1, $2, $3) returning id`, [email, pw, meta])).rows[0].id

  const admin = await add('admin@makankaki.test', { role: 'staff', name: 'Makan Kaki Founder', phone: '' })
  await db.query(`update profiles set role = 'admin' where id = $1`, [admin])

  const owner = await add('owner@makankaki.test', {
    role: 'owner', name: 'Tan Ah Seng', phone: '9123 4567', outlet_name: 'Ah Seng Fishball Noodle',
    address: 'Blk 201D Tampines St 21, #01-12 Tampines Round Market', hdb_town: 'Tampines', cuisine: 'Teochew fishball noodles', plan: 'hawker',
  })
  const cafe = await add('cafe@makankaki.test', {
    role: 'owner', name: 'Nur Aisyah', phone: '9876 5432', outlet_name: 'Kopi & Toast Co.',
    address: 'Blk 823 Tampines St 81, #01-230', hdb_town: 'Tampines', cuisine: 'Kopitiam breakfast', plan: 'cafe',
  })
  await add('bedok@makankaki.test', {
    role: 'owner', name: 'Lim Mei Ling', phone: '9000 1111', outlet_name: 'Bedok Corner Laksa',
    address: 'Blk 18 Bedok South Rd, #01-05', hdb_town: 'Bedok', cuisine: 'Laksa', plan: 'hawker',
  })
  const creator = (email: string, name: string, handle: string, platform: string, followers: number, languages: string[]) =>
    add(email, { role: 'creator', name, phone: '8123 0000', social_handle: handle, platform, follower_count: followers, hdb_town: 'Tampines', languages })
  const jason = await creator('jason@makankaki.test', 'Jason Lee', '@jasoneatssg', 'TikTok', 4200, ['English', 'Mandarin'])
  const priya = await creator('priya@makankaki.test', 'Priya Nair', '@priyamakan', 'Instagram', 8900, ['English', 'Tamil'])
  await creator('wei@makankaki.test', 'Chen Wei', '@weiweifoodie', 'Xiaohongshu', 1500, ['Mandarin'])
  await db.query(`update creators set approval_status = 'approved' where id in ($1, $2)`, [jason, priya])

  await add('staff@makankaki.test', { role: 'staff', name: 'Kumar', phone: '' })
  await db.query(`insert into staff_members (outlet_id, email, user_id)
    select o.id, 'staff@makankaki.test', (select id from profiles where email = 'staff@makankaki.test') from outlets o where o.owner_id = $1`, [owner])

  const outletOf = async (ownerId: string) => (await db.query<{ id: string }>(`select id from outlets where owner_id = $1`, [ownerId])).rows[0].id
  const ahSeng = await outletOf(owner)
  const kopi = await outletOf(cafe)

  const slot = async (outlet: string, daysFromToday: number, time: string, status = 'open') =>
    (await db.query<{ id: string }>(`insert into visit_slots (outlet_id, slot_date, start_time, status) values ($1, sg_today() + $2::int, $3, $4) returning id`, [outlet, daysFromToday, time, status])).rows[0].id
  const booking = async (slotId: string, creatorId: string, code: string, status: string, link: string | null, daysAgoBooked: number) =>
    (await db.query<{ id: string }>(`insert into bookings (slot_id, creator_id, code, status, post_link, booked_at) values ($1, $2, $3, $4, $5, now() - make_interval(days => $6)) returning id`, [slotId, creatorId, code, status, link, daysAgoBooked])).rows[0].id
  // n redemptions spread over the last few days (kept inside the current month)
  const redeem = async (bookingId: string, n: number) => db.query(
    `insert into redemptions (booking_id, redeemed_at)
     select $1, greatest(now() - make_interval(hours => g * 7), date_trunc('month', now() at time zone 'Asia/Singapore') at time zone 'Asia/Singapore' + interval '1 hour')
     from generate_series(1, $2::int) g`, [bookingId, n])

  // Ah Seng (Hawker): one completed post with diners, one visit waiting for a post link, two open slots
  const b1 = await booking(await slot(ahSeng, -6, '11:00', 'booked'), jason, 'MK-JASON-4821', 'completed', 'https://www.tiktok.com/@jasoneatssg/video/7301', 8)
  await redeem(b1, 14)
  const b2 = await booking(await slot(ahSeng, -2, '15:00', 'booked'), priya, 'MK-PRIYA-3307', 'booked', null, 5)
  await redeem(b2, 3)
  await slot(ahSeng, 3, '10:30')
  await slot(ahSeng, 9, '14:00')

  // Kopi & Toast (Café): an upcoming visit, a missed post, open slots
  await booking(await slot(kopi, 2, '09:00', 'booked'), jason, 'MK-JASON-1188', 'booked', null, 1)
  const b4 = await booking(await slot(kopi, -9, '08:30', 'booked'), priya, 'MK-PRIYA-9042', 'booked', null, 12)
  await redeem(b4, 2)
  await slot(kopi, 1, '10:00')
  await slot(kopi, 4, '09:30')
  await slot(kopi, 6, '16:00')
}
