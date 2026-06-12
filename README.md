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
- 📱 **LINE LIFF連携** - LINE登録→セミナー視聴→購入の自動追跡
- 💳 **Stripe決済** - Checkout Sessionで安全な決済処理
- 🔒 **不正チェック** - 自動不正検知とフラグ管理

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

### 4. LINE LIFF セットアップ

#### 4-1. LINE Loginチャネル作成
1. LINE Developers → Create a provider
2. Create a channel → LINE Login
3. Channel ID, Channel Secret をメモ

#### 4-2. LIFF アプリ作成
1. LINE Login チャネル → LIFF → Add
2. LIFF URL: `https://your-site.netlify.app/seminar`
3. Scope: `openid`, `profile`
4. LIFF ID (`liff.1234567890-xxxxxxxx`) をメモ

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
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
STRIPE_SECRET_KEY=sk_live_xxx... (本番) or sk_test_xxx... (テスト)
STRIPE_WEBHOOK_SECRET=whsec_xxx...
SITE_URL=https://your-site.netlify.app
ADMIN_EMAILS=admin@example.com
ADMIN_SECRET_TOKEN=your-secure-token-here
LINE_CHANNEL_ID=1234567890
LINE_CHANNEL_SECRET=xxxxxxxx
VITE_LINE_LIFF_ID=liff.1234567890-xxxxxxxx
VITE_ADMIN_EMAILS=admin@example.com
VITE_ADMIN_PASSWORD=your-admin-password
VITE_SITE_URL=https://your-site.netlify.app
```

⚠️ **重要**: `SUPABASE_SERVICE_ROLE_KEY` は絶対に `VITE_` プレフィックスをつけないこと

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
VITE_LINE_LIFF_ID=liff.xxxxx
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
products          → 商品情報
affiliate_campaigns → アフィリエイト案件
affiliates        → 紹介者
leads             → 顧客（LINE登録者）
clicks            → クリック計測
attribution_events → 流入履歴（報酬判定の根拠）
seminar_views     → セミナー視聴記録
purchases         → 購入履歴（1購入=1行）
product_accesses  → 視聴権限
commissions       → 報酬記録
payouts           → 支払履歴
notifications     → 通知
suspicious_events → 不正疑い
affiliate_scores  → スコア
affiliate_daily_stats → 日次統計
```

### 重要な設計原則
- **購入ごとに報酬判定**: LINE userIdと紹介者を固定で紐づけない
- **アトリビューション有効期限**: デフォルト30日
- **カスケード禁止**: 同じLINEユーザーが別商品を直接購入しても過去紹介者に報酬は発生しない

---

## 🔧 よくあるエラーと対処法

### Stripe Webhook: 署名検証エラー
```
Webhook Error: No signatures found matching the expected signature for payload
```
→ Netlify環境変数の `STRIPE_WEBHOOK_SECRET` が正しく設定されているか確認

### LINE IDトークン検証エラー
```
LINE ID token verification failed
```
→ `LINE_CHANNEL_ID` と実際のLINE Loginチャネルのチャネルシークレットが一致しているか確認

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
| `/admin/login` | 管理者ログイン |
| `/admin/dashboard` | 管理者ダッシュボード |

### API エンドポイント

| URL | 説明 |
|-----|------|
| `POST /api/record-click` | クリック計測 |
| `POST /api/verify-line-token` | LINE IDトークン検証 |
| `POST /api/record-seminar-view` | セミナー視聴記録 |
| `POST /api/create-checkout-session` | Stripe Checkout Session作成 |
| `POST /api/stripe-webhook` | Stripe Webhook処理 |
| `GET/POST /api/admin-api/*` | 管理者API |
| `GET/POST /api/affiliate-api/*` | 紹介者API |

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

## 📝 デプロイ状態

- **Platform**: Netlify
- **Database**: Supabase
- **Payment**: Stripe
- **Status**: ⚠️ セットアップ必要
- **Last Updated**: 2024-06
