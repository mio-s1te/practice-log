// src/pages/partner/PartnerNotices.tsx
import { useEffect, useState } from 'react';

const API_BASE = '/.netlify/functions/partner-api';
function getToken() { return sessionStorage.getItem('partner_token') || ''; }

export function PartnerNotices() {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/notices`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => setNotices(d.notices || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">購入者向けお知らせ履歴</h1>
        <p className="text-sm text-gray-500 mt-0.5">自分の商品の購入者に配信されたお知らせ一覧です</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : notices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
          お知らせ履歴はありません
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((n: any) => (
            <div key={n.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${n.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {n.is_published ? '配信済み' : '下書き'}
                    </span>
                    <span className="text-xs text-gray-400">{n.type}</span>
                  </div>
                  <h3 className="font-medium text-gray-900">{n.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    配信日時: {n.published_at ? new Date(n.published_at).toLocaleString('ja-JP') : '-'}
                    {n.created_by && <span className="ml-2">配信者: {n.created_by}</span>}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">📝 お知らせの配信について</p>
        <p className="text-xs">新規お知らせの配信は「申請管理」ページから「購入者向けお知らせ配信申請」として申請してください。管理者の承認後に配信されます。</p>
      </div>
    </div>
  );
}
