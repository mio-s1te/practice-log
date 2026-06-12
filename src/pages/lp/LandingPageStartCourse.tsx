// src/pages/lp/LandingPageStartCourse.tsx
// AI副業1時間化スタート講座 ランディングページ

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { initializeTracking, recordClick, getTrackingData } from '@/utils/tracking';
import type { ProductPriceInfo } from '@/types';

// スタート講座の商品ID (サンプル - 実際のIDに合わせてください)
const PRODUCT_ID = 'a0000000-0000-0000-0000-000000000001';

export function LandingPageStartCourse() {
  const [searchParams] = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // 段階価格情報
  const [priceInfo, setPriceInfo] = useState<ProductPriceInfo | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);

  // 価格情報を取得
  const fetchPriceInfo = useCallback(async () => {
    setPriceLoading(true);
    try {
      const res = await fetch(`/.netlify/functions/get-product-price?product_id=${PRODUCT_ID}`);
      if (res.ok) {
        const data = await res.json();
        setPriceInfo(data);
      } else {
        // フォールバック: デフォルト価格を設定
        setPriceInfo({
          product_id: PRODUCT_ID,
          product_name: 'AI副業1時間化スタート講座',
          current_price: 29800,
          current_stripe_price_id: null,
          current_tier: null,
          next_tier: null,
          valid_sales_count: 0,
          remaining_until_next_tier: null,
          all_tiers: [],
          has_price_tiers: false,
        } as any);
      }
    } catch {
      setPriceInfo({
        product_id: PRODUCT_ID,
        product_name: 'AI副業1時間化スタート講座',
        current_price: 29800,
        current_stripe_price_id: null,
        current_tier: null,
        next_tier: null,
        valid_sales_count: 0,
        remaining_until_next_tier: null,
        all_tiers: [],
        has_price_tiers: false,
      } as any);
    } finally {
      setPriceLoading(false);
    }
  }, []);

  useEffect(() => {
    const tracking = initializeTracking();
    if (tracking.ref) {
      recordClick({
        ref: tracking.ref,
        campaignId: tracking.campaignId,
        productId: PRODUCT_ID,
        landingPage: '/start-course',
      });
    }
    fetchPriceInfo();
  }, [fetchPriceInfo]);

  const handlePurchase = async () => {
    setCheckoutLoading(true);
    try {
      const tracking = getTrackingData();
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: PRODUCT_ID,
          campaign_id: tracking.campaignId || searchParams.get('campaign'),
          affiliate_id: null,
          click_id: tracking.clickId,
          line_user_id: localStorage.getItem('line_user_id') || null,
          lead_id: localStorage.getItem('lead_id') || null,
        }),
      });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        alert('購入処理の開始に失敗しました。しばらくしてから再試行してください。');
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  // 販売数・残り部数の計算
  const salesCount = priceInfo?.valid_sales_count ?? 0;
  const currentTier = priceInfo?.current_tier ?? null;
  const nextTier = priceInfo?.next_tier ?? null;
  const currentPrice = priceInfo?.current_price ?? 29800;

  // キャンペーン進捗（次のtierまでの上限 or デフォルト1000）
  const tierLimit = currentTier?.max_valid_sales_count ?? 1000;
  const remaining = Math.max(0, tierLimit - salesCount);
  const progress = Math.min(100, (salesCount / tierLimit) * 100);

  // 価格バッジカラー
  const isPriceLoading = priceLoading;

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

          {/* ============================================================
              段階価格表示ブロック
              ============================================================ */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-5 mb-8 max-w-md mx-auto text-left">
            {isPriceLoading ? (
              <div className="text-center py-4 text-blue-300 text-sm">読み込み中...</div>
            ) : (
              <>
                {/* 現在価格 */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-blue-200 text-sm">現在価格</span>
                  <span className="text-2xl font-extrabold text-yellow-400">
                    ¥{currentPrice.toLocaleString()}
                  </span>
                </div>

                {/* 次回値上げ予定 */}
                {nextTier && (
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/20">
                    <div>
                      <span className="text-blue-200 text-sm">次回価格</span>
                      <p className="text-xs text-blue-300 mt-0.5">
                        値上げ条件: {(currentTier?.max_valid_sales_count ?? tierLimit).toLocaleString()}部突破後
                      </p>
                    </div>
                    <span className="text-xl font-bold text-red-300">
                      ¥{nextTier.price.toLocaleString()}
                    </span>
                  </div>
                )}

                {/* 販売進捗バー */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-blue-200">現在販売数</span>
                    <span className="font-bold text-white">
                      {salesCount.toLocaleString()} / {tierLimit.toLocaleString()}部
                    </span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-yellow-400 to-orange-400 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* 残り部数 */}
                {nextTier && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-blue-200 text-sm">値上げまで残り</span>
                    <span className="text-lg font-extrabold text-yellow-300">
                      残り {remaining.toLocaleString()}部
                    </span>
                  </div>
                )}

                {/* 最終tierに達した場合 */}
                {!nextTier && currentTier && (
                  <p className="text-xs text-blue-300 mt-2 text-center">
                    ※ この価格は最終価格です
                  </p>
                )}
              </>
            )}
          </div>

          {/* 購入ボタン */}
          <button
            onClick={handlePurchase}
            disabled={checkoutLoading || isPriceLoading}
            className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-extrabold py-4 px-10 rounded-2xl text-xl shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkoutLoading
              ? '処理中...'
              : isPriceLoading
              ? '読み込み中...'
              : `今すぐ購入する ¥${currentPrice.toLocaleString()}`}
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

      {/* 価格セクション（段階価格詳細） */}
      <section className="py-16 px-4">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">受講料</h2>
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl p-8 shadow-xl">
            <p className="text-sm opacity-80 mb-2">スタート講座 現在価格</p>
            <p className="text-5xl font-extrabold mb-2">
              ¥{currentPrice.toLocaleString()}
            </p>
            <p className="text-sm opacity-80 mb-1">（税込）</p>

            {/* 段階価格の詳細表示 */}
            {priceInfo?.has_price_tiers && priceInfo.all_tiers.length > 0 && (
              <div className="bg-white/10 rounded-xl p-4 mb-6 text-left">
                <p className="text-xs font-semibold mb-2 opacity-90">📊 価格ステップ（販売数連動）</p>
                {priceInfo.all_tiers.map((tier, idx) => {
                  const isCurrent = tier.tier_id === currentTier?.tier_id;
                  return (
                    <div
                      key={tier.tier_id}
                      className={`flex items-center justify-between py-1.5 ${
                        idx < priceInfo.all_tiers.length - 1 ? 'border-b border-white/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isCurrent && (
                          <span className="text-xs bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded font-bold">
                            現在
                          </span>
                        )}
                        <span className={`text-xs ${isCurrent ? 'text-white font-semibold' : 'opacity-60'}`}>
                          {tier.min_valid_sales_count.toLocaleString()}部〜
                          {tier.max_valid_sales_count != null
                            ? `${tier.max_valid_sales_count.toLocaleString()}部`
                            : ''}
                        </span>
                      </div>
                      <span className={`text-sm font-bold ${isCurrent ? 'text-yellow-300' : 'opacity-60'}`}>
                        ¥{tier.price.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <ul className="text-left space-y-2 mb-8 text-sm">
              <li>✅ 講座動画（全10回）</li>
              <li>✅ 副業テーマ決定ワークシート</li>
              <li>✅ AI活用プロンプト集</li>
              <li>✅ 180日間のサポート権</li>
              <li>✅ 限定コミュニティ参加権</li>
              <li>✅ アフィリエイト参加権（購入後付与）</li>
            </ul>

            {/* 値上げ警告バナー */}
            {nextTier && remaining <= 100 && (
              <div className="bg-red-500/80 rounded-xl p-3 mb-4 text-sm font-semibold">
                ⚠ あと {remaining}部で ¥{nextTier.price.toLocaleString()} に値上がりします！
              </div>
            )}
            {nextTier && remaining > 100 && (
              <div className="bg-yellow-500/20 rounded-xl p-3 mb-4 text-sm">
                📈 {(currentTier?.max_valid_sales_count ?? tierLimit).toLocaleString()}部突破後に
                ¥{nextTier.price.toLocaleString()}へ値上がり予定
              </div>
            )}

            <button
              onClick={handlePurchase}
              disabled={checkoutLoading || isPriceLoading}
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-extrabold py-4 rounded-2xl text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkoutLoading
                ? '処理中...'
                : `今すぐ購入する（¥${currentPrice.toLocaleString()}）`}
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
