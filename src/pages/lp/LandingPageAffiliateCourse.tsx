// src/pages/lp/LandingPageAffiliateCourse.tsx
// プロAIアフィリエイター養成講座 ランディングページ

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { initializeTracking, recordClick, getTrackingData } from '@/utils/tracking';

const PRODUCT_ID = 'a0000000-0000-0000-0000-000000000003';
const NORMAL_PRICE = 99800;
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  const PurchaseBtn = ({ label, size = 'lg' }: { label?: string; size?: 'sm' | 'lg' }) =>
    size === 'lg' ? (
      <button onClick={handlePurchase} disabled={checkoutLoading || priceLoading}
        className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-extrabold py-5 rounded-2xl text-lg transition-all shadow-lg shadow-orange-200 disabled:opacity-50">
        {checkoutLoading ? '処理中...' : (label || 'プロジェクト限定価格で参加する')}
      </button>
    ) : (
      <button onClick={handlePurchase} disabled={checkoutLoading || priceLoading}
        className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50">
        {checkoutLoading ? '処理中...' : (label || '今すぐ申し込む')}
      </button>
    );

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", backgroundColor: '#fffaf5' }}>

      {/* ── 固定ヘッダー ── */}
      <header style={{ backgroundColor: 'rgba(255,250,245,0.95)', backdropFilter: 'blur(8px)' }}
        className="sticky top-0 z-50 border-b border-orange-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-gray-800 leading-tight">プロAIアフィリエイター<br className="sm:hidden" />養成講座</span>
          <PurchaseBtn label="今すぐ申し込む" size="sm" />
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

          {/* ラベル群 */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full border border-orange-200">
              📌 スタート講座1,000部達成プロジェクト限定
            </span>
            <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full border border-red-200">
              先着30名 ¥4,980
            </span>
            <span className="text-gray-400 text-xs font-medium px-3 py-1">通常価格 ¥99,800</span>
          </div>

          {/* メインコピー */}
          <h1 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 leading-snug mb-4">
            成約しやすい案件を探して<br />
            振り回される人から、<br />
            <span style={{ color: '#ea6500' }}>成約される理由を作れる人へ。</span>
          </h1>

          {/* サブコピー */}
          <p className="text-center text-gray-600 text-sm md:text-base mb-4 leading-relaxed">
            ASP・楽天・コンテンツアフィリエイトを、AIと実践シートで学びながら、<br className="hidden md:block" />
            2週間で収益導線の土台を作る講座。
          </p>
          <p className="text-center text-gray-500 text-xs md:text-sm mb-8 leading-relaxed max-w-lg mx-auto">
            この講座は、紹介リンクを貼るだけの講座ではありません。<br />
            売れる市場を見抜き、誰に何をどう届けるかを設計し、<br />
            案件が変わっても収益化できる力を育てます。
          </p>

          {/* 価格カード */}
          <div className="bg-white rounded-3xl shadow-lg shadow-orange-100 border border-orange-100 p-6 max-w-md mx-auto">
            {priceLoading ? (
              <div className="text-center py-4 text-orange-400 text-sm animate-pulse">価格を読み込み中...</div>
            ) : (
              <>
                {/* 販売進捗バー（スタート講座） */}
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
                <div className="mb-2">
                  <p className="text-xs text-gray-400 line-through text-center">通常価格 ¥{NORMAL_PRICE.toLocaleString()}</p>
                  <div className="flex items-end justify-center gap-2 my-1">
                    <span className="text-5xl font-extrabold" style={{ color: '#ea6500' }}>¥{currentPrice.toLocaleString()}</span>
                    <span className="text-sm text-gray-500 mb-2">（税込）</span>
                  </div>
                  <p className="text-center text-xs font-bold text-red-500">先着30名かつプロジェクト期間中のみ</p>
                </div>

                {/* 価格移行表 */}
                <div className="bg-orange-50 rounded-xl p-3 mb-4 text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between"><span>🟠 現在（先着30名まで）</span><span className="font-bold text-orange-600">¥4,980</span></div>
                  <div className="flex justify-between"><span>　31〜100名</span><span className="font-semibold">¥9,800</span></div>
                  <div className="flex justify-between"><span>　101〜300名</span><span className="font-semibold">¥29,800</span></div>
                  <div className="flex justify-between"><span>　プロジェクト終了後</span><span className="font-semibold">¥99,800</span></div>
                </div>

                <PurchaseBtn />
                <p className="text-center text-xs text-gray-400 mt-2">Stripe 安全決済 ｜ クレジットカード対応</p>
                <p className="text-center text-xs text-gray-400 mt-1">
                  ※特別価格は、人数到達またはプロジェクト終了のどちらか早い時点で終了します
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          2. こんな悩みはありませんか？
      ══════════════════════════════════ */}
      <section className="py-14 px-4" style={{ backgroundColor: '#fff' }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-bold text-orange-500 mb-2 tracking-widest">PROBLEMS</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 mb-8">
            こんな悩みはありませんか？
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: '😵', text: 'アフィリエイトを始めたいけど、何から手をつければいいかわからない' },
              { icon: '🤔', text: 'ASPに登録しても、どの案件を選べばいいかわからない' },
              { icon: '📱', text: 'SNSで発信しているのに、収益につながっていない' },
              { icon: '😅', text: '商品紹介が売り込みっぽくなってしまう' },
              { icon: '😔', text: '使っていない商品を紹介することに罪悪感がある' },
              { icon: '📉', text: '投稿してもクリックや登録につながらない' },
              { icon: '🤖', text: 'AIを使って効率化したいけど、何に使えばいいかわからない' },
              { icon: '🔗', text: 'スタート講座を紹介したいけど、どう発信すればいいかわからない' },
            ].map((item) => (
              <div key={item.text}
                className="flex items-start gap-3 bg-orange-50 border border-orange-100 rounded-2xl p-4">
                <span className="text-2xl flex-shrink-0 mt-0.5">{item.icon}</span>
                <p className="text-gray-700 text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <div className="inline-block bg-orange-100 rounded-2xl px-6 py-4">
              <p className="text-orange-700 font-bold text-sm">この講座は、その悩みに正面から向き合います。</p>
              <p className="text-orange-600 text-xs mt-1">紹介リンクを貼るだけでなく、<br />「なぜ売れるのか」を設計できる人を育てます。</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          3. この講座で作るもの
      ══════════════════════════════════ */}
      <section className="py-14 px-4" style={{ background: 'linear-gradient(135deg, #fff8f0, #fff3e0)' }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-bold text-orange-500 mb-2 tracking-widest">DELIVERABLES</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 mb-2">
            この講座で作るもの
          </h2>
          <p className="text-center text-gray-500 text-sm mb-8">ただ学ぶだけではなく、収益導線の土台を作ります。</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: '🅰️', title: 'ASP垢', desc: '比較・選び方・商品/サービス紹介で初報酬を狙うアカウント' },
              { icon: '🅱️', title: 'ビジ垢', desc: '共感・教育・信頼・無料プレゼント・LINE導線でコンテンツ紹介につなげるアカウント' },
              { icon: '📋', title: '案件管理シート', desc: '初報酬案件・本命案件・代替案件を整理するシート' },
              { icon: '📝', title: '投稿管理シート', desc: '1投稿ごとの目的、CTA、反応、改善点を記録するシート' },
              { icon: '📊', title: 'クリック管理シート', desc: '日別・導線別にクリックや登録を記録し、改善するシート' },
              { icon: '🌐', title: 'NetlifyクッションLP', desc: 'SNSから案件LPへ自然につなげる紹介ページ' },
              { icon: '🎁', title: '無料プレゼント', desc: 'ビジ垢でリストや信頼を積み上げるための配布物' },
              { icon: '🗓️', title: '次の14日計画', desc: '講座終了後も動ける投稿・改善計画' },
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
            動画を見るだけで終わらせない。<br />毎日1時間、手を動かす講座です。
          </h2>
          <p className="text-center text-gray-500 text-sm mb-8">
            動画は毎日ではなく、章ごとの要点だけ。<br />
            Day1、2、4、8、10、13に動画を見て、その他の日は行動中心で進めます。
          </p>

          {/* フロー */}
          <div className="flex flex-col items-center gap-0 max-w-xs mx-auto mb-8">
            {[
              { icon: '🎬', label: '動画を見る' },
              { icon: '🤖', label: 'GPTsを使う' },
              { icon: '📊', label: 'スプレッドシートに記入' },
              { icon: '✍️', label: '投稿・LP・導線を作る' },
              { icon: '📈', label: '数字を見て改善する' },
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
            <p>「導線を整えてから売る」のではなく、<br />
            「<strong>報酬発生を狙いながら、導線も整える</strong>」講座です。</p>
            <p className="mt-2">試行錯誤はDay3から開始し、<strong>Day5で初報酬を本気で狙います。</strong></p>
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
              { ch: '第0章', title: '使い方と準備', desc: '講座の進め方、必要なもの、GPTsとシートの使い方を確認します。' },
              { ch: '第1章', title: '市場と2アカウント設計', desc: 'ジャンルを仮決めし、ASP垢とビジ垢を作ります。' },
              { ch: '第2章', title: '初報酬チャレンジ導線', desc: 'ASP登録、案件提携、リンク取得、NetlifyクッションLP作成、Day5の初報酬チャレンジを進めます。' },
              { ch: '第3章', title: 'コンテンツアフィリエイト導線', desc: '無料プレゼント、必要な人だけLINE公式、教育文3通、ビジ垢投稿を作ります。' },
              { ch: '第4章', title: '本命案件と雪だるま導線', desc: '本命案件・代替案件・特典付き紹介導線を作り、案件停止に強い導線へ整えます。' },
              { ch: '第5章', title: '改善分析と次の14日計画', desc: '投稿・クリック・LP・LINE登録を見て改善し、次の14日間の行動計画を作ります。' },
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
          <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 mb-8">14日ロードマップ</h2>
          <div className="relative pl-8">
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-orange-100" />
            {[
              { day: 'Day 1', time: '60分', title: '第0章動画を見る', desc: 'ジャンル候補3つ＋初報酬案件候補3つを選ぶ', highlight: false },
              { day: 'Day 2', time: '60分', title: '第1章動画を見る', desc: 'ASP垢・ビジ垢の設計＆作成', highlight: false },
              { day: 'Day 3', time: '60分', title: '試行錯誤スタート', desc: 'ASP登録＋案件候補整理＋見込み客分析＋両アカウント初投稿', highlight: false, badge: '🚀 ここから試行錯誤開始' },
              { day: 'Day 4', time: '60分', title: '第2章動画を見る', desc: '案件提携・リンク取得・NetlifyクッションLP作成', highlight: false },
              { day: 'Day 5', time: '60分', title: '初報酬チャレンジ', desc: 'ASP垢で投稿・コメント・CTA改善', highlight: true, badge: '🔥 初報酬を狙う日' },
              { day: 'Day 6', time: '45〜60分', title: '反応分析', desc: '反応分析＋導線タイプ決定', highlight: false },
              { day: 'Day 7', time: '60分', title: 'ASP垢本格強化', desc: '比較表・LP改善・投稿', highlight: false },
              { day: 'Day 8', time: '60分', title: '第3章動画を見る', desc: '無料プレゼント作成', highlight: false },
              { day: 'Day 9', time: '60分', title: 'LINE公式整備', desc: 'LINE公式＋教育文3通＋ビジ垢投稿', highlight: false },
              { day: 'Day 10', time: '60分', title: '第4章動画を見る', desc: '本命案件・代替案件を選ぶ', highlight: false },
              { day: 'Day 11', time: '60分', title: '特典付き紹介導線', desc: '特典付き紹介導線を作る', highlight: false },
              { day: 'Day 12', time: '45〜60分', title: '雪だるま導線整備', desc: '案件停止に強い雪だるま導線へ整える', highlight: false },
              { day: 'Day 13', time: '60分', title: '第5章動画を見る', desc: '改善分析', highlight: false },
              { day: 'Day 14', time: '45〜60分', title: '次の計画策定', desc: '次の14日計画を作る', highlight: false },
            ].map((item, i) => (
              <div key={i} className={`relative mb-4 ${item.highlight ? 'ml-[-4px]' : ''}`}>
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
                    <p className="text-xs text-red-600 font-bold mt-1">報酬発生を狙いながら、導線も整える日です。</p>
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
            <p className="font-bold mb-1">⚠️ 注意</p>
            <p>案件が1つしかないジャンルは危険です。この講座では、初報酬案件リストを使いながら、最初の一歩を選びやすくします。<br />
            ただし案件は停止・変更されることがあるため、最終確認は各ASP管理画面で行います。</p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          8. 本当に効く実践視点
      ══════════════════════════════════ */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-bold text-orange-500 mb-2 tracking-widest">PRACTICAL INSIGHTS</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 mb-2">
            派手な裏技ではなく、<br />本当に成約に近づく実践視点を学びます。
          </h2>
          <p className="text-center text-gray-500 text-sm mb-8">
            本人もまだ気づいていない悩みを言い当て、改善された未来を見せ、<br />
            ぼんやりした興味を行動に変えるための視点。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { num: '01', icon: '⭐', title: '低評価レビューを読む', desc: '売れる訴求は公式LPだけでなく、低評価レビューにもあります。期待・不満・不安・買う前に知りたかったことを拾って、「買う前に知っておくべきこと」として投稿やLPに活かすことで、信頼される紹介になります。' },
              { num: '02', icon: '🔬', title: '競合の売れている投稿を分解する', desc: '丸パクリはしません。見るのは構造です。1行目・悩みの切り取り方・比較対象・コメント欄・CTA・プロフィール導線を分析し、伸びた理由をAIに分析させて自分の投稿に置き換えます。' },
              { num: '03', icon: '🎯', title: '商品名を最初から出さない', desc: '初心者はすぐ商品名を出します。売れる導線では最初に出すのは商品名ではなく、悩み・失敗・損失・理想の未来・判断基準です。商品名は最後でいい。' },
              { num: '04', icon: '✋', title: '向いていない人を書く', desc: 'あえて「この人には向かない」「こういう人は買わない方がいい」「別の選択肢がいい」と書くことで信頼が増えます。全員におすすめすると怪しく見えます。' },
              { num: '05', icon: '🎁', title: '無料プレゼント名を商品名より強くする', desc: '無料プレゼントは中身だけでなく、名前で受け取られるかが決まります。「副業チェックシート」より「副業で3ヶ月売上0の人が最初に直すべき7項目」が強い理由を学びます。' },
              { num: '06', icon: '🛡️', title: '案件停止を前提に作る', desc: '最初から「この案件が消えたら何を売るか」を決めておきます。だからアカウント名やプロフィールに特定商品名を入れません。商品ではなく、市場・悩み・未来で設計します。' },
              { num: '07', icon: '📚', title: '成約記事は1記事で終わらせない', desc: '選び方・比較・レビュー・失敗回避・特典の最低5つを作ります。SNSならこれを投稿に分解します。1記事だけで売ろうとしません。' },
              { num: '08', icon: '🗣️', title: '自分の言葉を混ぜる', desc: 'AI文章そのままだと売れません。自分の失敗・感情・判断基準・誰に勧めるか・誰に勧めないかを入れます。ここが信頼になります。' },
            ].map((item) => (
              <div key={item.num} className="bg-orange-50 rounded-2xl p-5 border border-orange-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-orange-400">{item.num}</span>
                  <span className="text-xl">{item.icon}</span>
                  <h3 className="font-bold text-gray-900 text-sm">{item.title}</h3>
                </div>
                <p className="text-gray-600 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          9. バズらなくても大丈夫な導線設計
      ══════════════════════════════════ */}
      <section className="py-14 px-4" style={{ background: 'linear-gradient(135deg, #fff8f0, #fff3e0)' }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-bold text-orange-500 mb-2 tracking-widest">FUNNEL DESIGN</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 mb-2">
            投稿が伸びるかは運。<br />でも、導線は設計できます。
          </h2>
          <p className="text-center text-gray-500 text-sm mb-8">
            1投稿のバズに頼らず、複数の導線を組み合わせて収益に近づきます。
          </p>
          <div className="space-y-3">
            {[
              { icon: '📌', text: '1投稿で売ろうとしない' },
              { icon: '🔗', text: '複数投稿で、悩みの言語化・失敗回避・選び方・比較・不安つぶし・CTAにつなげる' },
              { icon: '👤', text: '投稿が伸びなくても、プロフィールアクセスやクリックにつながる導線を作る' },
              { icon: '📍', text: '固定投稿とプロフィールで、次に見る場所を迷わせない' },
              { icon: '📊', text: 'クリックされない時はCTAだけでなく、前提教育が足りているかを見る' },
              { icon: '💡', text: '数字が少ない時は、分析ではなく仮説を作って改善する' },
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
              <ul className="space-y-1.5">
                {[
                  'Day1〜14進行シート', '案件管理シート', '投稿管理シート', 'クリック管理シート',
                  'SNSアカウント設計シート', 'ASP登録チェックシート', '案件審査チェックシート',
                  'LP管理シート', '無料プレゼント管理シート', 'LINE導線管理シート',
                  '特典管理シート', '次の14日計画シート',
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
                  'ジャンル診断GPTs', '案件チェックGPTs', 'アカウント設計GPTs',
                  '投稿作成GPTs', 'LP生成GPTs', '改善分析GPTs',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs text-gray-700">
                    <span className="text-orange-400 font-bold mt-0.5">✓</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            {/* 補講・特典 */}
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
              <h3 className="font-bold text-orange-700 text-sm mb-3">🎁 補講・特典</h3>
              <ul className="space-y-1.5">
                {[
                  '補講：スタート講座をコンテンツアフィリエイトする方法',
                  '感想投稿特典：裏ルート実践パック〜Day15以降、私ならこう伸ばす〜',
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
          11. 感想投稿特典
      ══════════════════════════════════ */}
      <section className="py-14 px-4" style={{ background: 'linear-gradient(135deg, #fff8f0, #fff3e0)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-md border border-orange-100 p-6 md:p-8">
            <p className="text-xs font-bold text-orange-500 mb-1 tracking-widest">BONUS</p>
            <h2 className="text-lg md:text-xl font-extrabold text-gray-900 mb-1">
              🎁 感想投稿特典：裏ルート実践パック
            </h2>
            <p className="text-sm text-orange-600 font-bold mb-4">Day15以降、私ならこう伸ばす。</p>
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              講座の感想を投稿してくださった方に、講座本編を一通り進めたあとにさらに導線を伸ばすための特典をお渡しします。
            </p>
            <div className="bg-orange-50 rounded-2xl p-4 mb-5">
              <p className="text-xs font-bold text-orange-700 mb-2">特典内容</p>
              <ul className="space-y-1">
                {[
                  'Day15〜60 実践ロードマップ',
                  'GPTs裏活用集',
                  'バズらなくても大丈夫な導線設計',
                  '低評価レビュー、競合投稿、コメント欄の分析テンプレ',
                  '私ならこう直す改善チェックリスト',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs text-gray-700">
                    <span className="text-orange-400 font-bold">✓</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-700 mb-2">受け取り条件</p>
              <ol className="space-y-1.5">
                {[
                  '講座の感想をXまたはThreadsで引用ポスト',
                  '元投稿にいいね',
                  '元投稿をリポスト',
                  'いいね・リポスト・引用ポストがわかるスクショを撮る',
                  '購入者LINEにスクショを送る',
                  '合言葉「養成」と送信する',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="bg-orange-400 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                    {item}
                  </li>
                ))}
              </ol>
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
                市場選定、案件ポートフォリオ、見込み客心理、反論処理、無料プレゼント、比較記事、特典設計、成約導線、改善分析が中心。
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
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-orange-400 font-bold">▷</span>
                <span>補講：実践用案件としてスタート講座を紹介する場合</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-orange-400 font-bold">▷</span>
                <span>補講：紹介リンク・禁止表現・素材・報酬条件</span>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
              <p><strong>参加条件：</strong>スタート講座購入者のみ</p>
              <p><strong>制度：</strong>スタート講座の販売が1,000部に到達するまでの限定制度</p>
              <p><strong>報酬：</strong>商品購入が発生した場合</p>
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
              この講座では、まず初報酬を狙う導線、ASP垢とビジ垢の土台作り、案件が変わっても使える雪だるま式導線を作ります。<br /><br />
              オプチャ運営、LINE自動化、YouTube本格運用、SEOブログ、クローズドASP、特単交渉、外注化などは<strong>中級編で扱う予定</strong>です。
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
          <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 mb-6">プロジェクト限定価格</h2>
          <div className="bg-white rounded-3xl shadow-lg border border-orange-100 p-6 md:p-8 mb-6">
            <p className="text-sm text-gray-700 leading-relaxed mb-5">
              プロAIアフィリエイター養成講座の通常価格は<strong>¥99,800</strong>です。<br /><br />
              ただし現在は、スタート講座1,000部達成プロジェクトの初期メンバー募集として、プロジェクト期間中のみ特別価格で公開しています。<br /><br />
              これは未完成だから安いのではありません。講座として学べる形は整っていますが、今回はスタート講座を紹介できる実践者を増やし、アフィリエイト実践者の成功事例を一緒に作っていくための特別価格です。
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
                  <span className={row.current ? 'text-orange-700' : 'text-gray-600'}>{row.current && '🟠 '}{row.range}</span>
                  <span className={row.current ? 'text-orange-600 text-lg' : 'text-gray-700'}>{row.price}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mb-5">
              ※各価格帯は、人数到達またはプロジェクト終了のどちらか早い時点で終了します。プロジェクト終了後は、その時点の価格に関わらず通常価格¥99,800へ移行します。
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

            <PurchaseBtn label="プロジェクト限定価格で参加する" />
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
          <h2 className="text-xl md:text-2xl font-extrabold text-center text-gray-900 mb-8">購入後の流れ</h2>
          <p className="text-center text-sm text-gray-600 mb-6">
            購入後は、購入者限定公式LINEから講座を受け取ります。
          </p>
          <div className="space-y-3 max-w-sm mx-auto">
            {[
              { step: '1', text: '決済完了後、購入後ページへ移動' },
              { step: '2', text: 'メールアドレスを登録' },
              { step: '3', text: '購入者限定LINEを追加' },
              { step: '4', text: 'LINEで合言葉を送信' },
              { step: '5', text: '購入時メールアドレスと照合' },
              { step: '6', text: '確認後、講座URLを案内' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-4 bg-orange-50 rounded-2xl px-5 py-3.5 border border-orange-100">
                <span className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">{item.step}</span>
                <p className="text-sm text-gray-700">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-orange-50 border border-orange-200 rounded-2xl p-5 text-center">
            <p className="text-sm font-bold text-orange-700 mb-3">購入者限定LINE</p>
            <a href="https://lin.ee/n8hWvOf" target="_blank" rel="noopener noreferrer"
              className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-3 rounded-xl text-sm transition-all">
              📲 購入者限定LINEを追加する
            </a>
            <p className="text-xs text-gray-500 mt-3">合言葉：<strong>本気でプロアフィリエイター</strong></p>
            <p className="text-xs text-gray-400 mt-2">
              ※講座URLの受け取りには、購入時メールアドレスの登録が必要です。
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
              { q: 'アフィリエイト初心者でも大丈夫ですか？', a: 'はい。ASP登録、案件選び、投稿作成、LP作成、改善まで、Day1〜14の流れで進められるようにしています。' },
              { q: 'この講座だけで必ず稼げますか？', a: '成果を保証するものではありません。ただし、紹介リンクを貼るだけではなく、案件選定・投稿・LP・導線・改善まで実践できる形にしています。' },
              { q: 'スタート講座とどう違いますか？', a: 'スタート講座は「自分に合う副業・収益ルートを見つける講座」です。この講座は、アフィリエイトに特化して、ASP・楽天・コンテンツ紹介の導線を作る講座です。' },
              { q: 'スタート講座を買わないと、この講座は受けられませんか？', a: 'この講座自体は受講できます。ただし、補講で扱うスタート講座の紹介制度に参加するには、スタート講座の購入が必要です。' },
              { q: 'アフィリエイター登録は誰でもできますか？', a: 'スタート講座を紹介するアフィリエイター登録は、スタート講座購入者限定です。メールアドレスで購入情報を照合します。' },
              { q: '特別価格はいつまでですか？', a: '人数到達またはスタート講座1,000部達成プロジェクト終了のどちらか早い時点で終了します。' },
              { q: '購入後すぐに講座を受け取れますか？', a: '購入後ページでメールアドレスを登録し、購入者限定LINEに合言葉を送ることで、講座URLを受け取れます。' },
              { q: '投稿がバズらないと意味がないですか？', a: 'いいえ。この講座では、投稿のバズだけに頼らず、プロフィール、固定投稿、LP、無料プレゼント、必要な人だけLINE公式を組み合わせて導線を作ります。' },
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
            成約しやすい案件を探す側から、<br />
            <span style={{ color: '#ea6500' }}>成約される理由を作る側へ。</span>
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed mb-8">
            アフィリエイトは、紹介リンクを貼るだけでは続きません。<br />
            誰の悩みを解決するのか。<br />
            どんな言葉で届けるのか。<br />
            どんな導線なら自然に進めるのか。<br /><br />
            そこまで作れるようになることで、<br />
            案件が変わっても収益化できる土台ができます。
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
                <div className="text-5xl font-extrabold mb-1 text-center" style={{ color: '#ea6500' }}>
                  ¥{currentPrice.toLocaleString()}
                </div>
                <p className="text-xs text-red-500 font-bold text-center mb-4">先着30名限定 ｜ プロジェクト期間中のみ</p>
                <PurchaseBtn label="プロジェクト限定価格で参加する" />
                <p className="text-center text-xs text-gray-400 mt-2">Stripe 安全決済 ｜ クレジットカード対応</p>
              </>
            )}
          </div>
          <p className="text-xs text-gray-500">ご不明な点は購入者限定LINEよりお問い合わせください</p>
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
