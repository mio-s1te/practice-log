import { MainLayout } from '@/components/main/MainLayout';
import { FadeIn } from '@/components/main/FadeIn';

export function TokushohoPage() {
  const rows = [
    { label: '販売事業者', value: 'TODO_REPLACE_SELLER_NAME' },
    { label: '運営責任者', value: 'TODO_REPLACE_MANAGER_NAME' },
    { label: '所在地', value: 'TODO_REPLACE_ADDRESS\n※個人事業主で住所表示をどうするか未確定の場合は、法令上の表示義務を確認したうえで設定する必要があります。' },
    { label: '電話番号', value: 'TODO_REPLACE_PHONE\n※必要に応じて「請求があった場合には遅滞なく開示します」等の記載可否を専門家に確認してください。' },
    { label: 'メールアドレス', value: 'TODO_REPLACE_CONTACT_EMAIL' },
    { label: '販売URL', value: 'TODO_REPLACE_SITE_URL' },
    { label: '販売価格', value: '各商品ページおよび決済ページに表示された金額をご確認ください。' },
    { label: '商品代金以外の必要料金', value: 'インターネット接続料金、通信料金、振込手数料等はお客様のご負担となります。' },
    { label: '支払方法', value: 'クレジットカード決済、その他決済ページに表示される方法' },
    { label: '支払時期', value: '各決済サービスの定める時期に決済されます。' },
    { label: '商品の引渡時期', value: '決済完了後、案内ページまたはメール等にて閲覧方法をご案内します。' },
    { label: '返品・キャンセルについて', value: 'デジタルコンテンツの性質上、購入後のお客様都合による返品・キャンセル・返金は原則としてお受けしておりません。ただし、重複決済やシステム不具合等が確認された場合は、個別に対応いたします。' },
    { label: '動作環境', value: 'インターネット環境、スマートフォンまたはPC、各種ブラウザが必要です。' },
    { label: '表現および商品に関する注意書き', value: '本商品に示された表現や再現性には個人差があり、必ずしも利益や成果を保証するものではありません。' },
  ];

  return (
    <MainLayout>
      <section className="bg-[#fdfaf6] pt-12 pb-10 md:pt-16">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <FadeIn>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">特定商取引法に基づく表記</h1>
            <p className="text-xs text-gray-500">最終更新日：2026年6月</p>
          </FadeIn>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <FadeIn>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700 w-40 md:w-48 align-top whitespace-nowrap">
                        {row.label}
                      </th>
                      <td className="py-4 px-4 text-gray-600 leading-relaxed whitespace-pre-line">
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeIn>
        </div>
      </section>
    </MainLayout>
  );
}
