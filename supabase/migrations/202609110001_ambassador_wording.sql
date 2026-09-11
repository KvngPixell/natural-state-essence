-- Partner program renamed to Ambassador program (11 Sep 2026).
-- Only the user-facing error messages change. Table, column and function
-- names stay as they are (nsp_partners, partner_id, nsp_partner_summary...)
-- because renaming them would break existing code for no visible benefit.
do $$
declare r record; d text;
begin
  for r in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('nsp_partner_summary', 'nsp_save_partner', 'nsp_record_order')
  loop
    d := pg_get_functiondef(r.oid);
    d := replace(d, 'Approved partner access required', 'Approved ambassador access required');
    d := replace(d, 'Active partner with agreed terms required', 'Active ambassador with agreed terms required');
    d := replace(d, '''Partner not found''', '''Ambassador not found''');
    execute d;
  end loop;
end $$;
