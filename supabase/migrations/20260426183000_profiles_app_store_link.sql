-- Cross-platform subscription support: when a user buys Pro via the iOS app
-- (StoreKit 2 / Apple IAP), we store Apple's originalTransactionId here so
-- that App Store Server Notifications V2 can find the right profile to
-- update. Stripe-paid web users keep using stripe_customer_id; in v1 a user
-- has one, the other, or neither — never both simultaneously.

alter table public.profiles
  add column app_store_original_transaction_id text;

create unique index profiles_app_store_otid_idx
  on public.profiles (app_store_original_transaction_id)
  where app_store_original_transaction_id is not null;
