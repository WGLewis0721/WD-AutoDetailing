-- Run only in the dedicated Mirror Finish Supabase project, not Studigo or APEX.
-- No customer data is migrated from Studigo because the two existing mf_ tables have zero rows.
create extension if not exists pgcrypto;
create table if not exists public.mf_agreements (
  id uuid primary key default gen_random_uuid(),
  decision text not null check (decision in ('accepted','declined')),
  version text not null,
  clauses_hash text not null check (clauses_hash ~ '^[0-9a-f]{64}$'),
  accepted_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  ip text,
  user_agent text,
  page_url text
);
create table if not exists public.mf_bookings (
  ref text primary key check (ref ~ '^MF-[A-Z0-9]{8}$'),
  agreement_id uuid not null references public.mf_agreements(id),
  status text not null default 'checkout_created',
  customer_name text not null,
  phone text not null,
  email text not null,
  street text not null,
  city text not null,
  zip text not null,
  notes text,
  appointment_date date not null,
  start_minute integer not null check (start_minute between 0 and 1439),
  duration_minutes integer not null check (duration_minutes > 0),
  cars jsonb not null,
  total_cents integer not null check (total_cents >= 0),
  deposit_cents integer not null check (deposit_cents > 0),
  balance_cents integer not null check (balance_cents >= 0),
  square_payment_link_id text,
  square_order_id text,
  square_checkout_url text,
  square_booking_id text,
  square_customer_id text,
  created_at timestamptz not null default now()
);
create unique index if not exists mf_bookings_square_order_unique
  on public.mf_bookings(square_order_id) where square_order_id is not null;
create unique index if not exists mf_bookings_square_booking_unique
  on public.mf_bookings(square_booking_id) where square_booking_id is not null;
create index if not exists mf_bookings_appointment_day
  on public.mf_bookings(appointment_date);
alter table public.mf_agreements enable row level security;
alter table public.mf_bookings enable row level security;
revoke all on public.mf_agreements, public.mf_bookings from anon, authenticated;
grant select, insert, update on public.mf_agreements, public.mf_bookings to service_role;
comment on table public.mf_agreements is 'Mirror Finish: customer evidence of service-agreement decisions (private)';
comment on table public.mf_bookings is 'Mirror Finish: Square deposit links and verified appointment status (private)';
