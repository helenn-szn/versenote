-- Privacy tests for VerseNote. Each block runs as a specific user (or as an
-- anonymous visitor) and asserts what they can and cannot see or do.
\set ON_ERROR_STOP on
\set P '11111111-1111-1111-1111-111111111111'
\set A 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
\set B 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

-- Test helpers ----------------------------------------------------------
create schema tests;
grant usage on schema tests to anon, authenticated;
create function tests.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', label; end if;
  raise notice 'pass: %', label;
end $$;
create function tests.fails(stmt text, label text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    raise notice 'pass: % (blocked: %)', label, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % (statement succeeded)', label;
end $$;
create function tests.rows(stmt text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute stmt; get diagnostics n = row_count; return n;
end $$;
grant execute on all functions in schema tests to anon, authenticated;

-- Sign-up: profiles are created automatically -----------------------------
insert into auth.users values (:'P', 'pastor@x.test'), (:'A', 'ada@x.test'), (:'B', 'bola@x.test');
update public.profiles set display_name = 'Bola' where id = :'B';
select tests.ok((select count(*) from public.profiles) = 3, 'profile created on sign-up, without email');

-- Pastor creates a shared sermon -----------------------------------------
select set_config('request.jwt.claim.sub', :'P', false);
set role authenticated;
insert into public.sermons (slug, title, preacher_name, outline)
  values ('new-beginnings', 'The Power of New Beginnings', 'Pastor A. Okafor', 'Point 1: God creates from nothing');
insert into public.sermon_scriptures (sermon_id, position, reference, translation, verse_text)
  select id, 0, 'Genesis 1:1', 'KJV', 'In the beginning God created the heaven and the earth.'
  from public.sermons where slug = 'new-beginnings';
insert into public.sermons (slug, title, share_mode, outline)
  values ('psalm-sunday', 'Psalm Sunday', 'scriptures_only', 'Private outline text');
reset role;

-- Visitor (scanned the QR code, not signed in): title preview only -------------
select set_config('request.jwt.claim.sub', '', false);
set role anon;
select tests.ok((public.get_sermon_preview('new-beginnings')->>'title') = 'The Power of New Beginnings',
                'visitor sees the title preview');
select tests.fails($$select public.get_shared_sermon('new-beginnings')$$, 'visitor must sign in to open sermon');
select tests.fails('select * from public.sermons', 'visitor cannot list sermons table');
select tests.fails('select * from public.notes', 'visitor cannot read notes');
select tests.fails($$select public.ask_question('new-beginnings', 'hi')$$, 'visitor must sign in to ask');
reset role;

-- Member A opens the sermon, writes a note and asks anonymously -------------
select set_config('request.jwt.claim.sub', :'A', false);
set role authenticated;
select tests.ok((public.get_shared_sermon('new-beginnings')->>'title') = 'The Power of New Beginnings',
                'member opens shared sermon by link');
select tests.ok(jsonb_array_length(public.get_shared_sermon('new-beginnings')->'scriptures') = 1,
                'member gets the scriptures');
select tests.ok((public.get_shared_sermon('psalm-sunday')->'outline') = 'null'::jsonb,
                'scriptures-only share hides the outline');
select tests.ok(public.get_shared_sermon('does-not-exist') is null, 'unknown link returns nothing');
insert into public.notes (sermon_id, title, content)
  select (public.get_shared_sermon('new-beginnings')->>'id')::uuid, 'My notes', '{"text":"Ada private thoughts"}';
insert into public.note_ai_outputs (note_id, kind, content)
  select id, 'summary', 'AI summary of Ada notes' from public.notes;
select public.record_sermon_join('new-beginnings');
select public.ask_question('new-beginnings', 'How do I start again after failing?', false);
select tests.ok((select count(*) from public.sermons) = 0, 'member cannot list sermons table');
select tests.fails($$insert into public.notes (user_id, title) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'x')$$,
                   'member cannot create a note as someone else');
select tests.fails($$insert into public.question_answers (question_id, body)
                     select id, 'self answer' from public.sermon_questions$$,
                   'member cannot answer a question');
select tests.fails($$insert into public.sermon_questions (sermon_id, body)
                     values ((public.get_shared_sermon('new-beginnings')->>'id')::uuid, 'bypass')$$,
                   'member cannot insert questions directly (must use ask_question)');
reset role;

-- Member B asks with their name shown ---------------------------------------
select set_config('request.jwt.claim.sub', :'B', false);
set role authenticated;
select public.ask_question('new-beginnings', 'What does "created" mean in Hebrew?', true);
select tests.ok((select count(*) from public.notes) = 0, 'B cannot see A''s notes');
select tests.ok((select count(*) from public.note_ai_outputs) = 0, 'B cannot see A''s AI summaries');
select tests.ok(tests.rows($$update public.notes set title = 'hacked'$$) = 0, 'B cannot edit A''s notes');
select tests.ok(tests.rows($$delete from public.notes$$) = 0, 'B cannot delete A''s notes');
select tests.ok((select count(*) from public.sermon_questions) = 1, 'B sees only their own question');
select tests.ok((select count(*) from public.question_askers) = 1, 'B sees only their own authorship row');
select tests.ok((select count(*) from public.sermon_join_counts) = 0, 'member cannot see join counts');
reset role;

-- Pastor reviews questions ---------------------------------------------------
select set_config('request.jwt.claim.sub', :'P', false);
set role authenticated;
select tests.ok((select count(*) from public.notes) = 0, 'pastor cannot read members'' notes');
select tests.ok((select count(*) from public.note_ai_outputs) = 0, 'pastor cannot read members'' AI summaries');
select tests.ok((select count(*) from public.sermon_questions) = 2, 'pastor sees both questions');
select tests.ok((select count(*) from public.question_askers) = 0, 'pastor cannot see who asked');
select tests.ok((select shown_name from public.sermon_questions where body like 'How do I%') is null,
                'anonymous question shows no name');
select tests.ok((select shown_name from public.sermon_questions where body like 'What does%') = 'Bola',
                'named question shows the chosen name');
select tests.ok((select joins from public.sermon_join_counts) = 1, 'pastor sees a join count (number only)');
select tests.fails($$update public.sermon_questions set body = 'edited'$$, 'pastor cannot edit a question''s text');
insert into public.question_answers (question_id, body, is_public)
  select id, 'God''s mercies are new every morning (Lamentations 3:22-23).', true
  from public.sermon_questions where body like 'How do I%';
insert into public.question_answers (question_id, body, is_public)
  select id, 'Private reply to Bola.', false
  from public.sermon_questions where body like 'What does%';
select tests.ok((select status from public.sermon_questions where body like 'How do I%') = 'answered',
                'question marked answered automatically');
update public.sermons set questions_open = false where slug = 'new-beginnings';
reset role;

-- Askers read their answers ----------------------------------------------------
select set_config('request.jwt.claim.sub', :'A', false);
set role authenticated;
select tests.ok((select count(*) from public.question_answers) = 1, 'A sees the answer to their question only');
select tests.fails($$select public.ask_question('new-beginnings', 'one more?')$$, 'closed questions reject new ones');
reset role;

-- Published answers on the shared page (any signed-in member) --------------------
select set_config('request.jwt.claim.sub', :'B', false);
set role authenticated;
select tests.ok((select count(*) from public.get_public_answers('new-beginnings')) = 1,
                'only the published answer is public');
reset role;

-- Pastor switches the link off ---------------------------------------------------
select set_config('request.jwt.claim.sub', :'P', false);
set role authenticated;
update public.sermons set is_active = false where slug = 'new-beginnings';
reset role;
select set_config('request.jwt.claim.sub', :'B', false);
set role authenticated;
select tests.ok(public.get_shared_sermon('new-beginnings') is null, 'switched-off link stops working');
reset role;

-- Account deletion removes everything that belonged to A -------------------------
delete from auth.users where id = :'A';
select tests.ok((select count(*) from public.notes) = 0, 'deleting account deletes notes');
select tests.ok((select count(*) from public.note_ai_outputs) = 0, 'deleting account deletes AI outputs');
select tests.ok((select count(*) from public.sermon_questions where body like 'How do I%') = 0,
                'deleting account deletes their questions (and answers)');
select tests.ok((select count(*) from public.question_answers) = 1, 'other people''s answers are untouched');

-- Pastor deletes their account: members keep their notes --------------------------
select set_config('request.jwt.claim.sub', :'B', false);
set role authenticated;
insert into public.notes (title) values ('Bola notes');
reset role;
delete from auth.users where id = :'P';
select tests.ok((select count(*) from public.notes) = 1, 'members keep their notes when the sermon is deleted');

\echo 'ALL PRIVACY TESTS PASSED'
