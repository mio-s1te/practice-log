-- ============================================================
-- みお革命 実践ログ - Supabase スキーマ定義（再実行安全版）
-- ============================================================

-- ============================================================
-- 既存トリガーを先に削除（存在しない場合はスキップ）
-- ============================================================
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS checkins_updated_at ON public.checkins;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_checkin_question ON public.checkins;
DROP TRIGGER IF EXISTS on_checkin_badge ON public.checkins;
DROP TRIGGER IF EXISTS on_achievement_badge ON public.achievements;

-- ============================================================
-- 1. profiles テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL DEFAULT '',
  email         text NOT NULL DEFAULT '',
  discord_name  text DEFAULT '',
  role          text NOT NULL DEFAULT 'member'
                  CHECK (role IN ('member', 'staff', 'admin')),
  generation    text DEFAULT '',
  status        text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'paused', 'graduated', 'cancelled')),
  current_stage text DEFAULT '土台づくり中'
                  CHECK (current_stage IN (
                    '土台づくり中', '方向性整理中', '導線設計中',
                    '発信実践中', '反応確認中', '改善中', '成果検証中'
                  )),
  start_date    date,
  end_date      date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- updated_at 自動更新トリガー関数
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 新規ユーザー登録時にprofileを自動作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. checkins テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.checkins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date          date NOT NULL DEFAULT CURRENT_DATE,
  category      text NOT NULL DEFAULT 'その他'
                  CHECK (category IN (
                    'スタート講座', 'アフィリエイト講座', '投稿作成',
                    '導線作成', '案件選定', '無料プレゼント作成',
                    '今日はできなかった', 'その他'
                  )),
  section       text DEFAULT '',
  done_text     text DEFAULT '',
  stuck_text    text DEFAULT '',
  has_question  boolean NOT NULL DEFAULT false,
  question_text text DEFAULT '',
  next_text     text DEFAULT '',
  mood          text NOT NULL DEFAULT '順調'
                  CHECK (mood IN (
                    '順調', '少し止まった', '質問したい',
                    '励ましがほしい', '個別相談が必要かも'
                  )),
  discord_share text NOT NULL DEFAULT '共有OK'
                  CHECK (discord_share IN ('共有OK', '匿名ならOK', '共有NG')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE TRIGGER checkins_updated_at
  BEFORE UPDATE ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON public.checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON public.checkins(date);
CREATE INDEX IF NOT EXISTS idx_checkins_has_question ON public.checkins(has_question) WHERE has_question = true;
CREATE INDEX IF NOT EXISTS idx_checkins_mood ON public.checkins(mood);

-- ============================================================
-- 3. achievements テーブル（成果報告）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date             date NOT NULL DEFAULT CURRENT_DATE,
  achievement_text text NOT NULL DEFAULT '',
  public_ok        text NOT NULL DEFAULT 'OK'
                     CHECK (public_ok IN ('OK', '匿名ならOK', 'NG')),
  screenshot_url   text DEFAULT '',
  admin_memo       text DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON public.achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_date ON public.achievements(date);

-- ============================================================
-- 4. badges テーブル（バッジマスタ）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.badges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  name        text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon        text NOT NULL DEFAULT '🏅',
  is_auto     boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- バッジマスタ初期データ
INSERT INTO public.badges (code, name, description, icon, is_auto) VALUES
  ('first_checkin',      '初チェックイン',     '初めてチェックインした日', '✅', true),
  ('streak_3',           '3日連続報告',        '3日連続でチェックインを達成', '🔥', true),
  ('streak_7',           '7日連続報告',        '7日連続でチェックインを達成', '⚡', true),
  ('streak_14',          '14日連続報告',       '14日連続でチェックインを達成', '💪', true),
  ('streak_30',          '30日連続報告',       '30日連続でチェックインを達成', '👑', true),
  ('first_question',     '初質問',             '初めて質問を投稿した', '❓', true),
  ('first_done',         '初できた報告',        '初めてできたことを報告した', '🌟', true),
  ('first_achievement',  '初成果報告',          '初めて成果を報告した', '⭐', true),
  ('first_post',         '初投稿',             '初投稿を達成', '📝', false),
  ('first_click',        '初クリック',          '初めてクリックが出た', '👆', false),
  ('first_line',         '初LINE登録',         '初めてLINE登録が入った', '💚', false),
  ('first_reward',       '初報酬',             '初めて報酬が発生した', '💰', false),
  ('month_1',            '1ヶ月完走',          '1ヶ月間プログラムを完走した', '🎖️', false),
  ('month_2',            '2ヶ月完走',          '2ヶ月間プログラムを完走した', '🏆', false)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 5. user_badges テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_badges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id    uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at  timestamptz NOT NULL DEFAULT now(),
  awarded_by  uuid REFERENCES public.profiles(id),
  is_manual   boolean NOT NULL DEFAULT false,
  UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);

-- ============================================================
-- 6. staff_notes テーブル（運営メモ）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_notes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_id           uuid NOT NULL REFERENCES public.profiles(id),
  note               text NOT NULL DEFAULT '',
  next_followup_date date,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_notes_user_id ON public.staff_notes(user_id);

-- ============================================================
-- 7. question_statuses テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.question_statuses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id  uuid NOT NULL REFERENCES public.checkins(id) ON DELETE CASCADE UNIQUE,
  status      text NOT NULL DEFAULT '未対応'
                CHECK (status IN (
                  '未対応', '対応中', 'Discordで回答済み',
                  '個別回答済み', 'FAQ化済み', '個別相談へ案内'
                )),
  staff_id    uuid REFERENCES public.profiles(id),
  memo        text DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 質問があるチェックイン作成時に自動でquestion_statusesを作成
CREATE OR REPLACE FUNCTION public.handle_question_checkin()
RETURNS trigger AS $$
BEGIN
  IF NEW.has_question = true THEN
    INSERT INTO public.question_statuses (checkin_id, status)
    VALUES (NEW.id, '未対応')
    ON CONFLICT (checkin_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_checkin_question
  AFTER INSERT OR UPDATE ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.handle_question_checkin();

-- ============================================================
-- バッジ自動付与関数
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_award_badges(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_checkin_count int;
  v_streak        int;
  v_has_question  bool;
  v_has_done      bool;
  v_has_achievement bool;
  v_badge_id      uuid;
BEGIN
  SELECT COUNT(*) INTO v_checkin_count
    FROM public.checkins WHERE user_id = p_user_id;

  WITH dates AS (
    SELECT date, date - ROW_NUMBER() OVER (ORDER BY date)::int AS grp
    FROM public.checkins WHERE user_id = p_user_id
  )
  SELECT COUNT(*) INTO v_streak
    FROM dates
    WHERE grp = (SELECT grp FROM dates ORDER BY date DESC LIMIT 1);

  SELECT EXISTS(SELECT 1 FROM public.checkins WHERE user_id = p_user_id AND has_question = true) INTO v_has_question;
  SELECT EXISTS(SELECT 1 FROM public.checkins WHERE user_id = p_user_id AND done_text != '') INTO v_has_done;
  SELECT EXISTS(SELECT 1 FROM public.achievements WHERE user_id = p_user_id) INTO v_has_achievement;

  IF v_checkin_count >= 1 THEN
    SELECT id INTO v_badge_id FROM public.badges WHERE code = 'first_checkin';
    IF v_badge_id IS NOT NULL THEN
      INSERT INTO public.user_badges (user_id, badge_id, is_manual) VALUES (p_user_id, v_badge_id, false) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF v_streak >= 3 THEN
    SELECT id INTO v_badge_id FROM public.badges WHERE code = 'streak_3';
    IF v_badge_id IS NOT NULL THEN
      INSERT INTO public.user_badges (user_id, badge_id, is_manual) VALUES (p_user_id, v_badge_id, false) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF v_streak >= 7 THEN
    SELECT id INTO v_badge_id FROM public.badges WHERE code = 'streak_7';
    IF v_badge_id IS NOT NULL THEN
      INSERT INTO public.user_badges (user_id, badge_id, is_manual) VALUES (p_user_id, v_badge_id, false) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF v_streak >= 14 THEN
    SELECT id INTO v_badge_id FROM public.badges WHERE code = 'streak_14';
    IF v_badge_id IS NOT NULL THEN
      INSERT INTO public.user_badges (user_id, badge_id, is_manual) VALUES (p_user_id, v_badge_id, false) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF v_streak >= 30 THEN
    SELECT id INTO v_badge_id FROM public.badges WHERE code = 'streak_30';
    IF v_badge_id IS NOT NULL THEN
      INSERT INTO public.user_badges (user_id, badge_id, is_manual) VALUES (p_user_id, v_badge_id, false) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF v_has_question THEN
    SELECT id INTO v_badge_id FROM public.badges WHERE code = 'first_question';
    IF v_badge_id IS NOT NULL THEN
      INSERT INTO public.user_badges (user_id, badge_id, is_manual) VALUES (p_user_id, v_badge_id, false) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF v_has_done THEN
    SELECT id INTO v_badge_id FROM public.badges WHERE code = 'first_done';
    IF v_badge_id IS NOT NULL THEN
      INSERT INTO public.user_badges (user_id, badge_id, is_manual) VALUES (p_user_id, v_badge_id, false) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF v_has_achievement THEN
    SELECT id INTO v_badge_id FROM public.badges WHERE code = 'first_achievement';
    IF v_badge_id IS NOT NULL THEN
      INSERT INTO public.user_badges (user_id, badge_id, is_manual) VALUES (p_user_id, v_badge_id, false) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.trigger_auto_badges()
RETURNS trigger AS $$
BEGIN
  PERFORM public.auto_award_badges(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_checkin_badge
  AFTER INSERT OR UPDATE ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.trigger_auto_badges();

CREATE TRIGGER on_achievement_badge
  AFTER INSERT ON public.achievements
  FOR EACH ROW EXECUTE FUNCTION public.trigger_auto_badges();
