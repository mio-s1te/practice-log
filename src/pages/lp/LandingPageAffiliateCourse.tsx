// src/pages/lp/LandingPageAffiliateCourse.tsx
// プロAIアフィリエイター養成講座LP - 心理学・脳科学設計 全面リニューアル版

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { initializeTracking, recordClick, getTrackingData } from '@/utils/tracking';

const PRODUCT_ID = 'a0000000-0000-0000-0000-000000000003';
const START_COURSE_PRODUCT_ID = 'a0000000-0000-0000-0000-000000000001';
const NORMAL_PRICE = 99800;

// 段階価格定義
const PRICE_TIERS = [
  { min: 0,    max: 30,   price: 4980,  label: '先着30名限定' },
  { min: 31,   max: 100,  price: 9800,  label: '31〜100名限定' },
  { min: 101,  max: 500,  price: 29800, label: '101〜500名' },
  { min: 501,  max: 1000, price: 49800, label: '501〜1,000名' },
  { min: 1001, max: null, price: 99800, label: '通常価格' },
];

interface PriceState {
  currentPrice: number;
  nextPrice: number | null;
  nextThreshold: number | null;
  affiliateSalesCount: number;
  startCourseSalesCount: number;
  tierLabel: string;
  startCourseLimit: number;
  startCourseDone: boolean;
}

export function LandingPageAffiliateCourse() {
  const [searchParams] = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [priceState, setPriceState] = useState<PriceState>({
    currentPrice: 4980,
    nextPrice: 9800,
    nextThreshold: 30,
    affiliateSalesCount: 0,
    startCourseSalesCount: 0,
    tierLabel: '先着30名限定',
    startCourseLimit: 1000,
    startCourseDone: false,
  });

  const fetchPrice = useCallback(async () => {
    setPriceLoading(true);
    try {
      const [affRes, startRes] = await Promise.all([
        fetch(`/.netlify/functions/get-product-price?product_id=${PRODUCT_ID}`),
        fetch(`/.netlify/functions/get-product-price?product_id=${START_COURSE_PRODUCT_ID}`),
      ]);
      let currentPrice = 4980;
      let affiliateSalesCount = 0;
      let startCourseSalesCount = 0;

      if (affRes.ok) {
        const d = await affRes.json();
        currentPrice = d.current_price ?? 4980;
        affiliateSalesCount = d.valid_sales_count ?? 0;
      }
      if (startRes.ok) {
        const d = await startRes.json();
        startCourseSalesCount = d.valid_sales_count ?? 0;
      }

      // 現在のtierを計算
      const tier = PRICE_TIERS.find(t => affiliateSalesCount >= t.min && (t.max === null || affiliateSalesCount <= t.max)) || PRICE_TIERS[0];
      const tierIdx = PRICE_TIERS.indexOf(tier);
      const nextTier = PRICE_TIERS[tierIdx + 1] || null;
      const startCourseDone = startCourseSalesCount >= 1000;

      setPriceState({
        currentPrice,
        nextPrice: nextTier?.price ?? null,
        nextThreshold: tier.max,
        affiliateSalesCount,
        startCourseSalesCount,
        tierLabel: tier.label,
        startCourseLimit: 1000,
        startCourseDone,
      });
    } catch { /* fallback */ }
    finally { setPriceLoading(false); }
  }, []);

  useEffect(() => {
    const tracking = initializeTracking();
    if (tracking.ref) {
      recordClick({ ref: tracking.ref, campaignId: tracking.campaignId, productId: PRODUCT_ID, landingPage: '/affiliate-course' });
    }
    fetchPrice();
    window.scrollTo(0, 0);
  }, [fetchPrice]);

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

  const { currentPrice, nextPrice, nextThreshold, affiliateSalesCount, startCourseSalesCount, tierLabel, startCourseDone } = priceState;
  const startProgress = Math.min(100, (startCourseSalesCount / 1000) * 100);
  const affiliateProgress = nextThreshold ? Math.min(100, (affiliateSalesCount / nextThreshold) * 100) : 100;
  const remainingForNext = nextThreshold ? Math.max(0, nextThreshold - affiliateSalesCount) : 0;

  // 購入ボタン共通コンポーネント
  const PurchaseBtn = ({ label, size = 'lg' }: { label?: string; size?: 'sm' | 'lg' }) => {
    const text = checkoutLoading ? '処理中...' : priceLoading ? '読込中...' : (label || `¥${currentPrice.toLocaleString()}で今すぐ参加する`);
    if (size === 'sm') return (
      <button onClick={handlePurchase} disabled={checkoutLoading || priceLoading}
        style={{
          background: 'linear-gradient(90deg,#a855f7,#ec4899)',
          border: 'none', borderRadius: '10px',
          padding: '10px 18px', color: '#fff', fontWeight: 800, fontSize: '13px',
          cursor: checkoutLoading || priceLoading ? 'not-allowed' : 'pointer',
          opacity: checkoutLoading || priceLoading ? .6 : 1,
          whiteSpace: 'nowrap',
        }}>
        {text}
      </button>
    );
    return (
      <button onClick={handlePurchase} disabled={checkoutLoading || priceLoading}
        className="purchase-btn-glow"
        style={{
          width: '100%', border: 'none',
          background: 'linear-gradient(90deg,#a855f7,#ec4899)',
          borderRadius: '18px', padding: '20px',
          color: '#fff', fontWeight: 900, fontSize: '18px',
          cursor: checkoutLoading || priceLoading ? 'not-allowed' : 'pointer',
          opacity: checkoutLoading || priceLoading ? .6 : 1,
          lineHeight: 1.3, letterSpacing: '.02em',
        }}>
        {text}
      </button>
    );
  };

  return (
    <div style={{
      fontFamily: "'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif",
      background: '#0a0a0f',
      color: '#fff',
      minHeight: '100vh',
    }}>
      <style>{`
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes pulse-glow{0%,100%{box-shadow:0 0 30px rgba(168,85,247,.6)}50%{box-shadow:0 0 60px rgba(168,85,247,1),0 0 100px rgba(236,72,153,.4)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes count-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes progress-fill{from{width:0}to{width:var(--target-width)}}
        @keyframes slide-in{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes heartbeat{0%,100%{transform:scale(1)}14%{transform:scale(1.15)}28%{transform:scale(1)}42%{transform:scale(1.1)}70%{transform:scale(1)}}
        .shimmer-hero{
          background:linear-gradient(90deg,#fff 0%,#fde68a 30%,#f0abfc 60%,#fff 100%);
          background-size:200% auto;
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
          animation:shimmer 4s linear infinite;
        }
        .purchase-btn-glow{animation:pulse-glow 2.5s ease-in-out infinite}
        .float-icon{animation:float 3.5s ease-in-out infinite}
        .heartbeat{animation:heartbeat 1.5s ease-in-out infinite}
        .price-number{animation:count-up .6s ease forwards}
        .progress-bar{animation:progress-fill 1.2s ease forwards}
        .slide-in{animation:slide-in .5s ease forwards}
        .faq-item{border-bottom:1px solid rgba(255,255,255,.08)}
        .tier-row{padding:10px 14px;border-radius:10px;display:flex;justify-content:space-between;align-items:center;font-size:13px}
        .tier-active{background:linear-gradient(90deg,rgba(168,85,247,.25),rgba(236,72,153,.15));border:1px solid rgba(168,85,247,.5)}
        .tier-inactive{background:rgba(255,255,255,.04);color:#6b7280}
        .section-dark{background:#0d0d14}
        .section-mid{background:linear-gradient(135deg,#0f0a1e,#0d1225)}
        .card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:18px;padding:20px}
      `}</style>

      {/* ── 固定ヘッダー ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(168,85,247,.2)',
        padding: '10px 16px',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#e9d5ff', lineHeight: 1.3 }}>
            プロAIアフィリエイター<br className="sm-hide" />養成講座
          </span>
          <PurchaseBtn size="sm" label={priceLoading ? '...' : `¥${currentPrice.toLocaleString()}で参加する`} />
        </div>
      </header>

      {/* ── 緊急バー ── */}
      {!priceLoading && nextThreshold && remainingForNext <= 10 && (
        <div style={{
          background: 'linear-gradient(90deg,#dc2626,#b91c1c)',
          padding: '8px 16px', textAlign: 'center',
          fontSize: '13px', fontWeight: 800,
        }}>
          🚨 あと{remainingForNext}名で¥{nextPrice?.toLocaleString()}に値上がり！今すぐ確定してください
        </div>
      )}

      {/* ══════════ 1. HERO ══════════ */}
      <section style={{
        background: 'radial-gradient(ellipse at top,rgba(168,85,247,.2) 0%,transparent 60%), linear-gradient(160deg,#0f0c29 0%,#0a0a0f 100%)',
        padding: 'clamp(60px,10vw,100px) 20px clamp(50px,8vw,80px)',
        textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* 背景グロー */}
        <div style={{
          position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle,rgba(168,85,247,.15) 0%,transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: '700px', margin: '0 auto' }}>
          {/* ラベル群 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
            <span style={{ background: 'linear-gradient(90deg,#a855f7,#ec4899)', borderRadius: '999px', padding: '5px 16px', fontSize: '12px', fontWeight: 800 }}>
              🏆 {tierLabel}
            </span>
            <span style={{ background: 'rgba(239,68,68,.2)', border: '1px solid rgba(239,68,68,.5)', borderRadius: '999px', padding: '5px 16px', fontSize: '12px', fontWeight: 800, color: '#fca5a5' }}>
              ⚡ 販売数に応じて自動値上がり
            </span>
          </div>

          {/* メインキャッチ */}
          <h1 style={{ fontSize: 'clamp(26px,6vw,48px)', fontWeight: 900, lineHeight: 1.2, marginBottom: '16px' }}>
            <span className="shimmer-hero">
              紹介リンクを貼るだけで<br />終わらせない。
            </span>
            <br />
            <span style={{ color: '#fff', fontSize: 'clamp(18px,4vw,32px)', fontWeight: 700 }}>
              成約される理由を作れる人になる。
            </span>
          </h1>

          <p style={{ color: '#c4b5fd', fontSize: 'clamp(14px,3vw,17px)', lineHeight: 1.85, marginBottom: '8px' }}>
            1日1時間、14日間。<br />
            AIと用意されたシートを使いながら、<br />
            案件に振り回されない紹介導線を一緒に作ります。
          </p>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '40px' }}>
            Day3から動き始め、Day5で初報酬を本気で狙います。
          </p>

          {/* ── 価格カード ── */}
          <div style={{
            background: 'linear-gradient(135deg,rgba(168,85,247,.12),rgba(236,72,153,.08))',
            border: '1.5px solid rgba(168,85,247,.4)',
            borderRadius: '28px', padding: '32px 24px',
            maxWidth: '500px', margin: '0 auto',
          }}>
            {priceLoading ? (
              <div style={{ color: '#9ca3af', fontSize: '14px', padding: '20px 0', textAlign: 'center' }}>
                価格・販売数を読み込み中...
              </div>
            ) : (
              <>
                {/* ── 段階価格メーター ── */}
                <div style={{ marginBottom: '24px' }}>
                  <p style={{ color: '#c4b5fd', fontSize: '12px', fontWeight: 700, marginBottom: '14px', textAlign: 'center', letterSpacing: '.05em' }}>
                    📊 現在の販売状況（養成講座）
                  </p>

                  {/* 段階バー */}
                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    {/* 背景トラック */}
                    <div style={{
                      width: '100%', height: '12px',
                      background: 'rgba(255,255,255,.08)',
                      borderRadius: '999px', overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${affiliateProgress}%`,
                        background: 'linear-gradient(90deg,#a855f7,#ec4899)',
                        borderRadius: '999px',
                        transition: 'width 1.2s ease',
                        boxShadow: '0 0 12px rgba(168,85,247,.6)',
                      }} />
                    </div>
                    {/* 区切りマーカー */}
                    {nextThreshold && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: '#6b7280' }}>
                        <span>0</span>
                        <span style={{ color: '#f0abfc', fontWeight: 700 }}>
                          {affiliateSalesCount}名参加中
                        </span>
                        <span>{nextThreshold}名→値上がり</span>
                      </div>
                    )}
                  </div>

                  {/* 段階価格テーブル */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                    {PRICE_TIERS.filter(t => t.price <= NORMAL_PRICE).map((t, i) => {
                      const isActive = currentPrice === t.price;
                      const isPast = currentPrice > t.price;
                      return (
                        <div key={i} className={isActive ? 'tier-row tier-active' : 'tier-row tier-inactive'}
                          style={{ opacity: isPast ? .4 : 1 }}>
                          <span style={{ fontWeight: isActive ? 800 : 400 }}>
                            {isActive ? '🔥 ' : isPast ? '✅ ' : '⏳ '}{t.label}
                          </span>
                          <span style={{ fontWeight: 800, color: isActive ? '#f0abfc' : 'inherit' }}>
                            ¥{t.price.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* スタート講座バー */}
                  <div style={{
                    background: 'rgba(255,255,255,.04)', borderRadius: '12px',
                    padding: '12px 14px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af', marginBottom: '6px' }}>
                      <span>📚 スタート講座販売数（プロジェクト基準）</span>
                      <span style={{ fontWeight: 700, color: '#e5e7eb' }}>{startCourseSalesCount.toLocaleString()} / 1,000部</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,.08)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${startProgress}%`,
                        background: 'linear-gradient(90deg,#f59e0b,#ef4444)',
                        borderRadius: '999px', transition: 'width 1.2s ease',
                      }} />
                    </div>
                    {startCourseDone ? (
                      <p style={{ color: '#ef4444', fontSize: '11px', fontWeight: 700, marginTop: '6px', textAlign: 'right' }}>
                        🚨 プロジェクト終了 → 通常価格（¥99,800）
                      </p>
                    ) : (
                      <p style={{ color: '#f59e0b', fontSize: '11px', marginTop: '6px', textAlign: 'right' }}>
                        あと{(1000 - startCourseSalesCount).toLocaleString()}部で通常価格に移行
                      </p>
                    )}
                  </div>
                </div>

                {/* 現在価格 */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <p style={{ color: '#9ca3af', fontSize: '13px', textDecoration: 'line-through', marginBottom: '4px' }}>
                    通常価格 ¥{NORMAL_PRICE.toLocaleString()}
                  </p>
                  <p style={{ color: '#c4b5fd', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    ↓ {tierLabel}価格
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px' }}>
                    <span className="price-number heartbeat" style={{ fontSize: 'clamp(48px,12vw,72px)', fontWeight: 900, color: '#f0abfc', lineHeight: 1 }}>
                      ¥{currentPrice.toLocaleString()}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: '14px' }}>（税込）</span>
                  </div>
                  {nextPrice && nextThreshold && (
                    <p style={{ color: '#fca5a5', fontSize: '12px', fontWeight: 700, marginTop: '8px' }}>
                      ⚠️ あと{remainingForNext}名の参加で¥{nextPrice.toLocaleString()}に値上がり
                    </p>
                  )}
                </div>

                <PurchaseBtn />
                <p style={{ color: '#4b5563', fontSize: '11px', textAlign: 'center', marginTop: '10px' }}>
                  🔒 Stripe安全決済 ｜ クレジットカード対応
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ══════════ 2. 損失回避 ══════════ */}
      <section className="section-dark" style={{ padding: '64px 20px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#a855f7', fontSize: '12px', fontWeight: 800, letterSpacing: '.1em', marginBottom: '8px' }}>LOSS AVERSION</p>
          <h2 style={{ fontSize: 'clamp(20px,5vw,32px)', fontWeight: 900, lineHeight: 1.3, marginBottom: '8px' }}>
            今日申し込まないと、<br /><span style={{ color: '#f0abfc' }}>明日には高くなっているかもしれない。</span>
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: 1.85, marginBottom: '32px' }}>
            この講座は「販売数が増えるほど自動で値上がり」する仕組みです。<br />
            ページを閉じた後に価格が変わっても、保証はありません。
          </p>

          {/* 価格比較タイムライン */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '400px', margin: '0 auto 32px' }}>
            {[
              { time: '今すぐ', price: `¥${currentPrice.toLocaleString()}`, active: true, note: tierLabel },
              { time: '数名後', price: nextPrice ? `¥${nextPrice.toLocaleString()}` : '—', active: false, note: '自動値上がり' },
              { time: 'プロジェクト終了後', price: '¥99,800', active: false, note: '通常価格' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px',
                background: item.active ? 'linear-gradient(90deg,rgba(168,85,247,.2),rgba(236,72,153,.1))' : 'rgba(255,255,255,.03)',
                border: `1px solid ${item.active ? 'rgba(168,85,247,.5)' : 'rgba(255,255,255,.06)'}`,
                borderRadius: '12px',
              }}>
                <span style={{ color: item.active ? '#f0abfc' : '#6b7280', fontSize: '12px', width: '120px', textAlign: 'left', flexShrink: 0 }}>{item.time}</span>
                <span style={{ color: item.active ? '#fff' : '#4b5563', fontWeight: 900, fontSize: item.active ? '20px' : '16px', flex: 1, textAlign: 'center' }}>{item.price}</span>
                <span style={{ color: item.active ? '#c4b5fd' : '#374151', fontSize: '11px', width: '100px', textAlign: 'right' }}>{item.note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ 3. 共感 - 悩み ══════════ */}
      <section className="section-mid" style={{ padding: '64px 20px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <p style={{ color: '#a855f7', fontSize: '12px', fontWeight: 800, letterSpacing: '.1em', textAlign: 'center', marginBottom: '8px' }}>PROBLEMS</p>
          <h2 style={{ fontSize: 'clamp(20px,5vw,30px)', fontWeight: 900, textAlign: 'center', lineHeight: 1.3, marginBottom: '32px' }}>
            こんな状態、心当たりありませんか？
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '12px' }}>
            {[
              { icon: '😵', text: '紹介リンクを貼っているのに、全然クリックされない' },
              { icon: '🤔', text: 'どの案件を選べばいいか分からず、なんとなく紹介している' },
              { icon: '😔', text: '自分が使っていない商品を紹介することに罪悪感がある' },
              { icon: '📉', text: 'SNSで発信しているのに、収益につながっていない' },
              { icon: '🔗', text: '紹介リンクを貼るだけで終わっていて、導線が作れていない' },
              { icon: '😰', text: '案件が停止されたら終わり、という不安がずっとある' },
              { icon: '🤖', text: 'AIを使いたいけど、何に使えばいいかわからない' },
              { icon: '⏰', text: '忙しくて、まとまった時間が取れない' },
            ].map(item => (
              <div key={item.text} className="card" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '24px', flexShrink: 0 }}>{item.icon}</span>
                <p style={{ color: '#d1d5db', fontSize: '13px', lineHeight: 1.7 }}>{item.text}</p>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: '24px', textAlign: 'center',
            background: 'linear-gradient(90deg,rgba(168,85,247,.12),rgba(236,72,153,.08))',
            border: '1px solid rgba(168,85,247,.3)', borderRadius: '18px', padding: '20px 24px',
          }}>
            <p style={{ color: '#e9d5ff', fontWeight: 800, fontSize: '15px', marginBottom: '6px' }}>
              この講座は、その悩みに正面から向き合います。
            </p>
            <p style={{ color: '#c4b5fd', fontSize: '13px', lineHeight: 1.75 }}>
              「売り込まず、必要な人に届く紹介」をAIと14日間で仕組み化します。
            </p>
          </div>
        </div>
      </section>

      {/* ══════════ 4. Before → After ══════════ */}
      <section className="section-dark" style={{ padding: '64px 20px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <p style={{ color: '#a855f7', fontSize: '12px', fontWeight: 800, letterSpacing: '.1em', textAlign: 'center', marginBottom: '8px' }}>TRANSFORMATION</p>
          <h2 style={{ fontSize: 'clamp(20px,5vw,30px)', fontWeight: 900, textAlign: 'center', lineHeight: 1.3, marginBottom: '32px' }}>
            14日後、あなたはこう変わる
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Before */}
            <div style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '18px', padding: '20px' }}>
              <p style={{ color: '#f87171', fontSize: '13px', fontWeight: 800, marginBottom: '14px', textAlign: 'center' }}>😰 Before（今）</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  '紹介リンクを貼るだけ',
                  'なんとなく投稿している',
                  '1案件に依存している',
                  '数字の見方がわからない',
                  '次に何をすべきか迷う',
                ].map(t => (
                  <li key={t} style={{ color: '#fca5a5', fontSize: '12px', display: 'flex', gap: '6px' }}>
                    <span>✗</span><span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* After */}
            <div style={{ background: 'rgba(168,85,247,.08)', border: '1px solid rgba(168,85,247,.3)', borderRadius: '18px', padding: '20px' }}>
              <p style={{ color: '#c4b5fd', fontSize: '13px', fontWeight: 800, marginBottom: '14px', textAlign: 'center' }}>🚀 After（14日後）</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  '成約される導線が完成',
                  '投稿の目的が明確',
                  '複数案件で安定運用',
                  '数字から改善できる',
                  '次の行動が決まっている',
                ].map(t => (
                  <li key={t} style={{ color: '#e9d5ff', fontSize: '12px', display: 'flex', gap: '6px' }}>
                    <span style={{ color: '#a855f7' }}>✓</span><span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ 5. 講座内容 ══════════ */}
      <section className="section-mid" style={{ padding: '64px 20px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <p style={{ color: '#a855f7', fontSize: '12px', fontWeight: 800, letterSpacing: '.1em', textAlign: 'center', marginBottom: '8px' }}>CURRICULUM</p>
          <h2 style={{ fontSize: 'clamp(20px,5vw,30px)', fontWeight: 900, textAlign: 'center', lineHeight: 1.3, marginBottom: '32px' }}>
            1日1時間 × 14日間のロードマップ
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { day: 'Day 1-2', icon: '🎯', title: '市場と2アカウント設計', desc: 'ジャンル候補・初報酬案件候補を選び、ASP垢とビジ垢を設計・作成', highlight: false },
              { day: 'Day 3-4', icon: '🚀', title: '最初の発信と紹介ページ作成', desc: 'ASP登録・案件整理・両アカウント初投稿・紹介LP作成', highlight: false, badge: 'ここから動き出す' },
              { day: 'Day 5', icon: '🔥', title: '初報酬チャレンジ', desc: 'ASP垢で投稿・コメント・CTA改善。本気で初成約を狙う日', highlight: true, badge: '初報酬を狙う' },
              { day: 'Day 6-9', icon: '🌐', title: '信頼導線の構築', desc: '無料プレゼント・ビジ垢投稿・信頼を積み上げる入口を作る', highlight: false },
              { day: 'Day 10-12', icon: '💰', title: '収益の柱を広げる', desc: '本命案件・代替案件を選び、1案件依存から抜け出す導線へ', highlight: false },
              { day: 'Day 13-14', icon: '📈', title: '改善分析と次の計画', desc: '数字を見て改善し、講座後も迷わず動ける14日計画を作る', highlight: false },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', gap: '14px', alignItems: 'flex-start',
                padding: '16px 18px',
                background: item.highlight
                  ? 'linear-gradient(90deg,rgba(239,68,68,.15),rgba(168,85,247,.1))'
                  : 'rgba(255,255,255,.04)',
                border: `1px solid ${item.highlight ? 'rgba(239,68,68,.4)' : 'rgba(255,255,255,.07)'}`,
                borderRadius: '14px',
              }}>
                <span style={{ fontSize: '24px', flexShrink: 0, marginTop: '2px' }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ color: item.highlight ? '#fca5a5' : '#a855f7', fontSize: '12px', fontWeight: 800 }}>{item.day}</span>
                    {item.badge && (
                      <span style={{
                        background: item.highlight ? 'rgba(239,68,68,.3)' : 'rgba(168,85,247,.2)',
                        color: item.highlight ? '#fca5a5' : '#c4b5fd',
                        fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px',
                      }}>{item.badge}</span>
                    )}
                  </div>
                  <p style={{ fontWeight: 800, fontSize: '14px', color: item.highlight ? '#fff' : '#e5e7eb', marginBottom: '4px' }}>{item.title}</p>
                  <p style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.65 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ 6. 購入ボタン中間 ══════════ */}
      <section style={{ padding: '48px 20px', background: 'radial-gradient(ellipse at center,rgba(168,85,247,.15) 0%,transparent 70%)' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#c4b5fd', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>
            現在の価格：<span style={{ color: '#f0abfc', fontSize: '24px', fontWeight: 900 }}>
              {priceLoading ? '...' : `¥${currentPrice.toLocaleString()}`}
            </span>（{tierLabel}）
          </p>
          {nextPrice && nextThreshold && (
            <p style={{ color: '#fca5a5', fontSize: '12px', fontWeight: 700, marginBottom: '16px' }}>
              ⚠️ あと{remainingForNext}名で¥{nextPrice.toLocaleString()}に値上がり
            </p>
          )}
          <PurchaseBtn />
          <p style={{ color: '#374151', fontSize: '11px', marginTop: '8px' }}>🔒 Stripe安全決済</p>
        </div>
      </section>

      {/* ══════════ 7. 社会的証明 ══════════ */}
      <section className="section-dark" style={{ padding: '64px 20px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <p style={{ color: '#a855f7', fontSize: '12px', fontWeight: 800, letterSpacing: '.1em', textAlign: 'center', marginBottom: '8px' }}>VOICES</p>
          <h2 style={{ fontSize: 'clamp(20px,5vw,28px)', fontWeight: 900, textAlign: 'center', marginBottom: '28px' }}>
            受講者の声
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '14px' }}>
            {[
              { text: 'Day5で初クリックが取れました！正直もっと時間がかかると思ってたので驚きました。', name: '20代・会社員', tag: '💜 養成講座受講' },
              { text: 'アフィリエイトを始めて3ヶ月、何もうまくいかなかったのにこの講座でやっと流れが作れました。', name: '30代・副業主婦', tag: '💜 養成講座受講' },
              { text: '14日ロードマップがあるから今日やることが明確で、迷わず動けました。', name: '40代・フリーランス', tag: '💜 養成講座受講' },
            ].map((v, i) => (
              <div key={i} className="card">
                <div style={{ display: 'inline-block', background: 'rgba(168,85,247,.2)', borderRadius: '999px', padding: '3px 10px', fontSize: '11px', color: '#c4b5fd', marginBottom: '10px', fontWeight: 700 }}>
                  {v.tag}
                </div>
                <p style={{ color: '#e5e7eb', fontSize: '13px', lineHeight: 1.75, marginBottom: '10px' }}>「{v.text}」</p>
                <p style={{ color: '#6b7280', fontSize: '11px' }}>— {v.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ 8. FAQ ══════════ */}
      <section className="section-mid" style={{ padding: '64px 20px' }}>
        <div style={{ maxWidth: '620px', margin: '0 auto' }}>
          <p style={{ color: '#a855f7', fontSize: '12px', fontWeight: 800, letterSpacing: '.1em', textAlign: 'center', marginBottom: '8px' }}>FAQ</p>
          <h2 style={{ fontSize: 'clamp(20px,5vw,28px)', fontWeight: 900, textAlign: 'center', marginBottom: '28px' }}>よくある質問</h2>
          <div>
            {[
              { q: 'アフィリエイト未経験でも大丈夫ですか？', a: 'はい。この講座はゼロから始める前提で設計されています。ASP登録から丁寧に解説します。' },
              { q: '1日1時間って本当に大丈夫ですか？', a: '60分を目安に設計していますが、Day5など行動中心の日は45〜90分になることもあります。細切れでも進められます。' },
              { q: 'スタート講座との違いは何ですか？', a: 'スタート講座はAI副業の全体像を学ぶ入門編。養成講座はアフィリエイトに特化して「導線を完成させる」実践編です。' },
              { q: 'どんな案件でも使えますか？', a: '楽天・ASP・コンテンツ案件など幅広く対応できる設計です。特定ジャンルに縛られない汎用的な手法を学びます。' },
              { q: '購入後すぐに使えますか？', a: 'はい。購入完了後、すぐに講座にアクセスできます。' },
              { q: '価格はなぜ上がるのですか？', a: '参加者が増えるほど情報の希少性が下がるため、先に参加した方へのメリットとして段階的に価格を上げています。今が最安値です。' },
            ].map((item, i) => (
              <div key={i} className="faq-item">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    padding: '18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', textAlign: 'left', gap: '12px',
                  }}>
                  <span style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 700 }}>Q. {item.q}</span>
                  <span style={{ color: '#a855f7', fontSize: '20px', flexShrink: 0, transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: 'transform .2s' }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ paddingBottom: '18px' }}>
                    <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: 1.75 }}>A. {item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ 9. 最終CTA ══════════ */}
      <section style={{
        padding: '80px 20px',
        background: 'radial-gradient(ellipse at center,rgba(168,85,247,.25) 0%,transparent 70%)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          <div className="float-icon" style={{ fontSize: '56px', marginBottom: '20px' }}>🚀</div>
          <h2 style={{ fontSize: 'clamp(22px,5vw,34px)', fontWeight: 900, lineHeight: 1.3, marginBottom: '12px' }}>
            <span className="shimmer-hero">今が、一番安い。<br />今が、一番早い。</span>
          </h2>
          <p style={{ color: '#c4b5fd', fontSize: '14px', lineHeight: 1.85, marginBottom: '32px' }}>
            このページを閉じても、価格は戻りません。<br />
            参加者が増えるたびに、価格は上がります。<br />
            動くなら、今です。
          </p>

          {!priceLoading && (
            <div style={{
              background: 'rgba(168,85,247,.1)', border: '1px solid rgba(168,85,247,.3)',
              borderRadius: '16px', padding: '16px', marginBottom: '20px',
            }}>
              <p style={{ color: '#c4b5fd', fontSize: '12px', marginBottom: '4px' }}>{tierLabel}価格</p>
              <p style={{ color: '#f0abfc', fontSize: '40px', fontWeight: 900, lineHeight: 1, marginBottom: '4px' }}>
                ¥{currentPrice.toLocaleString()}
              </p>
              {nextPrice && nextThreshold && (
                <p style={{ color: '#fca5a5', fontSize: '12px', fontWeight: 700 }}>
                  ⚠️ あと{remainingForNext}名で¥{nextPrice.toLocaleString()}に値上がり
                </p>
              )}
            </div>
          )}

          <PurchaseBtn label="今すぐプロジェクトに参加する" />
          <p style={{ color: '#374151', fontSize: '11px', marginTop: '10px' }}>🔒 Stripe安全決済 ｜ クレジットカード対応</p>

          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {['✅ 購入後すぐにアクセス可能', '✅ 14日間ロードマップ付き', '✅ AI活用シート・GPTs付属'].map(t => (
              <p key={t} style={{ color: '#6b7280', fontSize: '12px' }}>{t}</p>
            ))}
          </div>
        </div>
      </section>

      {/* footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,.06)',
        padding: '24px 20px', textAlign: 'center',
        color: '#374151', fontSize: '11px',
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px',
      }}>
        <span>© MIO AI LIFE DESIGN</span>
        <a href="/tokushoho" style={{ color: '#4b5563', textDecoration: 'none' }}>特定商取引法</a>
        <a href="/privacy" style={{ color: '#4b5563', textDecoration: 'none' }}>プライバシーポリシー</a>
      </footer>
    </div>
  );
}
