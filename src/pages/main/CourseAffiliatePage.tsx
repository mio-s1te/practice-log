import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/main/MainLayout';
import { FadeIn } from '@/components/main/FadeIn';

const BUY_URL = 'TODO_REPLACE_STRIPE_AFFILIATE_COURSE_URL';
const FREE_URL = 'TODO_REPLACE_AFFILIATE_FREE_NOTE_OR_LINE_URL';

export function CourseAffiliatePage() {
  const contents = [
    'ASPアフィリエイトの基礎',
    '楽天アフィリエイトを含む物販系アフィリエイトの基礎',
    'コンテンツアフィリエイトの考え方',
    '案件選定・ジャンル選定',
    'SNSアカウント設計',
    'レビュー記事、比較記事、教育投稿',
    'LINE、note、LPへの導線設計',
    'AIを使った投稿作成、分析、改善',
    'クリックや成約を増やす考え方',
    'アフィリエイトに必要なPR表記・広告表記の注意点',
  ];

  const targets = [
    'アフィリエイトを始めたい',
    'ASPや楽天アフィリエイトを学びたい',
    '何を紹介すればいいか分からない',
    'SNS発信から収益化につなげたい',
    'AIを使って投稿や導線づくりを効率化したい',
    '案件に依存しすぎず、自分の発信力を育てたい',
  ];

  return (
    <MainLayout>
      {/* ファーストビュー */}
      <section className="bg-gradient-to-br from-stone-50 via-gray-50 to-[#fdfaf6] pt-12 pb-14 md:pt-16 md:pb-20">
        <div className="max-w-5xl mx-auto px-5 md:px-8 grid md:grid-cols-2 gap-10 items-center">
          <FadeIn>
            <p className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase mb-4">Course</p>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 leading-[1.3] mb-5">
              案件に振り回される人から、<br />
              <span className="text-gray-700">成約される理由を</span><br />
              <span className="text-gray-700">作れる人へ。</span>
            </h1>
            <p className="text-gray-700 text-sm md:text-base leading-relaxed mb-6">
              ASPアフィリエイト、楽天アフィリエイトを含む物販系アフィリエイト、
              コンテンツアフィリエイト、SNS発信、成約導線を実践形式で学ぶ講座です。
            </p>
            <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-100">
              <p className="text-sm text-gray-500 mb-1">受講料</p>
              <p className="text-3xl font-black text-gray-900">4,980<span className="text-lg font-bold">円</span>
                <span className="text-sm font-normal text-gray-500 ml-1">（税込）</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-1">※価格は変更される場合があります。実際の販売価格は決済ページでご確認ください。</p>
            </div>
            <div className="flex flex-col gap-3">
              <a
                href={BUY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center py-4 px-8 rounded-full bg-gray-900 hover:bg-gray-700 text-white font-black text-base transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                購入ページへ
              </a>
              <a
                href={FREE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center py-3.5 px-8 rounded-full border-2 border-gray-300 text-gray-600 font-bold text-sm hover:border-gray-500 transition-colors"
              >
                無料教材を見る
              </a>
            </div>
          </FadeIn>
          <FadeIn delay={150} className="flex justify-center">
            <img src="/images/mio_good.png" alt="アフィリエイト講座" className="w-56 md:w-72 drop-shadow-xl" />
          </FadeIn>
        </div>
      </section>

      {/* 講座詳細 */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <FadeIn className="mb-10">
            <p className="text-gray-700 text-base leading-[2] mb-4">
              売れそうな案件を探して終わるのではなく、誰に、何を、どんな理由で届けるのかを設計し、
              商品が変わっても収益につなげられる力を育てます。
            </p>
            <p className="text-gray-700 text-base leading-[2]">
              AIを活用しながら、案件選定、投稿作成、レビュー記事、比較訴求、
              LINEやnoteへの誘導、導線改善、分析までを学びます。
            </p>
          </FadeIn>

          {/* この講座で扱う内容 */}
          <FadeIn className="mb-10">
            <h2 className="text-xl font-black text-gray-900 mb-5 pb-3 border-b border-gray-100">この講座で扱う内容</h2>
            <ul className="space-y-3">
              {contents.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
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
                  <span className="text-gray-500 text-lg flex-shrink-0 mt-0.5">✓</span>
                  <span className="text-gray-700 text-sm md:text-base">{item}</span>
                </li>
              ))}
            </ul>
          </FadeIn>

          {/* 注記 */}
          <FadeIn>
            <div className="bg-gray-50 rounded-2xl p-5 text-[12px] text-gray-500 leading-relaxed space-y-1">
              <p>※本講座は収益や成果を保証するものではありません。</p>
              <p>※実践内容、作業量、ジャンル、発信媒体、案件審査、ASP規約、導線設計などにより結果は異なります。</p>
              <p>※アフィリエイトを行う場合は、各ASP・楽天アフィリエイト等の規約を遵守し、PR表記・広告表記を適切に行ってください。</p>
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
                className="text-center py-4 px-8 rounded-full bg-gray-900 hover:bg-gray-700 text-white font-black text-base shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
              >
                購入ページへ（4,980円）
              </a>
              <a
                href={FREE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center py-3.5 px-8 rounded-full border border-gray-300 text-gray-600 font-medium text-sm hover:border-gray-500 transition-colors"
              >
                無料教材を見る
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
