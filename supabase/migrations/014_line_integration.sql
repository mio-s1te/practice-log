-- ============================================================
-- 014: LINE連携カラム追加
-- ============================================================

-- profiles に LINE連携情報を追加
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS line_user_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS line_notification_ok boolean NOT NULL DEFAULT true;
-- line_notification_ok: true=通知ON（2ヶ月間は強制true）、false=卒業後に本人が止めた

-- インデックス（通知送信時にline_user_idで検索するため）
CREATE INDEX IF NOT EXISTS idx_profiles_line_user_id ON public.profiles(line_user_id);
