// src/pages/lp/LandingPageStartCourse.tsx
// AI副業1時間化スタート講座 — 全面改訂版ランディングページ

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { initializeTracking, recordClick, getTrackingData } from '@/utils/tracking';
import type { ProductPriceInfo } from '@/types';

const PRODUCT_ID = 'a0000000-0000-0000-0000-000000000001';

// ======================================================
// 購入ボタン（共通）
// ======================================================
function PurchaseButton({
  currentPrice,
  checkoutLoading,
  isPriceLoading,
  onClick,
  size = 'lg',
}: {
  currentPrice: number;
  checkoutLoading: boolean;
  isPriceLoading: boolean;
  onClick: () => void;
  size?: 'lg' | 'sm';
}) {
  const base =
    'inline-flex items-center justify-center rounded-2xl font-extrabold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed bg-yellow-400 hover:bg-yellow-300 text-yellow-900 shadow-lg';
  const sizeClass = size === 'lg' ? 'py-5 px-12 text-xl' : 'py-4 px-8 text-lg';
  return (
    <button onClick={onClick} disabled={checkoutLoading || isPriceLoading} className={`${base} ${sizeClass} w-full`}>
      {checkoutLoading ? '処理中...' : isPriceLoading ? '読み込み中...' : `今すぐ購入する（¥${currentPrice.toLocaleString()}）`}
    </button>
  );
}

// ======================================================
// 段階価格バッジ
// ======================================================
function PriceTierBadge({ label, price, active }: { label: string; price: number; active?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2 rounded-xl text-sm ${active ? 'bg-yellow-400 text-yellow-900 font-bold' : 'bg-white/10 text-white/70'}`}>
      <span>{label}</span>
      <span className="font-bold">¥{price.toLocaleString()}</span>
    </div>
  );
}

// ======================================================
// メインコンポーネント
// ======================================================
export function LandingPageStartCourse() {
  const [searchParams] = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [priceInfo, setPriceInfo] = useState<ProductPriceInfo | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);

  const fetchPriceInfo = useCallback(async () => {
    setPriceLoading(true);
    try {
      const res = await fetch(`/.netlify/functions/get-product-price?product_id=${PRODUCT_ID}`);
      if (res.ok) {
        setPriceInfo(await res.json());
      } else {
        setPriceInfo(fallbackPriceInfo());
      }
    } catch {
      setPriceInfo(fallbackPriceInfo());
    } finally {
      setPriceLoading(false);
    }
  }, []);

  function fallbackPriceInfo(): any {
    return {
      product_id: PRODUCT_ID,
      product_name: 'AI副業1時間化スタート講座',
      current_price: 29800,
      current_stripe_price_id: null,
      current_tier: { max_valid_sales_count: 1000 },
      next_tier: { price: 49800 },
      valid_sales_count: 0,
      remaining_until_next_tier: 1000,
      all_tiers: [],
      has_price_tiers: true,
    };
  }

  useEffect(() => {
    const tracking = initializeTracking();
    if (tracking.ref) {
      recordClick({ ref: tracking.ref, campaignId: tracking.campaignId, productId: PRODUCT_ID, landingPage: '/start-course' });
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

  const salesCount = priceInfo?.valid_sales_count ?? 0;
  const currentTier = priceInfo?.current_tier ?? null;
  const nextTier = priceInfo?.next_tier ?? null;
  const currentPrice = priceInfo?.current_price ?? 29800;
  const tierLimit = currentTier?.max_valid_sales_count ?? 1000;
  const remaining = Math.max(0, tierLimit - salesCount);
  const progress = Math.min(100, (salesCount / tierLimit) * 100);
  const isPriceLoading = priceLoading;

  // ターゲット悩み7パターン
  const pains = [
    { emoji: '😓', text: '副業を頑張っているのに売上が出ない' },
    { emoji: '📢', text: '毎日投稿しているのに反応が少ない' },
    { emoji: '🤷', text: '何を売ればいいか分からない' },
    { emoji: '🗺️', text: '自分に合う発信テーマが分からない' },
    { emoji: '🤖', text: 'SNSやAIを使っているのに収益につながらない' },
    { emoji: '😴', text: '作業時間ばかり増えて疲れてしまっている' },
    { emoji: '🚀', text: '副業を始めたいけれど何から始めればいいか分からない' },
  ];

  // 第0〜5章
  const chapters = [
    {
      num: '第0章',
      title: '講座の使い方',
      desc: '動画、ワークシート、GPTs、ToDoアプリを使いながら進める実践型講座であることを解説。まず全体の流れと使い方を把握します。',
      icon: '📖',
    },
    {
      num: '第1章',
      title: '成功者と未達者の思考の違い',
      desc: '収益化する人の考え方に切り替える章。「何を投稿するか」より「誰のどんな悩みを解決するか」を考える土台を作ります。',
      icon: '🧠',
    },
    {
      num: '第2章',
      title: '月10万円を目指すためのルート設計',
      desc: '自分の経験・得意なこと・過去の悩み・誰かに教えられることを整理し、収益化の原石を見つけます。',
      icon: '🗺️',
    },
    {
      num: '第3章',
      title: '収益導線設計',
      desc: 'SNS投稿からLINE・無料コンテンツ・セミナー・商品購入までの流れを作ります。投稿単体でなく、売上につながる導線を設計します。',
      icon: '🔗',
    },
    {
      num: '第4章',
      title: 'AIで副業作業を1時間化',
      desc: 'AIに任せられることと自分がやるべきことを分けます。投稿案・構成・商品アイデア・LINE文・LP文章・ロードマップ作成をAIに手伝ってもらいます。',
      icon: '🤖',
    },
    {
      num: '第5章',
      title: '月10万円に向けたロードマップ作成',
      desc: '今月・今週・今日やることまで分解し、「今日何をすればいいか分からない」状態から抜け出します。',
      icon: '📅',
    },
  ];

  // 4ステップ学習システム
  const steps = [
    { step: '01', icon: '🎬', title: '動画で学ぶ', desc: '考え方・仕組みを動画でインプット。短い動画で要点を押さえます。' },
    { step: '02', icon: '📝', title: 'ワークシートで整理', desc: '自分の情報をワークシートに落とし込み、考えを整理します。' },
    { step: '03', icon: '🤖', title: 'GPTsで壁打ち', desc: 'AIアシスタントと対話しながら、自分に合った答えを引き出します。' },
    { step: '04', icon: '✅', title: 'ToDoアプリで行動化', desc: '今日やることをToDoに落とし込み、迷わず動ける状態にします。' },
  ];

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ============================================================
          ヒーローセクション
          ============================================================ */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white pt-14 pb-20 px-4 relative overflow-hidden">
        {/* 装飾 */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          {/* バッジ */}
          <div className="inline-block bg-yellow-400 text-yellow-900 text-sm font-bold px-5 py-1.5 rounded-full mb-6 shadow">
            📣 副業迷子から抜け出すための設計講座
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-5">
            <span className="text-yellow-400">AI副業1時間化</span><br />
            スタート講座
          </h1>
          <p className="text-lg md:text-xl text-blue-200 max-w-2xl mx-auto mb-4 leading-relaxed">
            努力不足ではなく、<strong className="text-white">設計不足</strong>が原因でした。<br />
            自分に合う収益化の道筋を作り、1日1時間でも迷わず進める実践講座です。
          </p>
          <p className="text-sm text-blue-300 mb-10">
            AIを使うけれど、AIツール紹介がメインではありません。<br />
            SNSを使うけれど、投稿ノウハウだけでもありません。
          </p>

          {/* 段階価格ボックス */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 max-w-md mx-auto text-left border border-white/20">
            {isPriceLoading ? (
              <div className="text-center py-4 text-blue-300 text-sm animate-pulse">読み込み中...</div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-blue-200 text-sm">現在価格</span>
                  <span className="text-3xl font-extrabold text-yellow-400">¥{currentPrice.toLocaleString()}</span>
                </div>

                {nextTier && (
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/20">
                    <div>
                      <span className="text-blue-200 text-sm">次回価格</span>
                      <p className="text-xs text-blue-300 mt-0.5">
                        {(currentTier?.max_valid_sales_count ?? tierLimit).toLocaleString()}部突破後に値上げ
                      </p>
                    </div>
                    <span className="text-xl font-bold text-red-300">¥{nextTier.price.toLocaleString()}</span>
                  </div>
                )}

                {/* 販売進捗バー */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-blue-200">現在販売数</span>
                    <span className="font-bold text-white">{salesCount.toLocaleString()} / {tierLimit.toLocaleString()}部</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-yellow-400 to-orange-400 h-3 rounded-full transition-all duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {nextTier && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-blue-200 text-sm">値上げまで残り</span>
                    <span className="text-xl font-extrabold text-yellow-300">残り{remaining.toLocaleString()}部</span>
                  </div>
                )}
                {!nextTier && currentTier && (
                  <p className="text-xs text-blue-300 mt-2 text-center">※ この価格は最終価格です</p>
                )}
              </>
            )}
          </div>

          <PurchaseButton
            currentPrice={currentPrice}
            checkoutLoading={checkoutLoading}
            isPriceLoading={isPriceLoading}
            onClick={handlePurchase}
          />
          <p className="text-xs text-blue-400 mt-3">🔒 Stripe 安全決済 ｜ 返金保証あり</p>
        </div>
      </section>

      {/* ============================================================
          こんな悩みはありませんか？
          ============================================================ */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 mb-2">
            こんな悩みはありませんか？
          </h2>
          <p className="text-center text-gray-500 text-sm mb-10">副業を頑張っているのに、結果が出ない…</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {pains.map((p) => (
              <div key={p.text} className="flex items-start gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <span className="text-2xl flex-shrink-0 mt-0.5">{p.emoji}</span>
                <p className="text-gray-800 font-medium text-sm leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 bg-blue-600 text-white rounded-2xl p-6 text-center shadow-md">
            <p className="text-lg font-bold mb-2">
              その原因は、<span className="text-yellow-300">努力不足ではなく設計不足</span>です。
            </p>
            <p className="text-sm text-blue-200 leading-relaxed">
              誰に届けるか・何を売るか・どんな導線で購入につなげるかを決めることが、<br />
              副業を収益化するための第一歩です。
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          この講座で得られること
          ============================================================ */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 mb-2">
            この講座で得られること
          </h2>
          <p className="text-center text-gray-500 text-sm mb-10">受講後に整理できる6つのこと</p>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { icon: '👤', title: '自分は誰に向けて発信するか', desc: 'ターゲットが明確になり、刺さる発信ができるようになります。' },
              { icon: '💡', title: 'どんなテーマで発信するか', desc: '自分の強みを収益化できるテーマに変換する方法を習得。' },
              { icon: '📦', title: '何を売るか', desc: '商品アイデアを整理し、最初に作るべき商品を決めます。' },
              { icon: '🔗', title: 'LINEや販売ページにどうつなげるか', desc: 'SNS → LINE → 販売まで、売れる導線の設計ができます。' },
              { icon: '⏰', title: '1日1時間で何をすればいいか', desc: '今日やることが明確になり、迷わず動ける状態になります。' },
              { icon: '📊', title: '今月の目標に向けてどんな順番で動くか', desc: '行動を月・週・日に分解し、ロードマップを完成させます。' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1 text-sm">{item.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          カリキュラム（第0〜5章）
          ============================================================ */}
      <section className="py-16 px-4 bg-gradient-to-b from-blue-50 to-indigo-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 mb-2">
            講座カリキュラム
          </h2>
          <p className="text-center text-gray-500 text-sm mb-10">第0章〜第5章の全6章構成</p>
          <div className="space-y-4">
            {chapters.map((ch, i) => (
              <div
                key={ch.num}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-xl">
                  {ch.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{ch.num}</span>
                    <h3 className="font-bold text-gray-900 text-sm">{ch.title}</h3>
                  </div>
                  <p className="text-gray-500 text-xs leading-relaxed">{ch.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          4ステップ学習システム
          ============================================================ */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 mb-2">
            動画を見るだけで終わらない
          </h2>
          <p className="text-center text-gray-500 text-sm mb-10">4ステップで「知る」を「動く」に変える</p>
          <div className="grid sm:grid-cols-2 gap-5">
            {steps.map((s) => (
              <div key={s.step} className="relative bg-gray-50 rounded-2xl p-6 border border-gray-100 overflow-hidden">
                <div className="absolute top-3 right-4 text-5xl font-extrabold text-gray-100 select-none">{s.step}</div>
                <span className="text-3xl block mb-3">{s.icon}</span>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
            <p className="font-bold mb-1">💡 この講座で大事にしていること</p>
            <p className="leading-relaxed text-xs">
              根性で頑張ることではなく、<strong>仕組みと設計で前に進む</strong>こと。<br />
              何を頑張るかだけでなく、<strong>何を捨てて何に集中するか</strong>も大事にしています。<br />
              まず収益に近い行動に集中する。誰に届けるかを決める → 売るものを決める → 導線を作る → 投稿する → 反応を見る → 改善する。
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          対象者
          ============================================================ */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 mb-10">
            こんな方に向けた講座です
          </h2>
          <div className="space-y-3 max-w-xl mx-auto">
            {[
              '副業初心者で、何から始めればいいか分からない方',
              '副業を始めているけれど、思うように収益化できていない方',
              'SNSやAIを使っているのに、売上につながっていない方',
              '毎日作業しているのに疲れるだけで成果が出ない方',
              '発信テーマや売る商品が決まっていない方',
              'AIを副業に活用したいが、具体的な使い方が分からない方',
            ].map((text) => (
              <div key={text} className="flex items-start gap-3 bg-white rounded-xl p-3.5 shadow-sm border border-gray-100">
                <span className="text-blue-600 font-bold flex-shrink-0">✓</span>
                <p className="text-gray-700 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          価格・段階価格詳細
          ============================================================ */}
      <section className="py-16 px-4 bg-white" id="price">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">受講料</h2>
          <p className="text-gray-500 text-sm mb-8">販売数に応じて価格が上がります。今が一番お得なタイミングです。</p>

          <div className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white rounded-3xl p-8 shadow-2xl">
            <p className="text-sm opacity-80 mb-1">現在価格（税込）</p>
            <p className="text-5xl font-extrabold mb-1 text-yellow-300">
              ¥{isPriceLoading ? '---' : currentPrice.toLocaleString()}
            </p>
            <p className="text-xs opacity-60 mb-6">Stripe 安全決済</p>

            {/* 段階価格表示 */}
            <div className="space-y-2 mb-6">
              <PriceTierBadge label="0〜1,000部" price={29800} active={salesCount < 1000} />
              <PriceTierBadge label="1,001〜10,000部" price={49800} active={salesCount >= 1000 && salesCount < 10000} />
              <PriceTierBadge label="10,001部以降" price={99800} active={salesCount >= 10000} />
            </div>

            {/* 値上げアラート */}
            {nextTier && remaining <= 50 && (
              <div className="bg-red-500/80 rounded-xl p-3 mb-5 text-sm font-semibold">
                ⚠ あと{remaining}部で ¥{nextTier.price.toLocaleString()}に値上がりします！
              </div>
            )}
            {nextTier && remaining > 50 && (
              <div className="bg-white/10 rounded-xl p-3 mb-5 text-sm">
                📈 {(currentTier?.max_valid_sales_count ?? tierLimit).toLocaleString()}部突破後に¥{nextTier.price.toLocaleString()}へ値上がり予定
              </div>
            )}

            {/* 含まれるもの */}
            <ul className="text-left space-y-2 mb-6 text-sm">
              <li className="flex items-center gap-2"><span className="text-yellow-300">✅</span> 講座動画（全6章）</li>
              <li className="flex items-center gap-2"><span className="text-yellow-300">✅</span> 副業設計ワークシート</li>
              <li className="flex items-center gap-2"><span className="text-yellow-300">✅</span> AI活用GPTs（壁打ち用）</li>
              <li className="flex items-center gap-2"><span className="text-yellow-300">✅</span> 行動管理ToDoアプリ</li>
              <li className="flex items-center gap-2"><span className="text-yellow-300">✅</span> 購入者向けLINEサポート</li>
              <li className="flex items-center gap-2"><span className="text-yellow-300">✅</span> アフィリエイター登録権（希望者のみ）</li>
            </ul>

            <PurchaseButton
              currentPrice={currentPrice}
              checkoutLoading={checkoutLoading}
              isPriceLoading={isPriceLoading}
              onClick={handlePurchase}
              size="sm"
            />
            <p className="text-xs opacity-50 mt-3">返金保証あり ｜ 個人情報はStripeで安全に管理</p>
          </div>
        </div>
      </section>

      {/* ============================================================
          この講座を一言でいうと
          ============================================================ */}
      <section className="py-16 px-4 bg-gradient-to-br from-slate-800 to-blue-900 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-blue-300 text-sm mb-4 font-medium">この講座を一言でいうと</p>
          <h2 className="text-2xl md:text-4xl font-extrabold leading-tight mb-6">
            副業初心者がAIを使って、<br />
            自分に合う<span className="text-yellow-400">収益化の道筋</span>を作り、<br />
            1日1時間でも迷わず進める<br />
            <span className="text-yellow-400">実践講座</span>です。
          </h2>
          <p className="text-blue-200 text-sm mb-8 leading-relaxed">
            AIを使うけれど、AIツール紹介がメインではありません。<br />
            SNSを使うけれど、投稿ノウハウだけではありません。<br />
            大事なのは、自分の強みを見つけること。売れるテーマに変えること。<br />
            収益導線を作ること。AIで作業を短縮すること。<br />
            毎日の行動まで落とすこと。この全部をつなげた講座です。
          </p>
          <PurchaseButton
            currentPrice={currentPrice}
            checkoutLoading={checkoutLoading}
            isPriceLoading={isPriceLoading}
            onClick={handlePurchase}
            size="sm"
          />
        </div>
      </section>

      {/* ============================================================
          フッター
          ============================================================ */}
      <footer className="bg-gray-950 text-gray-500 py-10 px-4 text-center text-sm">
        <p className="font-bold text-white mb-1">AI副業1時間化スタート講座</p>
        <p className="text-xs mb-4">副業迷子から抜け出すための設計講座</p>
        <div className="flex justify-center gap-6 text-xs mb-4">
          <a href="/privacy" className="hover:text-white transition-colors">プライバシーポリシー</a>
          <a href="/terms" className="hover:text-white transition-colors">特定商取引法</a>
          <a href="https://lin.ee/TJWaKcD" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">公式LINE</a>
        </div>
        <p className="text-xs">© 2024 AI副業1時間化スタート講座 ｜ 本ページはアフィリエイト広告を含みます</p>
      </footer>
    </div>
  );
}
