// src/pages/admin/AdminPermissions.tsx
// 紹介権限管理画面
// 商品ごとのデフォルト権限設定 + 個別アフィリエイター権限設定

import { useState, useEffect, useRef } from 'react';

interface Product {
  id: string;
  name: string;
  product_type: string;
  status: string;
}

interface DefaultPermission {
  product_id: string;
  product_name: string;
  product_type: string;
  access_level: string;
  required_product_id: string | null;
  required_product_name: string | null;
}

interface IndividualPermission {
  id: string;
  affiliate_id: string;
  affiliate_name: string;
  affiliate_code: string;
  product_id: string;
  product_name: string;
  is_explicitly_granted: boolean;
  granted_by: string | null;
  granted_at: string | null;
  revoked_at: string | null;
}

interface AffiliateSearchResult {
  id: string;
  name: string;
  email: string;
  affiliate_code: string;
  status: string;
}

const accessLevelConfig: Record<string, { label: string; desc: string; color: string }> = {
  open:             { label: '全員紹介可',   desc: 'すべての承認済みアフィリエイターが紹介可能',       color: 'bg-green-100 text-green-800' },
  approved_only:    { label: '承認済みのみ', desc: 'スタート講座購入 + 管理者承認が必要',              color: 'bg-purple-100 text-purple-800' },
  requires_purchase:{ label: '購入者のみ',   desc: '指定商品の購入が必要',                             color: 'bg-blue-100 text-blue-800' },
  none:             { label: '紹介不可',     desc: '誰も紹介できない',                                 color: 'bg-red-100 text-red-800' },
};

const productTypeLabel: Record<string, string> = {
  affiliate_course: 'アフィリエイト講座',
  start_course:     'スタート講座',
  other:            'その他',
};

export function AdminPermissions() {
  const [defaultPerms, setDefaultPerms]     = useState<DefaultPermission[]>([]);
  const [individualPerms, setIndividualPerms] = useState<IndividualPermission[]>([]);
  const [products, setProducts]             = useState<Product[]>([]);
  const [loading, setLoading]               = useState(true);
  const [activeTab, setActiveTab]           = useState<'default' | 'individual'>('default');
  const [editingDefault, setEditingDefault] = useState<string | null>(null);
  const [editForm, setEditForm]             = useState({ access_level: '', required_product_id: '' });
  const [actionLoading, setActionLoading]   = useState(false);

  // 個別権限付与フォーム
  const [grantOpen, setGrantOpen]           = useState(false);
  const [grantForm, setGrantForm]           = useState({
    affiliate_id: '',
    affiliate_name: '',
    product_id: '',
    is_explicitly_granted: true,
    notes: '',
  });
  const [searchQuery, setSearchQuery]       = useState('');
  const [searchResults, setSearchResults]   = useState<AffiliateSearchResult[]>([]);
  const [searchLoading, setSearchLoading]   = useState(false);
  const [grantSaving, setGrantSaving]       = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // フィルター
  const [filterProduct, setFilterProduct]   = useState('all');
  const [filterGranted, setFilterGranted]   = useState<'all' | 'granted' | 'denied'>('all');

  useEffect(() => { fetchData(); }, []);

  const getAdminToken = () => sessionStorage.getItem('admin_token') || '';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [permRes, prodRes] = await Promise.all([
        fetch('/.netlify/functions/admin-api/permissions', {
          headers: { Authorization: `Bearer ${getAdminToken()}` },
        }),
        fetch('/.netlify/functions/admin-api/products?status=active', {
          headers: { Authorization: `Bearer ${getAdminToken()}` },
        }),
      ]);
      if (permRes.ok) {
        const data = await permRes.json();
        setDefaultPerms(data.default_permissions || []);
        setIndividualPerms(data.individual_permissions || []);
      }
      if (prodRes.ok) {
        const data = await prodRes.json();
        setProducts(data.products || []);
      }
    } catch {
      // エラー
    } finally {
      setLoading(false);
    }
  };

  // -------- デフォルト権限 --------
  const handleEditDefault = (perm: DefaultPermission) => {
    setEditingDefault(perm.product_id);
    setEditForm({ access_level: perm.access_level, required_product_id: perm.required_product_id || '' });
  };

  const handleSaveDefault = async (productId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('/.netlify/functions/admin-api/permissions/default', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({
          product_id: productId,
          access_level: editForm.access_level,
          required_product_id: editForm.required_product_id || null,
        }),
      });
      if (res.ok) { fetchData(); setEditingDefault(null); }
      else { const d = await res.json(); alert(`エラー: ${d.error}`); }
    } catch { alert('ネットワークエラーが発生しました。'); }
    finally { setActionLoading(false); }
  };

  // -------- 個別権限 取り消し --------
  const handleRevokeIndividual = async (permId: string) => {
    if (!confirm('この個別権限を取り消しますか？')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/.netlify/functions/admin-api/permissions/individual/${permId}/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      if (res.ok) fetchData();
    } catch { alert('ネットワークエラーが発生しました。'); }
    finally { setActionLoading(false); }
  };

  // -------- 個別権限 付与 --------
  const handleSearchAffiliate = (q: string) => {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `/.netlify/functions/admin-api/permissions/search-affiliates?q=${encodeURIComponent(q)}`,
          { headers: { Authorization: `Bearer ${getAdminToken()}` } }
        );
        if (res.ok) setSearchResults(await res.json());
      } catch {}
      finally { setSearchLoading(false); }
    }, 300);
  };

  const handleSelectAffiliate = (a: AffiliateSearchResult) => {
    setGrantForm(f => ({ ...f, affiliate_id: a.id, affiliate_name: `${a.name}（${a.affiliate_code}）` }));
    setSearchQuery(`${a.name}（${a.affiliate_code}）`);
    setSearchResults([]);
  };

  const handleGrant = async () => {
    if (!grantForm.affiliate_id || !grantForm.product_id) {
      alert('アフィリエイターと商品を選択してください');
      return;
    }
    setGrantSaving(true);
    try {
      const res = await fetch('/.netlify/functions/admin-api/permissions/individual/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({
          affiliate_id: grantForm.affiliate_id,
          product_id: grantForm.product_id,
          is_explicitly_granted: grantForm.is_explicitly_granted,
          granted_by: 'admin',
          notes: grantForm.notes || null,
        }),
      });
      if (res.ok) {
        setGrantOpen(false);
        setGrantForm({ affiliate_id: '', affiliate_name: '', product_id: '', is_explicitly_granted: true, notes: '' });
        setSearchQuery('');
        setSearchResults([]);
        fetchData();
      } else {
        const d = await res.json();
        alert(`エラー: ${d.error}`);
      }
    } catch { alert('ネットワークエラーが発生しました。'); }
    finally { setGrantSaving(false); }
  };

  // フィルター後の個別権限リスト
  const filteredIndividual = individualPerms.filter(p => {
    const matchProd = filterProduct === 'all' || p.product_id === filterProduct;
    const matchGrant =
      filterGranted === 'all' ? true :
      filterGranted === 'granted' ? p.is_explicitly_granted :
      !p.is_explicitly_granted;
    return matchProd && matchGrant;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">🔑 紹介権限管理</h1>
        <p className="text-sm text-gray-500 mt-0.5">商品ごとのアフィリエイト紹介権限を設定します</p>
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 max-w-sm">
        <button
          onClick={() => setActiveTab('default')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'default' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          デフォルト設定
        </button>
        <button
          onClick={() => setActiveTab('individual')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'individual' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          個別権限
          {individualPerms.filter(p => !p.revoked_at).length > 0 && (
            <span className="ml-1.5 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
              {individualPerms.filter(p => !p.revoked_at).length}
            </span>
          )}
        </button>
      </div>

      {/* ===================== デフォルト権限 ===================== */}
      {activeTab === 'default' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">📋 デフォルト権限について</p>
            <ul className="text-xs space-y-1 text-blue-700">
              <li>• 商品ごとに「全員紹介可」「購入者のみ」などを設定できます</li>
              <li>• 個別権限で特定のアフィリエイターをデフォルトに関係なく許可・拒否することもできます</li>
            </ul>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {defaultPerms.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-4xl mb-2">🔓</p>
                <p className="text-sm">デフォルト権限の設定がありません</p>
              </div>
            ) : (
              defaultPerms.map((perm) => (
                <div key={perm.product_id} className="p-5">
                  {editingDefault === perm.product_id ? (
                    /* 編集フォーム */
                    <div className="space-y-4">
                      <h3 className="font-bold text-gray-900">{perm.product_name}</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">アクセスレベル</label>
                        <select
                          value={editForm.access_level}
                          onChange={e => setEditForm({ ...editForm, access_level: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {Object.entries(accessLevelConfig).map(([key, cfg]) => (
                            <option key={key} value={key}>{cfg.label} — {cfg.desc}</option>
                          ))}
                        </select>
                      </div>
                      {editForm.access_level === 'requires_purchase' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">必要な購入商品</label>
                          <select
                            value={editForm.required_product_id}
                            onChange={e => setEditForm({ ...editForm, required_product_id: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">— この商品自体の購入 —</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveDefault(perm.product_id)}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingDefault(null)}
                          className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* 表示モード */
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 text-sm">{perm.product_name}</h3>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                            {productTypeLabel[perm.product_type] || perm.product_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            accessLevelConfig[perm.access_level]?.color || 'bg-gray-100 text-gray-600'
                          }`}>
                            {accessLevelConfig[perm.access_level]?.label || perm.access_level}
                          </span>
                          {perm.required_product_name && (
                            <span className="text-xs text-gray-500">→ 要購入: {perm.required_product_name}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{accessLevelConfig[perm.access_level]?.desc}</p>
                      </div>
                      <button
                        onClick={() => handleEditDefault(perm)}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                      >
                        編集
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===================== 個別権限 ===================== */}
      {activeTab === 'individual' && (
        <div className="space-y-4">
          {/* 説明 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
            <p className="font-semibold mb-1">📌 個別権限について</p>
            <p className="text-xs text-yellow-700">
              デフォルト設定に関わらず、特定のアフィリエイターに個別の紹介許可・拒否を設定できます。<br />
              例：「購入者のみ」の商品を、未購入の特定の人だけ紹介OKにする。
            </p>
          </div>

          {/* 操作バー */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setGrantOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors"
            >
              <span className="text-lg leading-none">＋</span> 個別権限を付与する
            </button>

            {/* フィルター */}
            <select
              value={filterProduct}
              onChange={e => setFilterProduct(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべての商品</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            <select
              value={filterGranted}
              onChange={e => setFilterGranted(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">許可・拒否 すべて</option>
              <option value="granted">✓ 許可のみ</option>
              <option value="denied">✕ 拒否のみ</option>
            </select>

            <span className="text-xs text-gray-400">{filteredIndividual.length} 件</span>
          </div>

          {/* ======== 個別権限付与モーダル ======== */}
          {grantOpen && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">個別権限を付与する</h2>
                  <button
                    onClick={() => { setGrantOpen(false); setSearchQuery(''); setSearchResults([]); }}
                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                  >×</button>
                </div>

                <div className="p-6 space-y-5">
                  {/* アフィリエイター検索 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      アフィリエイター <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => handleSearchAffiliate(e.target.value)}
                        placeholder="名前・メール・コードで検索..."
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {searchLoading && (
                        <div className="absolute right-3 top-2.5">
                          <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                        </div>
                      )}
                      {/* 検索ドロップダウン */}
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                          {searchResults.map(a => (
                            <button
                              key={a.id}
                              onClick={() => handleSelectAffiliate(a)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                            >
                              <p className="text-sm font-semibold text-gray-900">{a.name}</p>
                              <p className="text-xs text-gray-500">{a.email} · <code>{a.affiliate_code}</code></p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {grantForm.affiliate_id && (
                      <p className="text-xs text-green-600 mt-1">✓ 選択済み: {grantForm.affiliate_name}</p>
                    )}
                  </div>

                  {/* 商品選択 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      対象商品 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={grantForm.product_id}
                      onChange={e => setGrantForm(f => ({ ...f, product_id: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">商品を選択してください</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  {/* 許可 / 拒否 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">権限タイプ</label>
                    <div className="flex gap-3">
                      <label className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                        grantForm.is_explicitly_granted
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          checked={grantForm.is_explicitly_granted}
                          onChange={() => setGrantForm(f => ({ ...f, is_explicitly_granted: true }))}
                          className="accent-green-600"
                        />
                        <div>
                          <p className="text-sm font-semibold text-green-700">✓ 許可</p>
                          <p className="text-xs text-gray-500">デフォルト条件に関係なく紹介OK</p>
                        </div>
                      </label>
                      <label className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                        !grantForm.is_explicitly_granted
                          ? 'border-red-400 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          checked={!grantForm.is_explicitly_granted}
                          onChange={() => setGrantForm(f => ({ ...f, is_explicitly_granted: false }))}
                          className="accent-red-600"
                        />
                        <div>
                          <p className="text-sm font-semibold text-red-700">✕ 拒否</p>
                          <p className="text-xs text-gray-500">デフォルト条件に関係なく紹介不可</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* メモ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
                    <input
                      type="text"
                      value={grantForm.notes}
                      onChange={e => setGrantForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="例：特別パートナー契約"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 px-6 pb-6">
                  <button
                    onClick={() => { setGrantOpen(false); setSearchQuery(''); setSearchResults([]); }}
                    className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleGrant}
                    disabled={grantSaving || !grantForm.affiliate_id || !grantForm.product_id}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-40 transition-colors"
                  >
                    {grantSaving ? '保存中...' : (grantForm.is_explicitly_granted ? '✓ 許可を付与する' : '✕ 拒否を設定する')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 個別権限一覧 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {filteredIndividual.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-4xl mb-2">📋</p>
                <p className="text-sm">
                  {individualPerms.length === 0
                    ? '個別権限はまだ設定されていません'
                    : '条件に一致する個別権限がありません'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredIndividual.map((perm) => (
                  <div key={perm.id} className={`p-4 flex items-center justify-between ${perm.revoked_at ? 'opacity-50 bg-gray-50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{perm.affiliate_name}</p>
                        <code className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{perm.affiliate_code}</code>
                        <span className="text-gray-300">→</span>
                        <p className="text-xs text-gray-600 font-medium">{perm.product_name}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          perm.is_explicitly_granted
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {perm.is_explicitly_granted ? '✓ 許可' : '✕ 拒否'}
                        </span>
                        {perm.revoked_at ? (
                          <span className="text-xs text-gray-400">
                            取り消し済み: {new Date(perm.revoked_at).toLocaleDateString('ja-JP')}
                          </span>
                        ) : perm.granted_at ? (
                          <span className="text-xs text-gray-400">
                            設定日: {new Date(perm.granted_at).toLocaleDateString('ja-JP')}
                            {perm.granted_by && perm.granted_by !== 'auto_registration' && ` by ${perm.granted_by}`}
                            {perm.granted_by === 'auto_registration' && ' （自動付与）'}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {!perm.revoked_at && (
                      <button
                        onClick={() => handleRevokeIndividual(perm.id)}
                        disabled={actionLoading}
                        className="ml-3 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 flex-shrink-0"
                      >
                        取り消し
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
