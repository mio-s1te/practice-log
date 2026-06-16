// src/pages/affiliate/AffiliateTop.tsx
// mio-affiliate トップページ（アフィリエイターパートナーHP）
// テーマ：薄オレンジ・可愛い・みおキャラ活用

import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

const MIO_ICON = '/mio-icon.png';

// ─────────────────────────────────────────
// みおキャラ（吹き出し付き）
// ─────────────────────────────────────────
function Mio({ size = 80, balloon, balloonDir = 'right', className = '' }:
  { size?: number; balloon?: string; balloonDir?: 'right' | 'left' | 'top'; className?: string }) {
  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <img src={MIO_ICON} alt="みお" width={size} height={size}
        className="rounded-full border-4 border-white shadow-lg object-cover" />
      {balloon && (
        <div className={`absolute z-10 bg-white border-2 border-orange-200 rounded-2xl px-3 py-2
          text-xs font-bold text-gray-700 shadow-md whitespace-nowrap
          ${balloonDir === 'right' ? '-right-2 top-0 translate-x-full' :
            balloonDir === 'left'  ? '-left-2 top-0 -translate-x-full' :
            'bottom-full mb-2'}`}>
          {balloon}
          <div className={`absolute w-2 h-2 bg-white border-orange-200 rotate-45
            ${balloonDir === 'right' ? 'border-b-2 border-l-2 -left-1 top-3' :
              balloonDir === 'left'  ? 'border-b-2 border-r-2 -right-1 top-3' :
              'border-b-2 border-r-2 left-4 -bottom-1'}`} />
        </div>
      )}
    </div>
  );
}

// スクリーンショット画像URL（実際のダッシュボード）
const SS_KPI     = '/dashboard-kpi.png';
const SS_GRAPH   = '/dashboard-graph.png';
const SS_RADAR   = '/dashboard-radar.png';
const SS_RANKING = '/dashboard-ranking.png';

// ─────────────────────────────────────────
// ダッシュボードモックアップ（実スクリーンショット使用）
// ─────────────────────────────────────────
function DashboardMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-orange-100 text-left">
      {/* ブラウザバー風 */}
      <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 border-b border-gray-200">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white rounded-full px-3 py-1 text-xs text-gray-400 ml-2">
          ログイン後のパートナー専用画面
        </div>
      </div>
      {/* 実ダッシュボードのスクリーンショット */}
      <img
        src={SS_KPI}
        alt="ダッシュボード KPI概要"
        className="w-full object-contain bg-white"
      />
    </div>
  );
}

// ─────────────────────────────────────────
// グラフ分析スクリーンショット
// ─────────────────────────────────────────
function RewardSimMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-orange-100">
      <div className="bg-orange-400 px-4 py-2">
        <p className="text-white font-bold text-sm">📈 グラフ分析</p>
      </div>
      <img
        src={SS_GRAPH}
        alt="グラフ分析"
        className="w-full object-contain bg-white"
      />
    </div>
  );
}

// ─────────────────────────────────────────
// パフォーマンス診断スクリーンショット
// ─────────────────────────────────────────
function RankingMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-orange-100">
      <div className="bg-gradient-to-r from-orange-400 to-pink-400 px-4 py-2">
        <p className="text-white font-bold text-sm">🎯 パフォーマンス診断</p>
      </div>
      <img
        src={SS_RADAR}
        alt="パフォーマンス診断"
        className="w-full object-contain bg-white"
      />
    </div>
  );
}

// ─────────────────────────────────────────
// ステップカード
// ─────────────────────────────────────────
function StepCard({ no, icon, title, desc, color }:
  { no: number; icon: string; title: string; desc: string; color: string }) {
  return (
    <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-orange-100 hover:shadow-md transition-shadow">
      <div className={`absolute -top-3 left-5 w-8 h-8 ${color} text-white rounded-full flex items-center justify-center font-black text-sm shadow`}>
        {no}
      </div>
      <div className="text-3xl mb-3 mt-2">{icon}</div>
      <h3 className="font-bold text-gray-800 mb-1 text-sm">{title}</h3>
      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

// ─────────────────────────────────────────
// FAQアイテム
// ─────────────────────────────────────────
function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-orange-100 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full text-left px-5 py-4 flex justify-between items-center bg-white hover:bg-orange-50 transition-colors">
        <span className="font-medium text-gray-700 text-sm pr-4">{q}</span>
        <span className={`text-orange-400 font-black text-xl transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && (
        <div className="px-5 py-4 bg-orange-50 text-sm text-gray-600 leading-relaxed border-t border-orange-100">
          {a}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────
export function AffiliateTop() {
  const [salesCount, setSalesCount] = useState<number | null>(null);
  const remaining = salesCount !== null ? Math.max(0, 1000 - salesCount) : null;

  useEffect(() => {
    fetch('/api/get-product-price?product_id=a0000000-0000-0000-0000-000000000001')
      .then(r => r.json())
      .then(d => { if (d.valid_sales_count !== undefined) setSalesCount(d.valid_sales_count); })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-orange-50 font-sans">

      {/* ==============================
          ヘッダー
      ============================== */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-orange-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={MIO_ICON} alt="みお" className="w-8 h-8 rounded-full border-2 border-orange-200" />
            <div>
              <span className="font-black text-gray-800 text-sm">みおアフィリエイト</span>
              <span className="ml-2 text-xs text-orange-400 font-medium hidden sm:inline">パートナープログラム</span>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link to="/affiliate/login"
              className="text-sm px-4 py-1.5 rounded-full border border-orange-300 text-orange-500 hover:bg-orange-50 transition-colors font-medium">
              ログイン
            </Link>
            <Link to="/affiliate/register"
              className="text-sm px-4 py-1.5 rounded-full bg-orange-400 text-white hover:bg-orange-500 transition-colors font-bold shadow-sm">
              新規登録
            </Link>
          </nav>
        </div>
      </header>

      {/* ==============================
          ヒーロー
      ============================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 pt-16 pb-20 px-4">
        {/* 背景デコ */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-100 rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-100 rounded-full blur-3xl opacity-60 translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="max-w-5xl mx-auto relative">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* テキスト */}
            <div className="flex-1 text-center lg:text-left">
              {/* バッジ */}
              {remaining !== null && (
                <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full mb-5 shadow-sm">
                  🔥 スタート講座 残り<span className="text-base">{remaining}</span>部でプロジェクト完了！
                </div>
              )}

              <div className="flex items-center gap-3 justify-center lg:justify-start mb-5">
                <Mio size={72} balloon="あなたの理想の生活、叶えよう🐱" balloonDir="right" />
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-800 leading-tight mb-4">
                睡眠を削らなくていい。<br />
                <span className="text-orange-500">理想の毎日を、</span><br />
                AIと一緒に手に入れよう。
              </h1>
              <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-8 max-w-md mx-auto lg:mx-0">
                みおの講座を紹介するだけ。あなたのURLから誰かが購入すると<span className="font-bold text-orange-500">報酬</span>が入ります。
                スタート講座・養成講座どちらかの購入者なら今すぐ登録できます。
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link to="/affiliate/register"
                  className="inline-flex items-center justify-center gap-2 bg-orange-400 hover:bg-orange-500 text-white font-black px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all text-base">
                  🎉 紹介者登録する（無料）
                </Link>
                <Link to="/affiliate/login"
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-orange-50 text-gray-600 font-medium px-8 py-4 rounded-full shadow border border-orange-200 transition-all text-base">
                  ログインはこちら →
                </Link>
              </div>

              <p className="text-xs text-gray-400 mt-4">
                ※ スタート講座 or 養成講座購入者のみ登録可
              </p>
            </div>

            {/* ダッシュボードモックアップ */}
            <div className="w-full lg:w-96 flex-shrink-0">
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ==============================
          3ステップ
      ============================== */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col items-center mb-10">
            <Mio size={56} balloon="かんたん3ステップ！" balloonDir="top" />
            <h2 className="text-xl sm:text-2xl font-black text-gray-800 mt-4">紹介で理想の生活に近づく仕組み</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            <StepCard no={1} icon="✅" color="bg-orange-400"
              title="登録してURLをもらう"
              desc="購入時のメールアドレスで登録。ダッシュボードからあなた専用の紹介URLを取得できます。" />
            <StepCard no={2} icon="📣" color="bg-amber-400"
              title="SNS・ブログで紹介する"
              desc="XやInstagram、LINEなどに紹介URLを貼るだけ。コンテンツに合わせた紹介素材もダッシュボードで確認できます。" />
            <StepCard no={3} icon="💰" color="bg-yellow-500"
              title="購入されたら報酬確定"
              desc="あなたのURLから購入されると自動で記録。返金期間（14日）終了後に報酬が確定し、振込申請ができます。" />
          </div>
        </div>
      </section>

      {/* ==============================
          ダッシュボード詳細紹介
      ============================== */}
      <section className="py-16 px-4 bg-orange-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block bg-orange-100 text-orange-600 text-xs font-bold px-3 py-1 rounded-full mb-3">
              📊 ダッシュボード機能
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-gray-800">
              自分の成果をリアルタイムで管理
            </h2>
            <p className="text-sm text-gray-400 mt-2">登録後すぐに使えるパートナー専用ダッシュボード</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-start">
            {/* 左：機能リスト */}
            <div className="space-y-4">
              {[
                { icon: '🔗', title: '専用紹介URLの管理', desc: '商品ごとにあなただけの紹介URLを発行。コピーして好きな場所に貼るだけ！' },
                { icon: '📈', title: 'クリック数・成約数をグラフで確認', desc: '日別・週別・月別のグラフでトレンドが一目でわかります。前期比較もできます。' },
                { icon: '💰', title: '報酬ステータスを一覧管理', desc: '未確定・確定済み・支払済みの報酬をひと目で確認。累計収益も表示されます。' },
                { icon: '🏆', title: 'ランキングで他の紹介者と競える', desc: '今月のランキングを確認できます。上位を目指すモチベーションに！' },
                { icon: '📣', title: '商品別の紹介素材を確認', desc: 'SNS投稿例文・禁止表現・セールスポイントなど紹介に役立つ素材が揃っています。' },
                { icon: '📉', title: 'レーダーチャートで自分の強みを分析', desc: '集客力・成約力・継続力など5項目でスコアを表示。改善ポイントがわかります。' },
              ].map(f => (
                <div key={f.title} className="flex gap-4 bg-white rounded-2xl p-4 shadow-sm border border-orange-100 hover:shadow-md transition-shadow">
                  <div className="text-2xl flex-shrink-0 mt-0.5">{f.icon}</div>
                  <div>
                    <h3 className="font-bold text-gray-700 text-sm mb-1">{f.title}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 右：スクリーンショット */}
            <div className="space-y-4">
              <RewardSimMockup />
              <RankingMockup />
              {/* ランキング画面 */}
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-orange-100">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-400 px-4 py-2">
                  <p className="text-white font-bold text-sm">🏆 ランキング</p>
                </div>
                <img
                  src={SS_RANKING}
                  alt="ランキング画面"
                  className="w-full object-contain bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==============================
          報酬体系
      ============================== */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col items-center mb-10">
            <Mio size={56} balloon="報酬条件はダッシュボードで確認してね！" balloonDir="top" />
            <h2 className="text-xl sm:text-2xl font-black text-gray-800 mt-4">報酬体系</h2>
            <p className="text-sm text-gray-400 mt-1">紹介した講座が売れるたびに報酬が入ります</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {[
              {
                name: 'AI副業1時間化\nスタート講座',
                price: '¥4,980〜',
                color: 'from-orange-400 to-amber-400',
                note: '〜1,000部:29,800円 / 1,001〜10,000部:49,800円 / 10,001部〜:99,800円',
                icon: '📘',
              },
              {
                name: 'プロAIアフィリエイター\n養成講座',
                price: '¥4,980〜',
                color: 'from-pink-400 to-orange-400',
                note: '先着30名:4,980円 / 31〜100名:9,800円 / 101〜300名:29,800円 / 301〜1,000名:49,800円（スタート講座1,000部達成でプロジェクト終了）',
                icon: '🎓',
              },
            ].map(p => (
              <div key={p.name} className={`bg-gradient-to-br ${p.color} text-white rounded-2xl p-6 shadow-md`}>
                <div className="text-3xl mb-3">{p.icon}</div>
                <h3 className="font-black text-base whitespace-pre-line mb-3">{p.name}</h3>
                <div className="bg-white/20 rounded-xl p-3 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm opacity-90">販売価格</span>
                    <span className="font-black text-lg">{p.price}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm opacity-90">あなたの報酬</span>
                    <span className="font-black text-base">ダッシュボードで確認</span>
                  </div>
                </div>
                <p className="text-xs opacity-80 leading-relaxed">💡 {p.note}</p>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
            <p className="font-bold mb-1">⚠️ 価格は段階的に上がります</p>
            <p className="text-xs leading-relaxed text-amber-700">
              両講座とも現在は初期実践者限定の特別価格です。販売数が増えるにつれて値上がりします。
              報酬の詳細な条件は登録後のダッシュボードでご確認いただけます。
            </p>
          </div>
        </div>
      </section>

      {/* ==============================
          登録条件
      ============================== */}
      <section className="py-16 px-4 bg-orange-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-black text-gray-800">登録できる方</h2>
            <p className="text-sm text-gray-400 mt-1">どちらか1つ購入していれば登録できます</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {[
              { icon: '📘', title: 'スタート講座\n購入者', desc: '「AI副業1日1時間化スタート講座」を購入済みの方。購入後すぐ登録できます。', color: 'border-orange-300 bg-orange-50' },
              { icon: '🎓', title: '養成講座\n購入者', desc: '「プロAIアフィリエイター養成講座」を購入済みの方。養成講座には紹介の実践が含まれます。', color: 'border-pink-300 bg-pink-50' },
            ].map(c => (
              <div key={c.title} className={`rounded-2xl border-2 ${c.color} p-6 text-center`}>
                <div className="text-4xl mb-3">{c.icon}</div>
                <h3 className="font-black text-gray-700 text-base whitespace-pre-line mb-2">{c.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-orange-100 p-5 text-sm text-gray-600 shadow-sm">
            <p className="font-bold text-gray-700 mb-2">📋 登録の流れ</p>
            <ol className="space-y-1 text-xs text-gray-500 list-decimal list-inside">
              <li>「紹介者登録する」ボタンをタップ</li>
              <li>購入時に使ったメールアドレスを入力（購入確認に使用）</li>
              <li>名前・SNS・動機などを入力して送信</li>
              <li>即時承認 → ダッシュボードで紹介URLを取得！</li>
            </ol>
          </div>
        </div>
      </section>

      {/* ==============================
          みおからのメッセージ
      ============================== */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl p-8 border border-orange-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-4 right-4 text-6xl opacity-10">🐱</div>
            <div className="flex justify-center mb-6">
              <Mio size={80} balloon="読んでね🐱" balloonDir="right" />
            </div>
            <h2 className="text-lg font-black text-center text-gray-800 mb-5">みおからのメッセージ</h2>
            <div className="text-sm text-gray-600 leading-loose space-y-3">
              <p>このプログラムは「ただ紹介リンクを貼るだけ」のものじゃありません。</p>
              <p>
                <span className="font-bold text-orange-500">「AIを使った副業で人生を変えたい人に届ける」</span>、そのための仕組みです。
              </p>
              <p>
                スタート講座1,000部を達成するというプロジェクトを、いっしょに実現したい。
                あなたの紹介が誰かの背中を押すきっかけになると本気で思っています。
              </p>
              <p>
                養成講座は「アフィリエイトを学びながら実践する」講座でもあります。
                だから、登録して紹介すること自体が<span className="font-bold">養成講座の実践</span>になります。
              </p>
              <p className="font-bold text-gray-700">一緒に頑張りましょう！🎯</p>
            </div>
            <p className="text-right text-sm text-orange-400 mt-5 font-bold">— みお 🐱</p>
          </div>
        </div>
      </section>

      {/* ==============================
          FAQ
      ============================== */}
      <section className="py-16 px-4 bg-orange-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-black text-center text-gray-800 mb-8">よくある質問</h2>
          <div className="space-y-3">
            <Faq q="登録に費用はかかりますか？" a="完全無料です。講座を購入済みであればいつでも無料で登録できます。" />
            <Faq q="スタート講座と養成講座、どちらでも登録できますか？" a="どちらか1つ購入していれば登録できます。両方購入している場合はもちろんどちらの講座も紹介できます。" />
            <Faq q="報酬はいつ振り込まれますか？" a="返金期間（購入後14日間）が終了し報酬が確定した後に振込申請できます。振込は月末締め翌月払いを予定しています。" />
            <Faq q="価格が上がったら報酬も上がりますか？" a="はい！報酬は価格に連動して変動します。詳細な報酬条件は登録後のダッシュボードでご確認いただけます。" />
            <Faq q="禁止されている宣伝方法はありますか？" a="虚偽の情報・誇大広告・スパム行為・無断でのDM一斉送信などは禁止しています。ダッシュボードの商品詳細ページに推奨表現・禁止表現が記載されているので必ずご確認ください。" />
            <Faq q="登録したらどこで紹介URLを確認できますか？" a="ログイン後のダッシュボードで商品ごとの紹介URLを確認できます。コピーボタン1つで取得できます。" />
          </div>
        </div>
      </section>

      {/* ==============================
          最終CTA
      ============================== */}
      <section className="py-20 px-4 bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400 text-white text-center">
        <div className="max-w-xl mx-auto">
          <Mio size={80} balloon="待ってるよ！🐱" balloonDir="top"
            className="justify-center mb-6" />
          <h2 className="text-2xl sm:text-3xl font-black mb-3">さあ、はじめよう！</h2>
          <p className="text-orange-100 text-sm mb-8 leading-relaxed">
            登録は3分で完了。まず購入時のメールアドレスを入力するだけです。
          </p>
          <Link to="/affiliate/register"
            className="inline-flex items-center justify-center gap-2 bg-white text-orange-500 font-black px-10 py-5 rounded-full shadow-2xl hover:scale-105 transition-transform text-lg">
            🎉 無料で紹介者登録する
          </Link>
          <div className="mt-5">
            <Link to="/affiliate/login" className="text-orange-100 text-sm underline hover:text-white">
              すでに登録済みの方はこちら
            </Link>
          </div>
        </div>
      </section>

      {/* ==============================
          フッター
      ============================== */}
      <footer className="bg-gray-800 text-gray-400 text-center text-xs py-8 px-4">
        <img src={MIO_ICON} alt="みお" className="w-10 h-10 rounded-full mx-auto mb-3 border-2 border-gray-600" />
        <p className="font-bold text-gray-300 mb-1">みおアフィリエイトパートナー</p>
        <p className="mb-3">© 2026 Mio. All rights reserved.</p>
        <div className="flex justify-center gap-6">
          <Link to="/tokushoho" className="hover:text-white transition-colors">特定商取引法</Link>
          <Link to="/privacy" className="hover:text-white transition-colors">プライバシーポリシー</Link>
          <Link to="/contact" className="hover:text-white transition-colors">お問い合わせ</Link>
        </div>
      </footer>

    </div>
  );
}
