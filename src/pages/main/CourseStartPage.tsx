import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/main/MainLayout';
import { FadeIn } from '@/components/main/FadeIn';

const BUY_URL = 'TODO_REPLACE_STRIPE_START_COURSE_URL';
const FREE_URL = 'TODO_REPLACE_FREE_LINE_OR_FREE_SEMINAR_URL';

export function CourseStartPage() {
  const contents = [
    { emoji: '🧠', text: '成功者と未達者の思考の違い' },
    { emoji: '🗺️', text: '自分に合った収益化ルート設計' },
    { emoji: '📣', text: 'SNS発信と収益導線づくり' },
    { emoji: '🤖', text: 'AIを使った作業効率化' },
    { emoji: '⏰', text: '1日1時間で進めるための行動設計' },
    { emoji: '📋', text: 'ワークシート、ToDo、GPTsの活用' },
    { emoji: '✅', text: '今月・今週・今日の行動への落とし込み' },
  ];

  const targets = [
    { emoji: '😓', text: '副業を始めたいけれど時間がない' },
    { emoji: '🤔', text: 'AIを触っているけれど収益化につながっていない' },
    { emoji: '📱', text: 'SNS発信をしているけれど販売導線がない' },
    { emoji: '😴', text: '睡眠時間を削り続ける副業から抜け出したい' },
    { emoji: '🧭', text: '自分に合った収益化ルートを見つけたい' },
    { emoji: '🚀', text: '月数万円からその先まで、可能性を広げる土台を作りたい' },
  ];

  return (
    <MainLayout>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-14px); }
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
      `}</style>

      {/* ファーストビュー */}
      <section className="relative overflow-hidden pb-20 pt-14 md:pt-20"
        style={{ background: 'linear-gradient(160deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)' }}>
        {/* デコ */}
        <span className="absolute top-8 right-8 text-6xl opacity-10 select-none" style={{ animation: 'float 4s ease-in-out infinite' }}>⏰</span>
        <span className="absolute bottom-12 left-8 text-5xl opacity-10 select-none" style={{ animation: 'float 5s ease-in-out infinite 1s' }}>💰</span>
        <div className="absolute top-16 left-1/4 w-12 h-12 rounded-full opacity-20 blur-sm" style={{ background: '#fcd34d', animation: 'float 3.5s ease-in-out infinite 0.5s' }} />

        <div className="max-w-5xl mx-auto px-5 md:px-8 grid md:grid-cols-2 gap-10 items-center relative z-10">
          <FadeIn>
            <div className="inline-flex items-center gap-2 text-xs font-black px-5 py-2 rounded-full mb-5 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #fef3c7, #fcd34d)', color: '#78350f', border: '1.5px solid #f59e0b' }}>
              🎓 Course
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 leading-[1.3] mb-5">
              睡眠時間を削り続けずに、<br />
              <span className="text-amber-600">AIで副業の進め方を整える。</span>
            </h1>
            <p className="text-gray-700 text-sm md:text-base leading-relaxed mb-6">
              AI副業1日1時間化スタート講座は、忙しい人が自分に合った収益化ルートを見つけ、
              AI・SNS・導線設計・作業効率化を通して、副業を前に進めるための土台を作る講座です。
            </p>
            <div className="bg-white rounded-2xl p-5 mb-6 border-2 border-amber-200 shadow-sm">
              <p className="text-xs text-gray-500 mb-1 font-bold">受講料</p>
              <p className="text-3xl font-black text-amber-600">¥29,800
                <span className="text-sm font-normal text-gray-500 ml-1">（税込）</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-1">※価格は変更される場合があります。実際の販売価格は決済ページでご確認ください。</p>
            </div>
            <div className="flex flex-col gap-3">
              <a href={BUY_URL} target="_blank" rel="noopener noreferrer"
                className="shimmer-btn text-center py-4 px-8 rounded-full text-white font-black text-base shadow-lg hover:-translate-y-1 transition-transform">
                🛒 購入ページへ
              </a>
              <a href={FREE_URL} target="_blank" rel="noopener noreferrer"
                className="text-center py-3.5 px-8 rounded-full border-2 border-gray-300 text-gray-600 font-bold text-sm hover:border-gray-500 transition-colors">
                🎁 無料講座を見る
              </a>
            </div>
          </FadeIn>
          <FadeIn delay={150} className="flex justify-center">
            <div className="relative" style={{ animation: 'float 3.5s ease-in-out infinite' }}>
              <div className="absolute inset-0 rounded-full blur-3xl opacity-40"
                style={{ background: 'radial-gradient(circle, #fcd34d, #fb923c)' }} />
              <img
                src="/images/mio_pc.png"
                alt="AI副業講座"
                className="w-56 md:w-72 relative z-10"
                style={{ mixBlendMode: 'multiply', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.12))' }}
              />
            </div>
          </FadeIn>
        </div>

        {/* ウェーブ */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 50" preserveAspectRatio="none" className="w-full h-12 block">
            <path d="M0,30 C360,0 1080,60 1440,20 L1440,50 L0,50 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* 講座詳細 */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <FadeIn className="mb-10">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-6 border border-amber-100">
              <p className="text-gray-700 text-base leading-[2]">
                月数万円、月数十万円、月数百万円、その先の可能性まで広げていくために、
                まずは「何をやるべきか」「何をやらないべきか」を整理し、
                1日1時間でも行動が進む状態を目指します。
              </p>
            </div>
            <p className="text-[12px] text-gray-400 leading-relaxed mt-3">
              ※収益や成果を保証するものではありません。実践内容や状況により結果は異なります。
            </p>
          </FadeIn>

          {/* この講座で扱う内容 */}
          <FadeIn className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                📖
              </div>
              <h2 className="text-xl font-black text-gray-900">この講座で扱う内容</h2>
            </div>
            <div className="space-y-3">
              {contents.map((item, i) => (
                <FadeIn key={i} delay={i * 50}>
                  <div className="flex items-center gap-4 bg-gradient-to-r from-amber-50 to-white rounded-2xl px-5 py-4 border border-amber-100 hover:border-amber-300 transition-colors">
                    <span className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-sm font-black text-amber-700 flex-shrink-0">{i + 1}</span>
                    <span className="text-2xl flex-shrink-0">{item.emoji}</span>
                    <span className="text-gray-700 text-sm md:text-base font-medium">{item.text}</span>
                  </div>
                </FadeIn>
              ))}
            </div>
          </FadeIn>

          {/* こんな方へ */}
          <FadeIn className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{ background: 'linear-gradient(135deg, #fde68a, #fcd34d)' }}>
                🙋
              </div>
              <h2 className="text-xl font-black text-gray-900">こんな方へ</h2>
            </div>
            <div className="space-y-3">
              {targets.map((item, i) => (
                <FadeIn key={i} delay={i * 50}>
                  <div className="flex items-center gap-4 bg-gradient-to-r from-yellow-50 to-white rounded-2xl px-5 py-4 border border-yellow-100 hover:border-yellow-300 transition-colors">
                    <span className="text-2xl flex-shrink-0">{item.emoji}</span>
                    <span className="text-gray-700 text-sm md:text-base font-medium">{item.text}</span>
                    <span className="ml-auto text-green-500 font-black text-lg flex-shrink-0">✓</span>
                  </div>
                </FadeIn>
              ))}
            </div>
          </FadeIn>

          {/* 注記 */}
          <FadeIn>
            <div className="bg-gray-50 rounded-2xl p-5 text-[12px] text-gray-500 leading-relaxed space-y-1 border border-gray-100">
              <p>※本講座は収益や成果を保証するものではありません。</p>
              <p>※実践内容、作業量、経験、ジャンル、発信媒体、導線設計などにより結果は異なります。</p>
              <p>※購入前に<Link to="/legal/tokushoho" className="underline hover:text-amber-600">特定商取引法に基づく表記</Link>、<Link to="/legal/terms" className="underline hover:text-amber-600">利用規約</Link>、<Link to="/legal/disclaimer" className="underline hover:text-amber-600">免責事項</Link>をご確認ください。</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14" style={{ background: 'linear-gradient(135deg, #fffbeb, #fde68a)' }}>
        <div className="max-w-xl mx-auto px-5 md:px-8 text-center">
          <FadeIn>
            <div className="text-4xl mb-4" style={{ animation: 'float 3s ease-in-out infinite' }}>🚀</div>
            <h3 className="text-xl font-black text-gray-900 mb-6">今すぐ始める</h3>
            <div className="flex flex-col gap-3">
              <a href={BUY_URL} target="_blank" rel="noopener noreferrer"
                className="shimmer-btn text-center py-4 px-8 rounded-full text-white font-black text-base shadow-xl hover:-translate-y-1 transition-transform">
                🛒 購入ページへ（¥29,800）
              </a>
              <a href={FREE_URL} target="_blank" rel="noopener noreferrer"
                className="text-center py-3.5 px-8 rounded-full border-2 border-gray-400 text-gray-700 font-bold text-sm hover:border-gray-700 transition-colors bg-white">
                🎁 無料講座を見る
              </a>
              <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                ※収益を保証するものではありません。価格は決済ページでご確認ください。
              </p>
            </div>
          </FadeIn>
        </div>
      </section>
    </MainLayout>
  );
}
