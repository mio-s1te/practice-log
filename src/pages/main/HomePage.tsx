import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/main/MainLayout';
import { FadeIn } from '@/components/main/FadeIn';

const TODO_CONTACT_LINE = 'TODO_REPLACE_CONTACT_LINE_URL';

// 無料講座URL
const FREE_URL_START     = 'https://melodic-pony-33c4e9.netlify.app/';
const FREE_URL_AFFILIATE = 'https://note.com/preview/nae846da021d3?prev_access_key=ed5d20e9748fb66b4cf5008fb7a56677';

/* ── 無料講座選択モーダル ── */
function FreeCourseModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-7 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none"
          aria-label="閉じる"
        >×</button>

        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎁</div>
          <h2 className="text-xl font-black text-gray-900 mb-1">無料講座を選んでね</h2>
          <p className="text-gray-500 text-sm">どちらの講座の無料版を見ますか？</p>
        </div>

        <div className="flex flex-col gap-4">
          <a
            href={FREE_URL_START}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-4 rounded-2xl border-2 border-amber-200 bg-amber-50 hover:border-amber-400 hover:bg-amber-100 transition-all p-4"
          >
            <span className="text-3xl flex-shrink-0 mt-0.5">🚀</span>
            <div>
              <p className="font-black text-gray-900 text-sm group-hover:text-amber-700 transition-colors">
                AIスタート講座の無料セミナー
              </p>
              <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                副業の設計・収益化の土台を学ぶ<br />初心者向け無料講座
              </p>
            </div>
            <span className="ml-auto text-amber-400 text-xl flex-shrink-0 mt-1">→</span>
          </a>

          <a
            href={FREE_URL_AFFILIATE}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-4 rounded-2xl border-2 border-orange-200 bg-orange-50 hover:border-orange-400 hover:bg-orange-100 transition-all p-4"
          >
            <span className="text-3xl flex-shrink-0 mt-0.5">📣</span>
            <div>
              <p className="font-black text-gray-900 text-sm group-hover:text-orange-700 transition-colors">
                アフィリエイト養成講座の無料講義
              </p>
              <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                AIアフィリエイターになるための<br />無料プレビュー講義（note）
              </p>
            </div>
            <span className="ml-auto text-orange-400 text-xl flex-shrink-0 mt-1">→</span>
          </a>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full text-center text-gray-400 text-sm hover:text-gray-600 transition-colors"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

/* ── ウェーブ区切り ── */
function WaveBottom({ fill }: { fill: string }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
      <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-full h-14 md:h-20 block">
        <path d="M0,40 C360,0 1080,80 1440,20 L1440,60 L0,60 Z" fill={fill} />
      </svg>
    </div>
  );
}
function WaveTop({ fill }: { fill: string }) {
  return (
    <div className="absolute top-0 left-0 right-0 overflow-hidden leading-none">
      <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-full h-14 md:h-20 block">
        <path d="M0,20 C360,80 1080,0 1440,40 L1440,0 L0,0 Z" fill={fill} />
      </svg>
    </div>
  );
}

/* ── 画像ラッパー（白背景ゴースト防止） ── */
function MioImage({ src, alt, className, style }: { src: string; alt: string; className?: string; style?: React.CSSProperties }) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ ...style, imageRendering: 'auto', mixBlendMode: 'normal' }}
      decoding="async"
    />
  );
}

export function HomePage() {
  const [showFreeModal, setShowFreeModal] = useState(false);
  return (
    <MainLayout>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-16px); }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-10px) rotate(5deg); }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes popIn {
          0%   { transform: scale(0.8); opacity: 0; }
          80%  { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes bounceGlow {
          0%, 100% { box-shadow: 0 0 20px 4px rgba(251,191,36,0.4); }
          50%       { box-shadow: 0 0 40px 10px rgba(251,191,36,0.7); }
        }
        .shimmer-text {
          background: linear-gradient(90deg, #f59e0b, #ef4444, #a855f7, #3b82f6, #10b981, #f59e0b);
          background-size: 300% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .card-hover:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0,0,0,0.12);
        }
        .card-hover { transition: transform 0.3s ease, box-shadow 0.3s ease; }
      `}</style>

      {/* ========== HERO ========== */}
      <section className="relative overflow-hidden pb-24"
        style={{ background: 'linear-gradient(160deg, #fffbf0 0%, #fff7e6 35%, #fef3c7 65%, #fffbeb 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>

        {/* 浮かぶ装飾バブル */}
        <div className="absolute top-10 left-4 w-24 h-24 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #fcd34d, #f97316)', animation: 'float 4s ease-in-out infinite', filter: 'blur(2px)' }} />
        <div className="absolute top-1/3 right-4 w-16 h-16 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, #fb7185, #f59e0b)', animation: 'float 5s ease-in-out infinite 1s', filter: 'blur(2px)' }} />
        <div className="absolute bottom-32 left-12 w-12 h-12 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #86efac, #34d399)', animation: 'float 3.5s ease-in-out infinite 0.5s' }} />
        <div className="absolute bottom-20 right-16 w-20 h-20 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #c4b5fd, #818cf8)', animation: 'float 4.5s ease-in-out infinite 1.5s', filter: 'blur(2px)' }} />
        <div className="absolute top-20 right-1/4 w-8 h-8 rounded-full opacity-40" style={{ background: '#fcd34d', animation: 'float 3s ease-in-out infinite 0.8s' }} />

        {/* キラキラ星 */}
        <span className="absolute top-16 right-1/3 text-3xl select-none" style={{ animation: 'floatSlow 6s ease-in-out infinite', opacity: 0.5 }}>✦</span>
        <span className="absolute bottom-40 left-1/4 text-2xl select-none" style={{ animation: 'spinSlow 10s linear infinite', opacity: 0.3 }}>✦</span>
        <span className="absolute top-1/2 right-8 text-xl select-none" style={{ animation: 'floatSlow 7s ease-in-out infinite 2s', opacity: 0.3 }}>✦</span>

        <div className="relative z-10 w-full max-w-6xl mx-auto px-5 md:px-8 py-20 grid md:grid-cols-2 gap-8 items-center">
          {/* テキスト */}
          <FadeIn>
            {/* バッジ */}
            <div className="inline-flex items-center gap-2 text-xs font-black px-5 py-2.5 rounded-full mb-6 shadow-md"
              style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#92400e', border: '1.5px solid #fcd34d' }}>
              <span style={{ animation: 'float 2s ease-in-out infinite' }}>🐱</span>
              MIO AI LIFE DESIGN
            </div>

            {/* キャッチコピー */}
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-[1.25] mb-5">
              AIを使える人から、<br />
              <span className="relative inline-block">
                <span className="shimmer-text">人生の主導権</span>
              </span>
              を<br />取り戻す人へ。
            </h1>
            <p className="text-gray-600 text-base md:text-lg leading-relaxed mb-2">
              時間がない。お金がない。自信がない。経験がない。
            </p>
            <p className="text-gray-800 font-bold text-base mb-7">
              そんな理由で可能性を小さくしてきた毎日に、もう終止符を打つ。
            </p>

            {/* CTAボタン */}
            {showFreeModal && <FreeCourseModal onClose={() => setShowFreeModal(false)} />}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <button
                onClick={() => setShowFreeModal(true)}
                className="inline-flex justify-center items-center gap-2 px-7 py-4 rounded-full font-black text-sm text-white shadow-lg hover:-translate-y-1 transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', boxShadow: '0 4px 20px rgba(245,158,11,0.4)' }}>
                🎁 無料講座を見る
              </button>
              <Link to="/courses"
                className="inline-flex justify-center items-center gap-2 px-7 py-4 rounded-full border-2 border-gray-900 text-gray-900 font-bold text-sm hover:bg-gray-900 hover:text-white transition-all duration-200">
                📚 講座一覧を見る
              </Link>
            </div>
            <p className="text-[11px] text-gray-400">※成果を保証するものではありません。個人差があります。</p>
          </FadeIn>

          {/* みおちゃんヒーロー */}
          <FadeIn delay={200} className="flex justify-center items-end relative">
            {/* 大きなグロー円 */}
            <div className="absolute rounded-full"
              style={{
                width: 320, height: 320,
                background: 'radial-gradient(circle, rgba(253,211,77,0.5) 0%, rgba(251,146,60,0.3) 50%, transparent 75%)',
                animation: 'bounceGlow 3s ease-in-out infinite',
                filter: 'blur(8px)',
              }} />
            {/* 星・絵文字デコ */}
            <span className="absolute text-4xl select-none" style={{ top: 8, right: 24, animation: 'float 2.5s ease-in-out infinite' }}>⭐</span>
            <span className="absolute text-3xl select-none" style={{ top: 64, left: 8, animation: 'float 3.5s ease-in-out infinite 0.8s' }}>💡</span>
            <span className="absolute text-3xl select-none" style={{ bottom: 16, right: 8, animation: 'float 3s ease-in-out infinite 0.3s' }}>🚀</span>
            <span className="absolute text-2xl select-none" style={{ bottom: 32, left: 16, animation: 'float 4s ease-in-out infinite 1.2s' }}>✨</span>

            {/* キャラ画像（mix-blend-mode: multiply で白抜き確実除去） */}
            <div className="relative" style={{ animation: 'float 3.5s ease-in-out infinite' }}>
              <img
                src="/images/mio_hero.png"
                alt="みお"
                className="w-64 md:w-80 lg:w-96 relative z-10"
                style={{ mixBlendMode: 'multiply', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.15))' }}
              />
            </div>
          </FadeIn>
        </div>

        <WaveBottom fill="#f0fdf4" />
      </section>

      {/* ========== CONCEPT ========== */}
      <section id="concept" className="relative pt-20 pb-28"
        style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #dcfce7 50%, #d1fae5 100%)' }}>
        <WaveTop fill="#fef9c3" />
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <FadeIn>
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 text-xs font-black px-5 py-2.5 rounded-full mb-5 shadow-sm border border-emerald-200">
              🌱 Our Vision
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-10">私たちが目指す未来</h2>
          </FadeIn>
          <FadeIn delay={100}>
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-md border border-emerald-100 text-left space-y-5 relative overflow-hidden">
              {/* デコ */}
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #34d399, #059669)', transform: 'translate(30%, -30%)' }} />
              <p className="text-gray-700 text-base md:text-lg leading-[2]">
                私たちが目指しているのは、<strong className="text-gray-900">AIで時間を生み、人が本当に価値あることに集中できる世界</strong>を作ることです。
              </p>
              <p className="text-gray-600 leading-relaxed">
                単調な作業に追われる毎日。不安で動けなくなる時間。可能性を眠らせたまま過ぎていく日々。
                そんな状態から抜け出し、自分の頭で考え、自分の力で選び、自分の未来を動かせる人を増やしたい。
              </p>
              <div className="border-l-4 border-emerald-400 pl-5 bg-emerald-50 py-3 rounded-r-xl">
                <p className="font-black text-gray-900 leading-relaxed text-lg">
                  努力している人が報われ、<br />
                  才能が埋もれたまま終わらない社会を目指しています。
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
        <WaveBottom fill="#fdf4ff" />
      </section>

      {/* ========== FOR YOU ========== */}
      <section className="relative pt-20 pb-28"
        style={{ background: 'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 50%, #ede9fe 100%)' }}>
        <WaveTop fill="#d1fae5" />
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <FadeIn className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 text-xs font-black px-5 py-2.5 rounded-full mb-5 shadow-sm border border-purple-200">
              💜 For You
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">こんな人の力になりたい</h2>
            <p className="text-gray-600 text-base">本気で変わりたい人が、自分の人生を動かせるように。</p>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { emoji: '💪', text: '努力しているのに、なかなか報われない人', bg: 'linear-gradient(135deg, #fef2f2, #ffe4e6)', border: '#fca5a5', shadow: 'rgba(239,68,68,0.15)' },
              { emoji: '✨', text: '才能や経験があるのに、まだ形にできていない人', bg: 'linear-gradient(135deg, #fefce8, #fef9c3)', border: '#fde047', shadow: 'rgba(234,179,8,0.15)' },
              { emoji: '🤖', text: 'AIを触っているけれど、収益化につなげられていない人', bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '#93c5fd', shadow: 'rgba(59,130,246,0.15)' },
              { emoji: '⏰', text: '副業を始めたいけれど、時間がなくて続かない人', bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '#86efac', shadow: 'rgba(34,197,94,0.15)' },
              { emoji: '📱', text: 'SNS発信をしているけれど、収益につながっていない人', bg: 'linear-gradient(135deg, #fdf2f8, #fce7f3)', border: '#f9a8d4', shadow: 'rgba(236,72,153,0.15)' },
              { emoji: '🌍', text: '好きな場所で、好きな働き方を選べるようになりたい人', bg: 'linear-gradient(135deg, #f0fdfa, #ccfbf1)', border: '#5eead4', shadow: 'rgba(20,184,166,0.15)' },
              { emoji: '🌟', text: '収入のために、夢や大切なものを諦めたくない人', bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '#fcd34d', shadow: 'rgba(245,158,11,0.15)' },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 60}>
                <div className="card-hover rounded-2xl p-5 border flex items-start gap-3 h-full cursor-default"
                  style={{ background: item.bg, borderColor: item.border, borderWidth: 1.5, boxShadow: `0 4px 16px ${item.shadow}` }}>
                  <span className="text-3xl flex-shrink-0" style={{ animation: `float ${3 + i * 0.3}s ease-in-out infinite ${i * 0.2}s` }}>{item.emoji}</span>
                  <p className="text-gray-800 text-sm leading-relaxed font-semibold">{item.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
        <WaveBottom fill="#ffffff" />
      </section>

      {/* ========== SERVICES ========== */}
      <section className="relative pt-20 pb-28 bg-white">
        <WaveTop fill="#ede9fe" />
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <FadeIn className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-xs font-black px-5 py-2.5 rounded-full mb-5 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#92400e', border: '1.5px solid #fcd34d' }}>
              ⚡ Services
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">提供していること</h2>
          </FadeIn>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { num: '01', emoji: '🤖', title: 'AI活用設計', desc: 'AIをただ使うだけで終わらせず、思考整理・投稿作成・リサーチ・導線設計・作業効率化に活かす方法を届けます。', bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '#fcd34d', accent: '#f59e0b' },
              { num: '02', emoji: '📡', title: 'SNS導線設計', desc: 'X、Threads、LINE、note、LPなどを使い、発信から信頼形成、商品販売までの流れを設計します。', bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '#93c5fd', accent: '#3b82f6' },
              { num: '03', emoji: '💰', title: '収益化の土台づくり', desc: '自分に合った収益化ルートと行動設計を整えます。月数万円からその先まで、可能性を広げていく土台を作ります。', bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '#86efac', accent: '#22c55e' },
              { num: '04', emoji: '⚙️', title: '仕組み化・自動化', desc: 'AIやテンプレート、ワーク、GPTsを活用し、頑張り続けるだけではなく、前に進みやすい仕組みを作ります。', bg: 'linear-gradient(135deg, #fdf4ff 0%, #f3e8ff 100%)', border: '#d8b4fe', accent: '#a855f7' },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="card-hover rounded-3xl p-7 border-2 relative overflow-hidden"
                  style={{ background: item.bg, borderColor: item.border }}>
                  {/* 大きな数字のデコ */}
                  <div className="absolute -bottom-4 -right-3 text-8xl font-black opacity-[0.06]" style={{ color: item.accent }}>{item.num}</div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm"
                      style={{ background: 'white', border: `2px solid ${item.border}` }}>
                      {item.emoji}
                    </div>
                    <span className="text-3xl font-black opacity-20" style={{ color: item.accent }}>{item.num}</span>
                  </div>
                  <h3 className="text-lg font-black text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={300}>
            <p className="text-[11px] text-gray-400 text-center mt-6">
              ※収益や成果を保証するものではありません。実践量、経験、ジャンル、発信内容、導線設計などにより結果は異なります。
            </p>
          </FadeIn>
        </div>
        <WaveBottom fill="#fffbeb" />
      </section>

      {/* ========== COURSES ========== */}
      <section className="relative pt-20 pb-28 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #fffbeb 0%, #fef9c3 40%, #fde68a 100%)' }}>
        <WaveTop fill="white" />
        {/* 背景デコ */}
        <span className="absolute top-16 right-8 text-7xl opacity-10 select-none" style={{ animation: 'float 5s ease-in-out infinite' }}>📚</span>
        <span className="absolute bottom-16 left-8 text-6xl opacity-10 select-none" style={{ animation: 'float 4s ease-in-out infinite 1s' }}>🎓</span>

        <div className="max-w-5xl mx-auto px-5 md:px-8 relative z-10">
          <FadeIn className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-xs font-black px-5 py-2.5 rounded-full mb-5 shadow-md"
              style={{ background: 'linear-gradient(135deg, #fef3c7, #fcd34d)', color: '#78350f', border: '1.5px solid #f59e0b' }}>
              🎓 Courses
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">提供中の講座</h2>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 講座1 */}
            <FadeIn>
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-amber-200 card-hover flex flex-col h-full">
                {/* サムネイル部分 */}
                <div className="relative overflow-hidden flex justify-center items-end pt-6 pb-0"
                  style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 60%, #fde68a 100%)', minHeight: 180 }}>
                  <span className="absolute top-4 left-4 text-5xl opacity-20 select-none">⏰</span>
                  <span className="absolute top-4 right-4 text-4xl opacity-20 select-none">💹</span>
                  {/* リボン */}
                  <div className="absolute top-4 right-0 bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-l-full shadow">
                    人気 No.1
                  </div>
                  <img
                    src="/images/mio_pc.png"
                    alt="AI副業講座"
                    className="h-44 object-contain relative z-10"
                    style={{ mixBlendMode: 'multiply', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.1))' }}
                  />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <span className="text-xs font-black text-amber-700 bg-amber-100 px-3 py-1 rounded-full w-fit mb-3 border border-amber-200">副業・収益化</span>
                  <h3 className="text-lg font-black text-gray-900 mb-2">AI副業1日1時間化スタート講座</h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1">
                    忙しくても、睡眠時間を削り続けずに副業を進めたい方向け。
                    AIで自分に合った収益化ルートを見つけ、1日1時間でも前に進める仕組みを作ります。
                  </p>
                  <div className="bg-amber-50 rounded-2xl px-4 py-2 mb-4 border border-amber-100">
                    <p className="text-2xl font-black text-amber-600">¥29,800<span className="text-sm font-normal text-gray-500">（税込）</span></p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link to="/courses/ai-1hour-start"
                      className="text-center py-3 rounded-full bg-gray-900 text-white text-sm font-black hover:bg-gray-700 transition-colors shadow-md">
                      詳しく見る →
                    </Link>
                    <a href="TODO_REPLACE_STRIPE_START_COURSE_URL" target="_blank" rel="noopener noreferrer"
                      className="text-center py-3 rounded-full text-sm font-black transition-all shadow-md"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white' }}>
                      🛒 購入ページへ
                    </a>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* 講座2 */}
            <FadeIn delay={120}>
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-violet-200 card-hover flex flex-col h-full">
                <div className="relative overflow-hidden flex justify-center items-end pt-6 pb-0"
                  style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 60%, #ddd6fe 100%)', minHeight: 180 }}>
                  <span className="absolute top-4 left-4 text-5xl opacity-20 select-none">🎯</span>
                  <span className="absolute top-4 right-4 text-4xl opacity-20 select-none">💎</span>
                  {/* リボン */}
                  <div className="absolute top-4 right-0 bg-violet-500 text-white text-[10px] font-black px-3 py-1 rounded-l-full shadow">
                    お手頃価格
                  </div>
                  <img
                    src="/images/mio_good.png"
                    alt="アフィリエイト講座"
                    className="h-44 object-contain relative z-10"
                    style={{ mixBlendMode: 'multiply', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.1))' }}
                  />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <span className="text-xs font-black text-violet-700 bg-violet-100 px-3 py-1 rounded-full w-fit mb-3 border border-violet-200">アフィリエイト</span>
                  <h3 className="text-lg font-black text-gray-900 mb-2">プロAIアフィリエイター養成講座</h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1">
                    ASP・楽天アフィリエイトをAIで実践形式で学ぶ講座。
                    案件に振り回されず、自分の発信力で収益を作れる力を育てます。
                  </p>
                  <div className="bg-violet-50 rounded-2xl px-4 py-2 mb-4 border border-violet-100">
                    <p className="text-2xl font-black text-violet-600">¥4,980<span className="text-sm font-normal text-gray-500">（税込）</span></p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link to="/courses/pro-ai-affiliate"
                      className="text-center py-3 rounded-full bg-gray-900 text-white text-sm font-black hover:bg-gray-700 transition-colors shadow-md">
                      詳しく見る →
                    </Link>
                    <a href="TODO_REPLACE_STRIPE_AFFILIATE_COURSE_URL" target="_blank" rel="noopener noreferrer"
                      className="text-center py-3 rounded-full text-sm font-black transition-all shadow-md"
                      style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white' }}>
                      🛒 購入ページへ
                    </a>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={240}>
            <p className="text-[11px] text-amber-900/60 text-center mt-6 leading-relaxed bg-white/60 rounded-2xl px-4 py-3 border border-amber-100">
              ※各講座は収益や成果を保証するものではありません。実践内容、作業量、発信媒体、ジャンル、経験値などにより結果は異なります。<br />
              ※アフィリエイトリンクを使用する場合があります。紹介によって報酬を受け取ることがあります。
            </p>
          </FadeIn>
        </div>
        <WaveBottom fill="white" />
      </section>

      {/* ========== PROFILE ========== */}
      <section id="profile" className="relative pt-20 pb-28 bg-white">
        <WaveTop fill="#fde68a" />
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <FadeIn className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-pink-100 text-pink-800 text-xs font-black px-5 py-2.5 rounded-full mb-5 shadow-sm border border-pink-200">
              🐱 Profile
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">代表プロフィール</h2>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-10 items-center">
            <FadeIn className="flex justify-center">
              <div className="relative" style={{ width: 280, height: 320 }}>
                {/* レインボーグロー */}
                <div className="absolute inset-0 rounded-full"
                  style={{
                    background: 'conic-gradient(from 0deg, #fcd34d, #fb923c, #f472b6, #c084fc, #818cf8, #34d399, #fcd34d)',
                    filter: 'blur(20px)',
                    opacity: 0.5,
                    animation: 'spinSlow 8s linear infinite',
                    transform: 'scale(0.9)',
                  }} />
                <img
                  src="/images/mio_wave.png"
                  alt="みお"
                  className="absolute inset-0 w-full h-full object-contain z-10"
                  style={{ mixBlendMode: 'multiply', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.12))', animation: 'float 4s ease-in-out infinite' }}
                />
                {/* フキダシ */}
                <div className="absolute -top-4 -right-8 bg-white rounded-2xl shadow-lg px-4 py-2 text-sm font-black text-gray-800 border-2 border-amber-200 z-20"
                  style={{ animation: 'float 3s ease-in-out infinite 0.5s', whiteSpace: 'nowrap' }}>
                  よろしく！✨
                </div>
                <div className="absolute -bottom-2 -left-8 bg-white rounded-2xl shadow-lg px-3 py-1.5 text-xs font-bold text-gray-700 border-2 border-pink-200 z-20"
                  style={{ animation: 'float 3.5s ease-in-out infinite 1s', whiteSpace: 'nowrap' }}>
                  🐱 猫耳大好き
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={100}>
              <div>
                <h3 className="text-4xl font-black text-gray-900 mb-1">みお</h3>
                <p className="text-amber-600 font-bold text-sm mb-6">AI活用・SNS導線設計・収益化コンサルタント</p>
                <div className="space-y-4 text-gray-700 text-sm md:text-base leading-[1.9]">
                  <p>AI活用・SNS導線設計・アフィリエイト実践を通して、個人が自分の時間・収入・働き方を自分で選べるようになるための講座や教材を企画・運営しています。</p>
                  <p>これまで、占い鑑定・美容健康・ライブ配信・AI関連など複数の分野で発信・販売を経験。</p>
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 rounded-r-2xl p-4">
                    <p className="font-black text-gray-900 leading-relaxed">
                      「才能がないのではなく、正しい方向性や情報、仕組みを知らないだけで可能性が埋もれてしまっている人があまりにも多い」
                    </p>
                  </div>
                  <p className="font-bold text-gray-900">努力している人が報われ、本気で変わりたい人が一歩踏み出せる場所を作ること。それが活動の軸です。</p>
                </div>
                <Link to="/contact"
                  className="mt-6 inline-flex items-center gap-2 px-7 py-3 rounded-full text-white text-sm font-black hover:-translate-y-1 transition-all shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                  お問い合わせする →
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
        <WaveBottom fill="#0f172a" />
      </section>

      {/* ========== WHY ========== */}
      <section className="relative pt-24 pb-28"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
        <WaveTop fill="white" />
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <FadeIn className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/10 text-amber-300 text-xs font-black px-5 py-2.5 rounded-full mb-5 border border-white/20">
              ⭐ Why Choose Us
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white">選ばれる理由</h2>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { emoji: '🔗', title: 'AIを"使える"で終わらせない', desc: '投稿作成や時短だけでなく、収益化・導線・商品設計・行動設計までつなげます。', color: 'rgba(253,211,77,0.15)' },
              { emoji: '🛠️', title: '初心者でも進めやすい実践型', desc: 'ワーク・テンプレート・GPTsを使いながら、実際に形にしていきます。', color: 'rgba(129,140,248,0.15)' },
              { emoji: '📊', title: 'SNSから収益化までを設計', desc: 'X、Threads、LINE、note、LPなどを使い、発信から販売までの流れを整えます。', color: 'rgba(52,211,153,0.15)' },
              { emoji: '🧭', title: '自分に合ったルートを見つける', desc: '誰かの成功法則をそのまま真似するのではなく、その人の経験・強み・生活時間に合った形を設計します。', color: 'rgba(251,146,60,0.15)' },
              { emoji: '🔄', title: '頑張り続けるだけから抜け出す', desc: '根性論ではなく、AIと仕組みを使って、続けやすい働き方を作ります。', color: 'rgba(244,114,182,0.15)' },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 70}>
                <div className="rounded-2xl p-6 border border-white/10 cursor-default transition-all duration-300 hover:border-amber-400/50 hover:scale-[1.02]"
                  style={{ background: item.color, backdropFilter: 'blur(8px)' }}>
                  <span className="text-3xl block mb-3" style={{ animation: `float ${3.5 + i * 0.4}s ease-in-out infinite ${i * 0.3}s` }}>{item.emoji}</span>
                  <h3 className="text-base font-black text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
        <WaveBottom fill="#fef9c3" />
      </section>

      {/* ========== CTA ========== */}
      <section className="relative pt-24 pb-28 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #fef9c3 0%, #fde68a 40%, #fcd34d 100%)' }}>
        <WaveTop fill="#0f172a" />
        {/* 背景のMIOテキスト */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[18rem] font-black text-amber-300/20 select-none leading-none">MIO</span>
        </div>
        {/* 浮かぶデコ */}
        <span className="absolute top-12 left-8 text-4xl opacity-30 select-none" style={{ animation: 'float 3s ease-in-out infinite' }}>💌</span>
        <span className="absolute bottom-12 right-8 text-4xl opacity-30 select-none" style={{ animation: 'float 4s ease-in-out infinite 1s' }}>🌟</span>
        <span className="absolute top-1/2 left-4 text-3xl opacity-20 select-none" style={{ animation: 'floatSlow 5s ease-in-out infinite 0.5s' }}>✨</span>

        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center relative z-10">
          <FadeIn>
            <div className="text-6xl mb-5 inline-block" style={{ animation: 'float 3s ease-in-out infinite' }}>💌</div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-5">
              講座・提携・お仕事の<br className="sm:hidden" />ご相談はこちら
            </h2>
            <p className="text-gray-700 text-sm md:text-base leading-relaxed mb-8">
              講座に関するご質問、提携・紹介制度に関するご相談、<br className="hidden md:block" />
              SNS導線設計・AI活用・講座づくりに関するご相談は以下よりどうぞ。
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/contact"
                className="inline-flex justify-center items-center gap-2 px-8 py-4 rounded-full bg-gray-900 text-white font-black text-sm hover:bg-gray-700 hover:-translate-y-1 transition-all shadow-xl">
                ✉️ お問い合わせする
              </Link>
              <a href={TODO_CONTACT_LINE} target="_blank" rel="noopener noreferrer"
                className="inline-flex justify-center items-center gap-2 px-8 py-4 rounded-full font-black text-sm text-white hover:-translate-y-1 transition-all shadow-xl"
                style={{ background: '#06C755', boxShadow: '0 4px 20px rgba(6,199,85,0.4)' }}>
                💬 LINEで問い合わせる
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

    </MainLayout>
  );
}
