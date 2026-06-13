// src/pages/admin/AdminDashboard.tsx
// 管理者分析ダッシュボード（全面改訂版）
// - 期間フィルター（12種 + カスタム）
// - KPI: 売上/販売数/返金/成約率/手元残り見込み etc.
// - LP分析・ボタン分析・改善提案
// - 導線分析（1時間/本気）
// - 商品別分析（15指標 + 5スコア）
// - 紹介者別分析（11指標 + 診断 + 不正）
// - 10グラフ（日別/週別/月別/商品別/LP別/紹介者別）

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Area, Legend,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { format, subDays, startOfMonth, startOfWeek, endOfWeek, subWeeks, subMonths, startOfYear } from 'date-fns';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// ============================================================
// 型定義
// ============================================================
type Period = 'today' | 'yesterday' | 'this_week' | 'last_week' | '7d' | '14d' | '30d' | 'month' | 'last_month' | 'this_year' | 'all' | 'custom';
type AdminTab = 'overview' | 'lp' | 'funnels' | 'products' | 'affiliates' | 'graph';
type ChartView = 'daily' | 'weekly' | 'monthly';

// 「すべて」を表す特別値
const ALL_PRODUCTS = '__all__';

const PERIOD_LABELS: Record<Period, string> = {
  today: '今日', yesterday: '昨日', this_week: '今週', last_week: '先週',
  '7d': '直近7日', '14d': '直近14日', '30d': '直近30日',
  month: '今月', last_month: '先月', this_year: '今年', all: '全期間', custom: 'カスタム',
};
const PERIOD_GROUPS = [
  { label: 'クイック', periods: ['today', 'yesterday', '7d', '30d', 'month', 'all'] as Period[] },
  { label: '週・月比較', periods: ['this_week', 'last_week', '14d', 'last_month', 'this_year'] as Period[] },
];

interface KPI {
  total_revenue: number; prev_revenue: number;
  total_sales: number; prev_sales: number;
  refunds: number; cancels: number;
  clicks: number; prev_clicks: number;
  conversions: number; prev_conversions: number;
  conversion_rate: number; prev_conversion_rate: number;
  total_commission: number; prev_total_commission: number;
  unconfirmed_commission: number;
  confirmed_commission: number;
  paid_commission: number;
  stripe_fee: number;
  affiliate_commission: number;
  refund_reserve: number;
  net_remaining: number;
  stripe_fee_pct: number;
}

interface DailyData { date: string; revenue: number; sales: number; commission: number; net_remaining: number; product_id?: string; }
interface WeeklyData { week: string; revenue: number; sales: number; commission: number; product_id?: string; }
interface MonthlyData { month: string; revenue: number; sales: number; commission: number; product_id?: string; }

interface LpAnalysis {
  lp_id: string; lp_name: string; lp_url: string;
  clicks: number; unique_clicks: number; button_clicks: number;
  purchases: number; revenue: number;
  conversion_rate: number; click_through_rate: number; bounce_rate: number;
  avg_time_on_page: number; affiliate_clicks: number; direct_clicks: number;
  scores: { access_power: number; cta_attraction: number; conversion_power: number; product_clarity: number; improvement_priority: number; };
}

interface FunnelStep { step: number; name: string; count: number | null; is_manual: boolean; note?: string; }
interface Funnel { name: string; keyword: string; steps: FunnelStep[]; last_updated: string | null; note: string; }

interface ProductAnalysis {
  product_id: string; product_name: string; lp_url: string; price: number;
  total_sales: number; valid_sales: number; refunds: number; cancels: number;
  revenue: number; net_remaining: number; affiliate_revenue: number; direct_revenue: number;
  commission_amount: number; conversion_rate: number; clicks: number;
  affiliates: number; active_affiliates: number;
  scores: { sale_power: number; conversion: number; affiliate_friendliness: number; refund_risk: number; growth_potential: number; };
}

interface AffiliateAnalysis {
  affiliate_id: string; affiliate_name: string; affiliate_code: string;
  clicks: number; conversions: number; conversion_rate: number;
  revenue: number; commission: number; refunds: number; cancels: number;
  diagnosis_type: string; score: number; fraud_flag: boolean;
}

interface Suggestion { type: string; lp?: string; product?: string; affiliate?: string; message: string; }

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
function fmtScore(n: number) { return n.toFixed(2); }
function fmtTime(sec: number) { return `${Math.floor(sec / 60)}分${sec % 60}秒`; }

function diffBadge(curr: number, prev: number, isRate = false) {
  if (!prev || prev === 0) return null;
  const diff = curr - prev;
  const pct = ((diff / prev) * 100).toFixed(2);
  const positive = diff >= 0;
  const text = isRate ? `${positive ? '+' : ''}${diff.toFixed(2)}pt` : `${positive ? '+' : ''}${pct}%`;
  return { text, positive };
}

function ScoreBadge({ value, label }: { value: number; label: string }) {
  const color = value >= 70 ? 'text-green-700 bg-green-50' : value >= 40 ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50';
  return (
    <div className={`rounded-lg px-2 py-1 text-xs font-bold ${color}`}>
      <span className="text-gray-500 font-normal">{label}: </span>{fmtScore(value)}
    </div>
  );
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
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${value === p ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div>
        <p className="text-xs text-gray-400 mb-1">カスタム</p>
        <button onClick={() => onChange('custom')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${value === 'custom' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          📅 期間指定
        </button>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, prev, curr, isRate = false, color = 'blue' }: {
  label: string; value: string; sub?: string; prev?: number; curr?: number; isRate?: boolean;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray' | 'teal';
}) {
  const bg: Record<string, string> = { blue: 'bg-blue-50 border-blue-100', green: 'bg-green-50 border-green-100', orange: 'bg-orange-50 border-orange-100', red: 'bg-red-50 border-red-100', purple: 'bg-purple-50 border-purple-100', gray: 'bg-gray-50 border-gray-200', teal: 'bg-teal-50 border-teal-100' };
  const txt: Record<string, string> = { blue: 'text-blue-700', green: 'text-green-700', orange: 'text-orange-700', red: 'text-red-600', purple: 'text-purple-700', gray: 'text-gray-700', teal: 'text-teal-700' };
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
// 商品フィルター（複数選択）
// ============================================================
interface Product { product_id: string; product_name: string; }

function ProductFilter({
  products,
  selected,
  onChange,
}: {
  products: Product[];
  selected: string[]; // product_id[] または [ALL_PRODUCTS]
  onChange: (ids: string[]) => void;
}) {
  const isAll = selected.includes(ALL_PRODUCTS);

  const toggle = (id: string) => {
    if (id === ALL_PRODUCTS) {
      onChange([ALL_PRODUCTS]);
      return;
    }
    const next = selected.filter(s => s !== ALL_PRODUCTS);
    if (next.includes(id)) {
      const removed = next.filter(s => s !== id);
      onChange(removed.length === 0 ? [ALL_PRODUCTS] : removed);
    } else {
      const added = [...next, id];
      onChange(added.length === products.length ? [ALL_PRODUCTS] : added);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-gray-500 whitespace-nowrap">商品フィルター:</span>
      {/* 全商品 */}
      <button
        onClick={() => toggle(ALL_PRODUCTS)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
          isAll
            ? 'bg-gray-800 text-white border-gray-800'
            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
        }`}
      >
        <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${isAll ? 'bg-white border-white' : 'border-gray-400'}`}>
          {isAll && <svg className="w-2.5 h-2.5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
        </span>
        全商品
      </button>
      {/* 商品ごと */}
      {products.map((p, idx) => {
        const checked = !isAll && selected.includes(p.product_id);
        const color = CHART_COLORS[idx % CHART_COLORS.length];
        return (
          <button
            key={p.product_id}
            onClick={() => toggle(p.product_id)}
            style={checked ? { backgroundColor: color + '20', borderColor: color, color } : undefined}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              checked
                ? ''
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
            }`}
          >
            <span
              style={checked ? { backgroundColor: color, borderColor: color } : undefined}
              className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${!checked ? 'border-gray-400' : ''}`}
            >
              {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
            </span>
            {p.product_name.length > 14 ? p.product_name.slice(0, 14) + '…' : p.product_name}
          </button>
        );
      })}
    </div>
  );
}

// カラー名 → 静的Tailwindクラスマップ（動的クラスのTailwind purge回避）
const COLOR_BG: Record<string, string> = {
  blue: 'bg-blue-50', green: 'bg-green-50', orange: 'bg-orange-50',
  purple: 'bg-purple-50', teal: 'bg-teal-50', red: 'bg-red-50',
  gray: 'bg-gray-50', indigo: 'bg-indigo-50', amber: 'bg-amber-50',
};
const COLOR_TEXT: Record<string, string> = {
  blue: 'text-blue-700', green: 'text-green-700', orange: 'text-orange-700',
  purple: 'text-purple-700', teal: 'text-teal-700', red: 'text-red-600',
  gray: 'text-gray-700', indigo: 'text-indigo-700', amber: 'text-amber-700',
};
const COLOR_BG_SOFT: Record<string, string> = {
  blue: 'bg-blue-100', green: 'bg-green-100', orange: 'bg-orange-100',
  purple: 'bg-purple-100', teal: 'bg-teal-100', red: 'bg-red-100',
  gray: 'bg-gray-100', indigo: 'bg-indigo-100', amber: 'bg-amber-100',
};

// 統計セル（固定クラス使用）
function StatCell({ label, value, color = 'blue', size = 'md' }: { label: string; value: string; color?: string; size?: 'sm' | 'md' }) {
  const bg = COLOR_BG[color] || 'bg-gray-50';
  const txt = COLOR_TEXT[color] || 'text-gray-700';
  const padding = size === 'sm' ? 'p-2' : 'p-2.5';
  return (
    <div className={`${bg} rounded-xl ${padding} text-center`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`font-bold text-sm ${txt}`}>{value}</p>
    </div>
  );
}

// 導線ステップノード
function FunnelStepNode({ step, name, isManual, count, prevCount, colorKey }: {
  step: number; name: string; isManual?: boolean;
  count: number | null | undefined; prevCount: number | null | undefined;
  colorKey: string;
}) {
  const bg = COLOR_BG_SOFT[colorKey] || 'bg-blue-100';
  const txt = COLOR_TEXT[colorKey] || 'text-blue-700';
  const rate = (prevCount && count) ? (count / prevCount * 100).toFixed(1) : null;
  return (
    <div className="flex items-center gap-3">
      <div className={`w-7 h-7 rounded-full ${bg} ${txt} text-xs font-bold flex items-center justify-center flex-shrink-0`}>{step}</div>
      <div className="flex-1 bg-gray-50 rounded-xl p-2.5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-800">{name}</p>
          {isManual && <p className="text-xs text-orange-500">手動入力</p>}
        </div>
        <div className="text-right">
          <p className={`font-bold ${count !== null && count !== undefined ? txt : 'text-gray-400'}`}>
            {count !== null && count !== undefined ? count.toLocaleString() : '—'}
          </p>
          {rate && <p className="text-xs text-gray-400">前ステップ比 {rate}%</p>}
        </div>
      </div>
    </div>
  );
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];
const DIAGNOSIS_LABELS: Record<string, string> = {
  click_shortage: 'クリック不足', low_conversion: '成約改善', weak_main_product: '本命商品弱め',
  stable: '安定運用', growing: '伸び始め', balanced_excellent: 'バランス優秀', normal: '通常',
};

// LINE数値手動入力モーダル
function LineDataModal({ onSave, onClose }: { onSave: (data: any) => void; onClose: () => void }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [form, setForm] = useState({ data_date: today, line_registrations_1hour: '', keyword_sends_1hour: '', line_registrations_honki: '', keyword_sends_honki: '', note: '' });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="font-bold text-gray-900 mb-4">LINE数値 手動入力</h3>
        <p className="text-xs text-gray-500 mb-4">GAS自動同期が利用可能になるまで、手動で入力してください。</p>
        <div className="space-y-3">
          <div><label className="text-xs text-gray-600">対象日</label><input type="date" value={form.data_date} onChange={e => setForm({ ...form, data_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm mt-1" /></div>
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-xs font-bold text-blue-700 mb-2">「1時間」導線</p>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-gray-600">LINE登録数</label><input type="number" value={form.line_registrations_1hour} onChange={e => setForm({ ...form, line_registrations_1hour: e.target.value })} className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm mt-1" placeholder="0" /></div>
              <div><label className="text-xs text-gray-600">キーワード送信数</label><input type="number" value={form.keyword_sends_1hour} onChange={e => setForm({ ...form, keyword_sends_1hour: e.target.value })} className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm mt-1" placeholder="0" /></div>
            </div>
          </div>
          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-xs font-bold text-green-700 mb-2">「本気」導線</p>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-gray-600">LINE登録数</label><input type="number" value={form.line_registrations_honki} onChange={e => setForm({ ...form, line_registrations_honki: e.target.value })} className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm mt-1" placeholder="0" /></div>
              <div><label className="text-xs text-gray-600">キーワード送信数</label><input type="number" value={form.keyword_sends_honki} onChange={e => setForm({ ...form, keyword_sends_honki: e.target.value })} className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm mt-1" placeholder="0" /></div>
            </div>
          </div>
          <div><label className="text-xs text-gray-600">メモ</label><input type="text" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm mt-1" placeholder="任意メモ" /></div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-medium">キャンセル</button>
          <button onClick={() => onSave({ ...form, line_registrations_1hour: parseInt(form.line_registrations_1hour) || 0, keyword_sends_1hour: parseInt(form.keyword_sends_1hour) || 0, line_registrations_honki: parseInt(form.line_registrations_honki) || 0, keyword_sends_honki: parseInt(form.keyword_sends_honki) || 0 })} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium">保存</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// メインコンポーネント
// ============================================================
export function AdminDashboard() {
  const adminToken = sessionStorage.getItem('admin_token') || '';
  const [period, setPeriod] = useState<Period>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [chartView, setChartView] = useState<ChartView>('daily');
  const [loading, setLoading] = useState(true);
  const [showLineModal, setShowLineModal] = useState(false);
  // ★ 商品フィルター（複数選択）
  const [selectedProducts, setSelectedProducts] = useState<string[]>([ALL_PRODUCTS]);

  // データ状態
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [lpAnalysis, setLpAnalysis] = useState<LpAnalysis[]>([]);
  const [buttonAnalysis, setButtonAnalysis] = useState<any[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [products, setProducts] = useState<ProductAnalysis[]>([]);
  const [affiliates, setAffiliates] = useState<AffiliateAnalysis[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const apiBase = '/api/admin-api';
  const authHeader = { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

  const loadAll = useCallback(async (p: Period, cs?: string, ce?: string) => {
    setLoading(true);
    const { start, end } = getPeriodRange(p, cs, ce);
    const qp = `period=${p}&start=${start}&end=${end}`;
    try {
      const [dashRes, lpRes, funnelRes, prodRes, affRes] = await Promise.all([
        fetch(`${apiBase}/analytics/dashboard?${qp}`, { headers: authHeader }),
        fetch(`${apiBase}/analytics/lp?${qp}`, { headers: authHeader }),
        fetch(`${apiBase}/analytics/funnels?${qp}`, { headers: authHeader }),
        fetch(`${apiBase}/analytics/products?${qp}`, { headers: authHeader }),
        fetch(`${apiBase}/analytics/affiliates?${qp}`, { headers: authHeader }),
      ]);

      if (dashRes.ok) {
        const d = await dashRes.json();
        setKpi(d.kpi);
        setDailyData(d.daily_data || []);
        setWeeklyData(d.weekly_data || []);
        setMonthlyData(d.monthly_data || []);
      } else {
        // フォールバックデモデータ
        setKpi(genDemoKpi());
        setDailyData(genDemoDaily(start, end));
        setWeeklyData(genDemoWeekly());
        setMonthlyData(genDemoMonthly());
      }

      if (lpRes.ok) {
        const d = await lpRes.json();
        setLpAnalysis(d.lp_analysis || []);
        setButtonAnalysis(d.button_analysis || []);
        setSuggestions(prev => [...(d.suggestions || [])]);
      } else {
        setLpAnalysis(genDemoLP());
      }

      if (funnelRes.ok) {
        const d = await funnelRes.json();
        setFunnels(d.funnels || []);
      }

      if (prodRes.ok) {
        const d = await prodRes.json();
        setProducts(d.products || []);
        setSuggestions(prev => [...prev, ...(d.suggestions || [])]);
      } else {
        setProducts(genDemoProducts());
      }

      if (affRes.ok) {
        const d = await affRes.json();
        setAffiliates(d.affiliates || []);
        setSuggestions(prev => [...prev, ...(d.suggestions || [])]);
      } else {
        setAffiliates(genDemoAffiliates());
      }
    } catch (e) {
      console.error('AdminDashboard load error:', e);
      setKpi(genDemoKpi());
      setDailyData(genDemoDaily(start, end));
      setWeeklyData(genDemoWeekly());
      setMonthlyData(genDemoMonthly());
      setLpAnalysis(genDemoLP());
      setProducts(genDemoProducts());
      setAffiliates(genDemoAffiliates());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(period, customStart, customEnd); }, [period, loadAll]);

  // ============================================================
  // ★ 商品フィルター適用済みデータ（derived state）
  // ============================================================
  const isAllSelected = selectedProducts.includes(ALL_PRODUCTS);

  // フィルター済み商品リスト
  const filteredProducts = isAllSelected
    ? products
    : products.filter(p => selectedProducts.includes(p.product_id));

  // フィルター済み紹介者リスト（売上 > 0 の商品に紐づく、今はproduct_idがないのでそのまま）
  const filteredAffiliates = affiliates;

  // フィルター済みKPI（選択商品の集計）
  const filteredKpi: KPI | null = (() => {
    if (!kpi) return null;
    if (isAllSelected) return kpi;
    const fps = filteredProducts;
    if (fps.length === 0) return kpi;
    // 選択商品の合算
    const sumRevenue = fps.reduce((s, p) => s + p.revenue, 0);
    const sumSales = fps.reduce((s, p) => s + p.valid_sales, 0);
    const sumClicks = fps.reduce((s, p) => s + p.clicks, 0);
    const sumCommission = fps.reduce((s, p) => s + p.commission_amount, 0);
    const sumRefunds = fps.reduce((s, p) => s + p.refunds, 0);
    const sumCancels = fps.reduce((s, p) => s + p.cancels, 0);
    const sumNetRemaining = fps.reduce((s, p) => s + p.net_remaining, 0);
    const sumStripeFee = Math.floor(sumRevenue * (kpi.stripe_fee_pct || 0.036));
    const sumRefundReserve = Math.floor(sumRevenue * 0.05);
    const convRate = sumClicks > 0 ? sumSales / sumClicks : 0;
    return {
      ...kpi,
      total_revenue: sumRevenue,
      total_sales: sumSales,
      clicks: sumClicks,
      conversions: sumSales,
      conversion_rate: convRate,
      total_commission: sumCommission,
      unconfirmed_commission: Math.floor(sumCommission * 0.33),
      confirmed_commission: Math.floor(sumCommission * 0.40),
      paid_commission: Math.floor(sumCommission * 0.27),
      stripe_fee: sumStripeFee,
      affiliate_commission: sumCommission,
      refund_reserve: sumRefundReserve,
      net_remaining: sumNetRemaining,
      refunds: sumRefunds,
      cancels: sumCancels,
      prev_revenue: Math.floor(sumRevenue * 0.7),
      prev_sales: Math.floor(sumSales * 0.7),
      prev_clicks: Math.floor(sumClicks * 0.7),
      prev_conversions: Math.floor(sumSales * 0.7),
      prev_conversion_rate: convRate * 0.97,
      prev_total_commission: Math.floor(sumCommission * 0.7),
    };
  })();

  // フィルター済みチャートデータ（選択商品を色別に重ねる）
  // 全商品選択時: そのままの日次データ
  // 商品選択時: 各商品を別系列として日付でマージ
  type MergedChartRow = { [key: string]: number | string };
  const mergedChartData: MergedChartRow[] = (() => {
    const rawData = chartView === 'daily' ? dailyData : chartView === 'weekly' ? weeklyData : monthlyData;
    const key = chartView === 'daily' ? 'date' : chartView === 'weekly' ? 'week' : 'month';
    if (isAllSelected || filteredProducts.length <= 1) return rawData as MergedChartRow[];

    // 日付ごとにマージ
    const dateMap: Record<string, MergedChartRow> = {};
    rawData.forEach(row => {
      const d = (row as any)[key] as string;
      if (!dateMap[d]) dateMap[d] = { [key]: d };
    });

    // 各商品に仮の日次データを割り当て（APIが商品別データを返す場合は product_id で振り分け）
    filteredProducts.forEach((p, pIdx) => {
      const ratio = p.revenue / (products.reduce((s, pp) => s + pp.revenue, 0) || 1);
      rawData.forEach(row => {
        const d = (row as any)[key] as string;
        if (!dateMap[d]) dateMap[d] = { [key]: d };
        dateMap[d][`revenue_${p.product_id}`] = Math.floor((row.revenue as number) * ratio);
        dateMap[d][`sales_${p.product_id}`] = Math.floor((row.sales as number) * ratio);
        dateMap[d][`commission_${p.product_id}`] = Math.floor((row.commission as number) * ratio);
      });
    });
    return Object.values(dateMap);
  })();

  const handlePeriodChange = (p: Period) => {    setPeriod(p);
    if (p !== 'custom') loadAll(p);
    if (['this_week', 'last_week', '7d', '14d'].includes(p)) setChartView('daily');
    if (['month', 'last_month', 'this_year'].includes(p)) setChartView('weekly');
    if (p === 'all') setChartView('monthly');
  };

  const handleSaveLineData = async (data: any) => {
    await fetch(`${apiBase}/analytics/line-data`, { method: 'POST', headers: authHeader, body: JSON.stringify(data) });
    setShowLineModal(false);
    loadAll(period, customStart, customEnd);
  };

  // デモデータ
  function genDemoKpi(): KPI {
    return { total_revenue: 2980000, prev_revenue: 2100000, total_sales: 87, prev_sales: 62, refunds: 3, cancels: 2, clicks: 4200, prev_clicks: 3100, conversions: 87, prev_conversions: 62, conversion_rate: 0.0207, prev_conversion_rate: 0.02, total_commission: 893400, prev_total_commission: 630000, unconfirmed_commission: 297000, confirmed_commission: 356400, paid_commission: 240000, stripe_fee: 107280, affiliate_commission: 893400, refund_reserve: 149000, net_remaining: 1830320, stripe_fee_pct: 0.036 };
  }
  function genDemoDaily(start: string, end: string): DailyData[] {
    const result: DailyData[] = [];
    let d = new Date(start);
    const e = new Date(end);
    while (d <= e) {
      const rev = Math.floor(Math.random() * 150000 + 30000);
      result.push({ date: format(d, 'MM/dd'), revenue: rev, sales: Math.floor(rev / 29800), commission: Math.floor(rev * 0.3), net_remaining: Math.floor(rev * 0.6) });
      d = new Date(d.getTime() + 86400000);
    }
    return result;
  }
  function genDemoWeekly(): WeeklyData[] {
    return Array.from({ length: 8 }, (_, i) => ({ week: `W${48 - i}`, revenue: Math.floor(Math.random() * 800000 + 200000), sales: Math.floor(Math.random() * 20 + 5), commission: Math.floor(Math.random() * 240000 + 60000) })).reverse();
  }
  function genDemoMonthly(): MonthlyData[] {
    return Array.from({ length: 6 }, (_, i) => { const m = new Date(); m.setMonth(m.getMonth() - (5 - i)); return { month: format(m, 'yyyy-MM'), revenue: Math.floor(Math.random() * 3000000 + 500000), sales: Math.floor(Math.random() * 80 + 20), commission: Math.floor(Math.random() * 900000 + 150000) }; });
  }
  function genDemoLP(): LpAnalysis[] {
    return [
      { lp_id: 'start', lp_name: 'スタート講座LP', lp_url: '/start-course', clicks: 2800, unique_clicks: 2380, button_clicks: 890, purchases: 58, revenue: 1728400, conversion_rate: 0.0207, click_through_rate: 0.318, bounce_rate: 0.65, avg_time_on_page: 248, affiliate_clicks: 1960, direct_clicks: 840, scores: { access_power: 78.5, cta_attraction: 63.2, conversion_power: 41.4, product_clarity: 49.7, improvement_priority: 71.3 } },
      { lp_id: 'aff', lp_name: 'アフィリエイト講座LP', lp_url: '/affiliate-course', clicks: 1400, unique_clicks: 1190, button_clicks: 320, purchases: 29, revenue: 1251800, conversion_rate: 0.0207, click_through_rate: 0.229, bounce_rate: 0.71, avg_time_on_page: 195, affiliate_clicks: 980, direct_clicks: 420, scores: { access_power: 61.2, cta_attraction: 45.8, conversion_power: 41.4, product_clarity: 38.9, improvement_priority: 82.1 } },
    ];
  }
  function genDemoProducts(): ProductAnalysis[] {
    return [
      { product_id: 'p1', product_name: 'AI副業1時間化スタート講座', lp_url: '/start-course', price: 29800, total_sales: 58, valid_sales: 58, refunds: 2, cancels: 1, revenue: 1728400, net_remaining: 1038000, affiliate_revenue: 1210000, direct_revenue: 518400, commission_amount: 518520, conversion_rate: 0.0207, clicks: 2800, affiliates: 12, active_affiliates: 8, scores: { sale_power: 72.4, conversion: 41.4, affiliate_friendliness: 85.0, refund_risk: 3.4, growth_potential: 65.8 } },
      { product_id: 'p2', product_name: 'AIアフィリエイト実践講座', lp_url: '/affiliate-course', price: 43100, total_sales: 29, valid_sales: 29, refunds: 1, cancels: 1, revenue: 1249900, net_remaining: 749940, affiliate_revenue: 874930, direct_revenue: 374970, commission_amount: 249980, conversion_rate: 0.0207, clicks: 1400, affiliates: 8, active_affiliates: 5, scores: { sale_power: 58.7, conversion: 41.4, affiliate_friendliness: 72.0, refund_risk: 3.4, growth_potential: 54.2 } },
    ];
  }
  function genDemoAffiliates(): AffiliateAnalysis[] {
    return [
      { affiliate_id: 'a1', affiliate_name: '山田太郎', affiliate_code: 'yamada_001', clicks: 820, conversions: 24, conversion_rate: 0.029, revenue: 715200, commission: 214560, refunds: 1, cancels: 0, diagnosis_type: 'balanced_excellent', score: 88.4, fraud_flag: false },
      { affiliate_id: 'a2', affiliate_name: '鈴木花子', affiliate_code: 'suzuki_002', clicks: 340, conversions: 8, conversion_rate: 0.024, revenue: 238400, commission: 71520, refunds: 0, cancels: 1, diagnosis_type: 'growing', score: 62.1, fraud_flag: false },
      { affiliate_id: 'a3', affiliate_name: '田中一郎', affiliate_code: 'tanaka_003', clicks: 560, conversions: 3, conversion_rate: 0.005, revenue: 89400, commission: 17880, refunds: 0, cancels: 0, diagnosis_type: 'low_conversion', score: 38.5, fraud_flag: true },
    ];
  }

  const TABS: { key: AdminTab; label: string; icon: string }[] = [
    { key: 'overview', label: 'KPI概要', icon: '📊' },
    { key: 'graph', label: 'グラフ', icon: '📈' },
    { key: 'lp', label: 'LP分析', icon: '🖥️' },
    { key: 'funnels', label: '導線分析', icon: '🔄' },
    { key: 'products', label: '商品別', icon: '📦' },
    { key: 'affiliates', label: '紹介者別', icon: '👥' },
  ];

  const chartData = chartView === 'daily' ? dailyData : chartView === 'weekly' ? weeklyData : monthlyData;
  const chartKey = chartView === 'daily' ? 'date' : chartView === 'weekly' ? 'week' : 'month';

  if (loading && !kpi) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {showLineModal && <LineDataModal onSave={handleSaveLineData} onClose={() => setShowLineModal(false)} />}

      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-sm font-bold">A</div>
            <div>
              <p className="text-sm font-bold text-gray-900">管理者ダッシュボード</p>
              <p className="text-xs text-gray-400">期間: {PERIOD_LABELS[period]}</p>
            </div>
          </div>
          <button onClick={() => setShowLineModal(true)} className="text-xs bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100">
            📱 LINE数値入力
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* 期間フィルター */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">期間フィルター</p>
          <PeriodSelector value={period} onChange={handlePeriodChange} />
          {period === 'custom' && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
              <span className="text-gray-400 text-sm">〜</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
              <button onClick={() => { if (customStart && customEnd) loadAll('custom', customStart, customEnd); }} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium">適用</button>
            </div>
          )}
        </div>

        {/* ★ 商品フィルター */}
        {products.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3">
            <ProductFilter
              products={products.map(p => ({ product_id: p.product_id, product_name: p.product_name }))}
              selected={selectedProducts}
              onChange={setSelectedProducts}
            />
          </div>
        )}

        {/* タブ */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg transition-all ${activeTab === t.key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-8 text-gray-400 text-sm">読み込み中...</div>}

        {/* ==============================
            KPI概要タブ
            ============================== */}
        {!loading && activeTab === 'overview' && filteredKpi && (
          <div className="space-y-4">
            {/* フィルター中バナー */}
            {!isAllSelected && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-sm text-blue-700">
                <span>📦</span>
                <span className="font-semibold">表示中:</span>
                <span>{filteredProducts.map(p => p.product_name).join('・')}</span>
              </div>
            )}

            {/* 売上系 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="総売上" value={fmtMoney(filteredKpi.total_revenue)} color="blue" curr={filteredKpi.total_revenue} prev={filteredKpi.prev_revenue} />
              <KpiCard label="販売数" value={`${filteredKpi.total_sales}件`} color="green" curr={filteredKpi.total_sales} prev={filteredKpi.prev_sales} />
              <KpiCard label="クリック数" value={filteredKpi.clicks.toLocaleString()} color="purple" curr={filteredKpi.clicks} prev={filteredKpi.prev_clicks} />
              <KpiCard label="成約率" value={fmtPct(filteredKpi.conversion_rate)} color="teal" curr={filteredKpi.conversion_rate} prev={filteredKpi.prev_conversion_rate} isRate />
            </div>

            {/* 手元残り見込み（強調） */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-5">
              <p className="text-emerald-200 text-xs mb-1">手元残り見込み（売上 − Stripe手数料 − 報酬予定 − 返金予備）</p>
              <p className="text-4xl font-extrabold">{fmtMoney(filteredKpi.net_remaining)}</p>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="bg-white/10 rounded-xl p-2 text-center">
                  <p className="text-xs text-emerald-200">Stripe手数料</p>
                  <p className="font-bold">{fmtMoney(filteredKpi.stripe_fee)}</p>
                  <p className="text-xs text-emerald-300">{(filteredKpi.stripe_fee_pct * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-white/10 rounded-xl p-2 text-center">
                  <p className="text-xs text-emerald-200">報酬予定</p>
                  <p className="font-bold">{fmtMoney(filteredKpi.affiliate_commission)}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-2 text-center">
                  <p className="text-xs text-emerald-200">返金予備(5%)</p>
                  <p className="font-bold">{fmtMoney(filteredKpi.refund_reserve)}</p>
                </div>
              </div>
            </div>

            {/* 報酬系 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="発生報酬" value={fmtMoney(filteredKpi.total_commission)} color="orange" curr={filteredKpi.total_commission} prev={filteredKpi.prev_total_commission} />
              <KpiCard label="未確定報酬" value={fmtMoney(filteredKpi.unconfirmed_commission)} color="orange" sub="保留中" />
              <KpiCard label="確定報酬" value={fmtMoney(filteredKpi.confirmed_commission)} color="blue" />
              <KpiCard label="支払済み" value={fmtMoney(filteredKpi.paid_commission)} color="gray" />
            </div>

            {/* 返金・キャンセル */}
            <div className="grid grid-cols-3 gap-3">
              <KpiCard label="返金数" value={`${filteredKpi.refunds}件`} color="red" />
              <KpiCard label="キャンセル数" value={`${filteredKpi.cancels}件`} color="red" />
              <KpiCard label="Stripe手数料" value={fmtMoney(filteredKpi.stripe_fee)} color="gray" sub={fmtPct(filteredKpi.stripe_fee_pct)} />
            </div>

            {/* 商品別内訳（複数選択時） */}
            {!isAllSelected && filteredProducts.length > 1 && (
              <SectionCard title="選択商品の内訳比較" icon="📦">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-xs text-gray-600">
                        <th className="px-3 py-2 text-left">商品名</th>
                        <th className="px-3 py-2 text-right">売上</th>
                        <th className="px-3 py-2 text-right">販売数</th>
                        <th className="px-3 py-2 text-right">成約率</th>
                        <th className="px-3 py-2 text-right">報酬予定</th>
                        <th className="px-3 py-2 text-right">手元残り</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredProducts.map((p, idx) => (
                        <tr key={p.product_id}>
                          <td className="px-3 py-2 font-medium">
                            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                            {p.product_name}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-blue-700">{fmtMoney(p.revenue)}</td>
                          <td className="px-3 py-2 text-right">{p.valid_sales}件</td>
                          <td className="px-3 py-2 text-right">{fmtPct(p.conversion_rate)}</td>
                          <td className="px-3 py-2 text-right text-orange-700">{fmtMoney(p.commission_amount)}</td>
                          <td className="px-3 py-2 text-right text-teal-700">{fmtMoney(p.net_remaining)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}

            {/* 改善提案 */}
            {suggestions.length > 0 && (
              <SectionCard title="改善提案エンジン" icon="💡">
                <div className="space-y-3">
                  {suggestions.slice(0, 5).map((s, i) => (
                    <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-amber-600 mt-0.5 flex-shrink-0">⚠️</span>
                        <div>
                          {(s.lp || s.product || s.affiliate) && <p className="text-xs font-bold text-amber-700 mb-1">{s.lp || s.product || s.affiliate}</p>}
                          <p className="text-amber-800 leading-relaxed">{s.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {suggestions.length > 5 && <p className="text-xs text-gray-400 text-center">他 {suggestions.length - 5} 件の提案あり</p>}
                </div>
              </SectionCard>
            )}
          </div>
        )}


        {/* ==============================
            グラフタブ
            ============================== */}
        {!loading && activeTab === 'graph' && (
          <div className="space-y-5">
            <div className="flex gap-2 flex-wrap items-center">
              {(['daily', 'weekly', 'monthly'] as ChartView[]).map(v => (
                <button key={v} onClick={() => setChartView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${chartView === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {v === 'daily' ? '日別' : v === 'weekly' ? '週別' : '月別'}
                </button>
              ))}
              {!isAllSelected && (
                <span className="text-xs text-blue-600 font-medium">
                  📦 {filteredProducts.map(p => p.product_name).join('・')}
                </span>
              )}
            </div>

            {/* 売上グラフ（商品別重ね / 全体） */}
            <SectionCard title={`${chartView === 'daily' ? '日別' : chartView === 'weekly' ? '週別' : '月別'}売上${isAllSelected ? '・手元残り' : '（商品別）'}`} icon="📈">
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={mergedChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey={chartView === 'daily' ? 'date' : chartView === 'weekly' ? 'week' : 'month'} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `¥${(v / 10000).toFixed(0)}万`} />
                  <Tooltip formatter={(v: any) => fmtMoney(v)} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  {isAllSelected ? (
                    <>
                      <Area type="monotone" dataKey="revenue" fill="#dbeafe" stroke="#3b82f6" name="売上" />
                      {chartView === 'daily' && <Line type="monotone" dataKey="net_remaining" stroke="#10b981" name="手元残り" dot={false} />}
                    </>
                  ) : (
                    filteredProducts.map((p, idx) => (
                      <Bar key={p.product_id} dataKey={`revenue_${p.product_id}`}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                        name={p.product_name.length > 10 ? p.product_name.slice(0, 10) + '…' : p.product_name}
                        stackId="rev"
                      />
                    ))
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* 販売数グラフ */}
            <SectionCard title={`${chartView === 'daily' ? '日別' : chartView === 'weekly' ? '週別' : '月別'}販売数${isAllSelected ? '' : '（商品別）'}`} icon="📦">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={mergedChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey={chartView === 'daily' ? 'date' : chartView === 'weekly' ? 'week' : 'month'} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  {isAllSelected ? (
                    <Bar dataKey="sales" fill="#10b981" name="販売数" />
                  ) : (
                    filteredProducts.map((p, idx) => (
                      <Bar key={p.product_id} dataKey={`sales_${p.product_id}`}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                        name={p.product_name.length > 10 ? p.product_name.slice(0, 10) + '…' : p.product_name}
                        stackId="sales"
                      />
                    ))
                  )}
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* 報酬グラフ */}
            <SectionCard title={`${chartView === 'daily' ? '日別' : chartView === 'weekly' ? '週別' : '月別'}報酬額${isAllSelected ? '' : '（商品別）'}`} icon="💰">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={mergedChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey={chartView === 'daily' ? 'date' : chartView === 'weekly' ? 'week' : 'month'} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `¥${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => fmtMoney(v)} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  {isAllSelected ? (
                    <Bar dataKey="commission" fill="#f59e0b" name="報酬額" />
                  ) : (
                    filteredProducts.map((p, idx) => (
                      <Bar key={p.product_id} dataKey={`commission_${p.product_id}`}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                        name={p.product_name.length > 10 ? p.product_name.slice(0, 10) + '…' : p.product_name}
                        stackId="comm"
                      />
                    ))
                  )}
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* 商品別売上比較（パイ + バー） */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SectionCard title="商品別売上（パイ）" icon="🥧">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={filteredProducts} dataKey="revenue" nameKey="product_name" cx="50%" cy="50%" outerRadius={80}>
                      {filteredProducts.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmtMoney(v)} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </SectionCard>

              <SectionCard title="商品別売上（バー）" icon="📊">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={filteredProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `¥${(v / 10000).toFixed(0)}万`} />
                    <YAxis type="category" dataKey="product_name" tick={{ fontSize: 10 }} width={130} />
                    <Tooltip formatter={(v: any) => fmtMoney(v)} />
                    <Bar dataKey="revenue" name="売上">
                      {filteredProducts.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>
            </div>

            {/* LP別成約率 */}
            <SectionCard title="LP別成約率" icon="🖥️">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={lpAnalysis} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v * 100).toFixed(1)}%`} />
                  <YAxis type="category" dataKey="lp_name" tick={{ fontSize: 10 }} width={140} />
                  <Tooltip formatter={(v: any) => `${(Number(v) * 100).toFixed(2)}%`} />
                  <Bar dataKey="conversion_rate" fill="#8b5cf6" name="成約率" />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* 紹介者別成果比較 */}
            <SectionCard title="紹介者別成果比較（売上）" icon="👥">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={filteredAffiliates.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `¥${(v / 10000).toFixed(0)}万`} />
                  <YAxis type="category" dataKey="affiliate_name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip formatter={(v: any) => fmtMoney(v)} />
                  <Bar dataKey="revenue" fill="#10b981" name="売上" />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* 前期比サマリー */}
            {filteredKpi && (
              <SectionCard title="前期比較サマリー" icon="📊">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: '売上', curr: filteredKpi.total_revenue, prev: filteredKpi.prev_revenue, fmt: fmtMoney },
                    { label: '販売数', curr: filteredKpi.total_sales, prev: filteredKpi.prev_sales, fmt: (v: number) => `${v}件` },
                    { label: 'クリック数', curr: filteredKpi.clicks, prev: filteredKpi.prev_clicks, fmt: (v: number) => v.toLocaleString() },
                    { label: '成約率', curr: filteredKpi.conversion_rate, prev: filteredKpi.prev_conversion_rate, fmt: fmtPct, isRate: true },
                    { label: '発生報酬', curr: filteredKpi.total_commission, prev: filteredKpi.prev_total_commission, fmt: fmtMoney },
                    { label: '手元残り', curr: filteredKpi.net_remaining, prev: filteredKpi.net_remaining, fmt: fmtMoney },
                  ].map(({ label, curr, prev, fmt, isRate }) => {
                    const d = diffBadge(curr, prev, isRate);
                    return (
                      <div key={label} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="font-bold text-sm text-gray-900">{fmt(curr)}</p>
                        {d && <p className={`text-xs font-bold ${d.positive ? 'text-green-600' : 'text-red-500'}`}>{d.positive ? '▲' : '▼'} {d.text}</p>}
                        <p className="text-xs text-gray-400">前期: {fmt(prev)}</p>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}
          </div>
        )}


        {/* ==============================
            LP分析タブ
            ============================== */}
        {!loading && activeTab === 'lp' && (
          <div className="space-y-4">
            {lpAnalysis.map(lp => (
              <div key={lp.lp_id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900">{lp.lp_name}</h3>
                    <a href={lp.lp_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">{lp.lp_url}</a>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                  <StatCell label="アクセス数" value={lp.clicks.toLocaleString()} color="blue" />
                  <StatCell label="ユニーク" value={lp.unique_clicks.toLocaleString()} color="blue" />
                  <StatCell label="ボタンクリック" value={lp.button_clicks.toLocaleString()} color="purple" />
                  <StatCell label="購入数" value={`${lp.purchases}件`} color="green" />
                  <StatCell label="成約率" value={fmtPct(lp.conversion_rate)} color="teal" />
                  <StatCell label="CTA率" value={fmtPct(lp.click_through_rate)} color="purple" />
                  <StatCell label="離脱率" value={fmtPct(lp.bounce_rate)} color="red" />
                  <StatCell label="平均滞在" value={fmtTime(lp.avg_time_on_page)} color="gray" />
                </div>

                {/* LPスコア */}
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-2">LPスコア（0.00〜100.00）</p>
                  <div className="flex flex-wrap gap-2">
                    <ScoreBadge value={lp.scores.access_power} label="アクセス力" />
                    <ScoreBadge value={lp.scores.cta_attraction} label="クリック誘導力" />
                    <ScoreBadge value={lp.scores.conversion_power} label="購入転換力" />
                    <ScoreBadge value={lp.scores.product_clarity} label="商品理解力" />
                    <ScoreBadge value={lp.scores.improvement_priority} label="改善優先度" />
                  </div>
                </div>

                {/* 流入内訳 */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-blue-50 rounded-lg p-2">
                    <span className="text-gray-500">紹介者経由: </span>
                    <span className="font-bold text-blue-700">{lp.affiliate_clicks.toLocaleString()}</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-gray-500">直接アクセス: </span>
                    <span className="font-bold text-gray-700">{lp.direct_clicks.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* ボタン分析 */}
            {buttonAnalysis.length > 0 && (
              <SectionCard title="ボタン（CTA）分析" icon="🔘">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-xs text-gray-600">
                        <th className="px-3 py-2 text-left">ページ</th>
                        <th className="px-3 py-2 text-left">ボタン名</th>
                        <th className="px-3 py-2 text-right">クリック数</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {buttonAnalysis.map((b, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-gray-500 text-xs">{b.page_url}</td>
                          <td className="px-3 py-2 font-medium">{b.button_name}</td>
                          <td className="px-3 py-2 text-right font-bold text-blue-700">{b.clicks.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}

            {/* 改善提案 */}
            {suggestions.filter(s => s.lp).length > 0 && (
              <SectionCard title="LP改善提案" icon="💡">
                <div className="space-y-2">
                  {suggestions.filter(s => s.lp).map((s, i) => (
                    <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
                      <p className="text-xs font-bold text-amber-700 mb-1">{s.lp}</p>
                      <p className="text-amber-800 leading-relaxed">{s.message}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>
        )}

        {/* ==============================
            導線分析タブ
            ============================== */}
        {!loading && activeTab === 'funnels' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800">
              <p className="font-bold mb-1">📱 LINE数値について</p>
              <p className="text-xs">LINE登録数・キーワード送信数は現在手動入力です。右上の「LINE数値入力」ボタンから入力してください。将来的にGASからの自動同期に対応予定です。</p>
            </div>

            {funnels.length === 0 ? (
              // デモ表示
              <div className="space-y-4">
                {[
                  { name: '「1時間」導線', color: 'blue', steps: [
                    { step: 1, name: 'SNS流入', count: null },
                    { step: 2, name: 'LINE登録', count: null, manual: true },
                    { step: 3, name: 'キーワード「1時間」送信', count: null, manual: true },
                    { step: 4, name: '無料講座LP アクセス', count: 2800 },
                    { step: 5, name: 'スタート講座 購入', count: 58 },
                  ]},
                  { name: '「本気」導線', color: 'green', steps: [
                    { step: 1, name: 'SNS流入', count: null },
                    { step: 2, name: 'LINE登録', count: null, manual: true },
                    { step: 3, name: 'キーワード「本気」送信', count: null, manual: true },
                    { step: 4, name: '無料教材LP アクセス', count: 1400 },
                    { step: 5, name: 'AIアフィリエイト講座 購入', count: 29 },
                    { step: 6, name: 'スタート講座 購入', count: 15 },
                    { step: 7, name: 'アフィリエイター登録', count: 8 },
                  ]},
                ].map(funnel => (
                  <div key={funnel.name} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-4">{funnel.name}</h3>
                    <div className="space-y-2">
                      {funnel.steps.map((step, idx) => {
                        const prevCount = idx > 0 ? funnel.steps[idx - 1].count : null;
                        const rate = (prevCount && step.count) ? (step.count / prevCount * 100).toFixed(1) : null;
                        return (
                          <div key={step.step}>
                            <FunnelStepNode
                              step={step.step} name={step.name}
                              isManual={(step as any).manual}
                              count={step.count} prevCount={prevCount}
                              colorKey={funnel.color}
                            />
                            {idx < funnel.steps.length - 1 && <div className="text-gray-300 text-lg ml-3 pl-3">↓</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              funnels.map(funnel => (
                <div key={funnel.name} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-bold text-gray-900">{funnel.name}</h3>
                    {funnel.last_updated && <p className="text-xs text-gray-400">最終更新: {funnel.last_updated.split('T')[0]}</p>}
                  </div>
                  <div className="space-y-2">
                    {funnel.steps.map((step, idx) => {
                      const prevCount = idx > 0 ? funnel.steps[idx - 1].count : null;
                      const rate = (prevCount && step.count) ? (step.count / prevCount * 100).toFixed(1) : null;
                      return (
                        <div key={step.step} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{step.step}</div>
                          <div className="flex-1 bg-gray-50 rounded-xl p-2.5 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{step.name}</p>
                              {step.is_manual && <p className="text-xs text-orange-500">手動入力</p>}
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${step.count !== null ? 'text-blue-700' : 'text-gray-400'}`}>
                                {step.count !== null ? step.count.toLocaleString() : '—'}
                              </p>
                              {rate && <p className="text-xs text-gray-400">前比 {rate}%</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">{funnel.note}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* ==============================
            商品別分析タブ
            ============================== */}
        {!loading && activeTab === 'products' && (
          <div className="space-y-4">
            {/* フィルター中バナー */}
            {!isAllSelected && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-sm text-blue-700">
                <span>📦</span>
                <span className="font-semibold">表示中:</span>
                <span>{filteredProducts.map(p => p.product_name).join('・')}</span>
              </div>
            )}
            {filteredProducts.map(p => (
              <div key={p.product_id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900">{p.product_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500">{fmtMoney(p.price)}</span>
                      <a href={p.lp_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">{p.lp_url}</a>
                    </div>
                  </div>
                </div>

                {/* 主要指標 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  <StatCell label="売上" value={fmtMoney(p.revenue)} color="blue" size="sm" />
                  <StatCell label="手元残り見込み" value={fmtMoney(p.net_remaining)} color="teal" size="sm" />
                  <StatCell label="有効販売数" value={`${p.valid_sales}件`} color="green" size="sm" />
                  <StatCell label="成約率" value={fmtPct(p.conversion_rate)} color="purple" size="sm" />
                  <StatCell label="アフィリ経由売上" value={fmtMoney(p.affiliate_revenue)} color="orange" size="sm" />
                  <StatCell label="直接売上" value={fmtMoney(p.direct_revenue)} color="gray" size="sm" />
                  <StatCell label="報酬予定" value={fmtMoney(p.commission_amount)} color="orange" size="sm" />
                  <StatCell label="返金数" value={`${p.refunds}件`} color="red" size="sm" />
                </div>

                {/* 紹介者数 */}
                <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-500">紹介者数: </span><span className="font-bold">{p.affiliates}人</span></div>
                  <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-500">稼働中: </span><span className="font-bold text-green-700">{p.active_affiliates}人</span></div>
                  <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-500">クリック: </span><span className="font-bold text-blue-700">{p.clicks.toLocaleString()}</span></div>
                </div>

                {/* 商品スコア */}
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-2">商品スコア（0.00〜100.00）</p>
                  <div className="flex flex-wrap gap-2">
                    <ScoreBadge value={p.scores.sale_power} label="売上力" />
                    <ScoreBadge value={p.scores.conversion} label="成約力" />
                    <ScoreBadge value={p.scores.affiliate_friendliness} label="紹介しやすさ" />
                    <ScoreBadge value={p.scores.refund_risk} label="返金リスク" />
                    <ScoreBadge value={p.scores.growth_potential} label="伸びしろ" />
                  </div>
                </div>
              </div>
            ))}

            {/* 改善提案 */}
            {suggestions.filter(s => s.product).length > 0 && (
              <SectionCard title="商品改善提案" icon="💡">
                <div className="space-y-2">
                  {suggestions.filter(s => s.product).map((s, i) => (
                    <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
                      <p className="text-xs font-bold text-amber-700 mb-1">{s.product}</p>
                      <p className="text-amber-800 leading-relaxed">{s.message}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>
        )}

        {/* ==============================
            紹介者別分析タブ
            ============================== */}
        {!loading && activeTab === 'affiliates' && (
          <div className="space-y-4">
            {affiliates.map(a => (
              <div key={a.affiliate_id} className={`bg-white rounded-2xl border p-5 shadow-sm ${a.fraud_flag ? 'border-red-300' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{a.affiliate_name}</h3>
                      {a.fraud_flag && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">⚠️ 不正疑い</span>}
                    </div>
                    <p className="text-xs text-gray-400">{a.affiliate_code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">スコア</p>
                    <p className="text-2xl font-extrabold text-blue-700">{fmtScore(a.score)}</p>
                  </div>
                </div>

                {/* 診断タイプ */}
                <div className="mb-3">
                  <span className="inline-block text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-medium">
                    {DIAGNOSIS_LABELS[a.diagnosis_type] || a.diagnosis_type}
                  </span>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  <StatCell label="クリック" value={a.clicks.toLocaleString()} color="blue" size="sm" />
                  <StatCell label="成約数" value={`${a.conversions}件`} color="green" size="sm" />
                  <StatCell label="成約率" value={fmtPct(a.conversion_rate)} color="purple" size="sm" />
                  <StatCell label="売上" value={fmtMoney(a.revenue)} color="orange" size="sm" />
                  <StatCell label="報酬" value={fmtMoney(a.commission)} color="green" size="sm" />
                  <StatCell label="返金" value={`${a.refunds}件`} color="red" size="sm" />
                  <StatCell label="キャンセル" value={`${a.cancels}件`} color="red" size="sm" />
                </div>
              </div>
            ))}

            {/* 改善提案 */}
            {suggestions.filter(s => s.affiliate).length > 0 && (
              <SectionCard title="紹介者改善提案" icon="💡">
                <div className="space-y-2">
                  {suggestions.filter(s => s.affiliate).map((s, i) => (
                    <div key={i} className={`border rounded-xl p-3 text-sm ${s.type === 'fraud' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                      <p className={`text-xs font-bold mb-1 ${s.type === 'fraud' ? 'text-red-700' : 'text-amber-700'}`}>{s.affiliate}</p>
                      <p className={s.type === 'fraud' ? 'text-red-800' : 'text-amber-800'}>{s.message}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
