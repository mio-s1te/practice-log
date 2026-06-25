// src/pages/partner/PartnerRequests.tsx
// 申請管理（作成・一覧・キャンセル）
import { useEffect, useState } from 'react';

const API_BASE = '/.netlify/functions/partner-api';
function getToken() { return sessionStorage.getItem('partner_token') || ''; }
function apiFetch(path: string, opts?: RequestInit) {
  return fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json', ...((opts?.headers) as any) },
    ...opts,
  }).then(r => r.json());
}

const REQUEST_TYPES = [
  { value: 'product_description_change', label: '商品説明変更申請', color: 'bg-blue-100 text-blue-700', needsOwner: false },
  { value: 'price_change',               label: '価格変更申請',     color: 'bg-purple-100 text-purple-700', needsOwner: true },
  { value: 'commission_change',          label: '紹介報酬変更申請', color: 'bg-indigo-100 text-indigo-700', needsOwner: true },
  { value: 'campaign_start',             label: 'キャンペーン開始申請', color: 'bg-green-100 text-green-700', needsOwner: false },
  { value: 'campaign_stop',              label: 'キャンペーン停止申請', color: 'bg-orange-100 text-orange-700', needsOwner: false },
  { value: 'material_add',               label: '紹介素材追加申請', color: 'bg-teal-100 text-teal-700', needsOwner: false },
  { value: 'notice_delivery',            label: '購入者向けお知らせ配信申請', color: 'bg-pink-100 text-pink-700', needsOwner: false },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

export function PartnerRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // フォーム
  const [formProductId, setFormProductId] = useState('');
  const [formType, setFormType] = useState('product_description_change');
  const [formData, setFormData] = useState('');
  const [formReason, setFormReason] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('partner_products');
    if (stored) {
      const prods = JSON.parse(stored);
      setProducts(prods);
      if (prods.length > 0) setFormProductId(prods[0].product_id);
    }
    loadRequests();
  }, []);

  const loadRequests = () => {
    setLoading(true);
    apiFetch('/requests').then(data => setRequests(data.requests || [])).finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      let parsedData: any = { reason: formReason };
      // フォームデータをJSONとして解釈
      if (formData.trim()) {
        try { parsedData = { ...parsedData, ...JSON.parse(formData) }; } catch { parsedData.description = formData; }
      }
      const res = await apiFetch('/requests', {
        method: 'POST',
        body: JSON.stringify({ product_id: formProductId, request_type: formType, request_data: parsedData }),
      });
      if (res.request) {
        setMessage('申請を送信しました。管理者の審査をお待ちください。');
        setShowForm(false);
        setFormData('');
        setFormReason('');
        loadRequests();
      } else {
        setMessage(res.error || '申請に失敗しました');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('申請をキャンセルしますか？')) return;
    const res = await apiFetch(`/requests/${id}/cancel`, { method: 'PUT' });
    if (res.request) loadRequests();
  };

  const typeInfo = (v: string) => REQUEST_TYPES.find(t => t.value === v);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">申請管理</h1>
          <p className="text-sm text-gray-500">価格・報酬・キャンペーンの変更は申請制です</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setMessage(''); }}
          className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700">
          ＋ 新規申請
        </button>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm ${message.includes('失敗') || message.includes('error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* 申請フォーム */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-purple-200 p-5">
          <h2 className="font-bold text-gray-900 mb-4">新規申請</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {products.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">対象商品</label>
                <select value={formProductId} onChange={e => setFormProductId(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product?.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">申請種別</label>
              <select value={formType} onChange={e => setFormType(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                {REQUEST_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">申請理由・詳細</label>
              <textarea
                value={formReason}
                onChange={e => setFormReason(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="申請の理由や背景を記入してください"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">変更内容（任意・JSON形式）</label>
              <textarea
                value={formData}
                onChange={e => setFormData(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder={formType === 'price_change' ? '{"new_price": 49800}' : formType === 'notice_delivery' ? '{"title": "お知らせ", "body": "内容"}' : '変更内容をJSON形式または自由記述で記入'}
              />
              <p className="text-xs text-gray-400 mt-1">価格変更: {'{'}new_price: 金額{'}'} / お知らせ: {'{'}title, body{'}'}</p>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={submitting}
                className="bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                {submitting ? '送信中...' : '申請を送信'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="border border-gray-300 text-gray-700 px-5 py-2 rounded-xl text-sm hover:bg-gray-50">
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 申請一覧 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">申請はありません</div>
          ) : requests.map((r: any) => {
            const info = typeInfo(r.request_type);
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${info?.color}`}>{info?.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                      <span className="text-xs text-gray-400">{r.products?.name}</span>
                    </div>
                    <p className="text-sm text-gray-700">{r.request_data?.reason || JSON.stringify(r.request_data)}</p>
                    {r.rejection_reason && (
                      <div className="mt-2 bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg">
                        却下理由: {r.rejection_reason}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">{new Date(r.created_at).toLocaleString('ja-JP')}</p>
                  </div>
                  {r.status === 'pending' && (
                    <button onClick={() => handleCancel(r.id)}
                      className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1 rounded-lg">
                      キャンセル
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
