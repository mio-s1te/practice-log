// src/pages/admin/AdminProducts.tsx
import { useState, useEffect, useCallback } from 'react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/LoadingSpinner';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { Product, PriceTier, PriceChangeHistory } from '@/types';

const defaultProduct: Partial<Product> = {
  name: '',
  description: '',
  price: 0,
  status: 'active',
  access_type: 'lifetime',
  after_expiry_behavior: 'show_expired_message',
  display_order: 0,
};

const defaultTier: Partial<PriceTier> = {
  tier_name: '',
  min_valid_sales_count: 0,
  max_valid_sales_count: null,
  price: 0,
  stripe_price_id: null,
  is_active: true,
};

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>(defaultProduct);
  const [saving, setSaving] = useState(false);

  // 段階価格設定モーダル
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [tiersLoading, setTiersLoading] = useState(false);
  const [editTier, setEditTier] = useState<Partial<PriceTier>>(defaultTier);
  const [tierEditMode, setTierEditMode] = useState<'list' | 'form' | 'history'>('list');
  const [tierSaving, setTierSaving] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceChangeHistory[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin-api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      } else {
        setProducts([
          {
            id: 'demo-1', name: 'AI副業1時間化スタート講座', description: 'AIを活用した副業入門講座',
            price: 29800, status: 'active', access_type: 'lifetime',
            after_expiry_behavior: 'show_expired_message', display_order: 1,
            lp_url: '/start-course', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          },
          {
            id: 'demo-2', name: 'アフィリエイト実践ミニ講座', description: 'アフィリエイト基礎講座',
            price: 4800, status: 'active', access_type: 'days_after_purchase', access_days: 365,
            after_expiry_behavior: 'show_extension_offer', display_order: 2,
            lp_url: '/mini-course', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditProduct(defaultProduct);
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditProduct(product);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editProduct.id ? `/api/admin-api/products/${editProduct.id}` : '/api/admin-api/products';
      const method = editProduct.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editProduct),
      });
      if (res.ok) {
        await fetchProducts();
        setModalOpen(false);
      }
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // 段階価格設定
  // ============================================================
  const openTierModal = useCallback(async (product: Product) => {
    setSelectedProduct(product);
    setTierEditMode('list');
    setTierModalOpen(true);
    setTiersLoading(true);
    try {
      const res = await fetch(`/api/admin-api/price-tiers?product_id=${product.id}`);
      if (res.ok) {
        const data = await res.json();
        setTiers(data);
      } else {
        setTiers([]);
      }
    } catch {
      setTiers([]);
    } finally {
      setTiersLoading(false);
    }
  }, []);

  const fetchTiers = useCallback(async (productId: string) => {
    setTiersLoading(true);
    try {
      const res = await fetch(`/api/admin-api/price-tiers?product_id=${productId}`);
      if (res.ok) {
        const data = await res.json();
        setTiers(data);
      }
    } catch {
      /* ignore */
    } finally {
      setTiersLoading(false);
    }
  }, []);

  const fetchPriceHistory = useCallback(async (productId: string) => {
    try {
      const res = await fetch(`/api/admin-api/price-change-history?product_id=${productId}`);
      if (res.ok) {
        const data = await res.json();
        setPriceHistory(data);
      }
    } catch {
      setPriceHistory([]);
    }
  }, []);

  const openTierHistory = async () => {
    if (!selectedProduct) return;
    await fetchPriceHistory(selectedProduct.id);
    setTierEditMode('history');
  };

  const openAddTier = () => {
    setEditTier({ ...defaultTier, product_id: selectedProduct?.id });
    setTierEditMode('form');
  };

  const openEditTier = (tier: PriceTier) => {
    setEditTier(tier);
    setTierEditMode('form');
  };

  const handleSaveTier = async () => {
    if (!selectedProduct) return;
    setTierSaving(true);
    try {
      const url = editTier.tier_id
        ? `/api/admin-api/price-tiers/${editTier.tier_id}`
        : '/api/admin-api/price-tiers';
      const method = editTier.tier_id ? 'PUT' : 'POST';
      const payload = { ...editTier, product_id: selectedProduct.id };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchTiers(selectedProduct.id);
        setTierEditMode('list');
      } else {
        const err = await res.json();
        alert(`保存に失敗しました: ${err.message || err.error}`);
      }
    } finally {
      setTierSaving(false);
    }
  };

  const handleDeleteTier = async (tier: PriceTier) => {
    if (!selectedProduct) return;
    if (!confirm(`「${tier.tier_name}」を無効化しますか？`)) return;
    await fetch(`/api/admin-api/price-tiers/${tier.tier_id}`, { method: 'DELETE' });
    await fetchTiers(selectedProduct.id);
  };

  const handleManualSwitch = async (tier: PriceTier) => {
    if (!selectedProduct) return;
    if (!confirm(`「${tier.tier_name}」(¥${tier.price.toLocaleString()})に手動で価格を切り替えますか？\n\n管理者・全紹介者に通知が送信されます。`)) return;
    const res = await fetch('/api/admin-api/price-tiers/switch-manually', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: selectedProduct.id,
        new_tier_id: tier.tier_id,
        changed_by: 'admin',
        memo: `管理者による手動切り替え: ${tier.tier_name}`,
      }),
    });
    if (res.ok) {
      alert('価格を切り替えました。管理者・全紹介者へ通知を送信しました。');
      await fetchProducts();
      await fetchTiers(selectedProduct.id);
    } else {
      const err = await res.json();
      alert(`切り替えに失敗しました: ${err.error}`);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">📦 商品管理</h1>
        <button onClick={openCreate} className="btn-primary">+ 商品追加</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(product => (
          <div key={product.id} className="card card-hover">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                <p className="text-2xl font-bold text-blue-600 mt-1">¥{product.price.toLocaleString()}</p>
              </div>
              <StatusBadge status={product.status} />
            </div>
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.description}</p>
            <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
              <span className="bg-gray-100 px-2 py-1 rounded-lg">
                {product.access_type === 'lifetime' ? '無期限' :
                 product.access_type === 'days_after_purchase' ? `${product.access_days}日間` : '固定終了日'}
              </span>
              {product.lp_url && (
                <a href={product.lp_url} target="_blank" rel="noopener noreferrer"
                   className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">LP確認</a>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(product)} className="btn-secondary flex-1 text-sm py-1.5">編集</button>
              {/* 段階価格設定ボタン */}
              <button
                onClick={() => openTierModal(product)}
                className="flex-1 text-sm py-1.5 rounded-xl font-semibold bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                title="段階価格設定"
              >
                段階価格
              </button>
              <button
                onClick={async () => {
                  if (confirm('本当に変更しますか？')) {
                    const newStatus = product.status === 'active' ? 'paused' : 'active';
                    await fetch(`/api/admin-api/products/${product.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: newStatus }),
                    });
                    fetchProducts();
                  }
                }}
                className={`flex-1 text-sm py-1.5 rounded-xl font-semibold transition-colors ${
                  product.status === 'active'
                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {product.status === 'active' ? '一時停止' : '再開'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 商品編集モーダル */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editProduct.id ? '商品編集' : '商品追加'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">商品名 *</label>
            <input
              type="text"
              value={editProduct.name || ''}
              onChange={e => setEditProduct(p => ({ ...p, name: e.target.value }))}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
            <textarea
              value={editProduct.description || ''}
              onChange={e => setEditProduct(p => ({ ...p, description: e.target.value }))}
              className="input-field h-24 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">価格（円）</label>
              <input
                type="number"
                value={editProduct.price || 0}
                onChange={e => setEditProduct(p => ({ ...p, price: parseInt(e.target.value) }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Price ID</label>
              <input
                type="text"
                value={editProduct.stripe_price_id || ''}
                onChange={e => setEditProduct(p => ({ ...p, stripe_price_id: e.target.value }))}
                className="input-field"
                placeholder="price_..."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
              <select
                value={editProduct.status || 'active'}
                onChange={e => setEditProduct(p => ({ ...p, status: e.target.value as any }))}
                className="select-field"
              >
                <option value="active">販売中</option>
                <option value="paused">一時停止</option>
                <option value="archived">アーカイブ</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">視聴期間タイプ</label>
              <select
                value={editProduct.access_type || 'lifetime'}
                onChange={e => setEditProduct(p => ({ ...p, access_type: e.target.value as any }))}
                className="select-field"
              >
                <option value="lifetime">無期限</option>
                <option value="days_after_purchase">購入日から◯日間</option>
                <option value="fixed_end_date">固定終了日</option>
              </select>
            </div>
          </div>
          {editProduct.access_type === 'days_after_purchase' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">視聴日数</label>
              <input
                type="number"
                value={editProduct.access_days || 0}
                onChange={e => setEditProduct(p => ({ ...p, access_days: parseInt(e.target.value) }))}
                className="input-field"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">LP URL</label>
            <input
              type="text"
              value={editProduct.lp_url || ''}
              onChange={e => setEditProduct(p => ({ ...p, lp_url: e.target.value }))}
              className="input-field"
              placeholder="/start-course"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">サポート期間（日）</label>
              <input
                type="number"
                value={editProduct.support_days || 0}
                onChange={e => setEditProduct(p => ({ ...p, support_days: parseInt(e.target.value) }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">特典受取期限（日）</label>
              <input
                type="number"
                value={editProduct.bonus_claim_days || 0}
                onChange={e => setEditProduct(p => ({ ...p, bonus_claim_days: parseInt(e.target.value) }))}
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">期間終了後の挙動</label>
            <select
              value={editProduct.after_expiry_behavior || 'show_expired_message'}
              onChange={e => setEditProduct(p => ({ ...p, after_expiry_behavior: e.target.value as any }))}
              className="select-field"
            >
              <option value="hide_content">コンテンツを非表示</option>
              <option value="show_expired_message">期限切れメッセージを表示</option>
              <option value="show_extension_offer">延長購入ボタンを表示</option>
              <option value="show_next_offer">上位商品を案内</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">キャンセル</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================
          段階価格設定モーダル
          ============================================================ */}
      <Modal
        isOpen={tierModalOpen}
        onClose={() => { setTierModalOpen(false); setSelectedProduct(null); setTierEditMode('list'); }}
        title={`段階価格設定 — ${selectedProduct?.name || ''}`}
      >
        {tierEditMode === 'list' && (
          <div className="space-y-4">
            {/* アクションボタン */}
            <div className="flex gap-2">
              <button onClick={openAddTier} className="btn-primary flex-1 text-sm">+ 価格Tier追加</button>
              <button
                onClick={openTierHistory}
                className="btn-secondary flex-1 text-sm"
              >
                変更履歴
              </button>
            </div>

            {/* Tierリスト */}
            {tiersLoading ? (
              <LoadingSpinner size="sm" />
            ) : tiers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-4xl mb-2">🏷️</p>
                <p className="text-sm">段階価格が設定されていません</p>
                <p className="text-xs mt-1">「+ 価格Tier追加」から設定してください</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  ※ 購入ボタン押下時に有効累計販売数を確認し、該当するTierの価格・Stripe Price IDが自動的に使用されます。
                </p>
                {tiers.map((tier, idx) => (
                  <div
                    key={tier.tier_id}
                    className={`border rounded-xl p-4 ${tier.is_active ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                            Tier {idx + 1}
                          </span>
                          {!tier.is_active && (
                            <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">無効</span>
                          )}
                        </div>
                        <p className="font-semibold text-gray-900">{tier.tier_name}</p>
                        <p className="text-xl font-bold text-blue-600">¥{tier.price.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          販売数: {tier.min_valid_sales_count.toLocaleString()}部〜
                          {tier.max_valid_sales_count != null
                            ? `${tier.max_valid_sales_count.toLocaleString()}部`
                            : '上限なし'}
                        </p>
                        {tier.stripe_price_id ? (
                          <p className="text-xs text-green-600 font-mono mt-1">
                            ✓ {tier.stripe_price_id}
                          </p>
                        ) : (
                          <p className="text-xs text-yellow-600 mt-1">⚠ Stripe Price ID 未設定</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 ml-3">
                        <button
                          onClick={() => openEditTier(tier)}
                          className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1 rounded-lg transition-colors"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleManualSwitch(tier)}
                          className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1 rounded-lg transition-colors"
                          title="このTierに手動で切り替え"
                        >
                          手動切替
                        </button>
                        {tier.is_active && (
                          <button
                            onClick={() => handleDeleteTier(tier)}
                            className="text-xs bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 rounded-lg transition-colors"
                          >
                            無効化
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 仕組みの説明 */}
            <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-1">
              <p className="font-semibold text-gray-800">⚙ 自動切り替えの仕組み</p>
              <p>• 購入完了後、有効累計販売数（返金・チャージバック除く）を確認</p>
              <p>• 販売数が次のTierの閾値を超えていれば自動的に価格・Stripe Price IDを更新</p>
              <p>• 価格変更時、管理者・全紹介者へアプリ内通知を送信</p>
              <p>• 変更履歴は「変更履歴」タブで確認できます</p>
            </div>
          </div>
        )}

        {/* Tier追加・編集フォーム */}
        {tierEditMode === 'form' && (
          <div className="space-y-4">
            <button
              onClick={() => setTierEditMode('list')}
              className="text-sm text-blue-600 hover:underline"
            >
              ← 一覧に戻る
            </button>
            <h3 className="font-semibold text-gray-900">
              {editTier.tier_id ? 'Tier編集' : '新規Tier追加'}
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tier名 *</label>
              <input
                type="text"
                value={editTier.tier_name || ''}
                onChange={e => setEditTier(t => ({ ...t, tier_name: e.target.value }))}
                className="input-field"
                placeholder="例: 早期価格 (〜1,000部)"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">最小販売数（部） *</label>
                <input
                  type="number"
                  min={0}
                  value={editTier.min_valid_sales_count ?? 0}
                  onChange={e => setEditTier(t => ({ ...t, min_valid_sales_count: parseInt(e.target.value) }))}
                  className="input-field"
                  placeholder="0"
                />
                <p className="text-xs text-gray-400 mt-0.5">このTierが適用される販売数の下限</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">最大販売数（部）</label>
                <input
                  type="number"
                  min={0}
                  value={editTier.max_valid_sales_count ?? ''}
                  onChange={e => {
                    const val = e.target.value === '' ? null : parseInt(e.target.value);
                    setEditTier(t => ({ ...t, max_valid_sales_count: val }));
                  }}
                  className="input-field"
                  placeholder="空欄=上限なし"
                />
                <p className="text-xs text-gray-400 mt-0.5">空欄 = 上限なし（最終Tier）</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">価格（円） *</label>
              <input
                type="number"
                min={0}
                value={editTier.price ?? 0}
                onChange={e => setEditTier(t => ({ ...t, price: parseInt(e.target.value) }))}
                className="input-field"
                placeholder="29800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Price ID</label>
              <input
                type="text"
                value={editTier.stripe_price_id || ''}
                onChange={e => setEditTier(t => ({ ...t, stripe_price_id: e.target.value || null }))}
                className="input-field"
                placeholder="price_1234567890abcdef（Stripeで作成したPrice ID）"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                未設定の場合は price_data でインライン指定されます（Stripeダッシュボードに商品が残りません）
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="tier_is_active"
                checked={editTier.is_active ?? true}
                onChange={e => setEditTier(t => ({ ...t, is_active: e.target.checked }))}
                className="w-4 h-4 accent-blue-600"
              />
              <label htmlFor="tier_is_active" className="text-sm text-gray-700">有効</label>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setTierEditMode('list')} className="btn-secondary flex-1">キャンセル</button>
              <button onClick={handleSaveTier} disabled={tierSaving} className="btn-primary flex-1">
                {tierSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        )}

        {/* 価格変更履歴 */}
        {tierEditMode === 'history' && (
          <div className="space-y-4">
            <button
              onClick={() => setTierEditMode('list')}
              className="text-sm text-blue-600 hover:underline"
            >
              ← 一覧に戻る
            </button>
            <h3 className="font-semibold text-gray-900">価格変更履歴</h3>
            {priceHistory.length === 0 ? (
              <p className="text-center text-gray-500 py-8 text-sm">変更履歴がありません</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {priceHistory.map(h => (
                  <div key={h.id} className="border border-gray-200 rounded-xl p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        h.trigger_type === 'sales_count'
                          ? 'bg-green-100 text-green-700'
                          : h.trigger_type === 'manual'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {h.trigger_type === 'sales_count' ? '自動（販売数）' :
                         h.trigger_type === 'manual' ? '手動' : 'スケジュール'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(h.changed_at).toLocaleString('ja-JP')}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-800">
                      ¥{h.old_price.toLocaleString()} → ¥{h.new_price.toLocaleString()}
                    </p>
                    {h.trigger_sales_count != null && (
                      <p className="text-xs text-gray-500">
                        切り替え時販売数: {h.trigger_sales_count.toLocaleString()}部
                      </p>
                    )}
                    {h.memo && <p className="text-xs text-gray-500 mt-1">{h.memo}</p>}
                    <p className="text-xs text-gray-400 mt-1">by {h.changed_by}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
