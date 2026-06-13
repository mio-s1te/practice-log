// src/pages/partner/PartnerDashboard.tsx
// 商品提供者ダッシュボード
//
// ⚠️ 表示ルール（厳守）
// ✅ 表示する: 自分の商品の販売数・売上・成約数・クリック数・アフィリエイト経由売上・直接売上・購入者一覧・紹介者別成果・報酬発生額・キャンペーン状況・CSV出力
// 🚫 表示禁止: 他の商品・他商品の売上・他商品の購入者・全体売上・全アフィリエイター一覧・全購入者一覧・他の商品提供者情報・Stripe設定・システム設定・全体CSV・管理者専用メモ

import { useEffect, useState } from 'react';

const API_BASE = '/.netlify/functions/partner-api';

function getToken() {
  return sessionStorage.getItem('partner_token') || '';
}
function apiFetch(path: string) {
  return fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  }).then(r => r.json());
}

interface ProductOption {
  product_id: string;
  permission_level: string;
  product: {
    name: string;
    price: number;
    status: string;
    lp_url?: string;
  };
}

interface Stats {
  total_sales: number;
  valid_sales_count: number;
  refund_count: number;
  total_revenue: number;
  affiliate_sales: number;
  direct_sales: number;
  affiliate_revenue: number;
  direct_revenue: number;
  click_count_30d: number;
  conversion_rate: string;
  commission_generated: number;
}

interface RecentPurchase {
  id: string;
  buyer_name?: string;
  amount: number;
  source: 'affiliate' | 'direct';
  purchased_at: string;
  status: string;
}

export function PartnerDashboard() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [product, setProduct] = useState<any>(null);
  const [priceTiers, setPriceTiers] = useState<any[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [canExportCsv, setCanExportCsv] = useState(false);
  const [activeView, setActiveView] = useState<'stats' | 'purchases' | 'affiliates'>('stats');

  // ログイン時にsessionStorageから「自分の商品のみ」を取得
  useEffect(() => {
    const stored = sessionStorage.getItem('partner_products');
    if (stored) {
      const prods: ProductOption[] = JSON.parse(stored);
      // ⚠️ partner_productsには認証時にサーバーが返した「自分の商品だけ」が入っている
      setProducts(prods);
      if (prods.length > 0) setSelectedProductId(prods[0].product_id);
    }
  }, []);

  useEffect(() => {
    if (!selectedProductId) return;
    setLoading(true);

    // 自分の商品IDのみをAPIに渡す
    apiFetch(`/products/${selectedProductId}/stats`)
      .then(data => {
        if (data.error) {
          // エラー: 権限がない商品にアクセスしようとした場合
          console.error('権限エラー:', data.error);
          setStats(null);
          setProduct(null);
          return;
        }
        setStats(data.stats);
        setProduct(data.product);
        setPriceTiers(data.price_tiers || []);
        setCanExportCsv(data.can_export_csv || false);
        setRecentPurchases(data.recent_purchases || []);
      })
      .catch(err => {
        console.error('データ取得エラー:', err);
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, [selectedProductId]);

  // 自分の商品以外は選択不可能にするため、
  // セレクトボックスは sessionStorage の products のみ表示
  const selectedProductInfo = products.find(p => p.product_id === selectedProductId);

  const kpi = stats ? [
    { label: '有効販売数', value: stats.valid_sales_count, unit: '部', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100' },
    { label: '総売上', value: `¥${stats.total_revenue.toLocaleString()}`, unit: '', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-100' },
    { label: '返金数', value: stats.refund_count, unit: '件', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
    { label: 'アフィリエイト経由', value: stats.affiliate_sales, unit: '件', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: '直接購入', value: stats.direct_sales, unit: '件', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { label: 'LP アクセス（30日）', value: stats.click_count_30d, unit: 'PV', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-100' },
    { label: 'アフィリエイト経由売上', value: `¥${(stats.affiliate_revenue || 0).toLocaleString()}`, unit: '', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-100' },
    { label: '直接売上', value: `¥${(stats.direct_revenue || 0).toLocaleString()}`, unit: '', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-100' },
    { label: '購入率', value: stats.conversion_rate || '-', unit: '%', color: 'text-pink-700', bg: 'bg-pink-50', border: 'border-pink-100' },
  ] : [];

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            自分の商品データのみ表示されます
          </p>
        </div>

        {/* 商品切り替え（自分の商品のみ） */}
        {products.length > 1 && (
          <select
            value={selectedProductId}
            onChange={e => setSelectedProductId(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {products.map(p => (
              <option key={p.product_id} value={p.product_id}>
                {p.product?.name || p.product_id}
              </option>
            ))}
          </select>
        )}

        {products.length === 0 && (
          <div className="text-sm text-gray-500 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl">
            📦 まだ紹介実績がありません。紹介を開始すると、この商品のデータがここに表示されます。
          </div>
        )}
      </div>

      {/* 制限注意バナー */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">🔒 表示範囲について</p>
        <p className="text-xs leading-relaxed">
          このページには、<strong>あなたが担当する商品・紹介実績がある商品のデータのみ</strong>表示されます。<br />
          他の商品・全体売上・全アフィリエイター一覧・システム設定は表示されません。
        </p>
      </div>

      {/* 商品情報バナー */}
      {product && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">表示中の商品</p>
              <h2 className="font-bold text-gray-900 text-lg">{product.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-sm text-gray-500">
                  現在価格: <span className="text-purple-700 font-bold text-base">¥{(product.price || 0).toLocaleString()}</span>
                </p>
                {selectedProductInfo?.product?.lp_url && (
                  <a href={selectedProductInfo.product.lp_url} target="_blank" rel="noopener noreferrer"
                     className="text-xs text-blue-600 hover:underline">販売ページ↗</a>
                )}
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {product.status === 'active' ? '販売中' : product.status}
            </span>
          </div>

          {/* 段階価格 */}
          {priceTiers.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">段階価格設定</p>
              <div className="flex flex-wrap gap-2">
                {priceTiers.map((t: any) => (
                  <div key={t.tier_id}
                    className={`px-3 py-1.5 rounded-lg text-xs ${
                      t.price === product.price
                        ? 'bg-purple-100 text-purple-700 font-bold ring-1 ring-purple-300'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {t.tier_name}: ¥{t.price.toLocaleString()}
                    <span className="ml-1 opacity-70">
                      ({t.min_valid_sales_count}部〜{t.max_valid_sales_count ? t.max_valid_sales_count + '部' : ''})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ビュー切り替えタブ */}
      <div className="flex gap-2">
        {[
          { key: 'stats', label: '統計', icon: '📊' },
          { key: 'purchases', label: '最近の購入', icon: '🛒' },
          { key: 'affiliates', label: '紹介者成果', icon: '👥' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeView === tab.key ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ==============================
          統計ビュー
          ============================== */}
      {activeView === 'stats' && (
        <>
          {loading ? (
            <div className="text-center py-12 text-gray-400">読み込み中...</div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {kpi.map(k => (
                <div key={k.label} className={`${k.bg} rounded-2xl p-4 border ${k.border}`}>
                  <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                  <p className={`text-2xl font-bold ${k.color}`}>
                    {k.value}<span className="text-sm font-normal ml-0.5">{k.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-sm">データを取得できませんでした</p>
            </div>
          )}

          {/* 報酬発生額 */}
          {stats && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-amber-800 mb-1">💸 アフィリエイト報酬発生額（自商品）</p>
              <p className="text-2xl font-extrabold text-amber-700">¥{(stats.commission_generated || 0).toLocaleString()}</p>
              <p className="text-xs text-amber-600 mt-1">※ これはアフィリエイターへの報酬発生総額です（支払済みを含む）</p>
            </div>
          )}
        </>
      )}

      {/* ==============================
          最近の購入ビュー
          ============================== */}
      {activeView === 'purchases' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">最近の購入（自商品のみ）</h3>
            <p className="text-xs text-gray-400 mt-0.5">他の商品の購入者は表示されません</p>
          </div>
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">読み込み中...</div>
          ) : recentPurchases.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-2xl mb-2">🛒</p>
              <p className="text-sm">まだ購入者がいません</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentPurchases.map(purchase => (
                <div key={purchase.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {purchase.buyer_name || '購入者'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(purchase.purchased_at).toLocaleDateString('ja-JP')}
                      {' · '}
                      <span className={purchase.source === 'affiliate' ? 'text-blue-600' : 'text-green-600'}>
                        {purchase.source === 'affiliate' ? 'アフィリエイト経由' : '直接購入'}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">¥{purchase.amount.toLocaleString()}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      purchase.status === 'active' ? 'bg-green-100 text-green-600' :
                      purchase.status === 'refunded' ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>{purchase.status === 'active' ? '有効' : purchase.status === 'refunded' ? '返金済' : purchase.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="px-4 py-3 border-t border-gray-100">
            <a href="/partner/purchases" className="text-sm text-purple-600 hover:underline">全購入者を見る →</a>
          </div>
        </div>
      )}

      {/* ==============================
          紹介者成果ビュー
          ============================== */}
      {activeView === 'affiliates' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">紹介者別成果（自商品のみ）</h3>
            <p className="text-xs text-gray-400 mt-0.5">他の商品の紹介者データは表示されません</p>
          </div>
          <a href="/partner/affiliates" className="flex items-center justify-center gap-2 py-3 border border-purple-200 rounded-xl text-purple-700 text-sm font-medium hover:bg-purple-50 transition-colors">
            <span>👥</span>
            <span>紹介者別成果ページへ</span>
          </a>
        </div>
      )}

      {/* CSV出力ボタン */}
      {canExportCsv && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-800 mb-3">📥 CSV出力（自商品のデータのみ）</p>
          <div className="flex flex-wrap gap-2">
            <a href="/partner/csv" className="flex-1 text-center py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors">
              CSV出力ページへ
            </a>
          </div>
        </div>
      )}

      {/* 申請・操作の案内 */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">⚠️ 変更・操作について</p>
        <ul className="space-y-1 text-xs">
          <li>• 価格変更・報酬変更・キャンペーン操作は <strong>申請制</strong> です</li>
          <li>• 「申請管理」ページから申請を作成してください</li>
          <li>• 承認後に内容が反映されます</li>
          <li>• <strong>他の商品・提供者のデータは表示されません</strong></li>
        </ul>
      </div>
    </div>
  );
}
