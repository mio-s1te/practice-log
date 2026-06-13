// src/pages/lp/LandingPageMiniCourse.tsx
import { useEffect, useState } from 'react';
import { initializeTracking, recordClick, getTrackingData } from '@/utils/tracking';

export function LandingPageMiniCourse() {
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    const tracking = initializeTracking();
    if (tracking.ref) {
      recordClick({ ref: tracking.ref, campaignId: tracking.campaignId, productId: 'a0000000-0000-0000-0000-000000000002', landingPage: '/mini-course' });
    }
  }, []);

  const handlePurchase = async () => {
    setCheckoutLoading(true);
    try {
      const tracking = getTrackingData();
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: 'a0000000-0000-0000-0000-000000000002',
          campaign_id: tracking.campaignId,
          click_id: tracking.clickId,
          line_user_id: localStorage.getItem('line_user_id') || null,
          lead_id: localStorage.getItem('lead_id') || null,
        }),
      });
      if (res.ok) { const { url } = await res.json(); window.location.href = url; }
    } finally { setCheckoutLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-purple-900 to-indigo-900 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block bg-pink-400 text-pink-900 text-sm font-bold px-4 py-1.5 rounded-full mb-6">
            ⚡ 1,000部到達まで限定価格
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">
            アフィリエイト実践<br />
            <span className="text-pink-400">ミニ講座</span>
          </h1>
          <p className="text-purple-200 mb-8 max-w-xl mx-auto">
            アフィリエイトマーケティングの基礎から、実際に稼げるようになるまでを
            1時間で学べる集中講座です。
          </p>
          <div className="bg-white/10 rounded-2xl p-6 mb-8 max-w-sm mx-auto">
            <p className="text-sm text-purple-200 mb-1">限定特別価格</p>
            <p className="text-4xl font-extrabold text-pink-400">¥4,800</p>
            <p className="text-sm text-purple-300 mt-2">（通常価格 ¥9,800）</p>
          </div>
          <button
            onClick={handlePurchase}
            disabled={checkoutLoading}
            className="bg-pink-400 hover:bg-pink-300 text-pink-900 font-extrabold py-4 px-10 rounded-2xl text-xl shadow-lg transition-all transform hover:scale-105 disabled:opacity-50"
          >
            {checkoutLoading ? '処理中...' : '¥4,800で今すぐ受講する'}
          </button>
          <p className="text-sm text-purple-300 mt-3">スタート講座1,000部到達後は通常価格に戻ります</p>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">ミニ講座で学べること</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: '🔗', title: 'アフィリエイトの仕組み', desc: '報酬が発生する仕組みを基礎から理解する' },
              { icon: '📝', title: '紹介文の作り方', desc: 'クリックされる・購入される紹介文のコツ' },
              { icon: '📊', title: 'データ分析の基本', desc: 'クリック数・成約率を改善する方法' },
              { icon: '🚀', title: '月収10万への道', desc: '現実的なロードマップと具体的な行動計画' },
            ].map(item => (
              <div key={item.title} className="bg-white rounded-2xl p-6 shadow-sm">
                <span className="text-3xl">{item.icon}</span>
                <h3 className="font-bold text-gray-900 mt-3 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-8 px-4 text-center text-sm">
        <p>© 2026 みお</p>
        <p className="mt-1 text-xs">本ページはアフィリエイト広告を含みます</p>
        <div className="mt-2 flex justify-center gap-4 text-xs">
          <a href="/tokushoho" className="hover:text-white">特定商取引法</a>
          <a href="/privacy" className="hover:text-white">プライバシーポリシー</a>
          <a href="/contact" className="hover:text-white">お問い合わせ</a>
        </div>
      </footer>
    </div>
  );
}

// src/pages/lp/LandingPageFreeGift.tsx
export function LandingPageFreeGift() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    initializeTracking();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // 実際はLINE友達追加や無料プレゼント配布処理
  };

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-green-800 to-teal-900 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-6xl mb-6">🎁</div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">
            無料プレゼント<br />
            <span className="text-yellow-400">AI副業スターターキット</span>
          </h1>
          <p className="text-green-200 mb-8 max-w-xl mx-auto">
            今すぐLINE友達追加で、AI副業を始めるための
            スターターキットを無料でプレゼントします。
          </p>
          {!submitted ? (
            <div className="bg-white/10 rounded-2xl p-6 max-w-sm mx-auto">
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="メールアドレス（任意）"
                  className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <a
                  href="https://lin.ee/your-line-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-green-400 hover:bg-green-300 text-green-900 font-extrabold py-4 rounded-2xl text-lg text-center transition-all"
                >
                  📱 LINEで無料プレゼントを受け取る
                </a>
              </form>
              <p className="text-xs text-green-300 mt-3">友達追加後、すぐにお届けします</p>
            </div>
          ) : (
            <div className="bg-white/10 rounded-2xl p-6 max-w-sm mx-auto">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-bold text-lg mb-2">ありがとうございます！</p>
              <p className="text-green-200 text-sm">LINEの友達追加ボタンをタップして、プレゼントを受け取ってください。</p>
            </div>
          )}
        </div>
      </section>

      {/* 特典内容 */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">無料プレゼントの内容</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '📋', title: 'AI副業チェックリスト', desc: '今日からできる50のアクションリスト' },
              { icon: '🤖', title: 'AIプロンプト集', desc: '副業で使えるすぐ使えるプロンプト50選' },
              { icon: '📱', title: '集客LINE台本', desc: 'そのままコピーして使えるメッセージ集' },
            ].map(item => (
              <div key={item.title} className="bg-white rounded-2xl p-6 shadow-sm text-center">
                <span className="text-4xl block mb-3">{item.icon}</span>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* スタート講座への導線 */}
      <section className="py-16 px-4 bg-blue-600 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">さらに本格的に学びたい方へ</h2>
          <p className="text-blue-200 mb-6">AI副業1時間化スタート講座で、副業テーマから収益化まで一気に実現しましょう。</p>
          <a href="/start-course" className="inline-block bg-yellow-400 text-yellow-900 font-bold py-3 px-8 rounded-xl hover:bg-yellow-300 transition-colors">
            スタート講座を見る →
          </a>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-8 px-4 text-center text-sm">
        <p>© 2026 みお</p>
        <div className="mt-2 flex justify-center gap-4 text-xs">
          <a href="/tokushoho" className="hover:text-white">特定商取引法</a>
          <a href="/privacy" className="hover:text-white">プライバシーポリシー</a>
          <a href="/contact" className="hover:text-white">お問い合わせ</a>
        </div>
      </footer>
    </div>
  );
}
