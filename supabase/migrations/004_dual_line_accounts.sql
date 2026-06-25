-- ============================================
-- 004_dual_line_accounts.sql
-- 2つのLINE公式アカウント対応
-- 無料セミナーLINE / 購入者LINE の役割分担
-- ============================================

-- ============================================
-- leads テーブルに購入者LINE関連フィールドを追加
-- 無料セミナーLINEのuser_idは既存の line_user_id を使用
-- ============================================
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS seminar_line_user_id   TEXT,          -- 無料セミナーLINE userId (旧 line_user_id を移行)
  ADD COLUMN IF NOT EXISTS seminar_line_display_name TEXT,        -- 無料セミナーLINE 表示名
  ADD COLUMN IF NOT EXISTS buyer_line_user_id     TEXT UNIQUE,   -- 購入者LINE userId
  ADD COLUMN IF NOT EXISTS buyer_line_display_name TEXT,          -- 購入者LINE 表示名
  ADD COLUMN IF NOT EXISTS buyer_line_registered_at TIMESTAMPTZ, -- 購入者LINE 登録日時
  ADD COLUMN IF NOT EXISTS course_received_at     TIMESTAMPTZ,   -- 講座URL受取日時
  ADD COLUMN IF NOT EXISTS course_delivery_status TEXT           -- 講座受取状況: pending/delivered/failed
    DEFAULT 'pending'
    CHECK (course_delivery_status IN ('pending', 'delivered', 'failed'));

-- 既存 line_user_id を seminar_line_user_id にバックフィル
-- (新規登録時は両方に同じ値を書き込む移行期間対応)
UPDATE leads
SET seminar_line_user_id    = line_user_id,
    seminar_line_display_name = current_display_name
WHERE line_user_id IS NOT NULL
  AND seminar_line_user_id IS NULL;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_leads_seminar_line_user_id ON leads(seminar_line_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_buyer_line_user_id   ON leads(buyer_line_user_id);

-- ============================================
-- buyer_line_verifications テーブル
-- 購入者LINE登録時の確認フロー管理
-- ============================================
CREATE TABLE IF NOT EXISTS buyer_line_verifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE,
  buyer_line_user_id TEXT NOT NULL,            -- 購入者LINE の userId
  buyer_line_display_name TEXT,
  verified_by     TEXT NOT NULL DEFAULT 'line_user_id',
  -- 'line_user_id': セミナーLINEのuser_idと照合
  -- 'email': メールアドレスで照合
  -- 'stripe_session_id': Stripe決済IDで照合
  verified_value  TEXT,                        -- 照合に使ったキー値
  purchase_id     UUID REFERENCES purchases(id),
  status          TEXT NOT NULL DEFAULT 'verified'
    CHECK (status IN ('verified', 'pending_email', 'failed')),
  pending_reason  TEXT,                        -- status='pending_email' の場合の理由
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyer_line_verifications_buyer ON buyer_line_verifications(buyer_line_user_id);
CREATE INDEX IF NOT EXISTS idx_buyer_line_verifications_lead  ON buyer_line_verifications(lead_id);

-- ============================================
-- line_keyword_responses テーブル
-- キーワード応答設定（管理画面から編集可能）
-- ============================================
CREATE TABLE IF NOT EXISTS line_keyword_responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_type   TEXT NOT NULL CHECK (line_type IN ('seminar', 'buyer')),
  keyword     TEXT NOT NULL,         -- トリガーキーワード（部分一致）
  reply_text  TEXT NOT NULL,         -- 返信テキスト
  reply_type  TEXT NOT NULL DEFAULT 'text'
    CHECK (reply_type IN ('text', 'flex', 'url')),
  flex_json   JSONB,                 -- reply_type='flex'のときのFlex Message JSON
  url         TEXT,                  -- reply_type='url'のときのURL
  requires_purchase BOOLEAN DEFAULT FALSE, -- 購入者確認が必要か
  display_order INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_line_keyword_responses_type ON line_keyword_responses(line_type, is_active);

-- ============================================
-- RLS設定
-- ============================================
ALTER TABLE buyer_line_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_keyword_responses   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_buyer_line_verifications" ON buyer_line_verifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_line_keyword_responses" ON line_keyword_responses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- anon: keyword_responses の読み取り可（サーバーサイド処理用）
CREATE POLICY "anon_read_line_keyword_responses" ON line_keyword_responses
  FOR SELECT TO anon USING (is_active = true);

-- ============================================
-- デフォルトキーワード応答データ
-- 無料セミナーLINE
-- ============================================
INSERT INTO line_keyword_responses (line_type, keyword, reply_text, requires_purchase, display_order) VALUES
-- セミナーLINE キーワード
('seminar', 'セミナー',
 '🎥 無料セミナーはこちらからご覧いただけます！

▼ AI副業1時間化セミナー
https://{{SITE_URL}}/seminar

LINEにご登録いただくと、セミナー後に特別オファーをお届けします📩',
 false, 1),

('seminar', 'ロードマップ',
 '🗺 AI副業1時間化ロードマップをお届けします！

【ステップ1】副業テーマ決め（1時間）
【ステップ2】最初の商品作り（2〜3日）
【ステップ3】SNS集客の仕組み化（1週間）
【ステップ4】アフィリエイトで収益化（継続）

詳しい内容はセミナーでお話しします👇
https://{{SITE_URL}}/seminar',
 false, 2),

('seminar', 'アフィリエイト',
 '💰 アフィリエイト（紹介制度）についてご案内します！

✅ 紹介1件につき10,000円の報酬
✅ 1,000部突破キャンペーン実施中
✅ 紹介者ダッシュボードで実績管理

アフィリエイト参加は、スタート講座ご購入後に申請できます📝
まずはスタート講座をご覧ください👇
https://{{SITE_URL}}/start-course',
 false, 3),

('seminar', 'スタート講座',
 '📚 AI副業1時間化スタート講座のご案内！

【価格】¥29,800（税込）
【内容】
・AI副業テーマの決め方
・デジタル商品の作り方
・SNS集客の自動化
・アフィリエイトで稼ぐ仕組み

▼ 詳細・購入はこちら
https://{{SITE_URL}}/start-course

ご質問はいつでもお気軽に😊',
 false, 4),

('seminar', '価格',
 '💴 現在の講座価格をお知らせします！

【AI副業1時間化スタート講座】
▸ 現在価格：¥29,800（税込）
▸ 1,000部突破で¥49,800に値上がり予定

🔥 早期価格でのご購入をおすすめします！

▼ 購入ページ
https://{{SITE_URL}}/start-course',
 false, 5),

('seminar', '質問',
 '❓ ご質問ありがとうございます！

よくある質問はこちら：

Q. 初心者でも大丈夫？
→ はい！AIツールの使い方から丁寧に解説します

Q. どれくらいで成果が出る？
→ 早い方で1〜2週間で最初の収益が出ています

Q. サポートはある？
→ 180日間の質問無制限サポート付きです

その他のご質問は、こちらのメッセージにそのままご返信ください📩',
 false, 6),

-- 購入者LINE キーワード（requires_purchase=true）
('buyer', '講座',
 '📚 スタート講座はこちらからアクセスできます！

▼ 講座ページ（要ログイン）
https://{{SITE_URL}}/course

ログインにはご購入時のメールアドレスをお使いください。
ご不明な点はこちらにメッセージをお送りください😊',
 true, 10),

('buyer', '第0章',
 '📖 第0章：AI副業マインドセット

▼ 第0章はこちら
https://{{SITE_URL}}/course/chapter/0

まずはこちらをご覧ください。副業で成功するための考え方をお伝えします！',
 true, 11),

('buyer', '第1章',
 '📖 第1章：AIで副業テーマを決める

▼ 第1章はこちら
https://{{SITE_URL}}/course/chapter/1

AIを使った副業テーマの決め方を解説します。ワークシートも活用してください！',
 true, 12),

('buyer', 'ワーク',
 '📝 副業テーマ決定ワークシートはこちら！

▼ ワークシートダウンロード
https://{{SITE_URL}}/course/worksheet

PDF形式でダウンロードできます。印刷してご活用ください。
記入後は写真を撮ってこちらにお送りいただければフィードバックします📩',
 true, 13),

('buyer', 'ToDo',
 '✅ ToDoアプリはこちら！

▼ 副業進捗ToDoアプリ
https://{{SITE_URL}}/course/todo

今日やるべきタスクを管理して、着実に前進しましょう！',
 true, 14),

('buyer', '特典',
 '🎁 ご購入特典のご案内！

【特典一覧】
1️⃣ AI活用プロンプト集（¥9,800相当）
2️⃣ SNS集客テンプレート30選
3️⃣ 副業収益シミュレーター
4️⃣ 限定コミュニティへの招待

▼ 特典の受け取りはこちら
https://{{SITE_URL}}/course/bonus

受取期限：ご購入から90日以内',
 true, 15),

('buyer', '紹介',
 '💰 紹介制度（アフィリエイト）のご案内！

スタート講座をご購入いただいた方は、紹介制度に参加できます。

【報酬】1件紹介するごとに10,000円
【条件】紹介URLから購入された場合

▼ アフィリエイト参加申請
https://{{SITE_URL}}/affiliate/register',
 true, 16),

('buyer', 'アフィリエイト参加',
 '📝 アフィリエイト参加申請はこちら！

▼ 参加申請フォーム
https://{{SITE_URL}}/affiliate/register

申請後、審査を経て（通常1〜2営業日）、紹介URLが発行されます。
ご不明な点はこちらにメッセージをお送りください😊',
 true, 17),

('buyer', '紹介者画面',
 '📊 紹介者ダッシュボードはこちら！

▼ 紹介者ダッシュボード
https://{{SITE_URL}}/affiliate/dashboard

クリック数・登録数・購入数・報酬額をリアルタイムで確認できます。
グラフやスコア診断もありますので、ぜひご活用ください！',
 true, 18)
ON CONFLICT DO NOTHING;
