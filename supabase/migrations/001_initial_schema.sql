-- ============================================
-- ONLINE COURSE AFFILIATE MANAGEMENT SYSTEM
-- Phase 1: Full Database Schema
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. PRODUCTS テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0, -- 円単位
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  lp_url TEXT,
  display_order INTEGER DEFAULT 0,
  sales_start_at TIMESTAMPTZ,
  sales_end_at TIMESTAMPTZ,
  access_type TEXT NOT NULL DEFAULT 'lifetime' CHECK (access_type IN ('lifetime', 'days_after_purchase', 'fixed_end_date')),
  access_days INTEGER, -- days_after_purchase の場合の日数
  access_fixed_end_at TIMESTAMPTZ, -- fixed_end_date の場合の固定終了日
  support_days INTEGER DEFAULT 0,
  bonus_claim_days INTEGER DEFAULT 0,
  after_expiry_behavior TEXT NOT NULL DEFAULT 'show_expired_message' 
    CHECK (after_expiry_behavior IN ('hide_content', 'show_expired_message', 'show_extension_offer', 'show_next_offer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. AFFILIATE_CAMPAIGNS テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS affiliate_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id),
  status TEXT NOT NULL DEFAULT 'recruiting' CHECK (status IN ('recruiting', 'active', 'paused', 'ended')),
  commission_type TEXT NOT NULL DEFAULT 'fixed' CHECK (commission_type IN ('fixed', 'percent')),
  commission_amount INTEGER NOT NULL DEFAULT 0, -- fixed: 円, percent: 0-100
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  sales_limit INTEGER, -- 販売上限数
  current_sales INTEGER DEFAULT 0, -- 現在の販売数
  auto_stop_enabled BOOLEAN DEFAULT TRUE,
  auto_stop_type TEXT DEFAULT 'sales_limit',
  auto_stop_condition JSONB DEFAULT '{}', -- 停止条件詳細
  stop_reason TEXT,
  sales_count_type TEXT NOT NULL DEFAULT 'total_product_sales' 
    CHECK (sales_count_type IN ('total_product_sales', 'affiliate_sales_only', 'campaign_sales_only')),
  attribution_rule TEXT NOT NULL DEFAULT 'same_campaign_only'
    CHECK (attribution_rule IN ('same_campaign_only', 'first_touch', 'last_touch')),
  attribution_expires_days INTEGER DEFAULT 30,
  visible_to_affiliates BOOLEAN DEFAULT TRUE,
  join_requirements TEXT,
  description TEXT,
  prohibited_expressions TEXT,
  pr_disclosure_rules TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. AFFILIATES テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  line_user_id TEXT UNIQUE,
  line_display_name TEXT,
  affiliate_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'suspended')),
  payout_method TEXT DEFAULT 'bank_transfer',
  payout_account JSONB DEFAULT '{}', -- 振込先情報
  pr_consent BOOLEAN DEFAULT FALSE, -- 広告表記同意
  consent_items JSONB DEFAULT '[]', -- 同意項目詳細
  consent_at TIMESTAMPTZ,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  session_token TEXT,
  session_expires_at TIMESTAMPTZ,
  session_absolute_expires_at TIMESTAMPTZ,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  suspicious_flag BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. CAMPAIGN_AFFILIATES テーブル (案件参加管理)
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES affiliate_campaigns(id),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'removed')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, affiliate_id)
);

-- ============================================
-- 5. LEADS テーブル (顧客/LINE登録者)
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  line_user_id TEXT UNIQUE,
  display_name TEXT,
  current_display_name TEXT,
  email TEXT,
  phone TEXT,
  first_source TEXT,
  first_campaign_id UUID REFERENCES affiliate_campaigns(id),
  first_affiliate_id UUID REFERENCES affiliates(id),
  latest_source TEXT,
  latest_campaign_id UUID REFERENCES affiliate_campaigns(id),
  latest_affiliate_id UUID REFERENCES affiliates(id),
  registered_at TIMESTAMPTZ,
  seminar_viewed_at TIMESTAMPTZ,
  purchased_at TIMESTAMPTZ,
  total_purchase_amount INTEGER DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  suspicious_flag BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. CLICKS テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id),
  affiliate_code TEXT,
  campaign_id UUID REFERENCES affiliate_campaigns(id),
  product_id UUID REFERENCES products(id),
  landing_page TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  suspicious_flag BOOLEAN DEFAULT FALSE,
  suspicious_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. ATTRIBUTION_EVENTS テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS attribution_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id),
  line_user_id TEXT,
  affiliate_id UUID REFERENCES affiliates(id),
  affiliate_code TEXT,
  campaign_id UUID REFERENCES affiliate_campaigns(id),
  product_id UUID REFERENCES products(id),
  click_id UUID REFERENCES clicks(id),
  source TEXT,
  medium TEXT,
  landing_page TEXT,
  event_type TEXT NOT NULL DEFAULT 'click' CHECK (event_type IN ('click', 'line_register', 'seminar_view', 'purchase')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- ============================================
-- 8. SEMINAR_VIEWS テーブル (セミナー視聴記録)
-- ============================================
CREATE TABLE IF NOT EXISTS seminar_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id),
  line_user_id TEXT,
  display_name TEXT,
  affiliate_id UUID REFERENCES affiliates(id),
  affiliate_code TEXT,
  campaign_id UUID REFERENCES affiliate_campaigns(id),
  product_id UUID REFERENCES products(id),
  click_id UUID REFERENCES clicks(id),
  source TEXT,
  user_agent TEXT,
  seminar_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. CHECKOUT_SESSIONS テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS checkout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_session_id TEXT UNIQUE NOT NULL,
  lead_id UUID REFERENCES leads(id),
  line_user_id TEXT,
  product_id UUID REFERENCES products(id),
  campaign_id UUID REFERENCES affiliate_campaigns(id),
  affiliate_id UUID REFERENCES affiliates(id),
  affiliate_code TEXT,
  click_id UUID REFERENCES clicks(id),
  attribution_event_id UUID REFERENCES attribution_events(id),
  amount_total INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. PURCHASES テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id),
  line_user_id TEXT,
  buyer_line_user_id TEXT,
  buyer_line_display_name TEXT, -- 購入時点のスナップショット
  buyer_email TEXT,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL, -- スナップショット
  campaign_id UUID REFERENCES affiliate_campaigns(id),
  campaign_name TEXT, -- スナップショット
  attribution_event_id UUID REFERENCES attribution_events(id),
  affiliate_id UUID REFERENCES affiliates(id),
  affiliate_name TEXT, -- スナップショット
  affiliate_code TEXT,
  affiliate_line_display_name TEXT, -- スナップショット
  purchase_source TEXT DEFAULT 'organic' CHECK (purchase_source IN ('affiliate', 'organic', 'direct', 'manual', 'official_line')),
  amount_total INTEGER NOT NULL,
  commission_amount INTEGER DEFAULT 0,
  commission_status TEXT DEFAULT 'pending' CHECK (commission_status IN ('pending', 'approved', 'rejected', 'payable', 'paid', 'cancelled', 'chargeback')),
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  refunded_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  chargeback_at TIMESTAMPTZ,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'refunded', 'cancelled', 'chargeback')),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. PRODUCT_ACCESSES テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS product_accesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID NOT NULL REFERENCES purchases(id),
  lead_id UUID REFERENCES leads(id),
  user_email TEXT,
  line_user_id TEXT,
  product_id UUID NOT NULL REFERENCES products(id),
  access_start_at TIMESTAMPTZ DEFAULT NOW(),
  access_end_at TIMESTAMPTZ, -- lifetime の場合 NULL
  access_status TEXT DEFAULT 'active' CHECK (access_status IN ('active', 'expired', 'revoked')),
  support_start_at TIMESTAMPTZ DEFAULT NOW(),
  support_end_at TIMESTAMPTZ,
  bonus_claim_end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. COMMISSIONS テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID NOT NULL REFERENCES purchases(id),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id),
  campaign_id UUID REFERENCES affiliate_campaigns(id),
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'payable', 'paid', 'cancelled', 'chargeback')),
  approved_by TEXT, -- 管理者メール
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  payout_id UUID, -- payoutsテーブル参照(後で追加)
  scheduled_payout_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 13. PAYOUTS テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id),
  amount INTEGER NOT NULL,
  commission_ids UUID[] DEFAULT '{}',
  payout_method TEXT,
  payout_account JSONB DEFAULT '{}',
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'completed', 'failed')),
  scheduled_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 外部キー追加
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS payout_id UUID REFERENCES payouts(id);

-- ============================================
-- 14. ANNOUNCEMENTS テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' 
    CHECK (type IN ('new_product', 'new_campaign', 'campaign_paused', 'campaign_ended', 
                    'commission_change', 'rule_change', 'maintenance', 'important', 'personal')),
  target_type TEXT NOT NULL DEFAULT 'all_affiliates'
    CHECK (target_type IN ('all_affiliates', 'active_affiliates', 'pending_affiliates',
                            'campaign_affiliates', 'product_affiliates', 'specific_affiliates')),
  target_campaign_id UUID REFERENCES affiliate_campaigns(id),
  target_product_id UUID REFERENCES products(id),
  target_affiliate_ids UUID[] DEFAULT '{}',
  published_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 15. ANNOUNCEMENT_READS テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL REFERENCES announcements(id),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id),
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, affiliate_id)
);

-- ============================================
-- 16. NOTIFICATIONS テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('admin', 'affiliate', 'buyer')),
  recipient_id TEXT, -- admin: email, affiliate: UUID, buyer: line_user_id
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  related_type TEXT, -- 'purchase', 'commission', 'campaign' etc
  related_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  channel TEXT DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'line')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 17. AFFILIATE_DAILY_STATS テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS affiliate_daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id),
  stat_date DATE NOT NULL,
  clicks INTEGER DEFAULT 0,
  line_registrations INTEGER DEFAULT 0,
  seminar_views INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  revenue INTEGER DEFAULT 0,
  commission INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(affiliate_id, stat_date)
);

-- ============================================
-- 18. AFFILIATE_SCORES テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS affiliate_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id),
  traffic_score NUMERIC(8,4) DEFAULT 0,
  conversion_score NUMERIC(8,4) DEFAULT 0,
  consistency_score NUMERIC(8,4) DEFAULT 0,
  product_understanding_score NUMERIC(8,4) DEFAULT 0,
  improvement_score NUMERIC(8,4) DEFAULT 0,
  overall_score NUMERIC(8,4) DEFAULT 0,
  diagnosis_type TEXT DEFAULT '通常タイプ',
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(affiliate_id)
);

-- ============================================
-- 19. AFFILIATE_TAGS テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS affiliate_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6b7280',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- デフォルトタグ挿入
INSERT INTO affiliate_tags (name, color) VALUES
  ('優良紹介者', '#10b981'),
  ('要フォロー', '#f59e0b'),
  ('初心者', '#6366f1'),
  ('成約率高い', '#3b82f6'),
  ('クリック多い', '#8b5cf6'),
  ('スパム注意', '#ef4444'),
  ('支払い確認中', '#f97316'),
  ('本命商品強い', '#059669'),
  ('ミニ講座のみ', '#64748b')
ON CONFLICT DO NOTHING;

-- ============================================
-- 20. AFFILIATE_TAG_ASSIGNMENTS テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS affiliate_tag_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id),
  tag_id UUID NOT NULL REFERENCES affiliate_tags(id),
  assigned_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(affiliate_id, tag_id)
);

-- ============================================
-- 21. ADMIN_NOTES テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS admin_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_type TEXT NOT NULL CHECK (target_type IN ('affiliate', 'lead', 'purchase', 'commission')),
  target_id UUID NOT NULL,
  note TEXT NOT NULL,
  action_type TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 22. CAMPAIGN_RULES テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES affiliate_campaigns(id),
  product_access_grants TEXT[] DEFAULT '{}', -- どの商品購入でどの案件参加権を付与するか
  required_product_id UUID REFERENCES products(id), -- 参加に必要な商品購入
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 23. COMMISSION_RATE_HISTORY テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS commission_rate_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES affiliate_campaigns(id),
  old_commission_type TEXT,
  old_commission_amount INTEGER,
  new_commission_type TEXT NOT NULL,
  new_commission_amount INTEGER NOT NULL,
  changed_by TEXT NOT NULL,
  change_reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 24. PROMO_ASSETS テーブル (紹介素材ライブラリ)
-- ============================================
CREATE TABLE IF NOT EXISTS promo_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES affiliate_campaigns(id),
  type TEXT NOT NULL CHECK (type IN ('post_text', 'story_text', 'line_text', 'email_text', 'image', 'banner', 'pr_example', 'prohibited', 'faq')),
  title TEXT,
  content TEXT NOT NULL,
  url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 25. SUSPICIOUS_EVENTS テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS suspicious_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  related_type TEXT, -- 'click', 'purchase', 'affiliate'
  related_id UUID,
  affiliate_id UUID REFERENCES affiliates(id),
  lead_id UUID REFERENCES leads(id),
  ip_hash TEXT,
  user_agent TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 26. ADMIN_SETTINGS テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- デフォルト設定
INSERT INTO admin_settings (key, value, description) VALUES
  ('ranking_criteria', '"commission_amount"', 'ランキング基準: commission_amount, purchase_count, revenue, conversion_rate'),
  ('affiliate_access_grant_rules', '{}', '商品購入→案件参加権付与ルール'),
  ('suspicious_check_enabled', 'true', '不正チェック有効'),
  ('notification_settings', '{"email": false, "line": false, "in_app": true}', '通知設定')
ON CONFLICT DO NOTHING;

-- ============================================
-- インデックス作成
-- ============================================
CREATE INDEX IF NOT EXISTS idx_clicks_affiliate_id ON clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_clicks_campaign_id ON clicks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_clicks_ip_hash ON clicks(ip_hash);
CREATE INDEX IF NOT EXISTS idx_clicks_created_at ON clicks(created_at);

CREATE INDEX IF NOT EXISTS idx_attribution_events_lead_id ON attribution_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_attribution_events_affiliate_id ON attribution_events(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_attribution_events_campaign_id ON attribution_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_attribution_events_click_id ON attribution_events(click_id);
CREATE INDEX IF NOT EXISTS idx_attribution_events_expires_at ON attribution_events(expires_at);

CREATE INDEX IF NOT EXISTS idx_purchases_lead_id ON purchases(lead_id);
CREATE INDEX IF NOT EXISTS idx_purchases_affiliate_id ON purchases(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_purchases_campaign_id ON purchases(campaign_id);
CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_purchased_at ON purchases(purchased_at);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);

CREATE INDEX IF NOT EXISTS idx_commissions_affiliate_id ON commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_purchase_id ON commissions(purchase_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);

CREATE INDEX IF NOT EXISTS idx_leads_line_user_id ON leads(line_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_email ON affiliates(email);
CREATE INDEX IF NOT EXISTS idx_affiliates_line_user_id ON affiliates(line_user_id);

CREATE INDEX IF NOT EXISTS idx_seminar_views_line_user_id ON seminar_views(line_user_id);
CREATE INDEX IF NOT EXISTS idx_seminar_views_campaign_id ON seminar_views(campaign_id);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_affiliate_daily_stats ON affiliate_daily_stats(affiliate_id, stat_date);

-- ============================================
-- updated_at自動更新トリガー
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_affiliate_campaigns_updated_at BEFORE UPDATE ON affiliate_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_affiliates_updated_at BEFORE UPDATE ON affiliates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_purchases_updated_at BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_product_accesses_updated_at BEFORE UPDATE ON product_accesses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_commissions_updated_at BEFORE UPDATE ON commissions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payouts_updated_at BEFORE UPDATE ON payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_seminar_views_updated_at BEFORE UPDATE ON seminar_views FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_affiliate_scores_updated_at BEFORE UPDATE ON affiliate_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 販売数自動集計ファンクション
-- ============================================
CREATE OR REPLACE FUNCTION get_campaign_valid_sales(p_campaign_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_campaign affiliate_campaigns;
  v_count INTEGER;
BEGIN
  SELECT * INTO v_campaign FROM affiliate_campaigns WHERE id = p_campaign_id;
  
  IF v_campaign.sales_count_type = 'total_product_sales' THEN
    SELECT COUNT(*) INTO v_count
    FROM purchases
    WHERE product_id = v_campaign.product_id
      AND status = 'completed';
  ELSIF v_campaign.sales_count_type = 'affiliate_sales_only' THEN
    SELECT COUNT(*) INTO v_count
    FROM purchases
    WHERE campaign_id = p_campaign_id
      AND purchase_source = 'affiliate'
      AND status = 'completed';
  ELSE -- campaign_sales_only
    SELECT COUNT(*) INTO v_count
    FROM purchases
    WHERE campaign_id = p_campaign_id
      AND status = 'completed';
  END IF;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 自動停止チェックファンクション
-- ============================================
CREATE OR REPLACE FUNCTION check_and_auto_stop_campaign(p_campaign_id UUID)
RETURNS VOID AS $$
DECLARE
  v_campaign affiliate_campaigns;
  v_valid_sales INTEGER;
BEGIN
  SELECT * INTO v_campaign FROM affiliate_campaigns WHERE id = p_campaign_id;
  
  IF v_campaign.auto_stop_enabled AND v_campaign.sales_limit IS NOT NULL THEN
    v_valid_sales := get_campaign_valid_sales(p_campaign_id);
    
    IF v_valid_sales >= v_campaign.sales_limit AND v_campaign.status = 'active' THEN
      UPDATE affiliate_campaigns
      SET status = 'ended',
          stop_reason = '販売上限(' || v_campaign.sales_limit || '部)に到達しました。',
          updated_at = NOW()
      WHERE id = p_campaign_id;
      
      -- 通知生成
      INSERT INTO notifications (
        recipient_type, recipient_id, type, title, body, related_type, related_id
      )
      SELECT 
        'admin', 'admin', 'campaign_auto_stopped',
        'アフィリエイト案件が自動停止されました',
        v_campaign.name || ' が販売上限に達し自動停止されました。',
        'campaign', p_campaign_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- サンプルデータ挿入
-- ============================================

-- スタート講座商品
INSERT INTO products (
  id, name, description, price, status, lp_url, display_order,
  access_type, support_days, bonus_claim_days, after_expiry_behavior
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'AI副業1時間化スタート講座',
  'AIを活用して副業を1時間で始めるための完全ガイド。月収10万円を目指す方向けの実践講座です。',
  29800,
  'active',
  '/start-course',
  1,
  'lifetime',
  180,
  30,
  'show_expired_message'
) ON CONFLICT DO NOTHING;

-- ミニ講座商品
INSERT INTO products (
  id, name, description, price, status, lp_url, display_order,
  access_type, access_days, support_days, after_expiry_behavior
) VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'アフィリエイト実践ミニ講座',
  'アフィリエイトマーケティングの基礎から実践までを1時間で学べるミニ講座です。',
  4800,
  'active',
  '/mini-course',
  2,
  'days_after_purchase',
  365,
  30,
  'show_extension_offer'
) ON CONFLICT DO NOTHING;

-- スタート講座1,000部突破キャンペーン
INSERT INTO affiliate_campaigns (
  id, name, product_id, status,
  commission_type, commission_amount,
  sales_limit, auto_stop_enabled,
  sales_count_type, attribution_rule,
  attribution_expires_days, visible_to_affiliates,
  description
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'スタート講座1,000部突破キャンペーン',
  'a0000000-0000-0000-0000-000000000001',
  'active',
  'fixed',
  10000,
  1000,
  TRUE,
  'total_product_sales',
  'same_campaign_only',
  30,
  TRUE,
  '累計販売数1,000部達成を記念した特別アフィリエイトキャンペーン。1部につき10,000円の報酬をお支払いします。'
) ON CONFLICT DO NOTHING;
