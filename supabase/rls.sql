-- ============================================================
-- みお革命 実践ログ - Row Level Security
-- ============================================================

-- RLS有効化
alter table public.profiles enable row level security;
alter table public.checkins enable row level security;
alter table public.achievements enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.staff_notes enable row level security;
alter table public.question_statuses enable row level security;

-- ============================================================
-- ヘルパー関数
-- ============================================================
create or replace function public.get_my_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ============================================================
-- profiles ポリシー
-- ============================================================
create policy "profiles: 自分は参照可" on public.profiles
  for select using (id = auth.uid());

create policy "profiles: staff/adminは全員参照可" on public.profiles
  for select using (public.get_my_role() in ('staff','admin'));

create policy "profiles: 自分のみ更新可" on public.profiles
  for update using (id = auth.uid());

create policy "profiles: adminのみ全更新可" on public.profiles
  for update using (public.get_my_role() = 'admin');

create policy "profiles: adminのみ挿入可" on public.profiles
  for insert with check (public.get_my_role() = 'admin');

-- ============================================================
-- checkins ポリシー
-- ============================================================
create policy "checkins: 自分のみ参照可" on public.checkins
  for select using (user_id = auth.uid());

create policy "checkins: staff/adminは全員参照可" on public.checkins
  for select using (public.get_my_role() in ('staff','admin'));

create policy "checkins: 自分のみ作成可" on public.checkins
  for insert with check (user_id = auth.uid());

create policy "checkins: 自分のみ更新可" on public.checkins
  for update using (user_id = auth.uid());

-- ============================================================
-- achievements ポリシー
-- ============================================================
create policy "achievements: 自分のみ参照可" on public.achievements
  for select using (user_id = auth.uid());

create policy "achievements: staff/adminは全員参照可" on public.achievements
  for select using (public.get_my_role() in ('staff','admin'));

create policy "achievements: 自分のみ作成可" on public.achievements
  for insert with check (user_id = auth.uid());

create policy "achievements: adminのみ更新可(メモ等)" on public.achievements
  for update using (public.get_my_role() = 'admin');

-- ============================================================
-- badges ポリシー（全員参照可・adminのみ編集）
-- ============================================================
create policy "badges: 全員参照可" on public.badges
  for select using (true);

create policy "badges: adminのみ作成" on public.badges
  for insert with check (public.get_my_role() = 'admin');

-- ============================================================
-- user_badges ポリシー
-- ============================================================
create policy "user_badges: 自分のみ参照可" on public.user_badges
  for select using (user_id = auth.uid());

create policy "user_badges: staff/adminは全員参照可" on public.user_badges
  for select using (public.get_my_role() in ('staff','admin'));

create policy "user_badges: adminのみ付与可" on public.user_badges
  for insert with check (public.get_my_role() = 'admin');

-- ============================================================
-- staff_notes ポリシー
-- ============================================================
create policy "staff_notes: staff/adminのみ参照可" on public.staff_notes
  for select using (public.get_my_role() in ('staff','admin'));

create policy "staff_notes: staff/adminのみ作成可" on public.staff_notes
  for insert with check (public.get_my_role() in ('staff','admin'));

create policy "staff_notes: staff/adminのみ更新可" on public.staff_notes
  for update using (public.get_my_role() in ('staff','admin'));

-- ============================================================
-- question_statuses ポリシー
-- ============================================================
create policy "question_statuses: staff/adminのみ参照可" on public.question_statuses
  for select using (public.get_my_role() in ('staff','admin'));

create policy "question_statuses: staff/adminのみ作成可" on public.question_statuses
  for insert with check (public.get_my_role() in ('staff','admin'));

create policy "question_statuses: staff/adminのみ更新可" on public.question_statuses
  for update using (public.get_my_role() in ('staff','admin'));
