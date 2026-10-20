-- =====================================================================
-- StudyQuest database  |  Paste this whole file into Supabase > SQL Editor > Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- STEP 0: CLEAN SLATE.
-- Drops tables from earlier StudyQuest versions so this script runs cleanly.
-- !! This DELETES their data. Remove this block if you have data to keep. !!
-- ---------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.user_badges, public.study_sessions, public.tasks, public.subjects,
  public.admin_roles, public.study_logs, public.todos, public.events, public.alert_messages,
  public.group_members, public.groups, public.site_events, public.profiles cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.protect_admin_flag() cascade;
drop function if exists public.apply_session() cascade;
drop function if exists public.evaluate_badges(uuid) cascade;
drop function if exists public.admin_stats() cascade;
drop function if exists public.admin_grant_xp(uuid, int) cascade;
drop function if exists public.admin_set_badge(uuid, text, boolean) cascade;

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default 'Student',
  avatar_url text,
  xp int not null default 0 check (xp >= 0),
  streak int not null default 0,
  best_streak int not null default 0,
  last_study_date date,
  total_seconds bigint not null default 0,
  sessions_count int not null default 0,
  daily_goal_minutes int not null default 60 check (daily_goal_minutes between 5 and 720),
  created_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  color text not null default '#14958A',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  done boolean not null default false,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  seconds int not null check (seconds between 60 and 14400),
  completed boolean not null default true,        -- false = ended early
  xp_earned int not null default 0,               -- filled in by trigger
  day date not null,                              -- the student's local calendar day
  started_at timestamptz not null default now()
);
create index study_sessions_user_day_idx on public.study_sessions (user_id, day);
create index study_sessions_day_idx on public.study_sessions (day);

create table public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id text not null,
  awarded_at timestamptz not null default now(),
  source text not null default 'auto',            -- 'auto' or 'admin'
  primary key (user_id, badge_id)
);

-- Admins are managed ONLY from the SQL editor (no one can self-promote from the app).
create table public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- HELPER FUNCTIONS
-- ---------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_roles where user_id = auth.uid())
$$;

-- Create a profile whenever someone signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email,
          coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users who signed up before this script ran.
insert into public.profiles (id, email, display_name)
select id, email, coalesce(nullif(raw_user_meta_data->>'display_name', ''), split_part(email, '@', 1))
from auth.users on conflict (id) do nothing;

-- Badge rules (evaluated on the server so they cannot be faked).
create or replace function public.evaluate_badges(uid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = uid;
  if not found then return; end if;
  insert into public.user_badges (user_id, badge_id)
  select uid, b from unnest(array[
    case when p.sessions_count >= 1 then 'first_session' end,
    case when p.sessions_count >= 10 then 'sessions_10' end,
    case when p.sessions_count >= 50 then 'sessions_50' end,
    case when p.best_streak >= 3 then 'streak_3' end,
    case when p.best_streak >= 7 then 'streak_7' end,
    case when p.best_streak >= 30 then 'streak_30' end,
    case when p.total_seconds >= 36000 then 'hours_10' end,
    case when p.total_seconds >= 180000 then 'hours_50' end,
    case when p.xp >= 1600 then 'level_5' end,
    case when p.xp >= 8100 then 'level_10' end
  ]::text[]) as b
  where b is not null
  on conflict do nothing;
end $$;
revoke all on function public.evaluate_badges(uuid) from public, anon, authenticated;

-- Every logged session awards XP, updates the streak and unlocks badges, all server-side.
--   XP = 2 per minute + 10 bonus for a fully completed Pomodoro.
create or replace function public.apply_session() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p public.profiles;
  gain int;
  new_streak int;
begin
  if abs(new.day - current_date) > 1 then
    raise exception 'Invalid study day';
  end if;
  if (select coalesce(sum(seconds), 0) from public.study_sessions
        where user_id = new.user_id and day = new.day) + new.seconds > 57600 then
    raise exception 'Daily study limit reached';
  end if;

  select * into p from public.profiles where id = new.user_id for update;
  gain := (new.seconds / 60) * 2 + case when new.completed then 10 else 0 end;
  new.xp_earned := gain;

  if p.last_study_date is null then new_streak := 1;
  elsif new.day = p.last_study_date then new_streak := greatest(p.streak, 1);
  elsif new.day = p.last_study_date + 1 then new_streak := p.streak + 1;
  elsif new.day > p.last_study_date then new_streak := 1;
  else new_streak := p.streak;
  end if;

  update public.profiles set
    xp = xp + gain,
    total_seconds = total_seconds + new.seconds,
    sessions_count = sessions_count + 1,
    streak = new_streak,
    best_streak = greatest(best_streak, new_streak),
    last_study_date = greatest(coalesce(last_study_date, new.day), new.day)
  where id = new.user_id;

  perform public.evaluate_badges(new.user_id);
  return new;
end $$;
create trigger on_session_insert before insert on public.study_sessions
  for each row execute function public.apply_session();

-- ---------------------------------------------------------------------
-- ADMIN FUNCTIONS (each re-checks is_admin() itself)
-- ---------------------------------------------------------------------
create or replace function public.admin_stats() returns jsonb
language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select jsonb_build_object(
    'total_users',    (select count(*) from public.profiles),
    'new_users_7d',   (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'total_sessions', (select count(*) from public.study_sessions),
    'total_seconds',  (select coalesce(sum(seconds), 0) from public.study_sessions),
    'active_today',   (select count(distinct user_id) from public.study_sessions where day = current_date),
    'active_7d',      (select count(distinct user_id) from public.study_sessions where day >= current_date - 6),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'sessions', coalesce(s.c, 0), 'minutes', coalesce(s.m, 0)) order by d), '[]'::jsonb)
      from generate_series(current_date - 13, current_date, interval '1 day') d
      left join (select day, count(*) c, sum(seconds) / 60 m from public.study_sessions group by day) s on s.day = d::date
    )
  ) into result;
  return result;
end $$;

create or replace function public.admin_grant_xp(target uuid, amount int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  update public.profiles set xp = greatest(0, xp + amount) where id = target;
  perform public.evaluate_badges(target);
end $$;

create or replace function public.admin_set_badge(target uuid, badge text, grant_it boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if grant_it then
    insert into public.user_badges (user_id, badge_id, source) values (target, badge, 'admin') on conflict do nothing;
  else
    delete from public.user_badges where user_id = target and badge_id = badge;
  end if;
end $$;

revoke all on function public.admin_stats() from public, anon;
revoke all on function public.admin_grant_xp(uuid, int) from public, anon;
revoke all on function public.admin_set_badge(uuid, text, boolean) from public, anon;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_grant_xp(uuid, int) to authenticated;
grant execute on function public.admin_set_badge(uuid, text, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.tasks enable row level security;
alter table public.study_sessions enable row level security;
alter table public.user_badges enable row level security;
alter table public.admin_roles enable row level security;

-- profiles: read your own (admins read all). Students may only edit name, avatar and daily goal.
create policy "profiles select own or admin" on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "profiles update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
revoke insert, delete on public.profiles from anon, authenticated;
revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_url, daily_goal_minutes) on public.profiles to authenticated;

create policy "subjects own" on public.subjects for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tasks own" on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and (subject_id is null or exists (
    select 1 from public.subjects s where s.id = subject_id and s.user_id = auth.uid())));

create policy "sessions select own or admin" on public.study_sessions for select using (auth.uid() = user_id or public.is_admin());
create policy "sessions insert own" on public.study_sessions for insert
  with check (auth.uid() = user_id and (subject_id is null or exists (
    select 1 from public.subjects s where s.id = subject_id and s.user_id = auth.uid())));
create policy "sessions delete admin" on public.study_sessions for delete using (public.is_admin());

create policy "badges select own or admin" on public.user_badges for select using (auth.uid() = user_id or public.is_admin());
revoke insert, update, delete on public.user_badges from anon, authenticated;

create policy "admin_roles select own" on public.admin_roles for select using (auth.uid() = user_id or public.is_admin());
revoke insert, update, delete on public.admin_roles from anon, authenticated;

-- ---------------------------------------------------------------------
-- MAKE YOURSELF AN ADMIN
-- 1) Sign up in the app with your email.  2) Then run this with your email:
--
--   insert into public.admin_roles (user_id)
--   select id from auth.users where email = 'you@example.com';
--
-- Then open  https://YOUR-SITE/studyquest-admin  and sign in.
-- ---------------------------------------------------------------------
