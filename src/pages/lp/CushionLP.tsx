// src/pages/lp/CushionLP.tsx
// クッションLP - 無料note → アフィリエイト養成講座 or スタート講座への2択導線

import { useState } from 'react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { initializeTracking } from '@/utils/tracking';

export function CushionLP() {
  const [searchParams] = useSearchParams();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    initializeTracking();
    window.scrollTo(0, 0);
  }, []);

  const ref = searchParams.get('ref') || '';
  const campaign = searchParams.get('campaign') || '';
  const buildUrl = (path: string) => {
    const params = new URLSearchParams();
    if (ref) params.set('ref', ref);
    if (campaign) params.set('campaign', campaign);
    return params.toString() ? `${path}?${params.toString()}` : path;
  };

  const faqs = [
    {
      q: '2つの講座、どちらを選べばいいですか？',
      a: '「アフィリエイトでとにかく動き出したい！」なら養成講座へ。「副業で何をすべきかまだ迷っている」「AI×副業の全体像を掴んでから動きたい」ならスタート講座がおすすめです。',
    },
    {
      q: '養成講座はアフィリエイト未経験でも大丈夫ですか？',
      a: 'はい。ゼロから始める前提で設計されています。ASP登録から丁寧に解説するので、経験不問です。',
    },
    {
      q: '1日にどのくらい時間が必要ですか？',
      a: '養成講座は1日1時間（60分）目安の14日間ロードマップです。細切れ時間でも進められる設計です。',
    },
    {
      q: '購入後すぐに始められますか？',
      a: 'はい。決済完了後すぐにアクセス可能です。',
    },
    {
      q: '価格はなぜ上がるのですか？',
      a: '養成講座は参加者数に応じて自動で価格が上がる段階価格制を採用しています。先に動いた方ほどお得に受講できる仕組みです。',
    },
    {
      q: 'お問い合わせはどこからできますか？',
      a: '下のLINEリンクからご連絡ください。購入前のご相談もお気軽にどうぞ🐱',
    },
  ];

  return (
    <div style={{
      fontFamily: "'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif",
      background: 'linear-gradient(160deg,#1a0f00 0%,#2d1a00 40%,#1a1000 100%)',
      minHeight: '100vh',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes twinkle{0%,100%{opacity:.15}50%{opacity:.7}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes pulse-glow-orange{0%,100%{box-shadow:0 0 24px rgba(251,146,60,.45)}50%{box-shadow:0 0 48px rgba(251,146,60,.85),0 0 80px rgba(249,115,22,.25)}}
        @keyframes pulse-glow-amber{0%,100%{box-shadow:0 0 24px rgba(245,158,11,.4)}50%{box-shadow:0 0 48px rgba(245,158,11,.8),0 0 80px rgba(245,158,11,.3)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes badge-pop{0%{transform:scale(.8);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
        @keyframes slide-up{0%{transform:translateY(30px);opacity:0}100%{transform:translateY(0);opacity:1}}
        @keyframes neko-bounce{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-8px) rotate(2deg)}}
        .star{position:absolute;border-radius:50%;background:rgba(251,146,60,.4)}
        .float1{animation:float 4s ease-in-out infinite}
        .float2{animation:float 4s ease-in-out infinite;animation-delay:1.2s}
        .neko-float{animation:neko-bounce 3s ease-in-out infinite}
        .glow-orange{animation:pulse-glow-orange 2.5s ease-in-out infinite}
        .glow-amber{animation:pulse-glow-amber 2.5s ease-in-out infinite}
        .shimmer-text{
          background:linear-gradient(90deg,#fff 0%,#fed7aa 40%,#fb923c 60%,#fff 100%);
          background-size:200% auto;
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
          animation:shimmer 3.5s linear infinite;
        }
        .badge-anim{animation:badge-pop .7s cubic-bezier(.34,1.56,.64,1) forwards}
        .slide-up{animation:slide-up .8s ease forwards}
        .choice-card{transition:transform .25s ease,box-shadow .25s ease;cursor:pointer;text-decoration:none;display:block}
        .choice-card:hover{transform:translateY(-6px)}
        .choice-card:active{transform:translateY(-2px)}
        .faq-item{border-bottom:1px solid rgba(251,146,60,.12)}
        .line-btn:hover{opacity:.85;transform:scale(1.02)}
        .line-btn{transition:all .2s ease;cursor:pointer;text-decoration:none;display:inline-block}
      `}</style>

      {/* ほんのり光る粒子 */}
      {Array.from({length: 20}).map((_, i) => (
        <span key={i} className="star" style={{
          width: `${1.5 + (i % 3)}px`, height: `${1.5 + (i % 3)}px`,
          top: `${(i * 37) % 100}%`, left: `${(i * 53) % 100}%`,
          animation: `twinkle ${2 + (i % 4) * .5}s ${i * .4}s infinite`,
        }} />
      ))}

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ══ HERO ══ */}
        <section style={{ padding: '64px 20px 32px', textAlign: 'center' }}>

          {/* ねこアイコン */}
          <div className="neko-float" style={{ fontSize: '42px', marginBottom: '12px', lineHeight: 1 }}>🐱</div>

          <div className="badge-anim" style={{
            display: 'inline-block',
            background: 'linear-gradient(90deg,#fb923c,#f97316)',
            borderRadius: '999px', padding: '6px 20px',
            fontSize: '12px', fontWeight: 800, marginBottom: '24px', letterSpacing: '.05em',
          }}>
            📖 無料noteを読んでくれたあなたへ
          </div>

          <h1 style={{ fontSize: 'clamp(24px,6vw,40px)', fontWeight: 900, lineHeight: 1.25, marginBottom: '20px' }}>
            <span className="shimmer-text">あなたは今、<br />どちらのステージにいますか？</span>
          </h1>

          <p style={{ color: '#fed7aa', fontSize: '15px', lineHeight: 1.85, maxWidth: '480px', margin: '0 auto 10px' }}>
            noteで紹介したAIアフィリエイトの世界へようこそ。<br />
            次の一歩は、今のあなたの状況で変わります。
          </p>
          <p style={{ color: '#78350f', fontSize: '13px', marginBottom: '8px' }}>↓ 当てはまる方を選んでください</p>
        </section>

        {/* ══ 無料note紹介 ══ */}
        <section style={{ padding: '0 16px 48px', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: 'linear-gradient(145deg,rgba(251,146,60,.13) 0%,rgba(30,20,0,.6) 100%)',
            border: '1.5px solid rgba(251,146,60,.35)',
            borderRadius: '28px', padding: '32px 24px',
          }}>
            <p style={{ color: '#fb923c', fontSize: '11px', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '12px', textAlign: 'center' }}>
              📖 無料noteの内容
            </p>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', lineHeight: 1.4, marginBottom: '16px', textAlign: 'center' }}>
              「AIを使って副業月5万円を<br />最短ルートで達成する方法」
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { emoji: '🤖', text: 'AIツールを使った作業時間を1/3に短縮する具体的な方法' },
                { emoji: '📡', text: 'SNSフォロワー0人でも売上を作れる導線設計の考え方' },
                { emoji: '💰', text: 'アフィリエイトで初報酬を最速で出すための案件選び' },
                { emoji: '⏰', text: '1日1時間だけで継続できる行動設計テンプレート' },
                { emoji: '🗺️', text: '副業初心者が迷わず動ける14日間ロードマップ全公開' },
              ].map(item => (
                <li key={item.text} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>{item.emoji}</span>
                  <span style={{ color: '#fed7aa', fontSize: '13px', lineHeight: 1.75, fontWeight: 600 }}>{item.text}</span>
                </li>
              ))}
            </ul>

            {/* 区切り */}
            <div style={{ borderTop: '1px solid rgba(251,146,60,.2)', margin: '0 0 24px' }} />

            {/* LINE CTA */}
            <p style={{ color: '#fde68a', fontSize: '15px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>
              📩 無料で全文を受け取る
            </p>
            <p style={{ color: '#a16207', fontSize: '13px', lineHeight: 1.75, textAlign: 'center', marginBottom: '20px' }}>
              公式LINEに登録して<br />
              <strong style={{ color: '#fb923c', fontSize: '16px' }}>「本気」</strong>
              と送るだけで届きます🐱
            </p>
            <a
              href="https://lin.ee/sSD9W7a"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                background: '#06C755',
                borderRadius: '16px', padding: '16px 24px',
                color: '#fff', fontWeight: 900, fontSize: '16px',
                boxShadow: '0 4px 24px rgba(6,199,85,.4)',
                textDecoration: 'none',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="48" rx="12" fill="#06C755"/>
                <path d="M24 8C15.163 8 8 14.373 8 22.25c0 7.089 6.29 13.04 14.786 14.066.576.124 1.36.38 1.558.87.178.446.116 1.145.057 1.596l-.252 1.512c-.077.447-.354 1.748 1.531.953 1.885-.795 10.17-5.99 13.876-10.26C41.474 28.56 40 25.535 40 22.25 40 14.373 32.837 8 24 8z" fill="white"/>
                <path d="M34.5 25.5h-4a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5V24h2.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5zM19.5 25.5h-4a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v6h2.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5zM22 18h1a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5zM28.5 25.5h-1a.5.5 0 0 1-.41-.21l-3-4.5V25a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5h1c.16 0 .31.075.41.21l3 4.5V18.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5z" fill="#06C755"/>
              </svg>
              公式LINEで「本気」と送る →
            </a>
            <p style={{ color: '#6b7280', fontSize: '11px', textAlign: 'center', marginTop: '10px' }}>
              ※ 登録無料・すぐに届きます
            </p>
          </div>
        </section>

        {/* ══ 2択カード ══ */}
        <section style={{ padding: '0 16px 48px', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
            gap: '20px',
          }}>

            {/* ── カード① 養成講座 ── */}
            <a href={buildUrl('/affiliate-course')} className="choice-card" style={{
              background: 'linear-gradient(145deg,rgba(251,146,60,.18) 0%,rgba(249,115,22,.12) 100%)',
              border: '1.5px solid rgba(251,146,60,.55)',
              borderRadius: '28px', padding: '32px 24px',
            }}>
              <div style={{
                display: 'inline-block',
                background: 'linear-gradient(90deg,#fb923c,#f97316)',
                borderRadius: '999px', padding: '5px 16px',
                fontSize: '11px', fontWeight: 800, marginBottom: '18px',
              }}>
                🔥 アフィリエイトに絞って実践したい
              </div>

              <div className="float1" style={{ fontSize: '52px', margin: '4px 0 14px', lineHeight: 1 }}>🚀</div>

              <h2 style={{ fontSize: '21px', fontWeight: 900, color: '#fed7aa', marginBottom: '10px', lineHeight: 1.3 }}>
                プロAIアフィリエイター<br />養成講座
              </h2>
              <p style={{ color: '#fdba74', fontSize: '13px', lineHeight: 1.85, marginBottom: '20px' }}>
                方向性はもう決まっている。<br />
                あとは「どう動くか」だけ。<br />
                14日間で紹介導線を一気に完成させます。
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {['✅ 1日1時間 × 14日で導線完成', '✅ AIで作業効率3倍以上', '✅ Day5で初報酬チャレンジ', '✅ 案件停止に強い複数導線設計'].map(t => (
                  <li key={t} style={{ color: '#fed7aa', fontSize: '13px', fontWeight: 600 }}>{t}</li>
                ))}
              </ul>

              {/* 価格 */}
              <div style={{
                background: 'rgba(251,146,60,.15)', border: '1px solid rgba(251,146,60,.35)',
                borderRadius: '14px', padding: '14px 16px', marginBottom: '22px', textAlign: 'center',
              }}>
                <p style={{ color: '#fdba74', fontSize: '11px', margin: '0 0 6px' }}>段階価格制（早いほど断然お得）</p>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ color: '#9ca3af', fontSize: '13px', textDecoration: 'line-through' }}>¥99,800</span>
                  <span style={{ color: '#fb923c', fontSize: '34px', fontWeight: 900 }}>¥4,980</span>
                  <span style={{ color: '#fdba74', fontSize: '13px' }}>〜</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
                  <span>先着30名 → ¥4,980 ｜ 31〜100名 → ¥9,800</span>
                  <span>101〜500名 → ¥29,800 ｜ 501〜1,000名 → ¥49,800</span>
                  <span style={{ color: '#fb923c', fontWeight: 700, marginTop: '2px' }}>⚡ 販売数が増えると自動値上がり</span>
                </div>
              </div>

              <div className="glow-orange" style={{
                background: 'linear-gradient(90deg,#fb923c,#f97316)',
                borderRadius: '16px', padding: '16px',
                textAlign: 'center', fontWeight: 900, fontSize: '16px', color: '#fff',
              }}>
                養成講座の詳細を見る →
              </div>
              <p style={{ color: '#6b7280', fontSize: '11px', textAlign: 'center', marginTop: '8px' }}>
                ※ Stripe安全決済 ｜ クレカ対応
              </p>
            </a>

            {/* ── カード② スタート講座 ── */}
            <a href={buildUrl('/start-course')} className="choice-card" style={{
              background: 'linear-gradient(145deg,rgba(251,191,36,.12) 0%,rgba(234,179,8,.08) 100%)',
              border: '1.5px solid rgba(251,191,36,.4)',
              borderRadius: '28px', padding: '32px 24px',
            }}>
              <div style={{
                display: 'inline-block',
                background: 'linear-gradient(90deg,#fbbf24,#d97706)',
                borderRadius: '999px', padding: '5px 16px',
                fontSize: '11px', fontWeight: 800, marginBottom: '18px',
              }}>
                🌱 まだ方向性から決めたい
              </div>

              <div className="float2" style={{ fontSize: '52px', margin: '4px 0 14px', lineHeight: 1 }}>🌟</div>

              <h2 style={{ fontSize: '21px', fontWeight: 900, color: '#fef3c7', marginBottom: '10px', lineHeight: 1.3 }}>
                AI副業1時間化<br />スタート講座
              </h2>
              <p style={{ color: '#fde68a', fontSize: '13px', lineHeight: 1.85, marginBottom: '20px' }}>
                副業で何をすべきか迷っている。<br />
                AI×副業の全体像を掴んでから動きたい。<br />
                まず「基盤」を作りたい方へ。
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {['✅ AI副業の全体像が丸ごとわかる', '✅ 自分に合った方向性を見つける', '✅ 1時間から始められる設計', '✅ 購入後にアフィリエイト参加も可能'].map(t => (
                  <li key={t} style={{ color: '#fef3c7', fontSize: '13px', fontWeight: 600 }}>{t}</li>
                ))}
              </ul>

              {/* 価格 */}
              <div style={{
                background: 'rgba(251,191,36,.10)', border: '1px solid rgba(251,191,36,.30)',
                borderRadius: '14px', padding: '14px 16px', marginBottom: '22px', textAlign: 'center',
              }}>
                <p style={{ color: '#fde68a', fontSize: '11px', margin: '0 0 6px' }}>段階価格制（早いほどお得）</p>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ color: '#fef3c7', fontSize: '34px', fontWeight: 900 }}>¥29,800</span>
                  <span style={{ color: '#fde68a', fontSize: '13px' }}>〜</span>
                </div>
                <p style={{ color: '#fbbf24', fontSize: '11px', fontWeight: 700, marginTop: '4px' }}>
                  ⚡ 販売数が増えると自動値上がり
                </p>
              </div>

              <div className="glow-amber" style={{
                background: 'linear-gradient(90deg,#fbbf24,#d97706)',
                borderRadius: '16px', padding: '16px',
                textAlign: 'center', fontWeight: 900, fontSize: '16px', color: '#fff',
              }}>
                スタート講座の詳細を見る →
              </div>
              <p style={{ color: '#6b7280', fontSize: '11px', textAlign: 'center', marginTop: '8px' }}>
                ※ Stripe安全決済 ｜ クレカ対応
              </p>
            </a>
          </div>

          {/* 迷ったら養成講座 */}
          <div style={{
            marginTop: '28px', textAlign: 'center',
            padding: '20px 24px',
            background: 'rgba(251,146,60,.07)',
            borderRadius: '18px', border: '1px solid rgba(251,146,60,.2)',
          }}>
            <p style={{ color: '#d1d5db', fontSize: '14px', lineHeight: 1.8 }}>
              🐱 <strong style={{ color: '#fed7aa' }}>迷ったら養成講座がおすすめです。</strong><br />
              アフィリエイトに特化した実践講座で、今が最安値。<br />
              <span style={{ color: '#78350f', fontSize: '12px' }}>
                スタート講座999部突破（1,000部到達）後は通常価格（¥99,800）に移行します。
              </span>
            </p>
          </div>
        </section>

        {/* ══ FAQ ══ */}
        <section style={{ padding: '0 16px 64px', maxWidth: '600px', margin: '0 auto' }}>
          <p style={{ color: '#92400e', fontSize: '12px', marginBottom: '20px', letterSpacing: '.1em', textAlign: 'center', fontWeight: 800 }}>── よくある質問 ──</p>

          <div>
            {faqs.map((item, i) => (
              <div key={i} className="faq-item">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    padding: '18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', textAlign: 'left', gap: '12px',
                  }}>
                  <span style={{ color: '#fed7aa', fontSize: '14px', fontWeight: 700 }}>Q. {item.q}</span>
                  <span style={{
                    color: '#fb923c', fontSize: '20px', flexShrink: 0,
                    transform: openFaq === i ? 'rotate(45deg)' : 'none',
                    transition: 'transform .2s',
                  }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ paddingBottom: '18px' }}>
                    <p style={{ color: '#a16207', fontSize: '13px', lineHeight: 1.75 }}>A. {item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ══ LINEお問い合わせ ══ */}
        <section style={{
          padding: '0 16px 64px', maxWidth: '500px', margin: '0 auto', textAlign: 'center',
        }}>
          <div style={{
            background: 'rgba(251,146,60,.08)',
            border: '1px solid rgba(251,146,60,.25)',
            borderRadius: '24px', padding: '28px 24px',
          }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🐱</div>
            <p style={{ color: '#fed7aa', fontWeight: 800, fontSize: '15px', marginBottom: '6px' }}>
              迷ったらLINEで相談してね
            </p>
            <p style={{ color: '#a16207', fontSize: '13px', lineHeight: 1.75, marginBottom: '20px' }}>
              どちらを選べばいいか、購入前のご質問など<br />
              お気軽にメッセージしてください😊
            </p>
            <a
              href="https://lin.ee/sSD9W7a"
              target="_blank"
              rel="noopener noreferrer"
              className="line-btn"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                background: '#06C755',
                borderRadius: '14px', padding: '14px 28px',
                color: '#fff', fontWeight: 900, fontSize: '15px',
                boxShadow: '0 4px 20px rgba(6,199,85,.35)',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="48" rx="12" fill="#06C755"/>
                <path d="M24 8C15.163 8 8 14.373 8 22.25c0 7.089 6.29 13.04 14.786 14.066.576.124 1.36.38 1.558.87.178.446.116 1.145.057 1.596l-.252 1.512c-.077.447-.354 1.748 1.531.953 1.885-.795 10.17-5.99 13.876-10.26C41.474 28.56 40 25.535 40 22.25 40 14.373 32.837 8 24 8z" fill="white"/>
                <path d="M34.5 25.5h-4a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5V24h2.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5zM19.5 25.5h-4a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v6h2.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5zM22 18h1a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5zM28.5 25.5h-1a.5.5 0 0 1-.41-.21l-3-4.5V25a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5h1c.16 0 .31.075.41.21l3 4.5V18.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5z" fill="#06C755"/>
              </svg>
              LINEでみおに相談する
            </a>
          </div>
        </section>

        {/* footer */}
        <footer style={{
          borderTop: '1px solid rgba(251,146,60,.1)',
          padding: '20px', textAlign: 'center',
          color: '#44251a', fontSize: '11px',
        }}>
          © MIO AI LIFE DESIGN
        </footer>
      </div>
    </div>
  );
}
