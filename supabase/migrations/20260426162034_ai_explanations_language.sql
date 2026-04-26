-- AI explanations are now generated in the user's UI language (ja / zh / en),
-- so the cache key needs a `language` dimension. Existing rows are assumed
-- to be Japanese (the original behavior) — they get backfilled to 'ja'.

alter table public.ai_explanations
  add column language text not null default 'ja';

alter table public.ai_explanations
  drop constraint ai_explanations_pkey;

alter table public.ai_explanations
  add primary key (question_id, model, language);
