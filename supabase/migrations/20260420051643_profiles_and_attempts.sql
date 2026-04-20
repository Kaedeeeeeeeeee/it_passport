-- Profiles (1:1 with auth.users) + Stripe subscription state.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  stripe_customer_id text unique,
  subscription_status text not null default 'free'
    check (subscription_status in ('free', 'trialing', 'active', 'past_due', 'canceled')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Attempts (user-scoped; append-only log of every answer).
create table public.attempts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  answer text not null,
  correct boolean not null,
  exam_session_id uuid,
  attempted_at timestamptz not null default now()
);
create index attempts_user_time_idx on public.attempts (user_id, attempted_at desc);
create index attempts_user_question_idx on public.attempts (user_id, question_id);

alter table public.attempts enable row level security;

create policy "users own attempts - select"
  on public.attempts for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users own attempts - insert"
  on public.attempts for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Auto-create profile when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper to auto-bump updated_at.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
