-- Migration: P2P peer endpoint registration
-- Run this in your Supabase SQL editor.

create table if not exists peer_endpoints (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  public_ip   text        not null,
  public_port integer     not null,
  updated_at  timestamptz not null default now()
);

-- Update timestamp automatically
create or replace function update_peer_endpoint_ts()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger peer_endpoints_updated_at
  before update on peer_endpoints
  for each row execute function update_peer_endpoint_ts();

-- RLS: users can only read/write their own row
alter table peer_endpoints enable row level security;

create policy "own row only"
  on peer_endpoints
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
