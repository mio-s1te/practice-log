// src/pages/affiliate/AffiliateProfile.tsx
import { useState, useEffect } from 'react';

export function AffiliateProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('affiliate_session_token') || '';

  // パスワード設定フォームの state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/affiliate-api/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setProfile(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // パスワード保存
  const handleSavePassword = async () => {
    setPwError('');
    setPwSuccess(false);

    if (newPassword.length < 8) {
      setPwError('パスワードは8文字以上にしてください');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('新しいパスワードが一致しません');
      return;
    }

    setPwSaving(true);
    try {
      const body: any = { new_password: newPassword };
      if (profile?.has_password) {
        body.current_password = currentPassword;
      }

      const res = await fetch('/api/affiliate-api/account/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setPwError(data.error || 'エラーが発生しました');
        return;
      }

      // 成功：フォームをリセットし、has_password を true に更新
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setProfile((prev: any) => ({ ...prev, has_password: true }));
    } catch {
      setPwError('通信エラーが発生しました');
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">👤 プロフィール</h1>

      {profile ? (
        <>
          {/* ─── プロフィール情報カード ─── */}
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

          {/* ─── パスワード設定/変更カード ─── */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔑</span>
              <div>
                <h2 className="font-bold text-gray-900">
                  {profile.has_password ? 'パスワードを変更する' : 'パスワードを設定する'}
                </h2>
                <p className="text-xs text-gray-500">
                  {profile.has_password
                    ? 'ログインに使用するパスワードを変更できます'
                    : 'メール＋パスワードでログインするためにパスワードを設定してください'}
                </p>
              </div>
            </div>

            {/* 未設定時：促しバナー */}
            {!profile.has_password && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <span className="text-amber-500 text-lg leading-tight">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">パスワードが未設定です</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    現在はメールリンクのみでログイン可能です。パスワードを設定すると、メール＋パスワードでいつでも素早くログインできます。
                  </p>
                </div>
              </div>
            )}

            {/* 成功メッセージ */}
            {pwSuccess && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                <span className="text-green-600">✅</span>
                <p className="text-sm font-semibold text-green-800">
                  {profile.has_password ? 'パスワードを変更しました' : 'パスワードを設定しました'}
                </p>
              </div>
            )}

            {/* エラーメッセージ */}
            {pwError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <span className="text-red-500">❌</span>
                <p className="text-sm text-red-700">{pwError}</p>
              </div>
            )}

            {/* 現在のパスワード（設定済みの場合のみ表示） */}
            {profile.has_password && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">現在のパスワード</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => { setCurrentPassword(e.target.value); setPwError(''); setPwSuccess(false); }}
                    placeholder="現在のパスワードを入力"
                    className="input-field pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            )}

            {/* 新しいパスワード */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {profile.has_password ? '新しいパスワード' : 'パスワード'}
              </label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => { setNewPassword(e.target.value); setPwError(''); setPwSuccess(false); }}
                  placeholder="8文字以上"
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPw ? '🙈' : '👁️'}
                </button>
              </div>
              {newPassword && newPassword.length < 8 && (
                <p className="text-xs text-red-500 mt-1">8文字以上で入力してください</p>
              )}
            </div>

            {/* 確認用パスワード */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {profile.has_password ? '新しいパスワード（確認）' : 'パスワード（確認）'}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setPwError(''); setPwSuccess(false); }}
                  placeholder="もう一度入力"
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPw ? '🙈' : '👁️'}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">パスワードが一致しません</p>
              )}
            </div>

            {/* 保存ボタン */}
            <button
              onClick={handleSavePassword}
              disabled={
                pwSaving ||
                newPassword.length < 8 ||
                newPassword !== confirmPassword ||
                (profile.has_password && !currentPassword)
              }
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pwSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  保存中...
                </span>
              ) : (
                profile.has_password ? 'パスワードを変更する' : 'パスワードを設定する'
              )}
            </button>
          </div>
        </>
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
