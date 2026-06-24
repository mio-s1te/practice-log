# みお革命 実践ログ

> 毎日の実践を記録し、止まっている場所と成長を見える化する専用ダッシュボード

## 概要

オンライン講座コミュニティ向けの実践ログ・進捗管理Webアプリです。  
参加者が毎日1分でチェックインし、自分の進捗・報告履歴・スタンプ・連続報告日数を確認できます。  
管理者は全参加者の状況をダッシュボードで把握し、未報告者・質問・励まし希望を管理できます。

## 技術スタック

- **フロントエンド**: Next.js 16 (App Router) / React / TypeScript / Tailwind CSS v4
- **バックエンド**: Supabase (Auth + PostgreSQL + RLS)
- **デプロイ**: Netlify

## 機能一覧

### 参加者側
- `/login` - ログイン（Supabase Auth）
- `/dashboard` - マイダッシュボード（連続日数・報告率・カレンダー・バッジ）
- `/checkin` - 今日のチェックイン（1日1回の実践報告）
- `/calendar` - 報告カレンダー（スタンプで見える化）
- `/history` - 報告履歴
- `/achievements` - 成果報告
- `/badges` - 獲得バッジ一覧

### 管理者側（admin / staff）
- `/admin` - 全体ダッシュボード
- `/admin/members` - メンバー管理
- `/admin/members/[id]` - メンバー詳細・メモ・バッジ付与
- `/admin/questions` - 質問一覧・対応ステータス管理
- `/admin/encourage` - 励まし希望者一覧
- `/admin/stuck` - つまずき分析
- `/admin/achievements` - 成果報告一覧
- `/admin/generations` - 期生別ダッシュボード
- `/admin/badges` - バッジ管理

## セットアップ手順

### 1. リポジトリをクローン

```bash
git clone https://github.com/your-org/practice-log.git
cd practice-log
npm install
```

### 2. Supabaseプロジェクトを作成

1. [supabase.com](https://supabase.com) にアクセス
2. 新しいプロジェクトを作成
3. **Project URL** と **anon public key** をメモ

### 3. Supabaseにスキーマを適用

Supabase Dashboard → SQL Editor で以下を順番に実行：

```sql
-- 1. スキーマ作成
supabase/schema.sql の内容を実行

-- 2. RLS設定
supabase/rls.sql の内容を実行
```

### 4. 環境変数を設定

```bash
cp .env.example .env.local
```

`.env.local` を編集：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

### 5. ローカル起動

```bash
npm run dev
```

`http://localhost:3000` にアクセス。

## 初期adminユーザーの作り方

1. Supabase Dashboard → Authentication → Users → 「Add user」
2. メールアドレスとパスワードを設定してユーザー作成
3. SQL Editor で以下を実行：

```sql
UPDATE public.profiles
SET role = 'admin', name = '管理者名'
WHERE email = 'your-admin@email.com';
```

## メンバーの追加方法

adminがSupabase DashboardのAuthenticationからユーザーを追加する方法が最も安全です：

1. Supabase Dashboard → Authentication → Users → 「Add user」
2. メールアドレスとパスワードを設定
3. ユーザーがログインすると自動的に `profiles` テーブルにレコードが作成される
4. adminが `/admin/members/[id]` から期生・ステータス・開始日などを設定

## Netlifyデプロイ手順

### 1. GitHubにプッシュ

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-org/practice-log.git
git push -u origin main
```

### 2. Netlifyでサイトを作成

1. [netlify.com](https://www.netlify.com) にログイン
2. 「Add new site」→「Import an existing project」
3. GitHubリポジトリを選択
4. ビルド設定（自動検出されるはず）：
   - Build command: `npm run build`
   - Publish directory: `.next`
5. 「Deploy site」をクリック

### 3. 環境変数をNetlifyに設定

Netlify Dashboard → Site settings → Environment variables：

```
NEXT_PUBLIC_SUPABASE_URL = https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbG...
```

### 4. Supabaseの認証URLを設定

Supabase Dashboard → Authentication → URL Configuration：
- **Site URL**: `https://your-site.netlify.app`
- **Redirect URLs**: `https://your-site.netlify.app/auth/callback`

## データベース設計

### テーブル構成

| テーブル | 用途 |
|---------|------|
| `profiles` | ユーザープロフィール・権限・期生情報 |
| `checkins` | 毎日のチェックイン記録（1人1日1件） |
| `achievements` | 成果報告 |
| `badges` | バッジマスタ |
| `user_badges` | ユーザー獲得バッジ |
| `staff_notes` | 運営メモ |
| `question_statuses` | 質問の対応ステータス |

### ユーザー権限

| ロール | できること |
|-------|----------|
| `member` | 自分のデータのみ閲覧・作成 |
| `staff` | 全参加者の閲覧・メモ追加 |
| `admin` | 全操作（権限変更・バッジ付与・メンバー管理） |

### 現在地ステージ

- 土台づくり中 → 方向性整理中 → 導線設計中 → 発信実践中 → 反応確認中 → 改善中 → 成果検証中

### チェックインスタンプ

| スタンプ | 意味 |
|---------|------|
| ✅ | 通常報告 |
| ❓ | 質問した日 |
| 💛 | 励まし希望の日 |
| 🌱 | できなかったけど戻ってきた日 |

## 今後の拡張案

- [ ] Discord Webhook連携（毎晩チェックイン案内・未報告リマインド）
- [ ] メール通知（パスワードリセット・サポート終了リマインド）
- [ ] 期生別レポートのPDF出力
- [ ] staff担当期生制（現在はstaffも全期生閲覧可能）
- [ ] チェックイン後のDiscord自動投稿
- [ ] スクリーンショットの直接アップロード（Supabase Storage）
- [ ] AIによるつまずきの自動分類・傾向分析

## ファイル構成

```
practice-log/
├── app/
│   ├── login/          # ログイン
│   ├── dashboard/      # 参加者ダッシュボード
│   ├── checkin/        # チェックイン
│   ├── calendar/       # 報告カレンダー
│   ├── history/        # 報告履歴
│   ├── achievements/   # 成果報告
│   ├── badges/         # バッジ
│   └── admin/          # 管理者系
│       ├── page.tsx          # 管理ダッシュボード
│       ├── members/          # メンバー管理
│       ├── questions/        # 質問一覧
│       ├── encourage/        # 励まし希望
│       ├── stuck/            # つまずき分析
│       ├── achievements/     # 成果報告一覧
│       ├── generations/      # 期生別
│       └── badges/           # バッジ管理
├── components/
│   ├── layout/         # AppShell, Header
│   └── ui/             # Button, Card, Badge, Input等
├── lib/
│   ├── supabase/       # client, server, middleware
│   └── utils.ts        # 共通ユーティリティ
├── types/
│   └── database.ts     # Supabase型定義
└── supabase/
    ├── schema.sql       # テーブル定義
    └── rls.sql          # Row Level Security
```
