-- Local-only fulfilment: add 'delivery' (local drop-off / meet-up) alongside
-- 'pickup'. 'ship' stays valid so earlier requests and any future shipped
-- order remain recordable; the public order form no longer offers it.
alter table public.nsp_orders drop constraint nsp_orders_fulfillment_method_check;
alter table public.nsp_orders add constraint nsp_orders_fulfillment_method_check
  check (fulfillment_method in ('ship', 'pickup', 'delivery'));
alter table public.nsp_requests drop constraint nsp_requests_fulfillment_method_check;
alter table public.nsp_requests add constraint nsp_requests_fulfillment_method_check
  check (fulfillment_method in ('ship', 'pickup', 'delivery'));
