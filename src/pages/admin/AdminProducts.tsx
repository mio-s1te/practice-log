// src/pages/admin/AdminProducts.tsx
// 商品管理（7タブ構成：基本情報・価格・紹介条件・報酬条件・返金条件・紹介素材・パートナー設定）
import { useState, useEffect, useCallback } from 'react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/LoadingSpinner';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { Product, PriceTier, PriceChangeHistory } from '@/types';

// ============================================================
// 型定義
// ============================================================
interface PromoAsset {
  id?: string;
  product_id?: string;
  short_description?: string;
  long_description?: string;
  sns_post_example?: string;
  line_intro_text?: string;
  story_text?: string;
  pr_notation_example?: string;
  prohibited_expressions?: string;
  faq?: string;
  selling_points?: string;
  discouraged_expressions?: string;
}

interface ProductExtended extends Product {
  category?: string;
  provider_name?: string;
  thumbnail_url?: string;
  affiliate_lp_url?: string;
  regular_price?: number;
  campaign_price?: number;
  campaign_price_active?: boolean;
  campaign_condition?: string;
  stripe_checkout_url?: string;
  affiliate_enabled?: boolean;
  affiliate_access_level?: string;
  affiliate_application_open?: boolean;
  commission_type?: string;
  commission_fixed?: number;
  commission_percent?: number;
  commission_trigger?: string;
  commission_confirm_timing?: string;
  payout_schedule?: string;
  min_payout_amount?: number;
  commission_on_refund?: string;
  commission_on_cancel?: string;
  commission_on_chargeback?: string;
  refund_period_days?: number;
  revoke_commission_on_refund?: boolean;
  commission_hold_days?: number;
  suspicious_handling?: string;
  show_to_partner?: boolean;
  partner_view_scope?: string[];
  partner_can_export_csv?: boolean;
  partner_can_request_material_edit?: boolean;
}

// ============================================================
// タブ定義
// ============================================================
const EDIT_TABS = [
  { key: 'basic', label: '基本情報', icon: '📦' },
  { key: 'price', label: '価格情報', icon: '💴' },
  { key: 'affiliate', label: '紹介条件', icon: '🔗' },
  { key: 'commission', label: '報酬条件', icon: '💰' },
  { key: 'refund', label: '返金条件', icon: '↩️' },
  { key: 'assets', label: '紹介素材', icon: '📝' },
  { key: 'partner', label: 'パートナー設定', icon: '🏢' },
] as const;
type EditTabKey = typeof EDIT_TABS[number]['key'];

// ============================================================
// デフォルト値
// ============================================================
const defaultProduct: Partial<ProductExtended> = {
  name: '',
  description: '',
  price: 0,
  status: 'active',
  access_type: 'lifetime',
  after_expiry_behavior: 'show_expired_message',
  display_order: 0,
  category: 'course',
  affiliate_enabled: false,
  affiliate_access_level: 'none',
  affiliate_application_open: false,
  commission_type: 'percent',
  commission_percent: 30,
  commission_trigger: 'purchase',
  commission_confirm_timing: '30d_after_purchase',
  payout_schedule: 'monthly',
  min_payout_amount: 3000,
  commission_on_refund: 'cancel',
  commission_on_cancel: 'cancel',
  commission_on_chargeback: 'cancel',
  refund_period_days: 14,
  revoke_commission_on_refund: true,
  commission_hold_days: 30,
  suspicious_handling: 'hold',
  show_to_partner: false,
  partner_view_scope: ['stats', 'purchases', 'affiliates', 'csv'],
  partner_can_export_csv: false,
  partner_can_request_material_edit: false,
};

const defaultTier: Partial<PriceTier> = {
  tier_name: '',
  min_valid_sales_count: 0,
  max_valid_sales_count: null,
  price: 0,
  stripe_price_id: null,
  is_active: true,
};

const defaultPromoAsset: PromoAsset = {
  short_description: '',
  long_description: '',
  sns_post_example: '',
  line_intro_text: '',
  story_text: '',
  pr_notation_example: '',
  prohibited_expressions: '',
  faq: '',
  selling_points: '',
  discouraged_expressions: '',
};

// ============================================================
// ラベルヘルパー
// ============================================================
function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {text}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}
function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} className="input-field resize-none" rows={rows} placeholder={placeholder} />;
}

// ============================================================
// 分析データ型
// ============================================================
interface ProductAnalytics {
  product_id: string;
  total_purchases: number;
  total_revenue: number;
  total_clicks: number;
  total_affiliates: number;
  conversion_rate: number;
}

// ============================================================
// メインコンポーネント
// ============================================================
export function AdminProducts() {
  const [products, setProducts] = useState<ProductExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Partial<ProductExtended>>(defaultProduct);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<EditTabKey>('basic');
  const [promoAsset, setPromoAsset] = useState<PromoAsset>(defaultPromoAsset);
  const [promoSaving, setPromoSaving] = useState(false);

  // 検索・フィルター
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // ページタブ（一覧 / 分析）
  const [pageTab, setPageTab] = useState<'list' | 'analytics'>('list');
  const [analytics, setAnalytics] = useState<ProductAnalytics[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  // 分析タブ用検索
  const [analyticsSearch, setAnalyticsSearch] = useState('');

  // 段階価格モーダル
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductExtended | null>(null);
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [tiersLoading, setTiersLoading] = useState(false);
  const [editTier, setEditTier] = useState<Partial<PriceTier>>(defaultTier);
  const [tierEditMode, setTierEditMode] = useState<'list' | 'form' | 'history'>('list');
  const [tierSaving, setTierSaving] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceChangeHistory[]>([]);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin-api/products');
      if (res.ok) setProducts(await res.json());
      else setProducts(demoProducts());
    } catch {
      setProducts(demoProducts());
    } finally {
      setLoading(false);
    }
  };

  // 分析データ取得
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch('/api/admin-api/products/analytics');
      if (res.ok) {
        setAnalytics(await res.json());
      } else {
        // デモデータ
        setAnalytics(demoProducts().map(p => ({
          product_id: p.id,
          total_purchases: Math.floor(Math.random() * 300) + 10,
          total_revenue: (Math.floor(Math.random() * 300) + 10) * p.price,
          total_clicks: Math.floor(Math.random() * 2000) + 100,
          total_affiliates: Math.floor(Math.random() * 50) + 5,
          conversion_rate: Math.random() * 15 + 1,
        })));
      }
    } catch {
      setAnalytics(demoProducts().map(p => ({
        product_id: p.id,
        total_purchases: Math.floor(Math.random() * 300) + 10,
        total_revenue: (Math.floor(Math.random() * 300) + 10) * p.price,
        total_clicks: Math.floor(Math.random() * 2000) + 100,
        total_affiliates: Math.floor(Math.random() * 50) + 5,
        conversion_rate: Math.random() * 15 + 1,
      })));
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  // 商品固定トグル（display_order: 0 = 上部固定、元の値 = 通常）
  const handleTogglePin = async (product: ProductExtended) => {
    const isPinned = product.display_order === 0;
    const newOrder = isPinned ? 999 : 0;
    await fetch(`/api/admin-api/products/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_order: newOrder }),
    });
    fetchProducts();
  };

  // フィルタリング済み商品リスト
  const filteredProducts = products.filter(p => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchCategory = filterCategory === 'all' || p.category === filterCategory;
    return matchSearch && matchStatus && matchCategory;
  });

  function demoProducts(): ProductExtended[] {
    return [
      {
        id: 'a0000000-0000-0000-0000-000000000001',
        name: 'AI副業1時間化スタート講座', description: '副業迷子から抜け出すための設計講座',
        price: 29800, regular_price: 99800, status: 'active', access_type: 'lifetime',
        after_expiry_behavior: 'show_expired_message', display_order: 1,
        lp_url: '/start-course', affiliate_lp_url: '/start-course',
        category: 'course', affiliate_enabled: true, affiliate_access_level: 'requires_purchase',
        commission_type: 'percent', commission_percent: 30,
        commission_confirm_timing: '30d_after_purchase',
        refund_period_days: 14, commission_hold_days: 30,
        show_to_partner: true, partner_can_export_csv: true,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      },
      {
        id: 'a0000000-0000-0000-0000-000000000002',
        name: 'AIアフィリエイト実践講座', description: '通常¥29,800 / キャンペーン¥4,980',
        price: 4980, regular_price: 29800, campaign_price: 4980, campaign_price_active: true,
        status: 'active', access_type: 'lifetime',
        after_expiry_behavior: 'show_expired_message', display_order: 2,
        lp_url: '/affiliate-course', affiliate_lp_url: '/affiliate-course',
        category: 'course', affiliate_enabled: true, affiliate_access_level: 'all',
        commission_type: 'percent', commission_percent: 20,
        commission_confirm_timing: '30d_after_purchase',
        refund_period_days: 14, commission_hold_days: 30,
        show_to_partner: false,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      },
    ];
  }

  const openCreate = () => {
    setEditProduct(defaultProduct);
    setPromoAsset(defaultPromoAsset);
    setActiveTab('basic');
    setModalOpen(true);
  };

  const openEdit = async (product: ProductExtended) => {
    setEditProduct(product);
    setActiveTab('basic');
    setModalOpen(true);
    // 紹介素材を取得
    try {
      const res = await fetch(`/api/admin-api/promo-assets?product_id=${product.id}`);
      if (res.ok) {
        const data = await res.json();
        setPromoAsset(data || defaultPromoAsset);
      } else {
        setPromoAsset(defaultPromoAsset);
      }
    } catch {
      setPromoAsset(defaultPromoAsset);
    }
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
        // 紹介素材も保存
        if (editProduct.id || (await res.json())?.id) {
          await handleSavePromoAsset(editProduct.id || '');
        }
        await fetchProducts();
        setModalOpen(false);
      } else {
        const err = await res.json();
        alert(`保存失敗: ${err.message || err.error || '不明なエラー'}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSavePromoAsset = async (productId: string) => {
    if (!productId) return;
    setPromoSaving(true);
    try {
      await fetch('/api/admin-api/promo-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...promoAsset, product_id: productId }),
      });
    } finally {
      setPromoSaving(false);
    }
  };

  // ============================================================
  // 段階価格
  // ============================================================
  const openTierModal = useCallback(async (product: ProductExtended) => {
    setSelectedProduct(product);
    setTierEditMode('list');
    setTierModalOpen(true);
    setTiersLoading(true);
    try {
      const res = await fetch(`/api/admin-api/price-tiers?product_id=${product.id}`);
      if (res.ok) setTiers(await res.json());
      else setTiers([]);
    } catch { setTiers([]); }
    finally { setTiersLoading(false); }
  }, []);

  const fetchTiers = useCallback(async (productId: string) => {
    setTiersLoading(true);
    try {
      const res = await fetch(`/api/admin-api/price-tiers?product_id=${productId}`);
      if (res.ok) setTiers(await res.json());
    } catch { /* ignore */ }
    finally { setTiersLoading(false); }
  }, []);

  const fetchPriceHistory = useCallback(async (productId: string) => {
    try {
      const res = await fetch(`/api/admin-api/price-change-history?product_id=${productId}`);
      if (res.ok) setPriceHistory(await res.json());
    } catch { setPriceHistory([]); }
  }, []);

  const handleSaveTier = async () => {
    if (!selectedProduct) return;
    setTierSaving(true);
    try {
      const url = editTier.tier_id ? `/api/admin-api/price-tiers/${editTier.tier_id}` : '/api/admin-api/price-tiers';
      const res = await fetch(url, {
        method: editTier.tier_id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editTier, product_id: selectedProduct.id }),
      });
      if (res.ok) { await fetchTiers(selectedProduct.id); setTierEditMode('list'); }
      else { const err = await res.json(); alert(`保存失敗: ${err.message || err.error}`); }
    } finally { setTierSaving(false); }
  };

  const handleDeleteTier = async (tier: PriceTier) => {
    if (!selectedProduct || !confirm(`「${tier.tier_name}」を無効化しますか？`)) return;
    await fetch(`/api/admin-api/price-tiers/${tier.tier_id}`, { method: 'DELETE' });
    await fetchTiers(selectedProduct.id);
  };

  const handleManualSwitch = async (tier: PriceTier) => {
    if (!selectedProduct || !confirm(`「${tier.tier_name}」(¥${tier.price.toLocaleString()})に手動切り替えしますか？`)) return;
    const res = await fetch('/api/admin-api/price-tiers/switch-manually', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: selectedProduct.id, new_tier_id: tier.tier_id, changed_by: 'admin', memo: `管理者手動切り替え: ${tier.tier_name}` }),
    });
    if (res.ok) { alert('切り替えました。'); await fetchProducts(); await fetchTiers(selectedProduct.id); }
    else { const err = await res.json(); alert(`切り替え失敗: ${err.error}`); }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  // ============================================================
  // 商品一覧
  // ============================================================
  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">📦 商品管理</h1>
        <div className="flex items-center gap-2">
          {/* ページタブ切り替え */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setPageTab('list')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pageTab === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📋 一覧
            </button>
            <button
              onClick={() => { setPageTab('analytics'); if (analytics.length === 0) fetchAnalytics(); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pageTab === 'analytics' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📊 分析
            </button>
          </div>
          {pageTab === 'list' && (
            <button onClick={openCreate} className="btn-primary">+ 商品追加</button>
          )}
        </div>
      </div>

      {/* ===================== 一覧タブ ===================== */}
      {pageTab === 'list' && (
        <>
          {/* 検索・フィルター */}
          <div className="flex flex-wrap gap-2 bg-white border border-gray-200 rounded-2xl p-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 商品名・説明で検索"
              className="input-field flex-1 min-w-48 text-sm"
            />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="select-field text-sm"
            >
              <option value="all">すべてのステータス</option>
              <option value="active">販売中</option>
              <option value="paused">一時停止</option>
              <option value="archived">アーカイブ</option>
            </select>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="select-field text-sm"
            >
              <option value="all">すべてのカテゴリ</option>
              <option value="course">講座</option>
              <option value="digital">デジタルコンテンツ</option>
              <option value="membership">メンバーシップ</option>
              <option value="other">その他</option>
            </select>
            {(search || filterStatus !== 'all' || filterCategory !== 'all') && (
              <button
                onClick={() => { setSearch(''); setFilterStatus('all'); setFilterCategory('all'); }}
                className="text-xs text-gray-500 hover:text-gray-700 px-2"
              >
                ✕ クリア
              </button>
            )}
          </div>

          {/* 件数表示 */}
          <p className="text-xs text-gray-500">
            {filteredProducts.length} / {products.length} 件表示
            {filteredProducts.some(p => p.display_order === 0) && (
              <span className="ml-2 text-yellow-600">⭐ 固定済みあり</span>
            )}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className={`card card-hover relative ${product.display_order === 0 ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}
              >
                {/* 固定バッジ */}
                {product.display_order === 0 && (
                  <span className="absolute top-2 right-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">
                    ⭐ 固定中
                  </span>
                )}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl font-bold text-blue-600">¥{product.price.toLocaleString()}</span>
                      {product.regular_price && product.regular_price !== product.price && (
                        <span className="text-xs text-gray-400 line-through">¥{product.regular_price.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={product.status} />
                </div>
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{product.description}</p>

                {/* タグ行 */}
                <div className="flex flex-wrap gap-1.5 text-xs mb-3">
                  {product.category && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{product.category}</span>
                  )}
                  {product.affiliate_enabled && (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      AF対象 ({product.affiliate_access_level})
                    </span>
                  )}
                  {product.campaign_price_active && (
                    <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      CP ¥{(product.campaign_price ?? 0).toLocaleString()}
                    </span>
                  )}
                  {product.lp_url && (
                    <a href={product.lp_url} target="_blank" rel="noopener noreferrer"
                       className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full hover:bg-blue-200">LP↗</a>
                  )}
                </div>

                {/* アクションボタン */}
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => openEdit(product)} className="btn-secondary flex-1 text-xs py-1.5 min-w-0">
                    詳細編集
                  </button>
                  <button
                    onClick={() => openTierModal(product)}
                    className="flex-1 text-xs py-1.5 rounded-xl font-semibold bg-purple-100 text-purple-700 hover:bg-purple-200 min-w-0"
                  >
                    段階価格
                  </button>
                  {/* 固定トグル */}
                  <button
                    onClick={() => handleTogglePin(product)}
                    title={product.display_order === 0 ? '固定を解除' : '上部に固定'}
                    className={`flex-1 text-xs py-1.5 rounded-xl font-semibold transition-colors min-w-0 ${
                      product.display_order === 0
                        ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-yellow-100 hover:text-yellow-700'
                    }`}
                  >
                    {product.display_order === 0 ? '⭐ 固定中' : '☆ 固定'}
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('ステータスを変更しますか？')) return;
                      const newStatus = product.status === 'active' ? 'paused' : 'active';
                      await fetch(`/api/admin-api/products/${product.id}`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus }),
                      });
                      fetchProducts();
                    }}
                    className={`flex-1 text-xs py-1.5 rounded-xl font-semibold transition-colors min-w-0 ${
                      product.status === 'active' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {product.status === 'active' ? '停止' : '再開'}
                  </button>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400">
                <p className="text-4xl mb-2">📦</p>
                <p>条件に一致する商品がありません</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===================== 分析タブ ===================== */}
      {pageTab === 'analytics' && (
        <div className="space-y-4">
          {analyticsLoading ? (
            <LoadingSpinner size="lg" />
          ) : (
            <>
              {/* サマリーカード（検索フィルター適用後の値） */}
              {(() => {
                const filteredAnalytics = analytics.filter(a => {
                  if (!analyticsSearch) return true;
                  const p = products.find(p => p.id === a.product_id);
                  return p?.name.toLowerCase().includes(analyticsSearch.toLowerCase());
                });
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      {
                        label: analyticsSearch ? '絞込み売上' : '総売上',
                        value: `¥${filteredAnalytics.reduce((s, a) => s + a.total_revenue, 0).toLocaleString()}`,
                        icon: '💰', color: 'bg-green-50 border-green-200 text-green-700',
                      },
                      {
                        label: analyticsSearch ? '絞込み購入数' : '総購入数',
                        value: `${filteredAnalytics.reduce((s, a) => s + a.total_purchases, 0).toLocaleString()} 件`,
                        icon: '🛒', color: 'bg-blue-50 border-blue-200 text-blue-700',
                      },
                      {
                        label: analyticsSearch ? '絞込みクリック' : '総クリック数',
                        value: `${filteredAnalytics.reduce((s, a) => s + a.total_clicks, 0).toLocaleString()} 回`,
                        icon: '👆', color: 'bg-purple-50 border-purple-200 text-purple-700',
                      },
                      {
                        label: '平均成約率',
                        value: filteredAnalytics.length > 0
                          ? `${(filteredAnalytics.reduce((s, a) => s + a.conversion_rate, 0) / filteredAnalytics.length).toFixed(1)}%`
                          : '—',
                        icon: '📈', color: 'bg-orange-50 border-orange-200 text-orange-700',
                      },
                    ].map(card => (
                      <div key={card.label} className={`border rounded-2xl p-4 ${card.color}`}>
                        <p className="text-2xl mb-1">{card.icon}</p>
                        <p className="text-xs font-medium opacity-70">{card.label}</p>
                        <p className="text-lg font-bold">{card.value}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* 商品別分析テーブル */}
              <div className="table-container">
                {/* 分析タブ内検索バー */}
                <div className="p-3 border-b border-gray-100">
                  <input
                    type="text"
                    value={analyticsSearch}
                    onChange={e => setAnalyticsSearch(e.target.value)}
                    placeholder="🔍 商品名で絞り込み"
                    className="w-full md:w-72 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  {analyticsSearch && (
                    <button
                      onClick={() => setAnalyticsSearch('')}
                      className="ml-2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      ✕ クリア
                    </button>
                  )}
                </div>
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-th">商品名</th>
                      <th className="table-th text-right">購入数</th>
                      <th className="table-th text-right">売上</th>
                      <th className="table-th text-right">クリック</th>
                      <th className="table-th text-right">紹介者数</th>
                      <th className="table-th text-right">成約率</th>
                      <th className="table-th text-center">ステータス</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products
                      .filter(p =>
                        !analyticsSearch ||
                        p.name.toLowerCase().includes(analyticsSearch.toLowerCase())
                      )
                      .map(product => {
                      const a = analytics.find(x => x.product_id === product.id);
                      return (
                        <tr key={product.id} className="table-row">
                          <td className="table-td">
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                              <p className="text-xs text-gray-400">{product.category}</p>
                            </div>
                          </td>
                          <td className="table-td text-right font-semibold">
                            {a ? `${a.total_purchases.toLocaleString()} 件` : '—'}
                          </td>
                          <td className="table-td text-right font-semibold text-green-600">
                            {a ? `¥${a.total_revenue.toLocaleString()}` : '—'}
                          </td>
                          <td className="table-td text-right">
                            {a ? `${a.total_clicks.toLocaleString()} 回` : '—'}
                          </td>
                          <td className="table-td text-right">
                            {a ? `${a.total_affiliates} 人` : '—'}
                          </td>
                          <td className="table-td text-right">
                            {a ? (
                              <span className={`font-semibold ${a.conversion_rate >= 5 ? 'text-green-600' : a.conversion_rate >= 2 ? 'text-yellow-600' : 'text-red-500'}`}>
                                {a.conversion_rate.toFixed(1)}%
                              </span>
                            ) : '—'}
                          </td>
                          <td className="table-td text-center">
                            <StatusBadge status={product.status} />
                          </td>
                        </tr>
                      );
                    })}
                    {products.filter(p =>
                      !analyticsSearch ||
                      p.name.toLowerCase().includes(analyticsSearch.toLowerCase())
                    ).length === 0 && (
                      <tr><td colSpan={7} className="table-td text-center text-gray-400 py-8">
                        {analyticsSearch ? `"${analyticsSearch}" に一致する商品がありません` : '商品がありません'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 更新ボタン */}
              <div className="text-right">
                <button
                  onClick={fetchAnalytics}
                  className="btn-secondary text-sm"
                >
                  🔄 データ更新
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================
          商品編集モーダル（7タブ）
          ============================================================ */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editProduct.id ? `商品編集：${editProduct.name}` : '商品追加'}
      >
        {/* タブナビ */}
        <div className="flex flex-wrap gap-1 mb-4 -mt-1 pb-3 border-b border-gray-200 overflow-x-auto">
          {EDIT_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ==============================
            タブ: 基本情報
            ============================== */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div>
              <Label text="商品名" required />
              <input type="text" value={editProduct.name || ''} onChange={e => setEditProduct(p => ({ ...p, name: e.target.value }))} className="input-field" />
            </div>
            <div>
              <Label text="商品説明" />
              <Textarea value={editProduct.description || ''} onChange={v => setEditProduct(p => ({ ...p, description: v }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label text="カテゴリ" />
                <select value={editProduct.category || 'course'} onChange={e => setEditProduct(p => ({ ...p, category: e.target.value }))} className="select-field">
                  <option value="course">講座</option>
                  <option value="digital">デジタルコンテンツ</option>
                  <option value="membership">メンバーシップ</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div>
                <Label text="ステータス" />
                <select value={editProduct.status || 'active'} onChange={e => setEditProduct(p => ({ ...p, status: e.target.value as any }))} className="select-field">
                  <option value="active">販売中</option>
                  <option value="paused">一時停止</option>
                  <option value="archived">アーカイブ</option>
                </select>
              </div>
            </div>
            <div>
              <Label text="商品提供者名" />
              <input type="text" value={editProduct.provider_name || ''} onChange={e => setEditProduct(p => ({ ...p, provider_name: e.target.value }))} className="input-field" placeholder="提供者の名前または組織名" />
            </div>
            <div>
              <Label text="販売ページ URL" />
              <input type="text" value={editProduct.lp_url || ''} onChange={e => setEditProduct(p => ({ ...p, lp_url: e.target.value }))} className="input-field" placeholder="/start-course" />
            </div>
            <div>
              <Label text="紹介用 LP URL（アフィリエイター向け）" />
              <input type="text" value={editProduct.affiliate_lp_url || ''} onChange={e => setEditProduct(p => ({ ...p, affiliate_lp_url: e.target.value }))} className="input-field" placeholder="/start-course（販売ページと同じ場合はそのまま）" />
            </div>
            <div>
              <Label text="サムネイル画像 URL" />
              <input type="text" value={editProduct.thumbnail_url || ''} onChange={e => setEditProduct(p => ({ ...p, thumbnail_url: e.target.value }))} className="input-field" placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label text="表示順" />
                <input type="number" value={editProduct.display_order || 0} onChange={e => setEditProduct(p => ({ ...p, display_order: parseInt(e.target.value) }))} className="input-field" />
              </div>
              <div>
                <Label text="視聴期間タイプ" />
                <select value={editProduct.access_type || 'lifetime'} onChange={e => setEditProduct(p => ({ ...p, access_type: e.target.value as any }))} className="select-field">
                  <option value="lifetime">無期限</option>
                  <option value="days_after_purchase">購入日から◯日間</option>
                  <option value="fixed_end_date">固定終了日</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ==============================
            タブ: 価格情報
            ============================== */}
        {activeTab === 'price' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label text="現在価格（円）" required />
                <input type="number" value={editProduct.price || 0} onChange={e => setEditProduct(p => ({ ...p, price: parseInt(e.target.value) }))} className="input-field" />
              </div>
              <div>
                <Label text="通常価格（円）" />
                <input type="number" value={editProduct.regular_price || ''} onChange={e => setEditProduct(p => ({ ...p, regular_price: parseInt(e.target.value) || undefined }))} className="input-field" placeholder="参考表示用" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label text="限定価格（円）" />
                <input type="number" value={editProduct.campaign_price || ''} onChange={e => setEditProduct(p => ({ ...p, campaign_price: parseInt(e.target.value) || undefined }))} className="input-field" placeholder="キャンペーン価格" />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editProduct.campaign_price_active || false} onChange={e => setEditProduct(p => ({ ...p, campaign_price_active: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
                  <span className="text-sm text-gray-700">限定価格を適用中</span>
                </label>
              </div>
            </div>
            <div>
              <Label text="価格切り替え条件（メモ）" />
              <input type="text" value={editProduct.campaign_condition || ''} onChange={e => setEditProduct(p => ({ ...p, campaign_condition: e.target.value }))} className="input-field" placeholder="例: スタート講座1,000部突破まで" />
            </div>
            <div>
              <Label text="Stripe 決済 URL（直リンク）" />
              <input type="text" value={editProduct.stripe_checkout_url || ''} onChange={e => setEditProduct(p => ({ ...p, stripe_checkout_url: e.target.value }))} className="input-field" placeholder="https://buy.stripe.com/..." />
            </div>
            <div>
              <Label text="Stripe Price ID" />
              <input type="text" value={editProduct.stripe_price_id || ''} onChange={e => setEditProduct(p => ({ ...p, stripe_price_id: e.target.value }))} className="input-field" placeholder="price_..." />
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-800">
              <p className="font-bold mb-1">📊 販売数ごとの価格階段</p>
              <p className="text-xs">段階価格の設定は商品一覧の「段階価格」ボタンから行ってください。</p>
              <p className="text-xs mt-1">スタート講座: 0〜1,000部¥29,800 / 1,001〜10,000部¥49,800 / 10,001部〜¥99,800</p>
            </div>
          </div>
        )}

        {/* ==============================
            タブ: 紹介条件
            ============================== */}
        {activeTab === 'affiliate' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="af_enabled" checked={editProduct.affiliate_enabled || false} onChange={e => setEditProduct(p => ({ ...p, affiliate_enabled: e.target.checked }))} className="w-5 h-5 accent-blue-600" />
              <label htmlFor="af_enabled" className="text-sm font-medium text-gray-800">アフィリエイト対象にする</label>
            </div>

            {editProduct.affiliate_enabled && (
              <>
                <div>
                  <Label text="アクセスレベル（誰が紹介できるか）" required />
                  <select value={editProduct.affiliate_access_level || 'none'} onChange={e => setEditProduct(p => ({ ...p, affiliate_access_level: e.target.value }))} className="select-field">
                    <option value="all">全員OK（登録済みアフィリエイター全員）</option>
                    <option value="approved_only">承認済みアフィリエイターのみ</option>
                    <option value="requires_purchase">スタート講座購入 かつ 承認済みのみ</option>
                    <option value="specific">指定アフィリエイターのみ</option>
                    <option value="tag">指定タグのアフィリエイターのみ</option>
                    <option value="none">紹介不可</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    「requires_purchase」= スタート講座購入者かつ承認済みアフィリエイターのみ紹介可
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input type="checkbox" id="af_app_open" checked={editProduct.affiliate_application_open || false} onChange={e => setEditProduct(p => ({ ...p, affiliate_application_open: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
                  <label htmlFor="af_app_open" className="text-sm text-gray-700">紹介申請を受け付ける</label>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-1">
                  <p className="font-bold">設定ガイド</p>
                  <p>• <strong>全員OK</strong>：無料教材・低価格商品向け</p>
                  <p>• <strong>承認済みのみ</strong>：一般的なアフィリエイト商品</p>
                  <p>• <strong>スタート講座購入+承認済み</strong>：スタート講座の紹介制度</p>
                  <p>• <strong>指定/タグ</strong>：特定パートナーへの限定解放</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ==============================
            タブ: 報酬条件
            ============================== */}
        {activeTab === 'commission' && (
          <div className="space-y-4">
            <div>
              <Label text="報酬タイプ" />
              <select value={editProduct.commission_type || 'percent'} onChange={e => setEditProduct(p => ({ ...p, commission_type: e.target.value }))} className="select-field">
                <option value="percent">パーセント（売上の◯%）</option>
                <option value="fixed">固定報酬（◯円）</option>
                <option value="none">報酬なし</option>
              </select>
            </div>

            {editProduct.commission_type === 'percent' && (
              <div>
                <Label text="報酬率（%）" />
                <input type="number" min={0} max={100} step={0.5} value={editProduct.commission_percent || 0} onChange={e => setEditProduct(p => ({ ...p, commission_percent: parseFloat(e.target.value) }))} className="input-field" placeholder="30" />
                <p className="text-xs text-gray-400 mt-1">例: 30 → 売上の30%</p>
              </div>
            )}
            {editProduct.commission_type === 'fixed' && (
              <div>
                <Label text="固定報酬額（円）" />
                <input type="number" min={0} value={editProduct.commission_fixed || 0} onChange={e => setEditProduct(p => ({ ...p, commission_fixed: parseInt(e.target.value) }))} className="input-field" placeholder="5000" />
              </div>
            )}

            <div>
              <Label text="報酬発生条件" />
              <select value={editProduct.commission_trigger || 'purchase'} onChange={e => setEditProduct(p => ({ ...p, commission_trigger: e.target.value }))} className="select-field">
                <option value="purchase">購入完了時</option>
                <option value="confirmed">報酬確定時（保留期間後）</option>
                <option value="click">クリック時</option>
              </select>
            </div>

            <div>
              <Label text="報酬確定タイミング" />
              <select value={editProduct.commission_confirm_timing || '30d_after_purchase'} onChange={e => setEditProduct(p => ({ ...p, commission_confirm_timing: e.target.value }))} className="select-field">
                <option value="immediate">即時確定</option>
                <option value="14d_after_purchase">購入から14日後</option>
                <option value="30d_after_purchase">購入から30日後</option>
                <option value="60d_after_purchase">購入から60日後</option>
                <option value="manual">手動確定</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label text="支払いスケジュール" />
                <select value={editProduct.payout_schedule || 'monthly'} onChange={e => setEditProduct(p => ({ ...p, payout_schedule: e.target.value }))} className="select-field">
                  <option value="monthly">月次</option>
                  <option value="weekly">週次</option>
                  <option value="manual">手動</option>
                </select>
              </div>
              <div>
                <Label text="最低支払額（円）" />
                <input type="number" value={editProduct.min_payout_amount || 3000} onChange={e => setEditProduct(p => ({ ...p, min_payout_amount: parseInt(e.target.value) }))} className="input-field" />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label text="返金時の報酬扱い" />
                <select value={editProduct.commission_on_refund || 'cancel'} onChange={e => setEditProduct(p => ({ ...p, commission_on_refund: e.target.value }))} className="select-field">
                  <option value="cancel">報酬取り消し</option>
                  <option value="keep">報酬維持</option>
                  <option value="partial">一部取り消し</option>
                </select>
              </div>
              <div>
                <Label text="キャンセル時の報酬扱い" />
                <select value={editProduct.commission_on_cancel || 'cancel'} onChange={e => setEditProduct(p => ({ ...p, commission_on_cancel: e.target.value }))} className="select-field">
                  <option value="cancel">報酬取り消し</option>
                  <option value="keep">報酬維持</option>
                </select>
              </div>
              <div>
                <Label text="チャージバック時の報酬扱い" />
                <select value={editProduct.commission_on_chargeback || 'cancel'} onChange={e => setEditProduct(p => ({ ...p, commission_on_chargeback: e.target.value }))} className="select-field">
                  <option value="cancel">報酬取り消し</option>
                  <option value="clawback">報酬回収（支払済みも差し引き）</option>
                  <option value="keep">報酬維持</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ==============================
            タブ: キャンセル・返金条件
            ============================== */}
        {activeTab === 'refund' && (
          <div className="space-y-4">
            <div>
              <Label text="返金可能期間（日）" />
              <input type="number" min={0} value={editProduct.refund_period_days ?? 14} onChange={e => setEditProduct(p => ({ ...p, refund_period_days: parseInt(e.target.value) }))} className="input-field" />
              <p className="text-xs text-gray-400 mt-1">0 = 返金不可</p>
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="revoke_commission" checked={editProduct.revoke_commission_on_refund ?? true} onChange={e => setEditProduct(p => ({ ...p, revoke_commission_on_refund: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
              <label htmlFor="revoke_commission" className="text-sm text-gray-700">返金時に報酬を取り消す</label>
            </div>

            <div>
              <Label text="報酬確定前の保留期間（日）" />
              <input type="number" min={0} value={editProduct.commission_hold_days ?? 30} onChange={e => setEditProduct(p => ({ ...p, commission_hold_days: parseInt(e.target.value) }))} className="input-field" />
              <p className="text-xs text-gray-400 mt-1">購入から◯日後に報酬確定</p>
            </div>

            <div>
              <Label text="不正疑い時の扱い" />
              <select value={editProduct.suspicious_handling || 'hold'} onChange={e => setEditProduct(p => ({ ...p, suspicious_handling: e.target.value }))} className="select-field">
                <option value="hold">保留（手動確認）</option>
                <option value="cancel">報酬取り消し</option>
                <option value="manual_review">要審査</option>
              </select>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1">
              <p className="font-bold">⚠️ 返金・キャンセルポリシーのガイド</p>
              <p>• 返金期間内の返金申請は原則受理してください</p>
              <p>• 報酬確定前の返金は自動で報酬取り消しにすることを推奨します</p>
              <p>• チャージバックの場合は必ず報酬回収を設定してください</p>
            </div>
          </div>
        )}

        {/* ==============================
            タブ: 紹介素材
            ============================== */}
        {activeTab === 'assets' && (
          <div className="space-y-4">
            <div>
              <Label text="短文紹介文（SNS向け）" />
              <Textarea value={promoAsset.short_description || ''} onChange={v => setPromoAsset(a => ({ ...a, short_description: v }))} rows={2} placeholder="副業迷子から抜け出す！AIを使って自分専用の収益化設計を..." />
            </div>
            <div>
              <Label text="長文紹介文（LP・ブログ向け）" />
              <Textarea value={promoAsset.long_description || ''} onChange={v => setPromoAsset(a => ({ ...a, long_description: v }))} rows={4} />
            </div>
            <div>
              <Label text="SNS投稿例" />
              <Textarea value={promoAsset.sns_post_example || ''} onChange={v => setPromoAsset(a => ({ ...a, sns_post_example: v }))} rows={4} placeholder="【副業迷子の方へ】&#10;..." />
            </div>
            <div>
              <Label text="LINE紹介文" />
              <Textarea value={promoAsset.line_intro_text || ''} onChange={v => setPromoAsset(a => ({ ...a, line_intro_text: v }))} rows={3} />
            </div>
            <div>
              <Label text="ストーリー文（Instagram等）" />
              <Textarea value={promoAsset.story_text || ''} onChange={v => setPromoAsset(a => ({ ...a, story_text: v }))} rows={3} />
            </div>
            <div>
              <Label text="PR表記例" />
              <input type="text" value={promoAsset.pr_notation_example || ''} onChange={e => setPromoAsset(a => ({ ...a, pr_notation_example: e.target.value }))} className="input-field" placeholder="※この投稿は広告です（#PR）" />
            </div>
            <div>
              <Label text="禁止表現リスト" />
              <Textarea value={promoAsset.prohibited_expressions || ''} onChange={v => setPromoAsset(a => ({ ...a, prohibited_expressions: v }))} rows={3} placeholder="・誇大表現（絶対に稼げる等）&#10;・実績のでっち上げ" />
            </div>
            <div>
              <Label text="紹介してほしいポイント" />
              <Textarea value={promoAsset.selling_points || ''} onChange={v => setPromoAsset(a => ({ ...a, selling_points: v }))} rows={3} />
            </div>
            <div>
              <Label text="紹介してほしくない表現" />
              <Textarea value={promoAsset.discouraged_expressions || ''} onChange={v => setPromoAsset(a => ({ ...a, discouraged_expressions: v }))} rows={2} />
            </div>
            <div>
              <Label text="よくある質問（Q&A）" />
              <Textarea value={promoAsset.faq || ''} onChange={v => setPromoAsset(a => ({ ...a, faq: v }))} rows={5} placeholder="Q. 副業初心者でも大丈夫ですか？&#10;A. はい。..." />
            </div>
            {promoSaving && <p className="text-xs text-blue-500">素材を保存中...</p>}
          </div>
        )}

        {/* ==============================
            タブ: パートナー設定
            ============================== */}
        {activeTab === 'partner' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="show_partner" checked={editProduct.show_to_partner || false} onChange={e => setEditProduct(p => ({ ...p, show_to_partner: e.target.checked }))} className="w-5 h-5 accent-blue-600" />
              <label htmlFor="show_partner" className="text-sm font-medium text-gray-800">商品提供者に表示する</label>
            </div>

            {editProduct.show_to_partner && (
              <>
                <div>
                  <Label text="商品提供者が閲覧できる範囲" />
                  <div className="space-y-2 mt-1">
                    {[
                      { key: 'stats', label: '販売統計（販売数・売上・成約数・クリック数）' },
                      { key: 'purchases', label: '購入者一覧（自商品のみ）' },
                      { key: 'affiliates', label: '紹介者別成果（自商品のみ）' },
                      { key: 'csv', label: 'CSV出力（自商品のみ）' },
                      { key: 'campaign', label: 'キャンペーン状況' },
                    ].map(item => {
                      const scope = editProduct.partner_view_scope || [];
                      const checked = scope.includes(item.key);
                      return (
                        <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              const newScope = e.target.checked
                                ? [...scope, item.key]
                                : scope.filter(k => k !== item.key);
                              setEditProduct(p => ({ ...p, partner_view_scope: newScope }));
                            }}
                            className="w-4 h-4 accent-blue-600"
                          />
                          <span className="text-sm text-gray-700">{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input type="checkbox" id="partner_csv" checked={editProduct.partner_can_export_csv || false} onChange={e => setEditProduct(p => ({ ...p, partner_can_export_csv: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
                  <label htmlFor="partner_csv" className="text-sm text-gray-700">CSV出力を許可する</label>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="partner_material" checked={editProduct.partner_can_request_material_edit || false} onChange={e => setEditProduct(p => ({ ...p, partner_can_request_material_edit: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
                  <label htmlFor="partner_material" className="text-sm text-gray-700">素材編集申請を許可する</label>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800 space-y-1">
                  <p className="font-bold">🚫 商品提供者に見せてはいけない情報</p>
                  <p>• 他の商品・売上・購入者データ</p>
                  <p>• 全体売上・全アフィリエイター一覧</p>
                  <p>• 他の商品提供者情報</p>
                  <p>• Stripe設定・システム設定</p>
                  <p>• 全体CSV・管理者専用メモ</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* 保存ボタン */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 mt-4">
          <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">キャンセル</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </Modal>

      {/* ============================================================
          段階価格モーダル
          ============================================================ */}
      <Modal
        isOpen={tierModalOpen}
        onClose={() => { setTierModalOpen(false); setSelectedProduct(null); setTierEditMode('list'); }}
        title={`段階価格設定 — ${selectedProduct?.name || ''}`}
      >
        {tierEditMode === 'list' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button onClick={() => { setEditTier({ ...defaultTier, product_id: selectedProduct?.id }); setTierEditMode('form'); }} className="btn-primary flex-1 text-sm">+ Tier追加</button>
              <button onClick={async () => { if (selectedProduct) { await fetchPriceHistory(selectedProduct.id); setTierEditMode('history'); } }} className="btn-secondary flex-1 text-sm">変更履歴</button>
            </div>

            {/* スタート講座向けヘルプ */}
            {selectedProduct?.id === 'a0000000-0000-0000-0000-000000000001' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
                <p className="font-bold">スタート講座の段階価格設定</p>
                <p>Tier 1: 0〜1,000部 → ¥29,800</p>
                <p>Tier 2: 1,001〜10,000部 → ¥49,800</p>
                <p>Tier 3: 10,001部〜 → ¥99,800</p>
              </div>
            )}

            {tiersLoading ? <LoadingSpinner size="sm" /> : tiers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-4xl mb-2">🏷️</p>
                <p className="text-sm">段階価格が未設定です</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tiers.map((tier, idx) => (
                  <div key={tier.tier_id} className={`border rounded-xl p-4 ${tier.is_active ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Tier {idx + 1}</span>
                          {!tier.is_active && <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">無効</span>}
                        </div>
                        <p className="font-semibold text-gray-900">{tier.tier_name}</p>
                        <p className="text-xl font-bold text-blue-600">¥{tier.price.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {tier.min_valid_sales_count.toLocaleString()}部〜{tier.max_valid_sales_count != null ? `${tier.max_valid_sales_count.toLocaleString()}部` : '上限なし'}
                        </p>
                        {tier.stripe_price_id ? (
                          <p className="text-xs text-green-600 font-mono mt-1">✓ {tier.stripe_price_id}</p>
                        ) : (
                          <p className="text-xs text-yellow-600 mt-1">⚠ Stripe Price ID 未設定</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 ml-3">
                        <button onClick={() => { setEditTier(tier); setTierEditMode('form'); }} className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1 rounded-lg">編集</button>
                        <button onClick={() => handleManualSwitch(tier)} className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1 rounded-lg">手動切替</button>
                        {tier.is_active && <button onClick={() => handleDeleteTier(tier)} className="text-xs bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 rounded-lg">無効化</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-1">
              <p className="font-semibold text-gray-800">⚙ 自動切り替えの仕組み</p>
              <p>• 購入完了後、有効累計販売数（返金・CB除く）を確認</p>
              <p>• 閾値を超えていれば自動で価格・Stripe Price IDを更新</p>
              <p>• 価格変更時、管理者・全紹介者へアプリ内通知を送信</p>
            </div>
          </div>
        )}

        {tierEditMode === 'form' && (
          <div className="space-y-4">
            <button onClick={() => setTierEditMode('list')} className="text-sm text-blue-600 hover:underline">← 一覧に戻る</button>
            <h3 className="font-semibold text-gray-900">{editTier.tier_id ? 'Tier編集' : '新規Tier追加'}</h3>
            <div>
              <Label text="Tier名" required />
              <input type="text" value={editTier.tier_name || ''} onChange={e => setEditTier(t => ({ ...t, tier_name: e.target.value }))} className="input-field" placeholder="例: 早期価格（〜1,000部）" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label text="最小販売数（部）" required />
                <input type="number" min={0} value={editTier.min_valid_sales_count ?? 0} onChange={e => setEditTier(t => ({ ...t, min_valid_sales_count: parseInt(e.target.value) }))} className="input-field" />
              </div>
              <div>
                <Label text="最大販売数（部）" />
                <input type="number" min={0} value={editTier.max_valid_sales_count ?? ''} onChange={e => { const val = e.target.value === '' ? null : parseInt(e.target.value); setEditTier(t => ({ ...t, max_valid_sales_count: val })); }} className="input-field" placeholder="空欄=上限なし" />
              </div>
            </div>
            <div>
              <Label text="価格（円）" required />
              <input type="number" min={0} value={editTier.price ?? 0} onChange={e => setEditTier(t => ({ ...t, price: parseInt(e.target.value) }))} className="input-field" placeholder="29800" />
            </div>
            <div>
              <Label text="Stripe Price ID" />
              <input type="text" value={editTier.stripe_price_id || ''} onChange={e => setEditTier(t => ({ ...t, stripe_price_id: e.target.value || null }))} className="input-field" placeholder="price_..." />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="tier_active" checked={editTier.is_active ?? true} onChange={e => setEditTier(t => ({ ...t, is_active: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
              <label htmlFor="tier_active" className="text-sm text-gray-700">有効</label>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setTierEditMode('list')} className="btn-secondary flex-1">キャンセル</button>
              <button onClick={handleSaveTier} disabled={tierSaving} className="btn-primary flex-1">{tierSaving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        )}

        {tierEditMode === 'history' && (
          <div className="space-y-4">
            <button onClick={() => setTierEditMode('list')} className="text-sm text-blue-600 hover:underline">← 一覧に戻る</button>
            <h3 className="font-semibold text-gray-900">価格変更履歴</h3>
            {priceHistory.length === 0 ? (
              <p className="text-center text-gray-500 py-8 text-sm">変更履歴がありません</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {priceHistory.map(h => (
                  <div key={h.id} className="border border-gray-200 rounded-xl p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${h.trigger_type === 'sales_count' ? 'bg-green-100 text-green-700' : h.trigger_type === 'manual' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                        {h.trigger_type === 'sales_count' ? '自動（販売数）' : h.trigger_type === 'manual' ? '手動' : 'スケジュール'}
                      </span>
                      <span className="text-xs text-gray-400">{new Date(h.changed_at).toLocaleString('ja-JP')}</span>
                    </div>
                    <p className="font-semibold text-gray-800">¥{h.old_price.toLocaleString()} → ¥{h.new_price.toLocaleString()}</p>
                    {h.trigger_sales_count != null && <p className="text-xs text-gray-500">切替時販売数: {h.trigger_sales_count.toLocaleString()}部</p>}
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
