import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/main/MainLayout';
import { FadeIn } from '@/components/main/FadeIn';

const BUY_URL = 'TODO_REPLACE_STRIPE_AFFILIATE_COURSE_URL';
const FREE_URL = 'TODO_REPLACE_AFFILIATE_FREE_NOTE_OR_LINE_URL';

export function CourseAffiliatePage() {
  const contents = [
    { emoji: '📖', text: 'ASPアフィリエイトの基礎' },
    { emoji: '🛒', text: '楽天アフィリエイトを含む物販系アフィリエイトの基礎' },
    { emoji: '📝', text: 'コンテンツアフィリエイトの考え方' },
    { emoji: '🎯', text: '案件選定・ジャンル選定' },
    { emoji: '📱', text: 'SNSアカウント設計' },
    { emoji: '✍️', text: 'レビュー記事、比較記事、教育投稿' },
    { emoji: '📡', text: 'LINE、note、LPへの導線設計' },
    { emoji: '🤖', text: 'AIを使った投稿作成、分析、改善' },
    { emoji: '💡', text: 'クリックや成約を増やす考え方' },
    { emoji: '⚠️', text: 'アフィリエイトに必要なPR表記・広告表記の注意点' },
  ];

  const targets = [
    { emoji: '🌱', text: 'アフィリエイトを始めたい' },
    { emoji: '📚', text: 'ASPや楽天アフィリエイトを学びたい' },
    { emoji: '🤷', text: '何を紹介すればいいか分からない' },
    { emoji: '📣', text: 'SNS発信から収益化につなげたい' },
    { emoji: '⚡', text: 'AIを使って投稿や導線づくりを効率化したい' },
    { emoji: '💪', text: '案件に依存しすぎず、自分の発信力を育てたい' },
  ];

  return (
    <MainLayout>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-14px); }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* ファーストビュー */}
      <section className="relative overflow-hidden pb-20 pt-14 md:pt-20"
        style={{ background: 'linear-gradient(160deg, #f5f3ff 0%, #ede9fe 50%, #ddd6fe 100%)' }}>
        {/* デコ */}
        <span className="absolute top-8 right-8 text-6xl opacity-10 select-none" style={{ animation: 'float 4s ease-in-out infinite' }}>💹</span>
        <span className="absolute bottom-12 left-8 text-5xl opacity-10 select-none" style={{ animation: 'float 5s ease-in-out infinite 1s' }}>🎯</span>
        <div className="absolute top-16 left-1/4 w-12 h-12 rounded-full opacity-20 blur-sm" style={{ background: '#c4b5fd', animation: 'float 3.5s ease-in-out infinite 0.5s' }} />

        <div className="max-w-5xl mx-auto px-5 md:px-8 grid md:grid-cols-2 gap-10 items-center relative z-10">
          <FadeIn>
            <div className="inline-flex items-center gap-2 text-xs font-black px-5 py-2 rounded-full mb-5 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #ede9fe, #c4b5fd)', color: '#5b21b6', border: '1.5px solid #a78bfa' }}>
              🎓 Course
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 leading-[1.3] mb-5">
              案件に振り回される人から、<br />
              <span className="text-violet-600">成約される理由を<br />作れる人へ。</span>
            </h1>
            <p className="text-gray-700 text-sm md:text-base leading-relaxed mb-6">
              ASPアフィリエイト、楽天アフィリエイトを含む物販系アフィリエイト、
              コンテンツアフィリエイト、SNS発信、成約導線を実践形式で学ぶ講座です。
            </p>
            <div className="bg-white rounded-2xl p-5 mb-6 border-2 border-violet-200 shadow-sm">
              <p className="text-xs text-gray-500 mb-1 font-bold">受講料</p>
              <p className="text-3xl font-black text-violet-600">¥4,980
                <span className="text-sm font-normal text-gray-500 ml-1">（税込）</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-1">※価格は変更される場合があります。実際の販売価格は決済ページでご確認ください。</p>
            </div>
            <div className="flex flex-col gap-3">
              <a href={BUY_URL} target="_blank" rel="noopener noreferrer"
                className="text-center py-4 px-8 rounded-full text-white font-black text-base shadow-lg hover:-translate-y-1 transition-transform"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                🛒 購入ページへ
              </a>
              <a href={FREE_URL} target="_blank" rel="noopener noreferrer"
                className="text-center py-3.5 px-8 rounded-full border-2 border-violet-300 text-violet-600 font-bold text-sm hover:border-violet-500 transition-colors">
                🎁 無料教材を見る
              </a>
            </div>
          </FadeIn>
          <FadeIn delay={150} className="flex justify-center">
            <div className="relative" style={{ animation: 'float 3.5s ease-in-out infinite' }}>
              <div className="absolute inset-0 rounded-full blur-3xl opacity-40"
                style={{ background: 'radial-gradient(circle, #c4b5fd, #818cf8)', animation: 'spinSlow 10s linear infinite' }} />
              <img
                src="/images/mio_good.png"
                alt="アフィリエイト講座"
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
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-3xl p-6 border border-violet-100">
              <p className="text-gray-700 text-base leading-[2] mb-3">
                売れそうな案件を探して終わるのではなく、誰に、何を、どんな理由で届けるのかを設計し、
                商品が変わっても収益につなげられる力を育てます。
              </p>
              <p className="text-gray-700 text-base leading-[2]">
                AIを活用しながら、案件選定、投稿作成、レビュー記事、比較訴求、
                LINEやnoteへの誘導、導線改善、分析までを学びます。
              </p>
            </div>
          </FadeIn>

          {/* この講座で扱う内容 */}
          <FadeIn className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                📖
              </div>
              <h2 className="text-xl font-black text-gray-900">この講座で扱う内容</h2>
            </div>
            <div className="space-y-3">
              {contents.map((item, i) => (
                <FadeIn key={i} delay={i * 40}>
                  <div className="flex items-center gap-4 bg-gradient-to-r from-violet-50 to-white rounded-2xl px-5 py-4 border border-violet-100 hover:border-violet-300 transition-colors">
                    <span className="w-8 h-8 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center text-sm font-black text-violet-700 flex-shrink-0">{i + 1}</span>
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
                style={{ background: 'linear-gradient(135deg, #c4b5fd, #a78bfa)' }}>
                🙋
              </div>
              <h2 className="text-xl font-black text-gray-900">こんな方へ</h2>
            </div>
            <div className="space-y-3">
              {targets.map((item, i) => (
                <FadeIn key={i} delay={i * 50}>
                  <div className="flex items-center gap-4 bg-gradient-to-r from-indigo-50 to-white rounded-2xl px-5 py-4 border border-indigo-100 hover:border-indigo-300 transition-colors">
                    <span className="text-2xl flex-shrink-0">{item.emoji}</span>
                    <span className="text-gray-700 text-sm md:text-base font-medium">{item.text}</span>
                    <span className="ml-auto text-violet-500 font-black text-lg flex-shrink-0">✓</span>
                  </div>
                </FadeIn>
              ))}
            </div>
          </FadeIn>

          {/* 注記 */}
          <FadeIn>
            <div className="bg-gray-50 rounded-2xl p-5 text-[12px] text-gray-500 leading-relaxed space-y-1 border border-gray-100">
              <p>※本講座は収益や成果を保証するものではありません。</p>
              <p>※実践内容、作業量、ジャンル、発信媒体、案件審査、ASP規約、導線設計などにより結果は異なります。</p>
              <p>※アフィリエイトを行う場合は、各ASP・楽天アフィリエイト等の規約を遵守し、PR表記・広告表記を適切に行ってください。</p>
              <p>※購入前に<Link to="/legal/tokushoho" className="underline hover:text-violet-600">特定商取引法に基づく表記</Link>、<Link to="/legal/terms" className="underline hover:text-violet-600">利用規約</Link>、<Link to="/legal/disclaimer" className="underline hover:text-violet-600">免責事項</Link>をご確認ください。</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14" style={{ background: 'linear-gradient(135deg, #f5f3ff, #ddd6fe)' }}>
        <div className="max-w-xl mx-auto px-5 md:px-8 text-center">
          <FadeIn>
            <div className="text-4xl mb-4" style={{ animation: 'float 3s ease-in-out infinite' }}>💎</div>
            <h3 className="text-xl font-black text-gray-900 mb-6">今すぐ始める</h3>
            <div className="flex flex-col gap-3">
              <a href={BUY_URL} target="_blank" rel="noopener noreferrer"
                className="text-center py-4 px-8 rounded-full text-white font-black text-base shadow-xl hover:-translate-y-1 transition-transform"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                🛒 購入ページへ（¥4,980）
              </a>
              <a href={FREE_URL} target="_blank" rel="noopener noreferrer"
                className="text-center py-3.5 px-8 rounded-full border-2 border-violet-300 text-violet-700 font-bold text-sm hover:border-violet-500 transition-colors bg-white">
                🎁 無料教材を見る
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
