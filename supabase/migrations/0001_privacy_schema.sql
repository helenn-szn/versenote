-- =====================================================================
-- VerseNote: privacy-first database schema (Supabase / Postgres)
--
-- Principles
--   1. Personal notes, AI outputs and question authorship are readable
--      ONLY by their owner. Row-level security (RLS) enforces this in
--      the database, so a bug in the API cannot leak them.
--   2. Public data (shared sermons, published answers) is never read
--      from tables directly by visitors. It goes through narrow
--      functions that return only what is meant to be public, so
--      nobody can list or scrape every sermon.
--   3. We store as little as possible: no email copies, no names unless
--      the user chooses one, no record of who opened a shared sermon.
--   4. Deleting an account deletes everything that belongs to it.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- Profiles: one per account. Email stays in auth.users and is NOT copied.
-- ---------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text check (char_length(display_name) between 1 and 60),
  created_at    timestamptz not null default now()
);

-- Create an empty profile when someone signs up (no name, no email).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------
-- Sermons shared by pastors (link / QR code)
-- ---------------------------------------------------------------------
create table public.sermons (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid()
                  references public.profiles (id) on delete cascade,
  slug            text not null unique
                  default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)
                  check (slug ~ '^[a-z0-9-]{6,60}$'),
  title           text not null check (char_length(title) between 1 and 200),
  preacher_name   text check (char_length(preacher_name) <= 100),
  sermon_date     date,
  outline         text check (char_length(outline) <= 20000),
  share_mode      text not null default 'full'
                  check (share_mode in ('full', 'scriptures_only')),
  is_active       boolean not null default true,   -- pastor can switch the link off
  questions_open  boolean not null default true,   -- pastor can close questions
  recording_url   text check (recording_url ~ '^https://'),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index sermons_owner_idx on public.sermons (owner_id);
create trigger sermons_updated_at before update on public.sermons
  for each row execute function public.set_updated_at();

create table public.sermon_scriptures (
  id           uuid primary key default gen_random_uuid(),
  sermon_id    uuid not null references public.sermons (id) on delete cascade,
  position     int  not null check (position >= 0),
  reference    text not null check (char_length(reference) <= 60),   -- e.g. 'Genesis 1:1'
  translation  text not null check (char_length(translation) <= 20), -- e.g. 'KJV'
  verse_text   text not null check (char_length(verse_text) <= 10000), -- from the Bible source, never AI
  unique (sermon_id, position)
);

-- Anonymous join counter: a number only, never who joined.
create table public.sermon_join_counts (
  sermon_id  uuid primary key references public.sermons (id) on delete cascade,
  joins      int not null default 0
);


-- ---------------------------------------------------------------------
-- Personal notes (private to the member)
-- ---------------------------------------------------------------------
create table public.notes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid()
                 references public.profiles (id) on delete cascade,
  sermon_id      uuid references public.sermons (id) on delete set null, -- note survives if sermon is deleted
  title          text check (char_length(title) <= 200),
  preacher_name  text check (char_length(preacher_name) <= 100),
  sermon_date    date,
  content        jsonb not null default '{}'::jsonb,  -- rich-text document
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index notes_user_idx on public.notes (user_id, updated_at desc);
create index notes_sermon_idx on public.notes (sermon_id);
create trigger notes_updated_at before update on public.notes
  for each row execute function public.set_updated_at();

-- AI outputs are stored separately so the original notes are never overwritten.
create table public.note_ai_outputs (
  id          uuid primary key default gen_random_uuid(),
  note_id     uuid not null references public.notes (id) on delete cascade,
  user_id     uuid not null default auth.uid()
              references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('summary', 'takeaways', 'reflection_questions', 'organized')),
  content     text not null check (char_length(content) <= 20000),
  model       text,
  created_at  timestamptz not null default now()
);
create index note_ai_outputs_note_idx on public.note_ai_outputs (note_id);
create index note_ai_outputs_user_idx on public.note_ai_outputs (user_id);


-- ---------------------------------------------------------------------
-- Ask the preacher
--
-- Who asked is stored in a SEPARATE table that only the asker can read.
-- The preacher sees the question text, plus a name only if the asker
-- chose to show one. Anonymous really means anonymous: the preacher's
-- account cannot read the asker's ID, even with a direct query.
-- ---------------------------------------------------------------------
create table public.sermon_questions (
  id          uuid primary key default gen_random_uuid(),
  sermon_id   uuid not null references public.sermons (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 1000),
  shown_name  text check (char_length(shown_name) <= 60),  -- null = anonymous
  status      text not null default 'open' check (status in ('open', 'answered', 'hidden')),
  created_at  timestamptz not null default now()
);
create index sermon_questions_sermon_idx on public.sermon_questions (sermon_id, created_at);

create table public.question_askers (
  question_id  uuid primary key references public.sermon_questions (id) on delete cascade,
  asker_id     uuid not null references public.profiles (id) on delete cascade
);
create index question_askers_asker_idx on public.question_askers (asker_id);

-- When an asker's account is deleted, delete their questions too.
create or replace function public.delete_orphaned_question()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.sermon_questions where id = old.question_id;
  return old;
end;
$$;

create trigger question_askers_cleanup
  after delete on public.question_askers
  for each row execute function public.delete_orphaned_question();

create table public.question_answers (
  question_id  uuid primary key references public.sermon_questions (id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 5000),
  is_public    boolean not null default false,   -- preacher chooses to publish to everyone with the link
  answered_at  timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger question_answers_updated_at before update on public.question_answers
  for each row execute function public.set_updated_at();

-- Mark a question answered when an answer is written.
create or replace function public.mark_question_answered()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.sermon_questions
     set status = 'answered'
   where id = new.question_id and status = 'open';
  return new;
end;
$$;

create trigger question_answers_mark_answered
  after insert on public.question_answers
  for each row execute function public.mark_question_answered();


-- ---------------------------------------------------------------------
-- Bible verse cache (public text, read-only for clients)
-- ---------------------------------------------------------------------
create table public.bible_verses (
  translation  text not null,
  book         text not null,
  chapter      int  not null,
  verse        int  not null,
  text         text not null,
  primary key (translation, book, chapter, verse)
);


-- =====================================================================
-- Row-level security
-- =====================================================================
alter table public.profiles            enable row level security;
alter table public.sermons             enable row level security;
alter table public.sermon_scriptures   enable row level security;
alter table public.sermon_join_counts  enable row level security;
alter table public.notes               enable row level security;
alter table public.note_ai_outputs     enable row level security;
alter table public.sermon_questions    enable row level security;
alter table public.question_askers     enable row level security;
alter table public.question_answers    enable row level security;
alter table public.bible_verses        enable row level security;

-- Profiles: you can see and edit only your own.
create policy "own profile: read"   on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "own profile: update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Sermons: the pastor who owns it manages it. Nobody else reads the table directly.
create policy "own sermons: all" on public.sermons for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy "own sermon scriptures: all" on public.sermon_scriptures for all to authenticated
  using (exists (select 1 from public.sermons s
                 where s.id = sermon_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.sermons s
                      where s.id = sermon_id and s.owner_id = (select auth.uid())));

create policy "own sermon join count: read" on public.sermon_join_counts for select to authenticated
  using (exists (select 1 from public.sermons s
                 where s.id = sermon_id and s.owner_id = (select auth.uid())));

-- Notes and AI outputs: owner only, for every operation.
create policy "own notes: all" on public.notes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own ai outputs: all" on public.note_ai_outputs for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.notes n
                          where n.id = note_id and n.user_id = (select auth.uid())));

-- Questions: the preacher sees questions on their sermons; askers see their own.
create policy "preacher: read questions" on public.sermon_questions for select to authenticated
  using (exists (select 1 from public.sermons s
                 where s.id = sermon_id and s.owner_id = (select auth.uid())));
create policy "preacher: update question status" on public.sermon_questions for update to authenticated
  using (exists (select 1 from public.sermons s
                 where s.id = sermon_id and s.owner_id = (select auth.uid())));
create policy "preacher: delete questions" on public.sermon_questions for delete to authenticated
  using (exists (select 1 from public.sermons s
                 where s.id = sermon_id and s.owner_id = (select auth.uid())));
create policy "asker: read own questions" on public.sermon_questions for select to authenticated
  using (exists (select 1 from public.question_askers qa
                 where qa.question_id = id and qa.asker_id = (select auth.uid())));
create policy "asker: delete own questions" on public.sermon_questions for delete to authenticated
  using (exists (select 1 from public.question_askers qa
                 where qa.question_id = id and qa.asker_id = (select auth.uid())));

-- Who asked: only the asker can ever read this row.
create policy "asker: read own authorship" on public.question_askers for select to authenticated
  using (asker_id = (select auth.uid()));

-- Answers: the preacher writes them; the asker can read the answer to their question.
create policy "preacher: manage answers" on public.question_answers for all to authenticated
  using (exists (select 1 from public.sermon_questions q
                 join public.sermons s on s.id = q.sermon_id
                 where q.id = question_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.sermon_questions q
                      join public.sermons s on s.id = q.sermon_id
                      where q.id = question_id and s.owner_id = (select auth.uid())));
create policy "asker: read answer" on public.question_answers for select to authenticated
  using (exists (select 1 from public.question_askers qa
                 where qa.question_id = question_answers.question_id
                   and qa.asker_id = (select auth.uid())));

-- Bible text is public.
create policy "bible: public read" on public.bible_verses for select to anon, authenticated
  using (true);


-- =====================================================================
-- Table privileges (defence in depth on top of RLS)
-- =====================================================================
revoke all on all tables in schema public from anon;
grant select on public.bible_verses to anon;

revoke all on all tables in schema public from authenticated;
grant select, update                 on public.profiles           to authenticated;
grant select, insert, update, delete on public.sermons            to authenticated;
grant select, insert, update, delete on public.sermon_scriptures  to authenticated;
grant select                         on public.sermon_join_counts to authenticated;
grant select, insert, update, delete on public.notes              to authenticated;
grant select, insert, update, delete on public.note_ai_outputs    to authenticated;
grant select, delete                 on public.sermon_questions   to authenticated;
grant update (status)                on public.sermon_questions   to authenticated; -- preacher can't edit the question text
grant select                         on public.question_askers    to authenticated;
grant select, insert, update, delete on public.question_answers   to authenticated;
grant select                         on public.bible_verses       to authenticated;


-- =====================================================================
-- Public functions (the only way visitors read shared content)
-- =====================================================================

-- Open a shared sermon by its link. Returns null if the link is off.
create or replace function public.get_shared_sermon(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
           'id',             s.id,
           'slug',           s.slug,
           'title',          s.title,
           'preacher_name',  s.preacher_name,
           'sermon_date',    s.sermon_date,
           'outline',        case when s.share_mode = 'full' then s.outline end,
           'recording_url',  s.recording_url,
           'questions_open', s.questions_open,
           'scriptures',     coalesce((
               select jsonb_agg(jsonb_build_object(
                        'position',    ss.position,
                        'reference',   ss.reference,
                        'translation', ss.translation,
                        'verse_text',  ss.verse_text) order by ss.position)
                 from public.sermon_scriptures ss
                where ss.sermon_id = s.id), '[]'::jsonb))
    from public.sermons s
   where s.slug = p_slug and s.is_active;
$$;

-- Count a visit without recording who it was.
create or replace function public.record_sermon_join(p_slug text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.sermon_join_counts (sermon_id, joins)
  select s.id, 1 from public.sermons s where s.slug = p_slug and s.is_active
  on conflict (sermon_id) do update
    set joins = public.sermon_join_counts.joins + 1;
$$;

-- Ask the preacher. Signed-in users only (Supabase anonymous sign-in counts).
create or replace function public.ask_question(p_slug text, p_body text, p_show_name boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid        uuid := auth.uid();
  v_sermon_id  uuid;
  v_name       text;
  v_question   uuid;
begin
  if v_uid is null then
    raise exception 'Sign in to ask a question';
  end if;

  select s.id into v_sermon_id
    from public.sermons s
   where s.slug = p_slug and s.is_active and s.questions_open;
  if v_sermon_id is null then
    raise exception 'Questions are closed for this sermon';
  end if;

  -- Simple spam limit: 5 questions per person per sermon.
  if (select count(*) from public.question_askers qa
        join public.sermon_questions q on q.id = qa.question_id
       where qa.asker_id = v_uid and q.sermon_id = v_sermon_id) >= 5 then
    raise exception 'You have reached the question limit for this sermon';
  end if;

  if p_show_name then
    select p.display_name into v_name from public.profiles p where p.id = v_uid;
  end if;

  insert into public.sermon_questions (sermon_id, body, shown_name)
  values (v_sermon_id, btrim(p_body), v_name)
  returning id into v_question;

  insert into public.question_askers (question_id, asker_id) values (v_question, v_uid);
  return v_question;
end;
$$;

-- Answers the preacher chose to publish. No names, ever.
create or replace function public.get_public_answers(p_slug text)
returns table (question text, answer text, answered_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select q.body, a.body, a.answered_at
    from public.sermons s
    join public.sermon_questions q on q.sermon_id = s.id
    join public.question_answers a on a.question_id = q.id
   where s.slug = p_slug and s.is_active
     and a.is_public and q.status = 'answered'
   order by a.answered_at;
$$;

-- Lock down who can call what.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.get_shared_sermon(text)            to anon, authenticated;
grant execute on function public.record_sermon_join(text)           to anon, authenticated;
grant execute on function public.get_public_answers(text)           to anon, authenticated;
grant execute on function public.ask_question(text, text, boolean)  to authenticated;
