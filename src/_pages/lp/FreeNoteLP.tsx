// src/pages/lp/FreeNoteLP.tsx
// 無料note配布クッションLP
// note未読者 → LINE登録 → 「本気」送信 → noteURL受け取り → cushion-lp へ

import { useEffect } from 'react';

export function FreeNoteLP() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{
      fontFamily: "'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif",
      background: 'linear-gradient(160deg,#0a0a0f 0%,#12101a 40%,#0d0a14 100%)',
      minHeight: '100vh',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes twinkle{0%,100%{opacity:.1}50%{opacity:.6}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes pulse-green{0%,100%{box-shadow:0 0 24px rgba(6,199,85,.4)}50%{box-shadow:0 0 56px rgba(6,199,85,.8),0 0 80px rgba(6,199,85,.2)}}
        @keyframes badge-pop{0%{transform:scale(.8);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
        @keyframes slide-up{0%{transform:translateY(24px);opacity:0}100%{transform:translateY(0);opacity:1}}
        @keyframes neko-bounce{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-8px) rotate(2deg)}}
        @keyframes reveal{0%{opacity:0;transform:translateY(16px)}100%{opacity:1;transform:translateY(0)}}
        .star{position:absolute;border-radius:50%;background:rgba(167,139,250,.25)}
        .neko-float{animation:neko-bounce 3s ease-in-out infinite}
        .shimmer-text{
          background:linear-gradient(90deg,#fff 0%,#c4b5fd 40%,#a78bfa 60%,#fff 100%);
          background-size:200% auto;
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
          animation:shimmer 3.5s linear infinite;
        }
        .badge-anim{animation:badge-pop .7s cubic-bezier(.34,1.56,.64,1) forwards}
        .slide-up{animation:slide-up .8s ease forwards}
        .glow-green{animation:pulse-green 2.5s ease-in-out infinite}
        .line-btn{transition:all .2s ease;text-decoration:none;display:block}
        .line-btn:hover{opacity:.88;transform:translateY(-2px)}
        .reveal{animation:reveal .9s ease forwards}
        .check-item{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid rgba(167,139,250,.1)}
        .check-item:last-child{border-bottom:none}
      `}</style>

      {/* 背景粒子 */}
      {Array.from({length: 18}).map((_, i) => (
        <span key={i} className="star" style={{
          width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`,
          top: `${(i * 41) % 100}%`, left: `${(i * 59) % 100}%`,
          animation: `twinkle ${2 + (i % 4) * .6}s ${i * .35}s infinite`,
        }} />
      ))}

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '560px', margin: '0 auto', padding: '0 20px' }}>

        {/* ══ HERO ══ */}
        <section style={{ padding: '56px 0 40px', textAlign: 'center' }}>

          <div className="neko-float" style={{ fontSize: '44px', marginBottom: '14px', lineHeight: 1 }}>🐱</div>

          <div className="badge-anim" style={{
            display: 'inline-block',
            background: 'linear-gradient(90deg,#7c3aed,#6d28d9)',
            borderRadius: '999px', padding: '6px 20px',
            fontSize: '12px', fontWeight: 800, marginBottom: '24px', letterSpacing: '.05em',
          }}>
            ✨ 完全無料・今すぐ読める
          </div>

          <h1 style={{ fontSize: 'clamp(22px,6vw,36px)', fontWeight: 900, lineHeight: 1.3, marginBottom: '16px' }}>
            <span className="shimmer-text">
              AIに紹介文を書かせても<br />
              売れない理由、知ってますか？
            </span>
          </h1>

          <p style={{ color: '#c4b5fd', fontSize: '15px', lineHeight: 1.85, marginBottom: '8px' }}>
            売れない原因は、才能でも文章力でもない。<br />
            <strong style={{ color: '#fff' }}>ある「設計」が抜けているだけでした。</strong>
          </p>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '0' }}>
            ── みおが実体験をもとに書いた無料note ──
          </p>
        </section>

        {/* ══ note内容ティザー ══ */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{
            background: 'linear-gradient(145deg,rgba(124,58,237,.12) 0%,rgba(15,10,25,.7) 100%)',
            border: '1.5px solid rgba(167,139,250,.3)',
            borderRadius: '24px', padding: '28px 24px',
          }}>
            <p style={{ color: '#a78bfa', fontSize: '11px', fontWeight: 800, letterSpacing: '.1em', textAlign: 'center', marginBottom: '20px' }}>
              📖 このnoteで分かること
            </p>

            <div className="check-item">
              <span style={{ fontSize: '18px', flexShrink: 0 }}>🧠</span>
              <span style={{ color: '#e9d5ff', fontSize: '13px', lineHeight: 1.75 }}>
                多くの人が最初にやる「案件の選び方」が、じつは逆効果な理由
              </span>
            </div>
            <div className="check-item">
              <span style={{ fontSize: '18px', flexShrink: 0 }}>🔗</span>
              <span style={{ color: '#e9d5ff', fontSize: '13px', lineHeight: 1.75 }}>
                リンクを貼る前に勝負は決まっている──その「前段階」とは？
              </span>
            </div>
            <div className="check-item">
              <span style={{ fontSize: '18px', flexShrink: 0 }}>🤖</span>
              <span style={{ color: '#e9d5ff', fontSize: '13px', lineHeight: 1.75 }}>
                AIに文章を書かせると薄くなる。最初にAIに頼むべき「別のこと」
              </span>
            </div>
            <div className="check-item">
              <span style={{ fontSize: '18px', flexShrink: 0 }}>📅</span>
              <span style={{ color: '#e9d5ff', fontSize: '13px', lineHeight: 1.75 }}>
                3日間で紹介の流れを体験できる、初心者向け実践ロードマップ
              </span>
            </div>
            <div className="check-item">
              <span style={{ fontSize: '18px', flexShrink: 0 }}>💬</span>
              <span style={{ color: '#e9d5ff', fontSize: '13px', lineHeight: 1.75 }}>
                実績がなくても信用される紹介と、実績があっても信用されない紹介の違い
              </span>
            </div>

            <div style={{
              marginTop: '20px',
              background: 'rgba(124,58,237,.12)',
              borderRadius: '12px', padding: '14px 16px',
              textAlign: 'center',
            }}>
              <p style={{ color: '#c4b5fd', fontSize: '12px', lineHeight: 1.8, margin: 0 }}>
                「なんでAIで書いたのに売れないんだろう？」<br />
                <strong style={{ color: '#fff' }}>その答え、このnoteに全部書きました。</strong><br />
                <span style={{ color: '#6b7280', fontSize: '11px' }}>無料 ・ 読了目安10〜15分</span>
              </p>
            </div>
          </div>
        </section>

        {/* ══ みお紹介 ══ */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            background: 'rgba(255,255,255,.03)',
            border: '1px solid rgba(167,139,250,.15)',
            borderRadius: '20px', padding: '20px',
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '26px', flexShrink: 0,
            }}>🐱</div>
            <div>
              <p style={{ color: '#a78bfa', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>著者</p>
              <p style={{ color: '#fff', fontSize: '15px', fontWeight: 900, marginBottom: '4px' }}>みお</p>
              <p style={{ color: '#9ca3af', fontSize: '12px', lineHeight: 1.7 }}>
                AIを使った副業1時間化を研究・実践中。<br />
                自分の経験をもとに、初心者が迷わず動けるロードマップを発信しています🐱
              </p>
            </div>
          </div>
        </section>

        {/* ══ LINE CTA ══ */}
        <section style={{ marginBottom: '48px' }}>
          <div style={{
            background: 'linear-gradient(145deg,rgba(6,199,85,.1) 0%,rgba(10,15,10,.7) 100%)',
            border: '1.5px solid rgba(6,199,85,.35)',
            borderRadius: '28px', padding: '32px 24px',
            textAlign: 'center',
          }}>
            <p style={{ color: '#6ee7b7', fontSize: '13px', fontWeight: 800, letterSpacing: '.05em', marginBottom: '12px' }}>
              📩 受け取り方
            </p>
            <p style={{ color: '#fff', fontSize: '18px', fontWeight: 900, lineHeight: 1.5, marginBottom: '8px' }}>
              公式LINEに登録して<br />
              <span style={{ color: '#4ade80', fontSize: '22px' }}>「本気」</span>
              と送るだけ🐱
            </p>
            <p style={{ color: '#6b7280', fontSize: '12px', lineHeight: 1.75, marginBottom: '28px' }}>
              登録後すぐにnoteのURLが届きます<br />
              無料・いつでも解除OK
            </p>

            <a
              href="https://lin.ee/sSD9W7a"
              target="_blank"
              rel="noopener noreferrer"
              className="line-btn glow-green"
              style={{
                background: '#06C755',
                borderRadius: '18px', padding: '18px 24px',
                color: '#fff', fontWeight: 900, fontSize: '17px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="48" rx="12" fill="#06C755"/>
                <path d="M24 8C15.163 8 8 14.373 8 22.25c0 7.089 6.29 13.04 14.786 14.066.576.124 1.36.38 1.558.87.178.446.116 1.145.057 1.596l-.252 1.512c-.077.447-.354 1.748 1.531.953 1.885-.795 10.17-5.99 13.876-10.26C41.474 28.56 40 25.535 40 22.25 40 14.373 32.837 8 24 8z" fill="white"/>
                <path d="M34.5 25.5h-4a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5V24h2.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5zM19.5 25.5h-4a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v6h2.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5zM22 18h1a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5zM28.5 25.5h-1a.5.5 0 0 1-.41-.21l-3-4.5V25a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5h1c.16 0 .31.075.41.21l3 4.5V18.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5z" fill="#06C755"/>
              </svg>
              LINEで「本気」と送って受け取る →
            </a>

            {/* ステップ表示 */}
            <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { step: '①', label: 'LINEを追加' },
                { step: '→', label: '' },
                { step: '②', label: '「本気」と送る' },
                { step: '→', label: '' },
                { step: '③', label: 'URLが届く' },
              ].map((s, i) => s.step === '→' ? (
                <span key={i} style={{ color: '#374151', fontSize: '14px' }}>→</span>
              ) : (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{
                    background: 'rgba(6,199,85,.15)',
                    borderRadius: '10px', padding: '6px 12px',
                    fontSize: '11px', color: '#4ade80', fontWeight: 800,
                  }}>
                    {s.step} {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ 読んだあとは ══ */}
        <section style={{ marginBottom: '56px' }}>
          <div style={{
            background: 'rgba(251,146,60,.06)',
            border: '1px solid rgba(251,146,60,.2)',
            borderRadius: '20px', padding: '22px 20px',
            textAlign: 'center',
          }}>
            <p style={{ color: '#fb923c', fontSize: '13px', fontWeight: 800, marginBottom: '8px' }}>
              📖 noteを読んだあとは…
            </p>
            <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: 1.8 }}>
              noteの最後に、次のステップへの案内があります。<br />
              アフィリエイトを実践したい方は<br />
              そのまま講座ページへどうぞ🐱
            </p>
          </div>
        </section>

        {/* footer */}
        <footer style={{
          borderTop: '1px solid rgba(167,139,250,.1)',
          padding: '20px 0', textAlign: 'center',
          color: '#374151', fontSize: '11px', marginBottom: '20px',
        }}>
          © MIO AI LIFE DESIGN
        </footer>

      </div>
    </div>
  );
}
