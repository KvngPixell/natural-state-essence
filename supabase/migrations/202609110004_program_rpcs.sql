-- Natural State Ambassador Program — server functions (RPCs).
-- Every owner function starts with nsp_require_owner(); every ambassador
-- function resolves the caller's own ambassador row from auth.uid(). No
-- function trusts an ambassador id, rate, classification or amount computed
-- by the browser.

create or replace function public.nsp_require_owner() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not nsp_is_admin() then raise exception 'Owner access required'; end if;
end $$;

create or replace function public.nsp_person_label(p_first text, p_last text) returns text
language sql immutable as $$
  select trim(coalesce(p_first, '') || ' ' || coalesce(left(nullif(trim(p_last), ''), 1) || '.', ''))
$$;

create or replace function public.nsp_partner_name(p_id uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''), name)
  from nsp_partners where id = p_id
$$;

create or replace function public.nsp_tz_month_start(p_ts timestamptz) returns date
language sql stable security definer set search_path = public as $$
  select nsp_month((p_ts at time zone (select timezone from nsp_settings where id))::date)
$$;

---------------------------------------------------------------------------
-- Who am I? Used only to route the UI; every data function re-checks.
---------------------------------------------------------------------------
create or replace function public.nsp_me() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'role', case
      when exists (select 1 from nsp_user_roles where user_id = auth.uid() and role = 'owner') then 'owner'
      when exists (select 1 from nsp_user_roles where user_id = auth.uid() and role = 'admin') then 'admin'
      when exists (select 1 from nsp_partners where user_id = auth.uid() and status not in ('archived')) then 'ambassador'
      else null end,
    'ambassador', (select jsonb_build_object('id', id, 'public_id', public_id, 'first_name', coalesce(first_name, name),
                     'status', status) from nsp_partners where user_id = auth.uid()))
  where auth.uid() is not null
$$;

---------------------------------------------------------------------------
-- Customers
---------------------------------------------------------------------------
create or replace function public.nsp_customer_json(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', c.id, 'public_id', c.public_id, 'first_name', c.first_name, 'last_name', c.last_name,
    'email', c.email, 'phone', c.phone, 'notes', c.notes, 'created_at', c.created_at,
    'duplicate_flag', c.duplicate_flag, 'merged_into', c.merged_into,
    'attribution_locked', c.attribution_locked,
    'orders', (select count(*) from nsp_orders o where o.customer_id = c.id and o.status in ('paid', 'fulfilled')),
    'lifetime_cents', (select coalesce(sum(o.qualified_cents - o.refunded_cents), 0) from nsp_orders o
                       where o.customer_id = c.id and o.status in ('paid', 'fulfilled')),
    'first_purchase_on', (select min(paid_on) from nsp_orders o where o.customer_id = c.id and o.status in ('paid', 'fulfilled')),
    'last_purchase_on', (select max(paid_on) from nsp_orders o where o.customer_id = c.id and o.status in ('paid', 'fulfilled')),
    'attribution', (select jsonb_build_object('id', a.id, 'partner_id', a.partner_id,
                      'partner_name', nsp_partner_name(a.partner_id), 'status', a.status, 'source', a.source,
                      'code_used', a.code_used, 'first_purchase_on', a.first_purchase_on,
                      'residual_starts_on', a.residual_starts_on, 'residual_expires_on', a.residual_expires_on)
                    from nsp_customer_attributions a
                    where a.customer_id = c.id and a.status in ('pending', 'active', 'expired')
                    order by (a.status = 'active') desc, a.residual_starts_on desc nulls last, a.created_at desc limit 1))
  from nsp_customers c where c.id = p_id
$$;

create or replace function public.nsp_find_customers(p_q text, p_limit int default 25) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare q text := trim(coalesce(p_q, '')); digits text := regexp_replace(q, '\D', '', 'g'); result jsonb;
begin
  perform nsp_require_owner();
  select coalesce(jsonb_agg(nsp_customer_json(id) order by updated_at desc), '[]') into result from (
    select id, updated_at from nsp_customers c
    where c.merged_into is null and (
      q = ''
      or lower(c.public_id) = lower(q)
      or c.email_norm like '%' || lower(q) || '%'
      or (length(digits) >= 4 and c.phone_norm like '%' || digits || '%')
      or (c.first_name || ' ' || coalesce(c.last_name, '')) ilike '%' || q || '%')
    order by c.updated_at desc limit least(greatest(p_limit, 1), 200)) x;
  return result;
end $$;

-- Match order: exact normalized email (authoritative), then phone and name
-- as possible duplicates only. Never merges anything.
create or replace function public.nsp_match_customer(p_email text, p_phone text, p_first text default null,
  p_last text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e text := nsp_norm_email(p_email); ph text := nsp_norm_phone(p_phone); v_exact uuid; result jsonb;
begin
  perform nsp_require_owner();
  if e is not null then
    select id into v_exact from nsp_customers where email_norm = e and merged_into is null;
  end if;
  if v_exact is null and e is null and ph is not null then
    -- No email given: a unique phone match is treated as the customer.
    select id into v_exact from nsp_customers where phone_norm = ph and merged_into is null
      and (select count(*) from nsp_customers where phone_norm = ph and merged_into is null) = 1;
  end if;
  select jsonb_build_object(
    'exact', case when v_exact is not null then nsp_customer_json(v_exact) end,
    'possible', coalesce((select jsonb_agg(nsp_customer_json(id)) from (
       select id from nsp_customers c where c.merged_into is null and c.id is distinct from v_exact and (
         (ph is not null and c.phone_norm = ph)
         or (p_first is not null and p_last is not null and length(trim(p_last)) > 0
             and lower(c.first_name) = lower(trim(p_first)) and lower(c.last_name) = lower(trim(p_last))))
       limit 10) x), '[]'::jsonb)) into result;
  return result;
end $$;

create or replace function public.nsp_customer_detail(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c nsp_customers; result jsonb;
begin
  perform nsp_require_owner();
  perform nsp_expire_attributions();
  select * into c from nsp_customers where id = p_id;
  if not found then raise exception 'Customer not found'; end if;
  select nsp_customer_json(c.id) || jsonb_build_object(
    'orders', coalesce((select jsonb_agg(jsonb_build_object(
        'id', o.id, 'public_id', o.public_id, 'order_date', o.order_date, 'paid_on', o.paid_on, 'status', o.status,
        'fulfillment_status', o.fulfillment_status, 'payment_method', o.payment_method,
        'qualified_cents', o.qualified_cents, 'refunded_cents', o.refunded_cents, 'product_paid_cents', o.product_paid_cents,
        'classification', o.classification, 'partner_id', o.partner_id, 'partner_name', nsp_partner_name(o.partner_id),
        'commission_bps', o.commission_bps, 'commission_cents', o.commission_cents, 'flags', o.flags,
        'reference', o.reference,
        'items', (select coalesce(jsonb_agg(jsonb_build_object('name', i.product_name, 'quantity', i.quantity,
                   'line_cents', i.line_cents, 'eligible', i.eligible)), '[]') from nsp_order_items i where i.order_id = o.id))
        order by o.paid_on nulls last, o.created_at) from nsp_orders o where o.customer_id = c.id), '[]'),
    'attributions', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'partner_name', nsp_partner_name(a.partner_id),
        'status', a.status, 'source', a.source, 'code_used', a.code_used, 'first_purchase_on', a.first_purchase_on,
        'residual_expires_on', a.residual_expires_on, 'ended_reason', a.ended_reason, 'created_at', a.created_at)
        order by a.created_at) from nsp_customer_attributions a where a.customer_id = c.id), '[]'),
    'possible_duplicates', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'public_id', d.public_id,
        'name', d.first_name || ' ' || coalesce(d.last_name, ''), 'email', d.email, 'phone', d.phone))
        from nsp_customers d where d.id <> c.id and d.merged_into is null and (
          (c.phone_norm is not null and d.phone_norm = c.phone_norm)
          or (c.last_name is not null and lower(d.first_name) = lower(c.first_name) and lower(d.last_name) = lower(c.last_name)))), '[]'),
    'history', coalesce((select jsonb_agg(jsonb_build_object('action', a.action, 'at', a.created_at, 'reason', a.reason,
        'before', a.before, 'after', a.after) order by a.created_at desc)
        from nsp_audit a where a.entity = 'customer' and a.entity_id = c.id::text), '[]'),
    'inquiries', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'kind', r.kind, 'created_at', r.created_at,
        'status', r.status, 'product', r.product) order by r.created_at desc)
        from nsp_requests r where r.customer_id = c.id or (c.email_norm is not null and nsp_norm_email(r.email) = c.email_norm)), '[]')
  ) into result;
  return result;
end $$;

create or replace function public.nsp_save_customer(p jsonb, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cid uuid := nullif(p ->> 'id', '')::uuid; before nsp_customers; after nsp_customers;
begin
  perform nsp_require_owner();
  if coalesce(trim(p ->> 'first_name'), '') = '' then raise exception 'First name is required'; end if;
  if nsp_norm_email(p ->> 'email') is null and nsp_norm_phone(p ->> 'phone') is null then
    raise exception 'An email or phone number is required';
  end if;
  if nsp_norm_email(p ->> 'email') is not null and nsp_norm_email(p ->> 'email') !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'Email address looks invalid';
  end if;
  if exists (select 1 from nsp_customers where email_norm = nsp_norm_email(p ->> 'email') and merged_into is null
             and id is distinct from cid) then
    raise exception 'Another customer already uses this email. Open that customer, or merge the two records.';
  end if;
  if cid is null then
    insert into nsp_customers (first_name, last_name, email, phone, notes)
    values (trim(p ->> 'first_name'), nullif(trim(p ->> 'last_name'), ''), nullif(trim(p ->> 'email'), ''),
            nullif(trim(p ->> 'phone'), ''), nullif(trim(p ->> 'notes'), ''))
    returning * into after;
    update nsp_customers set duplicate_flag = true where id = after.id and exists (
      select 1 from nsp_customers d where d.id <> after.id and d.merged_into is null and d.phone_norm = after.phone_norm);
    perform nsp_log('customer_created', 'customer', after.id::text, null, to_jsonb(after), p_reason);
  else
    select * into before from nsp_customers where id = cid and merged_into is null for update;
    if not found then raise exception 'Customer not found'; end if;
    update nsp_customers set first_name = trim(p ->> 'first_name'), last_name = nullif(trim(p ->> 'last_name'), ''),
      email = nullif(trim(p ->> 'email'), ''), phone = nullif(trim(p ->> 'phone'), ''),
      notes = case when p ? 'notes' then nullif(trim(p ->> 'notes'), '') else notes end, updated_at = now()
    where id = cid returning * into after;
    perform nsp_log('customer_updated', 'customer', cid::text,
      jsonb_build_object('first_name', before.first_name, 'last_name', before.last_name, 'email', before.email,
        'phone', before.phone, 'notes', before.notes),
      jsonb_build_object('first_name', after.first_name, 'last_name', after.last_name, 'email', after.email,
        'phone', after.phone, 'notes', after.notes), p_reason);
    perform nsp_recompute_customer(cid);            -- contact change can change self-purchase detection
  end if;
  return nsp_customer_json(after.id);
end $$;

create or replace function public.nsp_correct_attribution(p_customer uuid, p_partner uuid, p_lock boolean,
  p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare before jsonb;
begin
  perform nsp_require_owner();
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'A reason is required to change attribution'; end if;
  if p_partner is not null and not exists (select 1 from nsp_partners where id = p_partner) then
    raise exception 'Ambassador not found';
  end if;
  before := nsp_customer_json(p_customer) -> 'attribution';
  update nsp_customers set attribution_locked = p_lock,
    attribution_override_partner_id = case when p_lock then p_partner end, updated_at = now()
  where id = p_customer and merged_into is null;
  if not found then raise exception 'Customer not found'; end if;
  perform nsp_recompute_customer(p_customer);
  perform nsp_log('attribution_corrected', 'customer', p_customer::text, before,
    nsp_customer_json(p_customer) -> 'attribution', p_reason);
  update nsp_orders set flags = array_append(array_remove(flags, 'manual_attribution'), 'manual_attribution')
  where customer_id = p_customer and p_lock;
  return nsp_customer_json(p_customer);
end $$;

create or replace function public.nsp_flag_duplicate(p_customer uuid, p_flag boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform nsp_require_owner();
  update nsp_customers set duplicate_flag = p_flag, updated_at = now() where id = p_customer;
  perform nsp_log(case when p_flag then 'duplicate_flagged' else 'duplicate_cleared' end, 'customer',
    p_customer::text, null, null, p_reason);
end $$;

create or replace function public.nsp_merge_customers(p_keep uuid, p_merge uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k nsp_customers; m nsp_customers;
begin
  perform nsp_require_owner();
  if p_keep = p_merge then raise exception 'Choose two different customers'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'A reason is required to merge customers'; end if;
  select * into k from nsp_customers where id = p_keep and merged_into is null for update;
  select * into m from nsp_customers where id = p_merge and merged_into is null for update;
  if k.id is null or m.id is null then raise exception 'Both customers must exist and not already be merged'; end if;
  update nsp_customers set merged_into = k.id, duplicate_flag = false, updated_at = now() where id = m.id;
  update nsp_customers set email = coalesce(k.email, m.email), phone = coalesce(k.phone, m.phone),
    last_name = coalesce(k.last_name, m.last_name),
    notes = nullif(concat_ws(E'\n', k.notes, m.notes), ''), duplicate_flag = false, updated_at = now()
  where id = k.id;
  update nsp_orders set customer_id = k.id where customer_id = m.id;
  update nsp_requests set customer_id = k.id where customer_id = m.id;
  update nsp_customer_attributions set status = 'corrected', ended_reason = 'Customer merged into ' || k.public_id,
    updated_at = now() where customer_id = m.id and status in ('pending', 'active', 'expired');
  perform nsp_recompute_customer(k.id);
  perform nsp_log('customers_merged', 'customer', k.id::text, jsonb_build_object('merged', m.public_id,
    'merged_email', m.email, 'merged_phone', m.phone), jsonb_build_object('kept', k.public_id), p_reason);
  perform nsp_log('customers_merged', 'customer', m.id::text, null, jsonb_build_object('merged_into', k.public_id), p_reason);
  return nsp_customer_json(k.id);
end $$;

---------------------------------------------------------------------------
-- Sales
---------------------------------------------------------------------------
create or replace function public.nsp_order_json(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(o) || jsonb_build_object(
    'partner_name', nsp_partner_name(o.partner_id),
    'referred_partner_name', nsp_partner_name(o.referred_partner_id),
    'customer', nsp_customer_json(o.customer_id),
    'items', (select coalesce(jsonb_agg(to_jsonb(i) - 'order_id'), '[]') from nsp_order_items i where i.order_id = o.id),
    'statement', (select jsonb_build_object('month', s.month, 'qualified_cents', s.qualified_cents,
        'new_revenue_cents', s.new_revenue_cents, 'residual_revenue_cents', s.residual_revenue_cents,
        'tier_name', s.tier_name, 'tier_bps', s.tier_bps, 'new_commission_cents', s.new_commission_cents,
        'residual_commission_cents', s.residual_commission_cents, 'final_cents', s.final_cents)
      from nsp_commission_statements s where s.partner_id = o.partner_id and s.month = nsp_month(o.paid_on)))
  from nsp_orders o where o.id = p_id
$$;

-- Replace an order's items; returns excluded (ineligible) revenue in cents.
create or replace function public.nsp_write_items(p_order uuid, p_items jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare cfg nsp_settings := nsp_cfg(); it jsonb; elig boolean; excl integer := 0; line integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'Add between 1 and 30 products';
  end if;
  delete from nsp_order_items where order_id = p_order;
  for it in select * from jsonb_array_elements(p_items) loop
    if coalesce(trim(it ->> 'product_name'), '') = '' then raise exception 'Each product needs a name'; end if;
    if coalesce((it ->> 'quantity')::int, 0) not between 1 and 1000 then raise exception 'Quantity must be 1 to 1000'; end if;
    line := nullif(it ->> 'line_cents', '')::int;
    elig := not coalesce((it ->> 'giveaway')::boolean, false)
            and not (coalesce(it ->> 'product_slug', '') = any (cfg.excluded_products));
    if not elig and line is null and not coalesce((it ->> 'giveaway')::boolean, false) then
      raise exception '% is excluded from ambassador revenue. Enter its amount so it can be removed.', it ->> 'product_name';
    end if;
    if not elig then excl := excl + coalesce(line, 0); end if;
    insert into nsp_order_items (order_id, product_slug, product_name, quantity, line_cents, eligible)
    values (p_order, nullif(it ->> 'product_slug', ''), left(trim(it ->> 'product_name'), 150), (it ->> 'quantity')::int,
            line, elig);
  end loop;
  return excl;
end $$;

create or replace function public.nsp_record_sale_core(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  cid uuid := nullif(p ->> 'customer_id', '')::uuid;
  pc jsonb := coalesce(p -> 'customer', '{}'::jsonb);
  req nsp_requests;
  st text := coalesce(p ->> 'status', 'paid');
  paid date := nullif(p ->> 'paid_on', '')::date;
  referred uuid := nullif(p ->> 'ambassador_id', '')::uuid;
  ref_code text; ref_source text;
  v_order uuid; excl integer; is_new_customer boolean := false; c nsp_customers;
begin
  perform nsp_require_owner();
  if st not in ('draft', 'awaiting_payment', 'paid', 'fulfilled', 'cancelled', 'refunded', 'disputed') then
    raise exception 'Unknown sale status';
  end if;
  if st in ('paid', 'fulfilled', 'refunded', 'disputed') and paid is null then
    raise exception 'Enter the date payment was confirmed';
  end if;
  if paid > nsp_today() then raise exception 'Payment date cannot be in the future'; end if;
  if coalesce((p ->> 'product_paid_cents')::bigint, -1) not between 0 and 100000000 then
    raise exception 'Enter the amount paid for products';
  end if;

  if nullif(p ->> 'request_id', '') is not null then
    select * into req from nsp_requests where id = (p ->> 'request_id')::uuid for update;
    if not found then raise exception 'Inquiry not found'; end if;
    if req.order_id is not null then raise exception 'This inquiry was already converted to a sale'; end if;
  end if;

  -- Customer: chosen record, else exact email match, else new.
  if cid is not null then
    select * into c from nsp_customers where id = cid;
    if c.merged_into is not null then cid := c.merged_into; end if;
    if not exists (select 1 from nsp_customers where id = cid) then raise exception 'Customer not found'; end if;
  else
    if coalesce(trim(pc ->> 'first_name'), '') = '' then raise exception 'Customer first name is required'; end if;
    if nsp_norm_email(pc ->> 'email') is null and nsp_norm_phone(pc ->> 'phone') is null then
      raise exception 'Customer email or phone is required';
    end if;
    select id into cid from nsp_customers where email_norm = nsp_norm_email(pc ->> 'email') and merged_into is null;
    if cid is null then
      insert into nsp_customers (first_name, last_name, email, phone)
      values (trim(pc ->> 'first_name'), nullif(trim(pc ->> 'last_name'), ''), nullif(trim(pc ->> 'email'), ''),
              nullif(trim(pc ->> 'phone'), ''))
      returning id into cid;
      is_new_customer := true;
      update nsp_customers set duplicate_flag = true where id = cid and exists (
        select 1 from nsp_customers d, nsp_customers me where me.id = cid and d.id <> cid and d.merged_into is null
          and d.phone_norm = me.phone_norm);
    else
      update nsp_customers set phone = coalesce(phone, nullif(trim(pc ->> 'phone'), '')),
        last_name = coalesce(last_name, nullif(trim(pc ->> 'last_name'), '')), updated_at = now()
      where id = cid;
    end if;
  end if;

  -- Referral that came with this sale. It only decides attribution for a
  -- customer without one; an existing attribution always wins.
  if referred is not null then
    if not exists (select 1 from nsp_partners where id = referred and status <> 'archived') then
      raise exception 'Ambassador not found or archived';
    end if;
    ref_source := 'manual';
    ref_code := (select code from nsp_partners where id = referred);
  elsif req.partner_id is not null then
    referred := req.partner_id; ref_code := req.referral_code; ref_source := coalesce(req.referral_source, 'inquiry');
  end if;

  if coalesce((p ->> 'attribution_override')::boolean, false) then
    if length(trim(coalesce(p ->> 'override_reason', ''))) < 3 then
      raise exception 'A reason is required to override attribution';
    end if;
    update nsp_customers set attribution_locked = true, attribution_override_partner_id = referred, updated_at = now()
    where id = cid;
    perform nsp_log('attribution_corrected', 'customer', cid::text, null,
      jsonb_build_object('partner', nsp_partner_name(referred)), p ->> 'override_reason');
  end if;

  begin
    insert into nsp_orders (customer_id, request_id, referred_partner_id, referral_code, referral_source, order_date,
      paid_on, status, fulfillment_status, fulfillment_method, payment_method, product_paid_cents, discount_cents,
      shipping_cents, manual_exclude, exclude_reason, reference, notes, created_by, flags)
    values (cid, req.id, referred, ref_code, ref_source, coalesce(nullif(p ->> 'order_date', '')::date, paid, nsp_today()),
      paid, st, coalesce(nullif(p ->> 'fulfillment_status', ''), 'unfulfilled'), nullif(p ->> 'fulfillment_method', ''),
      nullif(p ->> 'payment_method', ''), (p ->> 'product_paid_cents')::int, coalesce((p ->> 'discount_cents')::int, 0),
      coalesce((p ->> 'shipping_cents')::int, 0), coalesce((p ->> 'manual_exclude')::boolean, false),
      nullif(trim(p ->> 'exclude_reason'), ''), nullif(trim(p ->> 'reference'), ''), nullif(trim(p ->> 'notes'), ''),
      auth.uid(), case when coalesce((p ->> 'attribution_override')::boolean, false) then '{manual_attribution}'::text[]
                       else '{}'::text[] end)
    returning id into v_order;
  exception when unique_violation then
    raise exception 'Another sale already uses order reference "%"', p ->> 'reference';
  end;

  excl := nsp_write_items(v_order, coalesce(p -> 'items', '[]'::jsonb));
  if excl > (p ->> 'product_paid_cents')::int then
    raise exception 'Excluded product amounts are larger than the amount paid';
  end if;
  update nsp_orders set excluded_cents = excl where id = v_order;
  if st = 'refunded' then update nsp_orders set refunded_cents = qualified_cents where id = v_order; end if;

  if req.id is not null then
    update nsp_requests set status = 'converted', customer_id = cid, order_id = v_order, updated_at = now() where id = req.id;
  end if;

  perform nsp_recompute_customer(cid);
  return nsp_order_json(v_order) || jsonb_build_object('customer_is_new', is_new_customer);
end $$;

create or replace function public.nsp_record_sale(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  result := nsp_record_sale_core(p);
  perform nsp_log('sale_recorded', 'order', result ->> 'id', null,
    result - 'customer' - 'statement', null);
  return result;
end $$;

-- Runs the real recording path, captures the outcome, then rolls it back.
-- Lets the Record Sale screen show ambassador, NEW/RESIDUAL and commission
-- before the owner confirms.
create or replace function public.nsp_sale_preview(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare result jsonb; before jsonb;
begin
  perform nsp_require_owner();
  begin
    result := nsp_record_sale_core(p);
    raise exception 'nsp_preview_rollback';
  exception when raise_exception then
    if sqlerrm <> 'nsp_preview_rollback' then raise; end if;
  end;
  select jsonb_build_object('qualified_cents', s.qualified_cents, 'tier_name', s.tier_name, 'tier_bps', s.tier_bps,
           'final_cents', s.final_cents)
    into before from nsp_commission_statements s
  where s.partner_id = (result ->> 'partner_id')::uuid and s.month = nsp_month((result ->> 'paid_on')::date);
  return result || jsonb_build_object('before', coalesce(before, jsonb_build_object('qualified_cents', 0,
    'tier_name', (select name from nsp_tier((nsp_cfg()).tiers, 0)), 'final_cents', 0)));
end $$;

create or replace function public.nsp_update_order(p_order uuid, p jsonb, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare before nsp_orders; after nsp_orders; excl integer; st text; financial boolean;
begin
  perform nsp_require_owner();
  select * into before from nsp_orders where id = p_order for update;
  if not found then raise exception 'Sale not found'; end if;
  st := coalesce(nullif(p ->> 'status', ''), before.status);
  financial := st is distinct from before.status
    or (p ? 'paid_on' and nullif(p ->> 'paid_on', '')::date is distinct from before.paid_on)
    or (p ? 'product_paid_cents' and (p ->> 'product_paid_cents')::int is distinct from before.product_paid_cents)
    or (p ? 'manual_exclude' and (p ->> 'manual_exclude')::boolean is distinct from before.manual_exclude)
    or p ? 'items';
  if financial and before.status in ('paid', 'fulfilled', 'refunded', 'disputed')
     and length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'A reason is required to change a confirmed sale';
  end if;
  if st not in ('draft', 'awaiting_payment', 'paid', 'fulfilled', 'cancelled', 'refunded', 'disputed') then
    raise exception 'Unknown sale status';
  end if;
  if st in ('paid', 'fulfilled', 'refunded', 'disputed')
     and (case when p ? 'paid_on' then nullif(p ->> 'paid_on', '')::date else before.paid_on end) is null then
    raise exception 'Enter the date payment was confirmed';
  end if;
  if nullif(p ->> 'paid_on', '')::date > nsp_today() then raise exception 'Payment date cannot be in the future'; end if;

  begin
    update nsp_orders set
      status = st,
      paid_on = case when p ? 'paid_on' then nullif(p ->> 'paid_on', '')::date else paid_on end,
      order_date = coalesce(nullif(p ->> 'order_date', '')::date, order_date),
      fulfillment_status = coalesce(nullif(p ->> 'fulfillment_status', ''), fulfillment_status),
      fulfillment_method = case when p ? 'fulfillment_method' then nullif(p ->> 'fulfillment_method', '') else fulfillment_method end,
      payment_method = case when p ? 'payment_method' then nullif(p ->> 'payment_method', '') else payment_method end,
      product_paid_cents = coalesce((p ->> 'product_paid_cents')::int, product_paid_cents),
      discount_cents = coalesce((p ->> 'discount_cents')::int, discount_cents),
      shipping_cents = coalesce((p ->> 'shipping_cents')::int, shipping_cents),
      manual_exclude = coalesce((p ->> 'manual_exclude')::boolean, manual_exclude),
      exclude_reason = case when p ? 'exclude_reason' then nullif(trim(p ->> 'exclude_reason'), '') else exclude_reason end,
      reference = case when p ? 'reference' then nullif(trim(p ->> 'reference'), '') else reference end,
      notes = case when p ? 'notes' then nullif(trim(p ->> 'notes'), '') else notes end,
      refunded_cents = case when st = 'refunded' or before.status = 'refunded' then 0
        else least(refunded_cents, greatest(coalesce((p ->> 'product_paid_cents')::int, product_paid_cents) - excluded_cents, 0)) end,
      updated_at = now()
    where id = p_order;
  exception when unique_violation then
    raise exception 'Another sale already uses order reference "%"', p ->> 'reference';
  end;
  if p ? 'items' then
    excl := nsp_write_items(p_order, p -> 'items');
    update nsp_orders set excluded_cents = excl,
      refunded_cents = least(refunded_cents, greatest(product_paid_cents - excl, 0)) where id = p_order;
  end if;
  select * into after from nsp_orders where id = p_order;
  if after.excluded_cents > after.product_paid_cents then
    raise exception 'Excluded product amounts are larger than the amount paid';
  end if;
  if st = 'refunded' then
    update nsp_orders set refunded_cents = qualified_cents,
      flags = array_append(array_remove(flags, 'refunded'), 'refunded') where id = p_order;
  elsif st = 'disputed' then
    update nsp_orders set flags = array_append(array_remove(flags, 'disputed'), 'disputed') where id = p_order;
  end if;
  perform nsp_recompute_customer(after.customer_id);
  select * into after from nsp_orders where id = p_order;
  perform nsp_log(case when st = 'refunded' and before.status <> 'refunded' then 'sale_refunded'
                       when st <> before.status then 'sale_status_changed' else 'sale_changed' end,
    'order', p_order::text, to_jsonb(before), to_jsonb(after), p_reason);
  return nsp_order_json(p_order);
end $$;

-- Partial refund: p_total is the cumulative qualified revenue refunded.
create or replace function public.nsp_refund_order(p_order uuid, p_total integer, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare before nsp_orders; after nsp_orders;
begin
  perform nsp_require_owner();
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'A reason is required for a refund'; end if;
  select * into before from nsp_orders where id = p_order for update;
  if not found then raise exception 'Sale not found'; end if;
  if before.status not in ('paid', 'fulfilled', 'disputed', 'refunded') then
    raise exception 'Only a paid sale can be refunded';
  end if;
  if p_total < 0 or p_total > before.qualified_cents then
    raise exception 'Refund must be between $0 and the qualified amount of this sale';
  end if;
  update nsp_orders set refunded_cents = p_total,
    status = case when p_total = before.qualified_cents then 'refunded'
                  when before.status = 'refunded' then 'paid' else before.status end,
    flags = array_append(array_remove(flags, 'refunded'), 'refunded'), updated_at = now()
  where id = p_order returning * into after;
  perform nsp_recompute_customer(after.customer_id);
  perform nsp_log('sale_refunded', 'order', p_order::text,
    jsonb_build_object('status', before.status, 'refunded_cents', before.refunded_cents),
    jsonb_build_object('status', after.status, 'refunded_cents', after.refunded_cents), p_reason);
  return nsp_order_json(p_order);
end $$;

create or replace function public.nsp_owner_orders(p_from date default null, p_to date default null,
  p_status text default null, p_q text default null, p_limit int default 100) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare result jsonb; q text := trim(coalesce(p_q, ''));
begin
  perform nsp_require_owner();
  select coalesce(jsonb_agg(x order by x_date desc, x_created desc), '[]') into result from (
    select jsonb_build_object('id', o.id, 'public_id', o.public_id, 'order_date', o.order_date, 'paid_on', o.paid_on,
             'status', o.status, 'fulfillment_status', o.fulfillment_status, 'payment_method', o.payment_method,
             'product_paid_cents', o.product_paid_cents, 'qualified_cents', o.qualified_cents,
             'refunded_cents', o.refunded_cents, 'classification', o.classification,
             'commission_bps', o.commission_bps, 'commission_cents', o.commission_cents, 'flags', o.flags,
             'reference', o.reference, 'partner_name', nsp_partner_name(o.partner_id),
             'customer_id', c.id, 'customer_public_id', c.public_id,
             'customer_name', c.first_name || ' ' || coalesce(c.last_name, ''),
             'items', (select string_agg(i.quantity || ' × ' || i.product_name, ', ') from nsp_order_items i where i.order_id = o.id)
           ) as x, coalesce(o.paid_on, o.order_date) as x_date, o.created_at as x_created
    from nsp_orders o join nsp_customers c on c.id = o.customer_id
    where (p_from is null or coalesce(o.paid_on, o.order_date) >= p_from)
      and (p_to is null or coalesce(o.paid_on, o.order_date) <= p_to)
      and (p_status is null or o.status = p_status)
      and (q = '' or o.public_id ilike '%' || q || '%' or coalesce(o.reference, '') ilike '%' || q || '%'
           or (c.first_name || ' ' || coalesce(c.last_name, '')) ilike '%' || q || '%' or c.email_norm like '%' || lower(q) || '%')
    order by x_date desc, x_created desc limit least(greatest(p_limit, 1), 500)) y;
  return result;
end $$;

create or replace function public.nsp_order_detail(p_order uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform nsp_require_owner();
  return nsp_order_json(p_order) || jsonb_build_object('history', coalesce((select jsonb_agg(jsonb_build_object(
      'action', a.action, 'at', a.created_at, 'reason', a.reason) order by a.created_at desc)
    from nsp_audit a where a.entity = 'order' and a.entity_id = p_order::text), '[]'));
end $$;

---------------------------------------------------------------------------
-- Ambassadors
---------------------------------------------------------------------------
create or replace function public.nsp_new_referral_code() returns text
language plpgsql volatile security definer set search_path = public as $$
declare c text;
begin
  loop
    c := nsp_random_code(6);
    exit when not exists (select 1 from nsp_referral_codes where code = c);
  end loop;
  return c;
end $$;

create or replace function public.nsp_ambassador_json(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(p) - 'rate_bps' - 'terms' - 'hold_days' || jsonb_build_object(
    'display_name', nsp_partner_name(p.id),
    'referral_path', '/r/' || p.code,
    'has_login', p.user_id is not null)
  from nsp_partners p where p.id = p_id
$$;

create or replace function public.nsp_save_ambassador(p jsonb, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  aid uuid := nullif(p ->> 'id', '')::uuid;
  before nsp_partners; after nsp_partners;
  code_in text := upper(nullif(trim(p ->> 'code'), ''));
  st text := nullif(p ->> 'status', '');
  e text := nsp_norm_email(p ->> 'email');
begin
  perform nsp_require_owner();
  if coalesce(trim(p ->> 'first_name'), '') = '' or coalesce(trim(p ->> 'last_name'), '') = '' then
    raise exception 'First and last name are required';
  end if;
  if e is null or e !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'A valid email is required'; end if;
  if st is not null and st not in ('pending', 'active', 'suspended', 'inactive', 'archived') then
    raise exception 'Unknown status';
  end if;
  if code_in is not null and code_in !~ '^[A-Z0-9_-]{3,32}$' then
    raise exception 'Referral codes use 3–32 letters, numbers, dashes or underscores';
  end if;
  if code_in is not null and exists (select 1 from nsp_referral_codes where code = code_in
                                     and partner_id is distinct from aid) then
    raise exception 'Referral code % is already taken', code_in;
  end if;
  if exists (select 1 from nsp_partners where lower(email) = e and id is distinct from aid) then
    raise exception 'Another ambassador already uses this email';
  end if;

  if aid is null then
    insert into nsp_partners (name, first_name, last_name, email, phone, city, state, start_date, status, notes, code,
      application_id)
    values (trim(p ->> 'first_name') || ' ' || trim(p ->> 'last_name'), trim(p ->> 'first_name'), trim(p ->> 'last_name'),
      e, nullif(trim(p ->> 'phone'), ''), nullif(trim(p ->> 'city'), ''), nullif(upper(trim(p ->> 'state')), ''),
      coalesce(nullif(p ->> 'start_date', '')::date, nsp_today()), coalesce(st, 'active'), nullif(trim(p ->> 'notes'), ''),
      coalesce(code_in, nsp_new_referral_code()), nullif(p ->> 'application_id', '')::uuid)
    returning * into after;
    insert into nsp_referral_codes (code, partner_id) values (after.code, after.id);
    perform nsp_log('ambassador_created', 'ambassador', after.id::text, null, to_jsonb(after), p_reason);
  else
    select * into before from nsp_partners where id = aid for update;
    if not found then raise exception 'Ambassador not found'; end if;
    st := coalesce(st, before.status);
    update nsp_partners set name = trim(p ->> 'first_name') || ' ' || trim(p ->> 'last_name'),
      first_name = trim(p ->> 'first_name'), last_name = trim(p ->> 'last_name'), email = e,
      phone = nullif(trim(p ->> 'phone'), ''), city = nullif(trim(p ->> 'city'), ''),
      state = nullif(upper(trim(p ->> 'state')), ''),
      start_date = coalesce(nullif(p ->> 'start_date', '')::date, start_date), status = st,
      notes = nullif(trim(p ->> 'notes'), ''), code = coalesce(code_in, code),
      archived_at = case when st = 'archived' then coalesce(archived_at, now()) else null end, updated_at = now()
    where id = aid returning * into after;
    insert into nsp_referral_codes (code, partner_id) values (after.code, after.id) on conflict do nothing;
    perform nsp_log(case when after.status <> before.status then 'ambassador_' || after.status else 'ambassador_updated' end,
      'ambassador', aid::text, to_jsonb(before) - 'updated_at', to_jsonb(after) - 'updated_at', p_reason);
    -- Contact changes affect self-purchase detection for attributed customers.
    if before.email is distinct from after.email or before.phone is distinct from after.phone then
      perform nsp_recompute_customer(customer_id) from nsp_orders where referred_partner_id = aid or partner_id = aid
        group by customer_id;
    end if;
  end if;
  return nsp_ambassador_json(after.id);
end $$;

create or replace function public.nsp_set_ambassador_status(p_id uuid, p_status text, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare before nsp_partners;
begin
  perform nsp_require_owner();
  if p_status not in ('pending', 'active', 'suspended', 'inactive', 'archived') then raise exception 'Unknown status'; end if;
  select * into before from nsp_partners where id = p_id for update;
  if not found then raise exception 'Ambassador not found'; end if;
  update nsp_partners set status = p_status, updated_at = now(),
    archived_at = case when p_status = 'archived' then coalesce(archived_at, now()) else null end
  where id = p_id;
  perform nsp_log('ambassador_' || p_status, 'ambassador', p_id::text, jsonb_build_object('status', before.status),
    jsonb_build_object('status', p_status), p_reason);
  return nsp_ambassador_json(p_id);
end $$;

create or replace function public.nsp_approve_application(p_request uuid, p jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r nsp_requests; result jsonb;
begin
  perform nsp_require_owner();
  select * into r from nsp_requests where id = p_request and kind = 'application' for update;
  if not found then raise exception 'Application not found'; end if;
  if r.status = 'approved' then raise exception 'This application was already approved'; end if;
  result := nsp_save_ambassador(jsonb_build_object(
    'first_name', coalesce(nullif(p ->> 'first_name', ''), r.first_name, split_part(r.name, ' ', 1)),
    'last_name', coalesce(nullif(p ->> 'last_name', ''), r.last_name, nullif(substr(r.name, length(split_part(r.name, ' ', 1)) + 2), '')),
    'email', coalesce(nullif(p ->> 'email', ''), r.email),
    'phone', coalesce(nullif(p ->> 'phone', ''), r.phone),
    'city', coalesce(nullif(p ->> 'city', ''), r.city), 'state', coalesce(nullif(p ->> 'state', ''), r.state),
    'code', p ->> 'code', 'status', coalesce(nullif(p ->> 'status', ''), 'active'),
    'start_date', p ->> 'start_date', 'notes', p ->> 'notes', 'application_id', r.id), 'Approved application');
  update nsp_requests set status = 'approved', updated_at = now() where id = r.id;
  perform nsp_log('application_approved', 'request', r.id::text, null, jsonb_build_object('ambassador', result ->> 'public_id'), null);
  return result;
end $$;

create or replace function public.nsp_decline_application(p_request uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform nsp_require_owner();
  update nsp_requests set status = 'declined', decision_reason = nullif(trim(p_reason), ''), updated_at = now()
  where id = p_request and kind = 'application';
  if not found then raise exception 'Application not found'; end if;
  perform nsp_log('application_declined', 'request', p_request::text, null, null, p_reason);
end $$;

create or replace function public.nsp_owner_ambassadors(p_month date default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m date := nsp_month(coalesce(p_month, nsp_today())); tz text := (nsp_cfg()).timezone; result jsonb;
begin
  perform nsp_require_owner();
  perform nsp_expire_attributions();
  select coalesce(jsonb_agg(nsp_ambassador_json(p.id) || jsonb_build_object(
      'month', m,
      'tier_name', coalesce(s.tier_name, (select name from nsp_tier((nsp_cfg()).tiers, 0))),
      'qualified_cents', coalesce(s.qualified_cents, 0),
      'new_revenue_cents', coalesce(s.new_revenue_cents, 0),
      'residual_revenue_cents', coalesce(s.residual_revenue_cents, 0),
      'commission_cents', coalesce(s.final_cents, 0),
      'customers', (select count(distinct a.customer_id) from nsp_customer_attributions a
                    where a.partner_id = p.id and a.status in ('active', 'expired')),
      'active_customers', (select count(distinct a.customer_id) from nsp_customer_attributions a
                    where a.partner_id = p.id and a.status = 'active'),
      'clicks', (select count(*) from nsp_referral_clicks k where k.partner_id = p.id
                 and (k.created_at at time zone tz)::date >= m and (k.created_at at time zone tz)::date < (m + interval '1 month')::date),
      'lifetime_cents', (select coalesce(sum(o.qualified_cents - o.refunded_cents), 0) from nsp_orders o
                         where o.partner_id = p.id and o.status in ('paid', 'fulfilled') and o.classification in ('NEW', 'RESIDUAL')))
    order by coalesce(s.qualified_cents, 0) desc, p.created_at), '[]') into result
  from nsp_partners p left join nsp_commission_statements s on s.partner_id = p.id and s.month = m;
  return result;
end $$;

create or replace function public.nsp_owner_ambassador_detail(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform nsp_require_owner();
  perform nsp_expire_attributions();
  return nsp_ambassador_json(p_id) || jsonb_build_object(
    'statements', coalesce((select jsonb_agg(to_jsonb(s) order by s.month desc) from nsp_commission_statements s
                            where s.partner_id = p_id), '[]'),
    'customers', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'public_id', c.public_id,
        'name', c.first_name || ' ' || coalesce(c.last_name, ''), 'status', a.status,
        'first_purchase_on', a.first_purchase_on, 'residual_expires_on', a.residual_expires_on)
        order by a.first_purchase_on desc nulls last)
      from nsp_customer_attributions a join nsp_customers c on c.id = a.customer_id
      where a.partner_id = p_id and a.status in ('pending', 'active', 'expired')), '[]'),
    'orders', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'public_id', o.public_id, 'paid_on', o.paid_on,
        'status', o.status, 'classification', o.classification, 'qualified_cents', o.qualified_cents - o.refunded_cents,
        'commission_cents', o.commission_cents, 'customer', c.first_name || ' ' || coalesce(c.last_name, ''))
        order by o.paid_on desc nulls last)
      from nsp_orders o join nsp_customers c on c.id = o.customer_id where o.partner_id = p_id), '[]'),
    'history', coalesce((select jsonb_agg(jsonb_build_object('action', a.action, 'at', a.created_at, 'reason', a.reason)
        order by a.created_at desc) from nsp_audit a where a.entity = 'ambassador' and a.entity_id = p_id::text), '[]'));
end $$;

-- Called by the edge function (service role) after it creates or finds the
-- ambassador's login.
create or replace function public.nsp_link_ambassador_user(p_partner uuid, p_user uuid, p_actor uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from nsp_partners where user_id = p_user and id <> p_partner) then
    raise exception 'That login already belongs to another ambassador';
  end if;
  update nsp_partners set user_id = p_user, updated_at = now() where id = p_partner and (user_id is null or user_id = p_user);
  if not found then raise exception 'Ambassador already has a different login'; end if;
  insert into nsp_user_roles (user_id, role, granted_by) values (p_user, 'ambassador', p_actor) on conflict do nothing;
  insert into nsp_audit (actor, action, detail, entity, entity_id) values (p_actor, 'ambassador_access_prepared', '{}',
    'ambassador', p_partner::text);
end $$;

---------------------------------------------------------------------------
-- Commissions and payouts
---------------------------------------------------------------------------
create or replace function public.nsp_owner_commissions(p_month date default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m date := case when p_month is null then null else nsp_month(p_month) end; result jsonb;
begin
  perform nsp_require_owner();
  select coalesce(jsonb_agg(to_jsonb(s) || jsonb_build_object(
      'ambassador_name', nsp_partner_name(s.partner_id),
      'ambassador_public_id', (select public_id from nsp_partners where id = s.partner_id),
      'balance_cents', case when s.status = 'cancelled' then 0 else s.final_cents - s.paid_cents end,
      'adjustments', coalesce((select jsonb_agg(jsonb_build_object('cents', a.cents, 'reason', a.reason, 'at', a.created_at))
                               from nsp_commission_adjustments a where a.statement_id = s.id), '[]'),
      'payouts', coalesce((select jsonb_agg(jsonb_build_object('amount_cents', x.amount_cents, 'paid_on', x.paid_on,
                               'reference', x.reference, 'notes', x.notes) order by x.paid_on)
                           from nsp_payouts x where x.statement_id = s.id), '[]'))
    order by s.month desc, s.final_cents desc), '[]') into result
  from nsp_commission_statements s where m is null or s.month = m;
  return result;
end $$;

create or replace function public.nsp_statement_action(p_statement uuid, p_action text, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s nsp_commission_statements; new_status text;
begin
  perform nsp_require_owner();
  select * into s from nsp_commission_statements where id = p_statement for update;
  if not found then raise exception 'Statement not found'; end if;
  new_status := case p_action when 'approve' then 'approved' when 'hold' then 'held'
                              when 'cancel' then 'cancelled' when 'reopen' then 'pending' end;
  if new_status is null then raise exception 'Unknown action'; end if;
  if p_action = 'cancel' and length(trim(coalesce(p_notes, ''))) < 3 then
    raise exception 'A reason is required to cancel a commission';
  end if;
  if p_action = 'reopen' and s.paid_cents > 0 then raise exception 'A statement with payouts cannot be reopened'; end if;
  if p_action = 'approve' and s.status not in ('pending', 'held') then raise exception 'Only pending or held commissions can be approved'; end if;
  if p_action = 'hold' and s.status not in ('pending', 'approved') then raise exception 'Only pending or approved commissions can be held'; end if;
  if p_action = 'cancel' and (s.status = 'paid' or s.paid_cents > 0) then raise exception 'A commission with payouts cannot be cancelled'; end if;
  if p_action = 'reopen' and s.status = 'pending' then raise exception 'This commission is already open'; end if;
  update nsp_commission_statements set status = new_status,
    approved_at = case when new_status = 'approved' then now() else approved_at end,
    approved_by = case when new_status = 'approved' then auth.uid() else approved_by end,
    notes = coalesce(nullif(trim(p_notes), ''), notes), updated_at = now()
  where id = s.id;
  if p_action = 'reopen' then perform nsp_recompute_statement(s.partner_id, s.month); end if;
  perform nsp_log('commission_' || new_status, 'statement', s.id::text,
    jsonb_build_object('status', s.status, 'final_cents', s.final_cents),
    jsonb_build_object('status', new_status), p_notes);
  return (select to_jsonb(x) from nsp_commission_statements x where x.id = s.id);
end $$;

create or replace function public.nsp_add_adjustment(p_statement uuid, p_cents integer, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s nsp_commission_statements;
begin
  perform nsp_require_owner();
  select * into s from nsp_commission_statements where id = p_statement for update;
  if not found then raise exception 'Statement not found'; end if;
  if s.status in ('paid', 'cancelled') then raise exception 'Adjust an open statement, or add it to next month'; end if;
  insert into nsp_commission_adjustments (statement_id, cents, reason, created_by) values (s.id, p_cents, trim(p_reason), auth.uid());
  perform nsp_recompute_statement(s.partner_id, s.month);
  perform nsp_log('commission_adjusted', 'statement', s.id::text, jsonb_build_object('final_cents', s.final_cents),
    jsonb_build_object('adjustment_cents', p_cents), p_reason);
  return (select to_jsonb(x) from nsp_commission_statements x where x.id = s.id);
end $$;

-- Records money already sent outside the site. Nothing is transferred here.
create or replace function public.nsp_record_payout(p_statement uuid, p_amount integer, p_paid_on date,
  p_reference text default null, p_notes text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s nsp_commission_statements;
begin
  perform nsp_require_owner();
  select * into s from nsp_commission_statements where id = p_statement for update;
  if not found then raise exception 'Statement not found'; end if;
  if s.status not in ('approved', 'paid') then raise exception 'Approve the commission before recording a payment'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter the amount paid'; end if;
  if p_amount > s.final_cents - s.paid_cents then
    raise exception 'That is more than the % still owed', '$' || to_char((s.final_cents - s.paid_cents) / 100.0, 'FM999,999,990.00');
  end if;
  if p_paid_on is null or p_paid_on > nsp_today() then raise exception 'Enter the date it was paid'; end if;
  insert into nsp_payouts (statement_id, partner_id, amount_cents, paid_on, reference, notes, created_by)
  values (s.id, s.partner_id, p_amount, p_paid_on, nullif(trim(p_reference), ''), nullif(trim(p_notes), ''), auth.uid());
  update nsp_commission_statements set paid_cents = paid_cents + p_amount,
    status = case when paid_cents + p_amount >= final_cents then 'paid' else status end, updated_at = now()
  where id = s.id;
  perform nsp_log('commission_paid', 'statement', s.id::text, jsonb_build_object('paid_cents', s.paid_cents),
    jsonb_build_object('paid_cents', s.paid_cents + p_amount, 'amount_cents', p_amount, 'paid_on', p_paid_on,
      'reference', p_reference), p_notes);
  return (select to_jsonb(x) from nsp_commission_statements x where x.id = s.id);
end $$;

---------------------------------------------------------------------------
-- Settings
---------------------------------------------------------------------------
create or replace function public.nsp_get_settings() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform nsp_require_owner();
  return (select to_jsonb(s) from nsp_settings s where id);
end $$;

create or replace function public.nsp_save_settings(p jsonb, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare before nsp_settings; t jsonb; prev bigint := -1; n int := 0;
begin
  perform nsp_require_owner();
  select * into before from nsp_settings where id for update;
  if jsonb_typeof(p -> 'tiers') <> 'array' or jsonb_array_length(p -> 'tiers') not between 1 and 10 then
    raise exception 'Provide 1 to 10 tiers';
  end if;
  for t in select * from jsonb_array_elements(p -> 'tiers') loop
    n := n + 1;
    if coalesce(trim(t ->> 'name'), '') = '' then raise exception 'Every tier needs a name'; end if;
    if (t ->> 'bps')::int not between 0 and 5000 then raise exception 'Tier rates must be between 0%% and 50%%'; end if;
    if n = 1 and (t ->> 'min_cents')::bigint <> 0 then raise exception 'The first tier must start at $0'; end if;
    if (t ->> 'min_cents')::bigint <= prev then raise exception 'Tier thresholds must increase'; end if;
    prev := (t ->> 'min_cents')::bigint;
  end loop;
  update nsp_settings set tiers = p -> 'tiers', residual_bps = coalesce((p ->> 'residual_bps')::int, residual_bps),
    residual_months = coalesce((p ->> 'residual_months')::int, residual_months),
    referral_window_days = coalesce((p ->> 'referral_window_days')::int, referral_window_days),
    reacquisition = coalesce(p ->> 'reacquisition', reacquisition),
    excluded_products = case when p ? 'excluded_products' then coalesce((select array_agg(x)
      from jsonb_array_elements_text(p -> 'excluded_products') x), '{}') else excluded_products end,
    leaderboard_enabled = coalesce((p ->> 'leaderboard_enabled')::boolean, leaderboard_enabled),
    updated_at = now(), updated_by = auth.uid()
  where id;
  perform nsp_recompute_open_statements();
  perform nsp_log('settings_changed', 'settings', 'program', to_jsonb(before), (select to_jsonb(s) from nsp_settings s where id), p_reason);
  return (select to_jsonb(s) from nsp_settings s where id);
end $$;

---------------------------------------------------------------------------
-- Inquiries (owner view)
---------------------------------------------------------------------------
create or replace function public.nsp_owner_requests(p_kind text default null, p_status text default null,
  p_q text default null, p_limit int default 200) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare q text := trim(coalesce(p_q, '')); result jsonb;
begin
  perform nsp_require_owner();
  select coalesce(jsonb_agg(to_jsonb(r) - 'visitor_id' || jsonb_build_object(
      'ambassador_name', nsp_partner_name(r.partner_id),
      'existing_customer', (select nsp_customer_json(c.id) from nsp_customers c
                            where c.merged_into is null and ((c.email_norm = nsp_norm_email(r.email))
                              or (r.customer_id = c.id)) limit 1))
    order by r.created_at desc), '[]') into result
  from (select * from nsp_requests r
        where (p_kind is null or r.kind = p_kind) and (p_status is null or r.status = p_status)
          and (q = '' or r.name ilike '%' || q || '%' or r.email ilike '%' || q || '%'
               or coalesce(r.product, '') ilike '%' || q || '%' or coalesce(r.phone_norm, '') like '%' || regexp_replace(q, '\D', '', 'g') || '%')
        order by r.created_at desc limit least(greatest(p_limit, 1), 500)) r;
  return result;
end $$;

create or replace function public.nsp_request_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare before text;
begin
  perform nsp_require_owner();
  if p_status not in ('new', 'reviewed', 'closed') then raise exception 'Unknown status'; end if;
  select status into before from nsp_requests where id = p_id for update;
  if not found then raise exception 'Inquiry not found'; end if;
  update nsp_requests set status = p_status, updated_at = now() where id = p_id;
  perform nsp_log('request_status', 'request', p_id::text, jsonb_build_object('status', before),
    jsonb_build_object('status', p_status), null);
end $$;

---------------------------------------------------------------------------
-- Owner overview and referral analytics
---------------------------------------------------------------------------
create or replace function public.nsp_owner_overview() returns jsonb
language plpgsql security definer set search_path = public as $$
declare today date; m date; result jsonb;
begin
  perform nsp_require_owner();
  perform nsp_expire_attributions();
  today := nsp_today(); m := nsp_month(today);
  select jsonb_build_object(
    'month', m,
    'sales_count', (select count(*) from nsp_orders where status in ('paid', 'fulfilled') and paid_on >= m),
    'sales_cents', (select coalesce(sum(product_paid_cents - refunded_cents), 0) from nsp_orders
                    where status in ('paid', 'fulfilled') and paid_on >= m),
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
        'entity', a.entity, 'reason', a.reason) x from nsp_audit a order by a.created_at desc limit 8) y), '[]')
  ) into result;
  return result;
end $$;

create or replace function public.nsp_referral_analytics(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare tz text := (nsp_cfg()).timezone; result jsonb;
begin
  perform nsp_require_owner();
  with clicks as (
    select * from nsp_referral_clicks k
    where (k.created_at at time zone tz)::date between p_from and p_to),
  inq as (
    select * from nsp_requests r where r.partner_id is not null and (r.created_at at time zone tz)::date between p_from and p_to),
  sales as (
    select * from nsp_orders o where o.status in ('paid', 'fulfilled') and o.classification in ('NEW', 'RESIDUAL')
      and o.paid_on between p_from and p_to),
  per as (
    select p.id, nsp_partner_name(p.id) as name, p.code, p.status,
      (select count(*) from clicks k where k.partner_id = p.id) as clicks,
      (select count(distinct coalesce(k.visitor_id, k.ip_hash)) from clicks k where k.partner_id = p.id) as visitors,
      (select count(*) from inq r where r.partner_id = p.id) as inquiries,
      (select count(*) from sales s where s.partner_id = p.id and s.classification = 'NEW') as new_customers,
      (select count(*) from sales s where s.partner_id = p.id) as sales,
      (select coalesce(sum(s.qualified_cents - s.refunded_cents), 0) from sales s where s.partner_id = p.id) as revenue
    from nsp_partners p)
  select jsonb_build_object(
    'from', p_from, 'to', p_to,
    'clicks', (select count(*) from clicks),
    'visitors', (select count(distinct coalesce(visitor_id, ip_hash)) from clicks),
    'inquiries', (select count(*) from inq),
    'new_customers', (select count(*) from sales where classification = 'NEW'),
    'sales', (select count(*) from sales),
    'revenue_cents', (select coalesce(sum(qualified_cents - refunded_cents), 0) from sales),
    'ambassadors_with_sales', (select count(distinct partner_id) from sales),
    'by_ambassador', coalesce((select jsonb_agg(to_jsonb(per) order by revenue desc, clicks desc) from per
                               where clicks > 0 or inquiries > 0 or sales > 0), '[]'),
    'by_day', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'clicks', n) order by d) from (
                 select (created_at at time zone tz)::date as d, count(*) as n from clicks group by 1) z), '[]'),
    'top_landing', coalesce((select jsonb_agg(jsonb_build_object('path', landing_path, 'clicks', n)) from (
                 select coalesce(landing_path, '/') as landing_path, count(*) as n from clicks group by 1 order by 2 desc limit 8) z), '[]')
  ) into result;
  return result;
end $$;

create or replace function public.nsp_owner_audit(p_limit int default 200, p_entity text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform nsp_require_owner();
  return coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'action', a.action, 'at', a.created_at,
      'entity', a.entity, 'entity_id', a.entity_id, 'before', a.before, 'after', a.after, 'reason', a.reason,
      'actor', (select email from auth.users u where u.id = a.actor)) order by a.id desc)
    from (select * from nsp_audit where p_entity is null or entity = p_entity order by id desc
          limit least(greatest(p_limit, 1), 1000)) a), '[]');
end $$;

---------------------------------------------------------------------------
-- Ambassador dashboard: everything an ambassador may see, for their own
-- ambassador id only. Customer names are reduced to first name + initial.
---------------------------------------------------------------------------
create or replace function public.nsp_ambassador_dashboard(p_month date default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me nsp_partners; cfg nsp_settings := nsp_cfg(); m date; s nsp_commission_statements;
  tiers jsonb; t record; visitors int; clicks int; result jsonb;
begin
  select * into me from nsp_partners where user_id = auth.uid();
  if auth.uid() is null or me.id is null or me.status = 'archived' then
    raise exception 'Approved ambassador access required';
  end if;
  perform nsp_expire_attributions();
  update nsp_partners set last_activity_at = now() where id = me.id;
  m := nsp_month(coalesce(p_month, nsp_today()));
  select * into s from nsp_commission_statements where partner_id = me.id and month = m;
  tiers := coalesce(s.rates_snapshot -> 'tiers', cfg.tiers);
  select * into t from nsp_tier(tiers, coalesce(s.qualified_cents, 0));
  select count(*), count(distinct coalesce(visitor_id, ip_hash)) into clicks, visitors from nsp_referral_clicks
  where partner_id = me.id and (created_at at time zone cfg.timezone)::date >= m
    and (created_at at time zone cfg.timezone)::date < (m + interval '1 month')::date;

  select jsonb_build_object(
    'profile', jsonb_build_object('first_name', coalesce(me.first_name, me.name), 'public_id', me.public_id,
      'code', me.code, 'referral_path', '/r/' || me.code, 'status', me.status, 'start_date', me.start_date),
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
end $$;

---------------------------------------------------------------------------
-- Public entry points (called only by the edge function with the service
-- role, which hashes the visitor IP for rate limiting).
---------------------------------------------------------------------------
create or replace function public.nsp_resolve_code(p_code text) returns uuid
language sql stable security definer set search_path = public as $$
  select rc.partner_id from nsp_referral_codes rc join nsp_partners p on p.id = rc.partner_id
  where rc.code = upper(trim(p_code)) and p.status = 'active'
$$;

create or replace function public.nsp_track_click(p_code text, p_visitor text, p_landing text, p_referrer text,
  p_ip_hash text, p_source text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pid uuid := nsp_resolve_code(p_code); n_hits int;
begin
  if pid is null then return jsonb_build_object('valid', false); end if;
  insert into nsp_rate_limits (key, window_at, hits) values ('click:' || p_ip_hash, now(), 1)
  on conflict (key) do update set
    hits = case when nsp_rate_limits.window_at < now() - interval '1 hour' then 1 else nsp_rate_limits.hits + 1 end,
    window_at = case when nsp_rate_limits.window_at < now() - interval '1 hour' then now() else nsp_rate_limits.window_at end
  returning nsp_rate_limits.hits into n_hits;
  if n_hits <= 120 and not exists (
      select 1 from nsp_referral_clicks where partner_id = pid and created_at > now() - interval '30 minutes'
        and ((p_visitor is not null and visitor_id = p_visitor) or (p_visitor is null and ip_hash = p_ip_hash))) then
    insert into nsp_referral_clicks (partner_id, code, source, visitor_id, landing_path, referrer_host, ip_hash)
    values (pid, upper(trim(p_code)), coalesce(p_source, 'link'),
      case when p_visitor ~ '^[A-Za-z0-9-]{8,64}$' then p_visitor end, left(p_landing, 300), left(p_referrer, 200), p_ip_hash);
  end if;
  return jsonb_build_object('valid', true, 'code', (select code from nsp_partners where id = pid));
end $$;

-- Public inquiry submission (replaces v1). Attribution: a valid code typed or
-- carried by the visitor, else this visitor's most recent referral click
-- within the referral window. Codes of inactive ambassadors are ignored.
create or replace function public.nsp_submit(p_body jsonb, p_key text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  rid uuid := (p_body ->> 'id')::uuid;
  cnt integer;
  code_in text := upper(nullif(trim(p_body ->> 'referral_code'), ''));
  visitor text := case when p_body ->> 'visitor_id' ~ '^[A-Za-z0-9-]{8,64}$' then p_body ->> 'visitor_id' end;
  pid uuid; src text; canon text;
  v_first text := nullif(trim(p_body ->> 'first_name'), '');
  v_last text := nullif(trim(p_body ->> 'last_name'), '');
  full_name text;
begin
  insert into nsp_rate_limits (key, window_at, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when nsp_rate_limits.window_at < now() - interval '1 hour' then 1 else nsp_rate_limits.hits + 1 end,
    window_at = case when nsp_rate_limits.window_at < now() - interval '1 hour' then now() else nsp_rate_limits.window_at end
  returning hits into cnt;
  if cnt > 10 then raise exception 'Too many requests; please try later'; end if;
  if exists (select 1 from nsp_requests where id = rid) then return rid; end if;

  if code_in is not null then
    pid := nsp_resolve_code(code_in);
    if pid is not null then
      src := case when coalesce((p_body ->> 'referral_captured')::boolean, false) then 'link' else 'code_entry' end;
      if src = 'code_entry' then
        insert into nsp_referral_clicks (partner_id, code, source, visitor_id, landing_path, ip_hash)
        values (pid, code_in, 'code_entry', visitor, 'inquiry-form', p_key);
      end if;
    end if;
  end if;
  if pid is null and visitor is not null then
    select k.partner_id, k.code into pid, code_in from nsp_referral_clicks k join nsp_partners p on p.id = k.partner_id
    where k.visitor_id = visitor and p.status = 'active'
      and k.created_at > now() - make_interval(days => (nsp_cfg()).referral_window_days)
    order by k.created_at desc limit 1;
    if pid is not null then src := 'link'; end if;
  end if;
  canon := case when pid is not null then (select code from nsp_partners where id = pid) end;

  full_name := nullif(trim(concat_ws(' ', v_first, v_last)), '');
  if full_name is null or full_name = '' then full_name := coalesce(nullif(trim(p_body ->> 'name'), ''), 'Unknown'); end if;

  insert into nsp_requests (id, kind, name, first_name, last_name, email, phone, city, state, product, lot, message,
    referral_code, partner_id, referral_source, visitor_id, order_items, payment_method, payment_other,
    fulfillment_method, research_ack)
  values (rid, p_body ->> 'kind', left(full_name, 100), left(v_first, 60), left(v_last, 60), lower(p_body ->> 'email'),
    left(nullif(trim(p_body ->> 'phone'), ''), 40), left(nullif(trim(p_body ->> 'city'), ''), 80),
    left(nullif(upper(trim(p_body ->> 'state')), ''), 40),
    p_body ->> 'product', p_body ->> 'lot', p_body ->> 'message', canon, pid, src, visitor,
    case when jsonb_typeof(p_body -> 'order_items') = 'array' then p_body -> 'order_items' end,
    nullif(p_body ->> 'payment_method', ''), nullif(trim(p_body ->> 'payment_other'), ''),
    nullif(p_body ->> 'fulfillment_method', ''), (p_body ->> 'research_ack')::boolean);
  return rid;
end $$;

---------------------------------------------------------------------------
-- Retire the v1 owner table (owners now live in nsp_user_roles) and the v1
-- ownership helper.
---------------------------------------------------------------------------
drop function if exists public.nsp_owns(uuid);
drop table public.nsp_admins;

---------------------------------------------------------------------------
-- Execution grants: lock everything down, then open exactly the functions
-- the browser may call. Each of those re-checks the caller's role inside.
---------------------------------------------------------------------------
do $$ declare f record; begin
  for f in select oid::regprocedure as sig from pg_proc
    where pronamespace = 'public'::regnamespace and proname like 'nsp_%' and prokind = 'f'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
grant execute on function public.nsp_norm_email(text), public.nsp_norm_phone(text), public.nsp_month(date)
  to anon, authenticated;
grant execute on function
  public.nsp_is_admin(), public.nsp_is_owner(), public.nsp_me(),
  public.nsp_find_customers(text, int), public.nsp_match_customer(text, text, text, text),
  public.nsp_customer_detail(uuid), public.nsp_save_customer(jsonb, text),
  public.nsp_correct_attribution(uuid, uuid, boolean, text), public.nsp_flag_duplicate(uuid, boolean, text),
  public.nsp_merge_customers(uuid, uuid, text),
  public.nsp_record_sale(jsonb), public.nsp_sale_preview(jsonb), public.nsp_update_order(uuid, jsonb, text),
  public.nsp_refund_order(uuid, integer, text), public.nsp_owner_orders(date, date, text, text, int),
  public.nsp_order_detail(uuid),
  public.nsp_save_ambassador(jsonb, text), public.nsp_set_ambassador_status(uuid, text, text),
  public.nsp_approve_application(uuid, jsonb), public.nsp_decline_application(uuid, text),
  public.nsp_owner_ambassadors(date), public.nsp_owner_ambassador_detail(uuid),
  public.nsp_owner_commissions(date), public.nsp_statement_action(uuid, text, text),
  public.nsp_add_adjustment(uuid, integer, text), public.nsp_record_payout(uuid, integer, date, text, text),
  public.nsp_get_settings(), public.nsp_save_settings(jsonb, text),
  public.nsp_owner_requests(text, text, text, int), public.nsp_request_status(uuid, text),
  public.nsp_owner_overview(), public.nsp_referral_analytics(date, date), public.nsp_owner_audit(int, text),
  public.nsp_ambassador_dashboard(date)
to authenticated;
