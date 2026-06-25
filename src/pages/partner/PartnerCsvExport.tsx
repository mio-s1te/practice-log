// src/pages/partner/PartnerCsvExport.tsx
import { useState, useEffect } from 'react';

const API_BASE = '/.netlify/functions/partner-api';
function getToken() { return sessionStorage.getItem('partner_token') || ''; }

const CSV_TYPES = [
  { value: 'purchases',    label: '購入CSV',         description: '購入者・購入金額・ステータス一覧' },
  { value: 'sales',        label: '売上CSV',          description: 'ID・金額・ステータス・購入元' },
  { value: 'affiliates',   label: '紹介者別成果CSV',  description: '紹介者名・コード・販売数・売上合計' },
  { value: 'daily_sales',  label: '日別売上CSV',      description: '日付・件数・売上合計の推移' },
  { value: 'campaigns',    label: 'キャンペーン別CSV', description: 'キャンペーン名・販売数・売上合計' },
];

export function PartnerCsvExport() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('partner_products');
    if (stored) {
      const prods = JSON.parse(stored);
      setProducts(prods);
      if (prods.length > 0) setSelectedProductId(prods[0].product_id);
    }
  }, []);

  const handleExport = async (csvType: string) => {
    if (!selectedProductId) return;
    setLoading(csvType);
    setForbidden(false);
    try {
      const res = await fetch(`${API_BASE}/products/${selectedProductId}/csv/${csvType}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (res.status === 403) {
        const data = await res.json();
        if (data.error?.includes('権限')) { setForbidden(true); return; }
      }

      const contentType = res.headers.get('Content-Type') || '';
      if (!contentType.includes('text/csv')) {
        const data = await res.json();
        alert(data.error || 'エラーが発生しました');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date().toISOString().slice(0, 10);
      a.download = `${csvType}_${now}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">CSV出力</h1>
          <p className="text-sm text-gray-500">自分の商品データのみ出力できます</p>
        </div>
        {products.length > 1 && (
          <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product?.name}</option>)}
          </select>
        )}
      </div>

      {forbidden && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
          CSV出力の権限がありません。管理者にお問い合わせください。
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CSV_TYPES.map(csv => (
          <div key={csv.value} className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="mb-3">
              <h3 className="font-medium text-gray-900">{csv.label}</h3>
              <p className="text-xs text-gray-500 mt-1">{csv.description}</p>
            </div>
            <button
              onClick={() => handleExport(csv.value)}
              disabled={loading === csv.value || !selectedProductId}
              className="w-full bg-purple-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {loading === csv.value ? 'ダウンロード中...' : '📥 ダウンロード'}
            </button>
          </div>
        ))}
      </div>

      {/* 注意書き */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 text-sm text-gray-600">
        <p className="font-medium mb-2">⚠️ 出力できないCSV</p>
        <ul className="space-y-1 text-xs text-gray-500">
          <li>✗ 全購入CSV（他商品のデータを含む）</li>
          <li>✗ 全紹介者CSV</li>
          <li>✗ 全LINE登録者CSV</li>
          <li>✗ 全報酬CSV</li>
          <li>✗ 他商品・他提供者のCSV</li>
        </ul>
      </div>
    </div>
  );
}
