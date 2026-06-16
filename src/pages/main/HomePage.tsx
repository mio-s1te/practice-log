import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/main/MainLayout';
import { FadeIn } from '@/components/main/FadeIn';

const TODO_FREE_URL = 'TODO_REPLACE_FREE_LINE_OR_FREE_SEMINAR_URL';
const TODO_CONTACT_LINE = 'TODO_REPLACE_CONTACT_LINE_URL';

export function HomePage() {
  return (
    <MainLayout>
      {/* ========== 1. ファーストビュー ========== */}
      <section className="relative min-h-[92vh] flex items-center bg-[#fdfaf6] overflow-hidden">
        {/* 背景装飾 */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber-50 rounded-full opacity-60 blur-3xl -translate-y-1/4 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-50 rounded-full opacity-50 blur-3xl translate-y-1/4 -translate-x-1/4 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center relative z-10">
          {/* テキスト */}
          <div>
            <FadeIn>
              <p className="text-xs font-semibold tracking-[0.2em] text-amber-600 uppercase mb-5">MIO AI LIFE DESIGN</p>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 leading-[1.25] mb-6">
                AIを使える人から、<br />
                <span className="text-amber-600">人生の主導権を</span><br />
                取り戻す人へ。
              </h1>
              <div className="text-gray-600 text-base md:text-lg leading-relaxed mb-4 space-y-1">
                <p>時間がない。お金がない。自信がない。経験がない。</p>
                <p>そんな理由で、自分の可能性を小さくしてきた毎日に、</p>
                <p className="font-semibold text-gray-800">もう終止符を打つ。</p>
              </div>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed mb-8">
                AI・SNS・収益化の仕組みづくりを通して、<br className="hidden md:block" />
                「頑張り続けるしかない人生」から、<br className="hidden md:block" />
                「自分で未来を選べる人生」へ進む人を増やします。
              </p>

              {/* CTAボタン群 */}
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <a
                  href={TODO_FREE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex justify-center items-center px-7 py-3.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  無料講座を見る
                </a>
                <Link
                  to="/courses"
                  className="inline-flex justify-center items-center px-7 py-3.5 rounded-full border-2 border-gray-900 text-gray-900 font-bold text-sm hover:bg-gray-900 hover:text-white transition-all duration-200"
                >
                  講座一覧を見る
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex justify-center items-center px-7 py-3.5 rounded-full border border-gray-300 text-gray-600 font-medium text-sm hover:border-gray-500 transition-all duration-200"
                >
                  お問い合わせ
                </Link>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                ※講座・教材の内容は、成果を保証するものではありません。実践内容や成果には個人差があります。
              </p>
            </FadeIn>
          </div>

          {/* みおちゃん */}
          <FadeIn delay={200} className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-100 rounded-full blur-3xl opacity-70 scale-90 pointer-events-none" />
              <img
                src="/images/mio_hero.png"
                alt="みお"
                className="relative w-64 md:w-80 lg:w-96 drop-shadow-2xl"
                style={{ animation: 'float 3.5s ease-in-out infinite' }}
              />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ========== 2. 私たちが目指す未来 ========== */}
      <section id="concept" className="py-20 md:py-28 bg-white">
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <FadeIn>
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-600 uppercase mb-4">Our Vision</p>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-10">私たちが目指す未来</h2>
          </FadeIn>
          <FadeIn delay={100}>
            <div className="text-gray-700 text-base md:text-lg leading-[2] space-y-5 text-left">
              <p>
                私たちが目指しているのは、<br />
                AIを使える人を増やすことではありません。
              </p>
              <p>
                <span className="font-bold text-gray-900">AIで時間を生み、人が本当に価値あることに集中できる世界</span>を作ることです。
              </p>
              <p className="text-gray-500">
                単調な作業に追われる毎日。不安で動けなくなる時間。<br />
                何をすればいいか分からず、可能性を眠らせたまま過ぎていく日々。
              </p>
              <p>
                そんな状態から抜け出し、自分の頭で考え、自分の力で選び、<br className="hidden md:block" />
                自分の未来を動かせる人を増やしたい。
              </p>
              <p>
                AIは、人の代わりになるものではなく、<br className="hidden md:block" />
                人がもっと自由に、もっと深く、もっと自分らしく生きるために使えるもの。
              </p>
              <p className="font-bold text-gray-900">
                だから私たちは、AI・SNS・収益化・仕組み化を通して、<br className="hidden md:block" />
                努力している人が報われる道を作り、<br className="hidden md:block" />
                才能が埋もれたまま終わらない社会を目指しています。
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ========== 3. こんな人の力になりたい ========== */}
      <section className="py-20 md:py-28 bg-[#fdfaf6]">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <FadeIn className="text-center mb-12">
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-600 uppercase mb-4">For You</p>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-6">こんな人の力になりたい</h2>
            <p className="text-gray-600 text-base leading-relaxed max-w-2xl mx-auto">
              特別な才能がある人だけが変われるのではなく、<br className="hidden md:block" />
              本気で変わりたい人が、自分の人生を動かせるように。
            </p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '💪', text: '努力しているのに、なかなか報われない人' },
              { icon: '✨', text: '才能や経験があるのに、まだ形にできていない人' },
              { icon: '🤖', text: 'AIを使ってみたいけれど、収益化につなげられていない人' },
              { icon: '⏰', text: '副業を始めたいけれど、時間がなくて続かない人' },
              { icon: '📱', text: 'SNS発信をしているけれど、商品販売や収益につながっていない人' },
              { icon: '🌍', text: '自分の好きな場所で、好きな働き方を選べるようになりたい人' },
              { icon: '🌟', text: '収入のために、夢や大切なものを諦めたくない人' },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 60}>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-3 h-full">
                  <span className="text-2xl flex-shrink-0 mt-0.5">{item.icon}</span>
                  <p className="text-gray-700 text-sm leading-relaxed font-medium">{item.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 4. 提供していること ========== */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <FadeIn className="text-center mb-12">
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-600 uppercase mb-4">Services</p>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900">提供していること</h2>
          </FadeIn>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                num: '01',
                title: 'AI活用設計',
                desc: 'AIをただ使うだけで終わらせず、思考整理・投稿作成・リサーチ・導線設計・作業効率化に活かす方法を届けます。',
              },
              {
                num: '02',
                title: 'SNS導線設計',
                desc: 'X、Threads、LINE、note、LPなどを使い、発信から信頼形成、商品販売までの流れを設計します。',
              },
              {
                num: '03',
                title: '収益化の土台づくり',
                desc: '自分に合った収益化ルートと行動設計を整えます。月数万円からその先まで、可能性を広げていくための土台を作ります。',
              },
              {
                num: '04',
                title: '仕組み化・自動化',
                desc: 'AIやテンプレート、ワーク、GPTsを活用し、頑張り続けるだけではなく、前に進みやすい仕組みを作ります。',
              },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="border border-gray-100 rounded-2xl p-7 hover:border-amber-200 hover:shadow-md transition-all duration-300">
                  <p className="text-5xl font-black text-amber-100 leading-none mb-3">{item.num}</p>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={300}>
            <p className="text-[11px] text-gray-400 text-center mt-6 leading-relaxed">
              ※収益や成果を保証するものではありません。実践量、経験、ジャンル、発信内容、導線設計などにより結果は異なります。
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ========== 5. 講座紹介 ========== */}
      <section className="py-20 md:py-28 bg-[#fdfaf6]">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <FadeIn className="text-center mb-12">
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-600 uppercase mb-4">Courses</p>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900">提供中の講座</h2>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 講座1 */}
            <FadeIn>
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-8 flex justify-center">
                  <img src="/images/mio_pc.png" alt="AI副業講座" className="h-36 object-contain" />
                </div>
                <div className="p-7 flex flex-col flex-1">
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full inline-block mb-3 w-fit">
                    副業・収益化
                  </span>
                  <h3 className="text-xl font-black text-gray-900 mb-3">AI副業1日1時間化スタート講座</h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-5 flex-1">
                    忙しくても、睡眠時間を削り続けずに副業を進めたい方向けの講座です。
                    AIを使って自分に合った収益化ルートを見つけ、1日1時間でも前に進める仕組みを作ります。
                  </p>
                  <div className="flex flex-col gap-2">
                    <Link
                      to="/courses/ai-1hour-start"
                      className="text-center py-3 px-6 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 transition-colors"
                    >
                      詳しく見る
                    </Link>
                    <a
                      href="TODO_REPLACE_STRIPE_START_COURSE_URL"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-center py-3 px-6 rounded-full border-2 border-amber-500 text-amber-600 text-sm font-bold hover:bg-amber-500 hover:text-white transition-colors"
                    >
                      購入ページへ
                    </a>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* 講座2 */}
            <FadeIn delay={100}>
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
                <div className="bg-gradient-to-br from-stone-50 to-gray-100 p-8 flex justify-center">
                  <img src="/images/mio_good.png" alt="アフィリエイト講座" className="h-36 object-contain" />
                </div>
                <div className="p-7 flex flex-col flex-1">
                  <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full inline-block mb-3 w-fit">
                    アフィリエイト
                  </span>
                  <h3 className="text-xl font-black text-gray-900 mb-3">プロAIアフィリエイター養成講座</h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-5 flex-1">
                    ASP・楽天アフィリエイト・コンテンツアフィリエイトをAIを活用しながら実践形式で学ぶ講座です。
                    案件に振り回されず、自分の発信力で収益を作れる力を育てます。
                  </p>
                  <div className="flex flex-col gap-2">
                    <Link
                      to="/courses/pro-ai-affiliate"
                      className="text-center py-3 px-6 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 transition-colors"
                    >
                      詳しく見る
                    </Link>
                    <a
                      href="TODO_REPLACE_STRIPE_AFFILIATE_COURSE_URL"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-center py-3 px-6 rounded-full border-2 border-gray-400 text-gray-600 text-sm font-bold hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-colors"
                    >
                      購入ページへ
                    </a>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={200}>
            <p className="text-[11px] text-gray-400 text-center mt-6 leading-relaxed">
              ※各講座は、収益や成果を保証するものではありません。実践内容、作業量、発信媒体、ジャンル、経験値などにより結果は異なります。<br />
              ※アフィリエイトリンクを使用する場合があります。紹介によって報酬を受け取ることがあります。
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ========== 6. 代表プロフィール ========== */}
      <section id="profile" className="py-20 md:py-28 bg-white">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <FadeIn className="text-center mb-12">
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-600 uppercase mb-4">Profile</p>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900">代表プロフィール</h2>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <FadeIn className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-50 rounded-full blur-3xl opacity-80 scale-110 pointer-events-none" />
                <img
                  src="/images/mio_wave.png"
                  alt="みお"
                  className="relative w-52 md:w-64 drop-shadow-xl"
                />
              </div>
            </FadeIn>

            <FadeIn delay={100}>
              <div>
                <h3 className="text-3xl font-black text-gray-900 mb-1">みお</h3>
                <p className="text-sm text-amber-600 font-medium mb-6">AI活用・SNS導線設計・収益化コンサルタント</p>
                <div className="text-gray-700 text-sm md:text-base leading-[1.9] space-y-4">
                  <p>
                    AI活用・SNS導線設計・アフィリエイト実践を通して、
                    個人が自分の時間・収入・働き方を自分で選べるようになるための講座や教材を企画・運営しています。
                  </p>
                  <p>
                    これまで、占い鑑定・美容健康・ライブ配信・AI関連の仕事など、
                    複数の分野で発信・販売・個人ビジネスを経験。
                  </p>
                  <p>
                    「才能がないのではなく、正しい方向性や情報、仕組みを知らないだけで
                    可能性が埋もれてしまっている人があまりにも多い」
                    という思いを活動の軸に置いています。
                  </p>
                  <p className="font-semibold text-gray-900">
                    努力している人が報われ、<br />
                    本気で変わりたい人が一歩踏み出せる場所を作ること。
                  </p>
                </div>
                <Link
                  to="/contact"
                  className="mt-7 inline-flex items-center px-7 py-3 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 transition-colors"
                >
                  お問い合わせする
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ========== 7. 選ばれる理由 ========== */}
      <section className="py-20 md:py-28 bg-gray-950 text-white">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <FadeIn className="text-center mb-12">
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-400 uppercase mb-4">Why Choose Us</p>
            <h2 className="text-2xl md:text-3xl font-black">選ばれる理由</h2>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                num: '01',
                title: 'AIを"使える"で終わらせない',
                desc: '投稿作成や時短だけでなく、収益化・導線・商品設計・行動設計までつなげます。',
              },
              {
                num: '02',
                title: '初心者でも進めやすい実践型',
                desc: 'ワーク・テンプレート・GPTsを使いながら、実際に形にしていきます。',
              },
              {
                num: '03',
                title: 'SNSから収益化までを設計',
                desc: 'X、Threads、LINE、note、LPなどを使い、発信から販売までの流れを整えます。',
              },
              {
                num: '04',
                title: '自分に合った収益化ルートを見つける',
                desc: '誰かの成功法則をそのまま真似するのではなく、その人の経験・強み・生活時間に合った形を設計します。',
              },
              {
                num: '05',
                title: '頑張り続けるだけの働き方から抜け出す',
                desc: '根性論ではなく、AIと仕組みを使って、続けやすい働き方を作ります。',
              },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 70}>
                <div className="border border-gray-800 rounded-2xl p-6 hover:border-amber-500/40 transition-all duration-300">
                  <p className="text-4xl font-black text-amber-500/20 leading-none mb-3">{item.num}</p>
                  <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 8. お問い合わせCTA ========== */}
      <section className="py-20 md:py-28 bg-[#fdfaf6]">
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <FadeIn>
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-600 uppercase mb-4">Contact</p>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-5">
              講座・提携・お仕事の<br className="sm:hidden" />ご相談はこちら
            </h2>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed mb-8">
              講座に関するご質問、提携・紹介制度に関するご相談、<br className="hidden md:block" />
              SNS導線設計・AI活用・講座づくりに関するご相談は、<br className="hidden md:block" />
              以下よりお問い合わせください。
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/contact"
                className="inline-flex justify-center items-center px-8 py-3.5 rounded-full bg-gray-900 text-white font-bold text-sm hover:bg-gray-700 transition-colors"
              >
                お問い合わせする
              </Link>
              <a
                href={TODO_CONTACT_LINE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex justify-center items-center px-8 py-3.5 rounded-full bg-[#06C755] text-white font-bold text-sm hover:opacity-90 transition-opacity"
              >
                LINEで問い合わせる
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Float animation style */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </MainLayout>
  );
}
