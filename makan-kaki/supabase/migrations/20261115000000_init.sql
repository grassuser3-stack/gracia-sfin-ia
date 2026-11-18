-- Makan Kaki: schema, row-level security and server functions.
-- Run this once in a fresh Supabase project (SQL editor, or `supabase db push`).

-- ---------------------------------------------------------------
-- Helpers that don't depend on tables
-- ---------------------------------------------------------------

-- "Today" in Singapore time. All date rules use this.
create or replace function public.sg_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Singapore')::date $$;

create or replace function public.sg_now_time() returns time
language sql stable as $$ select (now() at time zone 'Asia/Singapore')::time $$;

-- Plan prices (SGD) and visits included per month.
create or replace function public.plan_fee(p_plan text) returns numeric
language sql immutable as $$ select case p_plan when 'hawker' then 99 when 'cafe' then 299 end::numeric $$;

create or replace function public.plan_visits(p_plan text) returns int
language sql immutable as $$ select case p_plan when 'hawker' then 2 when 'cafe' then 5 end $$;

-- Outlets pay 10% commission on each redeemed diner's bill.
-- Creators earn a fifth of that commission (2% of the bill).
create or replace function public.commission_rate() returns numeric
language sql immutable as $$ select 0.10::numeric $$;

create or replace function public.creator_rate() returns numeric
language sql immutable as $$ select 0.02::numeric $$;

-- ---------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'creator', 'staff', 'admin')),
  name text not null default '',
  email text not null,
  phone text not null default '',
  created_at timestamptz not null default now()
);

create table public.outlets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null,
  address text not null,
  hdb_town text not null,
  cuisine text not null,
  plan text not null check (plan in ('hawker', 'cafe')),
  created_at timestamptz not null default now()
);

create table public.creators (
  id uuid primary key references public.profiles(id) on delete cascade,
  social_handle text not null,
  platform text not null check (platform in ('TikTok', 'Instagram', 'YouTube', 'Xiaohongshu', 'Other')),
  follower_count int not null check (follower_count >= 0),
  hdb_town text not null,
  languages text[] not null default '{}',
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected'))
);

-- Counter staff invited by an owner (max 3 per outlet). user_id is filled in
-- once someone signs up as staff with that email.
create table public.staff_members (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references public.outlets(id) on delete cascade,
  email text not null,
  user_id uuid unique references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (outlet_id, email)
);

create table public.visit_slots (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references public.outlets(id) on delete cascade,
  slot_date date not null,
  start_time time not null,
  status text not null default 'open' check (status in ('open', 'booked')),
  created_at timestamptz not null default now()
);
create index on public.visit_slots (outlet_id, slot_date);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.visit_slots(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete cascade,
  code text not null unique check (code = upper(code)),
  booked_at timestamptz not null default now(),
  post_link text,
  status text not null default 'booked' check (status in ('booked', 'completed', 'missed', 'cancelled'))
);
-- One visit slot has at most one live booking.
create unique index bookings_one_live_per_slot on public.bookings (slot_id) where status <> 'cancelled';
create index on public.bookings (creator_id);

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  bill_amount numeric(10, 2) not null check (bill_amount > 0 and bill_amount <= 5000), -- SGD, typed at the counter
  redeemed_by uuid references public.profiles(id) on delete set null
);
create index on public.redemptions (booking_id, redeemed_at);

-- ---------------------------------------------------------------
-- Who-am-I helpers (security definer so policies can use them
-- without recursive RLS checks)
-- ---------------------------------------------------------------

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false)
$$;

create or replace function public.my_owned_outlet() returns uuid
language sql stable security definer set search_path = public as $$
  select id from outlets where owner_id = auth.uid()
$$;

create or replace function public.my_staff_outlet() returns uuid
language sql stable security definer set search_path = public as $$
  select outlet_id from staff_members where user_id = auth.uid()
$$;

-- Outlet whose codes this user may redeem (owner or staff).
create or replace function public.my_counter_outlet() returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_owned_outlet(), public.my_staff_outlet())
$$;

-- ---------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.outlets enable row level security;
alter table public.creators enable row level security;
alter table public.staff_members enable row level security;
alter table public.visit_slots enable row level security;
alter table public.bookings enable row level security;
alter table public.redemptions enable row level security;

-- profiles: yourself, or admin
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy profiles_admin_update on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- outlets: owner, that outlet's staff, admin
create policy outlets_select on public.outlets for select
  using (owner_id = auth.uid() or id = public.my_staff_outlet() or public.is_admin());
create policy outlets_admin_update on public.outlets for update
  using (public.is_admin()) with check (public.is_admin());

-- creators: yourself, or admin
create policy creators_select on public.creators for select
  using (id = auth.uid() or public.is_admin());
create policy creators_admin_update on public.creators for update
  using (public.is_admin()) with check (public.is_admin());

-- staff_members: the outlet's owner, the staff member, admin
create policy staff_select on public.staff_members for select
  using (outlet_id = public.my_owned_outlet() or user_id = auth.uid() or public.is_admin());
create policy staff_delete on public.staff_members for delete
  using (outlet_id = public.my_owned_outlet() or public.is_admin());

-- visit_slots: owner manages own; admin all. Creators read open slots via functions.
create policy slots_select on public.visit_slots for select
  using (outlet_id = public.my_owned_outlet() or public.is_admin());
create policy slots_owner_insert on public.visit_slots for insert
  with check (outlet_id = public.my_owned_outlet() and status = 'open' and slot_date >= public.sg_today());
create policy slots_owner_delete on public.visit_slots for delete
  using ((outlet_id = public.my_owned_outlet() and status = 'open') or public.is_admin());
create policy slots_admin_update on public.visit_slots for update
  using (public.is_admin()) with check (public.is_admin());

-- bookings: the creator, the outlet's owner, admin
create policy bookings_select on public.bookings for select
  using (
    creator_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.visit_slots s where s.id = slot_id and s.outlet_id = public.my_owned_outlet())
  );
create policy bookings_admin_update on public.bookings for update
  using (public.is_admin()) with check (public.is_admin());

-- redemptions: whoever can see the booking (creator, owner, admin). Staff cannot.
create policy redemptions_select on public.redemptions for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.bookings b join public.visit_slots s on s.id = b.slot_id
      where b.id = booking_id and (b.creator_id = auth.uid() or s.outlet_id = public.my_owned_outlet())
    )
  );

-- ---------------------------------------------------------------
-- Sign-up: create profile (+ outlet or creator row) from sign-up form data.
-- Admin can never be chosen at sign-up; promote with SQL instead.
-- ---------------------------------------------------------------

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text := m->>'role';
begin
  if r not in ('owner', 'creator', 'staff') then
    raise exception 'Invalid role';
  end if;

  insert into profiles (id, role, name, email, phone)
  values (new.id, r, coalesce(m->>'name', ''), lower(new.email), coalesce(m->>'phone', ''));

  if r = 'owner' then
    insert into outlets (owner_id, name, address, hdb_town, cuisine, plan)
    values (new.id, m->>'outlet_name', m->>'address', m->>'hdb_town', m->>'cuisine', m->>'plan');
  elsif r = 'creator' then
    insert into creators (id, social_handle, platform, follower_count, hdb_town, languages)
    values (
      new.id,
      m->>'social_handle',
      m->>'platform',
      coalesce((m->>'follower_count')::int, 0),
      m->>'hdb_town',
      coalesce(array(select jsonb_array_elements_text(m->'languages')), '{}')
    );
  elsif r = 'staff' then
    -- link to an invite if the owner already added this email
    update staff_members set user_id = new.id
    where id = (select id from staff_members where lower(email) = lower(new.email) and user_id is null
                order by created_at limit 1);
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- Booking status upkeep: "missed" = no post link 7 days after the visit.
-- Called at the start of functions that read bookings.
-- ---------------------------------------------------------------

create or replace function public.mark_missed() returns void
language sql security definer set search_path = public as $$
  update bookings b set status = 'missed'
  from visit_slots s
  where s.id = b.slot_id and b.status = 'booked' and b.post_link is null
    and s.slot_date + 7 < public.sg_today();
$$;

-- ---------------------------------------------------------------
-- Creator functions
-- ---------------------------------------------------------------

create or replace function public.is_approved_creator() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select approval_status = 'approved' from creators where id = auth.uid()), false)
$$;

-- Open slots in the creator's HDB town, at outlets that still have visits left that month.
create or replace function public.open_slots_for_me()
returns table (slot_id uuid, slot_date date, start_time time, outlet_name text, address text,
               cuisine text, hdb_town text, plan text)
language sql stable security definer set search_path = public as $$
  select s.id, s.slot_date, s.start_time, o.name, o.address, o.cuisine, o.hdb_town, o.plan
  from visit_slots s
  join outlets o on o.id = s.outlet_id
  join creators c on c.id = auth.uid()
  where c.approval_status = 'approved'
    and o.hdb_town = c.hdb_town
    and s.status = 'open'
    and (s.slot_date > public.sg_today() or (s.slot_date = public.sg_today() and s.start_time > public.sg_now_time()))
    and (
      select count(*) from bookings b join visit_slots s2 on s2.id = b.slot_id
      where s2.outlet_id = o.id and b.status <> 'cancelled'
        and date_trunc('month', s2.slot_date) = date_trunc('month', s.slot_date)
    ) < public.plan_visits(o.plan)
  order by s.slot_date, s.start_time
$$;

create or replace function public.make_code(p_name text) returns text
language plpgsql volatile set search_path = public as $$
declare
  base text := left(upper(regexp_replace(split_part(trim(p_name), ' ', 1), '[^A-Za-z]', '', 'g')), 10);
  c text;
begin
  if base = '' then base := 'KAKI'; end if;
  for i in 1..100 loop
    c := 'AA-' || base || '-' || lpad((floor(random() * 10000))::int::text, 4, '0');
    if not exists (select 1 from bookings where code = c) then return c; end if;
  end loop;
  raise exception 'Could not generate a unique code';
end $$;

create or replace function public.book_slot(p_slot_id uuid)
returns table (booking_id uuid, code text)
language plpgsql security definer set search_path = public as $$
declare
  s visit_slots;
  o outlets;
  c creators;
  p profiles;
  used int;
  new_code text;
  new_id uuid;
begin
  select * into c from creators where id = auth.uid();
  if c.id is null or c.approval_status <> 'approved' then
    raise exception 'Only approved creators can book';
  end if;

  -- lock the slot so two creators can't book it at the same moment
  select * into s from visit_slots where id = p_slot_id for update;
  if s.id is null or s.status <> 'open' then
    raise exception 'Sorry, this slot was just booked by someone else';
  end if;
  if s.slot_date < sg_today() or (s.slot_date = sg_today() and s.start_time <= sg_now_time()) then
    raise exception 'This slot has already passed';
  end if;

  select * into o from outlets where id = s.outlet_id for update;
  if o.hdb_town <> c.hdb_town then
    raise exception 'You can only book outlets in your HDB town';
  end if;

  select count(*) into used from bookings b join visit_slots s2 on s2.id = b.slot_id
  where s2.outlet_id = o.id and b.status <> 'cancelled'
    and date_trunc('month', s2.slot_date) = date_trunc('month', s.slot_date);
  if used >= plan_visits(o.plan) then
    raise exception 'This outlet has no creator visits left that month';
  end if;

  select * into p from profiles where id = c.id;
  new_code := make_code(p.name);
  update visit_slots set status = 'booked' where id = s.id;
  insert into bookings (slot_id, creator_id, code) values (s.id, c.id, new_code)
  returning id into new_id;

  return query select new_id, new_code;
end $$;

create or replace function public.my_bookings()
returns table (booking_id uuid, code text, status text, booked_at timestamptz, post_link text,
               slot_date date, start_time time, outlet_name text, address text, cuisine text,
               redemptions bigint, earnings numeric, code_valid_until date)
language plpgsql security definer set search_path = public as $$
begin
  perform mark_missed();
  return query
    select b.id, b.code, b.status, b.booked_at, b.post_link, s.slot_date, s.start_time,
           o.name, o.address, o.cuisine,
           (select count(*) from redemptions r where r.booking_id = b.id),
           -- the creator's 2% of every bill redeemed with this code
           (select round(coalesce(sum(r.bill_amount), 0) * creator_rate(), 2) from redemptions r where r.booking_id = b.id),
           s.slot_date + 30
    from bookings b join visit_slots s on s.id = b.slot_id join outlets o on o.id = s.outlet_id
    where b.creator_id = auth.uid()
    order by s.slot_date desc, s.start_time desc;
end $$;

create or replace function public.submit_post_link(p_booking_id uuid, p_link text) returns void
language plpgsql security definer set search_path = public as $$
declare
  b bookings;
  d date;
begin
  perform mark_missed();
  select * into b from bookings where id = p_booking_id and creator_id = auth.uid();
  if b.id is null then raise exception 'Booking not found'; end if;
  select slot_date into d from visit_slots where id = b.slot_id;
  if b.status = 'cancelled' then raise exception 'This booking was cancelled'; end if;
  if b.status = 'missed' then raise exception 'The 7-day window to submit has closed. Please contact Makan Kaki.'; end if;
  if b.status = 'completed' then raise exception 'You already submitted your post'; end if;
  if sg_today() < d then raise exception 'You can submit your post on or after your visit date'; end if;
  if p_link !~* '^https?://[^\s]+\.[^\s]+$' then raise exception 'Please paste a full link starting with https://'; end if;
  update bookings set post_link = trim(p_link), status = 'completed' where id = b.id;
end $$;

-- ---------------------------------------------------------------
-- Owner and staff functions
-- ---------------------------------------------------------------

-- Redeem a diner's code at the counter. Returns true if it counted.
-- Unknown code, another outlet's code, cancelled booking, or more than
-- 30 days after the visit all return false ("Code not found").
-- p_bill is the diner's bill in SGD; the outlet pays 10% of it as commission.
create or replace function public.redeem_code(p_code text, p_bill numeric) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  outlet uuid := my_counter_outlet();
  bid uuid;
begin
  if outlet is null then raise exception 'Not allowed'; end if;
  if p_bill is null or p_bill <= 0 or p_bill > 5000 or p_bill <> round(p_bill, 2) then
    raise exception 'Enter the bill amount, e.g. 8.50';
  end if;
  select b.id into bid
  from bookings b join visit_slots s on s.id = b.slot_id
  where b.code = upper(trim(p_code))
    and s.outlet_id = outlet
    and b.status <> 'cancelled'
    and sg_today() <= s.slot_date + 30;
  if bid is null then return false; end if;
  insert into redemptions (booking_id, bill_amount, redeemed_by) values (bid, p_bill, auth.uid());
  return true;
end $$;

-- All bookings at my outlet, with creator name/handle (never email/phone).
create or replace function public.owner_bookings()
returns table (booking_id uuid, code text, status text, booked_at timestamptz, post_link text,
               slot_date date, start_time time, creator_name text, social_handle text, platform text,
               redemptions_month bigint, redemptions_total bigint, spend_month numeric, spend_total numeric)
language plpgsql security definer set search_path = public as $$
declare
  outlet uuid := my_owned_outlet();
  m date := date_trunc('month', sg_today())::date;
begin
  if outlet is null then raise exception 'Not allowed'; end if;
  perform mark_missed();
  return query
    select b.id, b.code, b.status, b.booked_at, b.post_link, s.slot_date, s.start_time,
           p.name, c.social_handle, c.platform,
           (select count(*) from redemptions r where r.booking_id = b.id
              and (r.redeemed_at at time zone 'Asia/Singapore')::date >= m),
           (select count(*) from redemptions r where r.booking_id = b.id),
           (select coalesce(sum(r.bill_amount), 0) from redemptions r where r.booking_id = b.id
              and (r.redeemed_at at time zone 'Asia/Singapore')::date >= m),
           (select coalesce(sum(r.bill_amount), 0) from redemptions r where r.booking_id = b.id)
    from bookings b
    join visit_slots s on s.id = b.slot_id
    join creators c on c.id = b.creator_id
    join profiles p on p.id = c.id
    where s.outlet_id = outlet
    order by s.slot_date desc, s.start_time desc;
end $$;

create or replace function public.add_staff(p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare
  outlet uuid := my_owned_outlet();
  e text := lower(trim(p_email));
  existing uuid;
begin
  if outlet is null then raise exception 'Not allowed'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Please enter a valid email'; end if;
  if (select count(*) from staff_members where outlet_id = outlet) >= 3 then
    raise exception 'You can add up to 3 staff per outlet';
  end if;
  if exists (select 1 from staff_members where outlet_id = outlet and email = e) then
    raise exception 'This staff member is already added';
  end if;
  -- link straight away if a staff account with this email exists and isn't linked elsewhere
  select p.id into existing from profiles p
  where p.email = e and p.role = 'staff'
    and not exists (select 1 from staff_members sm where sm.user_id = p.id);
  insert into staff_members (outlet_id, email, user_id) values (outlet, e, existing);
end $$;

-- Staff: link my account to an invite if one exists, then return my outlet name (or null).
create or replace function public.claim_staff_access() returns text
language plpgsql security definer set search_path = public as $$
declare
  me profiles;
  n text;
begin
  select * into me from profiles where id = auth.uid();
  if me.role <> 'staff' then return null; end if;
  if not exists (select 1 from staff_members where user_id = me.id) then
    update staff_members set user_id = me.id
    where id = (select id from staff_members where email = me.email and user_id is null
                order by created_at limit 1);
  end if;
  select o.name into n from staff_members sm join outlets o on o.id = sm.outlet_id where sm.user_id = me.id;
  return n;
end $$;

-- ---------------------------------------------------------------
-- Admin functions
-- ---------------------------------------------------------------

create or replace function public.assert_admin() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not allowed'; end if;
end $$;

create or replace function public.admin_creators()
returns table (id uuid, name text, email text, phone text, social_handle text, platform text,
               follower_count int, hdb_town text, languages text[], approval_status text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform assert_admin();
  return query
    select c.id, p.name, p.email, p.phone, c.social_handle, c.platform, c.follower_count,
           c.hdb_town, c.languages, c.approval_status, p.created_at
    from creators c join profiles p on p.id = c.id
    order by (c.approval_status = 'pending') desc, p.created_at desc;
end $$;

create or replace function public.admin_set_creator_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform assert_admin();
  if p_status not in ('approved', 'rejected', 'pending') then raise exception 'Invalid status'; end if;
  update creators set approval_status = p_status where id = p_id;
end $$;

create or replace function public.admin_outlets()
returns table (id uuid, name text, address text, hdb_town text, cuisine text, plan text,
               owner_name text, owner_email text, owner_phone text,
               open_slots bigint, bookings_month bigint, redemptions_month bigint, spend_month numeric)
language plpgsql security definer set search_path = public as $$
declare m date := date_trunc('month', sg_today())::date;
begin
  perform assert_admin();
  return query
    select o.id, o.name, o.address, o.hdb_town, o.cuisine, o.plan, p.name, p.email, p.phone,
      (select count(*) from visit_slots s where s.outlet_id = o.id and s.status = 'open' and s.slot_date >= sg_today()),
      (select count(*) from bookings b join visit_slots s on s.id = b.slot_id
        where s.outlet_id = o.id and b.status <> 'cancelled' and date_trunc('month', s.slot_date) = m),
      (select count(*) from redemptions r join bookings b on b.id = r.booking_id join visit_slots s on s.id = b.slot_id
        where s.outlet_id = o.id and (r.redeemed_at at time zone 'Asia/Singapore')::date >= m),
      (select coalesce(sum(r.bill_amount), 0) from redemptions r join bookings b on b.id = r.booking_id join visit_slots s on s.id = b.slot_id
        where s.outlet_id = o.id and (r.redeemed_at at time zone 'Asia/Singapore')::date >= m)
    from outlets o join profiles p on p.id = o.owner_id
    order by o.name;
end $$;

create or replace function public.admin_bookings()
returns table (booking_id uuid, code text, status text, booked_at timestamptz, post_link text,
               slot_date date, start_time time, outlet_name text, hdb_town text,
               creator_name text, social_handle text, platform text, redemptions bigint, spend numeric)
language plpgsql security definer set search_path = public as $$
begin
  perform assert_admin();
  perform mark_missed();
  return query
    select b.id, b.code, b.status, b.booked_at, b.post_link, s.slot_date, s.start_time,
           o.name, o.hdb_town, p.name, c.social_handle, c.platform,
           (select count(*) from redemptions r where r.booking_id = b.id),
           (select coalesce(sum(r.bill_amount), 0) from redemptions r where r.booking_id = b.id)
    from bookings b
    join visit_slots s on s.id = b.slot_id
    join outlets o on o.id = s.outlet_id
    join creators c on c.id = b.creator_id
    join profiles p on p.id = c.id
    order by s.slot_date desc, s.start_time desc;
end $$;

-- Cancel: code stops working; slot reopens if its date hasn't passed.
create or replace function public.admin_cancel_booking(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  perform assert_admin();
  select * into b from bookings where id = p_id for update;
  if b.id is null then raise exception 'Booking not found'; end if;
  if b.status = 'cancelled' then return; end if;
  update bookings set status = 'cancelled' where id = p_id;
  update visit_slots set status = 'open' where id = b.slot_id and slot_date >= sg_today();
end $$;

create or replace function public.admin_update_booking(p_id uuid, p_post_link text, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform assert_admin();
  if p_status not in ('booked', 'completed', 'missed') then
    raise exception 'Use Cancel to cancel a booking';
  end if;
  update bookings set post_link = nullif(trim(p_post_link), ''), status = p_status
  where id = p_id and status <> 'cancelled';
end $$;

-- One row per outlet for the chosen month (any day in that month):
-- plan fee + 10% commission on diners' bills. creator_payouts is the
-- part of the commission passed on to creators (a fifth, i.e. 2% of bills).
create or replace function public.admin_billing(p_month date)
returns table (outlet_name text, plan text, plan_fee numeric, redemptions bigint,
               diner_spend numeric, commission numeric, total_owed numeric, creator_payouts numeric)
language plpgsql security definer set search_path = public as $$
declare
  m_start date := date_trunc('month', p_month)::date;
  m_end date := (date_trunc('month', p_month) + interval '1 month')::date;
begin
  perform assert_admin();
  return query
    with r as (
      select o.id, o.name, o.plan, count(x.id) as n, coalesce(sum(x.bill_amount), 0) as spend
      from outlets o
      left join visit_slots s on s.outlet_id = o.id
      left join bookings b on b.slot_id = s.id
      left join redemptions x on x.booking_id = b.id
        and (x.redeemed_at at time zone 'Asia/Singapore')::date >= m_start
        and (x.redeemed_at at time zone 'Asia/Singapore')::date < m_end
      where o.created_at < (m_end::timestamp at time zone 'Asia/Singapore')
      group by o.id, o.name, o.plan
    )
    select r.name, r.plan, plan_fee(r.plan), r.n, r.spend,
           round(r.spend * commission_rate(), 2),
           plan_fee(r.plan) + round(r.spend * commission_rate(), 2),
           round(r.spend * creator_rate(), 2)
    from r order by r.name;
end $$;

-- One row per creator for the chosen month: what Makan Kaki pays them
-- (2% of the bills redeemed with their codes). Paid manually, e.g. by PayNow.
create or replace function public.admin_creator_payouts(p_month date)
returns table (creator_name text, social_handle text, email text, phone text,
               redemptions bigint, diner_spend numeric, payout numeric)
language plpgsql security definer set search_path = public as $$
declare
  m_start date := date_trunc('month', p_month)::date;
  m_end date := (date_trunc('month', p_month) + interval '1 month')::date;
begin
  perform assert_admin();
  return query
    select p.name, c.social_handle, p.email, p.phone, count(x.id), sum(x.bill_amount),
           round(sum(x.bill_amount) * creator_rate(), 2)
    from redemptions x
    join bookings b on b.id = x.booking_id
    join creators c on c.id = b.creator_id
    join profiles p on p.id = c.id
    where (x.redeemed_at at time zone 'Asia/Singapore')::date >= m_start
      and (x.redeemed_at at time zone 'Asia/Singapore')::date < m_end
    group by p.name, c.social_handle, p.email, p.phone
    order by p.name;
end $$;

-- ---------------------------------------------------------------
-- Permissions: functions are for logged-in users only.
-- ---------------------------------------------------------------

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
-- internal helpers shouldn't be called directly
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.make_code(text) from authenticated;
