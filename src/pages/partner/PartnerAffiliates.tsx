// src/pages/partner/PartnerAffiliates.tsx
// 紹介者別成果 + キャンペーン別成果 (タブ切り替え)
import { useEffect, useState } from 'react';

const API_BASE = '/.netlify/functions/partner-api';
function getToken() { return sessionStorage.getItem('partner_token') || ''; }
function apiFetch(path: string) {
  return fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json());
}

export function PartnerAffiliates() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [tab, setTab] = useState<'affiliates' | 'campaigns'>('affiliates');
  const [loading, setLoading] = useState(false);

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
    Promise.all([
      apiFetch(`/products/${selectedProductId}/affiliates`),
      apiFetch(`/products/${selectedProductId}/campaigns`),
    ]).then(([aff, cam]) => {
      setAffiliates(aff.affiliates || []);
      setCampaigns(cam.campaigns || []);
    }).finally(() => setLoading(false));
  }, [selectedProductId]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">紹介者・キャンペーン成果</h1>
          <p className="text-sm text-gray-500">自分の商品に関する成果のみ</p>
        </div>
        {products.length > 1 && (
          <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product?.name}</option>)}
          </select>
        )}
      </div>

      {/* タブ */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['affiliates', 'campaigns'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'affiliates' ? '👥 紹介者別' : '🎯 キャンペーン別'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : tab === 'affiliates' ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">紹介者名</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">コード</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">販売数</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">売上合計</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">参加キャンペーン</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {affiliates.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">データがありません</td></tr>
                ) : affiliates.map((a: any) => (
                  <tr key={a.affiliate_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{a.affiliate_name || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{a.affiliate_code}</td>
                    <td className="px-4 py-3 text-right font-bold text-purple-700">{a.sales_count}</td>
                    <td className="px-4 py-3 text-right text-gray-900">¥{(a.total_amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{a.campaigns.join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">キャンペーン名</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">ステータス</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">報酬</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">販売数</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">売上合計</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">データがありません</td></tr>
                ) : campaigns.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.status === 'active' ? 'bg-green-100 text-green-700' :
                        c.status === 'recruiting' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {c.commission_type === 'fixed' ? `¥${c.commission_amount?.toLocaleString()}` : `${c.commission_amount}%`}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-purple-700">{c.completed_sales}</td>
                    <td className="px-4 py-3 text-right text-gray-900">¥{(c.total_revenue || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
