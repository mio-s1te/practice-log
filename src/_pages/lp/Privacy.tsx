// src/pages/lp/Privacy.tsx
export function Privacy() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 py-4 px-4">
        <div className="max-w-3xl mx-auto">
          <a href="/" className="text-gray-400 hover:text-white text-sm">← トップへ戻る</a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-2">プライバシーポリシー</h1>
        <p className="text-gray-400 text-sm mb-8">
          みお（以下「当方」）は、お客様の個人情報の保護を重要な責務と考え、以下のとおりプライバシーポリシーを定めます。
        </p>

        <div className="space-y-6">

          <div className="bg-gray-900 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-3">1. 事業者情報</h2>
            <p className="text-sm text-gray-300">販売業者：みお</p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-3">2. 取得する個人情報</h2>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
              <li>お名前</li>
              <li>メールアドレス</li>
              <li>決済情報（クレジットカード情報はStripe社が管理し、当方では保持しません）</li>
              <li>お問い合わせ内容</li>
              <li>アクセスログ・Cookie情報</li>
            </ul>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-3">3. 個人情報の利用目的</h2>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
              <li>購入商品・サービスの提供</li>
              <li>お問い合わせへの回答・対応</li>
              <li>重要なお知らせの連絡（サービス変更・終了等）</li>
              <li>アフィリエイトプログラムの運営・報酬管理</li>
              <li>サービス改善のための統計的分析</li>
            </ul>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-3">4. 個人情報の第三者提供</h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              取得した個人情報は、以下の場合を除き第三者へ提供しません。<br />
              ・ご本人の同意がある場合<br />
              ・法令に基づく場合<br />
              ・人の生命・身体・財産の保護のために必要な場合
            </p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-3">5. 外部サービスへの情報提供</h2>
            <p className="text-sm text-gray-300 mb-3">当サービスは以下の外部サービスを利用しており、各社のプライバシーポリシーに基づいて情報が処理されます。</p>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-300">
              <li>
                <span className="font-medium text-white">Stripe, Inc.</span>：決済処理（
                <a href="https://stripe.com/jp/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">プライバシーポリシー</a>）
              </li>
              <li>
                <span className="font-medium text-white">LINE株式会社</span>：メッセージ通知（
                <a href="https://line.me/ja/terms/policy/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">プライバシーポリシー</a>）
              </li>
              <li><span className="font-medium text-white">Supabase, Inc.</span>：データベース管理</li>
              <li><span className="font-medium text-white">Netlify, Inc.</span>：ホスティング・フォーム受信</li>
            </ul>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-3">6. Cookie（クッキー）の利用</h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              当サイトではCookieを使用することがあります。Cookieはブラウザの設定から無効にすることができますが、一部のサービスが正常に動作しない場合があります。
            </p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-3">7. アフィリエイトプログラムについて</h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              当サービスのアフィリエイトプログラムにご参加いただいた方の情報（氏名・メールアドレス・成果実績等）は、報酬の計算・支払い・プログラム運営にのみ使用します。第三者への提供は行いません。
            </p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-3">8. 個人情報の管理</h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              取得した個人情報は適切なセキュリティ対策を講じて管理します。万が一、個人情報の漏洩・滅失・毀損等が発生した場合には、速やかにお知らせします。
            </p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-3">9. 個人情報の開示・訂正・削除</h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              ご本人から個人情報の開示・訂正・利用停止・削除の申請があった場合は、本人確認の上、合理的な期間内に対応します。
              <a href="/contact" className="text-blue-400 underline hover:text-blue-300 ml-1">お問い合わせフォーム</a>よりご連絡ください。
            </p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-3">10. プライバシーポリシーの変更</h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              本ポリシーの内容は、法令の変更やサービスの変更に伴い、予告なく変更する場合があります。変更後のポリシーは本ページに掲載された時点で効力を生じるものとします。
            </p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-3">11. お問い合わせ</h2>
            <p className="text-sm text-gray-300">
              プライバシーに関するお問い合わせは
              <a href="/contact" className="text-blue-400 underline hover:text-blue-300 mx-1">お問い合わせフォーム</a>
              よりご連絡ください。
            </p>
          </div>

        </div>

        <p className="text-xs text-gray-500 mt-8 text-center">制定日：2026年1月　最終更新：2026年1月</p>
      </main>

      <footer className="bg-gray-900 border-t border-gray-800 py-6 px-4 text-center text-xs text-gray-500 mt-4">
        <div className="flex justify-center gap-4 mb-2">
          <a href="/tokushoho" className="hover:text-gray-300">特定商取引法に基づく表記</a>
          <a href="/contact" className="hover:text-gray-300">お問い合わせ</a>
        </div>
        <p>© 2026 みお</p>
      </footer>
    </div>
  );
}
