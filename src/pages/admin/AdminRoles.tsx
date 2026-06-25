// src/pages/admin/AdminRoles.tsx
// パートナー（product_owner）管理 + ロール管理
import { useEffect, useState } from 'react';

const API = (path: string, opts?: RequestInit) =>
  fetch(`/.netlify/functions/admin-api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_ADMIN_SECRET_TOKEN || sessionStorage.getItem('admin_token') || ''}`,
    },
    ...opts,
  }).then(r => r.json());

const PERMISSION_LEVEL_LABELS: Record<string, string> = { viewer: '閲覧のみ', manager: '管理者権限（一部）', owner: 'オーナー権限' };
const PERMISSION_LEVEL_COLORS: Record<string, string> = { viewer: 'bg-gray-100 text-gray-600', manager: 'bg-blue-100 text-blue-700', owner: 'bg-purple-100 text-purple-700' };

const DEFAULT_PERMISSIONS = {
  can_view_sales: true, can_view_customers: false, can_view_affiliates: true,
  can_export_csv: false, can_edit_product_description: false,
  can_submit_campaign_request: true, can_submit_price_request: false, can_submit_notice_request: false,
};

const PERM_LABELS: Record<string, string> = {
  can_view_sales: '売上閲覧', can_view_customers: '購入者閲覧', can_view_affiliates: '紹介者閲覧',
  can_export_csv: 'CSV出力', can_edit_product_description: '商品説明編集申請',
  can_submit_campaign_request: 'キャンペーン申請', can_submit_price_request: '価格変更申請',
  can_submit_notice_request: 'お知らせ配信申請',
};

export function AdminRoles() {
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [tab, setTab] = useState<'users' | 'assignments'>('users');
  const [loading, setLoading] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [message, setMessage] = useState('');

  // フォーム（ユーザー作成）
  const [fEmail, setFEmail] = useState('');
  const [fName, setFName] = useState('');
  const [fPassword, setFPassword] = useState('');

  // フォーム（商品紐づけ）
  const [aUserId, setAUserId] = useState('');
  const [aProductId, setAProductId] = useState('');
  const [aLevel, setALevel] = useState('viewer');
  const [aPerms, setAPerms] = useState({ ...DEFAULT_PERMISSIONS });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      API('/app-users?role=product_owner'),
      API('/products'),
      API('/product-owners'),
    ]).then(([u, p, o]) => {
      setUsers(Array.isArray(u) ? u : []);
      setProducts(Array.isArray(p) ? p : []);
      setOwners(Array.isArray(o) ? o : []);
    }).finally(() => setLoading(false));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await API('/app-users', {
      method: 'POST',
      body: JSON.stringify({ email: fEmail, display_name: fName, password: fPassword, role: 'product_owner' }),
    });
    if (res.id) {
      setMessage('パートナーアカウントを作成しました');
      setShowUserForm(false);
      setFEmail(''); setFName(''); setFPassword('');
      loadAll();
    } else {
      setMessage(res.error || '作成に失敗しました');
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    await API(`/app-users/${userId}`, { method: 'PUT', body: JSON.stringify({ is_active: !isActive }) });
    loadAll();
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await API('/product-owners', {
      method: 'POST',
      body: JSON.stringify({ user_id: aUserId, product_id: aProductId, permission_level: aLevel, permissions: aPerms }),
    });
    if (res.id) {
      setMessage('商品とパートナーを紐づけました');
      setShowAssignForm(false);
      loadAll();
    } else {
      setMessage(res.error || '紐づけに失敗しました');
    }
  };

  const handleRevokeOwner = async (ownerId: string) => {
    if (!confirm('この紐づけを無効化しますか？')) return;
    await API(`/product-owners/${ownerId}`, { method: 'PUT', body: JSON.stringify({ status: 'revoked' }) });
    loadAll();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">パートナー管理</h1>
          <p className="text-sm text-gray-500">商品提供者のアカウントと商品の紐づけを管理します</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowUserForm(true)} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700">
            ＋ パートナー追加
          </button>
          <button onClick={() => setShowAssignForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700">
            ＋ 商品紐づけ
          </button>
        </div>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm ${message.includes('失敗') || message.includes('error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message} <button onClick={() => setMessage('')} className="ml-2 text-xs opacity-70">✕</button>
        </div>
      )}

      {/* タブ */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['users', 'assignments'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'users' ? '👤 パートナーアカウント' : '🔗 商品紐づけ'}
          </button>
        ))}
      </div>

      {/* ユーザー作成フォーム */}
      {showUserForm && (
        <div className="bg-white rounded-2xl border border-purple-200 p-5">
          <h2 className="font-bold text-gray-900 mb-4">パートナーアカウント作成</h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                <input type="email" value={fEmail} onChange={e => setFEmail(e.target.value)} required
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" placeholder="partner@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">表示名</label>
                <input type="text" value={fName} onChange={e => setFName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" placeholder="山田太郎" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">初期パスワード</label>
              <input type="password" value={fPassword} onChange={e => setFPassword(e.target.value)} required
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" placeholder="••••••••" />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-purple-700">作成</button>
              <button type="button" onClick={() => setShowUserForm(false)} className="border border-gray-300 text-gray-700 px-5 py-2 rounded-xl text-sm hover:bg-gray-50">キャンセル</button>
            </div>
          </form>
        </div>
      )}

      {/* 商品紐づけフォーム */}
      {showAssignForm && (
        <div className="bg-white rounded-2xl border border-indigo-200 p-5">
          <h2 className="font-bold text-gray-900 mb-4">商品とパートナーの紐づけ</h2>
          <form onSubmit={handleAssign} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">パートナー</label>
                <select value={aUserId} onChange={e => setAUserId(e.target.value)} required
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm">
                  <option value="">選択してください</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.display_name || u.email}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">商品</label>
                <select value={aProductId} onChange={e => setAProductId(e.target.value)} required
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm">
                  <option value="">選択してください</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">権限レベル</label>
              <select value={aLevel} onChange={e => setALevel(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm">
                {Object.entries(PERMISSION_LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">細粒度権限</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(PERM_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={(aPerms as any)[key]}
                      onChange={e => setAPerms(p => ({ ...p, [key]: e.target.checked }))}
                      className="rounded" />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700">紐づけ</button>
              <button type="button" onClick={() => setShowAssignForm(false)} className="border border-gray-300 text-gray-700 px-5 py-2 rounded-xl text-sm hover:bg-gray-50">キャンセル</button>
            </div>
          </form>
        </div>
      )}

      {/* テーブル */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : tab === 'users' ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">名前</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">メール</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">ステータス</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">最終ログイン</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">パートナーアカウントがありません</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.display_name || '(未設定)'}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.is_active ? '有効' : '無効'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('ja-JP') : '-'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleActive(u.id, u.is_active)}
                      className={`text-xs px-3 py-1 rounded-lg border ${u.is_active ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                      {u.is_active ? '無効化' : '有効化'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">パートナー</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">商品</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">権限レベル</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">ステータス</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {owners.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">紐づけデータがありません</td></tr>
              ) : owners.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{o.app_users?.display_name || o.app_users?.email}</td>
                  <td className="px-4 py-3 text-gray-700">{o.products?.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PERMISSION_LEVEL_COLORS[o.permission_level] || 'bg-gray-100 text-gray-600'}`}>
                      {PERMISSION_LEVEL_LABELS[o.permission_level] || o.permission_level}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${o.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {o.status === 'active' && (
                      <button onClick={() => handleRevokeOwner(o.id)}
                        className="text-xs px-3 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                        取消
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
