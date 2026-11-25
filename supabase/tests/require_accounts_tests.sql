-- Tests for 0002_require_accounts.sql. Run after both migrations on a fresh database.
\set ON_ERROR_STOP on
\set P '11111111-1111-1111-1111-111111111111'
\set A 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

create schema tests;
grant usage on schema tests to anon, authenticated;
create function tests.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', label; end if;
  raise notice 'pass: %', label;
end $$;
create function tests.fails(stmt text, label text) returns void language plpgsql as $$
begin
  begin execute stmt;
  exception when others then raise notice 'pass: % (blocked: %)', label, sqlerrm; return;
  end;
  raise exception 'FAIL: % (statement succeeded)', label;
end $$;
grant execute on all functions in schema tests to anon, authenticated;

insert into auth.users values (:'P', 'pastor@x.test'), (:'A', 'ada@x.test');
insert into public.bible_verses values ('KJV', 'Genesis', 1, 1, 'In the beginning God created the heaven and the earth.');

select set_config('request.jwt.claim.sub', :'P', false);
set role authenticated;
insert into public.sermons (slug, title, preacher_name, outline)
  values ('new-beginnings', 'The Power of New Beginnings', 'Pastor A. Okafor', 'Secret outline');
reset role;

-- Not signed in: preview only
select set_config('request.jwt.claim.sub', '', false);
set role anon;
select tests.ok(public.get_sermon_preview('new-beginnings')->>'title' = 'The Power of New Beginnings',
                'visitor sees title on QR landing page');
select tests.ok(public.get_sermon_preview('new-beginnings')->'outline' is null,
                'preview does not include the outline');
select tests.fails($$select public.get_shared_sermon('new-beginnings')$$, 'visitor cannot open full sermon');
select tests.fails($$select public.record_sermon_join('new-beginnings')$$, 'visitor cannot join');
select tests.fails($$select * from public.get_public_answers('new-beginnings')$$, 'visitor cannot read answers');
select tests.fails($$select * from public.bible_verses$$, 'visitor cannot read Bible table');
reset role;

-- Signed in: full access
select set_config('request.jwt.claim.sub', :'A', false);
set role authenticated;
select tests.ok(public.get_shared_sermon('new-beginnings')->>'outline' = 'Secret outline',
                'signed-in member opens full sermon');
select public.record_sermon_join('new-beginnings');
select tests.ok((select count(*) from public.bible_verses) = 1, 'signed-in member reads Bible text');
select tests.ok((select count(*) from public.get_public_answers('new-beginnings')) = 0,
                'signed-in member can call public answers');
reset role;

\echo 'ALL REQUIRE-ACCOUNT TESTS PASSED'
