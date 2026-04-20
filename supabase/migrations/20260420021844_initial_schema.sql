-- IT Passport app schema.
-- Questions are served as static JSON from the Next.js bundle. This DB is
-- only for writable state: AI explanation cache now, user data later.

create table public.ai_explanations (
  question_id text not null,
  model text not null,
  explanation text not null,
  created_at timestamptz not null default now(),
  primary key (question_id, model)
);

-- anon role can read cached explanations (so the browser can show previously-
-- generated explanations instantly). All writes go through the server-side
-- API route using the service_role key, which bypasses RLS.
alter table public.ai_explanations enable row level security;

create policy "anon can read ai explanations"
  on public.ai_explanations
  for select
  to anon
  using (true);
