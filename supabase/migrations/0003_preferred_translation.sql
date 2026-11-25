-- Each member chooses their Bible translation. Public-domain translations only.
alter table public.profiles
  add column if not exists preferred_translation text not null default 'KJV'
  check (preferred_translation in ('KJV', 'BSB', 'WEB'));
