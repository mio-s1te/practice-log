-- ============================================================
-- 017: 期生別 Discord Webhook URL を用途別に分離
-- encourage_webhook_url  : 「励ましてほしい」通知専用チャンネル
-- achievement_webhook_url: 成果報告専用チャンネル
-- ============================================================

ALTER TABLE public.generation_settings
  ADD COLUMN IF NOT EXISTS encourage_webhook_url   text,   -- 励まし通知専用
  ADD COLUMN IF NOT EXISTS achievement_webhook_url text;   -- 成果報告専用

COMMENT ON COLUMN public.generation_settings.discord_webhook_url
  IS '日報通知用 Discord Webhook URL';

COMMENT ON COLUMN public.generation_settings.encourage_webhook_url
  IS '励まし通知専用 Discord Webhook URL（未設定なら discord_webhook_url にフォールバック）';

COMMENT ON COLUMN public.generation_settings.achievement_webhook_url
  IS '成果報告専用 Discord Webhook URL（未設定なら discord_webhook_url にフォールバック）';
