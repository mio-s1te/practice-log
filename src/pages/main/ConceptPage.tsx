import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/main/MainLayout';
import { FadeIn } from '@/components/main/FadeIn';

export function ConceptPage() {
  return (
    <MainLayout>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-10px); }
        }
      `}</style>

      {/* ===== HERO ===== */}
      <section className="relative pt-28 pb-20"
        style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #dcfce7 60%, #d1fae5 100%)' }}>
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <FadeIn>
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 text-xs font-black px-5 py-2.5 rounded-full mb-5 shadow-sm border border-emerald-200">
              🌱 Our Vision
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
              私たちが目指す<br className="md:hidden" />未来
            </h1>
            <p className="text-gray-600 text-base md:text-lg leading-relaxed">
              AIで時間を生み、人が本当に価値あることに<br className="hidden md:block" />集中できる世界を目指しています。
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ===== VISION ===== */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <FadeIn>
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-3xl p-8 md:p-12 border border-emerald-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle, #34d399, #059669)', transform: 'translate(30%, -30%)' }} />
              <div className="space-y-5 relative z-10">
                <p className="text-gray-700 text-base md:text-lg leading-[2]">
                  私たちが目指しているのは、<strong className="text-gray-900">AIで時間を生み、人が本当に価値あることに集中できる世界</strong>を作ることです。
                </p>
                <p className="text-gray-600 leading-relaxed">
                  単調な作業に追われる毎日。不安で動けなくなる時間。可能性を眠らせたまま過ぎていく日々。
                  そんな状態から抜け出し、自分の頭で考え、自分の力で選び、自分の未来を動かせる人を増やしたい。
                </p>
                <div className="border-l-4 border-emerald-400 pl-5 bg-white/70 py-4 rounded-r-2xl">
                  <p className="font-black text-gray-900 leading-relaxed text-lg">
                    努力している人が報われ、<br />
                    才能が埋もれたまま終わらない社会を目指しています。
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ===== FOR YOU ===== */}
      <section className="py-16 md:py-20"
        style={{ background: 'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 50%, #ede9fe 100%)' }}>
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
                <div className="rounded-2xl p-5 border flex items-start gap-3 h-full"
                  style={{ background: item.bg, borderColor: item.border, borderWidth: 1.5, boxShadow: `0 4px 16px ${item.shadow}` }}>
                  <span className="text-3xl flex-shrink-0" style={{ animation: `float ${3 + i * 0.3}s ease-in-out infinite ${i * 0.2}s` }}>{item.emoji}</span>
                  <p className="text-gray-800 text-sm leading-relaxed font-semibold">{item.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SERVICES ===== */}
      <section className="py-16 md:py-20 bg-white">
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
                <div className="rounded-3xl p-7 border-2 relative overflow-hidden"
                  style={{ background: item.bg, borderColor: item.border }}>
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
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-16 md:py-20"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
        <div className="max-w-2xl mx-auto px-5 md:px-8 text-center">
          <FadeIn>
            <p className="text-white/70 text-sm mb-3">まずは無料で始めよう</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-8">一歩踏み出す準備はできていますか？</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="https://lin.ee/sSD9W7a" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full text-gray-900 font-black text-sm shadow-lg hover:-translate-y-1 transition-all"
                style={{ background: 'linear-gradient(135deg, #fcd34d, #f59e0b)' }}>
                🎁 無料講座を受け取る
              </a>
              <Link to="/courses"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full text-white font-black text-sm border-2 border-white/30 hover:border-white/60 hover:-translate-y-1 transition-all">
                📚 講座一覧を見る →
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </MainLayout>
  );
}
