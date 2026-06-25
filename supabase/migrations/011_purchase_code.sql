-- ============================================================
-- 011_purchase_code.sql
-- purchases テーブルに purchase_code カラムを追加
-- 用途: LINE凍結時のメール連絡・メール↔LINE紐付け台帳の管理
-- 形式: start_XXXXXXXXXXXXXXXX（ランダム16文字英数字）
-- ============================================================

-- purchase_code カラム追加
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS purchase_code TEXT UNIQUE;

-- purchase_code 用インデックス（高速検索）
CREATE INDEX IF NOT EXISTS idx_purchases_purchase_code
  ON purchases(purchase_code);

-- コメント
COMMENT ON COLUMN purchases.purchase_code IS
  'start_XXXXXXXXXXXXXXXX 形式の購入コード。LINE凍結時のメール連絡・スプレッドシート管理用。';
