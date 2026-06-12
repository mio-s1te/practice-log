// src/pages/lp/LandingPageAffiliateCourse.tsx
// AIアフィリエイト実践講座 ランディングページ
// 通常価格: ¥29,800 / スタート講座1,000部突破まで特別価格: ¥4,980

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { initializeTracking, recordClick, getTrackingData } from '@/utils/tracking';

const PRODUCT_ID = 'a0000000-0000-0000-0000-000000000003'; // AIアフィリエイト実践講座
const NORMAL_PRICE = 29800;
const CAMPAIGN_PRICE = 4980;

interface PriceInfo {
  current_price: number;
  is_campaign_active: boolean;
  campaign_price: number;
  campaign_condition: string;
  start_course_sales_count: number;
  start_course_limit: number;
}

export function LandingPageAffiliateCourse() {
  const [searchParams] = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [priceInfo, setPriceInfo] = useState<PriceInfo>({
    current_price: CAMPAIGN_PRICE,
    is_campaign_active: true,
    campaign_price: CAMPAIGN_PRICE,
    campaign_condition: 'until_start_course_1000',
    start_course_sales_count: 0,
    start_course_limit: 1000,
  });
  const [priceLoading, setPriceLoading] = useState(true);

  const fetchPriceInfo = useCallback(async () => {
    setPriceLoading(true);
    try {
      const res = await fetch(`/.netlify/functions/get-product-price?product_id=${PRODUCT_ID}`);
      if (res.ok) {
        const data = await res.json();
        setPriceInfo({
          current_price: data.current_price ?? CAMPAIGN_PRICE,
          is_campaign_active: data.is_campaign_active ?? true,
          campaign_price: data.campaign_price ?? CAMPAIGN_PRICE,
          campaign_condition: data.campaign_price_condition ?? 'until_start_course_1000',
          start_course_sales_count: data.start_course_sales_count ?? 0,
          start_course_limit: 1000,
        });
      }
    } catch {
      // フォールバック: キャンペーン価格をデフォルトとして使用
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
        landingPage: '/affiliate-course',
      });
    }
    fetchPriceInfo();
  }, [fetchPriceInfo]);

  const handlePurchase = async () => {
    setCheckoutLoading(true);
    try {
      const tracking = getTrackingData();
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: PRODUCT_ID,
          campaign_id: tracking.campaignId || searchParams.get('campaign'),
          affiliate_code: tracking.ref || searchParams.get('ref'),
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

  const currentPrice = priceInfo.current_price;
  const isCampaign = priceInfo.is_campaign_active;
  const salesCount = priceInfo.start_course_sales_count;
  const remaining = Math.max(0, priceInfo.start_course_limit - salesCount);
  const progress = Math.min(100, (salesCount / priceInfo.start_course_limit) * 100);

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">AIアフィリエイト実践講座</span>
          <button
            onClick={handlePurchase}
            disabled={checkoutLoading || priceLoading}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-5 py-2 rounded-xl transition-all disabled:opacity-50"
          >
            {checkoutLoading ? '処理中...' : `今すぐ申し込む ¥${currentPrice.toLocaleString()}`}
          </button>
        </div>
      </header>

      {/* キャンペーンバナー */}
      {isCampaign && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-center py-2 px-4 text-sm font-bold">
          🎉 期間限定！スタート講座1,000部突破まで特別価格 ¥{CAMPAIGN_PRICE.toLocaleString()}（通常¥{NORMAL_PRICE.toLocaleString()}）
        </div>
      )}

      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 via-blue-950 to-indigo-950 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto">
          {/* タグ */}
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            <span className="bg-orange-500/20 text-orange-300 text-xs font-bold px-3 py-1 rounded-full border border-orange-500/30">
              AIアフィリエイト
            </span>
            <span className="bg-blue-500/20 text-blue-300 text-xs font-bold px-3 py-1 rounded-full border border-blue-500/30">
              実践講座
            </span>
            {isCampaign && (
              <span className="bg-red-500/20 text-red-300 text-xs font-bold px-3 py-1 rounded-full border border-red-500/30">
                ⚡ 特別価格中
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-4 leading-tight">
            AIで<span className="text-orange-400">アフィリエイト収入</span>を<br />
            仕組み化する実践講座
          </h1>
          <p className="text-blue-200 text-center mb-8 text-base md:text-lg max-w-xl mx-auto">
            SNSの投稿からLINE誘導・商品紹介まで、
            AIを使って半自動化する全ノウハウを公開。
            副業初心者でも、受講後すぐに実践できます。
          </p>

          {/* 価格・CTA カード */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 max-w-md mx-auto border border-white/20">
            {priceLoading ? (
              <div className="text-center py-4 text-blue-300 text-sm animate-pulse">価格を読み込み中...</div>
            ) : (
              <>
                {isCampaign && (
                  <div className="mb-4">
                    {/* 販売進捗バー */}
                    <div className="flex justify-between text-xs text-blue-300 mb-1">
                      <span>スタート講座販売数</span>
                      <span className="font-bold text-white">{salesCount.toLocaleString()} / 1,000部</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2.5">
                      <div
                        className="bg-gradient-to-r from-orange-400 to-red-400 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {remaining > 0 ? (
                      <p className="text-xs text-orange-300 mt-1 text-right font-semibold">
                        あと {remaining.toLocaleString()}部で通常価格に戻ります
                      </p>
                    ) : (
                      <p className="text-xs text-blue-300 mt-1 text-right">キャンペーン終了</p>
                    )}
                  </div>
                )}

                <div className="flex items-end gap-3 mb-2">
                  {isCampaign && (
                    <span className="text-gray-400 line-through text-lg">
                      ¥{NORMAL_PRICE.toLocaleString()}
                    </span>
                  )}
                  <span className="text-4xl font-extrabold text-orange-400">
                    ¥{currentPrice.toLocaleString()}
                  </span>
                  <span className="text-blue-300 text-sm mb-1">（税込）</span>
                </div>

                {isCampaign && (
                  <p className="text-xs text-orange-300 mb-4">
                    ※ スタート講座が1,000部突破次第、通常価格（¥{NORMAL_PRICE.toLocaleString()}）に戻ります
                  </p>
                )}

                <button
                  onClick={handlePurchase}
                  disabled={checkoutLoading}
                  className="w-full bg-orange-500 hover:bg-orange-400 text-white font-extrabold py-4 rounded-xl text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {checkoutLoading ? '処理中...' : `今すぐ申し込む（¥${currentPrice.toLocaleString()}）`}
                </button>
                <p className="text-center text-xs text-blue-300 mt-2">Stripe 安全決済 | クレジットカード対応</p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* こんな人におすすめ */}
      <section className="py-14 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            こんな方におすすめ
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: '😅', text: 'アフィリエイトを始めたいが何から手をつければいいかわからない' },
              { icon: '📱', text: 'SNSで発信しているが収益化できていない' },
              { icon: '🤖', text: 'AIを活用した効率的な副業の仕組みを作りたい' },
              { icon: '💸', text: '月5〜10万円の副収入を安定して得たい' },
              { icon: '⏰', text: '本業が忙しく、副業に割ける時間が少ない' },
              { icon: '📈', text: 'すでに取り組んでいるが成果が出ていない' },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm">
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <p className="text-gray-700 text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* カリキュラム */}
      <section className="py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            講座カリキュラム
          </h2>
          <p className="text-center text-gray-500 text-sm mb-8">全8章・動画+テキスト形式</p>
          <div className="space-y-3">
            {[
              { chapter: '第1章', title: 'AIアフィリエイトの全体像と稼ぐ仕組み', desc: 'なぜ今AIアフィリエイトなのか。収益化の流れを図解で理解する' },
              { chapter: '第2章', title: 'SNSで見込み客を集める投稿術', desc: 'AIを使った投稿ネタの作り方・ハッシュタグ戦略・プロフィール最適化' },
              { chapter: '第3章', title: 'LINE公式アカウントへの誘導導線構築', desc: '投稿からLINE登録への最短ルートを設計する' },
              { chapter: '第4章', title: '無料教材で信頼を構築するコンテンツ設計', desc: 'LINE配布コンテンツの企画・作成・配信自動化' },
              { chapter: '第5章', title: '商品紹介のセールスライティング', desc: 'AIを使って成約率の高い紹介文・メッセージを作成する方法' },
              { chapter: '第6章', title: 'アフィリエイトリンクの管理と分析', desc: 'クリック・成約数を追跡し、改善サイクルを回す' },
              { chapter: '第7章', title: '自動化と半自動化の仕組み作り', desc: 'ScheduleやAIツールを活用して、稼働時間を最小化する方法' },
              { chapter: '第8章', title: '紹介制度の活用と収入拡大戦略', desc: 'アフィリエイター登録から報酬管理・スケールアップまで' },
            ].map((item, idx) => (
              <div key={idx} className="flex gap-4 p-4 border border-gray-100 rounded-xl hover:border-orange-200 transition-colors">
                <div className="flex-shrink-0">
                  <span className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded">
                    {item.chapter}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{item.title}</h3>
                  <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 講座で得られること */}
      <section className="py-14 px-4 bg-gradient-to-br from-orange-50 to-yellow-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            受講後に得られるもの
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: '🎯', title: 'アフィリエイト戦略', desc: 'AIツールを使った集客・成約の一気通貫戦略' },
              { icon: '🤖', title: 'AI活用プロンプト集', desc: '投稿・メッセージ・LP作成に使えるプロンプト100選' },
              { icon: '📋', title: '実践ワークシート', desc: '今日から使える導線設計・コンテンツ計画シート' },
              { icon: '💬', title: '90日間サポート権', desc: '質問・フィードバックを90日間受け付け' },
              { icon: '🏆', title: 'コミュニティ参加権', desc: '受講生限定Slackで情報交換・モチベ維持' },
              { icon: '🔗', title: 'アフィリエイター登録権', desc: 'スタート講座購入でアフィリエイター登録申請が可能に' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-5 shadow-sm text-center">
                <span className="text-3xl block mb-3">{item.icon}</span>
                <h3 className="font-bold text-gray-900 text-sm mb-1">{item.title}</h3>
                <p className="text-gray-500 text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 受講ステップ */}
      <section className="py-14 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">受講から収益化までの流れ</h2>
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-orange-100" />
            {[
              { step: '1', title: 'この講座を受講', desc: 'AIアフィリエイトの全体像と実践手順を学ぶ' },
              { step: '2', title: 'SNS・LINEの基盤を構築', desc: '投稿・配信・導線を整備する' },
              { step: '3', title: 'スタート講座へのステップアップ', desc: '本格的なAI副業システム構築に進む' },
              { step: '4', title: 'アフィリエイター登録申請', desc: 'スタート講座受講後、紹介制度に参加できます' },
              { step: '5', title: '紹介活動で報酬獲得', desc: '自分の紹介URLで成約するたびに報酬が発生' },
            ].map((item) => (
              <div key={item.step} className="relative flex gap-5 mb-7 pl-3">
                <div className="flex-shrink-0 w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm z-10">
                  {item.step}
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="font-bold text-gray-900 text-sm">{item.title}</h3>
                  <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 px-4 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">よくある質問</h2>
          <div className="space-y-4">
            {[
              {
                q: 'アフィリエイト初心者でも大丈夫ですか？',
                a: 'はい、大丈夫です。アフィリエイトの基礎から丁寧に解説しているため、初心者の方でも実践できます。'
              },
              {
                q: '特別価格はいつまでですか？',
                a: `AI副業1時間化スタート講座の販売数が1,000部に達するまでの期間限定価格（¥${CAMPAIGN_PRICE.toLocaleString()}）です。1,000部を超えた時点で自動的に通常価格（¥${NORMAL_PRICE.toLocaleString()}）に戻ります。`
              },
              {
                q: 'スタート講座とどう違いますか？',
                a: 'この講座はアフィリエイトに特化した実践講座です。スタート講座はAI副業全般（商品作成・集客・販売）をより深く学ぶ上位講座です。多くの方がこの講座受講後にスタート講座に進んでいます。'
              },
              {
                q: 'アフィリエイター登録はこの講座だけで可能ですか？',
                a: 'いいえ、アフィリエイター登録にはスタート講座の購入が必要です。この講座はアフィリエイトの基礎を学ぶための講座であり、スタート講座の購入後に登録申請ができるようになります。'
              },
              {
                q: '購入後すぐにアクセスできますか？',
                a: 'はい、購入完了後すぐに受講できます。メールにてアクセス情報をお送りします。'
              },
            ].map((item, idx) => (
              <details key={idx} className="bg-white rounded-xl shadow-sm group">
                <summary className="p-4 cursor-pointer font-semibold text-gray-900 text-sm flex items-center justify-between">
                  <span>Q. {item.q}</span>
                  <span className="text-orange-500 text-lg group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-4 pb-4 text-gray-600 text-sm">
                  A. {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 最終CTA */}
      <section className="py-16 px-4 bg-gradient-to-br from-gray-900 to-blue-950 text-white">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">今すぐ受講を始める</h2>
          <p className="text-blue-200 text-sm mb-6">
            {isCampaign
              ? `スタート講座1,000部突破まで特別価格！残り${remaining.toLocaleString()}部です。`
              : '通常価格でご受講いただけます。'}
          </p>

          <div className="bg-white/10 rounded-2xl p-6 mb-6 border border-white/20">
            <div className="flex items-center justify-center gap-4 mb-4">
              {isCampaign && (
                <span className="text-gray-400 line-through text-lg">¥{NORMAL_PRICE.toLocaleString()}</span>
              )}
              <span className="text-4xl font-extrabold text-orange-400">
                ¥{currentPrice.toLocaleString()}
              </span>
            </div>
            <ul className="text-left text-sm space-y-2 mb-4 text-blue-200">
              <li>✅ 全8章・動画+テキスト形式（永久アクセス）</li>
              <li>✅ AI活用プロンプト集100選</li>
              <li>✅ 実践ワークシート付き</li>
              <li>✅ 90日間サポート権</li>
              <li>✅ 受講生限定コミュニティ</li>
            </ul>
            <button
              onClick={handlePurchase}
              disabled={checkoutLoading || priceLoading}
              className="w-full bg-orange-500 hover:bg-orange-400 text-white font-extrabold py-4 rounded-xl text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkoutLoading ? '処理中...' : `今すぐ申し込む（¥${currentPrice.toLocaleString()}）`}
            </button>
            <p className="text-xs text-blue-300 mt-2">Stripe 安全決済 | クレジットカード対応</p>
          </div>

          <p className="text-xs text-blue-400">
            ご不明な点は公式LINEよりお問い合わせください
          </p>
          <div className="mt-4 flex justify-center gap-4 text-xs text-blue-400">
            <Link to="/start-course" className="hover:text-blue-200 underline">
              スタート講座を見る →
            </Link>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-950 text-gray-500 py-8 px-4 text-center text-xs">
        <p>© 2024 AIアフィリエイト実践講座</p>
        <p className="mt-1">本ページはアフィリエイト広告を含む場合があります</p>
        <div className="mt-3 flex justify-center gap-4">
          <a href="#" className="hover:text-gray-300">特定商取引法に基づく表記</a>
          <a href="#" className="hover:text-gray-300">プライバシーポリシー</a>
          <a href="#" className="hover:text-gray-300">利用規約</a>
        </div>
      </footer>
    </div>
  );
}
