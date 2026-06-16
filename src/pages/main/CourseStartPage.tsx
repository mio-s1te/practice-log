import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/main/MainLayout';
import { FadeIn } from '@/components/main/FadeIn';

const BUY_URL = 'TODO_REPLACE_STRIPE_START_COURSE_URL';
const FREE_URL = 'TODO_REPLACE_FREE_LINE_OR_FREE_SEMINAR_URL';

export function CourseStartPage() {
  const contents = [
    '成功者と未達者の思考の違い',
    '自分に合った収益化ルート設計',
    'SNS発信と収益導線づくり',
    'AIを使った作業効率化',
    '1日1時間で進めるための行動設計',
    'ワークシート、ToDo、GPTsの活用',
    '今月・今週・今日の行動への落とし込み',
  ];

  const targets = [
    '副業を始めたいけれど時間がない',
    'AIを触っているけれど収益化につながっていない',
    'SNS発信をしているけれど販売導線がない',
    '睡眠時間を削り続ける副業から抜け出したい',
    '自分に合った収益化ルートを見つけたい',
    '月数万円からその先まで、可能性を広げる土台を作りたい',
  ];

  return (
    <MainLayout>
      {/* ファーストビュー */}
      <section className="bg-gradient-to-br from-amber-50 via-orange-50 to-[#fdfaf6] pt-12 pb-14 md:pt-16 md:pb-20">
        <div className="max-w-5xl mx-auto px-5 md:px-8 grid md:grid-cols-2 gap-10 items-center">
          <FadeIn>
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-600 uppercase mb-4">Course</p>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 leading-[1.3] mb-5">
              睡眠時間を削り続けずに、<br />
              <span className="text-amber-600">AIで副業の進め方を整える。</span>
            </h1>
            <p className="text-gray-700 text-sm md:text-base leading-relaxed mb-6">
              AI副業1日1時間化スタート講座は、忙しい人が自分に合った収益化ルートを見つけ、
              AI・SNS・導線設計・作業効率化を通して、副業を前に進めるための土台を作る講座です。
            </p>
            <div className="bg-white rounded-2xl p-5 mb-6 border border-amber-100">
              <p className="text-sm text-gray-500 mb-1">受講料</p>
              <p className="text-3xl font-black text-gray-900">29,800<span className="text-lg font-bold">円</span>
                <span className="text-sm font-normal text-gray-500 ml-1">（税込）</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-1">※価格は変更される場合があります。実際の販売価格は決済ページでご確認ください。</p>
            </div>
            <div className="flex flex-col gap-3">
              <a
                href={BUY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center py-4 px-8 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-black text-base transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                購入ページへ
              </a>
              <a
                href={FREE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center py-3.5 px-8 rounded-full border-2 border-gray-300 text-gray-600 font-bold text-sm hover:border-gray-500 transition-colors"
              >
                無料講座を見る
              </a>
            </div>
          </FadeIn>
          <FadeIn delay={150} className="flex justify-center">
            <img src="/images/mio_pc.png" alt="AI副業講座" className="w-56 md:w-72 drop-shadow-xl" />
          </FadeIn>
        </div>
      </section>

      {/* 講座詳細 */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <FadeIn className="mb-10">
            <p className="text-gray-700 text-base leading-[2] mb-6">
              月数万円、月数十万円、月数百万円、その先の可能性まで広げていくために、
              まずは「何をやるべきか」「何をやらないべきか」を整理し、
              1日1時間でも行動が進む状態を目指します。
            </p>
            <p className="text-[12px] text-gray-400 leading-relaxed">
              ※収益や成果を保証するものではありません。実践内容や状況により結果は異なります。
            </p>
          </FadeIn>

          {/* この講座で扱う内容 */}
          <FadeIn className="mb-10">
            <h2 className="text-xl font-black text-gray-900 mb-5 pb-3 border-b border-gray-100">この講座で扱う内容</h2>
            <ul className="space-y-3">
              {contents.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-gray-700 text-sm md:text-base">{item}</span>
                </li>
              ))}
            </ul>
          </FadeIn>

          {/* こんな方へ */}
          <FadeIn className="mb-10">
            <h2 className="text-xl font-black text-gray-900 mb-5 pb-3 border-b border-gray-100">こんな方へ</h2>
            <ul className="space-y-3">
              {targets.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-amber-500 text-lg flex-shrink-0 mt-0.5">✓</span>
                  <span className="text-gray-700 text-sm md:text-base">{item}</span>
                </li>
              ))}
            </ul>
          </FadeIn>

          {/* 注記 */}
          <FadeIn>
            <div className="bg-gray-50 rounded-2xl p-5 text-[12px] text-gray-500 leading-relaxed space-y-1">
              <p>※本講座は収益や成果を保証するものではありません。</p>
              <p>※実践内容、作業量、経験、ジャンル、発信媒体、導線設計などにより結果は異なります。</p>
              <p>※購入前に<Link to="/legal/tokushoho" className="underline hover:text-amber-600">特定商取引法に基づく表記</Link>、<Link to="/legal/terms" className="underline hover:text-amber-600">利用規約</Link>、<Link to="/legal/disclaimer" className="underline hover:text-amber-600">免責事項</Link>をご確認ください。</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-[#fdfaf6]">
        <div className="max-w-xl mx-auto px-5 md:px-8 text-center">
          <FadeIn>
            <h3 className="text-xl font-black text-gray-900 mb-6">今すぐ始める</h3>
            <div className="flex flex-col gap-3">
              <a
                href={BUY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center py-4 px-8 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-black text-base shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
              >
                購入ページへ（29,800円）
              </a>
              <a
                href={FREE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center py-3.5 px-8 rounded-full border border-gray-300 text-gray-600 font-medium text-sm hover:border-gray-500 transition-colors"
              >
                無料講座を見る
              </a>
              <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                ※収益を保証するものではありません。価格は決済ページでご確認ください。
              </p>
            </div>
          </FadeIn>
        </div>
      </section>
    </MainLayout>
  );
}
