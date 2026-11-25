-- Minimal stand-in for Supabase's auth schema and roles, for local testing only.
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated;
-- Supabase grants broadly by default and relies on RLS; emulate that.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
