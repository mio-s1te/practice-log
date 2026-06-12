// ============================================
// 型定義ファイル
// ============================================

export type ProductStatus = 'active' | 'paused' | 'archived';
export type AccessType = 'lifetime' | 'days_after_purchase' | 'fixed_end_date';
export type AfterExpiryBehavior = 'hide_content' | 'show_expired_message' | 'show_extension_offer' | 'show_next_offer';

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stripe_price_id?: string;
  status: ProductStatus;
  lp_url?: string;
  display_order: number;
  sales_start_at?: string;
  sales_end_at?: string;
  access_type: AccessType;
  access_days?: number;
  access_fixed_end_at?: string;
  support_days?: number;
  bonus_claim_days?: number;
  after_expiry_behavior: AfterExpiryBehavior;
  created_at: string;
  updated_at: string;
}

export type CampaignStatus = 'recruiting' | 'active' | 'paused' | 'ended';
export type CommissionType = 'fixed' | 'percent';
export type SalesCountType = 'total_product_sales' | 'affiliate_sales_only' | 'campaign_sales_only';
export type AttributionRule = 'same_campaign_only' | 'first_touch' | 'last_touch';

export interface AffiliateCampaign {
  id: string;
  name: string;
  product_id: string;
  status: CampaignStatus;
  commission_type: CommissionType;
  commission_amount: number;
  starts_at?: string;
  ends_at?: string;
  sales_limit?: number;
  current_sales: number;
  auto_stop_enabled: boolean;
  auto_stop_type?: string;
  auto_stop_condition?: Record<string, unknown>;
  stop_reason?: string;
  sales_count_type: SalesCountType;
  attribution_rule: AttributionRule;
  attribution_expires_days: number;
  visible_to_affiliates: boolean;
  join_requirements?: string;
  description?: string;
  prohibited_expressions?: string;
  pr_disclosure_rules?: string;
  created_at: string;
  updated_at: string;
  // Joined
  product?: Product;
}

export type AffiliateStatus = 'active' | 'pending' | 'suspended';

export interface Affiliate {
  id: string;
  name: string;
  email: string;
  line_user_id?: string;
  line_display_name?: string;
  affiliate_code: string;
  status: AffiliateStatus;
  payout_method?: string;
  payout_account?: Record<string, unknown>;
  pr_consent: boolean;
  consent_items?: string[];
  consent_at?: string;
  registered_at: string;
  last_login_at?: string;
  notes?: string;
  tags?: string[];
  suspicious_flag: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  line_user_id?: string;
  display_name?: string;
  current_display_name?: string;
  email?: string;
  first_source?: string;
  first_campaign_id?: string;
  first_affiliate_id?: string;
  latest_source?: string;
  latest_campaign_id?: string;
  latest_affiliate_id?: string;
  registered_at?: string;
  seminar_viewed_at?: string;
  purchased_at?: string;
  total_purchase_amount: number;
  purchase_count: number;
  suspicious_flag: boolean;
  created_at: string;
  updated_at: string;
}

export interface Click {
  id: string;
  affiliate_id?: string;
  affiliate_code?: string;
  campaign_id?: string;
  product_id?: string;
  landing_page?: string;
  referrer?: string;
  user_agent?: string;
  ip_hash?: string;
  suspicious_flag: boolean;
  suspicious_reason?: string;
  created_at: string;
}

export interface AttributionEvent {
  id: string;
  lead_id?: string;
  line_user_id?: string;
  affiliate_id?: string;
  affiliate_code?: string;
  campaign_id?: string;
  product_id?: string;
  click_id?: string;
  source?: string;
  medium?: string;
  landing_page?: string;
  event_type: 'click' | 'line_register' | 'seminar_view' | 'purchase';
  created_at: string;
  expires_at?: string;
}

export interface SeminarView {
  id: string;
  lead_id?: string;
  line_user_id?: string;
  display_name?: string;
  affiliate_id?: string;
  affiliate_code?: string;
  campaign_id?: string;
  product_id?: string;
  click_id?: string;
  source?: string;
  user_agent?: string;
  seminar_viewed_at: string;
  created_at: string;
}

export type PurchaseSource = 'affiliate' | 'organic' | 'direct' | 'manual' | 'official_line';
export type CommissionStatus = 'pending' | 'approved' | 'rejected' | 'payable' | 'paid' | 'cancelled' | 'chargeback';
export type PurchaseStatus = 'completed' | 'refunded' | 'cancelled' | 'chargeback';

export interface Purchase {
  id: string;
  lead_id?: string;
  line_user_id?: string;
  buyer_line_user_id?: string;
  buyer_line_display_name?: string;
  buyer_email?: string;
  product_id?: string;
  product_name: string;
  campaign_id?: string;
  campaign_name?: string;
  attribution_event_id?: string;
  affiliate_id?: string;
  affiliate_name?: string;
  affiliate_code?: string;
  affiliate_line_display_name?: string;
  purchase_source: PurchaseSource;
  amount_total: number;
  commission_amount: number;
  commission_status: CommissionStatus;
  stripe_session_id?: string;
  stripe_payment_intent_id?: string;
  refunded_at?: string;
  cancelled_at?: string;
  chargeback_at?: string;
  status: PurchaseStatus;
  purchased_at: string;
  created_at: string;
}

export interface ProductAccess {
  id: string;
  purchase_id: string;
  lead_id?: string;
  user_email?: string;
  line_user_id?: string;
  product_id: string;
  access_start_at: string;
  access_end_at?: string;
  access_status: 'active' | 'expired' | 'revoked';
  support_start_at?: string;
  support_end_at?: string;
  bonus_claim_end_at?: string;
  created_at: string;
}

export interface Commission {
  id: string;
  purchase_id: string;
  affiliate_id: string;
  campaign_id?: string;
  amount: number;
  status: CommissionStatus;
  approved_by?: string;
  approved_at?: string;
  rejected_reason?: string;
  payout_id?: string;
  scheduled_payout_at?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
  // Joined
  purchase?: Purchase;
  affiliate?: Affiliate;
}

export interface Payout {
  id: string;
  affiliate_id: string;
  amount: number;
  commission_ids: string[];
  payout_method?: string;
  payout_account?: Record<string, unknown>;
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
  scheduled_at?: string;
  processed_at?: string;
  completed_at?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: string;
  target_type: string;
  target_campaign_id?: string;
  target_product_id?: string;
  target_affiliate_ids?: string[];
  published_at: string;
  expires_at?: string;
  is_published: boolean;
  created_by?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  recipient_type: 'admin' | 'affiliate' | 'buyer';
  recipient_id?: string;
  type: string;
  title: string;
  body: string;
  related_type?: string;
  related_id?: string;
  is_read: boolean;
  read_at?: string;
  channel: 'in_app' | 'email' | 'line';
  sent_at: string;
}

export interface AffiliateScore {
  id: string;
  affiliate_id: string;
  traffic_score: number;
  conversion_score: number;
  consistency_score: number;
  product_understanding_score: number;
  improvement_score: number;
  overall_score: number;
  diagnosis_type: string;
  calculated_at: string;
}

export interface AffiliateDailyStat {
  id: string;
  affiliate_id: string;
  stat_date: string;
  clicks: number;
  line_registrations: number;
  seminar_views: number;
  purchases: number;
  revenue: number;
  commission: number;
}

export interface PromoAsset {
  id: string;
  campaign_id: string;
  type: 'post_text' | 'story_text' | 'line_text' | 'email_text' | 'image' | 'banner' | 'pr_example' | 'prohibited' | 'faq';
  title?: string;
  content: string;
  url?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface SuspiciousEvent {
  id: string;
  event_type: string;
  description: string;
  related_type?: string;
  related_id?: string;
  affiliate_id?: string;
  lead_id?: string;
  ip_hash?: string;
  user_agent?: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  resolved_by?: string;
  resolved_at?: string;
  notes?: string;
  created_at: string;
}

// ダッシュボード統計
export interface AdminDashboardStats {
  totalRevenue: number;
  totalSales: number;
  monthlyRevenue: number;
  monthlySales: number;
  totalClicks: number;
  totalLineRegistrations: number;
  totalSeminarViews: number;
  totalPurchases: number;
  overallConversionRate: number;
  pendingCommissions: number;
  paidCommissions: number;
  activeCampaigns: number;
  pausedCampaigns: number;
  suspiciousCount: number;
}

// アフィリエイトダッシュボード統計
export interface AffiliateDashboardStats {
  thisMonthClicks: number;
  thisMonthLineRegistrations: number;
  thisMonthSeminarViews: number;
  thisMonthPurchases: number;
  thisMonthConversionRate: number;
  thisMonthRevenue: number;
  thisMonthCommission: number;
  unpaidCommission: number;
  paidCommission: number;
  totalClicks: number;
  totalLineRegistrations: number;
  totalSeminarViews: number;
  totalPurchases: number;
  totalConversionRate: number;
  totalCommission: number;
  clickToLineRate: number;
  lineToSeminarRate: number;
  seminarToPurchaseRate: number;
  clickToPurchaseRate: number;
  rank?: number;
  totalAffiliates?: number;
  rankAboveDiff?: number;
  rankBelowDiff?: number;
  rankTopDiff?: number;
}

// クッキー/ストレージ保存データ
export interface TrackingData {
  ref?: string;
  clickId?: string;
  campaignId?: string;
  productId?: string;
  source?: string;
}
