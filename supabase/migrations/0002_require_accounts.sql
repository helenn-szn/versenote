-- =====================================================================
-- VerseNote: require an account for every feature.
--
-- Visitors who are not signed in can only see a sermon's title,
-- preacher and date (for the QR landing page: "Sign up to follow ...").
-- Everything else - outline, scriptures, published answers, the join
-- counter and the Bible text - needs a signed-in account.
--
-- Keep "Allow anonymous sign-ins" OFF in Supabase Authentication settings.
-- =====================================================================

-- Signed-in users only
revoke execute on function public.get_shared_sermon(text)  from anon;
revoke execute on function public.record_sermon_join(text) from anon;
revoke execute on function public.get_public_answers(text) from anon;

revoke select on public.bible_verses from anon;
drop policy if exists "bible: public read" on public.bible_verses;
create policy "bible: signed-in read" on public.bible_verses
  for select to authenticated using (true);

-- Minimal preview for the QR landing page (no outline, no scriptures)
create or replace function public.get_sermon_preview(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
           'title',         s.title,
           'preacher_name', s.preacher_name,
           'sermon_date',   s.sermon_date)
    from public.sermons s
   where s.slug = p_slug and s.is_active;
$$;

revoke execute on function public.get_sermon_preview(text) from public, anon, authenticated;
grant execute on function public.get_sermon_preview(text) to anon, authenticated;
