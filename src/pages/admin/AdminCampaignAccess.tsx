// src/pages/admin/AdminCampaignAccess.tsx
// キャンペーン紹介権限管理（access_type設定・個別権限付与）
import { useEffect, useState } from 'react';

const ADMIN_TOKEN = () => sessionStorage.getItem('admin_token') || '';
const API = (path: string, opts?: RequestInit) =>
  fetch(`/.netlify/functions/admin-api${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN()}` },
    ...opts,
  }).then(r => r.json());

const ACCESS_TYPE_LABELS: Record<string, string> = {
  public: '全員紹介OK', approved_only: '承認済みのみ',
  specific_affiliates: '指定アフィリエイターのみ', tag_based: '指定タグのみ',
};
const ACCESS_TYPE_COLORS: Record<string, string> = {
  public: 'bg-green-100 text-green-700', approved_only: 'bg-blue-100 text-blue-700',
  specific_affiliates: 'bg-purple-100 text-purple-700', tag_based: 'bg-orange-100 text-orange-700',
};
const ACCESS_STATUS_COLORS: Record<string, string> = {
  approved: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700',
  rejected: 'bg-red-100 text-red-700', revoked: 'bg-gray-100 text-gray-500',
};

export function AdminCampaignAccess() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [accesses, setAccesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [selectedAffiliates, setSelectedAffiliates] = useState<string[]>([]);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [editAccessType, setEditAccessType] = useState('public');
  const [editTags, setEditTags] = useState('');
  const [editAllowApp, setEditAllowApp] = useState(true);

  const adminEmail = sessionStorage.getItem('admin_email') || '';

  useEffect(() => {
    setLoading(true);
    Promise.all([
      API('/campaigns'),
      API('/affiliates'),
    ]).then(([c, a]) => {
      setCampaigns(Array.isArray(c) ? c : []);
      setAffiliates(Array.isArray(a) ? a : []);
    }).finally(() => setLoading(false));
  }, []);

  const loadAccesses = (campaignId: string) => {
    API(`/campaign-access?campaign_id=${campaignId}`).then(d => {
      setAccesses(Array.isArray(d) ? d : []);
    });
  };

  const handleSelectCampaign = (c: any) => {
    setSelectedCampaign(c);
    loadAccesses(c.id);
  };

  const handleSaveAccessType = async () => {
    if (!editingCampaign) return;
    const tags = editTags ? editTags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const res = await API(`/campaigns/${editingCampaign.id}`, {
      method: 'PUT',
      body: JSON.stringify({ access_type: editAccessType, required_affiliate_tags: tags, allow_application: editAllowApp }),
    });
    if (res.id) {
      setMessage('紹介権限設定を更新しました');
      setCampaigns(cs => cs.map(c => c.id === res.id ? { ...c, ...res } : c));
      if (selectedCampaign?.id === res.id) setSelectedCampaign({ ...selectedCampaign, ...res });
      setEditingCampaign(null);
    }
  };

  const handleGrantAccess = async () => {
    if (!selectedCampaign || selectedAffiliates.length === 0) return;
    const res = await API('/campaign-access', {
      method: 'POST',
      body: JSON.stringify({ campaign_id: selectedCampaign.id, affiliate_ids: selectedAffiliates, granted_by: adminEmail }),
    });
    if (res.success) {
      setMessage(`${res.count}人に紹介権限を付与しました`);
      setShowGrantForm(false);
      setSelectedAffiliates([]);
      loadAccesses(selectedCampaign.id);
    }
  };

  const handleRevoke = async (accessId: string) => {
    if (!confirm('紹介権限を取り消しますか？')) return;
    const res = await API(`/campaign-access/${accessId}/revoke`, { method: 'POST', body: JSON.stringify({}) });
    if (res.id) {
      setMessage('紹介権限を取り消しました');
      loadAccesses(selectedCampaign.id);
    }
  };

  // 既存のアクセスがないアフィリエイター
  const grantableAffiliates = affiliates.filter(a =>
    !accesses.some(ac => ac.affiliate_id === a.id && ac.access_status === 'approved')
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">キャンペーン紹介権限管理</h1>
        <p className="text-sm text-gray-500">案件ごとに紹介できるアフィリエイターを制限できます</p>
      </div>

      {message && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm">
          {message} <button onClick={() => setMessage('')} className="ml-2 text-xs opacity-70">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 案件一覧 */}
        <div className="lg:col-span-1 space-y-2">
          <h2 className="text-sm font-medium text-gray-700 px-1">案件一覧</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">読み込み中...</div>
          ) : campaigns.map(c => (
            <button key={c.id} onClick={() => handleSelectCampaign(c)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${selectedCampaign?.id === c.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
              <p className="font-medium text-gray-900 text-sm truncate">{c.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACCESS_TYPE_COLORS[c.access_type || 'public']}`}>
                  {ACCESS_TYPE_LABELS[c.access_type || 'public']}
                </span>
                {c.allow_application && <span className="text-xs text-gray-400">申請可</span>}
              </div>
              <p className="text-xs text-gray-400 mt-1">{c.product?.name}</p>
            </button>
          ))}
        </div>

        {/* 詳細 */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedCampaign ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">案件を選択してください</div>
          ) : (
            <>
              {/* 権限タイプ設定 */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">紹介権限設定: {selectedCampaign.name}</h3>
                  <button onClick={() => { setEditingCampaign(selectedCampaign); setEditAccessType(selectedCampaign.access_type || 'public'); setEditTags((selectedCampaign.required_affiliate_tags || []).join(',')); setEditAllowApp(selectedCampaign.allow_application !== false); }}
                    className="text-xs text-blue-600 hover:underline">設定を変更</button>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">種別: </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACCESS_TYPE_COLORS[selectedCampaign.access_type || 'public']}`}>
                      {ACCESS_TYPE_LABELS[selectedCampaign.access_type || 'public']}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">申請受付: </span>
                    <span className={`text-xs font-medium ${selectedCampaign.allow_application ? 'text-green-600' : 'text-gray-400'}`}>
                      {selectedCampaign.allow_application ? '有効' : '無効'}
                    </span>
                  </div>
                  {(selectedCampaign.required_affiliate_tags || []).length > 0 && (
                    <div>
                      <span className="text-gray-500">必要タグ: </span>
                      {selectedCampaign.required_affiliate_tags.map((t: string) => (
                        <span key={t} className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* specific_affiliatesの場合: 権限付与ボタン */}
              {(selectedCampaign.access_type === 'specific_affiliates' || selectedCampaign.access_type === 'approved_only') && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">個別権限付与</h3>
                    <button onClick={() => setShowGrantForm(!showGrantForm)}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700">
                      ＋ 権限付与
                    </button>
                  </div>
                  {showGrantForm && (
                    <div className="space-y-3">
                      <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-200 rounded-xl p-2">
                        {grantableAffiliates.map(a => (
                          <label key={a.id} className="flex items-center gap-2 text-sm px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                            <input type="checkbox" checked={selectedAffiliates.includes(a.id)}
                              onChange={e => setSelectedAffiliates(s => e.target.checked ? [...s, a.id] : s.filter(id => id !== a.id))}
                              className="rounded" />
                            <span className="font-medium">{a.name}</span>
                            <span className="text-gray-400 text-xs">{a.email}</span>
                            {a.tags?.length > 0 && <span className="text-xs text-blue-500">{a.tags.join(', ')}</span>}
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleGrantAccess} disabled={selectedAffiliates.length === 0}
                          className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                          {selectedAffiliates.length}人に権限付与
                        </button>
                        <button onClick={() => { setShowGrantForm(false); setSelectedAffiliates([]); }}
                          className="border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg text-xs hover:bg-gray-50">
                          キャンセル
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 権限リスト */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="font-medium text-gray-900 text-sm">権限付与済み一覧</h3>
                </div>
                {accesses.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">権限付与なし</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">紹介者</th>
                        <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">ステータス</th>
                        <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">付与日</th>
                        <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {accesses.map(ac => (
                        <tr key={ac.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-900">{ac.affiliate?.name}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACCESS_STATUS_COLORS[ac.access_status]}`}>
                              {ac.access_status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">
                            {ac.granted_at ? new Date(ac.granted_at).toLocaleDateString('ja-JP') : '-'}
                          </td>
                          <td className="px-4 py-2.5">
                            {ac.access_status === 'approved' && (
                              <button onClick={() => handleRevoke(ac.id)}
                                className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-0.5 rounded-lg">
                                取消
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 権限タイプ編集モーダル */}
      {editingCampaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md">
            <h3 className="font-bold text-gray-900 mb-4">紹介権限設定: {editingCampaign.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">紹介権限タイプ</label>
                <select value={editAccessType} onChange={e => setEditAccessType(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm">
                  {Object.entries(ACCESS_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              {editAccessType === 'tag_based' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">必要タグ（カンマ区切り）</label>
                  <input type="text" value={editTags} onChange={e => setEditTags(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
                    placeholder="スタート講座購入者, PR表記確認済み" />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editAllowApp} onChange={e => setEditAllowApp(e.target.checked)} className="rounded" />
                紹介申請を受け付ける（申請可能に設定する）
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSaveAccessType}
                className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
                保存
              </button>
              <button onClick={() => setEditingCampaign(null)}
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
