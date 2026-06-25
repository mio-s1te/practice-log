-- ============================================================
-- Migration 006: GAS→Netlify→Supabase 同期ログ
-- ============================================================
-- line-sync.js が参照する line_sync_logs テーブルを作成します。
-- GAS から Netlify Function 経由で Supabase に同期した際の
-- 実行ログを保存します。運用監視・デバッグ・重複検出に使用します。
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- line_sync_logs テーブル
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS line_sync_logs (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- LINE アカウント種別（free_seminar: 無料セミナーLINE / purchaser: 購入者LINE）
  line_account_type   TEXT        NOT NULL
    CHECK (line_account_type IN ('free_seminar', 'purchaser')),
  -- LINE の userId（GAS から受け取った値）
  line_user_id        TEXT        NOT NULL,
  -- 同期後に紐づいた leads テーブルのレコードID
  lead_id             UUID        REFERENCES leads(id) ON DELETE SET NULL,
  -- 同期アクション（'created': 新規作成 / 'updated': 既存更新）
  action              TEXT,
  -- GAS から受け取った付加情報（デバッグ・分析用）
  email               TEXT,
  status              TEXT,       -- GAS 側のステータス
  keyword             TEXT,       -- 最後に送信されたキーワード
  waiting_state       TEXT,       -- GAS の状態機械の状態
  source              TEXT,       -- 流入元
  campaign_id         UUID,       -- アトリビューション用キャンペーンID
  affiliate_id        UUID,       -- アトリビューション用紹介者ID
  affiliate_code      TEXT,       -- 紹介コード
  click_id            UUID,       -- クリックイベントID
  product_id          UUID,       -- 商品ID
  spreadsheet_row_id  TEXT,       -- スプレッドシートの行番号（バックアップ追跡用）
  -- エラー情報（例外発生時に記録）
  error_message       TEXT,
  -- 同期実行日時
  synced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- インデックス
-- ──────────────────────────────────────────────────────────
-- LINE userId での検索（重複チェック・履歴確認に頻出）
CREATE INDEX IF NOT EXISTS idx_line_sync_logs_line_user_id
  ON line_sync_logs (line_user_id);

-- lead_id での逆引き（leads レコードの同期履歴を見る場合）
CREATE INDEX IF NOT EXISTS idx_line_sync_logs_lead_id
  ON line_sync_logs (lead_id);

-- アカウント種別での絞り込み
CREATE INDEX IF NOT EXISTS idx_line_sync_logs_account_type
  ON line_sync_logs (line_account_type);

-- 同期日時での範囲検索（最近のログを素早く取得）
CREATE INDEX IF NOT EXISTS idx_line_sync_logs_synced_at
  ON line_sync_logs (synced_at DESC);

-- ──────────────────────────────────────────────────────────
-- RLS（Row Level Security）
-- ──────────────────────────────────────────────────────────
-- ・公開読み取り: 不可（ログに個人情報が含まれるため）
-- ・Netlify Functions は service_role key でアクセスするため
--   RLS をバイパスし、SELECT / INSERT / UPDATE が可能。
-- ・管理者画面からのログ参照は admin-api.js 経由（service_role key）
--   で行うため、anon key での直接アクセスは全て拒否。

ALTER TABLE line_sync_logs ENABLE ROW LEVEL SECURITY;

-- anon / authenticated ロールの直接アクセスを全面拒否
-- （service_role key を持つサーバーサイドのみアクセス可能）
CREATE POLICY "line_sync_logs: no public access"
  ON line_sync_logs
  FOR ALL
  TO anon, authenticated
  USING (FALSE);

-- ──────────────────────────────────────────────────────────
-- コメント（テーブル・カラムの説明）
-- ──────────────────────────────────────────────────────────
COMMENT ON TABLE line_sync_logs IS
  'GAS→Netlify→Supabase 同期の実行ログ。line-sync.js が各同期時に1行追加する。';

COMMENT ON COLUMN line_sync_logs.line_account_type IS
  'free_seminar: 無料セミナーLINE公式アカウント, purchaser: 購入者LINE公式アカウント';
COMMENT ON COLUMN line_sync_logs.action IS
  'created: leadsに新規行を作成した, updated: 既存leadsレコードを更新した';
COMMENT ON COLUMN line_sync_logs.lead_id IS
  '同期処理で作成・更新した leads テーブルの行ID（エラー時はNULL）';
COMMENT ON COLUMN line_sync_logs.spreadsheet_row_id IS
  'GASスプレッドシートの行番号。将来のバックアップ・突合用。';
COMMENT ON COLUMN line_sync_logs.error_message IS
  '同期処理中に例外が発生した場合のエラーメッセージ（正常時はNULL）';
