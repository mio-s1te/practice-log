-- migration: 010_affiliate_password.sql
-- affiliates テーブルにパスワードハッシュカラムを追加

ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

COMMENT ON COLUMN affiliates.password_hash IS 'bcryptハッシュ（Netlify Functionsで検証）。NULLはパスワード未設定（Magic Linkのみ）';
