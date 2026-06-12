// src/pages/admin/AdminApprovals.tsx
// パートナー申請の審査（承認/却下）+ 紹介申請の審査
import { useEffect, useState } from 'react';

const ADMIN_TOKEN = () => sessionStorage.getItem('admin_token') || import.meta.env.VITE_ADMIN_SECRET_TOKEN || '';
const API = (path: string, opts?: RequestInit) =>
  fetch(`/.netlify/functions/admin-api${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN()}` },
    ...opts,
  }).then(r => r.json());

const REQUEST_TYPE_LABELS: Record<string, string> = {
  product_description_change: '商品説明変更', price_change: '価格変更', commission_change: '報酬変更',
  campaign_start: 'キャンペーン開始', campaign_stop: 'キャンペーン停止',
  material_add: '素材追加', notice_delivery: 'お知らせ配信',
};
const REQUEST_TYPE_COLORS: Record<string, string> = {
  price_change: 'bg-purple-100 text-purple-700', commission_change: 'bg-indigo-100 text-indigo-700',
  campaign_start: 'bg-green-100 text-green-700', campaign_stop: 'bg-orange-100 text-orange-700',
  notice_delivery: 'bg-pink-100 text-pink-700', material_add: 'bg-teal-100 text-teal-700',
  product_description_change: 'bg-blue-100 text-blue-700',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-500',
};

export function AdminApprovals() {
  const [tab, setTab] = useState<'partner' | 'affiliate'>('partner');
  const [partnerRequests, setPartnerRequests] = useState<any[]>([]);
  const [affiliateApps, setAffiliateApps] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [rejectionModal, setRejectionModal] = useState<{ id: string; type: 'partner' | 'affiliate' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [message, setMessage] = useState('');

  const adminEmail = sessionStorage.getItem('admin_email') || '';

  useEffect(() => {
    loadData();
  }, [filterStatus, tab]);

  const loadData = () => {
    setLoading(true);
    const statusParam = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
    if (tab === 'partner') {
      API(`/partner-requests${statusParam}`).then(d => setPartnerRequests(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
    } else {
      API(`/campaign-applications${statusParam}`).then(d => setAffiliateApps(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
    }
  };

  const handleApprovePartner = async (id: string) => {
    const res = await API(`/partner-requests/${id}/approve`, { method: 'POST', body: JSON.stringify({ admin_email: adminEmail }) });
    if (res.id) { setMessage('承認しました'); loadData(); }
  };

  const handleRejectPartner = async () => {
    if (!rejectionModal || !rejectionReason.trim()) return;
    const res = await API(`/partner-requests/${rejectionModal.id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason: rejectionReason, admin_email: adminEmail }),
    });
    if (res.id) { setMessage('却下しました'); setRejectionModal(null); setRejectionReason(''); loadData(); }
  };

  const handleApproveAffiliate = async (id: string) => {
    const res = await API(`/campaign-applications/${id}/approve`, { method: 'POST', body: JSON.stringify({ admin_email: adminEmail }) });
    if (res.success) { setMessage('紹介申請を承認しました'); loadData(); }
  };

  const handleRejectAffiliate = async () => {
    if (!rejectionModal || !rejectionReason.trim()) return;
    const res = await API(`/campaign-applications/${rejectionModal.id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason: rejectionReason, admin_email: adminEmail }),
    });
    if (res.success) { setMessage('紹介申請を却下しました'); setRejectionModal(null); setRejectionReason(''); loadData(); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">申請審査</h1>
          <p className="text-sm text-gray-500">パートナー申請・紹介申請の承認・却下</p>
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="pending">審査待ち</option>
          <option value="approved">承認済み</option>
          <option value="rejected">却下済み</option>
          <option value="all">すべて</option>
        </select>
      </div>

      {message && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm">
          {message} <button onClick={() => setMessage('')} className="ml-2 text-xs opacity-70">✕</button>
        </div>
      )}

      {/* タブ */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['partner', 'affiliate'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'partner' ? '🏢 パートナー申請' : '🔗 紹介申請'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : tab === 'partner' ? (
        <div className="space-y-3">
          {partnerRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">申請がありません</div>
          ) : partnerRequests.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${REQUEST_TYPE_COLORS[r.request_type] || 'bg-gray-100 text-gray-600'}`}>
                      {REQUEST_TYPE_LABELS[r.request_type] || r.request_type}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">申請者: {r.requester?.display_name || r.requester?.email}</p>
                  <p className="text-sm text-gray-600">商品: {r.products?.name}</p>
                  {r.request_data?.reason && <p className="text-sm text-gray-600 mt-1">理由: {r.request_data.reason}</p>}
                  {Object.keys(r.request_data || {}).filter(k => k !== 'reason').length > 0 && (
                    <pre className="mt-2 text-xs bg-gray-50 p-2 rounded-lg overflow-x-auto">
                      {JSON.stringify(r.request_data, null, 2)}
                    </pre>
                  )}
                  {r.rejection_reason && <p className="mt-2 text-sm text-red-600">却下理由: {r.rejection_reason}</p>}
                  <p className="text-xs text-gray-400 mt-2">{new Date(r.created_at).toLocaleString('ja-JP')}</p>
                </div>
                {r.status === 'pending' && (
                  <div className="flex flex-col gap-2">
                    <button onClick={() => handleApprovePartner(r.id)}
                      className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700">承認</button>
                    <button onClick={() => { setRejectionModal({ id: r.id, type: 'partner' }); setRejectionReason(''); }}
                      className="bg-red-50 text-red-600 border border-red-200 px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100">却下</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {affiliateApps.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">申請がありません</div>
          ) : affiliateApps.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">申請者: {a.affiliate?.name} ({a.affiliate?.email})</p>
                  <p className="text-sm text-gray-600">案件: {a.campaign?.name}</p>
                  {a.campaign?.products?.name && <p className="text-sm text-gray-500">商品: {a.campaign.products.name}</p>}
                  <div className="mt-2 space-y-1 text-xs text-gray-600">
                    {a.application_reason && <p>📌 紹介理由: {a.application_reason}</p>}
                    {a.promotion_channel && <p>📱 媒体: {a.promotion_channel}</p>}
                    {a.target_audience && <p>👥 想定読者: {a.target_audience}</p>}
                    {a.past_results && <p>📊 実績: {a.past_results}</p>}
                    <p>PR表記同意: {a.agreed_to_rules ? '✅' : '❌'} / 禁止表現同意: {a.agreed_no_prohibited ? '✅' : '❌'}</p>
                    {a.affiliate?.tags?.length > 0 && <p>タグ: {a.affiliate.tags.join(', ')}</p>}
                  </div>
                  {a.rejection_reason && <p className="mt-2 text-sm text-red-600">却下理由: {a.rejection_reason}</p>}
                  <p className="text-xs text-gray-400 mt-2">{new Date(a.created_at).toLocaleString('ja-JP')}</p>
                </div>
                {a.status === 'pending' && (
                  <div className="flex flex-col gap-2">
                    <button onClick={() => handleApproveAffiliate(a.id)}
                      className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700">承認</button>
                    <button onClick={() => { setRejectionModal({ id: a.id, type: 'affiliate' }); setRejectionReason(''); }}
                      className="bg-red-50 text-red-600 border border-red-200 px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100">却下</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 却下モーダル */}
      {rejectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md">
            <h3 className="font-bold text-gray-900 mb-4">却下理由を入力してください</h3>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="却下理由を記入してください（申請者に通知されます）"
            />
            <div className="flex gap-3">
              <button onClick={rejectionModal.type === 'partner' ? handleRejectPartner : handleRejectAffiliate}
                disabled={!rejectionReason.trim()}
                className="flex-1 bg-red-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                却下する
              </button>
              <button onClick={() => setRejectionModal(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-xl text-sm hover:bg-gray-50">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
