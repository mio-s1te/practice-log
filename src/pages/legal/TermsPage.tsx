import { MainLayout } from '@/components/main/MainLayout';
import { FadeIn } from '@/components/main/FadeIn';

export function TermsPage() {
  return (
    <MainLayout>
      <section className="bg-[#fdfaf6] pt-12 pb-10 md:pt-16">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <FadeIn>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">利用規約</h1>
            <p className="text-xs text-gray-500">最終更新日：2026年6月</p>
          </FadeIn>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <FadeIn>
            <p className="text-sm text-gray-600 leading-relaxed mb-10">
              本利用規約（以下「本規約」）は、MIO AI LIFE DESIGN（以下「当サービス」）が提供するサービスの利用条件を定めるものです。
              ご利用の前に必ずお読みください。
            </p>
            <div className="space-y-8 text-sm text-gray-700 leading-[1.9]">

              <div>
                <h2 className="text-base font-black text-gray-900 mb-3">第1条（本サービスの内容）</h2>
                <p>当サービスは、AI活用・SNS導線設計・アフィリエイト・副業・収益化に関する講座・教材・情報コンテンツを提供します。</p>
              </div>

              <div>
                <h2 className="text-base font-black text-gray-900 mb-3">第2条（禁止事項）</h2>
                <p>利用者は、以下の行為を行ってはなりません。</p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>教材・コンテンツの無断転載・複製・配布</li>
                  <li>講座内容の第三者への無断共有・転送</li>
                  <li>購入者限定ページのURLの第三者への共有</li>
                  <li>当サービスおよび他の利用者への誹謗中傷</li>
                  <li>不正アクセス・不正ログイン</li>
                  <li>法令または公序良俗に違反する行為</li>
                  <li>ASP・各外部サービスの規約に違反する行為</li>
                  <li>虚偽・誇大・誤認を招く広告表現の使用</li>
                  <li>当サービスの運営を妨害する行為</li>
                  <li>その他、当サービスが不適切と判断する行為</li>
                </ul>
              </div>

              <div>
                <h2 className="text-base font-black text-gray-900 mb-3">第3条（知的財産権）</h2>
                <p>
                  本サービスで提供する講座・教材・テキスト・画像・動画等のコンテンツに関する著作権・知的財産権は、
                  すべて当サービスまたは正当な権利を有する第三者に帰属します。
                  利用者は、個人的な学習目的の範囲でのみ利用できます。
                </p>
              </div>

              <div>
                <h2 className="text-base font-black text-gray-900 mb-3">第4条（教材の複製・転載・共有・転売の禁止）</h2>
                <p>
                  購入した講座・教材の全部または一部を、複製・転載・スクリーンショット・録音・録画・転売・無償配布・
                  有償配布・グループへの共有等の方法で第三者に提供することを固く禁じます。
                  違反が確認された場合は、法的措置を講じる場合があります。
                </p>
              </div>

              <div>
                <h2 className="text-base font-black text-gray-900 mb-3">第5条（アカウント共有の禁止）</h2>
                <p>購入者本人以外の第三者によるアカウントの利用・共有を禁止します。</p>
              </div>

              <div>
                <h2 className="text-base font-black text-gray-900 mb-3">第6条（サービス内容の変更・中断・終了）</h2>
                <p>
                  当サービスは、利用者への事前通知なく、サービス内容の変更・一時中断・終了を行う場合があります。
                  これにより利用者に損害が生じた場合でも、当サービスは責任を負いません。
                </p>
              </div>

              <div>
                <h2 className="text-base font-black text-gray-900 mb-3">第7条（免責事項）</h2>
                <p>
                  当サービスの提供するコンテンツ・情報は、収益・成果を保証するものではありません。
                  実践結果には個人差があります。
                  当サービスの利用により生じた損害について、当サービスは責任を負いません。
                </p>
              </div>

              <div>
                <h2 className="text-base font-black text-gray-900 mb-3">第8条（損害賠償）</h2>
                <p>
                  利用者が本規約に違反し、当サービスに損害を与えた場合、
                  利用者はその損害を賠償する責任を負います。
                </p>
              </div>

              <div>
                <h2 className="text-base font-black text-gray-900 mb-3">第9条（準拠法・管轄裁判所）</h2>
                <p>
                  本規約は日本法に準拠します。
                  本規約に関する紛争については、日本国内の適切な裁判所を専属的合意管轄裁判所とします。
                </p>
              </div>

              <div>
                <h2 className="text-base font-black text-gray-900 mb-3">第10条（お問い合わせ先）</h2>
                <p>本規約に関するお問い合わせは、以下までご連絡ください。</p>
                <p className="mt-2 font-mono bg-gray-50 px-3 py-2 rounded-lg inline-block text-xs">
                  TODO_REPLACE_CONTACT_EMAIL
                </p>
              </div>

            </div>
          </FadeIn>
        </div>
      </section>
    </MainLayout>
  );
}
