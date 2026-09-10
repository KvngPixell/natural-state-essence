-- Natural State portal v1. Apply once in the connected Supabase/Cloud database.
create table public.nsp_admins (user_id uuid primary key references auth.users(id));
create function public.nsp_is_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from nsp_admins where user_id=auth.uid())
$$;
create table public.nsp_partners (
 id uuid primary key default gen_random_uuid(), user_id uuid unique references auth.users(id),
 name text not null, email text not null unique, code text not null unique check(code ~ '^[A-Z0-9_-]{3,32}$'),
 status text not null default 'pending' check(status in ('pending','active','suspended')),
 rate_bps integer check(rate_bps between 0 and 5000), terms text,
 hold_days integer not null default 30 check(hold_days between 0 and 180),
 created_at timestamptz not null default now()
);
create function public.nsp_owns(p uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from nsp_partners where id=p and user_id=auth.uid() and status='active')
$$;
create table public.nsp_requests (
 id uuid primary key, kind text not null check(kind in ('product','coa','application','availability')),
 name text not null, email text not null, product text, lot text, message text not null,
 referral_code text, partner_id uuid references nsp_partners(id), created_at timestamptz not null default now(),
 email_status text not null default 'pending' check(email_status in ('pending','accepted','failed','not_configured')),
 email_id text, status text not null default 'new' check(status in ('new','reviewed','closed'))
);
create table public.nsp_orders (
 id uuid primary key default gen_random_uuid(), partner_id uuid not null references nsp_partners(id),
 reference text not null unique check(length(reference) between 1 and 120),
 product_summary text not null, net_cents integer not null check(net_cents between 1 and 100000000),
 refunded_cents integer not null default 0 check(refunded_cents>=0 and refunded_cents<=net_cents),
 rate_bps integer not null, terms_snapshot text not null,
 paid_at timestamptz not null, created_at timestamptz not null default now()
);
create table public.nsp_payouts (
 id uuid primary key default gen_random_uuid(), partner_id uuid not null references nsp_partners(id),
 amount_cents integer not null check(amount_cents>0), reference text not null unique,
 created_at timestamptz not null default now()
);
create table public.nsp_commissions (
 id uuid primary key default gen_random_uuid(), partner_id uuid not null references nsp_partners(id),
 order_id uuid not null references nsp_orders(id), kind text not null check(kind in ('sale','refund')),
 cents integer not null, available_at timestamptz not null, approved boolean not null default false,
 payout_id uuid references nsp_payouts(id), adjustment_ref text unique,
 created_at timestamptz not null default now()
);
create unique index nsp_one_sale_credit on nsp_commissions(order_id) where kind='sale';
create table public.nsp_audit (
 id bigint generated always as identity primary key, actor uuid, action text not null,
 detail jsonb not null, created_at timestamptz not null default now()
);
create table public.nsp_rate_limits (key text primary key, window_at timestamptz not null, hits integer not null);
-- Deny direct mutations. All mutations below enforce authorization, validation and atomic accounting.
do $$ declare t text; begin
 foreach t in array array['nsp_admins','nsp_partners','nsp_requests','nsp_orders','nsp_payouts','nsp_commissions','nsp_audit','nsp_rate_limits'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
grant select on nsp_partners,nsp_requests,nsp_orders,nsp_payouts,nsp_commissions,nsp_audit to authenticated;
create policy partner_read on nsp_partners for select to authenticated using(nsp_is_admin() or (user_id=auth.uid() and status='active'));
create policy requests_admin on nsp_requests for select to authenticated using(nsp_is_admin());
-- Raw order/payment references and raw payout references stay owner-only.
create policy orders_admin on nsp_orders for select to authenticated using(nsp_is_admin());
create policy payouts_admin on nsp_payouts for select to authenticated using(nsp_is_admin());
create policy commissions_read on nsp_commissions for select to authenticated using(nsp_is_admin());
create policy audit_admin on nsp_audit for select to authenticated using(nsp_is_admin());

create function public.nsp_partner_summary() returns jsonb language plpgsql security definer set search_path=public as $$
declare p nsp_partners; result jsonb;
begin
 select * into p from nsp_partners where user_id=auth.uid() and status='active';
 if not found then raise exception 'Approved partner access required'; end if;
 select jsonb_build_object(
 'partner',jsonb_build_object('id',p.id,'name',p.name,'code',p.code,'rate_bps',p.rate_bps,'terms',p.terms,'hold_days',p.hold_days),
 'orders',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'reference','NS-'||upper(left(o.id::text,8)),'net_cents',o.net_cents,'refunded_cents',o.refunded_cents,'rate_bps',o.rate_bps,'paid_at',o.paid_at) order by o.paid_at desc) from nsp_orders o where o.partner_id=p.id),'[]'::jsonb),
 'commissions',coalesce((select jsonb_agg(to_jsonb(c)-'adjustment_ref') from nsp_commissions c where c.partner_id=p.id),'[]'::jsonb),
 'payouts',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'amount_cents',x.amount_cents,'created_at',x.created_at) order by x.created_at desc) from nsp_payouts x where x.partner_id=p.id),'[]'::jsonb)
 ) into result;
 return result;
end $$;
create function public.nsp_save_partner(p_id uuid,p_name text,p_email text,p_code text,p_status text,p_rate integer,p_terms text,p_hold integer)
returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
 if not nsp_is_admin() then raise exception 'Owner access required'; end if;
 if length(trim(p_name)) not between 1 and 100 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Valid name and email required'; end if;
 if p_id is null then
 insert into nsp_partners(name,email,code,status,rate_bps,terms,hold_days)
 values(trim(p_name),lower(trim(p_email)),upper(trim(p_code)),p_status,p_rate,nullif(trim(p_terms),''),p_hold) returning id into result;
 else
 update nsp_partners set name=trim(p_name),code=upper(trim(p_code)),status=p_status,rate_bps=p_rate,terms=nullif(trim(p_terms),''),hold_days=p_hold where id=p_id returning id into result;
 if result is null then raise exception 'Partner not found'; end if;
 end if;
 insert into nsp_audit(actor,action,detail) values(auth.uid(),'save_partner',jsonb_build_object('partner',result));
 return result;
end $$;
create function public.nsp_record_order(p_partner uuid,p_reference text,p_products text,p_net integer,p_paid_at timestamptz)
returns uuid language plpgsql security definer set search_path=public as $$
declare p nsp_partners; oid uuid; amount integer;
begin
 if not nsp_is_admin() then raise exception 'Owner access required'; end if;
 select * into p from nsp_partners where id=p_partner for update;
 if not found or p.status<>'active' or p.rate_bps is null or p.terms is null then raise exception 'Active partner with agreed terms required'; end if;
 if length(trim(p_products)) not between 1 and 1000 or p_paid_at is null or p_paid_at>now() then raise exception 'Valid product summary and confirmed payment date required'; end if;
 insert into nsp_orders(partner_id,reference,product_summary,net_cents,rate_bps,terms_snapshot,paid_at)
 values(p.id,trim(p_reference),trim(p_products),p_net,p.rate_bps,p.terms,p_paid_at) returning id into oid;
 amount:=floor(p_net::numeric*p.rate_bps/10000)::integer;
 insert into nsp_commissions(partner_id,order_id,kind,cents,available_at) values(p.id,oid,'sale',amount,p_paid_at+make_interval(days=>p.hold_days));
 insert into nsp_audit(actor,action,detail) values(auth.uid(),'paid_order',jsonb_build_object('order',oid,'net_cents',p_net));
 return oid;
end $$;
create function public.nsp_refund(p_order uuid,p_total integer,p_reference text) returns void language plpgsql security definer set search_path=public as $$
declare o nsp_orders; prior integer; revised integer; pid uuid;
begin
 if not nsp_is_admin() then raise exception 'Owner access required'; end if;
 select partner_id into pid from nsp_orders where id=p_order;
 perform 1 from nsp_partners where id=pid for update;
 select * into o from nsp_orders where id=p_order for update;
 if not found or p_total<=o.refunded_cents or p_total>o.net_cents or length(trim(p_reference)) not between 1 and 120 then raise exception 'Refund must increase cumulative refunded merchandise amount, up to order total'; end if;
 select coalesce(sum(cents),0) into prior from nsp_commissions where order_id=o.id;
 revised:=floor((o.net_cents-p_total)::numeric*o.rate_bps/10000)::integer;
 update nsp_orders set refunded_cents=p_total where id=o.id;
 insert into nsp_commissions(partner_id,order_id,kind,cents,available_at,approved,adjustment_ref) values(o.partner_id,o.id,'refund',revised-prior,now(),true,trim(p_reference));
 insert into nsp_audit(actor,action,detail) values(auth.uid(),'refund',jsonb_build_object('order',o.id,'total_refunded',p_total));
end $$;
create function public.nsp_approve(p_partner uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if not nsp_is_admin() then raise exception 'Owner access required'; end if;
 perform 1 from nsp_partners where id=p_partner and rate_bps is not null and terms is not null for update;
 if not found then raise exception 'Agreed terms required'; end if;
 update nsp_commissions set approved=true where partner_id=p_partner and payout_id is null and available_at<=now();
 insert into nsp_audit(actor,action,detail) values(auth.uid(),'approve_commissions',jsonb_build_object('partner',p_partner));
end $$;
create function public.nsp_record_payout(p_partner uuid,p_expected integer,p_reference text) returns uuid language plpgsql security definer set search_path=public as $$
declare total integer; result uuid;
begin
 if not nsp_is_admin() then raise exception 'Owner access required'; end if;
 perform 1 from nsp_partners where id=p_partner for update;
 if length(trim(p_reference)) not between 1 and 120 then raise exception 'Payment reference required'; end if;
 select coalesce(sum(cents),0) into total from nsp_commissions where partner_id=p_partner and payout_id is null and approved and available_at<=now();
 if total<=0 or total<>p_expected then raise exception 'Payable amount changed or is not positive; refresh before recording'; end if;
 insert into nsp_payouts(partner_id,amount_cents,reference) values(p_partner,total,trim(p_reference)) returning id into result;
 update nsp_commissions set payout_id=result where partner_id=p_partner and payout_id is null and approved and available_at<=now();
 insert into nsp_audit(actor,action,detail) values(auth.uid(),'record_payout',jsonb_build_object('payout',result,'cents',total));
 return result;
end $$;
-- Server-only public submission: atomic throttle + deduplication; no direct anonymous table access.
create function public.nsp_submit(p_body jsonb,p_key text) returns uuid language plpgsql security definer set search_path=public as $$
declare rid uuid:=(p_body->>'id')::uuid; count integer; pid uuid;
begin
 insert into nsp_rate_limits(key,window_at,hits) values(p_key,now(),1)
 on conflict(key) do update set hits=case when nsp_rate_limits.window_at<now()-interval '1 hour' then 1 else nsp_rate_limits.hits+1 end,
 window_at=case when nsp_rate_limits.window_at<now()-interval '1 hour' then now() else nsp_rate_limits.window_at end returning hits into count;
 if count>10 then raise exception 'Too many requests; please try later'; end if;
 if exists(select 1 from nsp_requests where id=rid) then return rid; end if;
 select id into pid from nsp_partners where code=upper(p_body->>'referral_code') and status='active';
 insert into nsp_requests(id,kind,name,email,product,lot,message,referral_code,partner_id)
 values(rid,p_body->>'kind',p_body->>'name',lower(p_body->>'email'),p_body->>'product',p_body->>'lot',p_body->>'message',case when pid is not null then upper(p_body->>'referral_code') end,pid);
 return rid;
end $$;
create function public.nsp_request_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$
begin
 if not nsp_is_admin() then raise exception 'Owner access required'; end if;
 update nsp_requests set status=p_status where id=p_id;
 insert into nsp_audit(actor,action,detail) values(auth.uid(),'request_status',jsonb_build_object('id',p_id,'status',p_status));
end $$;
-- Explicit execution grants; PostgreSQL otherwise grants PUBLIC execute by default.
do $$ declare f record; begin
 for f in select oid::regprocedure as sig from pg_proc where pronamespace='public'::regnamespace and proname like 'nsp_%' loop
 execute format('revoke all on function %s from public,anon,authenticated',f.sig);
 execute format('grant execute on function %s to service_role',f.sig);
 end loop;
end $$;
grant execute on function nsp_is_admin(),nsp_owns(uuid),nsp_partner_summary(),nsp_save_partner(uuid,text,text,text,text,integer,text,integer),nsp_record_order(uuid,text,text,integer,timestamptz),nsp_refund(uuid,integer,text),nsp_approve(uuid),nsp_record_payout(uuid,integer,text),nsp_request_status(uuid,text) to authenticated;

grant usage, select on sequence public.nsp_audit_id_seq to service_role;
