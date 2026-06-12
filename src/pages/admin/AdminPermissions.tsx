// src/pages/admin/AdminPermissions.tsx
// 紹介権限管理画面
// 商品ごとのデフォルト権限設定 + 個別アフィリエイター権限設定

import { useState, useEffect } from 'react';

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

const accessLevelConfig: Record<string, { label: string; desc: string; color: string }> = {
  open: { label: '全員紹介可', desc: 'すべての承認済みアフィリエイターが紹介可能', color: 'bg-green-100 text-green-800' },
  approved_only: { label: '承認済みのみ', desc: 'スタート講座購入 + 管理者承認が必要', color: 'bg-purple-100 text-purple-800' },
  requires_purchase: { label: '購入者のみ', desc: '指定商品の購入が必要', color: 'bg-blue-100 text-blue-800' },
  none: { label: '紹介不可', desc: '誰も紹介できない', color: 'bg-red-100 text-red-800' },
};

const productTypeLabel: Record<string, string> = {
  affiliate_course: 'アフィリエイト講座',
  start_course: 'スタート講座',
  other: 'その他',
};

export function AdminPermissions() {
  const [defaultPerms, setDefaultPerms] = useState<DefaultPermission[]>([]);
  const [individualPerms, setIndividualPerms] = useState<IndividualPermission[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'default' | 'individual'>('default');
  const [editingDefault, setEditingDefault] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ access_level: '', required_product_id: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleEditDefault = (perm: DefaultPermission) => {
    setEditingDefault(perm.product_id);
    setEditForm({
      access_level: perm.access_level,
      required_product_id: perm.required_product_id || '',
    });
  };

  const handleSaveDefault = async (productId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('/.netlify/functions/admin-api/permissions/default', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify({
          product_id: productId,
          access_level: editForm.access_level,
          required_product_id: editForm.required_product_id || null,
        }),
      });
      if (res.ok) {
        fetchData();
        setEditingDefault(null);
      } else {
        const data = await res.json();
        alert(`エラー: ${data.error}`);
      }
    } catch {
      alert('ネットワークエラーが発生しました。');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeIndividual = async (permId: string) => {
    if (!confirm('この個別権限を取り消しますか？')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/.netlify/functions/admin-api/permissions/individual/${permId}/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      if (res.ok) {
        fetchData();
      }
    } catch {
      alert('ネットワークエラーが発生しました。');
    } finally {
      setActionLoading(false);
    }
  };

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
        <h1 className="text-xl font-bold text-gray-900">紹介権限管理</h1>
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
        </button>
      </div>

      {/* デフォルト権限一覧 */}
      {activeTab === 'default' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">📋 デフォルト権限について</p>
            <ul className="text-xs space-y-1 text-blue-700">
              <li>• 商品ごとに「誰でも紹介可」「承認済みのみ」「購入者のみ」を設定できます</li>
              <li>• 個別権限で特定のアフィリエイターを明示的に許可/拒否することも可能です</li>
              <li>• スタート講座は「承認済みのみ」（スタート講座購入 + 管理者承認）が推奨です</li>
            </ul>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {defaultPerms.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-sm">デフォルト権限の設定がありません</p>
              </div>
            ) : (
              defaultPerms.map((perm) => (
                <div key={perm.product_id} className="p-5">
                  {editingDefault === perm.product_id ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900">{perm.product_name}</h3>
                          <span className="text-xs text-gray-400">{productTypeLabel[perm.product_type] || perm.product_type}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">アクセスレベル</label>
                        <select
                          value={editForm.access_level}
                          onChange={(e) => setEditForm({ ...editForm, access_level: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {Object.entries(accessLevelConfig).map(([key, cfg]) => (
                            <option key={key} value={key}>{cfg.label} - {cfg.desc}</option>
                          ))}
                        </select>
                      </div>
                      {editForm.access_level === 'requires_purchase' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">必要な購入商品</label>
                          <select
                            value={editForm.required_product_id}
                            onChange={(e) => setEditForm({ ...editForm, required_product_id: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">選択してください</option>
                            {products.map((p) => (
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
                            <span className="text-xs text-gray-500">
                              → 要購入: {perm.required_product_name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {accessLevelConfig[perm.access_level]?.desc}
                        </p>
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

      {/* 個別権限一覧 */}
      {activeTab === 'individual' && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
            <p className="font-semibold mb-1">📌 個別権限について</p>
            <p className="text-xs text-yellow-700">
              デフォルト設定に関わらず、特定のアフィリエイターに個別の権限を付与・取り消しできます。
              たとえばデフォルト「承認済みのみ」の商品を特定の人だけ「紹介可」にするなど。
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm">個別権限一覧</h3>
            </div>
            {individualPerms.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-sm">個別権限の設定はありません</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {individualPerms.map((perm) => (
                  <div key={perm.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-gray-900">{perm.affiliate_name}</p>
                        <span className="text-xs font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                          {perm.affiliate_code}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{perm.product_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          perm.is_explicitly_granted
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {perm.is_explicitly_granted ? '✓ 明示的に許可' : '✕ 明示的に拒否'}
                        </span>
                        {perm.revoked_at && (
                          <span className="text-xs text-gray-400">
                            取り消し日: {new Date(perm.revoked_at).toLocaleDateString('ja-JP')}
                          </span>
                        )}
                      </div>
                    </div>
                    {!perm.revoked_at && (
                      <button
                        onClick={() => handleRevokeIndividual(perm.id)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
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
