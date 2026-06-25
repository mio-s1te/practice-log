-- ============================================================
-- バッジ重複修正・自動付与関数更新
-- Supabase の SQL Editor で実行してください
-- ============================================================

-- 1. 重複しているバッジを削除して正しい定義に統一
--    （同じcodeが複数ある場合、古い方を削除）
DELETE FROM public.badges
WHERE id NOT IN (
  SELECT DISTINCT ON (code) id
  FROM public.badges
  ORDER BY code, created_at ASC
);

-- 2. バッジマスタを正しい内容で更新
INSERT INTO public.badges (code, name, description, icon, is_auto) VALUES
  ('first_checkin',     '初チェックイン',    '初めてチェックインした日',                        '✅', true),
  ('streak_3',          '3日連続報告',       '3日連続でチェックインを達成',                      '🔥', true),
  ('streak_7',          '7日連続報告',       '7日連続でチェックインを達成',                      '⚡', true),
  ('streak_14',         '14日連続報告',      '14日連続でチェックインを達成',                     '💪', true),
  ('streak_30',         '30日連続報告',      '30日連続でチェックインを達成',                     '👑', true),
  ('first_question',    '初質問',            '初めて質問を投稿した',                             '❓', true),
  ('first_done',        '初できた報告',      '初めてできたことを報告した',                       '🌟', true),
  ('first_achievement', '初成果報告',        '初めて成果を報告した',                             '⭐', true),
  ('first_post',        '初投稿',            '初投稿を達成',                                    '📝', false),
  ('first_click',       '初クリック',        '初めてクリックが出た',                             '👆', false),
  ('first_line',        '初LINE登録',        '初めてLINE登録が入った',                           '💚', false),
  ('first_reward',      '初報酬',            '初めて報酬が発生した',                             '💰', false),
  ('month_1',           '1ヶ月完走',         '参加から30日・累計30日以上チェックインを継続した',  '🎖️', true),
  ('month_2',           '2ヶ月完走',         '参加から60日・累計50日以上報告を継続した',          '🏆', true)
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  icon        = EXCLUDED.icon,
  is_auto     = EXCLUDED.is_auto;

-- 3. バッジ自動付与関数を更新（month_1・month_2を追加）
CREATE OR REPLACE FUNCTION public.auto_award_badges(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_checkin_count   int;
  v_streak          int;
  v_has_question    bool;
  v_has_done        bool;
  v_has_achievement bool;
  v_badge_id        uuid;
  v_joined_at       date;
  v_days_since_join int;
BEGIN
  -- チェックイン総数
  SELECT COUNT(*) INTO v_checkin_count
  FROM public.checkins WHERE user_id = p_user_id;

  -- 参加日（最初のチェックイン日）と経過日数
  SELECT MIN(date)::date INTO v_joined_at
  FROM public.checkins WHERE user_id = p_user_id;
  v_days_since_join := COALESCE(CURRENT_DATE - v_joined_at, 0);

  -- 連続日数
  WITH dates AS (
    SELECT date, date - ROW_NUMBER() OVER (ORDER BY date)::int AS grp
    FROM public.checkins WHERE user_id = p_user_id
  )
  SELECT COUNT(*) INTO v_streak
  FROM dates
  WHERE grp = (SELECT grp FROM dates ORDER BY date DESC LIMIT 1);

  -- 質問・できた・成果の有無
  SELECT EXISTS(SELECT 1 FROM public.checkins WHERE user_id = p_user_id AND has_question = true)
    INTO v_has_question;
  SELECT EXISTS(SELECT 1 FROM public.checkins WHERE user_id = p_user_id AND done_text != '' AND done_text IS NOT NULL)
    INTO v_has_done;
  SELECT EXISTS(SELECT 1 FROM public.achievements WHERE user_id = p_user_id)
    INTO v_has_achievement;

  -- 初チェックイン
  IF v_checkin_count >= 1 THEN
    SELECT id INTO v_badge_id FROM public.badges WHERE code = 'first_checkin';
    INSERT INTO public.user_badges (user_id, badge_id, is_manual) VALUES (p_user_id, v_badge_id, false)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- 連続3日
  IF v_streak >= 3 THEN
    SELECT id INTO v_badge_id FROM public.badges WHERE code = 'streak_3';
    INSERT INTO public.user_badges (user_id, badge_id, is_manual) VALUES (p_user_id, v_badge_id, false)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- 連続7日
  IF v_streak >= 7 THEN
    SELECT id INTO v_badge_id FROM public.badges WHERE code = 'streak_7';
    INSERT INTO public.user_badges (user_id, badge_id, is_manual) VALUES (p_user_id, v_badge_id, false)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- 連続14日
  IF v_streak >= 14 THEN
    SELECT id INTO v_badge_id FROM public.badges WHERE code = 'streak_14';
    INSERT INTO public.user_badges (user_id, badge_id, is_manual) VALUES (p_user_id, v_badge_id, false)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- 連続30日
  IF v_streak >= 30 THEN
    SELECT id INTO v_badge_id FROM public.badges WHERE code = 'streak_30';
    INSERT INTO public.user_badges (user_id, badge_id, is_manual) VALUES (p_user_id, v_badge_id, false)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- 初質問
  IF v_has_question THEN
    SELECT id INTO v_badge_id FROM public.badges WHERE code = 'first_question';
    INSERT INTO public.user_badges (user_id, badge_id, is_manual) VALUES (p_user_id, v_badge_id, false)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- 初できた報告
  IF v_has_done THEN
    SELECT id INTO v_badge_id FROM public.badges WHERE code = 'first_done';
    INSERT INTO public.user_badges (user_id, badge_id, is_manual) VALUES (p_user_id, v_badge_id, false)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- 初成果報告
  IF v_has_achievement THEN
    SELECT id INTO v_badge_id FROM public.badges WHERE code = 'first_achievement';
    INSERT INTO public.user_badges (user_id, badge_id, is_manual) VALUES (p_user_id, v_badge_id, false)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- 1ヶ月完走（参加30日以上 かつ 累計30日以上）
  IF v_days_since_join >= 30 AND v_checkin_count >= 30 THEN
    SELECT id INTO v_badge_id FROM public.badges WHERE code = 'month_1';
    INSERT INTO public.user_badges (user_id, badge_id, is_manual) VALUES (p_user_id, v_badge_id, false)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- 2ヶ月完走（参加60日以上 かつ 累計50日以上）
  IF v_days_since_join >= 60 AND v_checkin_count >= 50 THEN
    SELECT id INTO v_badge_id FROM public.badges WHERE code = 'month_2';
    INSERT INTO public.user_badges (user_id, badge_id, is_manual) VALUES (p_user_id, v_badge_id, false)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 確認：バッジ一覧（重複がないか確認）
SELECT code, name, is_auto, created_at FROM public.badges ORDER BY created_at;
