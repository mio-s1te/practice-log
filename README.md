# アフィリエイト管理機能付き オンライン講座販売アプリ

## 📋 プロジェクト概要

AIを活用した副業講座の販売・アフィリエイト管理システムです。
紹介者ごとのクリック数・LINE登録・セミナー視聴・購入・報酬を自動管理します。

### 主な機能
- 🛒 **商品管理** - 講座の登録・編集・販売期間管理
- 🎯 **アフィリエイト案件管理** - 案件の作成・報酬設定・自動停止
- 👥 **紹介者管理** - 紹介者の登録・スコア・タグ管理
- 📊 **分析ダッシュボード** - 管理者・紹介者それぞれの詳細分析
- 💰 **報酬自動計算** - 購入ごとに報酬を自動計算・管理
- 📱 **LINE 2アカウント連携** - 無料セミナーLINE（見込み客）と購入者LINE（購入者）の完全分離
- 💳 **Stripe決済** - Checkout Sessionで安全な決済処理
- 🔒 **不正チェック** - 自動不正検知とフラグ管理
- 📈 **段階価格設定** - 販売数に応じた自動価格切り替え（¥29,800 / ¥49,800 / ¥99,800）
- 🏢 **パートナー管理** - product_ownerロール専用ダッシュボード（RBAC・申請ワークフロー）
- 🔗 **GAS→Netlify→Supabase同期** - 既存GAS Webhookを維持しながらSupabaseへサイドカー同期

---

## 🏗️ 技術スタック

| 項目 | 技術 |
|------|------|
| フロントエンド | React + Vite + TypeScript |
| スタイル | Tailwind CSS |
| グラフ | Recharts |
| バックエンド | Netlify Functions (Node.js) |
| データベース | Supabase (PostgreSQL) |
| 決済 | Stripe Checkout |
| LINE連携 | LINE LIFF SDK |
| ホスティング | Netlify |

---

## 🚀 セットアップ手順

### 1. 前提条件

以下のアカウントが必要です：
- [Netlify](https://netlify.com) アカウント
- [Supabase](https://supabase.com) アカウント
- [Stripe](https://stripe.com) アカウント（日本向けは日本のStripeアカウント）
- [LINE Developers](https://developers.line.biz) アカウント

---

### 2. Supabase セットアップ

#### 2-1. プロジェクト作成
1. Supabase ダッシュボード → New Project
2. リージョン: `Northeast Asia (Tokyo)` を選択
3. データベースパスワードをメモ

#### 2-2. SQLスキーマ作成
1. Supabase → SQL Editor → New Query
2. `supabase/migrations/001_initial_schema.sql` の内容を貼り付けて実行
3. 同様に `supabase/migrations/002_rls_policies.sql` を実行

#### 2-3. APIキー取得
- Settings → API → `URL`, `anon public`, `service_role` をコピー

---

### 3. Stripe セットアップ

#### 3-1. 商品・価格作成
1. Stripe Dashboard → Products → Add product
2. 商品名: `AI副業1時間化スタート講座`
3. Price: ¥29,800 (一括)
4. Price ID（`price_xxx...`）をメモ → SupabaseのproductsテーブルのStripe Price IDに設定

#### 3-2. Webhook設定
1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://your-site.netlify.app/api/stripe-webhook`
3. Events:
   - `checkout.session.completed`
   - `charge.refunded`
   - `charge.dispute.created`
4. Signing Secret (`whsec_xxx...`) をメモ

---

### 4. LINE LIFF セットアップ（2アカウント構成）

本システムは **無料セミナーLINE**（見込み客用）と **購入者LINE**（購入者専用）の2アカウント構成です。

#### 4-1. 無料セミナーLINE（Messaging API + LIFF）

**Messaging APIチャネル作成：**
1. LINE Developers → Create a provider
2. Create a channel → **Messaging API**
3. Channel Secret, Channel Access Token をメモ
4. Webhook URL: `https://your-site.netlify.app/api/line-webhook?account=seminar`

**LIFFアプリ作成（LINE Loginチャネル）：**
1. Create a channel → LINE Login
2. LINE Login チャネル → LIFF → Add
3. LIFF URL: `https://your-site.netlify.app/seminar`
4. Scope: `openid`, `profile`
5. Channel ID, LIFF ID をメモ

**対応キーワード：** セミナー / ロードマップ / アフィリエイト / スタート講座 / 価格 / 質問

#### 4-2. 購入者LINE（Messaging API + LIFF）

**Messaging APIチャネル作成：**
1. Create a channel → **Messaging API**（2つ目）
2. Channel Secret, Channel Access Token をメモ
3. Webhook URL: `https://your-site.netlify.app/api/line-webhook?account=buyer`

**LIFFアプリ作成（LINE Loginチャネル）：**
1. Create a channel → LINE Login（2つ目）
2. LINE Login チャネル → LIFF → Add
3. LIFF URL: `https://your-site.netlify.app/purchase-complete`
4. Scope: `openid`, `profile`
5. Channel ID, LIFF ID をメモ
6. 「友達追加」ボタン用の Add Friend URL をメモ（`https://line.me/R/ti/p/@xxxxx`）

**対応キーワード（購入者確認後）：** 講座 / 第0章 / 第1章 / ワーク / ToDo / 特典 / 紹介 / アフィリエイト参加 / 紹介者画面

---

### 5. Netlify セットアップ

#### 5-1. サイト作成
```bash
# Netlify CLIをインストール
npm install -g netlify-cli

# ログイン
netlify login

# サイト作成
netlify init
```

#### 5-2. 環境変数設定
Netlify Dashboard → Site Settings → Environment Variables に以下を追加：

```
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx... (本番) or sk_test_xxx... (テスト)
STRIPE_WEBHOOK_SECRET=whsec_xxx...

# サイト設定
SITE_URL=https://your-site.netlify.app
ADMIN_EMAILS=admin@example.com
ADMIN_SECRET_TOKEN=your-secure-token-here

# ===== LINE 無料セミナーLINE（見込み客用）=====
LINE_SEMINAR_CHANNEL_ID=1234567890
LINE_SEMINAR_CHANNEL_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LINE_SEMINAR_CHANNEL_ACCESS_TOKEN=xxxxxxxx...
# （後方互換フォールバック：旧環境変数名も引き続き使用可）
# LINE_CHANNEL_ID=1234567890
# LINE_CHANNEL_SECRET=xxxxxxxx
# LINE_CHANNEL_ACCESS_TOKEN=xxxxxxxx

# ===== LINE 購入者LINE（購入者専用）=====
LINE_BUYER_CHANNEL_ID=0987654321
LINE_BUYER_CHANNEL_SECRET=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
LINE_BUYER_CHANNEL_ACCESS_TOKEN=yyyyyyyy...

# フロントエンド（VITE_プレフィックス必須）
VITE_LINE_LIFF_ID=liff.1234567890-xxxxxxxx          # 無料セミナーLINE用LIFFアプリID
VITE_LINE_BUYER_LIFF_ID=liff.0987654321-yyyyyyyy    # 購入者LINE用LIFFアプリID
VITE_LINE_BUYER_ADD_URL=https://line.me/R/ti/p/@xxxxx  # 購入者LINE友達追加URL

# ===== GAS→Netlify→Supabase 同期 =====
LINE_SYNC_SECRET=your-secure-random-secret-here
# GASのスクリプトプロパティ LINE_SYNC_SECRET にも同じ値を設定すること

# 管理者設定
VITE_ADMIN_EMAILS=admin@example.com
VITE_ADMIN_PASSWORD=your-admin-password
VITE_SITE_URL=https://your-site.netlify.app
```

⚠️ **重要**:
- `SUPABASE_SERVICE_ROLE_KEY` は絶対に `VITE_` プレフィックスをつけないこと
- `LINE_BUYER_CHANNEL_SECRET` / `LINE_SEMINAR_CHANNEL_SECRET` は絶対に `VITE_` プレフィックスをつけないこと
- `LINE_SEMINAR_CHANNEL_ID` は **LINE Loginチャネル**のChannel IDを使用（Messaging APIではない）
- `LINE_BUYER_CHANNEL_ID` も同様に **LINE Loginチャネル**のChannel IDを使用

#### 5-3. デプロイ
```bash
cd /path/to/netlify-app
netlify deploy --prod
```

---

### 6. ローカル開発手順

```bash
# 依存関係インストール
npm install

# .env.local ファイル作成
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_LINE_LIFF_ID=liff.xxxxx              # 無料セミナーLINE用LIFF ID
VITE_LINE_BUYER_LIFF_ID=liff.yyyyy        # 購入者LINE用LIFF ID
VITE_LINE_BUYER_ADD_URL=https://line.me/R/ti/p/@xxxxx  # 購入者LINE友達追加URL
VITE_ADMIN_EMAILS=admin@example.com
VITE_ADMIN_PASSWORD=admin123
VITE_SITE_URL=http://localhost:8888
EOF

# netlify.toml の functions に環境変数設定
# netlify.toml の [dev] セクションに以下を追加:
# [dev]
#   command = "npm run dev"
#   port = 8888

# Netlify Dev サーバー起動（Netlify Functionsも含む）
netlify dev

# ブラウザでアクセス
# http://localhost:8888
```

---

## 🔑 ログイン方法

### 管理者ログイン
1. `https://your-site.netlify.app/admin/login` にアクセス
2. ADMIN_EMAILS に設定したメールアドレスを入力
3. VITE_ADMIN_PASSWORD に設定したパスワードを入力

### 紹介者ログイン
1. `https://your-site.netlify.app/affiliate/login` にアクセス
2. 登録済みのメールアドレスを入力
3. 受信したメールのログインリンクをクリック

---

## 📦 商品追加方法

### 管理画面から追加
1. `/admin/products` → 「商品追加」ボタン
2. 必要事項を入力:
   - 商品名: AI副業1時間化スタート講座
   - 価格: 29800
   - Stripe Price ID: price_xxx...
   - 視聴期間: 無期限
3. 保存

### データベースに直接追加（初期設定済み）
`001_initial_schema.sql` の末尾にサンプルデータが含まれています。

---

## 🎯 アフィリエイト案件追加方法

1. `/admin/campaigns` → 「案件追加」ボタン
2. 必要事項を入力:
   - 案件名: スタート講座1,000部突破キャンペーン
   - 対象商品: AI副業1時間化スタート講座
   - 報酬タイプ: 固定額
   - 報酬額: 10000
   - 販売上限: 1000
   - 自動停止: 有効
   - 販売カウント: 総販売数
3. 保存

---

## 🧪 テスト手順

### テスト決済確認
1. Stripe テストカード: `4242 4242 4242 4242` (有効期限: 任意, CVV: 任意)
2. `/start-course?campaign=<campaign-id>&ref=<affiliate-code>` にアクセス
3. 購入ボタン → Stripe Checkout → テストカードで決済
4. `/purchase-complete` にリダイレクトされることを確認

### LINE登録〜セミナー視聴〜購入フロー
1. LINEで公式アカウントを友達追加
2. 紹介URL（`/start-course?campaign=xxx&ref=yyy`）をクリック
3. クリック計測確認: Supabase `clicks` テーブル
4. LINE公式から無料セミナーLIFF URLを送信
5. LIFFページが開き、LINE認証完了
6. `leads` テーブルにLINE userId が保存されることを確認
7. `seminar_views` テーブルに視聴記録が保存されることを確認
8. 購入ボタン → Stripe Checkout → 決済
9. `purchases` テーブルに購入記録
10. `commissions` テーブルに報酬記録

### 報酬計算テスト
1. テスト購入後、`commissions` テーブルを確認
2. `/admin/commissions` で報酬一覧を確認
3. 「承認」ボタンで報酬を承認
4. 紹介者ダッシュボード `/affiliate/dashboard` で報酬を確認

### 自動停止テスト
1. キャンペーンの `sales_limit` を小さい値（例: 3）に設定
2. テスト購入を3件実施
3. `affiliate_campaigns.status` が `ended` になることを確認
4. 紹介者に通知が届くことを確認

---

## 🗄️ データモデル

### 主要テーブル構成

```
products              → 商品情報
price_tiers           → 段階価格設定（販売数別の価格ルール）★新規
price_change_history  → 価格変更履歴（自動/手動/予約）★新規
affiliate_campaigns   → アフィリエイト案件
                         ├─ access_type               ← 紹介権限タイプ (public/approved_only/specific_affiliates/tag_based) ★新規
                         ├─ required_affiliate_tags   ← tag_based時の必要タグ配列 ★新規
                         └─ allow_application         ← 紹介申請を受け付けるか ★新規
affiliates            → 紹介者
leads                 → 顧客（LINE登録者）
                         ├─ seminar_line_user_id/display_name   ← 無料セミナーLINE★新規
                         ├─ buyer_line_user_id/display_name     ← 購入者LINE★新規
                         ├─ buyer_line_registered_at            ← 購入者LINE登録日時★新規
                         ├─ course_delivery_status              ← 講座受取状況★新規
                         └─ course_received_at                  ← 講座受取日時★新規
buyer_line_verifications → 購入者LINE紐づけ記録★新規
line_keyword_responses   → LINEキーワード自動応答設定（DB管理）★新規
app_users             → 全ロール共通ユーザーテーブル (super_admin/admin/product_owner/affiliate/customer) ★新規
product_owners        → 商品提供者と商品の多対多 (user_id, product_id, permission_level, status) ★新規
product_owner_permissions → 細粒度権限 (can_view_sales, can_view_customers, can_export_csv ...) ★新規
partner_requests      → 商品提供者の申請管理 7種類 (pending/approved/rejected/cancelled) ★新規
affiliate_campaign_access → 紹介者ごとの案件アクセス権 (approved/pending/rejected/revoked) ★新規
affiliate_campaign_applications → 紹介者の案件紹介申請 ★新規
clicks                → クリック計測
attribution_events    → 流入履歴（報酬判定の根拠）
seminar_views         → セミナー視聴記録
purchases             → 購入履歴（1購入=1行）
                         ├─ access_verified    ← 紹介権限チェック結果 ★新規
                         └─ no_access_reason   ← 権限なし理由 ★新規
product_accesses      → 視聴権限
commissions           → 報酬記録
payouts               → 支払履歴
notifications         → 通知
suspicious_events     → 不正疑い
affiliate_scores      → スコア
affiliate_daily_stats → 日次統計
```

### 重要な設計原則
- **購入ごとに報酬判定**: LINE userIdと紹介者を固定で紐づけない
- **アトリビューション有効期限**: デフォルト30日
- **カスケード禁止**: 同じLINEユーザーが別商品を直接購入しても過去紹介者に報酬は発生しない
- **2LINE分離**: 無料セミナーLINEは見込み客管理、購入者LINEは購入者専用コンテンツ配信
- **購入者確認優先順位**: stripe_session_id > lead_id > buyer_email の順で照合
- **段階価格**: status='completed'の有効累計販売数ベースで自動切り替え（Stripe Webhook起動）
- **キーワードキャッシュ**: 10分TTLでDB負荷軽減
- **ロール分離**: super_admin/admin/product_owner/affiliate/customerの5段階、パートナー画面は /partner/* で完全分離
- **紹介権限制御**: access_type (public/approved_only/specific_affiliates/tag_based) でキャンペーンごとに制御
- **権限なし購入**: 紹介権限なし経由の購入は access_verified=false・commission_amount=0 で保存（購入自体は有効）
- **申請制ワークフロー**: 商品提供者の価格変更・キャンペーン操作等はpartner_requestsを通じて承認後のみ反映
- **多対多モデル**: product_ownersで1人→複数商品、1商品→複数提供者に対応
- **RBAC**: 5ロール（super_admin / admin / product_owner / affiliate / customer）
- **申請制ワークフロー**: product_ownerは価格・報酬・キャンペーンを直接変更不可。partner_requests経由でadmin承認後のみ反映
- **access_verifiedフラグ**: 紹介権限なし経由の購入も保存するが報酬は0円＋フラグ記録
- **GAS同期サイドカー**: GASのLINE Webhook処理（スプシ保存・メール収集）は維持。同期は追加のサイドカー呼び出し

---

## 🔄 GAS→Netlify→Supabase 同期アーキテクチャ

```
LINE公式アカウント
  ↓ Webhook
GAS（既存運用を維持）
  ├─ スプレッドシートに保存（メイン処理）
  ├─ メールアドレス収集ボタン表示
  ├─ ユーザーがメールを送信 → スプシに保存
  └─ POST /.netlify/functions/line-sync  ← サイドカー同期
       Headers: x-line-sync-secret: <LINE_SYNC_SECRET>
       Body: { line_account_type, line_user_id, email, ... }
         ↓
Netlify Function (line-sync.js)
  ├─ 認証チェック（x-line-sync-secret ↔ LINE_SYNC_SECRET）
  ├─ leads テーブルに upsert（seminar_line_user_id / buyer_line_user_id）
  ├─ attribution_events 記録（新規登録時のみ）
  └─ line_sync_logs に実行ログ保存
```

### GAS セットアップ手順

1. `gas/line-sync-sample.gs` の内容を既存GASプロジェクトに追加
2. GASエディタ → プロジェクトの設定 → スクリプトプロパティ に以下を設定:
   ```
   NETLIFY_URL        = https://your-site.netlify.app
   LINE_SYNC_SECRET   = （Netlify 環境変数 LINE_SYNC_SECRET と同じ値）
   LINE_ACCOUNT_TYPE  = free_seminar  （または purchaser）
   LINE_CHANNEL_ACCESS_TOKEN = （LINEチャネルアクセストークン）
   ```
3. 既存の `doPost` 関数に `syncToNetlify(payload)` 呼び出しを追加
4. GASエディタで `testLineSyncIntegration` 関数を実行して接続確認

### 2アカウント構成

| GASプロジェクト | LINE_ACCOUNT_TYPE | 同期先フィールド |
|---|---|---|
| 無料セミナーLINE用GAS | `free_seminar` | `leads.seminar_line_user_id` |
| 購入者LINE用GAS | `purchaser` | `leads.buyer_line_user_id` |

---

## 🔧 よくあるエラーと対処法

### Stripe Webhook: 署名検証エラー
```
Webhook Error: No signatures found matching the expected signature for payload
```
→ Netlify環境変数の `STRIPE_WEBHOOK_SECRET` が正しく設定されているか確認

### LINE IDトークン検証エラー（無料セミナーLINE）
```
LINE ID token verification failed
```
→ `LINE_SEMINAR_CHANNEL_ID` と実際のLINE Loginチャネルのチャネルシークレットが一致しているか確認
→ 旧設定の場合は `LINE_CHANNEL_ID` も確認（後方互換フォールバックあり）

### LINE IDトークン検証エラー（購入者LINE）
```
LINE ID token verification failed (buyer)
```
→ `LINE_BUYER_CHANNEL_ID` と購入者LINE用LINE LoginチャネルのChannel IDが一致しているか確認

### 購入者LINE Webhook署名検証エラー
```
Invalid signature (buyer LINE)
```
→ `LINE_BUYER_CHANNEL_SECRET` が購入者LINE Messaging APIチャネルのChannel Secretと一致しているか確認
→ Webhookの設定URLが `?account=buyer` になっているか確認

### Supabase RLSエラー
```
new row violates row-level security policy
```
→ Netlify FunctionsがService Role Keyを使用しているか確認（`SUPABASE_SERVICE_ROLE_KEY`）

### LIFF初期化エラー
```
LiffError: Failed to init LIFF SDK
```
→ LIFF IDが正しいか確認（`VITE_LINE_LIFF_ID`）
→ LIFFのエンドポイントURLがNetlifyのURLと一致しているか確認

### ビルドエラー: 大きなバンドル
→ vite.config.tsに以下を追加:
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        recharts: ['recharts'],
        react: ['react', 'react-dom'],
      }
    }
  }
}
```

---

## 🌐 URL一覧

| URL | 説明 |
|-----|------|
| `/` | 無料プレゼントLP |
| `/start-course` | スタート講座LP |
| `/mini-course` | ミニ講座LP |
| `/seminar` | LIFF セミナーページ |
| `/purchase-complete` | 購入完了ページ |
| `/affiliate/login` | 紹介者ログイン |
| `/affiliate/dashboard` | 紹介者ダッシュボード |
| `/partner/login` | パートナーログイン |
| `/partner/dashboard` | パートナーダッシュボード（KPI 9項目） |
| `/partner/purchases` | 購入者一覧（product_owner権限内のみ） |
| `/partner/affiliates` | 紹介者別/キャンペーン別成果 |
| `/partner/requests` | 申請管理（価格変更・キャンペーン開始等） |
| `/partner/csv` | CSV出力（5種） |
| `/partner/notices` | お知らせ履歴 |
| `/admin/login` | 管理者ログイン |
| `/admin/dashboard` | 管理者ダッシュボード |
| `/admin/roles` | パートナーアカウント管理・商品紐づけ |
| `/admin/approvals` | 申請審査（パートナー申請・紹介申請） |
| `/admin/campaign-access` | キャンペーン紹介権限管理 |
| `/admin/roles` | パートナーアカウント管理 ★新規 |
| `/admin/approvals` | パートナー申請審査 ★新規 |
| `/admin/campaign-access` | キャンペーン紹介権限管理 ★新規 |
| `/partner/login` | パートナー（商品提供者）ログイン ★新規 |
| `/partner/dashboard` | パートナーダッシュボード（KPI9種） ★新規 |
| `/partner/purchases` | 購入者一覧（自商品のみ） ★新規 |
| `/partner/affiliates` | 紹介者別・キャンペーン別成果 ★新規 |
| `/partner/requests` | 申請管理（7種類） ★新規 |
| `/partner/csv` | CSV出力（5種類） ★新規 |
| `/partner/notices` | 購入者向けお知らせ履歴 ★新規 |

### API エンドポイント

| URL | 説明 |
|-----|------|
| `POST /api/record-click` | クリック計測 |
| `POST /api/verify-line-token` | 無料セミナーLINE IDトークン検証・seminar_line_*フィールド保存 |
| `POST /api/verify-buyer-line` | 購入者LINE IDトークン検証・購入確認・紐づけ（購入完了ページ用） |
| `POST /api/record-seminar-view` | セミナー視聴記録 |
| `POST /api/create-checkout-session` | Stripe Checkout Session作成（段階価格tier自動選択） |
| `POST /api/stripe-webhook` | Stripe Webhook処理（購入後の自動価格切り替え） |
| `POST /api/line-webhook?account=seminar` | 無料セミナーLINE Webhook（キーワード応答6種） |
| `POST /api/line-webhook?account=buyer` | 購入者LINE Webhook（キーワード応答9種・購入者確認） |
| `GET /api/get-product-price?product_id=xxx` | 段階価格情報取得（現在価格・次tier・残り部数） |
| `GET/POST /api/admin-api/*` | 管理者API（顧客2LINE分離表示・price_tiers CRUD・パートナー管理含む） |
| `GET/POST /api/affiliate-api/*` | 紹介者API |
| `GET/POST /api/partner-api/*` | パートナーAPI（product_ownerロール専用：ログイン・統計・申請） |
| `POST /api/line-sync` | GAS→Supabase同期（x-line-sync-secretヘッダー認証） |

---

## 🎯 紹介URL形式

```
# アフィリエイト紹介URL
https://your-site.netlify.app/start-course?campaign=<campaign-id>&ref=<affiliate-code>

# 公式LINE経由URL（報酬なし）
https://your-site.netlify.app/start-course?source=official_line&campaign=direct

# 例
https://your-site.netlify.app/start-course?campaign=b0000000-0000-0000-0000-000000000001&ref=yamada_abc1
```

---

## 📊 アフィリエイトスコア計算式

| スコア | 計算式 |
|--------|--------|
| 集客力 | `min((clicks_30d / 300) * 100, 100)` |
| 成約力 | `min((conversion_rate_30d / 0.05) * 100, 100)` |
| 継続力 | `min((active_days_30d / 20) * 100, 100)` |
| 商品理解力 | `min((main_product_rate / 0.60) * 100, 100)` |
| 改善力 | 7日成長率ベースの複合スコア |
| **総合スコア** | 各スコアの加重平均 |

---

## 🗄️ Supabase マイグレーション適用順序

```bash
# Supabase SQL Editor で以下の順に実行：
# 1. 基本スキーマ（テーブル・インデックス・初期データ）
supabase/migrations/001_initial_schema.sql

# 2. RLS（Row Level Security）ポリシー
supabase/migrations/002_rls_policies.sql

# 3. 段階価格設定（price_tiers・price_change_history）
supabase/migrations/003_price_tiers.sql

# 4. 2LINE対応（leadsテーブル拡張・buyer_line_verifications・line_keyword_responses）
supabase/migrations/004_dual_line_accounts.sql

# 5. ロール・権限管理 ★新規
#    app_users / product_owners / product_owner_permissions / partner_requests
#    affiliate_campaign_access / affiliate_campaign_applications / purchases拡張
supabase/migrations/005_roles_and_permissions.sql

# 6. GAS同期ログ ★新規（line-sync.js が参照）
#    line_sync_logs テーブル（GAS→Netlify→Supabase 同期履歴）
supabase/migrations/006_line_sync.sql
```

---

## 📝 デプロイ状態

- **Platform**: Netlify
- **Database**: Supabase
- **Payment**: Stripe
- **LINE**: 2アカウント構成（無料セミナーLINE + 購入者LINE）
- **Status**: ⚠️ セットアップ必要
- **Last Updated**: 2025-06
