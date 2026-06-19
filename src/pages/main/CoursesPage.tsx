import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/main/MainLayout';
import { FadeIn } from '@/components/main/FadeIn';

export function CoursesPage() {
  return (
    <MainLayout>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shimmer-btn {
          background: linear-gradient(90deg, #f59e0b, #ef4444, #f59e0b);
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }
        .card-hover { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .card-hover:hover { transform: translateY(-6px); box-shadow: 0 24px 50px rgba(0,0,0,0.13); }
      `}</style>

      {/* ページヘッダー */}
      <section className="relative overflow-hidden pb-20 pt-16 md:pt-20"
        style={{ background: 'linear-gradient(160deg, #fffbeb 0%, #fef9c3 50%, #fde68a 100%)' }}>
        {/* 浮かぶデコ */}
        <span className="absolute top-6 right-8 text-6xl opacity-10 select-none" style={{ animation: 'float 5s ease-in-out infinite' }}>📚</span>
        <span className="absolute bottom-10 left-6 text-5xl opacity-10 select-none" style={{ animation: 'float 4s ease-in-out infinite 1s' }}>🎓</span>
        <div className="absolute top-12 left-1/4 w-16 h-16 rounded-full opacity-20" style={{ background: '#fcd34d', animation: 'float 3.5s ease-in-out infinite 0.5s', filter: 'blur(4px)' }} />
        <div className="absolute bottom-8 right-1/3 w-10 h-10 rounded-full opacity-20" style={{ background: '#fb923c', animation: 'float 4.5s ease-in-out infinite 1.2s', filter: 'blur(3px)' }} />

        <div className="max-w-4xl mx-auto px-5 md:px-8 text-center relative z-10">
          <FadeIn>
            <div className="inline-flex items-center gap-2 text-xs font-black px-5 py-2.5 rounded-full mb-5 shadow-md"
              style={{ background: 'linear-gradient(135deg, #fef3c7, #fcd34d)', color: '#78350f', border: '1.5px solid #f59e0b' }}>
              🎓 Courses
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">提供中の講座</h1>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed">
              AI・SNS・収益化・仕組み化を通して、<br className="hidden md:block" />
              自分の人生を自分で動かすための学びを届けています。
            </p>
          </FadeIn>
        </div>

        {/* ウェーブ */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 50" preserveAspectRatio="none" className="w-full h-12 block">
            <path d="M0,30 C360,0 1080,60 1440,20 L1440,50 L0,50 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* 講座一覧 */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-5 md:px-8 space-y-8">

          {/* 講座1 */}
          <FadeIn>
            <div className="card-hover rounded-3xl overflow-hidden border-2 border-amber-200 shadow-lg">
              <div className="grid md:grid-cols-5">
                {/* 画像エリア */}
                <div className="md:col-span-2 relative flex items-end justify-center pt-8 pb-0 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7, #fde68a)', minHeight: 200 }}>
                  <span className="absolute top-4 right-4 text-4xl opacity-20 select-none">⏰</span>
                  <span className="absolute top-4 left-4 text-3xl opacity-20 select-none">💡</span>
                  {/* リボン */}
                  <div className="absolute top-4 right-0 bg-red-500 text-white text-[10px] font-black px-4 py-1 rounded-l-full shadow-md">
                    🔥 人気 No.1
                  </div>
                  <img
                    src="/images/mio_pc.png"
                    alt="AI副業講座"
                    className="h-48 object-contain relative z-10"
                    style={{ mixBlendMode: 'multiply', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.1))' }}
                  />
                </div>
                {/* テキストエリア */}
                <div className="md:col-span-3 p-7 md:p-9 flex flex-col">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-xs font-black text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">副業・収益化</span>
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">初心者OK</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-3">AI副業1日1時間化スタート講座</h2>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1">
                    忙しくても、睡眠時間を削り続けずに副業を進めたい方向けの講座です。AIを使って自分に合った収益化ルートを見つけ、SNS発信・商品設計・導線づくり・作業効率化を進めながら、1日1時間でも前に進める仕組みを作ります。
                  </p>
                  <div className="bg-amber-50 rounded-2xl px-4 py-2.5 mb-4 border border-amber-100 w-fit">
                    <p className="text-2xl font-black text-amber-600">¥29,800<span className="text-sm font-normal text-gray-500">（税込）</span></p>
                  </div>
                  <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
                    ※成果には個人差があります。収益を保証するものではありません。
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link to="/courses/ai-1hour-start"
                      className="flex-1 text-center py-3 px-6 rounded-full bg-gray-900 text-white text-sm font-black hover:bg-gray-700 transition-colors shadow-md">
                      詳しく見る →
                    </Link>
                    <a href="https://buy.stripe.com/7sY8wO0DTgRU7UodB03sI00" target="_blank" rel="noopener noreferrer"
                      className="shimmer-btn flex-1 text-center py-3 px-6 rounded-full text-white text-sm font-black shadow-md">
                      🛒 購入ページへ
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* 講座2 */}
          <FadeIn delay={120}>
            <div className="card-hover rounded-3xl overflow-hidden border-2 border-violet-200 shadow-lg">
              <div className="grid md:grid-cols-5">
                {/* 画像エリア */}
                <div className="md:col-span-2 relative flex items-end justify-center pt-8 pb-0 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe, #ddd6fe)', minHeight: 200 }}>
                  <span className="absolute top-4 right-4 text-4xl opacity-20 select-none">💎</span>
                  <span className="absolute top-4 left-4 text-3xl opacity-20 select-none">🎯</span>
                  <div className="absolute top-4 right-0 bg-violet-500 text-white text-[10px] font-black px-4 py-1 rounded-l-full shadow-md">
                    💜 お手頃価格
                  </div>
                  <img
                    src="/images/mio_good.png"
                    alt="アフィリエイト講座"
                    className="h-48 object-contain relative z-10"
                    style={{ mixBlendMode: 'multiply', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.1))' }}
                  />
                </div>
                {/* テキストエリア */}
                <div className="md:col-span-3 p-7 md:p-9 flex flex-col">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-xs font-black text-violet-700 bg-violet-100 px-3 py-1 rounded-full border border-violet-200">アフィリエイト</span>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">実践形式</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-3">プロAIアフィリエイター養成講座</h2>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1">
                    ASPアフィリエイト、楽天アフィリエイトを含む物販系アフィリエイト、コンテンツアフィリエイト、SNS発信、成約導線を実践形式で学ぶ講座です。案件に振り回されず、自分の発信力で収益を作れる力を育てます。
                  </p>
                  <div className="bg-violet-50 rounded-2xl px-4 py-2.5 mb-4 border border-violet-100 w-fit">
                    <p className="text-2xl font-black text-violet-600">¥4,980<span className="text-sm font-normal text-gray-500">（税込）</span></p>
                  </div>
                  <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
                    ※成果には個人差があります。収益を保証するものではありません。<br />
                    ※アフィリエイトリンクを使用する場合があります。
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link to="/courses/pro-ai-affiliate"
                      className="flex-1 text-center py-3 px-6 rounded-full bg-gray-900 text-white text-sm font-black hover:bg-gray-700 transition-colors shadow-md">
                      詳しく見る →
                    </Link>
                    <a href="https://buy.stripe.com/28E4gycmB6dga2w9kK3sI03" target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-center py-3 px-6 rounded-full text-white text-sm font-black transition-all shadow-md"
                      style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                      🛒 購入ページへ
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14" style={{ background: 'linear-gradient(135deg, #fef9c3, #fde68a)' }}>
        <div className="max-w-2xl mx-auto px-5 md:px-8 text-center">
          <FadeIn>
            <div className="text-4xl mb-4" style={{ animation: 'float 3s ease-in-out infinite' }}>🤔</div>
            <p className="text-gray-800 font-bold text-base mb-2">どの講座が合っているか迷っている方へ</p>
            <p className="text-gray-600 text-sm mb-6">お気軽にご相談ください。あなたに合ったルートを一緒に考えます。</p>
            <Link to="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gray-900 text-white font-black text-sm hover:bg-gray-700 hover:-translate-y-1 transition-all shadow-xl">
              ✉️ お問い合わせする
            </Link>
          </FadeIn>
        </div>
      </section>
    </MainLayout>
  );
}
