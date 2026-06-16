// src/pages/affiliate/AffiliateTop.tsx
// mio-affiliate トップページ（アフィリエイターパートナーHP）

import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

const MIO_ICON = 'https://www.genspark.ai/api/files/s/CJ9px1sS';

// みおキャラの表情パターン
type MioMood = 'normal' | 'happy' | 'wink' | 'excited';

function MioCharacter({ mood = 'normal', size = 80, className = '' }: { mood?: MioMood; size?: number; className?: string }) {
  // 気分によってアニメーションclass変える
  const animClass = {
    normal: 'animate-bounce-slow',
    happy:  'animate-spin-slow',
    wink:   'animate-wiggle',
    excited:'animate-jump',
  }[mood];

  return (
    <img
      src={MIO_ICON}
      alt="みお"
      width={size}
      height={size}
      className={`rounded-full ${animClass} ${className}`}
      style={{ imageRendering: 'auto' }}
    />
  );
}

// 報酬ステップカード
function StepCard({ step, icon, title, desc }: { step: number; icon: string; title: string; desc: string }) {
  return (
    <div className="relative bg-white rounded-2xl shadow-md p-6 border border-pink-100 hover:shadow-lg transition-shadow">
      <div className="absolute -top-4 -left-2 w-9 h-9 bg-pink-400 text-white rounded-full flex items-center justify-center font-bold text-sm shadow">
        {step}
      </div>
      <div className="text-3xl mb-3 mt-1">{icon}</div>
      <h3 className="font-bold text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

// 報酬体系カード
function RewardCard({ label, percent, amount, color }: { label: string; percent: string; amount: string; color: string }) {
  return (
    <div className={`rounded-2xl p-5 text-white shadow-md ${color}`}>
      <p className="text-sm font-medium opacity-90 mb-1">{label}</p>
      <p className="text-4xl font-black">{percent}</p>
      <p className="text-sm opacity-80 mt-1">{amount}</p>
    </div>
  );
}

// FAQアイテム
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-pink-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-5 py-4 flex justify-between items-center bg-white hover:bg-pink-50 transition-colors"
      >
        <span className="font-medium text-gray-700 text-sm">{q}</span>
        <span className="text-pink-400 font-bold text-lg ml-2">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-5 py-4 bg-pink-50 text-sm text-gray-600 leading-relaxed border-t border-pink-100">
          {a}
        </div>
      )}
    </div>
  );
}

export function AffiliateTop() {
  const [salesCount, setSalesCount] = useState<number | null>(null);

  // 現在の販売数を取得（アフィリエイト課への訴求）
  useEffect(() => {
    fetch('/api/get-product-price?product_id=a0000000-0000-0000-0000-000000000001')
      .then(r => r.json())
      .then(d => { if (d.valid_sales_count !== undefined) setSalesCount(d.valid_sales_count); })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-orange-50 font-sans">

      {/* ===== ヘッダー ===== */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-pink-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={MIO_ICON} alt="みお" className="w-8 h-8 rounded-full" />
            <span className="font-bold text-gray-700 text-sm">みおアフィリエイトパートナー</span>
          </div>
          <div className="flex gap-2">
            <Link
              to="/affiliate/login"
              className="text-sm px-4 py-1.5 rounded-full border border-pink-300 text-pink-500 hover:bg-pink-50 transition-colors font-medium"
            >
              ログイン
            </Link>
            <Link
              to="/affiliate/register"
              className="text-sm px-4 py-1.5 rounded-full bg-pink-400 text-white hover:bg-pink-500 transition-colors font-medium shadow-sm"
            >
              新規登録
            </Link>
          </div>
        </div>
      </header>

      {/* ===== ヒーローセクション ===== */}
      <section className="relative overflow-hidden pt-16 pb-20 px-4">
        {/* 背景デコ */}
        <div className="absolute top-10 right-0 w-64 h-64 bg-pink-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-100 rounded-full blur-3xl opacity-50 pointer-events-none" />

        <div className="max-w-2xl mx-auto text-center relative">
          {/* みおキャラ */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <img
                src={MIO_ICON}
                alt="みお"
                className="w-28 h-28 rounded-full shadow-lg border-4 border-white"
                style={{ filter: 'drop-shadow(0 4px 12px rgba(244,114,182,0.3))' }}
              />
              {/* 吹き出し */}
              <div className="absolute -top-2 -right-4 bg-yellow-300 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full shadow rotate-6 whitespace-nowrap">
                いっしょに稼ごう！
              </div>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-gray-800 leading-tight mb-4">
            AIで副業する人を増やす<br />
            <span className="text-pink-500">アフィリエイトパートナー</span>募集中
          </h1>
          <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-8 max-w-md mx-auto">
            スタート講座・養成講座を紹介して報酬GET。<br />
            あなたが紹介した人が成功すれば、あなたにも報酬が入る。<br />
            一緒にスタート講座1,000部を達成しよう🎯
          </p>

          {/* CTAボタン */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/affiliate/register"
              className="inline-flex items-center justify-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-bold px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all text-base"
            >
              🎉 パートナー登録する
            </Link>
            <Link
              to="/affiliate/login"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-600 font-medium px-8 py-4 rounded-full shadow border border-gray-200 transition-all text-base"
            >
              ログインはこちら
            </Link>
          </div>

          {/* 現在の販売数バッジ */}
          {salesCount !== null && (
            <div className="mt-6 inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-sm px-4 py-2 rounded-full">
              🔥 現在のスタート講座販売数：<span className="font-bold">{salesCount}部</span>　残り<span className="font-bold text-red-500">{Math.max(0, 1000 - salesCount)}部</span>でプロジェクト完了！
            </div>
          )}
        </div>
      </section>

      {/* ===== 登録条件 ===== */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center mb-3">
            <MioCharacter mood="wink" size={56} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-center text-gray-800 mb-2">
            登録できるのはこんな人
          </h2>
          <p className="text-center text-sm text-gray-400 mb-8">どちらか1つでOK！</p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-6 border border-pink-200 text-center">
              <div className="text-4xl mb-3">📘</div>
              <h3 className="font-bold text-gray-700 mb-2">AI副業1時間化<br />スタート講座 購入者</h3>
              <p className="text-xs text-gray-500">講座を受け取ったら<br />すぐに登録できます</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200 text-center">
              <div className="text-4xl mb-3">🎓</div>
              <h3 className="font-bold text-gray-700 mb-2">プロAIアフィリエイター<br />養成講座 購入者</h3>
              <p className="text-xs text-gray-500">養成講座には<br />紹介の実践が含まれます</p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            ※ 登録は購入時のメールアドレスで照合します
          </p>
        </div>
      </section>

      {/* ===== 仕組み（ステップ） ===== */}
      <section className="py-14 px-4 bg-gradient-to-b from-white to-pink-50">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center mb-3">
            <MioCharacter mood="happy" size={56} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-center text-gray-800 mb-8">
            報酬が発生する仕組み
          </h2>

          <div className="grid sm:grid-cols-3 gap-8">
            <StepCard
              step={1}
              icon="🔗"
              title="あなた専用URLを取得"
              desc="登録後にダッシュボードから紹介URLをコピー。SNSやブログに貼るだけ！"
            />
            <StepCard
              step={2}
              icon="🛒"
              title="紹介した人が購入"
              desc="あなたのURLから誰かが講座を購入すると自動で記録されます"
            />
            <StepCard
              step={3}
              icon="💰"
              title="報酬が確定"
              desc="返金期間終了後に報酬が確定。振込申請で受け取れます！"
            />
          </div>
        </div>
      </section>

      {/* ===== 報酬体系 ===== */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center mb-3">
            <MioCharacter mood="excited" size={56} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-center text-gray-800 mb-2">
            報酬体系
          </h2>
          <p className="text-center text-sm text-gray-400 mb-8">紹介した商品の販売価格に対して報酬が発生します</p>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <RewardCard
              label="AI副業1時間化スタート講座"
              percent="30%"
              amount="例）4,980円の販売 → 1,494円"
              color="bg-gradient-to-br from-pink-400 to-pink-600"
            />
            <RewardCard
              label="プロAIアフィリエイター養成講座"
              percent="30%"
              amount="例）4,980円の販売 → 1,494円"
              color="bg-gradient-to-br from-orange-400 to-orange-600"
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-yellow-800 text-center">
            💡 講座の価格は今後段階的に上がっていきます。<br />
            早く紹介するほど、購入してもらいやすい価格帯です！
          </div>
        </div>
      </section>

      {/* ===== みおのメッセージ ===== */}
      <section className="py-14 px-4 bg-gradient-to-b from-pink-50 to-white">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-md p-8 border border-pink-100 relative">
            {/* みおキャラ */}
            <div className="flex justify-center mb-5">
              <div className="relative">
                <img
                  src={MIO_ICON}
                  alt="みお"
                  className="w-20 h-20 rounded-full border-4 border-pink-200 shadow"
                />
                <div className="absolute -bottom-1 -right-1 text-xl">🐱</div>
              </div>
            </div>
            <h2 className="text-lg font-black text-center text-gray-800 mb-4">
              みおからのメッセージ
            </h2>
            <div className="text-sm text-gray-600 leading-loose space-y-3">
              <p>
                このアフィリエイトプログラムは、ただ紹介リンクを貼るだけのものじゃありません。
              </p>
              <p>
                <span className="font-bold text-pink-500">「AIを使った副業」を本当に必要としている人に届ける</span>、そのための仕組みです。
              </p>
              <p>
                スタート講座1,000部達成というプロジェクトを、いっしょに達成したい。
                あなたの紹介が、誰かの人生を変えるきっかけになると本気で思っています。
              </p>
              <p className="font-bold text-gray-700">
                一緒に頑張りましょう！🎯
              </p>
            </div>
            <p className="text-right text-sm text-gray-400 mt-4 font-medium">— みお 🐱</p>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-black text-center text-gray-800 mb-8">
            よくある質問
          </h2>
          <div className="space-y-3">
            <FaqItem
              q="登録に費用はかかりますか？"
              a="完全無料です。講座を購入済みであれば、いつでも無料で登録できます。"
            />
            <FaqItem
              q="スタート講座と養成講座、どちらを購入すれば登録できますか？"
              a="どちらか1つでOKです。両方購入している場合ももちろん登録できます。"
            />
            <FaqItem
              q="報酬はいつ振り込まれますか？"
              a="返金期間（購入後14日間）が終了し、報酬が確定した後に振込申請が可能になります。振込は月末締め翌月払いを予定しています。"
            />
            <FaqItem
              q="紹介できる商品はどれですか？"
              a="購入した講座を紹介できます。両方購入している場合は両方紹介できます。ダッシュボードから紹介URLを確認してください。"
            />
            <FaqItem
              q="禁止されている宣伝方法はありますか？"
              a="虚偽の情報・誇大広告・スパム行為・無断でのメール送信などは禁止しています。詳細は登録時の利用規約をご確認ください。"
            />
          </div>
        </div>
      </section>

      {/* ===== 最終CTA ===== */}
      <section className="py-16 px-4 bg-gradient-to-b from-pink-400 to-pink-600 text-white text-center">
        <div className="max-w-xl mx-auto">
          <img src={MIO_ICON} alt="みお" className="w-20 h-20 rounded-full border-4 border-white/50 shadow-lg mx-auto mb-5" />
          <h2 className="text-2xl font-black mb-3">いっしょに始めよう！</h2>
          <p className="text-pink-100 text-sm mb-8 leading-relaxed">
            登録は3分でできます。<br />
            まずは購入時のメールアドレスで登録してみてください。
          </p>
          <Link
            to="/affiliate/register"
            className="inline-flex items-center justify-center gap-2 bg-white text-pink-500 font-black px-10 py-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all text-lg"
          >
            🎉 パートナー登録する（無料）
          </Link>
          <div className="mt-4">
            <Link to="/affiliate/login" className="text-pink-200 text-sm underline hover:text-white">
              すでに登録済みの方はこちら
            </Link>
          </div>
        </div>
      </section>

      {/* ===== フッター ===== */}
      <footer className="bg-gray-800 text-gray-400 text-center text-xs py-6 px-4">
        <p>© 2026 みおアフィリエイトパートナー</p>
        <div className="flex justify-center gap-4 mt-2">
          <Link to="/tokushoho" className="hover:text-white">特定商取引法</Link>
          <Link to="/privacy" className="hover:text-white">プライバシーポリシー</Link>
        </div>
      </footer>

    </div>
  );
}
