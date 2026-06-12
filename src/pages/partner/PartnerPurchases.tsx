// src/pages/partner/PartnerPurchases.tsx
import { useEffect, useState } from 'react';

const API_BASE = '/.netlify/functions/partner-api';
function getToken() { return sessionStorage.getItem('partner_token') || ''; }

export function PartnerPurchases() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [purchases, setPurchases] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('partner_products');
    if (stored) {
      const prods = JSON.parse(stored);
      setProducts(prods);
      if (prods.length > 0) setSelectedProductId(prods[0].product_id);
    }
  }, []);

  useEffect(() => {
    if (!selectedProductId) return;
    setLoading(true);
    setForbidden(false);
    fetch(`${API_BASE}/products/${selectedProductId}/purchases`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.error === '顧客情報の閲覧権限がありません') { setForbidden(true); return; }
        setPurchases(data.purchases || []);
        setTotal(data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [selectedProductId]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">購入者一覧</h1>
          <p className="text-sm text-gray-500 mt-0.5">自分の商品の購入者のみ表示されます</p>
        </div>
        {products.length > 1 && (
          <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            {products.map(p => (
              <option key={p.product_id} value={p.product_id}>{p.product?.name}</option>
            ))}
          </select>
        )}
      </div>

      {forbidden ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center text-amber-700">
          <p className="font-medium">購入者情報の閲覧権限がありません</p>
          <p className="text-sm mt-1">管理者にお問い合わせください</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">合計 {total} 件</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">購入日時</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">金額</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">ステータス</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">購入元</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">紹介者</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">キャンペーン</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {purchases.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">データがありません</td></tr>
                  ) : purchases.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{p.purchased_at ? new Date(p.purchased_at).toLocaleDateString('ja-JP') : '-'}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">¥{(p.amount_total || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.status === 'completed' ? 'bg-green-100 text-green-700' :
                          p.status === 'refunded' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'}`}>
                          {p.status}
                        </span>
                        {!p.access_verified && (
                          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">権限なし経由</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.purchase_source}</td>
                      <td className="px-4 py-3 text-gray-600">{p.affiliate_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{p.campaign_name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
