// src/pages/lp/CushionLP.tsx
// クッションLP - 無料note → アフィリエイト養成講座 or スタート講座への2択導線

import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { initializeTracking } from '@/utils/tracking';

export function CushionLP() {
  const [searchParams] = useSearchParams();

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

  return (
    <div style={{
      fontFamily: "'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif",
      background: 'linear-gradient(160deg,#0f0c29 0%,#1a1040 40%,#0d1b2a 100%)',
      minHeight: '100vh',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes twinkle{0%,100%{opacity:.2}50%{opacity:.9}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes pulse-glow-purple{0%,100%{box-shadow:0 0 24px rgba(168,85,247,.5)}50%{box-shadow:0 0 48px rgba(168,85,247,.9),0 0 80px rgba(168,85,247,.3)}}
        @keyframes pulse-glow-amber{0%,100%{box-shadow:0 0 24px rgba(245,158,11,.4)}50%{box-shadow:0 0 48px rgba(245,158,11,.8),0 0 80px rgba(245,158,11,.3)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes badge-pop{0%{transform:scale(.8);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
        @keyframes slide-up{0%{transform:translateY(30px);opacity:0}100%{transform:translateY(0);opacity:1}}
        .star{position:absolute;border-radius:50%;background:#fff}
        .float1{animation:float 4s ease-in-out infinite}
        .float2{animation:float 4s ease-in-out infinite;animation-delay:1.2s}
        .glow-purple{animation:pulse-glow-purple 2.5s ease-in-out infinite}
        .glow-amber{animation:pulse-glow-amber 2.5s ease-in-out infinite}
        .shimmer-text{
          background:linear-gradient(90deg,#fff 0%,#fde68a 40%,#c4b5fd 60%,#fff 100%);
          background-size:200% auto;
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
          animation:shimmer 3.5s linear infinite;
        }
        .badge-anim{animation:badge-pop .7s cubic-bezier(.34,1.56,.64,1) forwards}
        .slide-up{animation:slide-up .8s ease forwards}
        .choice-card{transition:transform .25s ease,box-shadow .25s ease;cursor:pointer;text-decoration:none;display:block}
        .choice-card:hover{transform:translateY(-6px)}
        .choice-card:active{transform:translateY(-2px)}
      `}</style>

      {/* 星屑 */}
      {Array.from({length: 24}).map((_, i) => (
        <span key={i} className="star" style={{
          width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`,
          top: `${(i * 37) % 100}%`, left: `${(i * 53) % 100}%`,
          animation: `twinkle ${1.5 + (i % 3) * .5}s ${i * .3}s infinite`,
        }} />
      ))}

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ══ HERO ══ */}
        <section style={{ padding: '64px 20px 40px', textAlign: 'center' }}>
          <div className="badge-anim" style={{
            display: 'inline-block',
            background: 'linear-gradient(90deg,#a855f7,#ec4899)',
            borderRadius: '999px', padding: '6px 20px',
            fontSize: '12px', fontWeight: 800, marginBottom: '24px', letterSpacing: '.05em',
          }}>
            📖 無料noteを読んでくれたあなたへ
          </div>

          <h1 style={{ fontSize: 'clamp(24px,6vw,40px)', fontWeight: 900, lineHeight: 1.25, marginBottom: '20px' }}>
            <span className="shimmer-text">あなたは今、<br />どちらのステージにいますか？</span>
          </h1>

          <p style={{ color: '#c4b5fd', fontSize: '15px', lineHeight: 1.85, maxWidth: '480px', margin: '0 auto 10px' }}>
            noteで紹介したAIアフィリエイトの世界へようこそ。<br />
            次の一歩は、今のあなたの状況で変わります。
          </p>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>↓ 当てはまる方を選んでください</p>
        </section>

        {/* ══ 2択カード ══ */}
        <section style={{ padding: '0 16px 64px', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
            gap: '20px',
          }}>

            {/* ── カード① 養成講座 ── */}
            <a href={buildUrl('/affiliate-course')} className="choice-card" style={{
              background: 'linear-gradient(145deg,rgba(168,85,247,.18) 0%,rgba(236,72,153,.12) 100%)',
              border: '1.5px solid rgba(168,85,247,.55)',
              borderRadius: '28px', padding: '32px 24px',
            }}>
              <div style={{
                display: 'inline-block',
                background: 'linear-gradient(90deg,#a855f7,#ec4899)',
                borderRadius: '999px', padding: '5px 16px',
                fontSize: '11px', fontWeight: 800, marginBottom: '18px',
              }}>
                💜 アフィリエイトに絞って実践したい
              </div>

              <div className="float1" style={{ fontSize: '52px', margin: '4px 0 14px', lineHeight: 1 }}>🚀</div>

              <h2 style={{ fontSize: '21px', fontWeight: 900, color: '#e9d5ff', marginBottom: '10px', lineHeight: 1.3 }}>
                プロAIアフィリエイター<br />養成講座
              </h2>
              <p style={{ color: '#c4b5fd', fontSize: '13px', lineHeight: 1.85, marginBottom: '20px' }}>
                方向性はもう決まっている。<br />
                あとは「どう動くか」だけ。<br />
                14日間で紹介導線を一気に完成させます。
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {['✅ 1日1時間 × 14日で導線完成', '✅ AIで作業効率3倍以上', '✅ Day5で初報酬チャレンジ', '✅ 案件停止に強い複数導線設計'].map(t => (
                  <li key={t} style={{ color: '#e9d5ff', fontSize: '13px', fontWeight: 600 }}>{t}</li>
                ))}
              </ul>

              {/* 価格 */}
              <div style={{
                background: 'rgba(168,85,247,.18)', border: '1px solid rgba(168,85,247,.4)',
                borderRadius: '14px', padding: '14px 16px', marginBottom: '22px', textAlign: 'center',
              }}>
                <p style={{ color: '#c4b5fd', fontSize: '11px', margin: '0 0 6px' }}>スタート講座1,000部達成プロジェクト限定</p>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ color: '#9ca3af', fontSize: '13px', textDecoration: 'line-through' }}>¥99,800</span>
                  <span style={{ color: '#f0abfc', fontSize: '34px', fontWeight: 900 }}>¥4,980</span>
                  <span style={{ color: '#c4b5fd', fontSize: '13px' }}>〜</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
                  <span>先着30名 → ¥4,980 ｜ 31〜100名 → ¥9,800</span>
                  <span>101〜500名 → ¥29,800 ｜ 501〜1,000名 → ¥49,800</span>
                  <span style={{ color: '#f0abfc', fontWeight: 700, marginTop: '2px' }}>⚡ 販売数が増えると自動値上がり</span>
                </div>
              </div>

              <div className="glow-purple" style={{
                background: 'linear-gradient(90deg,#a855f7,#ec4899)',
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
              background: 'linear-gradient(145deg,rgba(251,191,36,.12) 0%,rgba(249,115,22,.1) 100%)',
              border: '1.5px solid rgba(251,191,36,.45)',
              borderRadius: '28px', padding: '32px 24px',
            }}>
              <div style={{
                display: 'inline-block',
                background: 'linear-gradient(90deg,#f59e0b,#f97316)',
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
                background: 'rgba(251,191,36,.12)', border: '1px solid rgba(251,191,36,.35)',
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
                background: 'linear-gradient(90deg,#f59e0b,#f97316)',
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
            background: 'rgba(255,255,255,.04)',
            borderRadius: '18px', border: '1px solid rgba(255,255,255,.08)',
          }}>
            <p style={{ color: '#d1d5db', fontSize: '14px', lineHeight: 1.8 }}>
              💡 <strong style={{ color: '#e9d5ff' }}>迷ったら養成講座がおすすめです。</strong><br />
              スタート講座の基礎内容も含まれており、今が歴史上最安値。<br />
              <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                スタート講座1,000部達成後は通常価格（¥99,800）に移行します。
              </span>
            </p>
          </div>
        </section>

        {/* ══ 声 ══ */}
        <section style={{ padding: '0 16px 64px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#4b5563', fontSize: '12px', marginBottom: '16px', letterSpacing: '.1em' }}>── 受講者の声 ──</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { text: 'noteを読んですぐ申し込みました。Day5で初クリックが取れて感動しました！', name: '20代・会社員' },
              { text: '方向性が決まってなかったのでスタート講座から。やりたいことが明確になりました。', name: '30代・主婦' },
              { text: '今が一番安いと聞いて養成講座にしました。後回しにしなくてよかったです。', name: '40代・フリーランス' },
            ].map((v, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)',
                borderRadius: '16px', padding: '16px 20px', textAlign: 'left',
              }}>
                <p style={{ color: '#e5e7eb', fontSize: '13px', lineHeight: 1.75, marginBottom: '8px' }}>「{v.text}」</p>
                <p style={{ color: '#6b7280', fontSize: '11px' }}>— {v.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* footer */}
        <footer style={{
          borderTop: '1px solid rgba(255,255,255,.07)',
          padding: '20px', textAlign: 'center',
          color: '#374151', fontSize: '11px',
        }}>
          © MIO AI LIFE DESIGN
        </footer>
      </div>
    </div>
  );
}
