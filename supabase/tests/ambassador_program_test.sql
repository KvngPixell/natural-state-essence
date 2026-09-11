-- Ambassador program engine tests. Runs entirely inside one transaction and
-- ROLLS BACK at the end: nothing it creates survives. Safe to run against
-- the live project. Prints one row per check with PASS/FAIL.
--
-- Covers the spec's worked examples:
--   §58 John/Sarah: $200 NEW, then $150 RESIDUAL = $15, no second click
--   §59 tier test: $3,500 new + $2,000 returning = $5,500 → Elite 22.5%
--        → $787.50 + $200 = $987.50
--   §17 protect the original ambassador (Mike's later click does not steal)
--   §20 retroactive tier within a month
--   §24 refunds reverse commission
--   §46 self-purchase is excluded and flagged
--   §18 expiry: after 6 months a purchase is no longer residual
--   RLS: an ambassador sees only their own data and no owner functions

begin;
create temp table t_results (n serial, check_name text, expected text, actual text, pass boolean) on commit drop;
grant all on t_results to authenticated;
grant usage on sequence t_results_n_seq to authenticated;

do $test$
declare
  owner_id constant uuid := (select user_id from nsp_user_roles where role = 'owner' order by granted_at limit 1);
  john jsonb; mike jsonb; jane jsonb; r jsonb; req uuid := gen_random_uuid(); req2 uuid := gen_random_uuid();
  sarah uuid; o1 uuid; o2 uuid; o3 uuid; s record; x record; fake_user uuid := gen_random_uuid();
  today date := nsp_today(); m date := nsp_month(nsp_today());
  aug date := (nsp_month(nsp_today()) - interval '1 month')::date;
  jun date := (nsp_month(nsp_today()) - interval '3 months')::date;
  err text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);

  ---------------------------------------------------------------- setup
  john := nsp_save_ambassador('{"first_name":"John","last_name":"Smith","email":"john.test@example.com","phone":"501-555-0101","code":"K7P4XZ"}');
  mike := nsp_save_ambassador('{"first_name":"Mike","last_name":"Jones","email":"mike.test@example.com"}');
  jane := nsp_save_ambassador('{"first_name":"Jane","last_name":"Doe","email":"jane.test@example.com"}');
  insert into t_results (check_name, expected, actual, pass) values
    ('Custom referral code kept', 'K7P4XZ', john ->> 'code', john ->> 'code' = 'K7P4XZ'),
    ('Blank code auto-generated (6 chars)', '6 chars', mike ->> 'code', length(mike ->> 'code') = 6),
    ('Ambassador public id', 'amb_…', john ->> 'public_id', (john ->> 'public_id') like 'amb\_%');

  ---------------------------------------------------------------- §58 Sarah clicks John's link, inquires
  perform nsp_track_click('K7P4XZ', 'visitor-sarah-0001', '/r/K7P4XZ', null, 'iphash-sarah', 'link');
  perform nsp_submit(jsonb_build_object('id', req, 'kind', 'product', 'first_name', 'Sarah', 'last_name', 'Lee',
    'email', 'Sarah.Lee@Example.com', 'phone', '(501) 555-0199', 'message', 'Interested in BPC-157',
    'visitor_id', 'visitor-sarah-0001'), 'iphash-sarah');
  select * into x from nsp_requests where id = req;
  insert into t_results (check_name, expected, actual, pass) values
    ('Inquiry auto-attributed from click (no code typed)', 'John', nsp_partner_name(x.partner_id),
      x.partner_id = (john ->> 'id')::uuid),
    ('Inquiry referral source', 'link', x.referral_source, x.referral_source = 'link');

  -- convert inquiry to a $200 paid sale
  r := nsp_record_sale(jsonb_build_object('request_id', req, 'customer', jsonb_build_object('first_name', 'Sarah',
    'last_name', 'Lee', 'email', 'sarah.lee@example.com', 'phone', '501-555-0199'), 'status', 'paid', 'paid_on', today,
    'product_paid_cents', 20000, 'items', jsonb_build_array(jsonb_build_object('product_name', 'BPC-157', 'quantity', 1))));
  o1 := (r ->> 'id')::uuid; sarah := (r ->> 'customer_id')::uuid;
  select * into x from nsp_customer_attributions where customer_id = sarah and status = 'active';
  insert into t_results (check_name, expected, actual, pass) values
    ('$200 sale classified', 'NEW', r ->> 'classification', r ->> 'classification' = 'NEW'),
    ('Sale attributed to', 'John', r ->> 'partner_name', r ->> 'partner_name' = 'John Smith'),
    ('Customer permanent id', 'cus_…', r -> 'customer' ->> 'public_id', (r -> 'customer' ->> 'public_id') like 'cus\_%'),
    ('Attribution Sarah → John active', 'active', x.status, x.status = 'active' and x.partner_id = (john ->> 'id')::uuid),
    ('Residual expires 6 months after first purchase', (today + interval '6 months')::date::text,
      x.residual_expires_on::text, x.residual_expires_on = (today + interval '6 months')::date),
    ('Inquiry marked converted', 'converted', (select status from nsp_requests where id = req),
      (select status from nsp_requests where id = req) = 'converted'),
    ('$200 NEW commission at 15%', '3000', r ->> 'commission_cents', (r ->> 'commission_cents')::int = 3000);

  -- §58 second purchase: admin enters only Sarah's email; no referral given
  r := nsp_record_sale(jsonb_build_object('customer', jsonb_build_object('first_name', 'Sarah', 'email', ' SARAH.LEE@example.com '),
    'status', 'paid', 'paid_on', today, 'product_paid_cents', 15000,
    'items', jsonb_build_array(jsonb_build_object('product_name', 'TB-500', 'quantity', 1))));
  o2 := (r ->> 'id')::uuid;
  insert into t_results (check_name, expected, actual, pass) values
    ('Returning customer found by email (no duplicate)', sarah::text, r ->> 'customer_id', (r ->> 'customer_id')::uuid = sarah),
    ('$150 sale classified', 'RESIDUAL', r ->> 'classification', r ->> 'classification' = 'RESIDUAL'),
    ('$150 residual commission', '1500 ($15)', r ->> 'commission_cents', (r ->> 'commission_cents')::int = 1500),
    ('Still attributed to John without a new click', 'John Smith', r ->> 'partner_name', r ->> 'partner_name' = 'John Smith');
  select * into s from nsp_commission_statements where partner_id = (john ->> 'id')::uuid and month = m;
  insert into t_results (check_name, expected, actual, pass) values
    ('John monthly qualified revenue', '35000', s.qualified_cents::text, s.qualified_cents = 35000),
    ('John statement total', '4500 (3000 + 1500)', s.final_cents::text, s.final_cents = 4500);

  ---------------------------------------------------------------- §17 Mike's later click does not steal Sarah
  perform nsp_track_click(mike ->> 'code', 'visitor-sarah-0001', '/', null, 'iphash-sarah', 'link');
  perform nsp_submit(jsonb_build_object('id', req2, 'kind', 'order', 'first_name', 'Sarah', 'email', 'sarah.lee@example.com',
    'phone', '5015550199', 'message', 'Order', 'visitor_id', 'visitor-sarah-0001',
    'order_items', jsonb_build_array(jsonb_build_object('name', 'GHK-Cu', 'quantity', 2)),
    'payment_method', 'venmo', 'fulfillment_method', 'pickup', 'research_ack', true), 'iphash-sarah-2');
  insert into t_results (check_name, expected, actual, pass) values
    ('Order request records Mike click as referral input', 'Mike', nsp_partner_name((select partner_id from nsp_requests where id = req2)),
      (select partner_id from nsp_requests where id = req2) = (mike ->> 'id')::uuid);
  r := nsp_record_sale(jsonb_build_object('request_id', req2, 'customer_id', sarah, 'status', 'paid', 'paid_on', today,
    'product_paid_cents', 10000, 'items', jsonb_build_array(jsonb_build_object('product_name', 'GHK-Cu', 'quantity', 2))));
  o3 := (r ->> 'id')::uuid;
  insert into t_results (check_name, expected, actual, pass) values
    ('Existing attribution wins over Mike', 'John Smith RESIDUAL', (r ->> 'partner_name') || ' ' || (r ->> 'classification'),
      r ->> 'partner_name' = 'John Smith' and r ->> 'classification' = 'RESIDUAL'),
    ('Mike earns nothing on Sarah', '0', coalesce((select final_cents from nsp_commission_statements
      where partner_id = (mike ->> 'id')::uuid and month = m), 0)::text,
      coalesce((select final_cents from nsp_commission_statements where partner_id = (mike ->> 'id')::uuid and month = m), 0) = 0);

  ---------------------------------------------------------------- §20 retroactive tier (John crosses $1,000)
  r := nsp_record_sale(jsonb_build_object('customer', jsonb_build_object('first_name', 'Tom', 'email', 'tom.test@example.com'),
    'ambassador_id', john ->> 'id', 'status', 'paid', 'paid_on', today, 'product_paid_cents', 60000,
    'items', jsonb_build_array(jsonb_build_object('product_name', 'Retatrutide', 'quantity', 1))));
  select * into s from nsp_commission_statements where partner_id = (john ->> 'id')::uuid and month = m;
  insert into t_results (check_name, expected, actual, pass) values
    ('John MQR after $600 new sale', '105000', s.qualified_cents::text, s.qualified_cents = 105000),
    ('John rank', 'Pro Ambassador', s.tier_name, s.tier_name = 'Pro Ambassador'),
    ('Earlier $200 NEW re-rated retroactively to 17.5%', '1750 / 3500',
      (select commission_bps || ' / ' || commission_cents from nsp_orders where id = o1),
      (select commission_bps = 1750 and commission_cents = 3500 from nsp_orders where id = o1)),
    ('Residual stays 10% after tier change', '1000', (select commission_bps::text from nsp_orders where id = o2),
      (select commission_bps = 1000 from nsp_orders where id = o2)),
    ('John total = (200+600)×17.5% + (150+100)×10%', '16500', s.final_cents::text, s.final_cents = 16500);

  ---------------------------------------------------------------- §24 refund reverses commission
  perform nsp_refund_order(o2, 15000, 'Customer returned item');
  select * into s from nsp_commission_statements where partner_id = (john ->> 'id')::uuid and month = m;
  insert into t_results (check_name, expected, actual, pass) values
    ('Full refund sets status', 'refunded', (select status from nsp_orders where id = o2),
      (select status from nsp_orders where id = o2) = 'refunded'),
    ('Refunded sale earns 0', '0', (select commission_cents::text from nsp_orders where id = o2),
      (select commission_cents from nsp_orders where id = o2) = 0),
    ('John MQR after refund', '90000', s.qualified_cents::text, s.qualified_cents = 90000),
    ('Tier falls back after refund', 'Ambassador', s.tier_name, s.tier_name = 'Ambassador'),
    ('John total after refund = 800×15% + 100×10%', '13000', s.final_cents::text, s.final_cents = 13000),
    ('Refund written to audit log', 'sale_refunded', (select action from nsp_audit where entity_id = o2::text order by id desc limit 1),
      exists (select 1 from nsp_audit where entity_id = o2::text and action = 'sale_refunded' and reason is not null));

  ---------------------------------------------------------------- §46 self-purchase
  r := nsp_record_sale(jsonb_build_object('customer', jsonb_build_object('first_name', 'John', 'email', 'JOHN.test@example.com'),
    'ambassador_id', john ->> 'id', 'status', 'paid', 'paid_on', today, 'product_paid_cents', 50000,
    'items', jsonb_build_array(jsonb_build_object('product_name', 'Semax', 'quantity', 1))));
  insert into t_results (check_name, expected, actual, pass) values
    ('Ambassador self-purchase excluded', 'EXCLUDED', r ->> 'classification', r ->> 'classification' = 'EXCLUDED'),
    ('Self-purchase flagged', 'self_purchase', r ->> 'flags', (r -> 'flags') ? 'self_purchase'),
    ('Self-purchase adds no revenue', '90000',
      (select qualified_cents::text from nsp_commission_statements where partner_id = (john ->> 'id')::uuid and month = m),
      (select qualified_cents from nsp_commission_statements where partner_id = (john ->> 'id')::uuid and month = m) = 90000);

  ---------------------------------------------------------------- §59 tier test (Jane, previous month)
  -- Two customers first bought from Jane three months ago (NEW then),
  -- then bought $1,000 each last month (RESIDUAL). Five new customers
  -- bought $700 each last month (NEW). Expect $5,500 → Elite.
  for i in 1 .. 2 loop
    r := nsp_record_sale(jsonb_build_object('customer', jsonb_build_object('first_name', 'Ret' || i, 'email', 'ret' || i || '@example.com'),
      'ambassador_id', jane ->> 'id', 'status', 'paid', 'paid_on', jun + 5, 'product_paid_cents', 10000,
      'items', jsonb_build_array(jsonb_build_object('product_name', 'Epitalon', 'quantity', 1))));
    r := nsp_record_sale(jsonb_build_object('customer', jsonb_build_object('first_name', 'Ret' || i, 'email', 'ret' || i || '@example.com'),
      'status', 'paid', 'paid_on', aug + 10, 'product_paid_cents', 100000,
      'items', jsonb_build_array(jsonb_build_object('product_name', 'Epitalon', 'quantity', 5))));
  end loop;
  for i in 1 .. 5 loop
    r := nsp_record_sale(jsonb_build_object('customer', jsonb_build_object('first_name', 'New' || i, 'email', 'new' || i || '@example.com'),
      'ambassador_id', jane ->> 'id', 'status', 'paid', 'paid_on', aug + i, 'product_paid_cents', 70000,
      'items', jsonb_build_array(jsonb_build_object('product_name', 'MOTS-c', 'quantity', 2))));
  end loop;
  select * into s from nsp_commission_statements where partner_id = (jane ->> 'id')::uuid and month = aug;
  insert into t_results (check_name, expected, actual, pass) values
    ('§59 new customer revenue', '350000', s.new_revenue_cents::text, s.new_revenue_cents = 350000),
    ('§59 returning customer revenue', '200000', s.residual_revenue_cents::text, s.residual_revenue_cents = 200000),
    ('§59 monthly qualified revenue', '550000 ($5,500)', s.qualified_cents::text, s.qualified_cents = 550000),
    ('§59 rank', 'Elite Ambassador', s.tier_name, s.tier_name = 'Elite Ambassador'),
    ('§59 new customer rate', '2250 (22.5%)', s.tier_bps::text, s.tier_bps = 2250),
    ('§59 new customer commission', '78750 ($787.50)', s.new_commission_cents::text, s.new_commission_cents = 78750),
    ('§59 residual commission', '20000 ($200)', s.residual_commission_cents::text, s.residual_commission_cents = 20000),
    ('§59 total estimated commission', '98750 ($987.50)', s.final_cents::text, s.final_cents = 98750),
    ('§59 June month unaffected (separate period)', '20000 at 15%',
      (select qualified_cents || ' at ' || tier_bps from nsp_commission_statements where partner_id = (jane ->> 'id')::uuid and month = jun),
      (select qualified_cents = 20000 and tier_bps = 1500 from nsp_commission_statements where partner_id = (jane ->> 'id')::uuid and month = jun));

  ---------------------------------------------------------------- §18 expiry
  r := nsp_record_sale(jsonb_build_object('customer', jsonb_build_object('first_name', 'Old', 'email', 'old@example.com'),
    'ambassador_id', mike ->> 'id', 'status', 'paid', 'paid_on', (today - interval '8 months')::date, 'product_paid_cents', 10000,
    'items', jsonb_build_array(jsonb_build_object('product_name', 'KPV', 'quantity', 1))));
  r := nsp_record_sale(jsonb_build_object('customer', jsonb_build_object('first_name', 'Old', 'email', 'old@example.com'),
    'ambassador_id', mike ->> 'id', 'status', 'paid', 'paid_on', today, 'product_paid_cents', 10000,
    'items', jsonb_build_array(jsonb_build_object('product_name', 'KPV', 'quantity', 1))));
  insert into t_results (check_name, expected, actual, pass) values
    ('Purchase after residual window is not residual', 'UNATTRIBUTED', r ->> 'classification', r ->> 'classification' = 'UNATTRIBUTED'),
    ('Expired attribution kept as history', 'expired',
      (select status from nsp_customer_attributions where customer_id = (r ->> 'customer_id')::uuid order by created_at limit 1),
      (select status from nsp_customer_attributions where customer_id = (r ->> 'customer_id')::uuid order by created_at limit 1) = 'expired');

  ---------------------------------------------------------------- awaiting payment does not count
  r := nsp_record_sale(jsonb_build_object('customer', jsonb_build_object('first_name', 'Pending', 'email', 'pending@example.com'),
    'ambassador_id', mike ->> 'id', 'status', 'awaiting_payment', 'product_paid_cents', 30000,
    'items', jsonb_build_array(jsonb_build_object('product_name', 'Selank', 'quantity', 1))));
  insert into t_results (check_name, expected, actual, pass) values
    ('Unpaid sale earns nothing', 'null / 0', coalesce(r ->> 'classification', 'null') || ' / ' || (r ->> 'commission_cents'),
      r ->> 'classification' is null and (r ->> 'commission_cents')::int = 0),
    ('Unpaid referred customer shows pending attribution', 'pending',
      (select status from nsp_customer_attributions where customer_id = (r ->> 'customer_id')::uuid),
      (select status from nsp_customer_attributions where customer_id = (r ->> 'customer_id')::uuid) = 'pending');
  r := nsp_update_order((r ->> 'id')::uuid, jsonb_build_object('status', 'paid', 'paid_on', today), null);
  insert into t_results (check_name, expected, actual, pass) values
    ('Marking it paid makes it NEW', 'NEW', r ->> 'classification', r ->> 'classification' = 'NEW');

  ---------------------------------------------------------------- preview does not persist
  r := nsp_sale_preview(jsonb_build_object('customer', jsonb_build_object('first_name', 'Preview', 'email', 'preview@example.com'),
    'ambassador_id', john ->> 'id', 'status', 'paid', 'paid_on', today, 'product_paid_cents', 12300,
    'items', jsonb_build_array(jsonb_build_object('product_name', 'Oxytocin', 'quantity', 1))));
  insert into t_results (check_name, expected, actual, pass) values
    ('Preview classifies', 'NEW', r ->> 'classification', r ->> 'classification' = 'NEW'),
    ('Preview leaves no customer behind', '0', (select count(*)::text from nsp_customers where email_norm = 'preview@example.com'),
      not exists (select 1 from nsp_customers where email_norm = 'preview@example.com'));

  ---------------------------------------------------------------- statement approval + payout
  select * into s from nsp_commission_statements where partner_id = (jane ->> 'id')::uuid and month = aug;
  perform nsp_statement_action(s.id, 'approve', null);
  perform nsp_record_payout(s.id, 98750, today, 'Venmo 123', null);
  insert into t_results (check_name, expected, actual, pass) values
    ('Full payout marks statement paid', 'paid', (select status from nsp_commission_statements where id = s.id),
      (select status from nsp_commission_statements where id = s.id) = 'paid');
  begin
    perform nsp_record_payout(s.id, 100, today, 'extra', null);
    err := 'no error';
  exception when others then err := sqlerrm; end;
  insert into t_results (check_name, expected, actual, pass) values
    ('Overpayment refused', 'error', err, err like 'Approve%' or err like 'That is more%');

  ---------------------------------------------------------------- audit log is append-only
  begin
    update nsp_audit set reason = 'tampered' where id = (select max(id) from nsp_audit);
    err := 'no error';
  exception when others then err := sqlerrm; end;
  insert into t_results (check_name, expected, actual, pass) values
    ('Audit log rejects edits', 'append-only error', err, err like '%append-only%');

  ---------------------------------------------------------------- RLS: John as an ambassador
  insert into auth.users (id, instance_id, aud, role, email) values
    (fake_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'john.login@example.com');
  perform nsp_link_ambassador_user((john ->> 'id')::uuid, fake_user, owner_id);
  perform set_config('request.jwt.claims', json_build_object('sub', fake_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  r := nsp_ambassador_dashboard(null);
  insert into t_results (check_name, expected, actual, pass) values
    ('Ambassador dashboard loads own data', 'John', r -> 'profile' ->> 'first_name', r -> 'profile' ->> 'first_name' = 'John'),
    ('Dashboard MQR matches statement', '90000', r ->> 'qualified_cents', (r ->> 'qualified_cents')::int = 90000),
    ('Customer names reduced to first + initial', 'Sarah L.',
      (select string_agg(c ->> 'label', ',') from jsonb_array_elements(r -> 'customers') c),
      exists (select 1 from jsonb_array_elements(r -> 'customers') c where c ->> 'label' = 'Sarah L.')
      and not (r::text like '%sarah.lee@example.com%') and not (r::text like '%555-0199%')),
    ('No other ambassador data in dashboard', 'no Ret/New customers', 'checked',
      not (r::text like '%Ret1%') and not (r::text like '%New1%')),
    ('Ambassador cannot read customers table', '0 rows', (select count(*)::text from nsp_customers),
      (select count(*) from nsp_customers) = 0),
    ('Ambassador cannot read orders table', '0 rows', (select count(*)::text from nsp_orders),
      (select count(*) from nsp_orders) = 0),
    ('Ambassador cannot read audit log', '0 rows', (select count(*)::text from nsp_audit),
      (select count(*) from nsp_audit) = 0);
  begin
    perform nsp_find_customers('', 10);
    err := 'no error';
  exception when others then err := sqlerrm; end;
  insert into t_results (check_name, expected, actual, pass) values
    ('Ambassador blocked from owner functions', 'Owner access required', err, err = 'Owner access required');
  begin
    insert into nsp_orders (customer_id, order_date) values (sarah, today);
    err := 'no error';
  exception when others then err := sqlerrm; end;
  insert into t_results (check_name, expected, actual, pass) values
    ('Ambassador cannot write orders directly', 'permission denied', err, err like 'permission denied%');
  begin
    insert into nsp_user_roles (user_id, role) values (fake_user, 'owner');
    err := 'no error';
  exception when others then err := sqlerrm; end;
  insert into t_results (check_name, expected, actual, pass) values
    ('Ambassador cannot grant themselves owner', 'permission denied', err, err like 'permission denied%');
  execute 'reset role';
end
$test$;

select n, case when pass then 'PASS' else 'FAIL' end as result, check_name, expected, actual from t_results order by n;
rollback;
