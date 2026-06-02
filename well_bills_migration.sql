create table if not exists public.well_bills (
  id uuid primary key default uuid_generate_v4(),
  bill_month date not null unique,
  previous_reading numeric(12, 2) not null,
  current_reading numeric(12, 2) not null,
  units_used numeric(12, 2) generated always as (current_reading - previous_reading) stored,
  people_count integer not null default 4,
  per_person_bill numeric(12, 2) generated always as ((current_reading - previous_reading) / people_count) stored,
  created_at timestamptz not null default now(),
  constraint well_bills_reading_order check (current_reading >= previous_reading),
  constraint well_bills_people_count check (people_count > 0)
);

alter table public.well_bills enable row level security;

drop policy if exists "Users can read well bills" on public.well_bills;
create policy "Users can read well bills"
on public.well_bills for select
using (auth.uid() is not null);

drop policy if exists "Admins can manage well bills" on public.well_bills;
create policy "Admins can manage well bills"
on public.well_bills for all
using (public.is_admin())
with check (public.is_admin());

notify pgrst, 'reload schema';
