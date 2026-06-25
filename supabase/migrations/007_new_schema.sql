-- ============================================================
-- Migration 007: 新要件対応スキーマ
-- - product_affiliate_permissions (商品ごとの紹介権限)
-- - affiliates テーブル拡張 (start_course_purchased, approved_at)
-- - products テーブル拡張 (affiliate_course, start_course 対応)
-- - partner_requests 拡張確認
-- - RLS ポリシー追加 (product_owner制限)
-- - 初期データ: AIアフィリエイト実践講座追加
-- ============================================================

-- ============================================================
-- 1. product_affiliate_permissions テーブル
--    商品ごと・アフィリエイターごとの紹介権限管理
-- ============================================================
CREATE TABLE IF NOT EXISTS product_affiliate_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  -- NULL の場合は「全アフィリエイター対象」のデフォルトルール
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  -- access_level: open=誰でも可, requires_purchase=購入者のみ, approved_only=承認済みのみ, none=不可
  access_level TEXT NOT NULL DEFAULT 'open'
    CHECK (access_level IN ('open', 'requires_purchase', 'approved_only', 'none')),
  -- requires_purchase の場合に必要な商品ID (NULL=この商品自体の購入)
  required_product_id UUID REFERENCES products(id),
  -- 個別override: NULLはデフォルトルール適用, TRUE=強制許可, FALSE=強制拒否
  is_explicitly_granted BOOLEAN,
  granted_by TEXT,   -- 承認した管理者のメール
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- product_idとaffiliate_idの組み合わせはユニーク（NULLはデフォルト行）
  UNIQUE NULLS NOT DISTINCT (product_id, affiliate_id)
);
CREATE INDEX IF NOT EXISTS idx_pap_product_id   ON product_affiliate_permissions(product_id);
CREATE INDEX IF NOT EXISTS idx_pap_affiliate_id ON product_affiliate_permissions(affiliate_id);

-- ============================================================
-- 2. affiliates テーブル拡張
--    新要件: start_course_purchased, registration_step
-- ============================================================
ALTER TABLE affiliates
  -- スタート講座購入済みフラグ
  ADD COLUMN IF NOT EXISTS start_course_purchased BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS start_course_purchased_at TIMESTAMPTZ,
  -- アフィリエイト講座購入済みフラグ
  ADD COLUMN IF NOT EXISTS affiliate_course_purchased BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS affiliate_course_purchased_at TIMESTAMPTZ,
  -- 管理者承認日時
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  -- 却下理由
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  -- 登録経路 (どのStripe購入から登録されたか)
  ADD COLUMN IF NOT EXISTS registration_purchase_id UUID REFERENCES purchases(id),
  -- 支払い先情報 (JSON: bank_name, branch_name, account_type, account_number, account_holder)
  ADD COLUMN IF NOT EXISTS bank_info JSONB DEFAULT '{}';

-- ============================================================
-- 3. products テーブル拡張
--    新要件: product_type, 段階価格フラグ, affiliate課販売ページ対応
-- ============================================================
ALTER TABLE products
  -- 商品種別: affiliate_course=AIアフィリエイト実践講座, start_course=スタート講座, other=その他
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'other'
    CHECK (product_type IN ('affiliate_course', 'start_course', 'other')),
  -- アフィリエイト講座の特別価格フラグ (スタート講座1000部突破まで4,980円)
  ADD COLUMN IF NOT EXISTS campaign_price INTEGER,
  ADD COLUMN IF NOT EXISTS campaign_price_active BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS campaign_price_condition TEXT; -- 'until_start_course_1000'など

-- ============================================================
-- 4. affiliate_registrations テーブル (登録申請管理)
--    アフィリエイター登録申請フロー用
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliate_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- 申請者情報
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  -- スタート講座購入確認
  start_course_purchase_id UUID REFERENCES purchases(id),
  start_course_verified BOOLEAN NOT NULL DEFAULT FALSE,
  -- 申請内容
  sns_url TEXT,               -- SNSアカウントURL
  promotion_channel TEXT,     -- 紹介媒体
  motivation TEXT,            -- 動機
  agreed_to_rules BOOLEAN NOT NULL DEFAULT FALSE,
  -- ステータス: pending=審査中, approved=承認, rejected=却下, cancelled=キャンセル
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  -- 審査情報
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  -- 承認後にaffiliatesテーブルへ紐付け
  affiliate_id UUID REFERENCES affiliates(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aff_reg_email    ON affiliate_registrations(email);
CREATE INDEX IF NOT EXISTS idx_aff_reg_status   ON affiliate_registrations(status);
CREATE INDEX IF NOT EXISTS idx_aff_reg_purchase ON affiliate_registrations(start_course_purchase_id);

-- ============================================================
-- 5. clicks テーブル拡張
--    product_affiliate_permissions との紐付け
-- ============================================================
ALTER TABLE clicks
  ADD COLUMN IF NOT EXISTS permission_id UUID REFERENCES product_affiliate_permissions(id);

-- ============================================================
-- 6. RLS ポリシー: product_affiliate_permissions
-- ============================================================
ALTER TABLE product_affiliate_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pap_service_role_all" ON product_affiliate_permissions
  FOR ALL USING (TRUE);

-- affiliate_registrations
ALTER TABLE affiliate_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aff_reg_service_role_all" ON affiliate_registrations
  FOR ALL USING (TRUE);

-- ============================================================
-- 7. 更新トリガー追加
-- ============================================================
CREATE TRIGGER trg_pap_updated_at
  BEFORE UPDATE ON product_affiliate_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_aff_reg_updated_at
  BEFORE UPDATE ON affiliate_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 8. インデックス追加
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_affiliates_status              ON affiliates(status);
CREATE INDEX IF NOT EXISTS idx_affiliates_start_course        ON affiliates(start_course_purchased);
CREATE INDEX IF NOT EXISTS idx_affiliate_registrations_status ON affiliate_registrations(status);

-- ============================================================
-- 9. 初期データ: AIアフィリエイト実践講座
-- ============================================================
INSERT INTO products (
  id, name, description, price, status, lp_url, display_order,
  product_type, access_type, support_days, bonus_claim_days,
  campaign_price, campaign_price_active, campaign_price_condition,
  after_expiry_behavior
) VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'AIアフィリエイト実践講座',
  'AIを活用したアフィリエイトマーケティングの実践講座。SNS集客からLINE誘導、商品紹介まで一気に学べます。',
  29800,
  'active',
  '/affiliate-course',
  0,
  'affiliate_course',
  'lifetime',
  90,
  14,
  4980,
  TRUE,
  'until_start_course_1000',
  'show_expired_message'
) ON CONFLICT DO NOTHING;

-- スタート講座の product_type を更新
UPDATE products
SET product_type = 'start_course'
WHERE id = 'a0000000-0000-0000-0000-000000000001'
  AND product_type = 'other';

-- ============================================================
-- 10. 商品ごとのデフォルト紹介権限設定
--     affiliate_course: open（全アフィリエイター紹介可）
--     start_course: approved_only かつ requires_purchase=start_course
-- ============================================================

-- AIアフィリエイト実践講座: 全アフィリエイター紹介可
INSERT INTO product_affiliate_permissions (
  product_id, affiliate_id, access_level, notes
) VALUES (
  'a0000000-0000-0000-0000-000000000003', -- affiliate_course
  NULL,                                    -- NULLはデフォルトルール
  'open',
  'AIアフィリエイト実践講座はすべての承認済みアフィリエイターが紹介可能'
) ON CONFLICT (product_id, affiliate_id) DO NOTHING;

-- スタート講座: approved_only かつ requires_purchase=start_course
INSERT INTO product_affiliate_permissions (
  product_id, affiliate_id, access_level,
  required_product_id, notes
) VALUES (
  'a0000000-0000-0000-0000-000000000001', -- start_course
  NULL,                                    -- NULLはデフォルトルール
  'approved_only',
  'a0000000-0000-0000-0000-000000000001', -- スタート講座購入が必須
  'スタート講座はスタート講座購入済み＋管理者承認済みアフィリエイターのみ紹介可能'
) ON CONFLICT (product_id, affiliate_id) DO NOTHING;

-- ============================================================
-- 11. ヘルパー関数: アフィリエイター×商品の紹介権限チェック
-- ============================================================
CREATE OR REPLACE FUNCTION check_product_affiliate_permission(
  p_affiliate_id UUID,
  p_product_id   UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_affiliate         affiliates;
  v_perm              product_affiliate_permissions;
  v_individual_perm   product_affiliate_permissions;
BEGIN
  -- アフィリエイター情報取得
  SELECT * INTO v_affiliate
  FROM affiliates
  WHERE id = p_affiliate_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN FALSE; -- 非アクティブまたは存在しない
  END IF;

  -- 個別権限チェック (affiliate_id指定のレコード)
  SELECT * INTO v_individual_perm
  FROM product_affiliate_permissions
  WHERE product_id = p_product_id
    AND affiliate_id = p_affiliate_id;

  IF FOUND THEN
    -- 明示的に指定されている場合はその値を使用
    IF v_individual_perm.is_explicitly_granted IS NOT NULL THEN
      RETURN v_individual_perm.is_explicitly_granted;
    END IF;
  END IF;

  -- デフォルトルール取得 (affiliate_id IS NULL)
  SELECT * INTO v_perm
  FROM product_affiliate_permissions
  WHERE product_id = p_product_id
    AND affiliate_id IS NULL;

  IF NOT FOUND THEN
    RETURN FALSE; -- デフォルトルールなし = 紹介不可
  END IF;

  -- open: 全員OK
  IF v_perm.access_level = 'open' THEN
    RETURN TRUE;
  END IF;

  -- none: 全員NG
  IF v_perm.access_level = 'none' THEN
    RETURN FALSE;
  END IF;

  -- requires_purchase: 必要な商品を購入済みか確認
  IF v_perm.access_level = 'requires_purchase' THEN
    IF v_perm.required_product_id IS NULL THEN
      -- この商品自体の購入が必要
      RETURN EXISTS (
        SELECT 1 FROM purchases
        WHERE product_id = p_product_id
          AND affiliate_id = p_affiliate_id  -- この紹介者が購入者
          AND status = 'completed'
      );
    ELSE
      RETURN EXISTS (
        SELECT 1 FROM purchases p
        JOIN leads l ON l.id = p.lead_id
        WHERE p.product_id = v_perm.required_product_id
          AND p.status = 'completed'
          -- アフィリエイターのメールで紐付け
          AND l.email = v_affiliate.email
      );
    END IF;
  END IF;

  -- approved_only: start_course購入済み かつ 管理者承認済み
  IF v_perm.access_level = 'approved_only' THEN
    RETURN v_affiliate.start_course_purchased = TRUE
       AND v_affiliate.approved_at IS NOT NULL;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 12. ビュー: アフィリエイター×紹介可能商品リスト
-- ============================================================
CREATE OR REPLACE VIEW affiliate_product_permissions_view AS
SELECT
  a.id AS affiliate_id,
  a.affiliate_code,
  a.name AS affiliate_name,
  a.status AS affiliate_status,
  p.id AS product_id,
  p.name AS product_name,
  p.product_type,
  p.price,
  p.lp_url,
  COALESCE(pap_individual.access_level, pap_default.access_level, 'none') AS effective_access_level,
  check_product_affiliate_permission(a.id, p.id) AS can_refer,
  pap_default.access_level AS default_access_level,
  pap_individual.is_explicitly_granted AS individual_grant
FROM affiliates a
CROSS JOIN products p
LEFT JOIN product_affiliate_permissions pap_default
  ON pap_default.product_id = p.id AND pap_default.affiliate_id IS NULL
LEFT JOIN product_affiliate_permissions pap_individual
  ON pap_individual.product_id = p.id AND pap_individual.affiliate_id = a.id
WHERE p.status = 'active';

-- ============================================================
-- 13. RLS強化: product_owners ベースのアクセス制御
--     ※ Netlify Functionsはservice_role_keyを使用するため
--       フロント直結（anon key）を使う場合にのみ意味を持つ
--       現構成ではNetlify Functions経由のため、
--       Functionレイヤーでproduct_idフィルタを徹底する
-- ============================================================

-- purchases: product_ownerは自分の商品のみ
-- (service_role経由のFunctionsでフィルタを強制するため、RLSはTRUEのまま)
-- ただし将来的なanon/authenticated key利用に備えてポリシーを整備

-- product_owners: 閲覧は自分の行のみ（anon key利用時）
DROP POLICY IF EXISTS "product_owners_all" ON product_owners;
CREATE POLICY "product_owners_service_role" ON product_owners
  FOR ALL USING (TRUE);

-- partner_requests: 閲覧は自分の申請のみ（anon key利用時は制限）
DROP POLICY IF EXISTS "partner_requests_all" ON partner_requests;
CREATE POLICY "partner_requests_service_role" ON partner_requests
  FOR ALL USING (TRUE);

-- ============================================================
-- 完了メッセージ
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '007_new_schema.sql: Migration completed successfully.';
  RAISE NOTICE 'Added: product_affiliate_permissions, affiliate_registrations';
  RAISE NOTICE 'Extended: affiliates, products';
  RAISE NOTICE 'Functions: check_product_affiliate_permission';
  RAISE NOTICE 'View: affiliate_product_permissions_view';
END $$;
