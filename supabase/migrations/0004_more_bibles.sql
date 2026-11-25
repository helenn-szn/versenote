-- Bibles in French, Spanish, Portuguese, Swahili, Korean and Chinese.
alter table public.profiles drop constraint if exists profiles_preferred_translation_check;
alter table public.profiles
  add constraint profiles_preferred_translation_check
  check (preferred_translation in ('KJV', 'BSB', 'WEB', 'LSG', 'RV1909', 'BLIVRE', 'SWC', 'KRV', 'CUVS'));
