-- badgesテーブルにカラムを追加（存在しない場合のみ）
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT '🏅';
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS is_auto boolean NOT NULL DEFAULT true;
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';

-- バッジマスタ初期データ投入
INSERT INTO public.badges (code, name, description, icon, is_auto) VALUES
  ('first_checkin',     '初チェックイン',   '初めてチェックインした日',           '✅', true),
  ('streak_3',          '3日連続報告',      '3日連続でチェックインを達成',         '🔥', true),
  ('streak_7',          '7日連続報告',      '7日連続でチェックインを達成',         '⚡', true),
  ('streak_14',         '14日連続報告',     '14日連続でチェックインを達成',        '💪', true),
  ('streak_30',         '30日連続報告',     '30日連続でチェックインを達成',        '👑', true),
  ('first_question',    '初質問',           '初めて質問を投稿した',               '❓', true),
  ('first_done',        '初できた報告',     '初めてできたことを報告した',           '🌟', true),
  ('first_achievement', '初成果報告',       '初めて成果を報告した',               '⭐', true),
  ('first_post',        '初投稿',           '初投稿を達成',                      '📝', false),
  ('first_click',       '初クリック',       '初めてクリックが出た',               '👆', false),
  ('first_line',        '初LINE登録',       '初めてLINE登録が入った',             '💚', false),
  ('first_reward',      '初報酬',           '初めて報酬が発生した',               '💰', false),
  ('month_1',           '1ヶ月完走',        '1ヶ月間プログラムを完走した',         '🎖️', false),
  ('month_2',           '2ヶ月完走',        '2ヶ月間プログラムを完走した',         '🏆', false)
ON CONFLICT (code) DO UPDATE SET
  icon = EXCLUDED.icon,
  is_auto = EXCLUDED.is_auto,
  description = EXCLUDED.description;
