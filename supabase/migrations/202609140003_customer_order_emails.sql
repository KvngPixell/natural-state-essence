-- Customer-facing order email tracking.
--
-- Kept separate from email_status (which tracks the internal notice to us) so a
-- failure to reach the customer is never mistaken for a failure to reach us,
-- and so the Control Center can show, per order, whether the person actually
-- heard back.
alter table nsp_requests
  add column if not exists receipt_status       text,
  add column if not exists receipt_id           text,
  add column if not exists confirmation_status  text,
  add column if not exists confirmation_id      text,
  add column if not exists confirmation_sent_at timestamptz;

comment on column nsp_requests.receipt_status is
  'Instant "we have your request" email to the customer: null | not_configured | accepted | failed.';
comment on column nsp_requests.confirmation_status is
  'Order-accepted confirmation to the customer: null | not_configured | accepted | failed.';
