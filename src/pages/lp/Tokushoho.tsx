// src/pages/lp/Tokushoho.tsx
export function Tokushoho() {
  const rows = [
    {
      label: '販売業者',
      value: 'みお',
    },
    {
      label: '代表者',
      value: 'みお',
    },
    {
      label: '所在地',
      value: '請求があり次第、遅滞なく開示いたします',
    },
    {
      label: '電話番号',
      value: '請求があり次第、遅滞なく開示いたします',
    },
    {
      label: 'お問い合わせ',
      value: (
        <a href="/contact" className="text-blue-400 underline hover:text-blue-300">
          お問い合わせフォームはこちら
        </a>
      ),
    },
    {
      label: '販売価格',
      value: (
        <ul className="space-y-1">
          <li>
            <span className="font-semibold">AI副業1時間化スタート講座</span><br />
            <span className="text-gray-300 text-sm">
              〜1,000部：29,800円（税込）<br />
              1,001〜10,000部：49,800円（税込）<br />
              10,001部〜：99,800円（税込）
            </span>
          </li>
          <li className="mt-2">
            <span className="font-semibold">プロAIアフィリエイター養成講座</span><br />
            <span className="text-gray-300 text-sm">
              スタート講座1,000部達成まで：4,980円（税込）<br />
              1,000部達成後：99,800円（税込）
            </span>
          </li>
        </ul>
      ),
    },
    {
      label: '販売価格以外の費用',
      value: 'インターネット接続に必要な通信費・機器代はお客様のご負担となります',
    },
    {
      label: '支払い方法',
      value: 'クレジットカード（Stripe決済）',
    },
    {
      label: 'お支払い時期',
      value: 'ご購入時に即時決済',
    },
    {
      label: '報酬振込時期',
      value: '紹介報酬のお支払いは翌月末払い',
    },
    {
      label: 'サービス提供時期',
      value: '決済完了後、すぐにご利用いただけます',
    },
    {
      label: '返品・キャンセル',
      value: (
        <>
          デジタルコンテンツの性質上、原則として返金・キャンセルはお受けしておりません。<br />
          ただし、二重決済等の明らかな決済エラーが発生した場合は、
          <a href="/contact" className="text-blue-400 underline hover:text-blue-300">お問い合わせフォーム</a>
          よりご連絡ください。確認の上、対応いたします。
        </>
      ),
    },
    {
      label: '動作環境',
      value: 'インターネットに接続されたPC・スマートフォン・タブレット（最新ブラウザ推奨）',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ヘッダー */}
      <header className="bg-gray-900 border-b border-gray-800 py-4 px-4">
        <div className="max-w-3xl mx-auto">
          <a href="/" className="text-gray-400 hover:text-white text-sm">← トップへ戻る</a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-2">特定商取引法に基づく表記</h1>
        <p className="text-gray-400 text-sm mb-8">
          特定商取引に関する法律第11条に基づき、以下の事項を表記します。
        </p>

        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800/50'}>
                  <th className="text-left align-top px-5 py-4 text-gray-400 font-medium whitespace-nowrap w-36 border-r border-gray-700">
                    {row.label}
                  </th>
                  <td className="px-5 py-4 text-gray-200 leading-relaxed">
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-500 mt-6 text-center">
          最終更新：2026年1月
        </p>
      </main>

      {/* フッター */}
      <footer className="bg-gray-900 border-t border-gray-800 py-6 px-4 text-center text-xs text-gray-500 mt-4">
        <div className="flex justify-center gap-4 mb-2">
          <a href="/privacy" className="hover:text-gray-300">プライバシーポリシー</a>
          <a href="/contact" className="hover:text-gray-300">お問い合わせ</a>
        </div>
        <p>© 2026 みお</p>
      </footer>
    </div>
  );
}
