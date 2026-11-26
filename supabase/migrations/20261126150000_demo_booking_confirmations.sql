-- Existing demo bookings start with all applicable services pending.
alter table bookings.demo_trip_bookings
  add column if not exists confirmations jsonb not null default '{}'::jsonb
  check (jsonb_typeof(confirmations) = 'object');
