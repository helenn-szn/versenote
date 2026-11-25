-- Sermon recordings and AI transcripts, private to the member who made them.
create table if not exists public.note_recordings (
  id               uuid primary key default gen_random_uuid(),
  note_id          uuid not null references public.notes (id) on delete cascade,
  user_id          uuid not null default auth.uid()
                   references public.profiles (id) on delete cascade,
  storage_path     text check (char_length(storage_path) <= 300),       -- null if the file was too big to keep
  file_name        text check (char_length(file_name) <= 200),
  mime_type        text check (char_length(mime_type) <= 100),
  size_bytes       bigint check (size_bytes >= 0),
  duration_seconds integer check (duration_seconds >= 0),
  transcript       text check (char_length(transcript) <= 300000),
  transcript_lang  text check (char_length(transcript_lang) <= 10),
  created_at       timestamptz not null default now()
);
create index if not exists note_recordings_note_idx on public.note_recordings (note_id);
create index if not exists note_recordings_user_idx on public.note_recordings (user_id);

alter table public.note_recordings enable row level security;

drop policy if exists "own recordings: all" on public.note_recordings;
create policy "own recordings: all" on public.note_recordings for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
  );

revoke all on public.note_recordings from anon;
grant select, insert, update, delete on public.note_recordings to authenticated;

-- "What did I miss?" suggestions are AI outputs too.
alter table public.note_ai_outputs drop constraint if exists note_ai_outputs_kind_check;
alter table public.note_ai_outputs add constraint note_ai_outputs_kind_check
  check (kind in ('summary', 'takeaways', 'reflection_questions', 'organized', 'gaps'));

-- Private storage: each member can only touch files under their own user id folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recordings', 'recordings', false, 52428800, array['audio/*', 'video/*'])
on conflict (id) do nothing;

drop policy if exists "recordings: own read" on storage.objects;
drop policy if exists "recordings: own insert" on storage.objects;
drop policy if exists "recordings: own delete" on storage.objects;
create policy "recordings: own read" on storage.objects for select to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "recordings: own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "recordings: own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
