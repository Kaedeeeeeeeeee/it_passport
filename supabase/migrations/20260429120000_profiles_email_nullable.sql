-- Apple Sign in may withhold email: it sends email ONLY on first-ever
-- login per (Apple ID × app) pair. If our trigger fails on that first
-- login (e.g. NOT NULL constraint violation, transient DB error), Apple
-- still records "this user has signed in" — so subsequent attempts come
-- back with email = null. Combined with the prior `email NOT NULL`
-- constraint, every Apple user got "Database error saving new user".
--
-- Drop the constraint. Apple users who hide their email or whose first
-- attempt failed will simply have profile.email = null until they
-- supply one through account settings later. Web/Stripe users still
-- always have email because magic-link / Google flows never miss it.

alter table public.profiles alter column email drop not null;
