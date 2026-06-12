// src/pages/partner/PartnerDashboard.tsx
import { useEffect, useState } from 'react';

const API_BASE = '/.netlify/functions/partner-api';

function getToken() {
  return sessionStorage.getItem('partner_token') || '';
}
function apiFetch(path: string) {
  return fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  }).then(r => r.json());
}

interface ProductOption { product_id: string; permission_level: string; product: any }
interface Stats {
  total_sales: number; valid_sales_count: number; refund_count: number;
  total_revenue: number; affiliate_sales: number; direct_sales: number;
  click_count_30d: number; line_registrations: number; seminar_views: number;
  conversion_rate: string;
}

export function PartnerDashboard() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [product, setProduct] = useState<any>(null);
  const [priceTiers, setPriceTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('partner_products');
    if (stored) {
      const prods: ProductOption[] = JSON.parse(stored);
      setProducts(prods);
      if (prods.length > 0) setSelectedProductId(prods[0].product_id);
    }
  }, []);

  useEffect(() => {
    if (!selectedProductId) return;
    setLoading(true);
    apiFetch(`/products/${selectedProductId}/stats`)
      .then(data => {
        setStats(data.stats);
        setProduct(data.product);
        setPriceTiers(data.price_tiers || []);
      })
      .finally(() => setLoading(false));
  }, [selectedProductId]);

  const kpi = [
    { label: '有効販売数', value: stats?.valid_sales_count ?? '-', unit: '部', color: 'text-purple-700', bg: 'bg-purple-50' },
    { label: '総売上', value: stats?.total_revenue ? `¥${stats.total_revenue.toLocaleString()}` : '-', unit: '', color: 'text-green-700', bg: 'bg-green-50' },
    { label: '返金数', value: stats?.refund_count ?? '-', unit: '件', color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'アフィリエイト経由', value: stats?.affiliate_sales ?? '-', unit: '件', color: 'text-blue-700', bg: 'bg-blue-50' },
    { label: '直接購入', value: stats?.direct_sales ?? '-', unit: '件', color: 'text-indigo-700', bg: 'bg-indigo-50' },
    { label: 'LP アクセス（30日）', value: stats?.click_count_30d ?? '-', unit: 'PV', color: 'text-yellow-700', bg: 'bg-yellow-50' },
    { label: 'LINE 登録者', value: stats?.line_registrations ?? '-', unit: '人', color: 'text-teal-700', bg: 'bg-teal-50' },
    { label: 'セミナー視聴', value: stats?.seminar_views ?? '-', unit: '回', color: 'text-orange-700', bg: 'bg-orange-50' },
    { label: '購入率', value: stats?.conversion_rate ?? '-', unit: '%', color: 'text-pink-700', bg: 'bg-pink-50' },
  ];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-0.5">自分の商品の販売状況を確認できます</p>
        </div>
        {/* 商品切り替え */}
        {products.length > 1 && (
          <select
            value={selectedProductId}
            onChange={e => setSelectedProductId(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {products.map(p => (
              <option key={p.product_id} value={p.product_id}>
                {p.product?.name || p.product_id}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 商品情報バナー */}
      {product && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">{product.name}</h2>
              <p className="text-sm text-gray-500 mt-1">現在価格: <span className="text-purple-700 font-bold text-base">¥{(product.price || 0).toLocaleString()}</span></p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {product.status === 'active' ? '販売中' : product.status}
            </span>
          </div>

          {/* 段階価格 */}
          {priceTiers.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">段階価格設定</p>
              <div className="flex flex-wrap gap-2">
                {priceTiers.map((t: any) => (
                  <div key={t.tier_id}
                    className={`px-3 py-1.5 rounded-lg text-xs ${t.price === product.price ? 'bg-purple-100 text-purple-700 font-bold ring-1 ring-purple-300' : 'bg-gray-100 text-gray-600'}`}>
                    {t.tier_name}: ¥{t.price.toLocaleString()}
                    <span className="ml-1 opacity-70">({t.min_valid_sales_count}部〜{t.max_valid_sales_count ? t.max_valid_sales_count + '部' : ''})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI グリッド */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
          {kpi.map(k => (
            <div key={k.label} className={`${k.bg} rounded-2xl p-4`}>
              <p className="text-xs text-gray-500 mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>
                {k.value}<span className="text-sm font-normal ml-1">{k.unit}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 注意書き */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">⚠️ 変更・操作について</p>
        <ul className="space-y-1 text-xs">
          <li>• 価格変更・報酬変更・キャンペーン操作は <strong>申請制</strong> です</li>
          <li>• 「申請管理」ページから申請を作成してください</li>
          <li>• 承認後に内容が反映されます</li>
          <li>• 他の商品・提供者のデータは表示されません</li>
        </ul>
      </div>
    </div>
  );
}
