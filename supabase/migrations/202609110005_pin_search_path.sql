-- Security advisor: pin search_path on helper functions.
alter function public.nsp_audit_append_only() set search_path = public;
alter function public.nsp_person_label(text, text) set search_path = public;
alter function public.nsp_tier(jsonb, bigint) set search_path = public;
alter function public.nsp_norm_email(text) set search_path = public;
alter function public.nsp_norm_phone(text) set search_path = public;
alter function public.nsp_month(date) set search_path = public;
