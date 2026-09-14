-- Personalized dashboards.
--
-- Extends the two dashboard payloads with the facts the personalized headers
-- need: who is signed in, the oldest request still waiting, an owner
-- scoreboard (best month, sales streak, days since the last sale), named
-- actors on the activity feed, and — for ambassadors — a "since you were last
-- here" block, unacknowledged milestones and their personal-best month.

create or replace function nsp_owner_overview()
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare
  today date; m date; result jsonb;
  v_last_month date; v_last_month_cents bigint; v_this_month_cents bigint;
  v_best_month date; v_best_month_cents bigint; v_last_sale date; v_streak int := 0; v_d date;
begin
  perform nsp_require_owner();
  perform nsp_expire_attributions();
  today := nsp_today(); m := nsp_month(today);
  v_last_month := (m - interval '1 month')::date;

  select coalesce(sum(product_paid_cents - refunded_cents), 0) into v_this_month_cents
    from nsp_orders where status in ('paid', 'fulfilled') and paid_on >= m;
  select coalesce(sum(product_paid_cents - refunded_cents), 0) into v_last_month_cents
    from nsp_orders where status in ('paid', 'fulfilled') and paid_on >= v_last_month and paid_on < m;
  select nsp_month(paid_on), coalesce(sum(product_paid_cents - refunded_cents), 0)
    into v_best_month, v_best_month_cents
    from nsp_orders where status in ('paid', 'fulfilled') and paid_on is not null and paid_on < m
    group by 1 order by 2 desc limit 1;
  select max(paid_on) into v_last_sale from nsp_orders where status in ('paid', 'fulfilled');

  -- Consecutive days with at least one sale, ending today (or yesterday, so a
  -- streak isn't reported as broken before the day has had a chance to start).
  v_d := today;
  if not exists (select 1 from nsp_orders where status in ('paid', 'fulfilled') and paid_on = v_d) then
    v_d := today - 1;
  end if;
  while exists (select 1 from nsp_orders where status in ('paid', 'fulfilled') and paid_on = v_d) loop
    v_streak := v_streak + 1;
    v_d := v_d - 1;
  end loop;

  select jsonb_build_object(
    'month', m,
    'today', today,
    'me', (select jsonb_build_object('first_name', r.first_name, 'last_name', r.last_name, 'accent', r.accent)
             from nsp_user_roles r where r.user_id = auth.uid() and r.role in ('owner', 'admin') limit 1),
    'sales_count', (select count(*) from nsp_orders where status in ('paid', 'fulfilled') and paid_on >= m),
    'sales_cents', v_this_month_cents,
    'ambassador_revenue_cents', (select coalesce(sum(qualified_cents), 0) from nsp_commission_statements where month = m),
    'commission_this_month_cents', (select coalesce(sum(final_cents), 0) from nsp_commission_statements
                                    where month = m and status <> 'cancelled'),
    'commission_owed_cents', (select coalesce(sum(final_cents - paid_cents), 0) from nsp_commission_statements
                              where status in ('pending', 'approved', 'held')),
    'unpaid_approved_cents', (select coalesce(sum(final_cents - paid_cents), 0) from nsp_commission_statements
                              where status = 'approved'),
    'active_ambassadors', (select count(*) from nsp_partners where status = 'active'),
    'pending_applications', (select count(*) from nsp_requests where kind = 'application' and status in ('new', 'reviewed')),
    'pending_inquiries', (select count(*) from nsp_requests where kind <> 'application' and status = 'new'),
    'order_requests', (select count(*) from nsp_requests where kind = 'order' and status in ('new', 'reviewed')),
    'new_customers', (select count(*) from (select customer_id from nsp_orders where status in ('paid', 'fulfilled')
                      group by customer_id having min(paid_on) >= m) x),
    'returning_customers', (select count(distinct o.customer_id) from nsp_orders o where o.status in ('paid', 'fulfilled')
                            and o.paid_on >= m and exists (select 1 from nsp_orders e where e.customer_id = o.customer_id
                            and e.status in ('paid', 'fulfilled') and e.paid_on < m)),
    'top_ambassador', (select jsonb_build_object('name', nsp_partner_name(partner_id), 'qualified_cents', qualified_cents,
                       'tier_name', tier_name) from nsp_commission_statements where month = m and qualified_cents > 0
                       order by qualified_cents desc limit 1),
    'scoreboard', jsonb_build_object(
      'this_month_cents', v_this_month_cents,
      'last_month_cents', v_last_month_cents,
      'best_month', v_best_month,
      'best_month_cents', coalesce(v_best_month_cents, 0),
      'record_month', v_best_month_cents is not null and v_this_month_cents > v_best_month_cents,
      'last_sale_on', v_last_sale,
      'days_since_last_sale', case when v_last_sale is null then null else today - v_last_sale end,
      'streak_days', v_streak),
    'oldest_open_request', (select jsonb_build_object('id', id, 'kind', kind, 'created_at', created_at,
        'name', coalesce(nullif(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''), name, email))
        from nsp_requests where status in ('new', 'reviewed') order by created_at asc limit 1),
    'flags', jsonb_build_object(
      'self_purchase', (select count(*) from nsp_orders where 'self_purchase' = any (flags) and paid_on >= m - interval '90 days'),
      'disputed', (select count(*) from nsp_orders where status = 'disputed'),
      'duplicates', (select count(*) from nsp_customers where duplicate_flag and merged_into is null),
      'awaiting_payment', (select count(*) from nsp_orders where status = 'awaiting_payment')),
    'recent_sales', coalesce((select jsonb_agg(x) from (select jsonb_build_object('id', o.id, 'public_id', o.public_id,
        'paid_on', o.paid_on, 'order_date', o.order_date, 'status', o.status, 'classification', o.classification,
        'qualified_cents', o.qualified_cents - o.refunded_cents, 'partner_name', nsp_partner_name(o.partner_id),
        'customer_name', c.first_name || ' ' || coalesce(c.last_name, '')) x
        from nsp_orders o join nsp_customers c on c.id = o.customer_id order by o.created_at desc limit 8) y), '[]'),
    'recent_activity', coalesce((select jsonb_agg(x) from (select jsonb_build_object('action', a.action, 'at', a.created_at,
        'entity', a.entity, 'reason', a.reason, 'actor_name', nsp_actor_name(a.actor),
        'is_me', a.actor is not null and a.actor = auth.uid()) x
        from nsp_audit a order by a.created_at desc limit 8) y), '[]')
  ) into result;
  return result;
end $fn$;


create or replace function nsp_ambassador_dashboard(p_month date default null::date)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare
  me nsp_partners; cfg nsp_settings := nsp_cfg(); m date; s nsp_commission_statements;
  tiers jsonb; t record; visitors int; clicks int; result jsonb;
  v_since timestamptz; v_milestones jsonb;
begin
  select * into me from nsp_partners where user_id = auth.uid();
  if auth.uid() is null or me.id is null or me.status = 'archived' then
    raise exception 'Approved ambassador access required';
  end if;
  perform nsp_expire_attributions();
  update nsp_partners set last_activity_at = now() where id = me.id;
  v_since := nsp_touch_partner_session(me.id);
  v_milestones := nsp_partner_milestones_refresh(me.id);
  m := nsp_month(coalesce(p_month, nsp_today()));
  select * into s from nsp_commission_statements where partner_id = me.id and month = m;
  tiers := coalesce(s.rates_snapshot -> 'tiers', cfg.tiers);
  select * into t from nsp_tier(tiers, coalesce(s.qualified_cents, 0));
  select count(*), count(distinct coalesce(visitor_id, ip_hash)) into clicks, visitors from nsp_referral_clicks
  where partner_id = me.id and (created_at at time zone cfg.timezone)::date >= m
    and (created_at at time zone cfg.timezone)::date < (m + interval '1 month')::date;

  select jsonb_build_object(
    'profile', jsonb_build_object('first_name', coalesce(me.first_name, me.name), 'last_name', me.last_name,
      'public_id', me.public_id, 'code', me.code, 'referral_path', '/r/' || me.code, 'status', me.status,
      'start_date', me.start_date),
    'month', m,
    'is_current_month', m = nsp_month(nsp_today()),
    'tiers', (select jsonb_agg(jsonb_build_object('name', e ->> 'name', 'min_cents', (e ->> 'min_cents')::bigint,
                'bps', (e ->> 'bps')::int)) from jsonb_array_elements(tiers) e),
    'residual_bps', coalesce(s.residual_bps, cfg.residual_bps),
    'residual_months', cfg.residual_months,
    'rank', jsonb_build_object('name', t.name, 'bps', t.bps, 'min_cents', t.min_cents, 'next_name', t.next_name,
      'next_min_cents', t.next_min_cents,
      'to_next_cents', case when t.next_min_cents is null then null else t.next_min_cents - coalesce(s.qualified_cents, 0) end),
    'qualified_cents', coalesce(s.qualified_cents, 0),
    'new_revenue_cents', coalesce(s.new_revenue_cents, 0),
    'residual_revenue_cents', coalesce(s.residual_revenue_cents, 0),
    'new_commission_cents', coalesce(s.new_commission_cents, 0),
    'residual_commission_cents', coalesce(s.residual_commission_cents, 0),
    'adjustment_cents', coalesce(s.adjustment_cents, 0),
    'total_commission_cents', coalesce(s.final_cents, 0),
    'statement_status', coalesce(s.status, 'pending'),
    'new_customers', coalesce(s.new_customers, 0),
    'returning_customers', coalesce(s.returning_customers, 0),
    'clicks', clicks, 'visitors', visitors,
    -- What happened while they were away. Null `since` means a first sign-in.
    'last_visit', jsonb_build_object(
      'since', v_since,
      'clicks', (select count(*) from nsp_referral_clicks
                  where partner_id = me.id and created_at >= v_since),
      'visitors', (select count(distinct coalesce(visitor_id, ip_hash)) from nsp_referral_clicks
                  where partner_id = me.id and created_at >= v_since),
      'orders', (select count(*) from nsp_orders where partner_id = me.id and created_at >= v_since
                  and status in ('paid', 'fulfilled') and classification in ('NEW', 'RESIDUAL')),
      'commission_cents', (select coalesce(sum(commission_cents), 0) from nsp_orders
                  where partner_id = me.id and created_at >= v_since
                  and status in ('paid', 'fulfilled') and classification in ('NEW', 'RESIDUAL')),
      'new_customers', (select count(*) from nsp_customer_attributions
                  where partner_id = me.id and created_at >= v_since),
      'inquiries', (select count(*) from nsp_requests where partner_id = me.id and created_at >= v_since)),
    'milestones', v_milestones,
    'personal_best', (select jsonb_build_object('month', x.month, 'qualified_cents', x.qualified_cents,
        'final_cents', x.final_cents, 'tier_name', x.tier_name)
        from nsp_commission_statements x where x.partner_id = me.id and x.qualified_cents > 0
        order by x.qualified_cents desc limit 1),
    'inquiries', (select count(*) from nsp_requests r where r.partner_id = me.id
                  and nsp_tz_month_start(r.created_at) = m),
    'inquiry_conversions', (select count(*) from nsp_requests r where r.partner_id = me.id and r.status = 'converted'
                  and nsp_tz_month_start(r.created_at) = m),
    'lifetime_revenue_cents', (select coalesce(sum(o.qualified_cents - o.refunded_cents), 0) from nsp_orders o
                  where o.partner_id = me.id and o.status in ('paid', 'fulfilled') and o.classification in ('NEW', 'RESIDUAL')),
    'lifetime_commission_cents', (select coalesce(sum(x.final_cents), 0) from nsp_commission_statements x
                  where x.partner_id = me.id and x.status <> 'cancelled'),
    'paid_to_date_cents', (select coalesce(sum(amount_cents), 0) from nsp_payouts where partner_id = me.id),
    'customers', coalesce((select jsonb_agg(jsonb_build_object(
        'label', nsp_person_label(c.first_name, c.last_name), 'since', a.first_purchase_on, 'status', a.status,
        'residual_expires_on', a.residual_expires_on,
        'orders', (select count(*) from nsp_orders o where o.customer_id = c.id and o.partner_id = me.id
                   and o.status in ('paid', 'fulfilled') and o.classification in ('NEW', 'RESIDUAL')),
        'revenue_cents', (select coalesce(sum(o.qualified_cents - o.refunded_cents), 0) from nsp_orders o
                   where o.customer_id = c.id and o.partner_id = me.id and o.status in ('paid', 'fulfilled')
                   and o.classification in ('NEW', 'RESIDUAL')),
        'last_purchase_on', (select max(o.paid_on) from nsp_orders o where o.customer_id = c.id and o.partner_id = me.id
                   and o.status in ('paid', 'fulfilled') and o.classification in ('NEW', 'RESIDUAL')))
        order by a.first_purchase_on desc nulls last)
      from nsp_customer_attributions a join nsp_customers c on c.id = a.customer_id
      where a.partner_id = me.id and a.status in ('active', 'expired')), '[]'),
    'recent_sales', coalesce((select jsonb_agg(x) from (select jsonb_build_object(
        'date', o.paid_on, 'customer', nsp_person_label(c.first_name, c.last_name),
        'type', o.classification, 'qualified_cents', o.qualified_cents - o.refunded_cents,
        'rate_bps', o.commission_bps, 'commission_cents', o.commission_cents, 'status', o.status) x
      from nsp_orders o join nsp_customers c on c.id = o.customer_id
      where o.partner_id = me.id and o.paid_on is not null
        and o.status in ('paid', 'fulfilled', 'refunded', 'cancelled', 'disputed')
      order by o.paid_on desc, o.created_at desc limit 30) y), '[]'),
    'payouts', coalesce((select jsonb_agg(jsonb_build_object('paid_on', x.paid_on, 'amount_cents', x.amount_cents,
        'month', st.month, 'reference', x.reference) order by x.paid_on desc)
      from nsp_payouts x join nsp_commission_statements st on st.id = x.statement_id where x.partner_id = me.id), '[]'),
    'statements', coalesce((select jsonb_agg(jsonb_build_object('month', x.month, 'tier_name', x.tier_name,
        'qualified_cents', x.qualified_cents, 'final_cents', x.final_cents, 'paid_cents', x.paid_cents, 'status', x.status)
        order by x.month desc) from (select * from nsp_commission_statements where partner_id = me.id
        order by month desc limit 12) x), '[]'),
    'leaderboard', case when cfg.leaderboard_enabled then coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('position', row_number() over (order by st.qualified_cents desc),
          'label', nsp_person_label(p.first_name, p.last_name), 'tier_name', st.tier_name,
          'qualified_cents', st.qualified_cents, 'is_me', p.id = me.id) x
        from nsp_commission_statements st join nsp_partners p on p.id = st.partner_id
        where st.month = m and st.qualified_cents > 0 and p.status = 'active'
        order by st.qualified_cents desc limit 10) y), '[]') end
  ) into result;
  return result;
end $fn$;
