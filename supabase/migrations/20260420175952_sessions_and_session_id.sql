-- Sessions: a batch of attempts (practice / exam / review).
-- Nullable session_id on attempts remains for ad-hoc single-question answers.
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('practice', 'exam', 'review')),
  source jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  question_count int,
  correct_count int
);

create index sessions_user_idx on public.sessions (user_id, started_at desc);

alter table public.sessions enable row level security;

create policy "users own sessions - select"
  on public.sessions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users own sessions - insert"
  on public.sessions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users own sessions - update"
  on public.sessions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Rename exam_session_id -> session_id, add FK to sessions.
alter table public.attempts rename column exam_session_id to session_id;

alter table public.attempts
  add constraint attempts_session_fk
  foreign key (session_id) references public.sessions(id) on delete cascade;

-- Idempotency guard for the sync API: same user + question + timestamp = dupe.
alter table public.attempts
  add constraint attempts_dedup_unique
  unique (user_id, question_id, attempted_at);
