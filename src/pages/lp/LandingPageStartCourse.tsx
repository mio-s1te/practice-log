// src/pages/lp/LandingPageStartCourse.tsx
// AI副業1時間化スタート講座 ランディングページ

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { initializeTracking, recordClick, getTrackingData } from '@/utils/tracking';

export function LandingPageStartCourse() {
  const [searchParams] = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [salesCount, setSalesCount] = useState(100);

  useEffect(() => {
    const tracking = initializeTracking();
    if (tracking.ref) {
      recordClick({
        ref: tracking.ref,
        campaignId: tracking.campaignId,
        productId: 'a0000000-0000-0000-0000-000000000001',
        landingPage: '/start-course',
      });
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
          product_id: 'a0000000-0000-0000-0000-000000000001',
          campaign_id: tracking.campaignId || searchParams.get('campaign'),
          affiliate_id: null, // セミナー経由で設定
          click_id: tracking.clickId,
          line_user_id: localStorage.getItem('line_user_id') || null,
          lead_id: localStorage.getItem('lead_id') || null,
        }),
      });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  const remaining = 1000 - salesCount;
  const progress = (salesCount / 1000) * 100;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block bg-yellow-400 text-yellow-900 text-sm font-bold px-4 py-1.5 rounded-full mb-6">
            🎉 1,000部突破キャンペーン実施中
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">
            AIで副業を<br />
            <span className="text-yellow-400">1時間で始める</span>方法
          </h1>
          <p className="text-lg text-blue-200 mb-8 max-w-xl mx-auto">
            AI副業1時間化スタート講座で、副業テーマ・商品・集客導線まで
            一気に構築。今日から副業スタートできます。
          </p>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-8 max-w-sm mx-auto">
            <p className="text-sm text-blue-200 mb-2">残り販売枠</p>
            <p className="text-3xl font-bold text-yellow-400 mb-2">{remaining}部</p>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div className="bg-yellow-400 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-blue-300 mt-2">{salesCount}/1,000部 販売済み</p>
          </div>
          <button
            onClick={handlePurchase}
            disabled={checkoutLoading}
            className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-extrabold py-4 px-10 rounded-2xl text-xl shadow-lg transition-all transform hover:scale-105 disabled:opacity-50"
          >
            {checkoutLoading ? '処理中...' : '今すぐ購入する ¥29,800'}
          </button>
          <p className="text-sm text-blue-300 mt-3">Stripe 安全決済 | 返金保証あり</p>
        </div>
      </section>

      {/* 特徴 */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">このスタート講座で学べること</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: '🤖', title: 'AI副業テーマの決め方', desc: '自分の強みとAIを組み合わせた副業テーマを1時間で決める方法' },
              { icon: '📦', title: 'デジタル商品の作り方', desc: 'AIを使ったコンテンツ制作で、販売できる商品を最短で作る' },
              { icon: '📱', title: 'SNS集客の自動化', desc: 'LINEとSNSを組み合わせた集客導線を構築する' },
              { icon: '💰', title: 'アフィリエイトで稼ぐ', desc: '紹介報酬で毎月安定した副収入を得る仕組みを作る' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-6 shadow-sm">
                <span className="text-3xl">{item.icon}</span>
                <h3 className="font-bold text-gray-900 mt-3 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 価格 */}
      <section className="py-16 px-4">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">受講料</h2>
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl p-8 shadow-xl">
            <p className="text-sm opacity-80 mb-2">スタート講座 通常価格</p>
            <p className="text-5xl font-extrabold mb-2">¥29,800</p>
            <p className="text-sm opacity-80 mb-6">（税込）</p>
            <ul className="text-left space-y-2 mb-8 text-sm">
              <li>✅ 講座動画（全10回）</li>
              <li>✅ 副業テーマ決定ワークシート</li>
              <li>✅ AI活用プロンプト集</li>
              <li>✅ 180日間のサポート権</li>
              <li>✅ 限定コミュニティ参加権</li>
              <li>✅ アフィリエイト参加権（購入後付与）</li>
            </ul>
            <button
              onClick={handlePurchase}
              disabled={checkoutLoading}
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-extrabold py-4 rounded-2xl text-lg transition-all disabled:opacity-50"
            >
              {checkoutLoading ? '処理中...' : '今すぐ購入する'}
            </button>
            <p className="text-xs opacity-60 mt-3">Stripe 安全決済</p>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4 text-center text-sm">
        <p>© 2024 AI副業1時間化スタート講座</p>
        <p className="mt-1 text-xs">本ページはアフィリエイト広告を含みます</p>
      </footer>
    </div>
  );
}
