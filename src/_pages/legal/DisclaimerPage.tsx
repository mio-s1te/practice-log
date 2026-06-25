import { MainLayout } from '@/components/main/MainLayout';
import { FadeIn } from '@/components/main/FadeIn';

export function DisclaimerPage() {
  const items = [
    '本サイトおよび講座で提供する情報は、収益や成果を保証するものではありません。',
    '実践結果には個人差があります。',
    '副業、アフィリエイト、SNS運用、AI活用の成果は、作業量、経験、発信内容、ジャンル、時期、外部サービスの仕様変更、各ASPの審査や規約等により変動します。',
    '本サイトではアフィリエイトリンクを使用する場合があります。紹介によって報酬を受け取ることがあります。',
    '紹介した商品やサービスの購入・利用に関する最終判断は利用者自身で行ってください。',
    '外部リンク先の情報やサービスについて、当サイトは責任を負いません。',
    '法令、規約、税務、会計に関する判断が必要な場合は、専門家に確認してください。',
    'AIが生成した内容については、必ず利用者自身で確認し、必要に応じて修正してください。',
  ];

  return (
    <MainLayout>
      <section className="bg-[#fdfaf6] pt-12 pb-10 md:pt-16">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <FadeIn>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">免責事項</h1>
            <p className="text-xs text-gray-500">最終更新日：2026年6月</p>
          </FadeIn>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <FadeIn>
            <ul className="space-y-5">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-4 pb-5 border-b border-gray-100 last:border-0">
                  <span className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-gray-700 text-sm md:text-base leading-relaxed">{item}</p>
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>
      </section>
    </MainLayout>
  );
}
