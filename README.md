# AIアフィリエイト講座 販売・紹介管理システム

## 📋 プロジェクト概要

AIを活用した副業講座の販売・アフィリエイト管理システムです。

### ユーザー導線
```
SNS投稿 → 公式LINE登録 → 無料教材配布（LINE）
→ AIアフィリエイト実践講座購入（/affiliate-course）
→ AI副業1時間化スタート講座購入（/start-course）
→ アフィリエイター登録申請（/affiliate/register）
→ 管理者承認 → 紹介URL発行 → アフィリエイト活動
```

### 主要URL
| URL | 内容 |
|-----|------|
| `/affiliate-course` | AIアフィリエイト実践講座販売ページ（¥29,800 / キャンペーン¥4,980） |
| `/start-course` | AI副業1時間化スタート講座（段階価格: ¥29,800/¥49,800/¥99,800）※全面改訂済み |
| `/affiliate/register` | アフィリエイター登録申請（スタート講座購入者のみ） |
| `/affiliate/login` | アフィリエイターログイン |
| `/affiliate/dashboard` | アフィリエイターマイページ（新ダッシュボード・12期間フィルター・レーダー診断） |
| `/affiliate/products/:id` | 商品詳細ページ（紹介素材・報酬条件・禁止表現・FAQ） |
| `/admin/login` | 管理者ログイン |
| `/admin` | 管理者ダッシュボード（6タブ・10グラフ・LP分析・導線分析・手元残り見込み） |
| `/admin/products` | 商品管理（7タブ: 基本・価格・紹介条件・報酬・返金・紹介素材・パートナー設定） |
| `/partner/login` | パートナーログイン |
| `/partner/dashboard` | パートナー管理画面（自分の商品データのみ）※制限強化済み |

### LINEキーワード（2系統）
| キーワード | 用途 | 送付先 |
|-----------|------|--------|
| `1時間` | スタート講座前の無料講座 | https://melodic-pony-33c4e9.netlify.app/ |
| `本気` | 無料アフィリエイト教材 | URL未定 |

### 公式LINE
- URL: https://lin.ee/TJWaKcD
- 「1時間」→ 無料スタート講座動画 → スタート講座購入
- 「本気」→ 無料アフィリエイト教材 → AIアフィリエイト実践講座購入

---

## 🏗️ 技術スタック

| 項目 | 技術 |
|------|------|
| フロントエンド | React + Vite + TypeScript |
| スタイル | Tailwind CSS |
| グラフ | Recharts（ComposedChart / RadarChart / BarChart / LineChart / PieChart） |
| バックエンド | Netlify Functions (Node.js) |
| データベース | Supabase (PostgreSQL + RLS) |
| 決済 | Stripe Checkout |
| 日付処理 | date-fns |
| ホスティング | Netlify |

---

## 🆕 最新実装済み機能（2025年6月現在）

### 紹介者ダッシュボード（AffiliateDashboardNew）
- **期間フィルター 12種** — 今日/昨日/今週/先週/直近7日/直近14日/直近30日/今月/先月/今年/全期間/カスタム
- **KPI 10種** — クリック/成約/成約率/売上/発生報酬/未確定/確定/支払済み/キャンセル/返金
- **前期比表示** — 期間×チャートビューに応じて「前日比」「前週比」「前月比」を自動判定・表示
- **グラフ 日別/週別/月別 切り替え** — クリック vs 成約（ComposedChart）/ 報酬額 / 商品別
- **前期比較サマリーカード** — 6指標の前期差分を一覧表示
- **レーダーチャート 5項目** — 集客力/成約力/継続力/商品理解力/改善力（0.00〜100.00）
- **診断タイプ 7種** — スコア閾値アルゴリズムによる自動分類＋今週のおすすめアクション
- **プライバシー保護ランキング** — 自分の順位＋1つ上/下との差分＋1位との差分のみ表示
- **商品詳細** — 紹介情報/紹介素材/FAQの3タブ、専用URL付き

### 管理者ダッシュボード（AdminDashboard）
- **6タブ構成** — KPI概要 / グラフ / LP分析 / 導線分析 / 商品別 / 紹介者別
- **手元残り見込み（強調表示）** — 売上 − Stripe手数料(3.6%) − 報酬予定 − 返金予備(5%)
- **期間フィルター 12種** — 紹介者ダッシュボードと同仕様
- **グラフ 10本** — 売上/販売数/報酬（日別・週別・月別）/ 商品別 / LP別 / 紹介者別 / 前期比サマリー
- **LP分析** — 3LP×8指標 + LPスコア5項目 + ボタン（CTA）クリック分析
- **導線分析** — 「1時間」「本気」の2導線をステップ表示（前ステップ比率付き）
- **LINE数値 手動入力モーダル** — GAS sync-ready構造（将来的に自動同期対応）
- **商品別分析** — 15指標 + 商品スコア5項目（売上力/成約力/紹介しやすさ/返金リスク/伸びしろ）
- **紹介者別分析** — 11指標 + 診断タイプ + 不正疑いフラグ
- **改善提案エンジン** — LP/商品/紹介者ベースのルールベース自動提案
- **Tailwind静的クラス** — `StatCell` / `FunnelStepNode` コンポーネントで動的クラスを完全排除

### バックエンドAPI
#### `netlify/functions/affiliate-api.js`
| エンドポイント | 説明 |
|---|---|
| `GET /dashboard/analytics?period=&start=&end=` | 全KPI + daily/weekly/monthly + radar + ranking |
| `GET /products/:productId` | 商品詳細（紹介権限チェック付き） |

#### `netlify/functions/admin-api.js`
| エンドポイント | 説明 |
|---|---|
| `GET /analytics/dashboard` | 全KPI + 手元残り見込み + 日別/週別/月別データ |
| `GET /analytics/lp` | LP別分析 + LPスコア + ボタン分析 + 改善提案 |
| `GET /analytics/funnels` | 2導線分析（line_funnel_data参照） |
| `POST /analytics/line-data` | LINE数値手動入力（upsert） |
| `GET /analytics/products` | 商品別15指標 + 商品スコア + 改善提案 |
| `GET /analytics/affiliates` | 紹介者別11指標 + 診断 + 不正疑いフラグ |
| `POST /button-click` | LPボタンクリック記録（button_clicksテーブルへINSERT） |
| `GET/POST /promo-assets` | 紹介素材 CRUD |
| `PUT /promo-assets/:id` | 紹介素材更新 |

---

## 🗄️ データベース構造

### マイグレーション一覧（実行順）
| ファイル | 内容 |
|---------|------|
| `001_initial_schema.sql` | 基本テーブル（products, affiliates, clicks, purchases, commissions等） |
| `002_rls_policies.sql` | Row Level Security ポリシー |
| `003_price_tiers.sql` | 段階価格テーブル |
| `004_dual_line_accounts.sql` | LINE2アカウント対応 |
| `005_roles_and_permissions.sql` | RBAC（app_users, product_owners, partner_requests等） |
| `006_line_sync.sql` | LINE同期ログ |
| `007_new_schema.sql` | 新要件対応（product_affiliate_permissions等） |
| `008_product_management.sql` | 商品管理拡張（promo_assets, product_tags, 詳細フィールド） |
| `009_analytics_tables.sql` | 分析テーブル追加（line_funnel_data, button_clicks） |

### 主要テーブル
| テーブル | 用途 |
|---------|------|
| `products` | 商品マスタ（価格・報酬条件・紹介条件・LP情報） |
| `affiliates` | アフィリエイター（コード・ステータス・タグ） |
| `clicks` | クリックログ（affiliate_id・product_id・UTM） |
| `purchases` | 購入履歴（Stripe連携・ステータス管理） |
| `commissions` | 報酬（pending→approved→payable→paid） |
| `promo_assets` | 紹介素材（SNS投稿例・LINE文・PR表記） |
| `product_affiliate_permissions` | 商品ごとの紹介権限（open/approved_only/requires_purchase） |
| `line_funnel_data` | LINE導線数値（1時間・本気、手動入力/GAS sync-ready） |
| `button_clicks` | LPボタンクリックトラッキング |
| `suspicious_events` | 不正疑いイベント |

---

## 🚀 セットアップ手順

### 1. 環境変数（Netlify Environment Variables）
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
ADMIN_PASSWORD=（任意の強力なパスワード）
```

### 2. Supabase マイグレーション実行手順
1. Supabase ダッシュボード → SQL Editor
2. `supabase/migrations/` フォルダ内のファイルを **001〜009の順** に実行
3. 各ファイルをコピー → SQL Editorに貼り付け → Run

### 3. ローカル開発
```bash
npm install
npm run dev
```

### 4. デプロイ
```bash
# Netlify CLI
netlify deploy --prod
```

---

## 📊 分析ダッシュボード 利用ガイド

### 管理者ダッシュボード
1. `/admin` にログイン
2. 上部の期間フィルターで期間を選択
3. 各タブで分析：
   - **KPI概要** — 手元残り見込みを中心に全体把握
   - **グラフ** — 日別/週別/月別を切り替えてトレンド確認
   - **LP分析** — CTAクリック率・LPスコアで改善箇所を特定
   - **導線分析** — 「LINE数値入力」ボタンからLINE数値を毎日入力
   - **商品別** — 商品スコアで優先投資商品を判断
   - **紹介者別** — 不正疑いフラグ・診断タイプで個別対応

### 紹介者ダッシュボード
1. `/affiliate/login` でログイン
2. 期間フィルターで分析したい期間を選択
3. 各タブで確認：
   - **KPI概要** — 前期比バッジで成長/後退を把握
   - **グラフ分析** — 日別→週別→月別で俯瞰
   - **診断** — レーダーチャート×診断タイプで弱点把握
   - **ランキング** — 自分の位置と差分を確認
   - **商品別** — 商品詳細で紹介素材をコピー

---

## ⚠️ 未実装・今後の予定

| 機能 | ステータス | 備考 |
|------|-----------|------|
| LPボタンクリック計測 | 🔴 未実装 | フロントLPで `POST /api/admin-api/button-click` を呼ぶ実装が必要 |
| GAS → line_funnel_data 自動同期 | 🟡 構造準備済み | `source='gas'` で区別可能、GAS側の実装が必要 |
| 無料アフィリエイト教材LP | 🔴 未作成 | 「本気」キーワード用のLP |
| GitHub push | 🟡 PAT待ち | `origin → https://github.com/mio-s1te/mainsite.git` |

---

## 📁 主要ファイル構成

```
netlify-app/
├── src/
│   ├── pages/
│   │   ├── affiliate/
│   │   │   ├── AffiliateDashboardNew.tsx  ← 新ダッシュボード（12期間・レーダー・ランキング）
│   │   │   ├── AffiliateProductDetail.tsx ← 商品詳細（素材・FAQ）
│   │   │   └── ...
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx         ← 管理者ダッシュボード（6タブ・10グラフ）
│   │   │   ├── AdminProducts.tsx          ← 商品管理（7タブ）
│   │   │   └── ...
│   │   └── lp/
│   │       ├── StartCourseLp.tsx          ← スタート講座LP（全面改訂済み）
│   │       └── AffiliateLp.tsx
│   └── App.tsx
├── netlify/
│   └── functions/
│       ├── affiliate-api.js               ← 紹介者API（analytics・商品詳細）
│       ├── admin-api.js                   ← 管理者API（analytics全種・button-click）
│       ├── stripe-webhook.js
│       └── ...
├── supabase/
│   └── migrations/
│       ├── 001〜008_*.sql                 ← 既存マイグレーション
│       └── 009_analytics_tables.sql       ← NEW: line_funnel_data・button_clicks
└── README.md
```

---

## 🔧 Git 履歴（主要コミット）

| コミット | 内容 |
|---------|------|
| `b417f6e` | 分析ダッシュボード完善化（マイグレーション・Tailwind修正・前期比ラベル） |
| `288bc69` | 分析ダッシュボード大型アップデート（全機能実装） |
| `f74f024` | README更新（URL一覧・LINEキーワード） |
| `55041f7` | 新要件実装（スタート講座LP・商品編集7タブ・アフィリエイター商品詳細） |
| `4c588c7` | アフィリエイト管理システム再設計 |
