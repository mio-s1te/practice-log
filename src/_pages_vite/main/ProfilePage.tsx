import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/main/MainLayout';
import { FadeIn } from '@/components/main/FadeIn';

export function ProfilePage() {
  return (
    <MainLayout>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* ===== HERO ===== */}
      <section className="relative pt-28 pb-20 bg-white">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* キャラクター画像 */}
            <FadeIn className="flex justify-center">
              <div className="relative" style={{ width: 280, height: 320 }}>
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

            {/* プロフィール */}
            <FadeIn delay={100}>
              <div className="inline-flex items-center gap-2 bg-pink-100 text-pink-800 text-xs font-black px-5 py-2 rounded-full mb-4 border border-pink-200">
                🐱 Profile
              </div>
              <h1 className="text-5xl font-black text-gray-900 mb-1">みお</h1>
              <p className="text-amber-600 font-bold text-sm mb-6">AI活用・SNS導線設計・収益化コンサルタント</p>
              <div className="space-y-4 text-gray-700 text-sm md:text-base leading-[1.9]">
                <p>AI活用・SNS導線設計・アフィリエイト実践を通して、個人が自分の時間・収入・働き方を自分で選べるようになるための講座や教材を企画・運営しています。</p>
                <p>これまで、占い鑑定・美容健康・ライブ配信・AI関連など複数の分野で発信・販売を経験。</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ===== QUOTE ===== */}
      <section className="py-14 md:py-18"
        style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}>
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <FadeIn>
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-amber-100">
              <div className="border-l-4 border-amber-400 pl-6 py-2">
                <p className="font-black text-gray-900 leading-relaxed text-lg md:text-xl">
                  「才能がないのではなく、正しい方向性や情報、仕組みを知らないだけで可能性が埋もれてしまっている人があまりにも多い」
                </p>
              </div>
              <p className="mt-5 font-bold text-gray-900 text-sm md:text-base leading-relaxed">
                努力している人が報われ、本気で変わりたい人が一歩踏み出せる場所を作ること。それが活動の軸です。
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ===== HISTORY ===== */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <FadeIn className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 text-xs font-black px-5 py-2 rounded-full mb-4 border border-blue-200">
              📖 History
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900">これまでの経験</h2>
          </FadeIn>
          <div className="space-y-4">
            {[
              { emoji: '🔮', label: '占い鑑定', desc: 'オンラインでの鑑定販売・SNS発信を経験。コンテンツ販売の基礎を習得。' },
              { emoji: '💄', label: '美容・健康', desc: '美容健康ジャンルでのアフィリエイト・物販・発信活動。' },
              { emoji: '📺', label: 'ライブ配信', desc: '配信プラットフォームでの収益化・ファン形成を経験。' },
              { emoji: '🤖', label: 'AI活用・講座運営', desc: 'AIを活用した副業設計・収益化の仕組みを体系化。講座・教材の企画・運営を本格化。' },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="flex items-start gap-4 bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <span className="text-3xl flex-shrink-0">{item.emoji}</span>
                  <div>
                    <p className="font-black text-gray-900 text-sm mb-1">{item.label}</p>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SNS ===== */}
      <section className="py-14 md:py-16"
        style={{ background: 'linear-gradient(135deg, #fdf4ff 0%, #ede9fe 100%)' }}>
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <FadeIn>
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 text-xs font-black px-5 py-2 rounded-full mb-5 border border-purple-200">
              📱 SNS
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-8">フォローしてね！</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="https://lin.ee/sSD9W7a" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full text-white font-black text-sm shadow-lg hover:-translate-y-1 transition-all"
                style={{ background: 'linear-gradient(135deg, #06C755, #04a844)' }}>
                💬 公式LINEに登録する
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-16 md:py-20"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
        <div className="max-w-2xl mx-auto px-5 md:px-8 text-center">
          <FadeIn>
            <p className="text-white/70 text-sm mb-3">みおの講座で学ぼう</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-8">あなたの可能性を、一緒に広げよう</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/courses"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full text-gray-900 font-black text-sm shadow-lg hover:-translate-y-1 transition-all"
                style={{ background: 'linear-gradient(135deg, #fcd34d, #f59e0b)' }}>
                📚 講座一覧を見る →
              </Link>
              <Link to="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full text-white font-black text-sm border-2 border-white/30 hover:border-white/60 hover:-translate-y-1 transition-all">
                ✉️ お問い合わせ
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </MainLayout>
  );
}
