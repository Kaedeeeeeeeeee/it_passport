-- Persist each user's chosen UI language so the preference follows them across
-- devices/browsers. Nullable: a NULL value means "no explicit preference yet"
-- and we fall back to the NEXT_LOCALE cookie / Accept-Language detection.

alter table public.profiles add column preferred_language text;
