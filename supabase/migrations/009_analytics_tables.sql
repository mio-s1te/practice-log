-- supabase/migrations/009_analytics_tables.sql
-- 分析機能用テーブル追加
-- - line_funnel_data: LINE導線数値（手動入力 + GAS sync-ready）
-- - button_clicks: LPボタンクリックトラッキング

-- =============================================================
-- LINE導線データ（手動入力 / 将来GAS自動同期対応）
-- =============================================================
CREATE TABLE IF NOT EXISTS line_funnel_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data_date DATE UNIQUE NOT NULL,           -- 対象日（1日1レコード）
  -- 「1時間」導線
  line_registrations_1hour INTEGER DEFAULT 0 NOT NULL,
  keyword_sends_1hour       INTEGER DEFAULT 0 NOT NULL,
  -- 「本気」導線
  line_registrations_honki  INTEGER DEFAULT 0 NOT NULL,
  keyword_sends_honki       INTEGER DEFAULT 0 NOT NULL,
  -- メタ
  note                      TEXT,
  source                    TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'gas', 'api')),
  updated_at                TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at                TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_line_funnel_data_date ON line_funnel_data(data_date DESC);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_line_funnel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_line_funnel_updated_at ON line_funnel_data;
CREATE TRIGGER trigger_line_funnel_updated_at
  BEFORE UPDATE ON line_funnel_data
  FOR EACH ROW EXECUTE FUNCTION update_line_funnel_updated_at();

-- RLS（管理者のみ読み書き可能）
ALTER TABLE line_funnel_data ENABLE ROW LEVEL SECURITY;

-- 管理者: 全操作
CREATE POLICY "admin_all_line_funnel_data"
  ON line_funnel_data FOR ALL
  USING (true)
  WITH CHECK (true);

-- コメント
COMMENT ON TABLE line_funnel_data IS 'LINE導線数値（手動入力 or GAS自動同期）。1日1レコード。';
COMMENT ON COLUMN line_funnel_data.source IS 'データ入力元: manual=管理画面手動入力, gas=GAS自動同期, api=API直接登録';


-- =============================================================
-- ボタンクリックトラッキング
-- =============================================================
CREATE TABLE IF NOT EXISTS button_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_url        TEXT NOT NULL,                         -- クリックされたページのURL
  button_name     TEXT NOT NULL,                         -- ボタン識別名（例: "cta_hero", "cta_bottom"）
  button_position TEXT,                                  -- ページ内位置（例: "hero", "mid", "bottom"）
  button_label    TEXT,                                  -- ボタン表示テキスト
  affiliate_id    UUID REFERENCES affiliates(id) ON DELETE SET NULL,  -- 紹介者経由の場合
  affiliate_code  TEXT,                                  -- 紹介コード（非正規化・高速検索用）
  session_id      TEXT,                                  -- セッション識別子
  user_agent      TEXT,                                  -- UAスニペット
  referrer        TEXT,                                  -- リファラURL
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_button_clicks_created_at    ON button_clicks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_button_clicks_page_url      ON button_clicks(page_url);
CREATE INDEX IF NOT EXISTS idx_button_clicks_button_name   ON button_clicks(button_name);
CREATE INDEX IF NOT EXISTS idx_button_clicks_affiliate_id  ON button_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_button_clicks_affiliate_code ON button_clicks(affiliate_code);

-- RLS（書き込みは全員可・読み込みは管理者のみ）
ALTER TABLE button_clicks ENABLE ROW LEVEL SECURITY;

-- 全員: 新規登録のみ可（アノニマス含む）
CREATE POLICY "public_insert_button_clicks"
  ON button_clicks FOR INSERT
  WITH CHECK (true);

-- 管理者: 全操作
CREATE POLICY "admin_select_button_clicks"
  ON button_clicks FOR SELECT
  USING (true);

-- コメント
COMMENT ON TABLE button_clicks IS 'LP内CTAボタンクリックトラッキング。フロントエンドからAPIで記録。';
COMMENT ON COLUMN button_clicks.button_name IS '例: cta_hero / cta_mid / cta_bottom / cta_sticky';
COMMENT ON COLUMN button_clicks.button_position IS '例: hero / section_1 / bottom / sticky_bar';


-- =============================================================
-- サンプルデータ（開発確認用 - 本番では削除可）
-- =============================================================
-- line_funnel_data サンプル（直近7日）
INSERT INTO line_funnel_data (data_date, line_registrations_1hour, keyword_sends_1hour, line_registrations_honki, keyword_sends_honki, note, source)
VALUES
  (CURRENT_DATE - 6, 12, 8,  5, 3, NULL, 'manual'),
  (CURRENT_DATE - 5, 18, 14, 7, 5, NULL, 'manual'),
  (CURRENT_DATE - 4, 15, 11, 6, 4, NULL, 'manual'),
  (CURRENT_DATE - 3, 22, 17, 9, 7, NULL, 'manual'),
  (CURRENT_DATE - 2, 19, 15, 8, 6, NULL, 'manual'),
  (CURRENT_DATE - 1, 25, 20, 11, 8, '週末', 'manual'),
  (CURRENT_DATE,      8,  6,  3, 2, '本日分', 'manual')
ON CONFLICT (data_date) DO NOTHING;
