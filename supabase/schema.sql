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

drop policy if exists "admin delete participants" on participants;
create policy "admin delete participants" on participants
for delete using (public.is_admin());

drop policy if exists "admin delete sponsors" on sponsors;
create policy "admin delete sponsors" on sponsors
for delete using (public.is_admin());

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

drop policy if exists "admin delete attachments" on storage.objects;
create policy "admin delete attachments" on storage.objects
for delete using (bucket_id = 'bukti-transfer' and public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- Participant orders, tickets, quota, discount code, verification
-- ─────────────────────────────────────────────────────────────

create sequence if not exists participant_order_no_seq start 1;
create sequence if not exists participant_ticket_no_seq start 1;

create table if not exists participant_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  name text not null,
  whatsapp text not null,
  category text not null check (category in ('MQ Aaminah', 'Selain MQ Aaminah_DIK')),
  aaminah text,
  quantity integer not null check (quantity between 1 and 5),
  early_bird_qty integer not null default 0 check (early_bird_qty >= 0),
  regular_qty integer not null default 0 check (regular_qty >= 0),
  discount_code text,
  discount_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  ticket_token uuid not null default gen_random_uuid() unique,
  attachment_path text not null,
  attachment_name text,
  proof_viewed_at timestamptz,
  verified_at timestamptz,
  rejected_at timestamptz,
  legacy_participant_id uuid unique,
  created_at timestamptz not null default now()
);

create table if not exists participant_tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references participant_orders(id) on delete cascade,
  ticket_no text not null unique,
  name text not null,
  category text not null,
  aaminah text,
  created_at timestamptz not null default now()
);

create table if not exists discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  quota_total integer not null default 150 check (quota_total > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table sponsors add column if not exists status text not null default 'pending';
alter table sponsors add column if not exists invoice_token uuid;
alter table sponsors add column if not exists proof_viewed_at timestamptz;
alter table sponsors add column if not exists verified_at timestamptz;
alter table sponsors add column if not exists rejected_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sponsors_status_check') then
    alter table sponsors add constraint sponsors_status_check check (status in ('pending', 'verified', 'rejected'));
  end if;
end $$;

create unique index if not exists sponsors_invoice_token_idx on sponsors (invoice_token) where invoice_token is not null;
create index if not exists participant_orders_status_idx on participant_orders (status);
create index if not exists participant_orders_created_at_idx on participant_orders (created_at desc);
create index if not exists participant_tickets_order_id_idx on participant_tickets (order_id);

alter table participant_orders enable row level security;
alter table participant_tickets enable row level security;
alter table discount_codes enable row level security;

drop policy if exists "admin read participant orders" on participant_orders;
create policy "admin read participant orders" on participant_orders
for select using (public.is_admin());

drop policy if exists "admin delete participant orders" on participant_orders;
create policy "admin delete participant orders" on participant_orders
for delete using (public.is_admin());

drop policy if exists "admin read participant tickets" on participant_tickets;
create policy "admin read participant tickets" on participant_tickets
for select using (public.is_admin());

drop policy if exists "admin read discount codes" on discount_codes;
create policy "admin read discount codes" on discount_codes
for select using (public.is_admin());

grant select, delete on participant_orders to authenticated;
grant select on participant_tickets to authenticated;
grant select on discount_codes to authenticated;
grant all on participant_orders, participant_tickets, discount_codes to service_role;
grant usage, select on sequence participant_order_no_seq to service_role;
grant usage, select on sequence participant_ticket_no_seq to service_role;

create or replace function public.get_registration_info()
returns jsonb language sql stable security definer set search_path = public, pg_temp
as $$
with q as (
  select
    coalesce(sum(early_bird_qty) filter (where status in ('pending','verified')), 0)::int as early_reserved,
    coalesce(sum(regular_qty) filter (where status in ('pending','verified')), 0)::int as regular_reserved,
    coalesce(sum(early_bird_qty) filter (where status = 'verified'), 0)::int as early_verified,
    coalesce(sum(regular_qty) filter (where status = 'verified'), 0)::int as regular_verified,
    coalesce(count(*) filter (where discount_code is not null and status in ('pending','verified')), 0)::int as code_reserved,
    coalesce(count(*) filter (where discount_code is not null and status = 'verified'), 0)::int as code_verified
  from participant_orders
), c as (
  select quota_total from discount_codes where active = true order by created_at limit 1
)
select jsonb_build_object(
  'earlyBirdRemaining', greatest(200 - q.early_reserved, 0),
  'regularRemaining', greatest(300 - q.regular_reserved, 0),
  'earlyBirdVerified', q.early_verified,
  'regularVerified', q.regular_verified,
  'codeRemaining', greatest(coalesce((select quota_total from c), 0) - q.code_reserved, 0),
  'codeVerified', q.code_verified,
  'codeActive', exists(select 1 from discount_codes where active = true),
  'earlyBirdPrice', 175000,
  'regularPrice', 200000,
  'closed', now() >= timestamptz '2026-12-25 10:00:00+08'
) from q;
$$;

create or replace function public.check_discount_code(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_total integer;
  v_used integer;
begin
  if v_code = '' then return jsonb_build_object('valid', false, 'discount', 0, 'remaining', 0); end if;
  select quota_total into v_total from discount_codes where upper(code) = v_code and active = true order by created_at limit 1;
  if v_total is null then return jsonb_build_object('valid', false, 'discount', 0, 'remaining', 0); end if;
  select count(*) into v_used from participant_orders where upper(discount_code) = v_code and status in ('pending','verified');
  return jsonb_build_object('valid', v_used < v_total, 'discount', 25000, 'remaining', greatest(v_total - v_used, 0));
end;
$$;

create or replace function public.create_participant_order(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_name text := trim(coalesce(payload->>'name', ''));
  v_whatsapp text := trim(coalesce(payload->>'whatsapp', ''));
  v_category text := trim(coalesce(payload->>'category', ''));
  v_aaminah text := nullif(trim(coalesce(payload->>'aaminah', '')), '');
  v_quantity integer := coalesce(nullif(payload->>'quantity', '')::int, 1);
  v_code text := upper(trim(coalesce(payload->>'code', '')));
  v_attachment_path text := trim(coalesce(payload->>'attachment_path', ''));
  v_attachment_name text := nullif(trim(coalesce(payload->>'attachment_name', '')), '');
  v_expected numeric := nullif(payload->>'expected_total', '')::numeric;
  v_early_reserved integer;
  v_regular_reserved integer;
  v_early_available integer;
  v_regular_available integer;
  v_early_qty integer;
  v_regular_qty integer;
  v_discount_amount numeric := 0;
  v_code_total integer;
  v_code_used integer;
  v_total numeric;
  v_order_no text;
begin
  if now() >= timestamptz '2026-12-25 10:00:00+08' then return jsonb_build_object('ok', false, 'error', 'Pendaftaran sudah ditutup.'); end if;
  if v_name = '' or v_whatsapp = '' then return jsonb_build_object('ok', false, 'error', 'Data peserta belum lengkap.'); end if;
  if v_category not in ('MQ Aaminah', 'Selain MQ Aaminah_DIK') then return jsonb_build_object('ok', false, 'error', 'Kategori peserta tidak valid.'); end if;
  if v_attachment_path = '' then return jsonb_build_object('ok', false, 'error', 'Bukti transfer wajib diunggah.'); end if;
  if v_category = 'MQ Aaminah' then
    if v_quantity <> 1 then return jsonb_build_object('ok', false, 'error', 'Kategori MQ Aaminah hanya 1 tiket per order.'); end if;
    if v_aaminah is null then return jsonb_build_object('ok', false, 'error', 'Aaminah wajib diisi.'); end if;
  else
    if v_quantity < 1 or v_quantity > 5 then return jsonb_build_object('ok', false, 'error', 'Jumlah tiket harus 1 sampai 5.'); end if;
    v_aaminah := null;
  end if;

  perform pg_advisory_xact_lock(918273645);
  select
    coalesce(sum(early_bird_qty) filter (where status in ('pending','verified')), 0)::int,
    coalesce(sum(regular_qty) filter (where status in ('pending','verified')), 0)::int
  into v_early_reserved, v_regular_reserved from participant_orders;

  v_early_available := greatest(200 - v_early_reserved, 0);
  v_regular_available := greatest(300 - v_regular_reserved, 0);
  v_early_qty := least(v_quantity, v_early_available);
  v_regular_qty := v_quantity - v_early_qty;
  if v_regular_qty > v_regular_available then
    return jsonb_build_object('ok', false, 'error', 'Kuota tiket tidak mencukupi.',
      'pricing', jsonb_build_object('earlyBirdRemaining', v_early_available, 'regularRemaining', v_regular_available, 'earlyBirdPrice', 175000, 'regularPrice', 200000));
  end if;

  if v_code <> '' then
    if v_category <> 'MQ Aaminah' then return jsonb_build_object('ok', false, 'error', 'Kode diskon hanya berlaku untuk kategori MQ Aaminah.'); end if;
    select quota_total into v_code_total from discount_codes where upper(code) = v_code and active = true order by created_at limit 1;
    if v_code_total is null then return jsonb_build_object('ok', false, 'error', 'Kode diskon tidak valid.'); end if;
    select count(*) into v_code_used from participant_orders where upper(discount_code) = v_code and status in ('pending','verified');
    if v_code_used >= v_code_total then return jsonb_build_object('ok', false, 'error', 'Kuota kode diskon sudah habis.'); end if;
    if v_early_qty < 1 then return jsonb_build_object('ok', false, 'error', 'Kode diskon hanya berlaku selama kuota early bird tersedia.'); end if;
    v_discount_amount := 25000;
  end if;

  v_total := (v_early_qty * 175000) + (v_regular_qty * 200000) - v_discount_amount;
  if v_expected is not null and v_expected <> v_total then
    return jsonb_build_object('ok', false, 'error', 'Harga berubah karena kuota early bird. Silakan periksa nominal transfer terbaru.',
      'pricing', jsonb_build_object('total', v_total, 'earlyBirdQty', v_early_qty, 'regularQty', v_regular_qty, 'discountAmount', v_discount_amount, 'earlyBirdRemaining', v_early_available, 'regularRemaining', v_regular_available));
  end if;

  v_order_no := 'ORD-' || to_char(nextval('participant_order_no_seq'), 'FM000');
  insert into participant_orders (
    order_no, name, whatsapp, category, aaminah, quantity, early_bird_qty, regular_qty,
    discount_code, discount_amount, total_amount, status, attachment_path, attachment_name
  ) values (
    v_order_no, v_name, v_whatsapp, v_category, v_aaminah, v_quantity, v_early_qty, v_regular_qty,
    case when v_discount_amount > 0 then v_code else null end,
    v_discount_amount, v_total, 'pending', v_attachment_path, v_attachment_name
  );
  return jsonb_build_object('ok', true, 'orderNo', v_order_no, 'total', v_total, 'earlyBirdQty', v_early_qty, 'regularQty', v_regular_qty, 'discountAmount', v_discount_amount, 'status', 'pending');
exception when others then
  return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

create or replace function public.admin_mark_participant_proof_viewed(p_order_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'Akses admin diperlukan.'; end if;
  update participant_orders set proof_viewed_at = coalesce(proof_viewed_at, now()) where id = p_order_id;
  return found;
end;
$$;

create or replace function public.admin_verify_participant(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_order participant_orders%rowtype;
  v_ticket_no text;
  v_i integer;
begin
  if not public.is_admin() then raise exception 'Akses admin diperlukan.'; end if;
  select * into v_order from participant_orders where id = p_order_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Order tidak ditemukan.'); end if;
  if v_order.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'Order sudah diproses.'); end if;
  if v_order.attachment_path is null or v_order.attachment_path = '' then return jsonb_build_object('ok', false, 'error', 'Bukti transfer belum diunggah.'); end if;
  if v_order.proof_viewed_at is null then return jsonb_build_object('ok', false, 'error', 'Buka bukti transfer terlebih dahulu.'); end if;
  for v_i in 1..v_order.quantity loop
    v_ticket_no := to_char(nextval('participant_ticket_no_seq'), 'FM000');
    insert into participant_tickets (order_id, ticket_no, name, category, aaminah)
    values (v_order.id, v_ticket_no, v_order.name, v_order.category, v_order.aaminah);
  end loop;
  update participant_orders set status = 'verified', verified_at = now() where id = v_order.id;
  return jsonb_build_object('ok', true, 'ticketToken', v_order.ticket_token, 'orderNo', v_order.order_no, 'quantity', v_order.quantity);
end;
$$;

create or replace function public.admin_reject_participant(p_order_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'Akses admin diperlukan.'; end if;
  update participant_orders set status = 'rejected', rejected_at = now() where id = p_order_id and status = 'pending';
  return found;
end;
$$;

create or replace function public.admin_mark_sponsor_proof_viewed(p_sponsor_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'Akses admin diperlukan.'; end if;
  update sponsors set proof_viewed_at = coalesce(proof_viewed_at, now()) where id = p_sponsor_id;
  return found;
end;
$$;

create or replace function public.admin_verify_sponsor(p_sponsor_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_sponsor sponsors%rowtype;
  v_token uuid;
begin
  if not public.is_admin() then raise exception 'Akses admin diperlukan.'; end if;
  select * into v_sponsor from sponsors where id = p_sponsor_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Sponsor tidak ditemukan.'); end if;
  if v_sponsor.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'Sponsor sudah diproses.'); end if;
  if v_sponsor.attachment_path is null or v_sponsor.attachment_path = '' then return jsonb_build_object('ok', false, 'error', 'Bukti transfer belum diunggah.'); end if;
  if v_sponsor.proof_viewed_at is null then return jsonb_build_object('ok', false, 'error', 'Buka bukti transfer terlebih dahulu.'); end if;
  v_token := coalesce(v_sponsor.invoice_token, gen_random_uuid());
  update sponsors set status = 'verified', verified_at = now(), invoice_token = v_token where id = v_sponsor.id;
  return jsonb_build_object('ok', true, 'invoiceToken', v_token, 'invoiceNo', v_sponsor.invoice_no);
end;
$$;

create or replace function public.admin_reject_sponsor(p_sponsor_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'Akses admin diperlukan.'; end if;
  update sponsors set status = 'rejected', rejected_at = now() where id = p_sponsor_id and status = 'pending';
  return found;
end;
$$;

create or replace function public.get_ticket_by_token(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_order participant_orders%rowtype;
begin
  select * into v_order from participant_orders where ticket_token = p_token;
  if not found then return jsonb_build_object('ok', false, 'status', 'not_found'); end if;
  if v_order.status <> 'verified' then return jsonb_build_object('ok', false, 'status', v_order.status); end if;
  return jsonb_build_object(
    'ok', true,
    'order', jsonb_build_object('orderNo', v_order.order_no, 'name', v_order.name, 'category', v_order.category, 'aaminah', v_order.aaminah, 'quantity', v_order.quantity, 'verifiedAt', v_order.verified_at),
    'tickets', coalesce((select jsonb_agg(jsonb_build_object('ticketNo', t.ticket_no, 'name', t.name, 'category', t.category, 'aaminah', t.aaminah) order by t.ticket_no) from participant_tickets t where t.order_id = v_order.id), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_invoice_by_token(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_sponsor sponsors%rowtype;
begin
  select * into v_sponsor from sponsors where invoice_token = p_token;
  if not found then return jsonb_build_object('ok', false, 'status', 'not_found'); end if;
  if v_sponsor.status <> 'verified' then return jsonb_build_object('ok', false, 'status', v_sponsor.status); end if;
  return jsonb_build_object('ok', true, 'sponsor', jsonb_build_object('invoiceNo', v_sponsor.invoice_no, 'company', v_sponsor.company, 'picName', v_sponsor.pic_name, 'position', v_sponsor.position, 'whatsapp', v_sponsor.whatsapp, 'email', v_sponsor.email, 'package', v_sponsor.package, 'amount', v_sponsor.amount, 'verifiedAt', v_sponsor.verified_at));
end;
$$;

revoke all on function public.get_registration_info() from public, anon;
revoke all on function public.check_discount_code(text) from public, anon;
revoke all on function public.create_participant_order(jsonb) from public, anon, authenticated;
revoke all on function public.get_ticket_by_token(uuid) from public, anon;
revoke all on function public.get_invoice_by_token(uuid) from public, anon;
revoke all on function public.admin_mark_participant_proof_viewed(uuid) from public, anon;
revoke all on function public.admin_verify_participant(uuid) from public, anon;
revoke all on function public.admin_reject_participant(uuid) from public, anon;
revoke all on function public.admin_mark_sponsor_proof_viewed(uuid) from public, anon;
revoke all on function public.admin_verify_sponsor(uuid) from public, anon;
revoke all on function public.admin_reject_sponsor(uuid) from public, anon;

grant execute on function public.get_registration_info() to service_role;
grant execute on function public.check_discount_code(text) to service_role;
grant execute on function public.create_participant_order(jsonb) to service_role;
grant execute on function public.get_ticket_by_token(uuid) to service_role;
grant execute on function public.get_invoice_by_token(uuid) to service_role;
grant execute on function public.admin_mark_participant_proof_viewed(uuid) to authenticated;
grant execute on function public.admin_verify_participant(uuid) to authenticated;
grant execute on function public.admin_reject_participant(uuid) to authenticated;
grant execute on function public.admin_mark_sponsor_proof_viewed(uuid) to authenticated;
grant execute on function public.admin_verify_sponsor(uuid) to authenticated;
grant execute on function public.admin_reject_sponsor(uuid) to authenticated;

insert into discount_codes (code, quota_total, active)
select 'MP-' || upper(substr(md5(random()::text), 1, 6)), 150, true
where not exists (select 1 from discount_codes where active = true);
