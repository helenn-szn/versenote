-- Members can choose to share a read-only copy of one note by link. Off by default.
alter table public.notes add column if not exists share_token text unique
  check (share_token is null or share_token ~ '^[A-Za-z0-9_-]{16,64}$');

-- Anyone with the link can read that one note: title, preacher, date and the note itself.
-- Private parts (draft questions, the church sermon link) are left out, and nothing about the author is returned.
create or replace function public.get_shared_note(p_token text)
returns table (title text, preacher_name text, sermon_date date, content jsonb, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select n.title, n.preacher_name, n.sermon_date,
         jsonb_build_object('version', 2, 'doc', coalesce(n.content -> 'doc', '{}'::jsonb), 'blocks', coalesce(n.content -> 'blocks', '[]'::jsonb)),
         n.updated_at
    from public.notes n
   where p_token is not null and length(p_token) >= 16 and n.share_token = p_token
$$;

revoke all on function public.get_shared_note(text) from public;
grant execute on function public.get_shared_note(text) to anon, authenticated;
