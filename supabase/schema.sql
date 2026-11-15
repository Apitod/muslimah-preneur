create extension if not exists pgcrypto;

create sequence if not exists ticket_no_seq start 1;
create sequence if not exists invoice_no_seq start 1;

create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  ticket_no text not null unique,
  name text not null,
  whatsapp text not null,
  category text not null,
  aaminah text,
  email text,
  nominal_transfer numeric(14,2) not null,
  attachment_path text,
  attachment_name text,
  created_at timestamptz not null default now()
);

create table if not exists sponsors (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique,
  package text not null,
  company text not null,
  business_field text not null,
  address text,
  pic_name text not null,
  position text,
  whatsapp text not null,
  email text,
  transfer_name text not null,
  amount numeric(14,2) not null,
  attachment_path text,
  attachment_name text,
  created_at timestamptz not null default now()
);

create index if not exists participants_created_at_idx on participants (created_at desc);
create index if not exists sponsors_created_at_idx on sponsors (created_at desc);

create or replace function assign_ticket_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  n := nextval('ticket_no_seq');
  new.ticket_no := to_char(n, 'FM000');
  return new;
end;
$$;

drop trigger if exists participants_ticket_no on participants;
create trigger participants_ticket_no
before insert on participants
for each row execute function assign_ticket_no();

create or replace function assign_invoice_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  n := nextval('invoice_no_seq');
  new.invoice_no := 'INV-' || to_char(n, 'FM000');
  return new;
end;
$$;

drop trigger if exists sponsors_invoice_no on sponsors;
create trigger sponsors_invoice_no
before insert on sponsors
for each row execute function assign_invoice_no();

alter table admins enable row level security;
alter table participants enable row level security;
alter table sponsors enable row level security;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

revoke all on function is_admin() from public, anon;
grant execute on function is_admin() to authenticated;

drop policy if exists "admin read own row" on admins;
create policy "admin read own row" on admins
for select using (user_id = auth.uid());

drop policy if exists "admin read participants" on participants;
create policy "admin read participants" on participants
for select using (public.is_admin());

drop policy if exists "admin read sponsors" on sponsors;
create policy "admin read sponsors" on sponsors
for select using (public.is_admin());

grant usage on schema public to service_role;
grant insert, select on participants, sponsors to service_role;
grant select on admins to authenticated;
grant select on participants, sponsors to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bukti-transfer',
  'bukti-transfer',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update set
  "public" = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'application/pdf'];

drop policy if exists "admin read attachments" on storage.objects;
create policy "admin read attachments" on storage.objects
for select using (bucket_id = 'bukti-transfer' and public.is_admin());
