-- ============================================================
-- 015: 期生別 Discord Webhook URL 設定テーブル
-- ============================================================

-- 期生ごとの設定を管理するテーブル
-- generation は profiles.generation と同じ文字列（例: "3期生"）
CREATE TABLE IF NOT EXISTS public.generation_settings (
  generation          text PRIMARY KEY,
  discord_webhook_url text,          -- 期生ルームの Webhook URL（未設定なら NULL）
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generation_settings_updated_at ON public.generation_settings;
CREATE TRIGGER trg_generation_settings_updated_at
  BEFORE UPDATE ON public.generation_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: 読み取りはスタッフ/管理者のみ、書き込みは管理者のみ
ALTER TABLE public.generation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all" ON public.generation_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "staff_select" ON public.generation_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );
