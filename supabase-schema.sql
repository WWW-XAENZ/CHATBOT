create table if not exists public.chat_analytics (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  event_type text not null check (event_type in ('visit_start', 'visit_end', 'assistant_reply', 'whatsapp_open')),
  occurred_at timestamptz not null default now(),
  wait_ms integer check (wait_ms is null or wait_ms >= 0),
  duration_ms bigint check (duration_ms is null or duration_ms >= 0),
  device_type text not null default 'unknown' check (device_type in ('mobile', 'tablet', 'desktop', 'unknown'))
);

alter table public.chat_analytics
  add column if not exists device_type text not null default 'unknown'
  check (device_type in ('mobile', 'tablet', 'desktop', 'unknown'));

create index if not exists chat_analytics_session_id_idx on public.chat_analytics (session_id);
create index if not exists chat_analytics_occurred_at_idx on public.chat_analytics (occurred_at desc);

create table if not exists public.report_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.report_admins enable row level security;
revoke all on public.report_admins from anon, authenticated;
grant select on public.report_admins to authenticated;

drop policy if exists "Admins can read their own report access" on public.report_admins;
create policy "Admins can read their own report access"
  on public.report_admins for select to authenticated
  using (user_id = (select auth.uid()));

alter table public.chat_analytics enable row level security;
revoke all on public.chat_analytics from anon, authenticated;
grant insert (session_id, event_type, wait_ms, duration_ms, device_type) on public.chat_analytics to anon, authenticated;
grant select on public.chat_analytics to authenticated;

drop policy if exists "Allow anonymous metric inserts" on public.chat_analytics;
create policy "Allow anonymous metric inserts"
  on public.chat_analytics for insert to anon, authenticated
  with check (
    event_type in ('visit_start', 'visit_end', 'assistant_reply', 'whatsapp_open')
    and (wait_ms is null or wait_ms >= 0)
    and (duration_ms is null or duration_ms >= 0)
    and device_type in ('mobile', 'tablet', 'desktop', 'unknown')
  );

drop policy if exists "Allow signed-in report readers" on public.chat_analytics;
create policy "Allow signed-in report readers"
  on public.chat_analytics for select to authenticated
  using (
    exists (
      select 1 from public.report_admins
      where report_admins.user_id = (select auth.uid())
    )
  );

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;
revoke all on public.reviews from anon, authenticated;
grant insert (rating, comment) on public.reviews to anon, authenticated;
grant select on public.reviews to authenticated;

create index if not exists reviews_created_at_idx on public.reviews (created_at desc);

drop policy if exists "Allow anonymous review submissions" on public.reviews;
create policy "Allow anonymous review submissions"
  on public.reviews for insert to anon, authenticated
  with check (rating between 1 and 5 and char_length(comment) <= 1000);

drop policy if exists "Allow signed-in review readers" on public.reviews;
create policy "Allow signed-in review readers"
  on public.reviews for select to authenticated
  using (
    exists (
      select 1 from public.report_admins
      where report_admins.user_id = (select auth.uid())
    )
  );
