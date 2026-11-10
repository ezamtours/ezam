-- EZAM Tours & Travel Services
-- Supabase production schema for secure owner/admin access.
-- Run this in a DEDICATED EZAM Supabase project, not in an unrelated project.

create extension if not exists pgcrypto;

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  role text not null default 'pending' check (role in ('owner','admin','pending')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on public.profiles from anon;
grant select, update on public.profiles to authenticated;

drop policy if exists "profiles_select_self_or_owner" on public.profiles;
create policy "profiles_select_self_or_owner"
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or lower((select auth.jwt()->>'email')) = 'ezamtourstravelservices01@gmail.com'
);

drop policy if exists "profiles_owner_update" on public.profiles;
create policy "profiles_owner_update"
on public.profiles for update
to authenticated
using (lower((select auth.jwt()->>'email')) = 'ezamtourstravelservices01@gmail.com')
with check (lower((select auth.jwt()->>'email')) = 'ezamtourstravelservices01@gmail.com');

-- Create profiles automatically. Non-owner accounts remain pending until approved by the owner.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id,email,display_name,role,is_active)
  values (
    new.id,
    coalesce(new.email,''),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email,''),'@',1)),
    case when lower(coalesce(new.email,'')) = 'ezamtourstravelservices01@gmail.com' then 'owner' else 'pending' end,
    case when lower(coalesce(new.email,'')) = 'ezamtourstravelservices01@gmail.com' then true else false end
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_ezam on auth.users;
create trigger on_auth_user_created_ezam
after insert on auth.users
for each row execute procedure private.handle_new_user();

-- ---------- Packages ----------
create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  country text,
  destination text,
  duration text,
  travel_dates text,
  price_label text,
  summary text,
  tags text[] not null default '{}',
  image_url text,
  fallback_url text,
  published boolean not null default false,
  featured boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists packages_published_idx on public.packages(published, featured);
alter table public.packages enable row level security;

revoke all on public.packages from anon, authenticated;
grant select on public.packages to anon, authenticated;
grant insert, update, delete on public.packages to authenticated;

drop policy if exists "packages_public_read" on public.packages;
create policy "packages_public_read"
on public.packages for select
to anon
using (published = true);

drop policy if exists "packages_staff_read" on public.packages;
create policy "packages_staff_read"
on public.packages for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
      and p.role in ('owner','admin')
  )
);

drop policy if exists "packages_owner_insert" on public.packages;
create policy "packages_owner_insert"
on public.packages for insert
to authenticated
with check (lower((select auth.jwt()->>'email')) = 'ezamtourstravelservices01@gmail.com');

drop policy if exists "packages_owner_update" on public.packages;
create policy "packages_owner_update"
on public.packages for update
to authenticated
using (lower((select auth.jwt()->>'email')) = 'ezamtourstravelservices01@gmail.com')
with check (lower((select auth.jwt()->>'email')) = 'ezamtourstravelservices01@gmail.com');

drop policy if exists "packages_owner_delete" on public.packages;
create policy "packages_owner_delete"
on public.packages for delete
to authenticated
using (lower((select auth.jwt()->>'email')) = 'ezamtourstravelservices01@gmail.com');

-- ---------- Leads / inquiries ----------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  inquiry_type text not null default 'custom' check (inquiry_type in ('custom','package','general','social','manual')),
  package_id uuid references public.packages(id) on delete set null,
  trip_details text,
  name text not null,
  email text,
  phone text,
  preferred_contact text,
  message text,
  source text not null default 'website'
    check (source in ('website','custom','package','facebook','instagram','tiktok','manual','referral','phone','email')),
  stage text not null default 'New'
    check (stage in ('New','Contacted','Qualified','Quoted','Follow-up','Booked','Closed','Lost')),
  temperature text not null default 'Warm'
    check (temperature in ('Hot','Warm','Cold')),
  assigned_to uuid references public.profiles(id) on delete set null,
  owner_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_assigned_to_idx on public.leads(assigned_to);
create index if not exists leads_stage_idx on public.leads(stage);
create index if not exists leads_created_at_idx on public.leads(created_at desc);
alter table public.leads enable row level security;

revoke all on public.leads from anon, authenticated;

-- Anonymous website visitors may submit ONLY inquiry fields, not assignment/status/internal notes.
grant insert (inquiry_type,package_id,trip_details,name,email,phone,preferred_contact,message,source)
on public.leads to anon;

-- Authenticated active staff can create manual/social leads.
grant insert, select, update on public.leads to authenticated;
grant delete on public.leads to authenticated;

drop policy if exists "leads_public_insert" on public.leads;
create policy "leads_public_insert"
on public.leads for insert
to anon
with check (
  assigned_to is null
  and stage = 'New'
  and temperature = 'Warm'
  and owner_notes = ''
  and source in ('website','custom','package')
);

drop policy if exists "leads_staff_insert" on public.leads;
create policy "leads_staff_insert"
on public.leads for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
      and p.role in ('owner','admin')
  )
);

drop policy if exists "leads_select_owner_or_assigned_admin" on public.leads;
create policy "leads_select_owner_or_assigned_admin"
on public.leads for select
to authenticated
using (
  lower((select auth.jwt()->>'email')) = 'ezamtourstravelservices01@gmail.com'
  or (
    assigned_to = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
        and p.is_active = true
    )
  )
);

drop policy if exists "leads_owner_update" on public.leads;
create policy "leads_owner_update"
on public.leads for update
to authenticated
using (lower((select auth.jwt()->>'email')) = 'ezamtourstravelservices01@gmail.com')
with check (lower((select auth.jwt()->>'email')) = 'ezamtourstravelservices01@gmail.com');

drop policy if exists "leads_admin_update_assigned" on public.leads;
create policy "leads_admin_update_assigned"
on public.leads for update
to authenticated
using (
  assigned_to = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role='admin' and p.is_active=true
  )
)
with check (
  assigned_to = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role='admin' and p.is_active=true
  )
);

drop policy if exists "leads_owner_delete" on public.leads;
create policy "leads_owner_delete"
on public.leads for delete
to authenticated
using (lower((select auth.jwt()->>'email')) = 'ezamtourstravelservices01@gmail.com');

-- ---------- Website contact/social settings ----------
create table if not exists public.site_settings (
  id text primary key default 'main',
  business_email text,
  phone text,
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;

drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read"
on public.site_settings for select
to anon, authenticated
using (id='main');

drop policy if exists "site_settings_owner_insert" on public.site_settings;
create policy "site_settings_owner_insert"
on public.site_settings for insert
to authenticated
with check (
  id='main'
  and lower((select auth.jwt()->>'email')) = 'ezamtourstravelservices01@gmail.com'
);

drop policy if exists "site_settings_owner_update" on public.site_settings;
create policy "site_settings_owner_update"
on public.site_settings for update
to authenticated
using (
  id='main'
  and lower((select auth.jwt()->>'email')) = 'ezamtourstravelservices01@gmail.com'
)
with check (
  id='main'
  and lower((select auth.jwt()->>'email')) = 'ezamtourstravelservices01@gmail.com'
);

insert into public.site_settings (id,business_email)
values ('main','ezamtours@gmail.com')
on conflict (id) do nothing;

-- Optional realtime updates for the CRM and package catalog.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='leads'
  ) then
    alter publication supabase_realtime add table public.leads;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='packages'
  ) then
    alter publication supabase_realtime add table public.packages;
  end if;
end $$;
