-- ============================================
-- Migration 005: Roles, Product Owners,
--   Partner Approvals, Campaign Access Control
-- ============================================

-- ============================================
-- A. app_users テーブル（全ロール共通のユーザー管理）
-- super_admin / admin / product_owner / affiliate / customer
-- ============================================
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,                            -- bcryptハッシュ（Netlify Functionsで検証）
  role TEXT NOT NULL DEFAULT 'product_owner'
    CHECK (role IN ('super_admin','admin','product_owner','affiliate','customer')),
  display_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  session_token TEXT,
  session_expires_at TIMESTAMPTZ,
  notes TEXT,
  invited_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_role  ON app_users(role);

-- ============================================
-- B. product_owners テーブル（商品↔オーナー多対多）
-- ============================================
CREATE TABLE IF NOT EXISTS product_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL DEFAULT 'viewer'
    CHECK (permission_level IN ('viewer','manager','owner')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended','revoked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_product_owners_user_id    ON product_owners(user_id);
CREATE INDEX IF NOT EXISTS idx_product_owners_product_id ON product_owners(product_id);

-- ============================================
-- C. product_owner_permissions テーブル（細粒度権限）
-- ============================================
CREATE TABLE IF NOT EXISTS product_owner_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_owner_id UUID NOT NULL REFERENCES product_owners(id) ON DELETE CASCADE,
  can_view_sales               BOOLEAN NOT NULL DEFAULT TRUE,
  can_view_customers           BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_affiliates          BOOLEAN NOT NULL DEFAULT TRUE,
  can_export_csv               BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit_product_description BOOLEAN NOT NULL DEFAULT FALSE,
  can_submit_campaign_request  BOOLEAN NOT NULL DEFAULT TRUE,
  can_submit_price_request     BOOLEAN NOT NULL DEFAULT FALSE,
  can_submit_notice_request    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_owner_id)
);

-- ============================================
-- D. partner_requests テーブル（申請管理）
-- product_owner → super_admin/admin へ申請
-- ============================================
CREATE TABLE IF NOT EXISTS partner_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES app_users(id),
  product_id   UUID NOT NULL REFERENCES products(id),
  request_type TEXT NOT NULL
    CHECK (request_type IN (
      'product_description_change',
      'price_change',
      'commission_change',
      'campaign_start',
      'campaign_stop',
      'material_add',
      'notice_delivery'
    )),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','cancelled')),
  -- 申請内容（JSON形式で各種リクエスト固有データを格納）
  request_data JSONB NOT NULL DEFAULT '{}',
  -- 却下理由
  rejection_reason TEXT,
  -- 審査者
  reviewed_by UUID REFERENCES app_users(id),
  reviewed_at TIMESTAMPTZ,
  -- キャンセル
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_partner_requests_requester ON partner_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_partner_requests_product   ON partner_requests(product_id);
CREATE INDEX IF NOT EXISTS idx_partner_requests_status    ON partner_requests(status);

-- ============================================
-- E. affiliate_campaigns に紹介権限フィールド追加
-- ============================================
ALTER TABLE affiliate_campaigns
  ADD COLUMN IF NOT EXISTS access_type TEXT NOT NULL DEFAULT 'public'
    CHECK (access_type IN ('public','approved_only','specific_affiliates','tag_based')),
  ADD COLUMN IF NOT EXISTS required_affiliate_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allow_application BOOLEAN NOT NULL DEFAULT TRUE;

-- スタート講座案件のデフォルトはtag_based
-- （初期データが存在する場合は後から手動で更新）

-- ============================================
-- F. affiliate_campaign_access テーブル（個別紹介権限）
-- ============================================
CREATE TABLE IF NOT EXISTS affiliate_campaign_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id  UUID NOT NULL REFERENCES affiliate_campaigns(id) ON DELETE CASCADE,
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  access_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (access_status IN ('approved','pending','rejected','revoked')),
  granted_by  TEXT,           -- 承認した管理者のemail
  granted_at  TIMESTAMPTZ DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ,
  revoke_reason TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, affiliate_id)
);
CREATE INDEX IF NOT EXISTS idx_aca_campaign_id  ON affiliate_campaign_access(campaign_id);
CREATE INDEX IF NOT EXISTS idx_aca_affiliate_id ON affiliate_campaign_access(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aca_status       ON affiliate_campaign_access(access_status);

-- ============================================
-- G. affiliate_campaign_applications テーブル（紹介申請）
-- ============================================
CREATE TABLE IF NOT EXISTS affiliate_campaign_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id  UUID NOT NULL REFERENCES affiliate_campaigns(id) ON DELETE CASCADE,
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  -- 申請フォーム入力内容
  application_reason  TEXT,       -- なぜこの商品を紹介したいか
  promotion_channel   TEXT,       -- どのSNS・媒体で紹介するか
  target_audience     TEXT,       -- 想定している紹介先
  past_results        TEXT,       -- 過去の紹介実績
  agreed_to_rules     BOOLEAN NOT NULL DEFAULT FALSE,   -- PR表記ルール同意
  agreed_no_prohibited BOOLEAN NOT NULL DEFAULT FALSE,  -- 禁止表現不使用同意
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','cancelled')),
  reviewed_by   TEXT,             -- 審査管理者email
  reviewed_at   TIMESTAMPTZ,
  rejection_reason TEXT,
  cancelled_at  TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aca_app_campaign   ON affiliate_campaign_applications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_aca_app_affiliate  ON affiliate_campaign_applications(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aca_app_status     ON affiliate_campaign_applications(status);

-- ============================================
-- H. purchases テーブルに紹介権限なし購入フラグ追加
-- ============================================
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS access_verified BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS no_access_reason TEXT;

-- ============================================
-- I. RLS ポリシー
-- ============================================

-- app_users: 自分自身のみ読み取り可（サービスロールは全件）
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_users_self_read" ON app_users
  FOR SELECT USING (TRUE);  -- Netlify Functions はservice_role_keyを使用するため全許可
CREATE POLICY "app_users_insert" ON app_users
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "app_users_update" ON app_users
  FOR UPDATE USING (TRUE);

-- product_owners: service_role全許可
ALTER TABLE product_owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_owners_all" ON product_owners
  FOR ALL USING (TRUE);

-- product_owner_permissions: service_role全許可
ALTER TABLE product_owner_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pop_all" ON product_owner_permissions
  FOR ALL USING (TRUE);

-- partner_requests: service_role全許可
ALTER TABLE partner_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner_requests_all" ON partner_requests
  FOR ALL USING (TRUE);

-- affiliate_campaign_access: service_role全許可
ALTER TABLE affiliate_campaign_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aca_all" ON affiliate_campaign_access
  FOR ALL USING (TRUE);

-- affiliate_campaign_applications: service_role全許可
ALTER TABLE affiliate_campaign_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aca_app_all" ON affiliate_campaign_applications
  FOR ALL USING (TRUE);

-- ============================================
-- J. ヘルパー関数
-- ============================================

-- 紹介者がキャンペーンに紹介権限を持つか確認
CREATE OR REPLACE FUNCTION check_affiliate_campaign_access(
  p_affiliate_id UUID,
  p_campaign_id  UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_access_type TEXT;
  v_required_tags TEXT[];
  v_affiliate_tags TEXT[];
  v_access_status TEXT;
BEGIN
  -- キャンペーンのaccess_type取得
  SELECT access_type, required_affiliate_tags
  INTO v_access_type, v_required_tags
  FROM affiliate_campaigns
  WHERE id = p_campaign_id AND status != 'ended';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- public: 全員OK
  IF v_access_type = 'public' THEN
    RETURN TRUE;
  END IF;

  -- tag_based: タグ確認
  IF v_access_type = 'tag_based' THEN
    SELECT tags INTO v_affiliate_tags FROM affiliates WHERE id = p_affiliate_id;
    IF v_required_tags IS NULL OR array_length(v_required_tags, 1) IS NULL THEN
      RETURN TRUE;
    END IF;
    RETURN v_affiliate_tags @> v_required_tags;
  END IF;

  -- approved_only / specific_affiliates: affiliate_campaign_access確認
  SELECT access_status INTO v_access_status
  FROM affiliate_campaign_access
  WHERE campaign_id = p_campaign_id
    AND affiliate_id = p_affiliate_id;

  IF FOUND AND v_access_status = 'approved' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- K. 初期データ: super_admin ユーザー
-- パスワードはNetlify環境変数から設定、ハッシュは初期値
-- ============================================
INSERT INTO app_users (email, role, display_name, password_hash)
VALUES (
  'super@admin.example.com',
  'super_admin',
  'スーパー管理者',
  '$2b$10$placeholder_change_via_api'   -- 初回ログイン時に要変更
)
ON CONFLICT (email) DO NOTHING;
