-- Natural State Ambassador Program — schema (11 Sep 2026)
--
-- Extends the portal v1 schema rather than replacing it:
--   * nsp_partners stays the ambassador table (existing name kept so existing
--     code, policies and the edge function keep working).
--   * nsp_requests stays the single inquiry table (applications, product,
--     COA, availability and the new order requests all live here).
--   * nsp_audit stays the audit log, now append-only.
-- The v1 money tables (nsp_orders, nsp_commissions, nsp_payouts) held no rows
-- and used a fixed per-partner rate, which cannot express monthly tiers,
-- residuals or customers. They are rebuilt below; the migration refuses to run
-- if any of them contains data.

do $$ begin
  if exists (select 1 from public.nsp_orders) or exists (select 1 from public.nsp_commissions)
     or exists (select 1 from public.nsp_payouts) then
    raise exception 'v1 order/commission/payout tables contain data; migrate them before rebuilding';
  end if;
end $$;

-- v1 money functions (replaced by the engine in the next migration)
drop function if exists public.nsp_record_order(uuid, text, text, integer, timestamptz);
drop function if exists public.nsp_refund(uuid, integer, text);
drop function if exists public.nsp_approve(uuid);
drop function if exists public.nsp_record_payout(uuid, integer, text);
drop function if exists public.nsp_partner_summary();
drop function if exists public.nsp_save_partner(uuid, text, text, text, text, integer, text, integer);
drop table public.nsp_commissions;
drop table public.nsp_payouts;
drop table public.nsp_orders;

---------------------------------------------------------------------------
-- Helpers
---------------------------------------------------------------------------
create or replace function public.nsp_norm_email(e text) returns text
language sql immutable parallel safe as $$ select nullif(lower(trim(e)), '') $$;

-- Digits only; a leading US country code is dropped so +1 (501) 555-0100 and
-- 501-555-0100 match. Anything shorter than 7 digits is treated as no phone.
create or replace function public.nsp_norm_phone(p text) returns text
language sql immutable parallel safe as $$
  select case
    when d is null or length(d) < 7 then null
    when length(d) = 11 and left(d, 1) = '1' then right(d, 10)
    else d end
  from (select nullif(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '') as d) x
$$;

-- Unambiguous alphabet (no 0/O, 1/I/L). Cryptographically random bytes.
create or replace function public.nsp_random_code(n int) returns text
language plpgsql volatile set search_path = public, extensions as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  b bytea := gen_random_bytes(n);
  r text := '';
begin
  for i in 0 .. n - 1 loop
    r := r || substr(alphabet, 1 + (get_byte(b, i) % 31), 1);
  end loop;
  return r;
end $$;

create or replace function public.nsp_short_id(prefix text) returns text
language sql volatile set search_path = public as $$ select prefix || '_' || nsp_random_code(7) $$;

---------------------------------------------------------------------------
-- Roles. Owner authority comes only from this table, which no client can
-- write to: there is no insert policy and no RPC that grants 'owner'.
---------------------------------------------------------------------------
create table public.nsp_user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'staff', 'ambassador', 'customer')),
  granted_at timestamptz not null default now(),
  granted_by uuid,
  primary key (user_id, role)
);
insert into public.nsp_user_roles (user_id, role)
select user_id, 'owner' from public.nsp_admins on conflict do nothing;

create or replace function public.nsp_is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from nsp_user_roles where user_id = auth.uid() and role = 'owner')
$$;
-- Every existing owner check calls nsp_is_admin(); it now reads the roles
-- table. 'admin' is reserved for a future limited-staff role.
create or replace function public.nsp_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from nsp_user_roles where user_id = auth.uid() and role in ('owner', 'admin'))
$$;

---------------------------------------------------------------------------
-- Program settings: one row. Every rate and threshold lives here.
---------------------------------------------------------------------------
create table public.nsp_settings (
  id boolean primary key default true check (id),
  tiers jsonb not null,
  residual_bps integer not null check (residual_bps between 0 and 5000),
  residual_months integer not null check (residual_months between 1 and 60),
  referral_window_days integer not null default 30 check (referral_window_days between 1 and 365),
  reacquisition text not null default 'never' check (reacquisition in ('never', 'allow')),
  excluded_products text[] not null default '{}',
  leaderboard_enabled boolean not null default false,
  timezone text not null default 'America/Chicago',
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.nsp_settings (tiers, residual_bps, residual_months) values (
  '[{"name":"Ambassador","min_cents":0,"bps":1500},
    {"name":"Pro Ambassador","min_cents":100000,"bps":1750},
    {"name":"Select Ambassador","min_cents":250000,"bps":2000},
    {"name":"Elite Ambassador","min_cents":500000,"bps":2250},
    {"name":"Natural State Partner","min_cents":1000000,"bps":2500}]'::jsonb,
  1000, 6);

create or replace function public.nsp_cfg() returns public.nsp_settings
language sql stable security definer set search_path = public as $$ select * from nsp_settings where id $$;

create or replace function public.nsp_today() returns date
language sql stable security definer set search_path = public as $$
  select (now() at time zone (select timezone from nsp_settings where id))::date
$$;

---------------------------------------------------------------------------
-- Ambassadors (nsp_partners extended)
---------------------------------------------------------------------------
alter table public.nsp_partners drop constraint nsp_partners_status_check;
alter table public.nsp_partners add constraint nsp_partners_status_check
  check (status in ('pending', 'active', 'suspended', 'inactive', 'archived'));
alter table public.nsp_partners
  add column public_id text unique,
  add column first_name text,
  add column last_name text,
  add column phone text,
  add column phone_norm text generated always as (nsp_norm_phone(phone)) stored,
  add column city text,
  add column state text,
  add column start_date date,
  add column notes text,
  add column application_id uuid references public.nsp_requests(id),
  add column archived_at timestamptz,
  add column last_activity_at timestamptz,
  add column updated_at timestamptz not null default now();
alter table public.nsp_partners alter column hold_days set default 0;
update public.nsp_partners set public_id = nsp_short_id('amb') where public_id is null;
alter table public.nsp_partners alter column public_id set default nsp_short_id('amb');
alter table public.nsp_partners alter column public_id set not null;

-- Every code an ambassador has ever used keeps resolving to the same
-- ambassador, so printed QR codes and cards survive a code change.
create table public.nsp_referral_codes (
  code text primary key check (code ~ '^[A-Z0-9_-]{3,32}$'),
  partner_id uuid not null references public.nsp_partners(id),
  created_at timestamptz not null default now()
);
insert into public.nsp_referral_codes (code, partner_id) select code, id from public.nsp_partners
on conflict do nothing;

create table public.nsp_referral_clicks (
  id bigint generated always as identity primary key,
  partner_id uuid not null references public.nsp_partners(id),
  code text not null,
  source text not null default 'link' check (source in ('link', 'param', 'code_entry')),
  visitor_id text check (visitor_id ~ '^[A-Za-z0-9-]{8,64}$'),
  landing_path text check (length(landing_path) <= 300),
  referrer_host text check (length(referrer_host) <= 200),
  ip_hash text,
  created_at timestamptz not null default now()
);
create index nsp_referral_clicks_partner on public.nsp_referral_clicks (partner_id, created_at);
create index nsp_referral_clicks_visitor on public.nsp_referral_clicks (visitor_id, created_at);

---------------------------------------------------------------------------
-- Customers. The uuid is the relational key everywhere; public_id is the
-- human-readable permanent ID (cus_XXXXXXX). Email/phone are match signals,
-- never keys.
---------------------------------------------------------------------------
create table public.nsp_customers (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default nsp_short_id('cus'),
  first_name text not null check (length(trim(first_name)) between 1 and 60),
  last_name text check (length(last_name) <= 60),
  email text check (length(email) <= 254),
  email_norm text generated always as (nsp_norm_email(email)) stored,
  phone text check (length(phone) <= 40),
  phone_norm text generated always as (nsp_norm_phone(phone)) stored,
  user_id uuid unique references auth.users(id),     -- future customer accounts
  notes text check (length(notes) <= 4000),
  duplicate_flag boolean not null default false,
  merged_into uuid references public.nsp_customers(id),
  -- Owner correction of attribution. When locked, override_partner_id is the
  -- attributed ambassador (null = deliberately unattributed).
  attribution_locked boolean not null default false,
  attribution_override_partner_id uuid references public.nsp_partners(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);
create unique index nsp_customers_email_unique on public.nsp_customers (email_norm)
  where merged_into is null and email_norm is not null;
create index nsp_customers_phone on public.nsp_customers (phone_norm);

---------------------------------------------------------------------------
-- Orders / sales. Money is integer cents. Derived columns (partner_id,
-- classification, commission_*) are written only by the engine.
---------------------------------------------------------------------------
create table public.nsp_orders (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default nsp_short_id('ord'),
  customer_id uuid not null references public.nsp_customers(id),
  request_id uuid references public.nsp_requests(id),
  referred_partner_id uuid references public.nsp_partners(id),
  referral_code text,
  referral_source text check (referral_source in ('link', 'param', 'code_entry', 'inquiry', 'manual')),
  partner_id uuid references public.nsp_partners(id),
  order_date date not null,
  paid_on date,
  status text not null default 'awaiting_payment'
    check (status in ('draft', 'awaiting_payment', 'paid', 'fulfilled', 'cancelled', 'refunded', 'disputed')),
  fulfillment_status text not null default 'unfulfilled'
    check (fulfillment_status in ('unfulfilled', 'ready', 'shipped', 'picked_up', 'delivered')),
  fulfillment_method text check (fulfillment_method in ('ship', 'pickup')),
  payment_method text check (payment_method in ('cash', 'cashapp', 'venmo', 'crypto', 'other')),
  product_paid_cents integer not null default 0 check (product_paid_cents between 0 and 100000000),
  discount_cents integer not null default 0 check (discount_cents between 0 and 100000000),
  shipping_cents integer not null default 0 check (shipping_cents between 0 and 100000000),
  excluded_cents integer not null default 0 check (excluded_cents >= 0),
  gross_cents integer generated always as (product_paid_cents + discount_cents) stored,
  qualified_cents integer generated always as (greatest(product_paid_cents - excluded_cents, 0)) stored,
  refunded_cents integer not null default 0 check (refunded_cents >= 0),
  manual_exclude boolean not null default false,
  exclude_reason text,
  classification text check (classification in ('NEW', 'RESIDUAL', 'UNATTRIBUTED', 'EXCLUDED')),
  commission_type text not null default 'none' check (commission_type in ('new', 'residual', 'none')),
  commission_bps integer not null default 0,
  commission_cents integer not null default 0,
  flags text[] not null default '{}',
  reference text check (length(reference) <= 120),
  notes text check (length(notes) <= 4000),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (refunded_cents <= greatest(product_paid_cents - excluded_cents, 0)),
  check (status not in ('paid', 'fulfilled', 'refunded', 'disputed') or paid_on is not null)
);
create unique index nsp_orders_reference on public.nsp_orders (lower(reference)) where reference is not null;
create index nsp_orders_customer on public.nsp_orders (customer_id, paid_on);
create index nsp_orders_partner_month on public.nsp_orders (partner_id, paid_on);

create table public.nsp_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.nsp_orders(id) on delete cascade,
  product_slug text,
  product_name text not null check (length(product_name) between 1 and 150),
  quantity integer not null check (quantity between 1 and 1000),
  line_cents integer check (line_cents >= 0),
  eligible boolean not null default true
);
create index nsp_order_items_order on public.nsp_order_items (order_id);

-- Attribution periods, maintained by the engine from the order history plus
-- any owner correction. Rows are never deleted: superseded periods are
-- marked 'ended' or 'corrected' and kept for disputes.
create table public.nsp_customer_attributions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.nsp_customers(id),
  partner_id uuid not null references public.nsp_partners(id),
  code_used text,
  source text not null check (source in ('link', 'param', 'code_entry', 'inquiry', 'manual', 'correction')),
  first_order_id uuid references public.nsp_orders(id),
  first_purchase_on date,
  residual_starts_on date,
  residual_expires_on date,
  status text not null check (status in ('pending', 'active', 'expired', 'ended', 'corrected')),
  ended_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index nsp_attr_customer on public.nsp_customer_attributions (customer_id, status);
create index nsp_attr_partner on public.nsp_customer_attributions (partner_id, status);

---------------------------------------------------------------------------
-- Monthly commission statements (one per ambassador per calendar month),
-- adjustments and payouts.
---------------------------------------------------------------------------
create table public.nsp_commission_statements (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.nsp_partners(id),
  month date not null check (extract(day from month) = 1),
  new_revenue_cents bigint not null default 0,
  residual_revenue_cents bigint not null default 0,
  qualified_cents bigint not null default 0,
  new_customers integer not null default 0,
  returning_customers integer not null default 0,
  tier_name text,
  tier_bps integer,
  residual_bps integer,
  rates_snapshot jsonb,
  new_commission_cents bigint not null default 0,
  residual_commission_cents bigint not null default 0,
  adjustment_cents bigint not null default 0,
  final_cents bigint not null default 0,
  paid_cents bigint not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'held', 'cancelled')),
  notes text check (length(notes) <= 2000),
  approved_at timestamptz,
  approved_by uuid,
  updated_at timestamptz not null default now(),
  unique (partner_id, month)
);

create table public.nsp_commission_adjustments (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.nsp_commission_statements(id),
  cents bigint not null check (cents <> 0),
  reason text not null check (length(trim(reason)) between 3 and 500),
  created_by uuid,
  created_at timestamptz not null default now()
);

create table public.nsp_payouts (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.nsp_commission_statements(id),
  partner_id uuid not null references public.nsp_partners(id),
  amount_cents bigint not null check (amount_cents > 0),
  paid_on date not null,
  reference text check (length(reference) <= 120),
  notes text check (length(notes) <= 1000),
  created_by uuid,
  created_at timestamptz not null default now()
);

---------------------------------------------------------------------------
-- Inquiries (nsp_requests extended): names split, phone, order requests,
-- first-party visitor id for referral attribution, conversion links.
---------------------------------------------------------------------------
alter table public.nsp_requests drop constraint nsp_requests_kind_check;
alter table public.nsp_requests add constraint nsp_requests_kind_check
  check (kind in ('product', 'coa', 'application', 'availability', 'order'));
alter table public.nsp_requests drop constraint nsp_requests_status_check;
alter table public.nsp_requests add constraint nsp_requests_status_check
  check (status in ('new', 'reviewed', 'closed', 'converted', 'approved', 'declined'));
alter table public.nsp_requests
  add column first_name text,
  add column last_name text,
  add column phone text,
  add column phone_norm text generated always as (nsp_norm_phone(phone)) stored,
  add column city text,
  add column state text,
  add column order_items jsonb,
  add column payment_method text check (payment_method in ('cash', 'cashapp', 'venmo', 'crypto', 'other')),
  add column payment_other text check (length(payment_other) <= 100),
  add column fulfillment_method text check (fulfillment_method in ('ship', 'pickup')),
  add column research_ack boolean,
  add column visitor_id text,
  add column referral_source text,
  add column customer_id uuid references public.nsp_customers(id),
  add column order_id uuid references public.nsp_orders(id),
  add column decision_reason text,
  add column updated_at timestamptz not null default now();
update public.nsp_requests set first_name = split_part(name, ' ', 1),
  last_name = nullif(substr(name, length(split_part(name, ' ', 1)) + 2), '')
  where first_name is null;

---------------------------------------------------------------------------
-- Audit log: append-only, with before/after values and a reason.
---------------------------------------------------------------------------
alter table public.nsp_audit
  add column entity text,
  add column entity_id text,
  add column before jsonb,
  add column after jsonb,
  add column reason text;
create or replace function public.nsp_audit_append_only() returns trigger
language plpgsql as $$ begin raise exception 'The audit log is append-only'; end $$;
create trigger nsp_audit_append_only before update or delete on public.nsp_audit
  for each row execute function public.nsp_audit_append_only();
create trigger nsp_audit_no_truncate before truncate on public.nsp_audit
  for each statement execute function public.nsp_audit_append_only();

create or replace function public.nsp_log(p_action text, p_entity text, p_entity_id text,
  p_before jsonb default null, p_after jsonb default null, p_reason text default null)
returns void language sql security definer set search_path = public as $$
  insert into nsp_audit (actor, action, detail, entity, entity_id, before, after, reason)
  values (auth.uid(), p_action, '{}'::jsonb, p_entity, p_entity_id, p_before, p_after, nullif(trim(p_reason), ''))
$$;

---------------------------------------------------------------------------
-- Row Level Security. Nothing is writable directly by browsers; all writes
-- go through SECURITY DEFINER functions that check the caller's role.
-- Owners can read business tables. Ambassadors read nothing directly except
-- their own ambassador row; everything else reaches them through
-- nsp_ambassador_dashboard(), which filters to their own ambassador id.
---------------------------------------------------------------------------
do $$ declare t text; begin
  foreach t in array array['nsp_user_roles', 'nsp_settings', 'nsp_referral_codes', 'nsp_referral_clicks',
    'nsp_customers', 'nsp_orders', 'nsp_order_items', 'nsp_customer_attributions',
    'nsp_commission_statements', 'nsp_commission_adjustments', 'nsp_payouts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

-- v1 let an ambassador select their own nsp_partners row directly; that row
-- now carries internal notes, so direct reads become owner-only.
drop policy partner_read on public.nsp_partners;
create policy partners_owner on public.nsp_partners for select to authenticated using (nsp_is_admin());

create policy roles_read on public.nsp_user_roles for select to authenticated
  using (user_id = auth.uid() or nsp_is_admin());
create policy settings_owner on public.nsp_settings for select to authenticated using (nsp_is_admin());
create policy codes_owner on public.nsp_referral_codes for select to authenticated using (nsp_is_admin());
create policy clicks_owner on public.nsp_referral_clicks for select to authenticated using (nsp_is_admin());
create policy customers_owner on public.nsp_customers for select to authenticated using (nsp_is_admin());
create policy orders_owner on public.nsp_orders for select to authenticated using (nsp_is_admin());
create policy items_owner on public.nsp_order_items for select to authenticated using (nsp_is_admin());
create policy attributions_owner on public.nsp_customer_attributions for select to authenticated using (nsp_is_admin());
create policy statements_owner on public.nsp_commission_statements for select to authenticated using (nsp_is_admin());
create policy adjustments_owner on public.nsp_commission_adjustments for select to authenticated using (nsp_is_admin());
create policy payouts_owner on public.nsp_payouts for select to authenticated using (nsp_is_admin());
