-- Personalization groundwork.
--
-- Adds display names for owner/admin accounts, last-visit tracking for both
-- owners and ambassadors (so each dashboard can say what changed while you
-- were gone), and a milestone ledger so an ambassador's "first customer" or
-- "you reached 20%" moment is celebrated exactly once.

-- ---------------------------------------------------------------- schema ---

alter table nsp_user_roles
  add column if not exists first_name       text,
  add column if not exists last_name        text,
  add column if not exists accent           text,
  add column if not exists last_seen_at     timestamptz,
  add column if not exists previous_seen_at timestamptz;

comment on column nsp_user_roles.accent is
  'Optional palette key used to tint this person''s monogram in the Control Center.';
comment on column nsp_user_roles.previous_seen_at is
  'End of the visit before the current one. Powers the "since you were last here" digest.';

alter table nsp_partners
  add column if not exists last_seen_at     timestamptz,
  add column if not exists previous_seen_at timestamptz;

-- Seed the two owners. Guarded so re-running never clobbers a chosen name.
update nsp_user_roles r
   set first_name = 'Isaac', last_name = 'Triplett', accent = coalesce(r.accent, 'forest')
  from auth.users u
 where u.id = r.user_id
   and lower(u.email) = 'triplettisaac12@gmail.com'
   and r.role in ('owner', 'admin')
   and r.first_name is null;

update nsp_user_roles r
   set first_name = 'Daniel', last_name = 'Fuchs', accent = coalesce(r.accent, 'gold')
  from auth.users u
 where u.id = r.user_id
   and lower(u.email) = 'daniel.fuchs217@gmail.com'
   and r.role in ('owner', 'admin')
   and r.first_name is null;

-- One row per ambassador per milestone. Written by SECURITY DEFINER functions
-- only; no RLS policy exists, so direct client access is denied outright.
create table if not exists nsp_partner_milestones (
  partner_id      uuid        not null references nsp_partners(id) on delete cascade,
  key             text        not null,
  achieved_at     timestamptz not null default now(),
  acknowledged_at timestamptz,
  primary key (partner_id, key)
);
alter table nsp_partner_milestones enable row level security;

-- --------------------------------------------------------------- helpers ---

-- Human label for an audit actor: an owner's first name, an ambassador's first
-- name, or a safe fallback. Used to turn "Record sale" into "Daniel recorded a sale".
create or replace function nsp_actor_name(p_actor uuid)
returns text language sql stable security definer set search_path to 'public' as $fn$
  select case
    when p_actor is null then 'System'
    else coalesce(
      (select coalesce(r.first_name, split_part(u.email, '@', 1))
         from nsp_user_roles r join auth.users u on u.id = r.user_id
        where r.user_id = p_actor and r.role in ('owner', 'admin') limit 1),
      (select coalesce(p.first_name, p.name) from nsp_partners p where p.user_id = p_actor limit 1),
      'Someone')
  end
$fn$;

-- Rolls the signed-in owner's visit clock and returns the end of the PREVIOUS
-- visit (null on a first-ever sign-in). Repeat calls inside a 30-minute window
-- are treated as the same visit, so refreshing the page keeps the same digest.
create or replace function nsp_touch_owner_session()
returns timestamptz language plpgsql security definer set search_path to 'public' as $fn$
declare v_last timestamptz; v_prev timestamptz;
begin
  select last_seen_at, previous_seen_at into v_last, v_prev
    from nsp_user_roles where user_id = auth.uid() and role in ('owner', 'admin') limit 1;

  if v_last is null or now() - v_last > interval '30 minutes' then
    update nsp_user_roles set previous_seen_at = last_seen_at, last_seen_at = now()
      where user_id = auth.uid() and role in ('owner', 'admin');
    return v_last;
  end if;

  update nsp_user_roles set last_seen_at = now()
    where user_id = auth.uid() and role in ('owner', 'admin');
  return v_prev;
end $fn$;

-- Same idea for an ambassador.
create or replace function nsp_touch_partner_session(p_partner uuid)
returns timestamptz language plpgsql security definer set search_path to 'public' as $fn$
declare v_last timestamptz; v_prev timestamptz;
begin
  select last_seen_at, previous_seen_at into v_last, v_prev
    from nsp_partners where id = p_partner;

  if v_last is null or now() - v_last > interval '30 minutes' then
    update nsp_partners set previous_seen_at = last_seen_at, last_seen_at = now() where id = p_partner;
    return v_last;
  end if;

  update nsp_partners set last_seen_at = now() where id = p_partner;
  return v_prev;
end $fn$;

-- ------------------------------------------------------------------ me ----

-- Now also returns the signed-in owner's display name, so the Control Center
-- can greet them before any business data has loaded.
create or replace function nsp_me()
returns jsonb language sql stable security definer set search_path to 'public' as $fn$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'role', case
      when exists (select 1 from nsp_user_roles where user_id = auth.uid() and role = 'owner') then 'owner'
      when exists (select 1 from nsp_user_roles where user_id = auth.uid() and role = 'admin') then 'admin'
      when exists (select 1 from nsp_partners where user_id = auth.uid() and status not in ('archived')) then 'ambassador'
      else null end,
    'staff', (select jsonb_build_object('first_name', r.first_name, 'last_name', r.last_name, 'accent', r.accent)
                from nsp_user_roles r where r.user_id = auth.uid() and r.role in ('owner', 'admin') limit 1),
    'ambassador', (select jsonb_build_object('id', id, 'public_id', public_id,
                     'first_name', coalesce(first_name, name), 'status', status)
                     from nsp_partners where user_id = auth.uid()))
  where auth.uid() is not null
$fn$;

-- --------------------------------------------------------- owner digest ---

-- "Since you were last here." Everything below already existed in the audit
-- log and the ordinary tables; the only new fact is when you last looked.
create or replace function nsp_owner_digest()
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_since timestamptz; v_me uuid := auth.uid(); v_result jsonb;
begin
  perform nsp_require_owner();
  v_since := nsp_touch_owner_session();
  if v_since is null then
    return jsonb_build_object('first_visit', true, 'since', null);
  end if;

  select jsonb_build_object(
    'first_visit', false,
    'since', v_since,
    'order_requests', (select count(*) from nsp_requests where kind = 'order' and created_at >= v_since),
    'applications',   (select count(*) from nsp_requests where kind = 'application' and created_at >= v_since),
    'inquiries',      (select count(*) from nsp_requests
                        where kind not in ('order', 'application') and created_at >= v_since),
    'sales_count',    (select count(*) from nsp_orders
                        where created_at >= v_since and status in ('paid', 'fulfilled')),
    'sales_cents',    (select coalesce(sum(product_paid_cents - refunded_cents), 0) from nsp_orders
                        where created_at >= v_since and status in ('paid', 'fulfilled')),
    'new_customers',  (select count(*) from nsp_customers where created_at >= v_since and merged_into is null),
    'clicks',         (select count(*) from nsp_referral_clicks where created_at >= v_since),
    -- What your partner did while you were away, named.
    'partner_events', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('action', a.action, 'at', a.created_at, 'entity', a.entity,
                                  'actor_name', nsp_actor_name(a.actor)) x
          from nsp_audit a
         where a.created_at >= v_since and a.actor is not null and a.actor <> v_me
         order by a.created_at desc limit 5) y), '[]')
  ) into v_result;
  return v_result;
end $fn$;

-- --------------------------------------------------- ambassador milestone --

-- Records any milestone the ambassador has newly reached and returns the ones
-- they have not seen yet. Idempotent: a milestone is inserted once and never
-- re-fires once acknowledged.
create or replace function nsp_partner_milestones_refresh(p_partner uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare
  v_customers int; v_commission bigint; v_revenue bigint; v_clicks int; v_best_bps int;
begin
  select count(*) into v_customers from nsp_customer_attributions
   where partner_id = p_partner and status in ('active', 'expired') and first_purchase_on is not null;
  select coalesce(sum(final_cents), 0) into v_commission from nsp_commission_statements
   where partner_id = p_partner and status <> 'cancelled';
  select coalesce(sum(qualified_cents - refunded_cents), 0) into v_revenue from nsp_orders
   where partner_id = p_partner and status in ('paid', 'fulfilled') and classification in ('NEW', 'RESIDUAL');
  select count(*) into v_clicks from nsp_referral_clicks where partner_id = p_partner;
  select coalesce(max(tier_bps), 0) into v_best_bps from nsp_commission_statements
   where partner_id = p_partner and qualified_cents > 0;

  insert into nsp_partner_milestones (partner_id, key)
  select p_partner, t.k from (values
    ('first_click',      v_clicks     >= 1),
    ('first_customer',   v_customers  >= 1),
    ('five_customers',   v_customers  >= 5),
    ('ten_customers',    v_customers  >= 10),
    ('twentyfive_customers', v_customers >= 25),
    ('first_commission', v_commission >= 1),
    ('earned_100',       v_commission >= 10000),
    ('earned_500',       v_commission >= 50000),
    ('earned_1000',      v_commission >= 100000),
    ('revenue_1000',     v_revenue    >= 100000),
    ('revenue_5000',     v_revenue    >= 500000),
    ('tier_1750',        v_best_bps   >= 1750),
    ('tier_2000',        v_best_bps   >= 2000),
    ('tier_2250',        v_best_bps   >= 2250),
    ('tier_2500',        v_best_bps   >= 2500)
  ) as t(k, hit) where t.hit
  on conflict (partner_id, key) do nothing;

  return coalesce((select jsonb_agg(jsonb_build_object('key', key, 'achieved_at', achieved_at) order by achieved_at)
                     from nsp_partner_milestones
                    where partner_id = p_partner and acknowledged_at is null), '[]');
end $fn$;

-- Called when the ambassador dismisses a milestone banner.
create or replace function nsp_ack_milestone(p_key text)
returns void language plpgsql security definer set search_path to 'public' as $fn$
declare v_partner uuid;
begin
  select id into v_partner from nsp_partners where user_id = auth.uid();
  if v_partner is null then raise exception 'Approved ambassador access required'; end if;
  update nsp_partner_milestones set acknowledged_at = now()
    where partner_id = v_partner and key = p_key and acknowledged_at is null;
end $fn$;

revoke all on function nsp_touch_owner_session() from public, anon, authenticated;
revoke all on function nsp_touch_partner_session(uuid) from public, anon, authenticated;
revoke all on function nsp_partner_milestones_refresh(uuid) from public, anon, authenticated;
grant execute on function nsp_owner_digest() to authenticated;
grant execute on function nsp_ack_milestone(text) to authenticated;
grant execute on function nsp_actor_name(uuid) to authenticated;
