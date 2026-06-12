// src/pages/admin/AdminProducts.tsx
import { useState, useEffect } from 'react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/LoadingSpinner';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { Product } from '@/types';

const defaultProduct: Partial<Product> = {
  name: '',
  description: '',
  price: 0,
  status: 'active',
  access_type: 'lifetime',
  after_expiry_behavior: 'show_expired_message',
  display_order: 0,
};

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>(defaultProduct);
  const [saving, setSaving] = useState(false);

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
    </div>
  );
}
