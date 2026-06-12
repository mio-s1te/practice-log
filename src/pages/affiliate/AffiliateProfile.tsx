// src/pages/affiliate/AffiliateProfile.tsx
import { useState, useEffect } from 'react';

export function AffiliateProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('affiliate_session_token') || '';

  useEffect(() => {
    fetch('/api/affiliate-api/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setProfile(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">👤 プロフィール</h1>
      {profile ? (
        <div className="card space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xl">
              {profile.name?.charAt(0) || '?'}
            </div>
            <div>
              <p className="font-bold text-gray-900">{profile.name}</p>
              <p className="text-sm text-gray-500">{profile.email}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">紹介者コード</p>
            <code className="font-mono text-sm font-semibold text-blue-700">{profile.affiliate_code}</code>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">LINE表示名</p>
            <p className="text-sm text-gray-900">{profile.line_display_name || '未連携'}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">ステータス</p>
            <span className={`badge ${profile.status === 'active' ? 'badge-green' : 'badge-yellow'}`}>
              {profile.status === 'active' ? '有効' : profile.status === 'pending' ? '審査中' : '停止'}
            </span>
          </div>
          <p className="text-xs text-gray-400 text-center">振込先などの変更は運営までお問い合わせください</p>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">プロフィール情報を取得できませんでした</p>
      )}
    </div>
  );
}

// src/pages/affiliate/AffiliateMaterials.tsx
export function AffiliateMaterials() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [assets, setAssets] = useState<any[]>([]);
  const token = localStorage.getItem('affiliate_session_token') || '';

  useEffect(() => {
    fetch('/api/affiliate-api/campaigns', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setCampaigns(Array.isArray(data) ? data : []);
        if (data.length > 0) setSelectedCampaign(data[0].campaign?.id || '');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCampaign) return;
    fetch(`/api/affiliate-api/promo-assets/${selectedCampaign}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setAssets(Array.isArray(data) ? data : []))
      .catch(() => setAssets([]));
  }, [selectedCampaign]);

  const typeLabels: Record<string, string> = {
    post_text: '投稿文', story_text: 'ストーリー文', line_text: 'LINE文',
    email_text: 'メール文', image: '画像', banner: 'バナー', pr_example: 'PR表記例',
    prohibited: '禁止事項', faq: 'よくある質問',
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">📝 紹介素材ライブラリ</h1>
      {campaigns.length === 0 ? (
        <div className="card text-center py-8 text-gray-500">参加中の案件がありません</div>
      ) : (
        <>
          <select
            value={selectedCampaign}
            onChange={e => setSelectedCampaign(e.target.value)}
            className="select-field"
          >
            {campaigns.map((ca: any) => (
              <option key={ca.campaign?.id} value={ca.campaign?.id}>{ca.campaign?.name}</option>
            ))}
          </select>
          {assets.length === 0 && <p className="text-gray-500 text-center py-8">素材が登録されていません</p>}
          {assets.map(asset => (
            <div key={asset.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="badge badge-blue">{typeLabels[asset.type] || asset.type}</span>
                {asset.title && <p className="text-sm font-semibold text-gray-700">{asset.title}</p>}
              </div>
              {asset.url && (
                <img src={asset.url} alt={asset.title} className="w-full rounded-lg mb-2 max-h-48 object-cover" />
              )}
              <div className="bg-gray-50 rounded-xl p-3 relative">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{asset.content}</pre>
                <button
                  onClick={() => navigator.clipboard.writeText(asset.content)}
                  className="absolute top-2 right-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-200"
                >
                  コピー
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
