-- ============================================
-- 003_price_tiers.sql
-- 段階価格設定テーブルの追加
-- ============================================

-- ----------------------------------------
-- price_tiers テーブル
-- 商品ごとの販売数連動価格設定
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS price_tiers (
  tier_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tier_name     TEXT NOT NULL,                    -- 例: "早期価格", "通常価格", "最終価格"
  min_valid_sales_count INTEGER NOT NULL DEFAULT 0,   -- このtierが適用される最小有効販売数
  max_valid_sales_count INTEGER,                  -- このtierが適用される最大有効販売数 (NULLは上限なし)
  price         INTEGER NOT NULL,                 -- 価格 (円)
  stripe_price_id TEXT,                           -- Stripe Price ID (管理者がStripe上で作成したもの)
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT price_tiers_min_max_check CHECK (
    max_valid_sales_count IS NULL OR max_valid_sales_count >= min_valid_sales_count
  )
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_price_tiers_product_id ON price_tiers(product_id);
CREATE INDEX IF NOT EXISTS idx_price_tiers_active ON price_tiers(product_id, is_active);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_price_tiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_price_tiers_updated_at
  BEFORE UPDATE ON price_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_price_tiers_updated_at();

-- ----------------------------------------
-- price_change_history テーブル
-- 価格切り替え履歴
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS price_change_history (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_price             INTEGER NOT NULL,
  new_price             INTEGER NOT NULL,
  old_stripe_price_id   TEXT,
  new_stripe_price_id   TEXT,
  trigger_type          TEXT NOT NULL DEFAULT 'sales_count',
  -- 'sales_count': 販売数到達による自動切り替え
  -- 'manual': 管理者による手動切り替え
  -- 'scheduled': スケジュールによる切り替え
  trigger_sales_count   INTEGER,                  -- 切り替えが発動した時点の販売数
  changed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by            TEXT NOT NULL DEFAULT 'system',
  memo                  TEXT
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_price_change_history_product_id ON price_change_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_change_history_changed_at ON price_change_history(changed_at DESC);

-- ----------------------------------------
-- RLS設定
-- ----------------------------------------
ALTER TABLE price_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_change_history ENABLE ROW LEVEL SECURITY;

-- service_role: 全操作可能
CREATE POLICY "service_role_all_price_tiers" ON price_tiers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_price_change_history" ON price_change_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- anon: price_tiers の読み取りのみ可能 (LP表示用)
CREATE POLICY "anon_read_price_tiers" ON price_tiers
  FOR SELECT TO anon USING (is_active = true);

-- anon: price_change_history は読み取り不可
-- (service_roleのみ)

-- ----------------------------------------
-- AI副業1時間化スタート講座 の price_tiers サンプルデータ
-- 注意: product_id は実際のIDに合わせて後から UPDATE すること
-- または INSERT INTO で直接商品名から検索して挿入
-- ----------------------------------------

-- スタート講座の price_tiers 挿入 (商品名でサブクエリ)
INSERT INTO price_tiers (
  product_id,
  tier_name,
  min_valid_sales_count,
  max_valid_sales_count,
  price,
  stripe_price_id,
  is_active
)
SELECT
  p.id,
  '早期価格 (〜1,000部)',
  0,
  1000,
  29800,
  NULL,  -- 管理者がStripe Price IDを後から設定
  true
FROM products p
WHERE p.name LIKE '%スタート講座%'
  AND NOT EXISTS (
    SELECT 1 FROM price_tiers pt
    WHERE pt.product_id = p.id AND pt.min_valid_sales_count = 0
  )
LIMIT 1;

INSERT INTO price_tiers (
  product_id,
  tier_name,
  min_valid_sales_count,
  max_valid_sales_count,
  price,
  stripe_price_id,
  is_active
)
SELECT
  p.id,
  '通常価格 (1,001〜10,000部)',
  1001,
  10000,
  49800,
  NULL,
  true
FROM products p
WHERE p.name LIKE '%スタート講座%'
  AND NOT EXISTS (
    SELECT 1 FROM price_tiers pt
    WHERE pt.product_id = p.id AND pt.min_valid_sales_count = 1001
  )
LIMIT 1;

INSERT INTO price_tiers (
  product_id,
  tier_name,
  min_valid_sales_count,
  max_valid_sales_count,
  price,
  stripe_price_id,
  is_active
)
SELECT
  p.id,
  '最終価格 (10,001部〜)',
  10001,
  NULL,   -- 上限なし
  99800,
  NULL,
  true
FROM products p
WHERE p.name LIKE '%スタート講座%'
  AND NOT EXISTS (
    SELECT 1 FROM price_tiers pt
    WHERE pt.product_id = p.id AND pt.min_valid_sales_count = 10001
  )
LIMIT 1;

-- ----------------------------------------
-- 有効累計販売数を取得するヘルパー関数
-- 有効条件: status = 'completed' のみ
--   (返金・キャンセル・チャージバックは除外)
-- ----------------------------------------
CREATE OR REPLACE FUNCTION get_valid_sales_count(p_product_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM purchases
  WHERE product_id = p_product_id
    AND status = 'completed';
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------
-- 現在適用中の price_tier を返す関数
-- ----------------------------------------
CREATE OR REPLACE FUNCTION get_current_price_tier(p_product_id UUID)
RETURNS TABLE (
  tier_id             UUID,
  tier_name           TEXT,
  price               INTEGER,
  stripe_price_id     TEXT,
  min_valid_sales_count INTEGER,
  max_valid_sales_count INTEGER
) AS $$
DECLARE
  v_sales_count INTEGER;
BEGIN
  v_sales_count := get_valid_sales_count(p_product_id);

  RETURN QUERY
  SELECT
    pt.tier_id,
    pt.tier_name,
    pt.price,
    pt.stripe_price_id,
    pt.min_valid_sales_count,
    pt.max_valid_sales_count
  FROM price_tiers pt
  WHERE pt.product_id = p_product_id
    AND pt.is_active = true
    AND pt.min_valid_sales_count <= v_sales_count
    AND (pt.max_valid_sales_count IS NULL OR pt.max_valid_sales_count >= v_sales_count)
  ORDER BY pt.min_valid_sales_count DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------
-- 次の price_tier を返す関数 (LP表示用)
-- ----------------------------------------
CREATE OR REPLACE FUNCTION get_next_price_tier(p_product_id UUID)
RETURNS TABLE (
  tier_id             UUID,
  tier_name           TEXT,
  price               INTEGER,
  min_valid_sales_count INTEGER,
  max_valid_sales_count INTEGER
) AS $$
DECLARE
  v_sales_count INTEGER;
  v_current_max INTEGER;
BEGIN
  v_sales_count := get_valid_sales_count(p_product_id);

  -- 現在tierの最大値を取得
  SELECT pt.max_valid_sales_count
  INTO v_current_max
  FROM price_tiers pt
  WHERE pt.product_id = p_product_id
    AND pt.is_active = true
    AND pt.min_valid_sales_count <= v_sales_count
    AND (pt.max_valid_sales_count IS NULL OR pt.max_valid_sales_count >= v_sales_count)
  ORDER BY pt.min_valid_sales_count DESC
  LIMIT 1;

  -- 現在tierが最終(上限なし)なら次はない
  IF v_current_max IS NULL THEN
    RETURN;
  END IF;

  -- 次のtierを取得
  RETURN QUERY
  SELECT
    pt.tier_id,
    pt.tier_name,
    pt.price,
    pt.min_valid_sales_count,
    pt.max_valid_sales_count
  FROM price_tiers pt
  WHERE pt.product_id = p_product_id
    AND pt.is_active = true
    AND pt.min_valid_sales_count = v_current_max + 1
  ORDER BY pt.min_valid_sales_count ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
