import { MainLayout } from '@/components/main/MainLayout';
import { FadeIn } from '@/components/main/FadeIn';

export function PrivacyPage() {
  return (
    <MainLayout>
      <section className="bg-[#fdfaf6] pt-12 pb-10 md:pt-16">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <FadeIn>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">プライバシーポリシー</h1>
            <p className="text-xs text-gray-500">最終更新日：2026年6月</p>
          </FadeIn>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <FadeIn>
            <div className="prose prose-sm max-w-none text-gray-700 leading-[1.9] space-y-8">

              <div>
                <h2 className="text-lg font-black text-gray-900 mb-3">1. 取得する情報</h2>
                <p>本サイトでは、以下の情報を取得する場合があります。</p>
                <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                  <li>氏名</li>
                  <li>メールアドレス</li>
                  <li>LINEアカウント情報</li>
                  <li>お問い合わせ内容</li>
                  <li>購入情報（商品名、購入日時、決済情報等）</li>
                  <li>アクセス解析情報（IPアドレス、ブラウザ情報、閲覧履歴等）</li>
                </ul>
              </div>

              <div>
                <h2 className="text-lg font-black text-gray-900 mb-3">2. 利用目的</h2>
                <p>取得した個人情報は、以下の目的に利用します。</p>
                <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                  <li>講座・教材の提供</li>
                  <li>お問い合わせへの対応</li>
                  <li>購入者管理</li>
                  <li>サービスの改善・新サービスの開発</li>
                  <li>重要なお知らせの配信</li>
                  <li>マーケティング分析</li>
                </ul>
              </div>

              <div>
                <h2 className="text-lg font-black text-gray-900 mb-3">3. 第三者への提供</h2>
                <p>法令に基づく場合を除き、本人の同意なく第三者に個人情報を提供しません。</p>
              </div>

              <div>
                <h2 className="text-lg font-black text-gray-900 mb-3">4. 外部サービスの利用</h2>
                <p>本サービスでは、以下の外部サービスを利用する場合があります。各サービスのプライバシーポリシーをご確認ください。</p>
                <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                  <li>Stripe（決済処理）</li>
                  <li>LINE（連絡・コンテンツ配信）</li>
                  <li>Google Analytics（アクセス解析）</li>
                  <li>その他必要な外部サービス</li>
                </ul>
              </div>

              <div>
                <h2 className="text-lg font-black text-gray-900 mb-3">5. Cookieについて</h2>
                <p>
                  本サイトでは、アクセス解析や利便性向上のためCookieを使用する場合があります。
                  ブラウザの設定からCookieを無効にすることができますが、
                  一部の機能が利用できなくなる場合があります。
                </p>
              </div>

              <div>
                <h2 className="text-lg font-black text-gray-900 mb-3">6. 個人情報の管理</h2>
                <p>個人情報への不正アクセス、紛失、破壊、改ざんおよび漏洩を防止するために、適切な安全管理措置を講じます。</p>
              </div>

              <div>
                <h2 className="text-lg font-black text-gray-900 mb-3">7. 開示・訂正・削除の請求</h2>
                <p>
                  ご本人から個人情報の開示・訂正・削除のご請求があった場合は、
                  合理的な範囲で対応いたします。下記お問い合わせ先までご連絡ください。
                </p>
              </div>

              <div>
                <h2 className="text-lg font-black text-gray-900 mb-3">8. お問い合わせ先</h2>
                <p>本プライバシーポリシーに関するお問い合わせは、以下までご連絡ください。</p>
                <p className="mt-2 text-sm font-mono bg-gray-50 px-3 py-2 rounded-lg inline-block">
                  info@mio-busi.com
                </p>
              </div>

            </div>
          </FadeIn>
        </div>
      </section>
    </MainLayout>
  );
}
