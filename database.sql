create extension if not exists "uuid-ossp";

create type public.user_role as enum ('admin', 'tenant');
create type public.payment_status as enum ('pending', 'paid');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role public.user_role not null default 'tenant',
  created_at timestamptz not null default now()
);

create table public.tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  room_no text not null,
  rent numeric(12, 2) not null default 0,
  phone text,
  email text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.bills (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  bill_month date not null,
  previous_reading numeric(12, 2) not null,
  current_reading numeric(12, 2) not null,
  units_used numeric(12, 2) generated always as (current_reading - previous_reading) stored,
  rate numeric(12, 2) not null,
  well_bill numeric(12, 2) not null default 0,
  electricity_charge numeric(12, 2) generated always as ((current_reading - previous_reading) * rate) stored,
  rent numeric(12, 2) not null,
  total_amount numeric(12, 2) generated always as (((current_reading - previous_reading) * rate) + well_bill + rent) stored,
  payment_status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint bills_reading_order check (current_reading >= previous_reading),
  constraint bills_unique_month unique (tenant_id, bill_month)
);

alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.bills enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create policy "Profiles can read own profile"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

create policy "Admins can manage profiles"
on public.profiles for all
using (public.is_admin())
with check (public.is_admin());

create policy "Tenants can read own tenant row"
on public.tenants for select
using (public.is_admin() or user_id = auth.uid() or lower(email) = lower(auth.jwt() ->> 'email'));

create policy "Admins can manage tenants"
on public.tenants for all
using (public.is_admin())
with check (public.is_admin());

create policy "Users can read visible bills"
on public.bills for select
using (
  public.is_admin()
  or exists (
    select 1 from public.tenants
    where tenants.id = bills.tenant_id
      and (tenants.user_id = auth.uid() or lower(tenants.email) = lower(auth.jwt() ->> 'email'))
  )
);

create policy "Admins can manage bills"
on public.bills for all
using (public.is_admin())
with check (public.is_admin());

create policy "Tenants can mark own bills paid"
on public.bills for update
using (
  exists (
    select 1 from public.tenants
    where tenants.id = bills.tenant_id
      and (tenants.user_id = auth.uid() or lower(tenants.email) = lower(auth.jwt() ->> 'email'))
  )
)
with check (payment_status = 'paid');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    'tenant'
  );

  update public.tenants
  set user_id = new.id
  where lower(email) = lower(new.email) and user_id is null;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- First admin setup:
-- 1. In Supabase Authentication, create a user:
--    Email: sushmitp1@gmail.com
--    Password: admin@123
-- 2. In Supabase SQL editor, run:
-- update public.profiles set name = 'Admin', role = 'admin' where email = 'sushmitp1@gmail.com';
-- 3. Owner can now log in from the website with:
--    Username: admin
--    Password: admin@123
-- 4. If login still fails, confirm the profile exists:
-- select id, name, email, role from public.profiles where email = 'sushmitp1@gmail.com';
