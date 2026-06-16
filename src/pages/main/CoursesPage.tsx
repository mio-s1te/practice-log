import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/main/MainLayout';
import { FadeIn } from '@/components/main/FadeIn';

export function CoursesPage() {
  const courses = [
    {
      id: 'ai-1hour-start',
      tag: '副業・収益化',
      tagColor: 'text-amber-600 bg-amber-50',
      title: 'AI副業1日1時間化スタート講座',
      price: '29,800円（税込）',
      image: '/images/mio_pc.png',
      imgBg: 'from-amber-50 to-orange-50',
      desc: '忙しくても、睡眠時間を削り続けずに副業を進めたい方向けの講座です。AIを使って自分に合った収益化ルートを見つけ、SNS発信・商品設計・導線づくり・作業効率化を進めながら、1日1時間でも前に進める仕組みを作ります。',
      detailLink: '/courses/ai-1hour-start',
      buyLink: 'TODO_REPLACE_STRIPE_START_COURSE_URL',
    },
    {
      id: 'pro-ai-affiliate',
      tag: 'アフィリエイト',
      tagColor: 'text-gray-600 bg-gray-100',
      title: 'プロAIアフィリエイター養成講座',
      price: '4,980円（税込）',
      image: '/images/mio_good.png',
      imgBg: 'from-stone-50 to-gray-100',
      desc: 'ASPアフィリエイト、楽天アフィリエイトを含む物販系アフィリエイト、コンテンツアフィリエイト、SNS発信、成約導線を実践形式で学ぶ講座です。案件に振り回されず、自分の発信力で収益を作れる力を育てます。',
      detailLink: '/courses/pro-ai-affiliate',
      buyLink: 'TODO_REPLACE_STRIPE_AFFILIATE_COURSE_URL',
    },
  ];

  return (
    <MainLayout>
      {/* ページヘッダー */}
      <section className="bg-[#fdfaf6] pt-12 pb-12 md:pt-16 md:pb-14">
        <div className="max-w-4xl mx-auto px-5 md:px-8 text-center">
          <FadeIn>
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-600 uppercase mb-3">Courses</p>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">提供中の講座</h1>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed">
              AI・SNS・収益化・仕組み化を通して、<br className="hidden md:block" />
              自分の人生を自分で動かすための学びを届けています。
            </p>
          </FadeIn>
        </div>
      </section>

      {/* 講座一覧 */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-5 md:px-8 space-y-8">
          {courses.map((course, i) => (
            <FadeIn key={course.id} delay={i * 100}>
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className={`bg-gradient-to-br ${course.imgBg} p-8 flex justify-center`}>
                  <img src={course.image} alt={course.title} className="h-40 object-contain" />
                </div>
                <div className="p-7 md:p-9">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${course.tagColor}`}>
                      {course.tag}
                    </span>
                    <span className="text-lg font-black text-gray-900">{course.price}</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-4">{course.title}</h2>
                  <p className="text-gray-600 text-sm md:text-base leading-relaxed mb-6">{course.desc}</p>
                  <p className="text-[11px] text-gray-400 mb-5 leading-relaxed">
                    ※成果には個人差があります。収益を保証するものではありません。
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      to={course.detailLink}
                      className="flex-1 text-center py-3 px-6 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 transition-colors"
                    >
                      詳しく見る
                    </Link>
                    <a
                      href={course.buyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-3 px-6 rounded-full border-2 border-amber-500 text-amber-600 text-sm font-bold hover:bg-amber-500 hover:text-white transition-colors"
                    >
                      購入ページへ
                    </a>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-[#fdfaf6]">
        <div className="max-w-2xl mx-auto px-5 md:px-8 text-center">
          <FadeIn>
            <p className="text-gray-600 text-sm mb-5">どの講座が合っているか迷っている方は、お気軽にご相談ください。</p>
            <Link
              to="/contact"
              className="inline-flex items-center px-8 py-3.5 rounded-full bg-gray-900 text-white font-bold text-sm hover:bg-gray-700 transition-colors"
            >
              お問い合わせする
            </Link>
          </FadeIn>
        </div>
      </section>
    </MainLayout>
  );
}
