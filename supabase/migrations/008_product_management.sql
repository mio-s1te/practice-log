-- 008_product_management.sql
-- 商品編集画面拡張・紹介素材・パートナー設定フィールド追加
-- 対応する管理画面: AdminProducts.tsx（7タブ構成）

-- ============================================================
-- 1. products テーブル拡張
-- ============================================================

-- 商品基本情報
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'course';
ALTER TABLE products ADD COLUMN IF NOT EXISTS provider_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS affiliate_lp_url TEXT; -- 紹介用LP URL（販売ページURLとは別）

-- 価格情報
ALTER TABLE products ADD COLUMN IF NOT EXISTS regular_price INTEGER; -- 通常価格（参考表示用）
ALTER TABLE products ADD COLUMN IF NOT EXISTS campaign_price INTEGER; -- 限定価格
ALTER TABLE products ADD COLUMN IF NOT EXISTS campaign_price_active BOOLEAN DEFAULT false; -- 限定価格適用中
ALTER TABLE products ADD COLUMN IF NOT EXISTS campaign_condition TEXT; -- 価格切り替え条件メモ
ALTER TABLE products ADD COLUMN IF NOT EXISTS stripe_checkout_url TEXT; -- Stripe決済URL（直リンク用）

-- 紹介条件
ALTER TABLE products ADD COLUMN IF NOT EXISTS affiliate_enabled BOOLEAN DEFAULT false; -- アフィリエイト対象か
ALTER TABLE products ADD COLUMN IF NOT EXISTS affiliate_access_level TEXT DEFAULT 'none'
  CHECK (affiliate_access_level IN ('all','approved_only','requires_purchase','specific','tag','none'));
  -- all: 全員OK, approved_only: 承認済みアフィリエイターのみ
  -- requires_purchase: スタート講座購入者かつ承認済み
  -- specific: 指定アフィリエイターのみ, tag: 指定タグのみ, none: 紹介不可
ALTER TABLE products ADD COLUMN IF NOT EXISTS affiliate_application_open BOOLEAN DEFAULT false; -- 紹介申請受け付けるか

-- 報酬条件
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'percent'
  CHECK (commission_type IN ('fixed','percent','none'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_fixed INTEGER; -- 固定報酬（円）
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(5,2); -- パーセント報酬
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_trigger TEXT DEFAULT 'purchase'
  CHECK (commission_trigger IN ('click','purchase','confirmed'));
  -- click: クリック時, purchase: 購入時, confirmed: 確定後
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_confirm_timing TEXT DEFAULT '30d_after_purchase'
  CHECK (commission_confirm_timing IN ('immediate','14d_after_purchase','30d_after_purchase','60d_after_purchase','manual'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS payout_schedule TEXT DEFAULT 'monthly'; -- 支払いスケジュール
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_payout_amount INTEGER DEFAULT 3000; -- 最低支払額（円）
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_on_refund TEXT DEFAULT 'cancel'
  CHECK (commission_on_refund IN ('keep','cancel','partial'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_on_cancel TEXT DEFAULT 'cancel'
  CHECK (commission_on_cancel IN ('keep','cancel'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_on_chargeback TEXT DEFAULT 'cancel'
  CHECK (commission_on_chargeback IN ('keep','cancel','clawback'));

-- キャンセル・返金条件
ALTER TABLE products ADD COLUMN IF NOT EXISTS refund_period_days INTEGER DEFAULT 14; -- 返金可能期間（日）
ALTER TABLE products ADD COLUMN IF NOT EXISTS revoke_commission_on_refund BOOLEAN DEFAULT true; -- 返金時に報酬取り消すか
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_hold_days INTEGER DEFAULT 30; -- 報酬確定前保留期間（日）
ALTER TABLE products ADD COLUMN IF NOT EXISTS suspicious_handling TEXT DEFAULT 'hold'
  CHECK (suspicious_handling IN ('hold','cancel','manual_review'));

-- パートナー向け表示設定
ALTER TABLE products ADD COLUMN IF NOT EXISTS show_to_partner BOOLEAN DEFAULT false; -- 商品提供者に表示するか
ALTER TABLE products ADD COLUMN IF NOT EXISTS partner_view_scope JSONB DEFAULT '["stats","purchases","affiliates","csv"]'::jsonb;
  -- "stats": 販売統計, "purchases": 購入者一覧, "affiliates": 紹介者別成果
  -- "csv": CSV出力, "campaign": キャンペーン状況
ALTER TABLE products ADD COLUMN IF NOT EXISTS partner_can_export_csv BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS partner_can_request_material_edit BOOLEAN DEFAULT false; -- 素材編集申請権

-- ============================================================
-- 2. promo_assets テーブル（紹介素材）
-- ============================================================

CREATE TABLE IF NOT EXISTS promo_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- 紹介文
  short_description TEXT,           -- 短文紹介文（SNS向け）
  long_description TEXT,            -- 長文紹介文（LP・ブログ向け）
  sns_post_example TEXT,            -- SNS投稿例
  line_intro_text TEXT,             -- LINE紹介文
  story_text TEXT,                  -- ストーリー文（Instagram等）
  pr_notation_example TEXT,         -- PR表記例（「#PR」「#広告」表記のサンプル）
  prohibited_expressions TEXT,      -- 禁止表現リスト
  faq TEXT,                         -- よくある質問（Q&A形式テキスト）
  selling_points TEXT,              -- 紹介してほしいポイント
  discouraged_expressions TEXT,     -- 紹介してほしくない表現

  -- メタ情報
  version INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 商品ごとに最新1件のみをアクティブにするため部分インデックス
CREATE INDEX IF NOT EXISTS idx_promo_assets_product_id ON promo_assets(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_assets_current ON promo_assets(product_id) WHERE is_current = true;

-- ============================================================
-- 3. product_tags テーブル（アフィリエイタータグによる紹介権限用）
-- ============================================================

CREATE TABLE IF NOT EXISTS product_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, tag_name)
);

-- ============================================================
-- 4. affiliates テーブルにタグカラム追加
-- ============================================================

ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
  -- アフィリエイタータグ（tag-based 紹介権限チェックに使用）

-- ============================================================
-- 5. RLSポリシー更新
-- ============================================================

-- promo_assets: 管理者のみ書き込み、アフィリエイターは自分が紹介権限を持つ商品のみ読み取り
ALTER TABLE promo_assets ENABLE ROW LEVEL SECURITY;

-- 管理者は全操作可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'promo_assets' AND policyname = 'admin_all_promo_assets'
  ) THEN
    CREATE POLICY admin_all_promo_assets ON promo_assets
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- アフィリエイターは紹介権限がある商品の素材のみ参照可
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'promo_assets' AND policyname = 'affiliate_read_permitted_promo_assets'
  ) THEN
    CREATE POLICY affiliate_read_permitted_promo_assets ON promo_assets
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM product_affiliate_permissions pap
          JOIN affiliates a ON a.id = pap.affiliate_id
          WHERE pap.product_id = promo_assets.product_id
            AND a.user_id = auth.uid()
            AND pap.can_refer = true
        )
      );
  END IF;
END $$;

-- ============================================================
-- 6. ビュー更新: affiliate_product_permissions_view に素材情報を追加
-- ============================================================

CREATE OR REPLACE VIEW affiliate_product_permissions_view AS
SELECT
  pap.id                     AS permission_id,
  pap.affiliate_id,
  pap.product_id,
  pap.can_refer,
  pap.access_level,
  pap.granted_at,
  pap.revoked_at,
  pap.note,

  -- 商品情報
  p.name                     AS product_name,
  p.description              AS product_description,
  p.price                    AS product_price,
  p.status                   AS product_status,
  p.lp_url                   AS product_lp_url,
  p.affiliate_lp_url,
  p.product_type,
  p.category,

  -- 報酬情報
  p.commission_type,
  p.commission_fixed,
  p.commission_percent,
  p.commission_trigger,
  p.commission_confirm_timing,
  p.commission_on_refund,
  p.commission_on_cancel,
  p.commission_on_chargeback,
  p.refund_period_days,
  p.revoke_commission_on_refund,
  p.commission_hold_days,

  -- 紹介素材
  pa.short_description,
  pa.long_description,
  pa.sns_post_example,
  pa.line_intro_text,
  pa.story_text,
  pa.pr_notation_example,
  pa.prohibited_expressions,
  pa.faq,
  pa.selling_points,
  pa.discouraged_expressions,

  -- アフィリエイター情報
  a.name                     AS affiliate_name,
  a.email                    AS affiliate_email,
  a.affiliate_code

FROM product_affiliate_permissions pap
JOIN products p ON p.id = pap.product_id
JOIN affiliates a ON a.id = pap.affiliate_id
LEFT JOIN promo_assets pa ON pa.product_id = pap.product_id AND pa.is_current = true;

-- ============================================================
-- 7. updated_at トリガー追加
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_promo_assets_updated_at ON promo_assets;
CREATE TRIGGER trg_promo_assets_updated_at
  BEFORE UPDATE ON promo_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 8. サンプルデータ: スタート講座・アフィリエイト講座の初期設定
-- ============================================================

-- スタート講座
INSERT INTO products (
  id, name, description, price, status, lp_url, affiliate_lp_url,
  affiliate_enabled, affiliate_access_level, affiliate_application_open,
  commission_type, commission_percent, commission_confirm_timing,
  refund_period_days, revoke_commission_on_refund, commission_hold_days,
  show_to_partner, partner_can_export_csv,
  regular_price, category
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'AI副業1時間化スタート講座',
  '副業迷子から抜け出すための設計講座。AIを使いながら自分専用の収益化ロードマップを作る実践講座。',
  29800, 'active', '/start-course', '/start-course',
  true, 'requires_purchase', true,
  'percent', 30.00, '30d_after_purchase',
  14, true, 30,
  true, true,
  99800, 'course'
) ON CONFLICT (id) DO UPDATE SET
  affiliate_enabled = EXCLUDED.affiliate_enabled,
  affiliate_access_level = EXCLUDED.affiliate_access_level,
  affiliate_application_open = EXCLUDED.affiliate_application_open,
  commission_type = EXCLUDED.commission_type,
  commission_percent = EXCLUDED.commission_percent,
  commission_confirm_timing = EXCLUDED.commission_confirm_timing,
  refund_period_days = EXCLUDED.refund_period_days,
  revoke_commission_on_refund = EXCLUDED.revoke_commission_on_refund,
  commission_hold_days = EXCLUDED.commission_hold_days,
  show_to_partner = EXCLUDED.show_to_partner,
  partner_can_export_csv = EXCLUDED.partner_can_export_csv,
  affiliate_lp_url = EXCLUDED.affiliate_lp_url,
  regular_price = EXCLUDED.regular_price,
  category = EXCLUDED.category,
  updated_at = NOW();

-- AIアフィリエイト実践講座
INSERT INTO products (
  id, name, description, price, status, lp_url, affiliate_lp_url,
  affiliate_enabled, affiliate_access_level, affiliate_application_open,
  commission_type, commission_percent, commission_confirm_timing,
  refund_period_days, revoke_commission_on_refund, commission_hold_days,
  show_to_partner, regular_price, category,
  campaign_price, campaign_price_active
) VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'AIアフィリエイト実践講座',
  'LINE経由で案内するアフィリエイト入門講座。通常価格29,800円、スタート講座1,000部突破まで4,980円。',
  4980, 'active', '/affiliate-course', '/affiliate-course',
  true, 'all', false,
  'percent', 20.00, '30d_after_purchase',
  14, true, 30,
  false, 29800, 'course',
  4980, true
) ON CONFLICT (id) DO UPDATE SET
  campaign_price = EXCLUDED.campaign_price,
  campaign_price_active = EXCLUDED.campaign_price_active,
  affiliate_enabled = EXCLUDED.affiliate_enabled,
  affiliate_access_level = EXCLUDED.affiliate_access_level,
  updated_at = NOW();

-- スタート講座用紹介素材
INSERT INTO promo_assets (
  product_id, short_description, long_description,
  sns_post_example, line_intro_text, pr_notation_example,
  prohibited_expressions, faq, selling_points, is_current
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '副業迷子から抜け出す！AIを使って自分専用の収益化設計を作る実践講座。1日1時間から始められます。',
  'この講座は「副業をがんばっているのに売上が出ない」「何をすればいいか分からない」という人のための設計講座です。AIツールの使い方だけでなく、誰に届けるか・何を売るか・どんな導線で購入につなげるかまで設計します。',
  '【副業迷子の方へ】\n頑張っているのに売上が出ない原因、実は"設計不足"かもしれません。\nAIを使って自分専用の収益化ロードマップを作る「AI副業1時間化スタート講座」が今なら¥29,800で受講できます。\n販売数が増えると価格が上がる仕組みなので、気になる方はお早めに👇\n#副業 #AI副業 #PR',
  '副業で収益化を目指している方に、私が受講して良かった講座を紹介したくてメッセージしました！\n「AI副業1時間化スタート講座」というもので、AIツールの使い方だけでなく、誰に向けて何を売るか・収益導線の作り方まで設計できる内容でした。\n今は¥29,800ですが、販売数が増えると値上がりします。よかったら見てみてください👇',
  '※この投稿は広告です（#PR）\nまたは：この投稿にはアフィリエイトリンクが含まれます。',
  '・実績のでっち上げ・誇大表現は禁止（例：「絶対に稼げる」「誰でも月収100万」等）\n・個人の体験談を断定的成果として表現することは禁止\n・「無料」という表現で有料商品へ誘導する際は必ず費用を明記すること\n・PR表記の省略は禁止',
  'Q. 副業初心者でも大丈夫ですか？\nA. はい。副業初心者を主な対象としています。\n\nQ. どのくらいの時間が必要ですか？\nA. 1日1時間を目安に設計されています。\n\nQ. AIの知識がなくても使えますか？\nA. 使えます。ChatGPT等の使い方も講座内で説明します。\n\nQ. 購入後すぐ視聴できますか？\nA. 購入完了後すぐにアクセス可能です。',
  '・副業を始めたいが何から手をつけていいか分からない方へ刺さります\n・「AIでできる副業」「副業設計」「収益導線」というキーワードで伝えると反応が良いです\n・段階価格（販売数が増えると値上がり）は訴求力があります',
  true
) ON CONFLICT DO NOTHING;
