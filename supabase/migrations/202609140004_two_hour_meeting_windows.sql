-- When the customer can actually meet.
--
-- Pickup and local delivery are arranged person to person, so knowing the
-- window up front saves a round of messages. Two-hour slots, and more than one
-- may be chosen: a single two-hour slot is often too tight to be useful, and a
-- couple of options usually settles a time in one message instead of three.

-- An earlier revision stored a single wide window; it never carried data.
alter table nsp_requests drop constraint if exists nsp_requests_preferred_window_check;
alter table nsp_requests drop column if exists preferred_window;

alter table nsp_requests add column if not exists preferred_windows text[];

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'nsp_requests_preferred_windows_check') then
    alter table nsp_requests
      add constraint nsp_requests_preferred_windows_check
      check (
        preferred_windows is null
        or (array_length(preferred_windows, 1) between 1 and 8
            and preferred_windows <@ array['07-09','09-11','11-13','13-15','15-17','17-19','19-21','21-23'])
      );
  end if;
end $$;

comment on column nsp_requests.preferred_windows is
  'Two-hour windows the customer can meet, as HH-HH keys in 24h local time. Empty means no preference given.';

-- Free text alongside the fixed slots: "only 30 minutes around lunch", "after 6
-- on Thursdays", "call before you set off". The slots cover the common case;
-- this covers everything else.
alter table nsp_requests add column if not exists availability_note text;

comment on column nsp_requests.availability_note is
  'Customer''s own words about when they can meet, for anything the two-hour slots cannot express.';

create or replace function nsp_submit(p_body jsonb, p_key text)
returns uuid language plpgsql security definer set search_path to 'public' as $fn$
declare
  rid uuid := (p_body ->> 'id')::uuid;
  cnt integer;
  code_in text := upper(nullif(trim(p_body ->> 'referral_code'), ''));
  visitor text := case when p_body ->> 'visitor_id' ~ '^[A-Za-z0-9-]{8,64}$' then p_body ->> 'visitor_id' end;
  pid uuid; src text; canon text;
  v_first text := nullif(trim(p_body ->> 'first_name'), '');
  v_last text := nullif(trim(p_body ->> 'last_name'), '');
  v_windows text[];
  v_note text := left(nullif(trim(p_body ->> 'availability_note'), ''), 400);
  full_name text;
begin
  insert into nsp_rate_limits (key, window_at, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when nsp_rate_limits.window_at < now() - interval '1 hour' then 1 else nsp_rate_limits.hits + 1 end,
    window_at = case when nsp_rate_limits.window_at < now() - interval '1 hour' then now() else nsp_rate_limits.window_at end
  returning hits into cnt;
  if cnt > 10 then raise exception 'Too many requests; please try later'; end if;
  if exists (select 1 from nsp_requests where id = rid) then return rid; end if;

  -- Keep only recognised slots, so an edited payload can never store junk.
  if jsonb_typeof(p_body -> 'preferred_windows') = 'array' then
    select array_agg(distinct w order by w) into v_windows
    from jsonb_array_elements_text(p_body -> 'preferred_windows') w
    where w in ('07-09','09-11','11-13','13-15','15-17','17-19','19-21','21-23');
  end if;

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
    fulfillment_method, research_ack, preferred_windows, availability_note)
  values (rid, p_body ->> 'kind', left(full_name, 100), left(v_first, 60), left(v_last, 60), lower(p_body ->> 'email'),
    left(nullif(trim(p_body ->> 'phone'), ''), 40), left(nullif(trim(p_body ->> 'city'), ''), 80),
    left(nullif(upper(trim(p_body ->> 'state')), ''), 40),
    p_body ->> 'product', p_body ->> 'lot', p_body ->> 'message', canon, pid, src, visitor,
    case when jsonb_typeof(p_body -> 'order_items') = 'array' then p_body -> 'order_items' end,
    nullif(p_body ->> 'payment_method', ''), nullif(trim(p_body ->> 'payment_other'), ''),
    nullif(p_body ->> 'fulfillment_method', ''), (p_body ->> 'research_ack')::boolean, v_windows, v_note);
  return rid;
end $fn$;
