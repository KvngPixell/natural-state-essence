-- Natural State Ambassador Program — attribution + commission engine.
--
-- All money and attribution decisions happen here, server-side, from trusted
-- rows. The browser never supplies a classification, rate or commission.
--
-- Rules (settings live in nsp_settings):
--  * A sale counts only when status is paid or fulfilled, with qualified
--    revenue (product revenue after discounts, minus excluded products,
--    minus refunds) above zero, and not manually excluded.
--  * A customer's attribution period starts with their first counting sale,
--    if that sale carried a referral (or the owner locked an attribution).
--    That sale is NEW. Later counting sales inside the residual window
--    (residual_months from the first sale) are RESIDUAL. Anything else is
--    UNATTRIBUTED.
--  * An active attribution is never replaced by a later referral.
--  * reacquisition = 'allow' lets a customer with no open period (expired,
--    or never attributed) be attributed by a later referred sale, which is
--    then NEW and opens a fresh period. 'never' (default) does not.
--  * Sales where the customer is the ambassador (email, phone or login
--    match) are EXCLUDED and flagged.
--  * Monthly Qualified Revenue = NEW + RESIDUAL revenue by confirmed payment
--    date in the program time zone. The tier it reaches applies
--    retroactively to every NEW sale that month; RESIDUAL sales earn the
--    residual rate but still count 100% toward the tier.

create or replace function public.nsp_month(d date) returns date
language sql immutable parallel safe as $$ select date_trunc('month', d)::date $$;

create or replace function public.nsp_tier(p_tiers jsonb, p_cents bigint)
returns table (idx int, name text, bps int, min_cents bigint, next_name text, next_min_cents bigint)
language sql immutable as $$
  with t as (
    select (e ->> 'name') as name, (e ->> 'bps')::int as bps, (e ->> 'min_cents')::bigint as min_cents,
           ord::int as idx
    from jsonb_array_elements(p_tiers) with ordinality as x (e, ord)
  )
  select cur.idx, cur.name, cur.bps, cur.min_cents, nxt.name, nxt.min_cents
  from (select * from t where t.min_cents <= greatest(p_cents, 0) order by t.min_cents desc limit 1) cur
  left join lateral (select * from t where t.min_cents > cur.min_cents order by t.min_cents limit 1) nxt on true
$$;

create or replace function public.nsp_is_self(p_customer uuid, p_partner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from nsp_customers c join nsp_partners p on p.id = p_partner
    where c.id = p_customer and (
      (c.email_norm is not null and c.email_norm = nsp_norm_email(p.email))
      or (c.phone_norm is not null and c.phone_norm = p.phone_norm)
      or (c.user_id is not null and c.user_id = p.user_id)))
$$;

create or replace function public.nsp_expire_attributions() returns void
language sql security definer set search_path = public as $$
  update nsp_customer_attributions set status = 'expired', updated_at = now()
  where status = 'active' and residual_expires_on <= nsp_today()
$$;

---------------------------------------------------------------------------
-- Monthly statement for one ambassador. Approved/paid statements keep the
-- rates they were approved under; revenue changes (refunds) still flow in.
---------------------------------------------------------------------------
create or replace function public.nsp_recompute_statement(p_partner uuid, p_month date) returns void
language plpgsql security definer set search_path = public as $$
declare
  cfg nsp_settings := nsp_cfg();
  m date := nsp_month(p_month);
  s nsp_commission_statements;
  rates jsonb;
  t record;
  res_bps int;
  new_rev bigint; res_rev bigint; new_cust int; ret_cust int;
  adj bigint; paid bigint; new_comm bigint; res_comm bigint;
begin
  if p_partner is null or p_month is null then return; end if;
  select * into s from nsp_commission_statements where partner_id = p_partner and month = m for update;
  if found and s.status in ('approved', 'paid') and s.rates_snapshot is not null then
    rates := s.rates_snapshot;
  else
    rates := jsonb_build_object('tiers', cfg.tiers, 'residual_bps', cfg.residual_bps);
  end if;
  res_bps := (rates ->> 'residual_bps')::int;

  select coalesce(sum(qualified_cents - refunded_cents) filter (where classification = 'NEW'), 0),
         coalesce(sum(qualified_cents - refunded_cents) filter (where classification = 'RESIDUAL'), 0),
         count(distinct customer_id) filter (where classification = 'NEW'),
         count(distinct customer_id) filter (where classification = 'RESIDUAL')
    into new_rev, res_rev, new_cust, ret_cust
  from nsp_orders
  where partner_id = p_partner and paid_on >= m and paid_on < (m + interval '1 month')::date
    and status in ('paid', 'fulfilled') and classification in ('NEW', 'RESIDUAL');

  select * into t from nsp_tier(rates -> 'tiers', new_rev + res_rev);

  update nsp_orders o set
    commission_bps = case o.classification when 'NEW' then t.bps else res_bps end,
    commission_cents = round((o.qualified_cents - o.refunded_cents)::numeric
                             * (case o.classification when 'NEW' then t.bps else res_bps end) / 10000)
  where o.partner_id = p_partner and o.paid_on >= m and o.paid_on < (m + interval '1 month')::date
    and o.status in ('paid', 'fulfilled') and o.classification in ('NEW', 'RESIDUAL');

  if s.id is null and new_rev + res_rev = 0 then return; end if;

  new_comm := round(new_rev::numeric * t.bps / 10000);
  res_comm := round(res_rev::numeric * res_bps / 10000);
  select coalesce(sum(cents), 0) into adj from nsp_commission_adjustments where statement_id = s.id;
  select coalesce(sum(amount_cents), 0) into paid from nsp_payouts where statement_id = s.id;

  insert into nsp_commission_statements as cs (partner_id, month, new_revenue_cents, residual_revenue_cents,
    qualified_cents, new_customers, returning_customers, tier_name, tier_bps, residual_bps, rates_snapshot,
    new_commission_cents, residual_commission_cents, adjustment_cents, final_cents, paid_cents, updated_at)
  values (p_partner, m, new_rev, res_rev, new_rev + res_rev, new_cust, ret_cust, t.name, t.bps, res_bps, rates,
    new_comm, res_comm, coalesce(adj, 0), new_comm + res_comm + coalesce(adj, 0), coalesce(paid, 0), now())
  on conflict (partner_id, month) do update set
    new_revenue_cents = excluded.new_revenue_cents, residual_revenue_cents = excluded.residual_revenue_cents,
    qualified_cents = excluded.qualified_cents, new_customers = excluded.new_customers,
    returning_customers = excluded.returning_customers, tier_name = excluded.tier_name,
    tier_bps = excluded.tier_bps, residual_bps = excluded.residual_bps, rates_snapshot = excluded.rates_snapshot,
    new_commission_cents = excluded.new_commission_cents,
    residual_commission_cents = excluded.residual_commission_cents,
    adjustment_cents = excluded.adjustment_cents, final_cents = excluded.final_cents,
    paid_cents = excluded.paid_cents, updated_at = now();
end $$;

---------------------------------------------------------------------------
-- Rebuild one customer's attribution periods and sale classifications,
-- then refresh every monthly statement the change could have touched.
---------------------------------------------------------------------------
create or replace function public.nsp_recompute_customer(p_customer uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  cfg nsp_settings := nsp_cfg();
  today date := nsp_today();
  c nsp_customers;
  o record;
  keys text[];
  k text;
  counting boolean;
  ever_counting boolean := false;
  open_partner uuid; open_start date; open_end date; open_first uuid; open_code text; open_source text;
  periods jsonb := '[]'::jsonb;
  cls text; eff_partner uuid; ctype text; flg text[];
  candidate uuid; cand_code text; cand_source text;
  pend_partner uuid; pend_code text; pend_source text;
  p jsonb; rid uuid; matched uuid[] := '{}';
begin
  select * into c from nsp_customers where id = p_customer for update;
  if not found then return; end if;

  select coalesce(array_agg(distinct partner_id::text || '|' || nsp_month(paid_on)::text), '{}') into keys
  from nsp_orders where customer_id = p_customer and partner_id is not null and paid_on is not null;

  for o in
    select * from nsp_orders where customer_id = p_customer
    order by paid_on nulls last, created_at, id
  loop
    counting := o.status in ('paid', 'fulfilled') and o.qualified_cents - o.refunded_cents > 0
                and not o.manual_exclude;
    cls := null; eff_partner := null; ctype := 'none';
    flg := array_remove(array_remove(o.flags, 'self_purchase'), 'no_referral_attached');

    if counting then
      if open_partner is not null and o.paid_on >= open_end then
        open_partner := null;                                  -- period over
      end if;
      if open_partner is not null then
        cls := 'RESIDUAL'; eff_partner := open_partner; ctype := 'residual';
      else
        if c.attribution_locked then
          candidate := case when not ever_counting then c.attribution_override_partner_id end;
          cand_code := null; cand_source := 'correction';
        elsif not ever_counting or cfg.reacquisition = 'allow' then
          candidate := o.referred_partner_id; cand_code := o.referral_code;
          cand_source := coalesce(o.referral_source, 'manual');
        else
          candidate := null;
        end if;

        if candidate is not null and nsp_is_self(p_customer, candidate) then
          cls := 'EXCLUDED'; eff_partner := candidate; flg := array_append(flg, 'self_purchase');
        elsif candidate is not null then
          open_partner := candidate; open_start := o.paid_on;
          open_end := (o.paid_on + make_interval(months => cfg.residual_months))::date;
          open_first := o.id; open_code := cand_code; open_source := cand_source;
          periods := periods || jsonb_build_object('partner_id', open_partner, 'first_order_id', open_first,
            'start', open_start, 'end', open_end, 'code', open_code, 'source', open_source);
          cls := 'NEW'; eff_partner := open_partner; ctype := 'new';
        else
          cls := 'UNATTRIBUTED';
          if o.referred_partner_id is not null then flg := array_append(flg, 'no_referral_attached'); end if;
        end if;
      end if;
      ever_counting := true;
    elsif o.status in ('paid', 'fulfilled') then
      cls := 'EXCLUDED';                                       -- paid but nothing qualifies
      eff_partner := case when open_partner is not null and o.paid_on < open_end then open_partner end;
    else
      -- Not (or no longer) paid: no classification, no commission. Show the
      -- ambassador it would belong to, for the owner's context only.
      eff_partner := coalesce(
        case when open_partner is not null and (o.paid_on is null or o.paid_on < open_end) then open_partner end,
        case when not ever_counting and not c.attribution_locked then o.referred_partner_id end,
        case when c.attribution_locked then c.attribution_override_partner_id end);
      if not ever_counting and pend_partner is null and o.status in ('draft', 'awaiting_payment') then
        pend_partner := case when c.attribution_locked then c.attribution_override_partner_id
                             else o.referred_partner_id end;
        pend_code := o.referral_code;
        pend_source := case when c.attribution_locked then 'correction' else coalesce(o.referral_source, 'manual') end;
      end if;
    end if;

    update nsp_orders set partner_id = eff_partner, classification = cls, commission_type = ctype,
      commission_bps = case when ctype = 'none' then 0 else commission_bps end,
      commission_cents = case when ctype = 'none' then 0 else commission_cents end,
      flags = (select coalesce(array_agg(distinct f), '{}') from unnest(flg) f),
      updated_at = case when partner_id is distinct from eff_partner or classification is distinct from cls
                        then now() else updated_at end
    where id = o.id;
  end loop;

  -- Sync attribution rows (never deleted; superseded rows are closed).
  for p in select * from jsonb_array_elements(periods) loop
    rid := null;
    select id into rid from nsp_customer_attributions
      where customer_id = p_customer and partner_id = (p ->> 'partner_id')::uuid
        and status in ('pending', 'active', 'expired')
        and (first_order_id = (p ->> 'first_order_id')::uuid or first_order_id is null)
        and not (id = any (matched))
      order by (first_order_id is null), created_at limit 1;
    if rid is null then
      insert into nsp_customer_attributions (customer_id, partner_id, code_used, source, first_order_id,
        first_purchase_on, residual_starts_on, residual_expires_on, status)
      values (p_customer, (p ->> 'partner_id')::uuid, p ->> 'code', p ->> 'source', (p ->> 'first_order_id')::uuid,
        (p ->> 'start')::date, (p ->> 'start')::date, (p ->> 'end')::date,
        case when (p ->> 'end')::date <= today then 'expired' else 'active' end)
      returning id into rid;
    else
      update nsp_customer_attributions set first_order_id = (p ->> 'first_order_id')::uuid,
        first_purchase_on = (p ->> 'start')::date, residual_starts_on = (p ->> 'start')::date,
        residual_expires_on = (p ->> 'end')::date,
        code_used = coalesce(code_used, p ->> 'code'),
        status = case when (p ->> 'end')::date <= today then 'expired' else 'active' end, updated_at = now()
      where id = rid;
    end if;
    matched := array_append(matched, rid);
  end loop;

  if pend_partner is not null and jsonb_array_length(periods) = 0 then
    rid := null;
    select id into rid from nsp_customer_attributions
      where customer_id = p_customer and partner_id = pend_partner and status = 'pending' limit 1;
    if rid is null then
      insert into nsp_customer_attributions (customer_id, partner_id, code_used, source, status)
      values (p_customer, pend_partner, pend_code, pend_source, 'pending') returning id into rid;
    end if;
    matched := array_append(matched, rid);
  end if;

  update nsp_customer_attributions
    set status = case when c.attribution_locked then 'corrected' else 'ended' end,
        ended_reason = coalesce(ended_reason, 'Superseded when sales were recalculated'), updated_at = now()
  where customer_id = p_customer and status in ('pending', 'active', 'expired') and not (id = any (matched));

  -- Refresh statements for every ambassador/month touched before or after.
  select keys || coalesce(array_agg(distinct partner_id::text || '|' || nsp_month(paid_on)::text), '{}') into keys
  from nsp_orders where customer_id = p_customer and partner_id is not null and paid_on is not null;
  foreach k in array coalesce((select array_agg(distinct x) from unnest(keys) x), '{}'::text[]) loop
    perform nsp_recompute_statement(split_part(k, '|', 1)::uuid, split_part(k, '|', 2)::date);
  end loop;
end $$;

-- Recompute every open (pending/held) statement from current settings, e.g.
-- after the owner changes tiers. Approved and paid months keep their rates.
create or replace function public.nsp_recompute_open_statements() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select partner_id, month from nsp_commission_statements where status in ('pending', 'held') loop
    perform nsp_recompute_statement(r.partner_id, r.month);
  end loop;
end $$;

do $$ declare f record; begin
  for f in select oid::regprocedure as sig from pg_proc
    where pronamespace = 'public'::regnamespace and proname like 'nsp_%'
      and proname in ('nsp_norm_email', 'nsp_norm_phone', 'nsp_random_code', 'nsp_short_id', 'nsp_is_owner',
        'nsp_cfg', 'nsp_today', 'nsp_log', 'nsp_month', 'nsp_tier', 'nsp_is_self', 'nsp_expire_attributions',
        'nsp_recompute_statement', 'nsp_recompute_customer', 'nsp_recompute_open_statements', 'nsp_audit_append_only')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
-- Pure helpers used inside generated columns / policies must stay callable.
grant execute on function public.nsp_norm_email(text), public.nsp_norm_phone(text), public.nsp_month(date)
  to anon, authenticated;
grant execute on function public.nsp_is_owner() to authenticated;
