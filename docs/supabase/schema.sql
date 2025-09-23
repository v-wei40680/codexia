-- Extensions
create extension if not exists pgcrypto;

-- Drop old unique constraint that blocked multiple projects per user
alter table if exists public.projects drop constraint if exists projects_user_id_key;
drop index if exists public.projects_user_id_key;

-- Profiles table
create table if not exists public.profiles (
id uuid primary key references auth.users(id) on delete cascade,
full_name text,
avatar_url text,
bio text,
website text,
github_url text,
x_url text,
updated_at timestamptz default now()
);

-- Projects table
create table if not exists public.projects (
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id) on delete cascade,
title text not null,
description text,
url text,
created_at timestamptz default now(),
updated_at timestamptz default now()
);

-- Add missing columns safely
alter table public.profiles
add column if not exists full_name text,
add column if not exists avatar_url text,
add column if not exists bio text,
add column if not exists website text,
add column if not exists github_url text,
add column if not exists x_url text,
add column if not exists updated_at timestamptz default now();

alter table public.projects
add column if not exists description text,
add column if not exists url text,
add column if not exists created_at timestamptz default now(),
add column if not exists updated_at timestamptz default now();

-- Helpful index
create index if not exists projects_user_id_idx on public.projects(user_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
new.updated_at = now();
return new;
end $$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

-- Enforce “max 2 projects per user” via trigger
create or replace function public.enforce_max_two_projects()
returns trigger language plpgsql as $$
declare
uid uuid;
cnt int;
begin
uid := coalesce(new.user_id, old.user_id);
select count(*) into cnt from public.projects where user_id = uid;
if (tg_op = 'INSERT') then
if cnt >= 2 then
raise exception 'Each user may have at most 2 projects';
end if;
elsif (tg_op = 'UPDATE') then
-- If user_id changes, re-check for target user_id
if new.user_id is distinct from old.user_id then
select count(*) into cnt from public.projects where user_id = new.user_id;
if cnt >= 2 then
raise exception 'Each user may have at most 2 projects';
end if;
end if;
end if;
return new;
end $$;

drop trigger if exists trg_projects_max2 on public.projects;
create trigger trg_projects_max2
before insert or update on public.projects
for each row execute function public.enforce_max_two_projects();

-- RLS policies
alter table public.profiles enable row level security;
alter table public.projects enable row level security;

-- Drop existing policies to avoid duplicates
drop policy if exists profiles_public_read on public.profiles;
drop policy if exists profiles_self_write on public.profiles;
drop policy if exists projects_public_read on public.projects;
drop policy if exists projects_self_write on public.projects;
drop policy if exists projects_self_delete on public.projects;

-- Public can read profiles
create policy profiles_public_read
on public.profiles for select
to anon, authenticated
using (true);

-- Users can insert/update their own profile
create policy profiles_self_write
on public.profiles for all
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Public can read projects (Explore / Public pages)
create policy projects_public_read
on public.projects for select
to anon, authenticated
using (true);

-- Users can insert/update their own projects
-- Insert policy: only allow creating projects for self
create policy projects_self_insert
on public.projects for insert
to authenticated
with check (auth.uid() = user_id);

-- Update policy: only allow updating own projects
create policy projects_self_update
on public.projects for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Optional: users can delete their own projects
create policy projects_self_delete
on public.projects for delete
to authenticated
using (auth.uid() = user_id);