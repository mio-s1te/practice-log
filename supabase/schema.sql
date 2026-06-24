-- ============================================================
-- みお革命 実践ログ - Supabase スキーマ
-- ============================================================

-- 1. profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  discord_name text,
  role text not null default 'member' check (role in ('member','staff','admin')),
  generation text,
  status text not null default 'active' check (status in ('active','paused','graduated','cancelled')),
  current_stage text default '土台づくり中' check (current_stage in (
    '土台づくり中','方向性整理中','導線設計中','発信実践中','反応確認中','改善中','成果検証中'
  )),
  start_date date,
  end_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. checkins
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  category text not null check (category in (
    'スタート講座','アフィリエイト講座','投稿作成','導線作成',
    '案件選定','無料プレゼント作成','今日はできなかった','その他'
  )),
  section text,
  done_text text,
  stuck_text text,
  has_question boolean default false,
  question_text text,
  next_text text,
  mood text check (mood in (
    '順調','少し止まった','質問したい','励ましがほしい','個別相談が必要かも'
  )),
  discord_share text check (discord_share in ('共有OK','匿名ならOK','共有NG')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- 3. achievements
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  achievement_text text not null,
  public_ok text check (public_ok in ('OK','匿名ならOK','NG')),
  screenshot_url text,
  admin_memo text,
  created_at timestamptz default now()
);

-- 4. badges
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  emoji text,
  created_at timestamptz default now()
);

-- 5. user_badges
create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz default now(),
  awarded_by uuid references public.profiles(id),
  is_manual boolean default false,
  unique(user_id, badge_id)
);

-- 6. staff_notes
create table if not exists public.staff_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  staff_id uuid not null references public.profiles(id),
  note text not null,
  next_followup_date date,
  created_at timestamptz default now()
);

-- 7. question_statuses
create table if not exists public.question_statuses (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  status text not null default '未対応' check (status in (
    '未対応','対応中','Discordで回答済み','個別回答済み','FAQ化済み','個別相談へ案内'
  )),
  staff_id uuid references public.profiles(id),
  memo text,
  updated_at timestamptz default now(),
  unique(checkin_id)
);

-- updated_at 自動更新トリガー
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger checkins_updated_at before update on public.checkins
  for each row execute function public.handle_updated_at();

-- 新規ユーザー登録時にprofilesを自動作成
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- バッジ初期データ
-- ============================================================
insert into public.badges (code, name, description, emoji) values
  ('first_checkin',    '初チェックイン',    '初めてチェックインを完了した',         '🌟'),
  ('streak_3',         '3日連続報告',       '3日連続でチェックインした',            '🔥'),
  ('streak_7',         '7日連続報告',       '7日連続でチェックインした',            '💪'),
  ('streak_14',        '14日連続報告',      '14日連続でチェックインした',           '🏅'),
  ('streak_30',        '30日連続報告',      '30日連続でチェックインした',           '🏆'),
  ('first_question',   '初質問',           '初めて質問を投稿した',                '❓'),
  ('first_done',       '初できた報告',      '初めて「できたこと」を報告した',        '✅'),
  ('first_achievement','初成果報告',        '初めて成果を登録した',                '⭐'),
  ('first_post',       '初投稿',           '初投稿できた成果を報告した',           '📝'),
  ('first_click',      '初クリック',        '初クリックが出た成果を報告した',       '👆'),
  ('first_line',       '初LINE登録',       'LINE登録が入った成果を報告した',       '💚'),
  ('first_revenue',    '初報酬',           '初報酬が出た成果を報告した',           '💰'),
  ('complete_1month',  '1ヶ月完走',        '1ヶ月間実践を継続した',               '🎖️'),
  ('complete_2months', '2ヶ月完走',        '2ヶ月間実践を継続した',               '👑')
on conflict (code) do nothing;
