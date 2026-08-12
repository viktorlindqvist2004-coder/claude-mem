-- Gentlemen's Barbershop — bokningar
--
-- Kör hela filen i Supabase → SQL Editor → New query → Run.
--
-- Tanken med rättigheterna: vem som helst ska kunna boka och se VILKA
-- TIDER som är tagna, men ingen utom du ska kunna se VEM som bokat.
-- Därför är sjalva bokningstabellen stängd för läsning, och allmänheten
-- läser i stället vyn busy_slots som bara innehåller tid och längd.

create extension if not exists "pgcrypto";

create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  date         date        not null,
  time         time        not null,
  service_id   text        not null,
  service_name text        not null,
  price        integer     not null,
  duration     integer     not null,
  name         text        not null,
  phone        text        not null,
  email        text        default '',
  note         text        default '',
  cancelled    boolean     not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.blocks (
  id       uuid primary key default gen_random_uuid(),
  date     date    not null,
  time     time    not null,
  duration integer not null,
  reason   text    default ''
);

-- Två kunder som trycker "boka" på samma tid i samma sekund: den ena
-- vinner, den andra får veta att tiden togs. Utan det här indexet blir
-- det två bokningar på samma stol.
create unique index if not exists bookings_slot_unique
  on public.bookings (date, time)
  where cancelled = false;

create index if not exists bookings_date_idx on public.bookings (date);
create index if not exists blocks_date_idx   on public.blocks (date);

-- Öppettider per veckodag (0 = söndag). Tomma tider betyder stängt.
-- Redigeras under Öppettider i adminpanelen.
create table if not exists public.week_hours (
  weekday    smallint primary key check (weekday between 0 and 6),
  open_time  time,
  close_time time
);

insert into public.week_hours (weekday, open_time, close_time) values
  (0, null,    null),
  (1, '10:00', '18:00'),
  (2, '10:00', '18:00'),
  (3, '10:00', '18:00'),
  (4, '10:00', '18:00'),
  (5, '10:00', '18:00'),
  (6, '10:00', '15:00')
on conflict (weekday) do nothing;

-- Semester, röda dagar och kortdagar. Utan tider = stängt hela perioden,
-- med tider = öppet men andra tider. Slår alltid veckoschemat.
create table if not exists public.closures (
  id         uuid primary key default gen_random_uuid(),
  from_date  date not null,
  to_date    date not null,
  reason     text default '',
  open_time  time,
  close_time time,
  check (to_date >= from_date)
);

create index if not exists closures_range_idx on public.closures (from_date, to_date);

-- Vad allmänheten får se: att stolen är upptagen, inget mer.
create or replace view public.busy_slots
with (security_invoker = off) as
  select date, time, duration from public.bookings where cancelled = false
  union all
  select date, time, duration from public.blocks;

alter table public.bookings enable row level security;
alter table public.blocks   enable row level security;

-- Vem som helst får boka …
drop policy if exists "anyone can book" on public.bookings;
create policy "anyone can book"
  on public.bookings for insert to anon, authenticated
  with check (true);

-- … men bara inloggad personal får läsa, ändra och avboka.
drop policy if exists "staff read bookings" on public.bookings;
create policy "staff read bookings"
  on public.bookings for select to authenticated using (true);

drop policy if exists "staff update bookings" on public.bookings;
create policy "staff update bookings"
  on public.bookings for update to authenticated using (true) with check (true);

drop policy if exists "staff manage blocks" on public.blocks;
create policy "staff manage blocks"
  on public.blocks for all to authenticated using (true) with check (true);

grant select on public.busy_slots to anon, authenticated;

-- Öppettiderna måste vara läsbara för alla — bokningssidan behöver veta
-- vilka dagar den ska erbjuda. Bara personal får ändra dem.
alter table public.week_hours enable row level security;
alter table public.closures   enable row level security;

drop policy if exists "anyone reads hours" on public.week_hours;
create policy "anyone reads hours"
  on public.week_hours for select to anon, authenticated using (true);

drop policy if exists "staff sets hours" on public.week_hours;
create policy "staff sets hours"
  on public.week_hours for all to authenticated using (true) with check (true);

drop policy if exists "anyone reads closures" on public.closures;
create policy "anyone reads closures"
  on public.closures for select to anon, authenticated using (true);

drop policy if exists "staff sets closures" on public.closures;
create policy "staff sets closures"
  on public.closures for all to authenticated using (true) with check (true);

-- Skapa sedan din inloggning under Authentication → Users → Add user
-- (e-post + lösenord, bekräfta den direkt). Det är den du loggar in med
-- på /admin.
