-- Owner-scoped idempotency key for trip draft creates.
-- Replaying the same (user_id, client_request_key) returns the original draft.

alter table trips.trip_drafts
  add column if not exists client_request_key text null;

alter table trips.trip_drafts
  drop constraint if exists trip_drafts_client_request_key_len;

alter table trips.trip_drafts
  add constraint trip_drafts_client_request_key_len
  check (
    client_request_key is null
    or (
      char_length(client_request_key) >= 1
      and char_length(client_request_key) <= 128
    )
  );

create unique index if not exists idx_trip_drafts_owner_client_request_key
  on trips.trip_drafts (user_id, client_request_key)
  where client_request_key is not null;
