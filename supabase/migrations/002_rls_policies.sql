-- ============================================
-- RLS (Row Level Security) 設定
-- ============================================

-- RLSを有効化
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE seminar_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_accesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper Functions
-- ============================================

-- 管理者判定関数 (JWTのemailがADMIN_EMAILSに含まれるか)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Netlify Functionsはservice_roleを使うため、全テーブルへのアクセスを許可
-- (フロントエンドからの直接アクセスはanon keyで制限)

-- ============================================
-- PRODUCTS ポリシー
-- ============================================
-- 誰でも閲覧可能（販売中商品）
CREATE POLICY "products_public_read" ON products
  FOR SELECT USING (status = 'active');

-- service_role は全操作可能
CREATE POLICY "products_service_all" ON products
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- AFFILIATE_CAMPAIGNS ポリシー
-- ============================================
CREATE POLICY "campaigns_public_read" ON affiliate_campaigns
  FOR SELECT USING (status IN ('active', 'recruiting') AND visible_to_affiliates = TRUE);

CREATE POLICY "campaigns_service_all" ON affiliate_campaigns
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- AFFILIATES ポリシー
-- ============================================
-- 紹介者は自分のデータのみ閲覧
CREATE POLICY "affiliates_own_read" ON affiliates
  FOR SELECT USING (
    auth.role() = 'service_role' OR
    id::text = current_setting('request.jwt.claims', true)::jsonb->>'affiliate_id'
  );

CREATE POLICY "affiliates_service_all" ON affiliates
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- CLICKS ポリシー
-- ============================================
-- service_role のみ（プライバシー保護）
CREATE POLICY "clicks_service_all" ON clicks
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- LEADS ポリシー
-- ============================================
-- service_role のみ
CREATE POLICY "leads_service_all" ON leads
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- ATTRIBUTION_EVENTS ポリシー
-- ============================================
CREATE POLICY "attribution_service_all" ON attribution_events
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- SEMINAR_VIEWS ポリシー
-- ============================================
CREATE POLICY "seminar_views_service_all" ON seminar_views
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- CHECKOUT_SESSIONS ポリシー
-- ============================================
CREATE POLICY "checkout_sessions_service_all" ON checkout_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- PURCHASES ポリシー
-- ============================================
-- 紹介者は自分の案件の購入のみ閲覧
CREATE POLICY "purchases_affiliate_read" ON purchases
  FOR SELECT USING (
    auth.role() = 'service_role' OR
    affiliate_id::text = current_setting('request.jwt.claims', true)::jsonb->>'affiliate_id'
  );

CREATE POLICY "purchases_service_all" ON purchases
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- PRODUCT_ACCESSES ポリシー
-- ============================================
-- 購入者は自分のアクセス権のみ閲覧
CREATE POLICY "product_accesses_own_read" ON product_accesses
  FOR SELECT USING (
    auth.role() = 'service_role' OR
    line_user_id = current_setting('request.jwt.claims', true)::jsonb->>'line_user_id'
  );

CREATE POLICY "product_accesses_service_all" ON product_accesses
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- COMMISSIONS ポリシー
-- ============================================
-- 紹介者は自分の報酬のみ閲覧
CREATE POLICY "commissions_affiliate_read" ON commissions
  FOR SELECT USING (
    auth.role() = 'service_role' OR
    affiliate_id::text = current_setting('request.jwt.claims', true)::jsonb->>'affiliate_id'
  );

CREATE POLICY "commissions_service_all" ON commissions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- PAYOUTS ポリシー
-- ============================================
CREATE POLICY "payouts_affiliate_read" ON payouts
  FOR SELECT USING (
    auth.role() = 'service_role' OR
    affiliate_id::text = current_setting('request.jwt.claims', true)::jsonb->>'affiliate_id'
  );

CREATE POLICY "payouts_service_all" ON payouts
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- ANNOUNCEMENTS ポリシー
-- ============================================
CREATE POLICY "announcements_public_read" ON announcements
  FOR SELECT USING (
    is_published = TRUE AND
    (expires_at IS NULL OR expires_at > NOW())
  );

CREATE POLICY "announcements_service_all" ON announcements
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- ANNOUNCEMENT_READS ポリシー
-- ============================================
CREATE POLICY "announcement_reads_own" ON announcement_reads
  FOR ALL USING (
    auth.role() = 'service_role' OR
    affiliate_id::text = current_setting('request.jwt.claims', true)::jsonb->>'affiliate_id'
  );

-- ============================================
-- NOTIFICATIONS ポリシー
-- ============================================
CREATE POLICY "notifications_own_read" ON notifications
  FOR SELECT USING (
    auth.role() = 'service_role' OR
    (recipient_type = 'affiliate' AND 
     recipient_id = current_setting('request.jwt.claims', true)::jsonb->>'affiliate_id')
  );

CREATE POLICY "notifications_service_all" ON notifications
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- AFFILIATE_DAILY_STATS ポリシー
-- ============================================
CREATE POLICY "daily_stats_affiliate_read" ON affiliate_daily_stats
  FOR SELECT USING (
    auth.role() = 'service_role' OR
    affiliate_id::text = current_setting('request.jwt.claims', true)::jsonb->>'affiliate_id'
  );

CREATE POLICY "daily_stats_service_all" ON affiliate_daily_stats
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- AFFILIATE_SCORES ポリシー
-- ============================================
CREATE POLICY "scores_affiliate_read" ON affiliate_scores
  FOR SELECT USING (
    auth.role() = 'service_role' OR
    affiliate_id::text = current_setting('request.jwt.claims', true)::jsonb->>'affiliate_id'
  );

CREATE POLICY "scores_service_all" ON affiliate_scores
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- AFFILIATE_TAGS ポリシー
-- ============================================
CREATE POLICY "tags_public_read" ON affiliate_tags
  FOR SELECT USING (TRUE);

CREATE POLICY "tags_service_all" ON affiliate_tags
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- AFFILIATE_TAG_ASSIGNMENTS ポリシー
-- ============================================
CREATE POLICY "tag_assignments_service_all" ON affiliate_tag_assignments
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- ADMIN_NOTES ポリシー
-- ============================================
CREATE POLICY "admin_notes_service_all" ON admin_notes
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- CAMPAIGN_RULES ポリシー
-- ============================================
CREATE POLICY "campaign_rules_public_read" ON campaign_rules
  FOR SELECT USING (TRUE);

CREATE POLICY "campaign_rules_service_all" ON campaign_rules
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- COMMISSION_RATE_HISTORY ポリシー
-- ============================================
CREATE POLICY "commission_history_service_all" ON commission_rate_history
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- PROMO_ASSETS ポリシー
-- ============================================
CREATE POLICY "promo_assets_affiliate_read" ON promo_assets
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "promo_assets_service_all" ON promo_assets
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- SUSPICIOUS_EVENTS ポリシー
-- ============================================
CREATE POLICY "suspicious_service_all" ON suspicious_events
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- ADMIN_SETTINGS ポリシー
-- ============================================
CREATE POLICY "settings_service_all" ON admin_settings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "settings_public_read" ON admin_settings
  FOR SELECT USING (TRUE);

-- campaign_affiliates
CREATE POLICY "campaign_affiliates_service_all" ON campaign_affiliates
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "campaign_affiliates_own_read" ON campaign_affiliates
  FOR SELECT USING (
    auth.role() = 'service_role' OR
    affiliate_id::text = current_setting('request.jwt.claims', true)::jsonb->>'affiliate_id'
  );
