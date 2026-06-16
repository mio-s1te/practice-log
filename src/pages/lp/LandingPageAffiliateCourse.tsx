// src/pages/lp/LandingPageAffiliateCourse.tsx
// プロAIアフィリエイター養成講座 ランディングページ（購入前LP）

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { initializeTracking, recordClick, getTrackingData } from '@/utils/tracking';

const PRODUCT_ID = 'a0000000-0000-0000-0000-000000000003';  // 養成講座
const START_COURSE_PRODUCT_ID = 'a0000000-0000-0000-0000-000000000001';  // スタート講座（プログレスバー用）
const NORMAL_PRICE = 99800;
const CAMPAIGN_PRICE = 4980;
const START_COURSE_LIMIT = 1000;  // スタート講座1,000部でプロジェクト終了

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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const fetchPriceInfo = useCallback(async () => {
    setPriceLoading(true);
    try {
      // 養成講座の価格を取得（養成講座自身の販売数でtier判定）
      const [affiliateRes, startRes] = await Promise.all([
        fetch(`/.netlify/functions/get-product-price?product_id=${PRODUCT_ID}`),
        fetch(`/.netlify/functions/get-product-price?product_id=${START_COURSE_PRODUCT_ID}`),
      ]);

      let currentPrice = CAMPAIGN_PRICE;
      let isCampaignActive = true;

      if (affiliateRes.ok) {
        const data = await affiliateRes.json();
        currentPrice = data.current_price ?? CAMPAIGN_PRICE;
        // キャンペーン中 = 通常価格より安い
        isCampaignActive = currentPrice < NORMAL_PRICE;
      }

      // スタート講座の販売数（プログレスバー表示用）
      let startCourseSalesCount = 0;
      if (startRes.ok) {
        const startData = await startRes.json();
        startCourseSalesCount = startData.valid_sales_count ?? 0;
        // スタート講座が1,000部達成したらプロジェクト終了
        if (startCourseSalesCount >= START_COURSE_LIMIT) {
          isCampaignActive = false;
        }
      }

      setPriceInfo({
        current_price: currentPrice,
        is_campaign_active: isCampaignActive,
        campaign_price: CAMPAIGN_PRICE,
        campaign_condition: 'until_start_course_1000',
        start_course_sales_count: startCourseSalesCount,
        start_course_limit: START_COURSE_LIMIT,
      });
    } catch { /* fallback */ }
    finally { setPriceLoading(false); }
  }, []);

  useEffect(() => {
    const tracking = initializeTracking();
    if (tracking.ref) {
      recordClick({ ref: tracking.ref, campaignId: tracking.campaignId, productId: PRODUCT_ID, landingPage: '/affiliate-course' });
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
          affiliate_code: tracking.ref || searchParams.get('ref') || null,
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
    } finally { setCheckoutLoading(false); }
  };

  const currentPrice = priceInfo.current_price;
  const isCampaign = priceInfo.is_campaign_active;
  const salesCount = priceInfo.start_course_sales_count;
  const remaining = Math.max(0, priceInfo.start_course_limit - salesCount);
  const progress = Math.min(100, (salesCount / priceInfo.start_course_limit) * 100);

  // 購入ボタンラベルを現在価格に連動させる
  const priceLabel = priceLoading ? '...' : `¥${currentPrice.toLocaleString()}で参加する`;

  const PurchaseBtn = ({ label, size = 'lg' }: { label?: string; size?: 'sm' | 'lg' }) =>
    size === 'lg' ? (
      <button onClick={handlePurchase} disabled={checkoutLoading || priceLoading}
        className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-extrabold py-5 rounded-2xl text-lg transition-all shadow-lg shadow-orange-200 disabled:opacity-50">
        {checkoutLoading ? '処理中...' : (label || 'プロジェクト初期メンバー価格で参加する')}
      </button>
    ) : (
      <button onClick={handlePurchase} disabled={checkoutLoading || priceLoading}
        className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50">
        {checkoutLoading ? '処理中...' : (label || priceLabel)}
      </button>
    );

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", backgroundColor: '#fffaf5' }}>

      {/* ── 固定ヘッダー ── */}
      <header style={{ backgroundColor: 'rgba(255,250,245,0.96)', backdropFilter: 'blur(8px)' }}
        className="sticky top-0 z-50 border-b border-orange-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-gray-800 leading-tight">プロAIアフィリエイター<br className="sm:hidden" />養成講座</span>
          <PurchaseBtn size="sm" />
        </div>
      </header>

      {/* ── キャンペーンバー ── */}
      {isCampaign && (
        <div className="bg-orange-500 text-white text-center py-2 px-4 text-xs font-bold">
          🎉 スタート講座1,000部達成プロジェクト限定 ｜ 先着30名 ¥4,980（通常¥99,800）
        </div>
      )}

      {/* ══════════════════════════════════
          1. ファーストビュー
      ══════════════════════════════════ */}
      <section style={{ background: 'linear-gradient(135deg, #fff8f0 0%, #fff3e0 50%, #fff8f0 100%)' }}
        className="py-14 px-4">
        <div className="max-w-2xl mx-auto">

          {/* ラベル */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full border border-orange-200">
              📌 スタート講座1,000部達成プロジェクト限定
            </span>
            <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full border border-red-200">
              先着30名 ¥4,980
            </span>
          </div>

          {/* メインコピー */}
          <h1 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 leading-snug mb-4">
            紹介リンクを貼るだけで終わらせない。<br />
            <span style={{ color: '#ea6500' }}>成約される理由を作れる人になる。</span>
          </h1>

          {/* サブコピー */}
          <p className="text-center text-gray-600 text-sm md:text-base mb-3 leading-relaxed">
            1日1時間、14日間。<br />
            用意されたシートに記入しながら、<br className="hidden md:block" />
            案件に振り回されない紹介導線を作ります。
          </p>
          <p className="text-center text-gray-500 text-xs md:text-sm mb-8 leading-relaxed max-w-lg mx-auto">
            売り込みではなく、必要な人に届く紹介へ。<br />
            難しい作業を一気にやるのではなく、Dayごとに分けて進める講座です。
          </p>

          {/* 価格カード */}
          <div className="bg-white rounded-3xl shadow-lg shadow-orange-100 border border-orange-100 p-6 max-w-md mx-auto">
            {priceLoading ? (
              <div className="text-center py-4 text-orange-400 text-sm animate-pulse">価格を読み込み中...</div>
            ) : (
              <>
                {/* 販売進捗バー */}
                {isCampaign && (
                  <div className="mb-5">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>📚 スタート講座販売数</span>
                      <span className="font-bold text-gray-700">{salesCount.toLocaleString()} / 1,000部</span>
                    </div>
                    <div className="w-full bg-orange-100 rounded-full h-3">
                      <div className="h-3 rounded-full transition-all duration-700"
                        style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #f97316, #ea580c)' }} />
                    </div>
                    <p className="text-xs text-orange-500 mt-1.5 text-right font-semibold">
                      {remaining > 0 ? `あと ${remaining.toLocaleString()}部で通常価格に移行` : 'キャンペーン終了間近'}
                    </p>
                  </div>
                )}

                {/* 価格表示 */}
                <div className="mb-4">
                  <p className="text-xs text-gray-400 line-through text-center mb-1">通常価格 ¥{NORMAL_PRICE.toLocaleString()}</p>
                  <p className="text-center text-xs font-bold text-orange-600 mb-1">↓ プロジェクト初期メンバー価格</p>
                  <div className="flex items-end justify-center gap-2 my-1">
                    <span className="text-5xl font-extrabold" style={{ color: '#ea6500' }}>¥{currentPrice.toLocaleString()}</span>
                    <span className="text-sm text-gray-500 mb-2">（税込）</span>
                  </div>
                  <p className="text-center text-xs font-bold text-red-500 mb-3">先着30名かつプロジェクト期間中のみ</p>

                  {/* 価格移行表 */}
                  <div className="bg-orange-50 rounded-xl p-3 mb-4 text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-orange-600">🟠 現在（先着30名）</span>
                      <span className="font-extrabold text-orange-600 text-sm">¥4,980</span>
                    </div>
                    <div className="flex justify-between"><span className="text-gray-400">30名到達後</span><span>¥9,800</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">プロジェクト終了後</span><span>¥99,800</span></div>
                  </div>
                </div>

                <PurchaseBtn label={`${priceLabel}でプロジェクト参加する`} />
                <p className="text-center text-xs text-gray-400 mt-2">Stripe 安全決済 ｜ クレジットカード対応</p>
                <p className="text-center text-xs text-gray-400 mt-1">
                  ※スタート講座1,000部達成またはプロジェクト終了のどちらか早い時点で価格が変わります
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          2. こんな悩みはありませんか？
      ══════════════════════════════════ */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-bold text-orange-500 mb-2 tracking-widest">PROBLEMS</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 mb-8">
            こんな悩みはありませんか？
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: '😵', text: 'アフィリエイトを始めたいけど、何から手をつければいいかわからない' },
              { icon: '🤔', text: 'どの案件を選べばいいかわからず、なんとなく紹介している' },
              { icon: '📱', text: 'SNSで発信しているのに、収益につながっていない' },
              { icon: '😅', text: '商品紹介が売り込みっぽくなってしまう' },
              { icon: '😔', text: '使っていない商品を紹介することに罪悪感がある' },
              { icon: '📉', text: '投稿してもクリックや登録につながらない' },
              { icon: '🤖', text: 'AIを使って効率化したいけど、何に使えばいいかわからない' },
              { icon: '🔗', text: '紹介リンクを貼るだけで終わっていて、導線が作れていない' },
            ].map((item) => (
              <div key={item.text}
                className="flex items-start gap-3 bg-orange-50 border border-orange-100 rounded-2xl p-4">
                <span className="text-2xl flex-shrink-0 mt-0.5">{item.icon}</span>
                <p className="text-gray-700 text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <div className="inline-block bg-orange-100 rounded-2xl px-6 py-4 max-w-md">
              <p className="text-orange-700 font-bold text-sm">この講座は、その悩みに正面から向き合います。</p>
              <p className="text-orange-600 text-xs mt-1">
                紹介リンクを貼るだけで終わらせず、<br />
                案件に振り回されない紹介導線を一緒に作っていきます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          3. 講座で進めること
      ══════════════════════════════════ */}
      <section className="py-14 px-4" style={{ background: 'linear-gradient(135deg, #fff8f0, #fff3e0)' }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-bold text-orange-500 mb-2 tracking-widest">WHAT YOU'LL DO</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 mb-2">
            講座で進めること
          </h2>
          <p className="text-center text-gray-500 text-sm mb-8">
            用意されたシートに記入しながら、Dayごとに順番に進みます。<br />
            難しい作業を一気にやるのではなく、1日ずつ積み上げます。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: '🅰️', title: 'ASP垢を作る', desc: '比較・選び方・紹介で初報酬を狙うアカウントを設計します' },
              { icon: '🅱️', title: 'ビジ垢を作る', desc: '共感・信頼・無料プレゼント・自然な案内でコンテンツ紹介につなげるアカウントを設計します' },
              { icon: '📋', title: '案件を整理する', desc: '用意されたシートに、初報酬案件・本命案件・代替案件を整理します' },
              { icon: '📝', title: '投稿を記録して改善する', desc: '投稿の目的・CTA・反応を記録して、次の投稿改善に使います' },
              { icon: '📊', title: '導線の流れを確認する', desc: '日別・導線別にクリックや登録の流れを確認します' },
              { icon: '🌐', title: '紹介ページを作る', desc: 'SNS投稿から案件ページへ自然につなげる紹介ページを作ります' },
              { icon: '🎁', title: '無料プレゼントを作る', desc: '信頼を積み上げ、必要な人だけ次へ進める入口を準備します' },
              { icon: '🗓️', title: '次の14日計画を作る', desc: '講座が終わった後も迷わず動ける投稿・改善計画を作ります' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-5 shadow-sm border border-orange-50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{item.icon}</span>
                  <h3 className="font-bold text-gray-900 text-sm">{item.title}</h3>
                </div>
                <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          4. 講座の使い方
      ══════════════════════════════════ */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-bold text-orange-500 mb-2 tracking-widest">HOW TO USE</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 mb-2">
            動画を見るだけで終わらせない。<br />1日1時間、手を動かす講座です。
          </h2>
          <p className="text-center text-gray-500 text-sm mb-8">
            難しい作業を一気にやるのではなく、Dayごとに分けて進めます。<br />
            動画は章ごとに見て、その他の日は行動中心で進めます。
          </p>

          <div className="flex flex-col items-center gap-0 max-w-xs mx-auto mb-8">
            {[
              { icon: '🎬', label: '動画を見る（章ごと）' },
              { icon: '📋', label: '用意されたシートに記入する' },
              { icon: '🤖', label: 'GPTsを使いながら作業を進める' },
              { icon: '✍️', label: '投稿・紹介ページ・導線を整える' },
              { icon: '📈', label: '数字を見て次の行動を決める' },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl px-8 py-3 text-center">
                  <span className="text-xl mr-2">{step.icon}</span>
                  <span className="font-bold text-gray-800 text-sm">{step.label}</span>
                </div>
                {i < 4 && <div className="text-orange-300 text-xl my-1">↓</div>}
              </div>
            ))}
          </div>

          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 text-sm text-gray-700 leading-relaxed">
            <p className="font-bold text-orange-700 mb-2">🎯 この講座のスタンス</p>
            <p>「導線を完成させてから売る」ではなく、<br />
            「<strong>初報酬を狙いながら、同時に導線も整える</strong>」講座です。</p>
            <p className="mt-2">Day3から実際に動き始め、<strong>Day5で初報酬を本気で狙います。</strong></p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          5. 5章構成
      ══════════════════════════════════ */}
      <section className="py-14 px-4" style={{ background: 'linear-gradient(135deg, #fff8f0, #fff3e0)' }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-bold text-orange-500 mb-2 tracking-widest">CURRICULUM</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 mb-8">5章構成</h2>
          <div className="space-y-3">
            {[
              { ch: '第0章', title: '使い方と準備', desc: '講座の進め方、必要なもの、シートとGPTsの使い方を確認します。' },
              { ch: '第1章', title: '市場と2アカウント設計', desc: 'ジャンルを仮決めし、ASP垢とビジ垢を設計・作成します。' },
              { ch: '第2章', title: '初報酬チャレンジ導線', desc: 'ASP登録、案件提携、リンク取得、紹介LP作成、Day5の初報酬チャレンジを進めます。' },
              { ch: '第3章', title: 'ビジ垢と信頼の入口', desc: '無料プレゼント、ビジ垢投稿、必要な人だけ次へ進む入口を作ります。' },
              { ch: '第4章', title: '本命案件と安定した導線', desc: '本命案件・代替案件・あなたから申し込む理由を作り、案件が変わっても動ける導線へ整えます。' },
              { ch: '第5章', title: '改善分析と次の14日計画', desc: '投稿・クリック・紹介LP・CTAを見て改善し、講座後も迷わず動ける計画を作ります。' },
            ].map((item) => (
              <div key={item.ch} className="flex gap-4 bg-white rounded-2xl p-4 shadow-sm border border-orange-50">
                <div className="flex-shrink-0">
                  <span className="inline-block bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg">{item.ch}</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{item.title}</h3>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          6. 14日ロードマップ
      ══════════════════════════════════ */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-bold text-orange-500 mb-2 tracking-widest">ROADMAP</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 mb-2">14日ロードマップ</h2>
          <p className="text-center text-gray-500 text-sm mb-8">
            順番があるから、進められる。<br />今日やることがはっきりしているから、迷いません。
          </p>
          <div className="relative pl-8">
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-orange-100" />
            {[
              { day: 'Day 1', time: '60分', title: '売れる市場の入口を決める', desc: 'ジャンル候補3つ・初報酬案件候補3つを選ぶ', highlight: false },
              { day: 'Day 2', time: '60分', title: '2つの発信アカウントを作る', desc: 'ASP垢・ビジ垢の設計と作成', highlight: false },
              { day: 'Day 3', time: '60分', title: '最初の発信を始める', desc: 'ASP登録・案件整理・見込み客分析・両アカウント初投稿', highlight: false, badge: '🚀 ここから動き出す' },
              { day: 'Day 4', time: '60分', title: '紹介ページを作る', desc: '案件提携・リンク取得・紹介LP作成', highlight: false },
              { day: 'Day 5', time: '60分', title: '初報酬チャレンジ', desc: 'ASP垢で投稿・コメント・CTA改善', highlight: true, badge: '🔥 初報酬を狙う日' },
              { day: 'Day 6', time: '45〜60分', title: '反応から導線タイプを決める', desc: '投稿反応・クリック・プロフィール導線を確認', highlight: false },
              { day: 'Day 7', time: '60分', title: 'ASP垢の成約導線を強くする', desc: '比較表・紹介LP改善・投稿', highlight: false },
              { day: 'Day 8', time: '60分', title: 'ビジ垢の入口を作る', desc: '無料プレゼント作成', highlight: false },
              { day: 'Day 9', time: '60分', title: 'ビジ垢から信頼導線を作る', desc: '無料プレゼント・初回メッセージ・ビジ垢投稿', highlight: false },
              { day: 'Day 10', time: '60分', title: '収益の柱を広げる', desc: '本命案件・代替案件を選ぶ', highlight: false },
              { day: 'Day 11', time: '60分', title: 'あなたから申し込む理由を作る', desc: '特典・不安Q&A・向いている人/向いていない人を整理', highlight: false },
              { day: 'Day 12', time: '45〜60分', title: '案件停止に強い導線へ整える', desc: '1案件依存から抜ける導線チェック', highlight: false },
              { day: 'Day 13', time: '60分', title: '数字を見て改善する', desc: '投稿・クリック・紹介LP・CTAの見直し', highlight: false },
              { day: 'Day 14', time: '45〜60分', title: '次の14日計画を作る', desc: '講座後も迷わず動ける投稿・改善計画', highlight: false },
            ].map((item, i) => (
              <div key={i} className="relative mb-4">
                <div className={`absolute -left-8 top-3 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 ${item.highlight ? 'bg-red-500 text-white scale-125' : 'bg-orange-400 text-white'}`}>
                  {i + 1}
                </div>
                <div className={`rounded-2xl p-4 border ${item.highlight
                  ? 'bg-red-50 border-red-200 shadow-md'
                  : 'bg-orange-50 border-orange-100'}`}>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-extrabold ${item.highlight ? 'text-red-600' : 'text-orange-600'}`}>{item.day}</span>
                    <span className="text-xs text-gray-400">（{item.time}）</span>
                    {item.badge && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.highlight ? 'bg-red-500 text-white' : 'bg-orange-200 text-orange-700'}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <h3 className={`font-bold text-sm ${item.highlight ? 'text-red-700' : 'text-gray-900'}`}>{item.title}</h3>
                  <p className="text-xs text-gray-600 mt-0.5">{item.desc}</p>
                  {item.highlight && (
                    <p className="text-xs text-red-600 font-bold mt-1">初報酬を狙いながら、同時に導線も整える日です。</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          7. ジャンルと案件探し
      ══════════════════════════════════ */}
      <section className="py-14 px-4" style={{ background: 'linear-gradient(135deg, #fff8f0, #fff3e0)' }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-bold text-orange-500 mb-2 tracking-widest">NICHE STRATEGY</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 mb-2">
            ジャンルは「稼げそう」<br className="sm:hidden" />だけで決めません。
          </h2>
          <p className="text-center text-gray-500 text-sm mb-8">
            助けたい人・発信しやすい悩み・案件の有無・横展開できるかを見てジャンルを決めます。
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { step: '1', icon: '👤', label: '助けたい人を決める' },
              { step: '2', icon: '💬', label: '発信しやすい悩みを選ぶ' },
              { step: '3', icon: '🔍', label: '楽天・ASP・講座案件があるか見る' },
              { step: '4', icon: '🌐', label: '本命・代替・将来案件に広げられるか確認' },
            ].map((s) => (
              <div key={s.step} className="bg-white rounded-2xl p-3 text-center shadow-sm border border-orange-100">
                <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-2">{s.step}</div>
                <span className="text-xl block mb-1">{s.icon}</span>
                <p className="text-xs text-gray-700 font-medium leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
            <p className="font-bold mb-1">⚠️ 案件が1つだけのジャンルには注意</p>
            <p>案件は停止・変更されることがあります。この講座では、初報酬案件リストを使いながら最初の一歩を選びやすくします。最終確認は各ASP管理画面で行います。</p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          8. 実践で迷わない視点
      ══════════════════════════════════ */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-bold text-orange-500 mb-2 tracking-widest">PRACTICAL INSIGHTS</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 mb-2">
            ただのノウハウではなく、<br />実践で迷わない視点まで学べます。
          </h2>
          <p className="text-center text-gray-500 text-sm mb-8 max-w-lg mx-auto">
            この講座では、案件の選び方や投稿文だけでなく、<br />
            実際に手を動かしたときに迷いやすいポイントも扱います。
          </p>
          <div className="grid grid-cols-1 gap-3 mb-6">
            {[
              '投稿が思うように反応されないとき、どこを見直すのか',
              '1投稿に頼らず、導線全体で収益化に近づける考え方',
              '商品を売り込まず、自然に必要性を高める紹介の順番',
              '案件が変わっても慌てないための市場と導線の見方',
              'AIに文章を書かせるだけで終わらせない使い方',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 bg-orange-50 rounded-2xl p-4 border border-orange-100">
                <span className="text-orange-400 font-extrabold text-base flex-shrink-0 mt-0.5">✓</span>
                <p className="text-gray-700 text-sm">{item}</p>
              </div>
            ))}
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 text-center">
            <p className="text-sm text-gray-700 leading-relaxed">
              売り込みではなく、<strong>必要な人に届く紹介へ。</strong><br />
              そのための視点と実践の順番を、この講座で身につけます。
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          9. バズるかどうかに振り回されない導線
      ══════════════════════════════════ */}
      <section className="py-14 px-4" style={{ background: 'linear-gradient(135deg, #fff8f0, #fff3e0)' }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-bold text-orange-500 mb-2 tracking-widest">FUNNEL DESIGN</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 mb-4">
            バズるかどうかに<br />振り回されない導線を作る。
          </h2>

          <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm mb-6">
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              SNSでは、1つの投稿が大きく伸びるかどうかだけで判断しません。
            </p>
            <p className="text-sm font-bold text-gray-800 mb-3">大事なのは、投稿を見た人が、</p>
            <div className="space-y-2 mb-4">
              {[
                '「これ私のことかも」',
                '「もう少し詳しく知りたい」',
                '「この人の紹介なら見てみたい」',
              ].map((text) => (
                <div key={text} className="flex items-center gap-2 bg-orange-50 rounded-xl px-4 py-2">
                  <span className="text-orange-400 font-bold">💭</span>
                  <p className="text-sm font-bold text-gray-700">{text}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              と思える流れを作ることです。<br /><br />
              この講座では、投稿、プロフィール、固定投稿、紹介ページ、無料プレゼントを組み合わせて、必要な人が自然に次へ進める導線を整えていきます。
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: '📌', text: '1投稿で当てにいくのではなく、導線全体で収益化に近づける' },
              { icon: '🔗', text: '複数の投稿で、悩みの言語化・選び方・紹介の流れを整える' },
              { icon: '👤', text: 'プロフィールと固定投稿で、次に見る場所を迷わせない' },
              { icon: '📍', text: '紹介ページで、SNSから案件へ自然につなぐ' },
              { icon: '💡', text: 'クリックされないときは、導線のどこが弱いかを仮説で改善する' },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-3 bg-white rounded-2xl p-4 border border-orange-100 shadow-sm">
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <p className="text-gray-700 text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          10. 受講後に得られるもの
      ══════════════════════════════════ */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-bold text-orange-500 mb-2 tracking-widest">CONTENTS</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 mb-8">受講後に得られるもの</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 本編 */}
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
              <h3 className="font-bold text-orange-700 text-sm mb-3">📚 講座本編</h3>
              <ul className="space-y-1.5">
                {['5章構成の講座本編', '14日実践ロードマップ'].map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs text-gray-700">
                    <span className="text-orange-400 font-bold mt-0.5">✓</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            {/* シート類 */}
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
              <h3 className="font-bold text-orange-700 text-sm mb-3">📋 実践シート（14種）</h3>
              <p className="text-xs text-gray-500 mb-2">作るのではなく、記入して進めます</p>
              <ul className="space-y-1.5">
                {[
                  'Day1〜14進行シート（今日やることをチェックしながら進める）',
                  '案件管理シート',
                  '投稿管理シート',
                  'クリック管理シート',
                  'SNSアカウント設計シート',
                  'LP管理シート、LINE導線管理シート 他',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs text-gray-700">
                    <span className="text-orange-400 font-bold mt-0.5">✓</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            {/* GPTs */}
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
              <h3 className="font-bold text-orange-700 text-sm mb-3">🤖 GPTs（6種）</h3>
              <ul className="space-y-1.5">
                {[
                  'ジャンル診断GPTs',
                  '案件チェックGPTs',
                  'アカウント設計GPTs',
                  '投稿作成GPTs',
                  'LP生成GPTs',
                  '改善分析GPTs',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs text-gray-700">
                    <span className="text-orange-400 font-bold mt-0.5">✓</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            {/* 補講 */}
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
              <h3 className="font-bold text-orange-700 text-sm mb-3">🎁 補講</h3>
              <ul className="space-y-1.5">
                {[
                  '補講：スタート講座をコンテンツアフィリエイトする方法',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs text-gray-700">
                    <span className="text-orange-400 font-bold mt-0.5">✓</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          11. 購入者限定追加コンテンツ
      ══════════════════════════════════ */}
      <section className="py-14 px-4" style={{ background: 'linear-gradient(135deg, #fff8f0, #fff3e0)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-md border border-orange-100 p-6 md:p-8">
            <p className="text-xs font-bold text-orange-500 mb-1 tracking-widest">BONUS CONTENTS</p>
            <h2 className="text-lg md:text-xl font-extrabold text-gray-900 mb-1">
              購入者限定追加コンテンツ
            </h2>
            <p className="text-sm text-orange-600 font-bold mb-4">裏ルート実践パック｜Day15以降、私ならこう伸ばす。</p>
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              講座本編を一通り進めたあと、さらに導線を伸ばしたい方向けに、購入者限定の追加コンテンツも用意しています。
            </p>
            <div className="bg-orange-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-orange-700 mb-2">こんな視点が学べます</p>
              <ul className="space-y-1">
                {[
                  'Day15以降の実践ロードマップ',
                  'GPTsの応用活用',
                  'バズに頼らない導線設計',
                  '投稿・紹介LP・導線の改善視点',
                  '本編に入りきらなかった実践のコツ',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs text-gray-700">
                    <span className="text-orange-400 font-bold">✓</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          12. スタート講座との差別化
      ══════════════════════════════════ */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-bold text-orange-500 mb-2 tracking-widest">COMPARISON</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 mb-8">
            スタート講座との違い
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
              <p className="text-xs font-bold text-gray-500 mb-1">スタート講座</p>
              <h3 className="font-bold text-gray-800 text-sm mb-2">自分の副業ルートを見つける講座</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                自分の強み、やりたいこと、生活時間、収益ルート、導線設計が中心。
              </p>
            </div>
            <div className="bg-orange-50 rounded-2xl p-5 border border-orange-200">
              <p className="text-xs font-bold text-orange-500 mb-1">プロAIアフィリエイター養成講座</p>
              <h3 className="font-bold text-gray-800 text-sm mb-2">市場と案件を攻略して、他人の商品を売れるようになる講座</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                市場選定、案件ポートフォリオ、見込み客心理、紹介導線、改善分析が中心。
              </p>
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 text-center">
            <p className="text-sm text-gray-700 leading-relaxed">
              スタート講座では<strong>「自分の稼ぎ方」</strong>を作ります。<br />
              プロAIアフィリエイター養成講座では<strong>「他人の商品を売る力」</strong>を作ります。
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          13. 補講：スタート講座紹介
      ══════════════════════════════════ */}
      <section className="py-14 px-4" style={{ background: 'linear-gradient(135deg, #fff8f0, #fff3e0)' }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-bold text-orange-500 mb-2 tracking-widest">SUPPLEMENT</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 mb-6">
            補講：スタート講座をコンテンツアフィリエイトする方法
          </h2>
          <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm mb-4">
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              この講座では、ASPや楽天だけでなく、コンテンツアフィリエイトの実践例として、スタート講座を紹介する方法も補講で扱います。
            </p>
            <div className="space-y-2 mb-4">
              {[
                '補講：実践用案件としてスタート講座を紹介する場合',
                '補講：紹介リンク・禁止表現・素材・報酬条件',
              ].map(item => (
                <div key={item} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-orange-400 font-bold">▷</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
              <p><strong>参加条件：</strong>スタート講座購入者のみ</p>
              <p><strong>制度：</strong>スタート講座の販売が1,000部に到達するまでの限定制度</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center">
            ※絶対稼げる・誰でも必ず稼げる・放置で稼げるなどの表現は禁止です。<br />
            必要な人に正しく届けることを大切にします。
          </p>
          <div className="mt-4 text-center">
            <a href="https://melodic-pony-33c4e9.netlify.app/" target="_blank" rel="noopener noreferrer"
              className="text-sm text-orange-500 underline">スタート講座のページを見る →</a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          14. 中級編の示唆
      ══════════════════════════════════ */}
      <section className="py-10 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
            <p className="text-xs font-bold text-gray-400 mb-2 tracking-widest">NEXT STEP（予告）</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              この講座では、まず初報酬を狙う導線、2アカウントの土台作り、案件が変わっても使える安定した導線を作ります。<br /><br />
              オプチャ運営、YouTube本格運用、SEOブログ、クローズドASP、特単交渉、外注化などは<strong>中級編で扱う予定</strong>です。
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          15. 価格セクション
      ══════════════════════════════════ */}
      <section className="py-14 px-4" style={{ background: 'linear-gradient(135deg, #fff8f0, #fff3e0)' }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-bold text-orange-500 mb-2 tracking-widest">PRICING</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 mb-6">プロジェクト初期メンバー価格</h2>
          <div className="bg-white rounded-3xl shadow-lg border border-orange-100 p-6 md:p-8 mb-6">
            <p className="text-sm text-gray-700 leading-relaxed mb-5">
              プロAIアフィリエイター養成講座の通常価格は<strong>¥99,800</strong>です。<br /><br />
              現在は、スタート講座1,000部達成プロジェクトの初期メンバー募集として、プロジェクト期間中のみ特別価格で公開しています。<br /><br />
              未完成だから安いのではなく、スタート講座を紹介できる実践者を増やし、アフィリエイト実践者の成功事例を一緒に作っていくための特別価格です。
            </p>

            {/* 価格表 */}
            <div className="rounded-2xl overflow-hidden border border-orange-100 mb-5">
              <div className="bg-orange-500 text-white px-4 py-2 text-xs font-bold text-center">価格移行スケジュール</div>
              {[
                { range: '先着30名かつプロジェクト期間中', price: '¥4,980', current: true },
                { range: '31〜100名かつプロジェクト期間中', price: '¥9,800', current: false },
                { range: '101〜300名かつプロジェクト期間中', price: '¥29,800', current: false },
                { range: '301名以降かつプロジェクト期間中', price: '¥49,800', current: false },
                { range: 'プロジェクト終了後', price: '¥99,800', current: false },
              ].map((row) => (
                <div key={row.range} className={`flex justify-between items-center px-4 py-3 text-sm border-b border-orange-50 last:border-b-0 ${row.current ? 'bg-orange-50 font-bold' : ''}`}>
                  <span className={row.current ? 'text-orange-700' : 'text-gray-500 text-xs'}>{row.current && '🟠 '}{row.range}</span>
                  <span className={row.current ? 'text-orange-600 text-lg font-extrabold' : 'text-gray-600'}>{row.price}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mb-5">
              ※各価格帯は、人数到達またはプロジェクト終了のどちらか早い時点で終了します。
            </p>

            {/* 販売進捗 */}
            {isCampaign && !priceLoading && (
              <div className="mb-5">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>📚 スタート講座販売数</span>
                  <span className="font-bold text-gray-700">{salesCount.toLocaleString()} / 1,000部</span>
                </div>
                <div className="w-full bg-orange-100 rounded-full h-3">
                  <div className="h-3 rounded-full transition-all"
                    style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #f97316, #ea580c)' }} />
                </div>
                <p className="text-xs text-orange-500 mt-1 text-right font-semibold">
                  あと {remaining.toLocaleString()}部でプロジェクト終了
                </p>
              </div>
            )}

            <PurchaseBtn label={`${priceLabel}でプロジェクト参加する`} />
            <p className="text-center text-xs text-gray-400 mt-2">Stripe 安全決済 ｜ クレジットカード対応</p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          16. 購入後の流れ
      ══════════════════════════════════ */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-bold text-orange-500 mb-2 tracking-widest">AFTER PURCHASE</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 mb-4">購入後の流れ</h2>
          <p className="text-center text-sm text-gray-600 mb-8">
            購入後は、購入後ページにて講座の受け取り方法を案内します。
          </p>
          <div className="space-y-3 max-w-sm mx-auto mb-6">
            {[
              { step: '1', text: '決済完了' },
              { step: '2', text: '購入後ページへ移動' },
              { step: '3', text: 'メールアドレスを登録' },
              { step: '4', text: '購入者限定LINEの案内を確認' },
              { step: '5', text: '購入者確認後、講座URLを受け取り' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-4 bg-orange-50 rounded-2xl px-5 py-3.5 border border-orange-100">
                <span className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">{item.step}</span>
                <p className="text-sm text-gray-700">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-center">
            <p className="text-xs text-gray-500">
              講座URLの受け取りには、購入時メールアドレスの登録が必要です。<br />
              詳しい受け取り方法は購入後ページで案内します。
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          17. FAQ
      ══════════════════════════════════ */}
      <section className="py-14 px-4" style={{ background: 'linear-gradient(135deg, #fff8f0, #fff3e0)' }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-bold text-orange-500 mb-2 tracking-widest">FAQ</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 mb-8">よくある質問</h2>
          <div className="space-y-3">
            {[
              {
                q: 'アフィリエイト初心者でも大丈夫ですか？',
                a: 'はい。ASP登録、案件選び、投稿作成、紹介LP作成、改善まで、Day1〜14の流れで進められるようにしています。用意されたシートに記入しながら進めるので、何から始めればいいかで迷いません。',
              },
              {
                q: 'シートやGPTsを使うのが難しそうで不安です。',
                a: '難しい操作はありません。用意されたシートに記入して進める形になっています。GPTsも、どう使うかを動画で説明するので、初めての方でも問題なく進められます。',
              },
              {
                q: '1日どのくらい時間がかかりますか？',
                a: '基本的に1日1時間を目安にしています。動画を見る日（Day1・2・4・8・10・13）と、行動中心の日に分かれています。',
              },
              {
                q: 'この講座だけで必ず稼げますか？',
                a: '成果を保証するものではありません。ただし、紹介リンクを貼るだけではなく、案件選定・投稿・紹介LP・導線・改善まで実践できる形にしています。',
              },
              {
                q: 'スタート講座とどう違いますか？',
                a: 'スタート講座は「自分に合う副業・収益ルートを見つける講座」です。この講座は、アフィリエイトに特化して、ASP・楽天・コンテンツ紹介の導線を作る講座です。',
              },
              {
                q: 'スタート講座を買わないと、この講座は受けられませんか？',
                a: 'この講座自体は受講できます。ただし、補講で扱うスタート講座の紹介制度に参加するには、スタート講座の購入が必要です。',
              },
              {
                q: '特別価格はいつまでですか？',
                a: '先着30名に達した時点、またはスタート講座1,000部達成プロジェクト終了のどちらか早い時点で終了します。終了後は¥99,800に戻ります。',
              },
              {
                q: '購入後すぐに講座を受け取れますか？',
                a: '購入後ページにて、メールアドレス登録と購入者限定LINEの案内を確認していただきます。確認後に講座URLをご案内します。',
              },
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-orange-100 overflow-hidden shadow-sm">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="font-semibold text-gray-900 text-sm pr-4">Q. {item.q}</span>
                  <span className={`text-orange-500 text-xl font-bold flex-shrink-0 transition-transform duration-200 ${openFaq === idx ? 'rotate-45' : ''}`}>+</span>
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 text-gray-600 text-sm leading-relaxed border-t border-orange-50 pt-3">
                    A. {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          18. 最後のCTA
      ══════════════════════════════════ */}
      <section className="py-16 px-4" style={{ background: 'linear-gradient(135deg, #ffedcc 0%, #ffda99 50%, #ffedcc 100%)' }}>
        <div className="max-w-lg mx-auto text-center">
          <p className="text-xs font-bold text-orange-600 mb-3 tracking-widest">JOIN NOW</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-4 leading-snug">
            紹介リンクを貼るだけで終わらせない。<br />
            <span style={{ color: '#ea6500' }}>成約される理由を作れる人になる。</span>
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed mb-8">
            1日1時間、14日間。<br />
            用意されたシートに記入しながら、<br />
            1投稿に頼らず導線全体で収益化に近づける考え方を学びます。<br /><br />
            今は通常¥99,800の講座を、<br />
            プロジェクト初期メンバー価格でご案内しています。<br />
            このタイミングを逃すと、同じ条件では入れません。
          </p>

          <div className="bg-white rounded-3xl shadow-lg border border-orange-200 p-6 mb-6">
            {priceLoading ? (
              <div className="text-center py-4 text-orange-400 text-sm animate-pulse">価格を読み込み中...</div>
            ) : (
              <>
                {isCampaign && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>📚 スタート講座販売数</span>
                      <span className="font-bold text-gray-700">{salesCount.toLocaleString()} / 1,000部</span>
                    </div>
                    <div className="w-full bg-orange-100 rounded-full h-3">
                      <div className="h-3 rounded-full transition-all"
                        style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #f97316, #ea580c)' }} />
                    </div>
                    <p className="text-xs text-orange-500 mt-1 text-right font-semibold">
                      あと {remaining.toLocaleString()}部でプロジェクト終了
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-400 line-through mb-1 text-center">通常価格 ¥{NORMAL_PRICE.toLocaleString()}</p>
                <p className="text-xs font-bold text-orange-600 text-center mb-1">↓ プロジェクト初期メンバー価格</p>
                <div className="text-5xl font-extrabold mb-1 text-center" style={{ color: '#ea6500' }}>
                  ¥{currentPrice.toLocaleString()}
                </div>
                <p className="text-xs text-red-500 font-bold text-center mb-4">先着30名限定 ｜ プロジェクト期間中のみ</p>
                <PurchaseBtn label={`${priceLabel}でプロジェクト参加する`} />
                <p className="text-center text-xs text-gray-400 mt-2">Stripe 安全決済 ｜ クレジットカード対応</p>
              </>
            )}
          </div>
          <p className="text-xs text-gray-500">ご不明な点はページ下部のお問い合わせよりご連絡ください</p>
        </div>
      </section>

      {/* ── フッター ── */}
      <footer style={{ backgroundColor: '#1a1a1a' }} className="text-gray-500 py-8 px-4 text-center text-xs">
        <p className="text-gray-400">© 2026 みお</p>
        <p className="mt-1">本ページはアフィリエイト広告を含む場合があります。</p>
        <div className="mt-3 flex justify-center gap-4 flex-wrap">
          <a href="/tokushoho" className="hover:text-gray-300">特定商取引法に基づく表記</a>
          <a href="/privacy" className="hover:text-gray-300">プライバシーポリシー</a>
          <a href="/contact" className="hover:text-gray-300">お問い合わせ</a>
        </div>
      </footer>
    </div>
  );
}
