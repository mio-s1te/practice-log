// src/pages/partner/PartnerDashboard.tsx
// パートナー分析ダッシュボード（複数商品選択対応版）
// - 商品トグルボタン形式で複数商品を同時選択・集計表示
// - 期間フィルター（12種 + カスタム）
// - KPI集計（複数商品合算・加重平均）
// - グラフは複数商品色分け表示
// - 紹介者分析・購入者一覧

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Area, Legend,
  LineChart, Line,
} from 'recharts';
import { format, subDays, startOfMonth, startOfWeek, endOfWeek, subWeeks, subMonths, startOfYear } from 'date-fns';

// ============================================================
// 型定義
// ============================================================
type Period = 'today' | 'yesterday' | 'this_week' | 'last_week' | '7d' | '14d' | '30d' | 'month' | 'last_month' | 'this_year' | 'all' | 'custom';
type TabKey = 'overview' | 'product' | 'affiliates' | 'graph' | 'purchases';
type ChartView = 'daily' | 'weekly' | 'monthly';

const PERIOD_LABELS: Record<Period, string> = {
  today: '今日', yesterday: '昨日', this_week: '今週', last_week: '先週',
  '7d': '直近7日', '14d': '直近14日', '30d': '直近30日',
  month: '今月', last_month: '先月', this_year: '今年', all: '全期間', custom: 'カスタム',
};
const PERIOD_GROUPS = [
  { label: 'クイック', periods: ['today', 'yesterday', '7d', '30d', 'month', 'all'] as Period[] },
  { label: '週・月比較', periods: ['this_week', 'last_week', '14d', 'last_month', 'this_year'] as Period[] },
];

// 商品ごとの色
const PRODUCT_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#06b6d4', '#ec4899', '#f97316'];

interface ProductOption {
  product_id: string;
  permission_level: string;
  product: { name: string; price: number; status: string; lp_url?: string };
}

interface KPI {
  total_revenue: number; prev_revenue: number;
  total_sales: number; prev_sales: number;
  refunds: number; cancels: number;
  clicks: number; prev_clicks: number;
  conversions: number; prev_conversions: number;
  conversion_rate: number; prev_conversion_rate: number;
  total_commission: number;
  unconfirmed_commission: number;
  paid_commission: number;
  stripe_fee: number;
  net_remaining: number;
  refund_reserve: number;
  stripe_fee_pct: number;
}

interface DailyData { date: string; revenue: number; sales: number; commission: number; }
interface WeeklyData { week: string; revenue: number; sales: number; }
interface MonthlyData { month: string; revenue: number; sales: number; }

interface AffiliateRow {
  affiliate_id: string; affiliate_name: string;
  clicks: number; conversions: number; conversion_rate: number;
  revenue: number; commission: number; refunds: number;
}

interface ProductDetail {
  product_id: string; product_name: string; lp_url: string; price: number;
  total_sales: number; valid_sales: number; refunds: number; cancels: number;
  revenue: number; net_remaining: number; affiliate_revenue: number; direct_revenue: number;
  commission_amount: number; conversion_rate: number; clicks: number;
  affiliates: number; active_affiliates: number;
  scores: { sale_power: number; conversion: number; affiliate_friendliness: number; refund_risk: number; growth_potential: number; };
}

// 商品ごとのデータバケット
interface ProductData {
  productId: string;
  kpi: KPI | null;
  dailyData: DailyData[];
  weeklyData: WeeklyData[];
  monthlyData: MonthlyData[];
  productDetail: ProductDetail | null;
  affiliates: AffiliateRow[];
  purchases: any[];
}

// ============================================================
// ユーティリティ
// ============================================================
function getPeriodRange(period: Period, cs?: string, ce?: string): { start: string; end: string } {
  const today = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  switch (period) {
    case 'today': return { start: fmt(today), end: fmt(today) };
    case 'yesterday': { const y = subDays(today, 1); return { start: fmt(y), end: fmt(y) }; }
    case 'this_week': return { start: fmt(startOfWeek(today, { weekStartsOn: 1 })), end: fmt(today) };
    case 'last_week': { const lw = subWeeks(today, 1); return { start: fmt(startOfWeek(lw, { weekStartsOn: 1 })), end: fmt(endOfWeek(lw, { weekStartsOn: 1 })) }; }
    case '7d': return { start: fmt(subDays(today, 6)), end: fmt(today) };
    case '14d': return { start: fmt(subDays(today, 13)), end: fmt(today) };
    case '30d': return { start: fmt(subDays(today, 29)), end: fmt(today) };
    case 'month': return { start: fmt(startOfMonth(today)), end: fmt(today) };
    case 'last_month': { const lm = subMonths(today, 1); return { start: fmt(startOfMonth(lm)), end: fmt(new Date(lm.getFullYear(), lm.getMonth() + 1, 0)) }; }
    case 'this_year': return { start: fmt(startOfYear(today)), end: fmt(today) };
    case 'all': return { start: '2020-01-01', end: fmt(today) };
    case 'custom': if (cs && ce) return { start: cs, end: ce };
  }
  return { start: fmt(subDays(today, 29)), end: fmt(today) };
}

function fmtMoney(n: number) { return `¥${Math.floor(n).toLocaleString()}`; }
function fmtPct(n: number) { return `${(n * 100).toFixed(2)}%`; }

function diffBadge(curr: number, prev: number, isRate = false) {
  if (!prev || prev === 0) return null;
  const diff = curr - prev;
  const pct = ((diff / prev) * 100).toFixed(1);
  const positive = diff >= 0;
  const text = isRate ? `${positive ? '+' : ''}${diff.toFixed(2)}pt` : `${positive ? '+' : ''}${pct}%`;
  return { text, positive };
}

// 複数KPIを合算する
function mergeKpis(kpis: KPI[]): KPI {
  if (kpis.length === 0) return {
    total_revenue: 0, prev_revenue: 0, total_sales: 0, prev_sales: 0,
    refunds: 0, cancels: 0, clicks: 0, prev_clicks: 0,
    conversions: 0, prev_conversions: 0, conversion_rate: 0, prev_conversion_rate: 0,
    total_commission: 0, unconfirmed_commission: 0, paid_commission: 0,
    stripe_fee: 0, net_remaining: 0, refund_reserve: 0, stripe_fee_pct: 0,
  };
  const sum = (key: keyof KPI) => kpis.reduce((acc, k) => acc + (k[key] as number), 0);
  const totalClicks = sum('clicks');
  const totalConversions = sum('conversions');
  const prevClicks = sum('prev_clicks');
  const prevConversions = sum('prev_conversions');
  return {
    total_revenue: sum('total_revenue'), prev_revenue: sum('prev_revenue'),
    total_sales: sum('total_sales'), prev_sales: sum('prev_sales'),
    refunds: sum('refunds'), cancels: sum('cancels'),
    clicks: totalClicks, prev_clicks: prevClicks,
    conversions: totalConversions, prev_conversions: prevConversions,
    // 成約率は加重平均（クリック数ベース）
    conversion_rate: totalClicks > 0 ? totalConversions / totalClicks : 0,
    prev_conversion_rate: prevClicks > 0 ? prevConversions / prevClicks : 0,
    total_commission: sum('total_commission'),
    unconfirmed_commission: sum('unconfirmed_commission'),
    paid_commission: sum('paid_commission'),
    stripe_fee: sum('stripe_fee'), net_remaining: sum('net_remaining'),
    refund_reserve: sum('refund_reserve'),
    stripe_fee_pct: kpis.length > 0 ? kpis.reduce((acc, k) => acc + k.stripe_fee_pct, 0) / kpis.length : 0,
  };
}

// 日別データを合算する
function mergeDailyData(allData: DailyData[][]): DailyData[] {
  const map = new Map<string, DailyData>();
  allData.flat().forEach(d => {
    const existing = map.get(d.date);
    if (existing) {
      existing.revenue += d.revenue;
      existing.sales += d.sales;
      existing.commission += d.commission;
    } else {
      map.set(d.date, { ...d });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// 週別データを合算する
function mergeWeeklyData(allData: WeeklyData[][]): WeeklyData[] {
  const map = new Map<string, WeeklyData>();
  allData.flat().forEach(d => {
    const existing = map.get(d.week);
    if (existing) {
      existing.revenue += d.revenue;
      existing.sales += d.sales;
    } else {
      map.set(d.week, { ...d });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.week.localeCompare(b.week));
}

// 月別データを合算する
function mergeMonthlyData(allData: MonthlyData[][]): MonthlyData[] {
  const map = new Map<string, MonthlyData>();
  allData.flat().forEach(d => {
    const existing = map.get(d.month);
    if (existing) {
      existing.revenue += d.revenue;
      existing.sales += d.sales;
    } else {
      map.set(d.month, { ...d });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

// 紹介者データを商品横断でマージ（同一IDは合算）
function mergeAffiliates(allData: AffiliateRow[][]): AffiliateRow[] {
  const map = new Map<string, AffiliateRow>();
  allData.flat().forEach(a => {
    const existing = map.get(a.affiliate_id);
    if (existing) {
      existing.clicks += a.clicks;
      existing.conversions += a.conversions;
      existing.revenue += a.revenue;
      existing.commission += a.commission;
      existing.refunds += a.refunds;
      existing.conversion_rate = existing.clicks > 0 ? existing.conversions / existing.clicks : 0;
    } else {
      map.set(a.affiliate_id, { ...a });
    }
  });
  return Array.from(map.values());
}

// グラフ用：商品ごとの日別データをキー付きでマージ（color line表示用）
function buildMultiProductChartData(
  allDailyData: { productId: string; data: DailyData[] }[]
): { date: string; [key: string]: number | string }[] {
  const dateSet = new Set<string>();
  allDailyData.forEach(({ data }) => data.forEach(d => dateSet.add(d.date)));
  const dates = Array.from(dateSet).sort();
  return dates.map(date => {
    const row: { date: string; [key: string]: number | string } = { date };
    allDailyData.forEach(({ productId, data }) => {
      const found = data.find(d => d.date === date);
      row[`rev_${productId}`] = found?.revenue ?? 0;
      row[`sales_${productId}`] = found?.sales ?? 0;
    });
    return row;
  });
}

// ============================================================
// 小コンポーネント
// ============================================================
function PeriodSelector({ value, onChange }: { value: Period; onChange: (v: Period) => void }) {
  return (
    <div className="space-y-2">
      {PERIOD_GROUPS.map(g => (
        <div key={g.label}>
          <p className="text-xs text-gray-400 mb-1">{g.label}</p>
          <div className="flex gap-1 flex-wrap">
            {g.periods.map(p => (
              <button key={p} onClick={() => onChange(p)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${value === p ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div>
        <p className="text-xs text-gray-400 mb-1">カスタム</p>
        <button onClick={() => onChange('custom')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${value === 'custom' ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          📅 期間指定
        </button>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, prev, curr, isRate = false, color = 'purple' }: {
  label: string; value: string; sub?: string; prev?: number; curr?: number; isRate?: boolean;
  color?: 'purple' | 'green' | 'orange' | 'red' | 'blue' | 'gray' | 'teal';
}) {
  const bg: Record<string, string> = { purple: 'bg-purple-50 border-purple-100', green: 'bg-green-50 border-green-100', orange: 'bg-orange-50 border-orange-100', red: 'bg-red-50 border-red-100', blue: 'bg-blue-50 border-blue-100', gray: 'bg-gray-50 border-gray-200', teal: 'bg-teal-50 border-teal-100' };
  const txt: Record<string, string> = { purple: 'text-purple-700', green: 'text-green-700', orange: 'text-orange-700', red: 'text-red-600', blue: 'text-blue-700', gray: 'text-gray-700', teal: 'text-teal-700' };
  const diff = (curr !== undefined && prev !== undefined) ? diffBadge(curr, prev, isRate) : null;
  return (
    <div className={`rounded-2xl border p-4 ${bg[color]}`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-extrabold ${txt[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {diff && (
        <p className={`text-xs font-bold mt-1 ${diff.positive ? 'text-green-600' : 'text-red-500'}`}>
          {diff.positive ? '▲' : '▼'} {diff.text}
        </p>
      )}
    </div>
  );
}

function ScoreBadge({ value, label }: { value: number; label: string }) {
  const color = value >= 70 ? 'text-green-700 bg-green-50' : value >= 40 ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50';
  return (
    <div className={`rounded-lg px-2 py-1 text-xs font-bold ${color}`}>
      <span className="text-gray-500 font-normal">{label}: </span>{value}
    </div>
  );
}

function SectionCard({ title, icon, children, className = '' }: { title: string; icon: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-5 shadow-sm ${className}`}>
      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm">
        <span>{icon}</span><span>{title}</span>
      </h3>
      {children}
    </div>
  );
}

// ============================================================
// メインコンポーネント
// ============================================================
export function PartnerDashboard() {
  const token = sessionStorage.getItem('partner_token') || '';
  const apiBase = '/.netlify/functions/partner-api';
  const authHeader = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 商品（複数選択対応）
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // 期間
  const [period, setPeriod] = useState<Period>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showPeriodPanel, setShowPeriodPanel] = useState(false);

  // タブ
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [chartView, setChartView] = useState<ChartView>('daily');

  // 商品ごとのデータ Map<productId, ProductData>
  const [productDataMap, setProductDataMap] = useState<Map<string, ProductData>>(new Map());

  // UI
  const [loading, setLoading] = useState(false);
  const [affSearch, setAffSearch] = useState('');
  const [affSort, setAffSort] = useState<'revenue' | 'clicks' | 'conversions' | 'conversion_rate' | 'commission'>('revenue');
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [purchaseFilter, setPurchaseFilter] = useState<'all' | 'affiliate' | 'direct'>('all');

  // 商品一覧をsessionStorageから取得
  useEffect(() => {
    const stored = sessionStorage.getItem('partner_products');
    if (stored) {
      const prods: ProductOption[] = JSON.parse(stored);
      setProducts(prods);
      // 初期値：全商品選択
      if (prods.length > 0) setSelectedProductIds(prods.map(p => p.product_id));
    }
  }, []);

  // 1商品分のデータをフェッチ
  const fetchProductData = useCallback(async (productId: string, p: Period, cs?: string, ce?: string): Promise<ProductData> => {
    const { start, end } = getPeriodRange(p, cs, ce);
    const qp = `start=${start}&end=${end}&period=${p}`;
    const [dashRes, graphRes, affRes, prodRes, purchaseRes] = await Promise.all([
      fetch(`${apiBase}/products/${productId}/analytics/dashboard?${qp}`, { headers: authHeader }),
      fetch(`${apiBase}/products/${productId}/analytics/graph?${qp}`, { headers: authHeader }),
      fetch(`${apiBase}/products/${productId}/analytics/affiliates?${qp}`, { headers: authHeader }),
      fetch(`${apiBase}/products/${productId}/analytics/product?${qp}`, { headers: authHeader }),
      fetch(`${apiBase}/products/${productId}/purchases?limit=100`, { headers: authHeader }),
    ]);
    const result: ProductData = {
      productId,
      kpi: null, dailyData: [], weeklyData: [], monthlyData: [],
      productDetail: null, affiliates: [], purchases: [],
    };
    if (dashRes.ok) { const d = await dashRes.json(); result.kpi = d.kpi || null; result.dailyData = d.daily_data || []; }
    if (graphRes.ok) { const d = await graphRes.json(); result.weeklyData = d.weekly_data || []; result.monthlyData = d.monthly_data || []; }
    if (affRes.ok) { const d = await affRes.json(); result.affiliates = d.affiliates || []; }
    if (prodRes.ok) { const d = await prodRes.json(); result.productDetail = d.product || null; }
    if (purchaseRes.ok) { const d = await purchaseRes.json(); result.purchases = d.purchases || []; }
    return result;
  }, []);

  // 選択中の全商品を並列フェッチ
  const loadAllData = useCallback(async (ids: string[], p: Period, cs?: string, ce?: string) => {
    if (ids.length === 0) return;
    setLoading(true);
    try {
      const results = await Promise.all(ids.map(id => fetchProductData(id, p, cs, ce)));
      const newMap = new Map<string, ProductData>();
      results.forEach(r => newMap.set(r.productId, r));
      setProductDataMap(newMap);
    } catch (e) {
      console.error('PartnerDashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, [fetchProductData]);

  useEffect(() => {
    if (selectedProductIds.length > 0) loadAllData(selectedProductIds, period, customStart, customEnd);
  }, [selectedProductIds, period, loadAllData]);

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    if (p !== 'custom') setShowPeriodPanel(false);
  };
  const handleCustomApply = () => {
    if (customStart && customEnd) {
      loadAllData(selectedProductIds, 'custom', customStart, customEnd);
      setShowPeriodPanel(false);
    }
  };

  // 商品選択トグル
  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev => {
      if (prev.includes(id)) {
        // 最低1つは残す
        if (prev.length === 1) return prev;
        return prev.filter(x => x !== id);
      }
      return [...prev, id];
    });
  };

  // 全商品選択
  const selectAll = () => setSelectedProductIds(products.map(p => p.product_id));

  // ============================================================
  // 集計済みデータ（memoized）
  // ============================================================
  const selectedData = useMemo(() => {
    const entries = selectedProductIds
      .map(id => productDataMap.get(id))
      .filter((d): d is ProductData => !!d);
    return entries;
  }, [selectedProductIds, productDataMap]);

  const mergedKpi = useMemo(() => {
    const kpis = selectedData.map(d => d.kpi).filter((k): k is KPI => !!k);
    return kpis.length > 0 ? mergeKpis(kpis) : null;
  }, [selectedData]);

  const mergedDailyData = useMemo(() => mergeDailyData(selectedData.map(d => d.dailyData)), [selectedData]);
  const mergedWeeklyData = useMemo(() => mergeWeeklyData(selectedData.map(d => d.weeklyData)), [selectedData]);
  const mergedMonthlyData = useMemo(() => mergeMonthlyData(selectedData.map(d => d.monthlyData)), [selectedData]);
  const mergedAffiliates = useMemo(() => mergeAffiliates(selectedData.map(d => d.affiliates)), [selectedData]);
  const mergedPurchases = useMemo(() => {
    const all = selectedData.flatMap(d => d.purchases);
    return all.sort((a, b) => new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime());
  }, [selectedData]);

  // グラフ：複数商品色分けデータ
  const multiProductDailyChart = useMemo(() => {
    if (selectedProductIds.length <= 1) return null;
    return buildMultiProductChartData(
      selectedData.map(d => ({ productId: d.productId, data: d.dailyData }))
    );
  }, [selectedData, selectedProductIds]);

  const chartData = chartView === 'daily' ? mergedDailyData
    : chartView === 'weekly' ? mergedWeeklyData
    : mergedMonthlyData;
  const chartXKey = chartView === 'daily' ? 'date' : chartView === 'weekly' ? 'week' : 'month';

  const { start: periodStart, end: periodEnd } = getPeriodRange(period, customStart, customEnd);

  // 紹介者フィルター・ソート
  const filteredAffiliates = mergedAffiliates
    .filter(a => !affSearch || a.affiliate_name.includes(affSearch) || a.affiliate_id.includes(affSearch))
    .sort((a, b) => (b[affSort] as number) - (a[affSort] as number));

  // 購入者フィルター
  const filteredPurchases = mergedPurchases.filter(p => {
    if (purchaseFilter === 'affiliate' && p.purchase_source !== 'affiliate') return false;
    if (purchaseFilter === 'direct' && p.purchase_source === 'affiliate') return false;
    if (purchaseSearch && !(p.buyer_email || '').includes(purchaseSearch) && !(p.affiliate_name || '').includes(purchaseSearch)) return false;
    return true;
  });

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'overview', label: '概要', icon: '📊' },
    { key: 'product', label: '商品分析', icon: '📦' },
    { key: 'affiliates', label: '紹介者分析', icon: '👥' },
    { key: 'graph', label: 'グラフ', icon: '📈' },
    { key: 'purchases', label: '購入者', icon: '🛒' },
  ];

  const isAllSelected = selectedProductIds.length === products.length;

  // 商品名ショート表示（長い場合は切り捨て）
  const shortName = (name: string) => name.length > 14 ? name.slice(0, 13) + '…' : name;

  return (
    <div className="space-y-4">

      {/* ヘッダー */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-sm text-gray-500 mt-0.5">自分の商品データのみ表示されます</p>
      </div>

      {/* ==============================
          商品選択（トグルボタン形式）
         ============================== */}
      {products.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500">📦 表示する商品を選択</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {selectedProductIds.length}/{products.length}商品選択中
              </span>
              <button
                onClick={selectAll}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  isAllSelected
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-purple-50 hover:text-purple-700'
                }`}
              >
                全商品
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {products.map((p, i) => {
              const isSelected = selectedProductIds.includes(p.product_id);
              const color = PRODUCT_COLORS[i % PRODUCT_COLORS.length];
              return (
                <button
                  key={p.product_id}
                  onClick={() => toggleProduct(p.product_id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    isSelected
                      ? 'border-transparent text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                  style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
                >
                  {/* カラードット */}
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.8)' : color }}
                  />
                  {shortName(p.product?.name || p.product_id)}
                  {p.product?.status === 'active' && (
                    <span className={`text-[10px] ${isSelected ? 'opacity-70' : 'text-green-500'}`}>●</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 選択中商品サマリー（複数選択時） */}
          {selectedProductIds.length > 1 && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
              {selectedProductIds.map((id, i) => {
                const prod = products.find(p => p.product_id === id);
                const color = PRODUCT_COLORS[products.findIndex(p => p.product_id === id) % PRODUCT_COLORS.length];
                return (
                  <span key={id} className="flex items-center gap-1 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                    {shortName(prod?.product?.name || id)}
                    {i < selectedProductIds.length - 1 && <span className="text-gray-300 ml-1">+</span>}
                  </span>
                );
              })}
              <span className="text-xs text-gray-400 ml-auto">集計表示中</span>
            </div>
          )}
        </div>
      )}

      {/* 期間コントロール */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">📅 期間:</span>
            <span className="text-sm font-bold text-purple-700">{PERIOD_LABELS[period]}</span>
            <span className="text-xs text-gray-400">（{periodStart} 〜 {periodEnd}）</span>
          </div>
          <button
            onClick={() => setShowPeriodPanel(!showPeriodPanel)}
            className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors"
          >
            {showPeriodPanel ? '▲ 閉じる' : '▼ 期間を変更'}
          </button>
        </div>
        {showPeriodPanel && (
          <div className="border-t border-gray-100 pt-3">
            <PeriodSelector value={period} onChange={handlePeriodChange} />
            {period === 'custom' && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                <span className="text-gray-400 text-sm">〜</span>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                <button onClick={handleCustomApply}
                  className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
                  適用
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* タブ */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <span>{tab.icon}</span><span>{tab.label}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-400">
          <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm">
            {selectedProductIds.length > 1
              ? `${selectedProductIds.length}商品のデータを読み込み中...`
              : 'データを読み込み中...'}
          </p>
        </div>
      )}

      {!loading && (
        <>
          {/* ========== 概要タブ ========== */}
          {activeTab === 'overview' && mergedKpi && (
            <div className="space-y-4">
              {/* 複数商品選択時のラベル */}
              {selectedProductIds.length > 1 && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs text-gray-500 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                    {selectedProductIds.length}商品の合計
                  </span>
                </div>
              )}

              {/* KPIカード */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <KpiCard label="総売上" value={fmtMoney(mergedKpi.total_revenue)} color="green"
                  curr={mergedKpi.total_revenue} prev={mergedKpi.prev_revenue} />
                <KpiCard label="有効販売数" value={`${mergedKpi.total_sales}件`} color="purple"
                  curr={mergedKpi.total_sales} prev={mergedKpi.prev_sales} />
                <KpiCard label="クリック数" value={`${mergedKpi.clicks.toLocaleString()}回`} color="blue"
                  curr={mergedKpi.clicks} prev={mergedKpi.prev_clicks} />
                <KpiCard label="成約率" value={fmtPct(mergedKpi.conversion_rate)} color="teal"
                  curr={mergedKpi.conversion_rate} prev={mergedKpi.prev_conversion_rate} isRate />
                <KpiCard label="返金数" value={`${mergedKpi.refunds}件`} color="red" />
                <KpiCard label="報酬発生額" value={fmtMoney(mergedKpi.total_commission)} color="orange"
                  sub={`支払済: ${fmtMoney(mergedKpi.paid_commission)}`} />
              </div>

              {/* 販売内訳サマリー */}
              <SectionCard title="販売内訳" icon="📊">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">総売上</p>
                    <p className="text-base font-extrabold text-green-700">{fmtMoney(mergedKpi.total_revenue)}</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">報酬発生額（累計）</p>
                    <p className="text-base font-extrabold text-orange-700">{fmtMoney(mergedKpi.total_commission)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">支払済み報酬</p>
                    <p className="text-base font-extrabold text-blue-700">{fmtMoney(mergedKpi.paid_commission)}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">未払い報酬</p>
                    <p className="text-base font-extrabold text-yellow-700">{fmtMoney(mergedKpi.unconfirmed_commission)}</p>
                  </div>
                </div>
              </SectionCard>

              {/* 商品別売上内訳（複数選択時） */}
              {selectedProductIds.length > 1 && (
                <SectionCard title="商品別売上内訳" icon="📦">
                  <div className="space-y-2">
                    {selectedProductIds.map((id, i) => {
                      const data = productDataMap.get(id);
                      const prod = products.find(p => p.product_id === id);
                      const color = PRODUCT_COLORS[products.findIndex(p => p.product_id === id) % PRODUCT_COLORS.length];
                      const rev = data?.kpi?.total_revenue ?? 0;
                      const total = mergedKpi.total_revenue;
                      const pct = total > 0 ? Math.round((rev / total) * 100) : 0;
                      return (
                        <div key={id} className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-xs text-gray-700 flex-1 truncate">{prod?.product?.name || id}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                            </div>
                            <span className="text-xs font-bold text-gray-700 w-16 text-right">{fmtMoney(rev)}</span>
                            <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              )}

              {/* アフィリエイト vs 直接（1商品選択時のみ） */}
              {selectedProductIds.length === 1 && (() => {
                const detail = productDataMap.get(selectedProductIds[0])?.productDetail;
                return detail ? (
                  <SectionCard title="販売チャネル比較" icon="🔀">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-xl p-4">
                        <p className="text-xs font-bold text-blue-700 mb-2">アフィリエイト経由</p>
                        <p className="text-xl font-extrabold text-blue-800">{detail.affiliate_revenue.toLocaleString()}円</p>
                        <p className="text-xs text-gray-500 mt-1">{detail.revenue > 0 ? Math.round((detail.affiliate_revenue / detail.revenue) * 100) : 0}% の売上</p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-4">
                        <p className="text-xs font-bold text-green-700 mb-2">直接購入</p>
                        <p className="text-xl font-extrabold text-green-800">{detail.direct_revenue.toLocaleString()}円</p>
                        <p className="text-xs text-gray-500 mt-1">{detail.revenue > 0 ? Math.round((detail.direct_revenue / detail.revenue) * 100) : 0}% の売上</p>
                      </div>
                    </div>
                  </SectionCard>
                ) : null;
              })()}
            </div>
          )}

          {/* ========== 商品分析タブ ========== */}
          {activeTab === 'product' && (
            <div className="space-y-4">
              {selectedProductIds.length > 1 ? (
                /* 複数商品選択時：商品ごとにカード表示 */
                <div className="space-y-4">
                  {selectedProductIds.map((id, idx) => {
                    const data = productDataMap.get(id);
                    const prod = products.find(p => p.product_id === id);
                    const detail = data?.productDetail;
                    const color = PRODUCT_COLORS[products.findIndex(p => p.product_id === id) % PRODUCT_COLORS.length];
                    if (!detail) return null;
                    return (
                      <div key={id} className="bg-white rounded-2xl border-2 p-5 shadow-sm" style={{ borderColor: color }}>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                          <h3 className="font-bold text-gray-900 text-sm">{prod?.product?.name || id}</h3>
                          <span className="text-xs text-gray-400">¥{(prod?.product?.price || 0).toLocaleString()}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {[
                            { label: '有効販売数', value: `${detail.valid_sales}件` },
                            { label: '返金数', value: `${detail.refunds}件` },
                            { label: '成約率', value: fmtPct(detail.conversion_rate) },
                            { label: '総売上', value: fmtMoney(detail.revenue) },
                            { label: 'AF経由売上', value: fmtMoney(detail.affiliate_revenue) },
                            { label: '報酬発生額', value: fmtMoney(detail.commission_amount) },
                          ].map(item => (
                            <div key={item.label} className="bg-gray-50 rounded-xl p-2.5">
                              <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                              <p className="text-sm font-extrabold text-gray-800">{item.value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {Object.entries(detail.scores).map(([key, val]) => {
                            const labels: Record<string, string> = { sale_power: '販売力', conversion: '成約力', affiliate_friendliness: '紹介しやすさ', refund_risk: '返金リスク', growth_potential: '成長余地' };
                            return <ScoreBadge key={key} value={val} label={labels[key] || key} />;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* 1商品選択時：詳細表示 */
                (() => {
                  const detail = productDataMap.get(selectedProductIds[0])?.productDetail;
                  if (!detail) return (
                    <div className="text-center py-12 text-gray-400">
                      <p className="text-3xl mb-2">📦</p>
                      <p className="text-sm">商品分析データがありません</p>
                    </div>
                  );
                  return (
                    <>
                      <SectionCard title="商品詳細指標" icon="📦">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {[
                            { label: '総注文数', value: `${detail.total_sales}件`, color: 'bg-gray-50 text-gray-700' },
                            { label: '有効販売数', value: `${detail.valid_sales}件`, color: 'bg-purple-50 text-purple-700' },
                            { label: '返金数', value: `${detail.refunds}件`, color: 'bg-red-50 text-red-600' },
                            { label: 'クリック数', value: `${detail.clicks.toLocaleString()}回`, color: 'bg-blue-50 text-blue-700' },
                            { label: '成約率', value: fmtPct(detail.conversion_rate), color: 'bg-teal-50 text-teal-700' },
                            { label: '総売上', value: fmtMoney(detail.revenue), color: 'bg-green-50 text-green-700' },
                            { label: 'AF経由売上', value: fmtMoney(detail.affiliate_revenue), color: 'bg-blue-50 text-blue-700' },
                            { label: '直接売上', value: fmtMoney(detail.direct_revenue), color: 'bg-indigo-50 text-indigo-700' },
                            { label: '報酬発生額', value: fmtMoney(detail.commission_amount), color: 'bg-orange-50 text-orange-700' },
                            { label: '紹介者数', value: `${detail.affiliates}人`, color: 'bg-pink-50 text-pink-700' },
                            { label: '返金率', value: detail.total_sales > 0 ? `${((detail.refunds / detail.total_sales) * 100).toFixed(1)}%` : '0%', color: 'bg-red-50 text-red-600' },
                          ].map(item => (
                            <div key={item.label} className={`${item.color.split(' ')[0]} rounded-xl p-3`}>
                              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                              <p className={`text-base font-extrabold ${item.color.split(' ')[1]}`}>{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </SectionCard>
                      <SectionCard title="商品スコア評価" icon="⭐">
                        <div className="flex flex-wrap gap-2 mb-4">
                          <ScoreBadge value={detail.scores.sale_power} label="販売力" />
                          <ScoreBadge value={detail.scores.conversion} label="成約力" />
                          <ScoreBadge value={detail.scores.affiliate_friendliness} label="紹介しやすさ" />
                          <ScoreBadge value={detail.scores.refund_risk} label="返金リスク(低=問題)" />
                          <ScoreBadge value={detail.scores.growth_potential} label="成長余地" />
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {Object.entries(detail.scores).map(([key, val]) => {
                            const labels: Record<string, string> = { sale_power: '販売力', conversion: '成約力', affiliate_friendliness: '紹介しやすさ', refund_risk: '返金リスク', growth_potential: '成長余地' };
                            return (
                              <div key={key} className="text-center">
                                <div className="h-24 bg-gray-100 rounded-xl relative overflow-hidden">
                                  <div className="absolute bottom-0 left-0 right-0 rounded-xl transition-all"
                                    style={{ height: `${val}%`, backgroundColor: val >= 70 ? '#10b981' : val >= 40 ? '#f59e0b' : '#ef4444' }} />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-lg font-extrabold text-gray-800">{val}</span>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{labels[key]}</p>
                              </div>
                            );
                          })}
                        </div>
                      </SectionCard>
                    </>
                  );
                })()
              )}
            </div>
          )}

          {/* ========== 紹介者分析タブ ========== */}
          {activeTab === 'affiliates' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
                <input
                  type="text"
                  placeholder="紹介者名で検索..."
                  value={affSearch}
                  onChange={e => setAffSearch(e.target.value)}
                  className="border border-gray-300 rounded-xl px-3 py-2 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <select value={affSort} onChange={e => setAffSort(e.target.value as typeof affSort)}
                  className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="revenue">売上順</option>
                  <option value="clicks">クリック順</option>
                  <option value="conversions">成約数順</option>
                  <option value="conversion_rate">成約率順</option>
                  <option value="commission">報酬額順</option>
                </select>
                <span className="text-xs text-gray-400">{filteredAffiliates.length}人</span>
              </div>

              {filteredAffiliates.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-3xl mb-2">👥</p>
                  <p className="text-sm">この期間の紹介者データがありません</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {['紹介者', 'クリック', '成約数', '成約率', '売上', '報酬', '返金'].map(h => (
                            <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredAffiliates.map((a, i) => (
                          <tr key={a.affiliate_id} className="hover:bg-purple-50/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                                <span className="font-medium text-gray-800">{a.affiliate_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-700">{a.clicks.toLocaleString()}</td>
                            <td className="px-4 py-3 font-bold text-purple-700">{a.conversions}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.conversion_rate >= 0.05 ? 'bg-green-100 text-green-700' : a.conversion_rate >= 0.02 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
                                {fmtPct(a.conversion_rate)}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-green-700">{fmtMoney(a.revenue)}</td>
                            <td className="px-4 py-3 text-orange-700">{fmtMoney(a.commission)}</td>
                            <td className="px-4 py-3 text-red-500">{a.refunds > 0 ? `${a.refunds}件` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden divide-y divide-gray-100">
                    {filteredAffiliates.map((a, i) => (
                      <div key={a.affiliate_id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                            <span className="font-bold text-gray-800">{a.affiliate_name}</span>
                          </div>
                          <span className="font-extrabold text-green-700">{fmtMoney(a.revenue)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-gray-50 rounded-lg p-2 text-center"><p className="text-gray-400">クリック</p><p className="font-bold">{a.clicks}</p></div>
                          <div className="bg-purple-50 rounded-lg p-2 text-center"><p className="text-gray-400">成約</p><p className="font-bold text-purple-700">{a.conversions}</p></div>
                          <div className="bg-teal-50 rounded-lg p-2 text-center"><p className="text-gray-400">成約率</p><p className="font-bold text-teal-700">{fmtPct(a.conversion_rate)}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========== グラフタブ ========== */}
          {activeTab === 'graph' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {(['daily', 'weekly', 'monthly'] as ChartView[]).map(v => (
                  <button key={v} onClick={() => setChartView(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${chartView === v ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {v === 'daily' ? '日別' : v === 'weekly' ? '週別' : '月別'}
                  </button>
                ))}
              </div>

              {/* 売上グラフ */}
              <SectionCard title={`売上推移${selectedProductIds.length > 1 ? '（商品別）' : ''}`} icon="💰">
                {chartData.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">この期間のデータがありません</div>
                ) : selectedProductIds.length > 1 && chartView === 'daily' && multiProductDailyChart ? (
                  /* 複数商品：色分けLineChart */
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={multiProductDailyChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `¥${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number, name: string) => {
                        const id = name.replace('rev_', '');
                        const prod = products.find(p => p.product_id === id);
                        return [`¥${v.toLocaleString()}`, prod?.product?.name || id];
                      }} />
                      <Legend formatter={(value: string) => {
                        const id = value.replace('rev_', '');
                        const prod = products.find(p => p.product_id === id);
                        return shortName(prod?.product?.name || id);
                      }} />
                      {selectedProductIds.map((id, i) => (
                        <Line key={id} type="monotone" dataKey={`rev_${id}`}
                          stroke={PRODUCT_COLORS[products.findIndex(p => p.product_id === id) % PRODUCT_COLORS.length]}
                          strokeWidth={2} dot={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  /* 1商品または週別/月別：合算ComposedChart */
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey={chartXKey} tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `¥${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => [`¥${v.toLocaleString()}`, '売上']} />
                      <Area type="monotone" dataKey="revenue" fill="#ede9fe" stroke="#8b5cf6" strokeWidth={2} name="売上" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </SectionCard>

              {/* 販売数グラフ */}
              <SectionCard title={`販売数推移${selectedProductIds.length > 1 ? '（合算）' : ''}`} icon="📦">
                {chartData.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">この期間のデータがありません</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey={chartXKey} tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip formatter={(v: number) => [`${v}件`, '販売数']} />
                      <Bar dataKey="sales" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="販売数" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </SectionCard>

              {/* 報酬グラフ（日別のみ） */}
              {chartView === 'daily' && (
                <SectionCard title="報酬発生額推移" icon="💸">
                  {mergedDailyData.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">この期間のデータがありません</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={mergedDailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `¥${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => [`¥${v.toLocaleString()}`, '報酬']} />
                        <Line type="monotone" dataKey="commission" stroke="#f59e0b" strokeWidth={2} dot={false} name="報酬" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </SectionCard>
              )}
            </div>
          )}

          {/* ========== 購入者タブ ========== */}
          {activeTab === 'purchases' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
                <input
                  type="text"
                  placeholder="メール・紹介者名で検索..."
                  value={purchaseSearch}
                  onChange={e => setPurchaseSearch(e.target.value)}
                  className="border border-gray-300 rounded-xl px-3 py-2 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex gap-1">
                  {(['all', 'affiliate', 'direct'] as const).map(f => (
                    <button key={f} onClick={() => setPurchaseFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${purchaseFilter === f ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {f === 'all' ? '全て' : f === 'affiliate' ? 'AF経由' : '直接'}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-gray-400">{filteredPurchases.length}件</span>
              </div>

              {filteredPurchases.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-3xl mb-2">🛒</p>
                  <p className="text-sm">購入者データがありません</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {filteredPurchases.map((p: any, idx: number) => (
                      <div key={p.id ?? idx} className="px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{p.buyer_email || '購入者'}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <p className="text-xs text-gray-400">{new Date(p.purchased_at).toLocaleDateString('ja-JP')}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${p.purchase_source === 'affiliate' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                              {p.purchase_source === 'affiliate' ? `AF: ${p.affiliate_name || '—'}` : '直接'}
                            </span>
                            {p.campaign_name && <span className="text-xs text-gray-400">/ {p.campaign_name}</span>}
                            {/* 複数商品時：商品名表示 */}
                            {selectedProductIds.length > 1 && p.product_name && (
                              <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">{p.product_name}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">¥{(p.amount_total || 0).toLocaleString()}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'completed' ? 'bg-green-100 text-green-600' : p.status === 'refunded' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                            {p.status === 'completed' ? '有効' : p.status === 'refunded' ? '返金済' : p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* データなし */}
      {!loading && !mergedKpi && activeTab === 'overview' && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm">この期間のデータがありません</p>
          <p className="text-xs mt-1">期間を変更してみてください</p>
        </div>
      )}

      {/* 制限注意バナー */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-xs text-blue-700">
        🔒 このページには<strong>あなたの商品のデータのみ</strong>表示されます。他の商品・全体データは表示されません。
      </div>
    </div>
  );
}
