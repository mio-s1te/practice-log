// src/pages/affiliate/AffiliateDashboardNew.tsx
// アフィリエイター分析ダッシュボード（全面改訂版）
// - 期間フィルター（今日/昨日/今週/先週/直近7日/直近14日/直近30日/今月/先月/今年/全期間/カスタム）
// - KPI: クリック/成約/成約率/売上/報酬/キャンセル/返金 + 前期比
// - グラフ: 日別/週別/月別 クリック・成約・報酬 / 商品別 / 比較
// - レーダーチャート: 5項目スコア + 診断タイプ + 改善提案
// - ランキング: 自分の順位・差分のみ表示
// - 商品詳細: 紹介素材・報酬条件

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend, ComposedChart, Area,
} from 'recharts';
import { format, subDays, startOfMonth, startOfWeek, endOfWeek, startOfYear,
  subWeeks, subMonths, startOfQuarter } from 'date-fns';

// ============================================================
// 定数・型定義
// ============================================================
const SITE_URL = typeof window !== 'undefined' ? window.location.origin : '';

type Period = 'today' | 'yesterday' | 'this_week' | 'last_week' | '7d' | '14d' | '30d' | 'month' | 'last_month' | 'this_year' | 'all' | 'custom';

const PERIOD_LABELS: Record<Period, string> = {
  today: '今日', yesterday: '昨日', this_week: '今週', last_week: '先週',
  '7d': '直近7日', '14d': '直近14日', '30d': '直近30日',
  month: '今月', last_month: '先月', this_year: '今年', all: '全期間', custom: 'カスタム',
};

const PERIOD_GROUPS = [
  { label: 'クイック', periods: ['today', 'yesterday', '7d', '30d', 'month', 'all'] as Period[] },
  { label: '週・月', periods: ['this_week', 'last_week', '14d', 'last_month', 'this_year'] as Period[] },
];

interface AffiliateInfo {
  id: string; name: string; email: string;
  affiliate_code: string; status: string;
  start_course_purchased: boolean;
}

interface KPI {
  clicks: number; conversions: number; conversion_rate: number;
  revenue: number; commission: number; unconfirmed_commission: number;
  confirmed_commission: number; paid_commission: number;
  cancels: number; refunds: number;
  prev_clicks?: number; prev_conversions?: number; prev_commission?: number;
}

interface DailyData {
  date: string; clicks: number; conversions: number; commission: number; revenue?: number;
}

interface WeeklyData {
  week: string; clicks: number; conversions: number; commission: number; revenue?: number;
}

interface MonthlyData {
  month: string; clicks: number; conversions: number; commission: number; revenue?: number;
}

interface ProductStats {
  product_id: string; product_name: string; lp_url: string;
  affiliate_lp_url?: string;
  clicks: number; conversions: number; conversion_rate: number;
  revenue: number; commission: number;
  can_refer: boolean;
  commission_type?: string; commission_percent?: number; commission_fixed?: number;
  commission_trigger?: string; commission_confirm_timing?: string;
  commission_on_refund?: string; commission_on_cancel?: string;
  refund_period_days?: number;
  short_description?: string; long_description?: string;
  sns_post_example?: string; line_intro_text?: string;
  pr_notation_example?: string; prohibited_expressions?: string;
  faq?: string; selling_points?: string; discouraged_expressions?: string;
}

interface RadarScore {
  acquisition: number;   // 集客力
  conversion: number;    // 成約力
  retention: number;     // 継続力
  product_knowledge: number; // 商品理解力
  improvement: number;   // 改善力
  diagnosis_type: string;
  diagnosis_comment: string;
  recommended_action: string;
}

interface RankingInfo {
  my_rank: number; total: number;
  diff_above: number | null; diff_below: number | null;
  diff_from_top: number;
}

// ============================================================
// 診断タイプ定義
// ============================================================
const DIAGNOSIS_TYPES: Record<string, { label: string; color: string; emoji: string; comment: string; action: string }> = {
  click_shortage: {
    label: 'クリック不足タイプ', color: 'bg-orange-100 text-orange-800', emoji: '📢',
    comment: 'まだ多くの人にリーチできていません。発信量・媒体数を増やすことが最優先です。',
    action: '今週はSNS投稿を毎日1本チャレンジ。紹介URLを署名やプロフィールに固定設置してください。',
  },
  low_conversion: {
    label: '成約改善タイプ', color: 'bg-yellow-100 text-yellow-800', emoji: '🎯',
    comment: 'クリックはあるのに成約率が低め。紹介文の訴求力を高めるタイミングです。',
    action: '管理者が用意したSNS投稿例・LINE文を使って、対象者を絞った紹介文に変えてみてください。',
  },
  weak_main_product: {
    label: '本命商品弱めタイプ', color: 'bg-blue-100 text-blue-800', emoji: '📦',
    comment: 'クリック数・成約数はあるが、主力商品への集中度が低い。商品理解を深めることで伸びる余地があります。',
    action: '商品詳細ページで「紹介してほしいポイント」を再確認し、その商品に特化した投稿を増やしてみてください。',
  },
  stable: {
    label: '安定運用タイプ', color: 'bg-green-100 text-green-800', emoji: '✅',
    comment: '安定した成果を出しています。継続力が高い状態です。',
    action: '今の運用を維持しつつ、新しい媒体（YouTube・ブログ等）への拡張を検討してください。',
  },
  growing: {
    label: '伸び始めタイプ', color: 'bg-indigo-100 text-indigo-800', emoji: '🚀',
    comment: '直近の数値が上昇トレンドです。この勢いを維持するのが重要です。',
    action: 'うまくいっている投稿パターンを分析して、同じ型で量を増やしてください。',
  },
  balanced_excellent: {
    label: 'バランス優秀タイプ', color: 'bg-purple-100 text-purple-800', emoji: '🌟',
    comment: '5項目がバランスよく高い優秀な紹介者です。上位安定の実力があります。',
    action: 'さらなる上位を目指すなら、LINE個別フォローや独自コンテンツ制作で差別化してください。',
  },
  normal: {
    label: '通常タイプ', color: 'bg-gray-100 text-gray-700', emoji: '📊',
    comment: '活動を継続中です。数値の積み上げを続けていきましょう。',
    action: '今月の目標クリック数・成約数を設定し、週次で進捗を確認する習慣をつけてください。',
  },
};

// ============================================================
// ユーティリティ
// ============================================================
function getPeriodRange(period: Period, customStart?: string, customEnd?: string): { start: string; end: string } {
  const today = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  switch (period) {
    case 'today': return { start: fmt(today), end: fmt(today) };
    case 'yesterday': { const y = subDays(today, 1); return { start: fmt(y), end: fmt(y) }; }
    case 'this_week': return { start: fmt(startOfWeek(today, { weekStartsOn: 1 })), end: fmt(today) };
    case 'last_week': {
      const lw = subWeeks(today, 1);
      return { start: fmt(startOfWeek(lw, { weekStartsOn: 1 })), end: fmt(endOfWeek(lw, { weekStartsOn: 1 })) };
    }
    case '7d': return { start: fmt(subDays(today, 6)), end: fmt(today) };
    case '14d': return { start: fmt(subDays(today, 13)), end: fmt(today) };
    case '30d': return { start: fmt(subDays(today, 29)), end: fmt(today) };
    case 'month': return { start: fmt(startOfMonth(today)), end: fmt(today) };
    case 'last_month': {
      const lm = subMonths(today, 1);
      return { start: fmt(startOfMonth(lm)), end: fmt(new Date(lm.getFullYear(), lm.getMonth() + 1, 0)) };
    }
    case 'this_year': return { start: fmt(startOfYear(today)), end: fmt(today) };
    case 'all': return { start: '2020-01-01', end: fmt(today) };
    case 'custom': if (customStart && customEnd) return { start: customStart, end: customEnd };
  }
  return { start: fmt(subDays(today, 29)), end: fmt(today) };
}

function diffLabel(curr: number, prev: number | undefined, isRate = false): { text: string; positive: boolean } | null {
  if (prev === undefined || prev === 0) return null;
  const diff = curr - prev;
  const pct = ((diff / prev) * 100).toFixed(2);
  if (isRate) return { text: `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}pt`, positive: diff >= 0 };
  return { text: `${diff >= 0 ? '+' : ''}${pct}%`, positive: diff >= 0 };
}

// 期間・チャートビューに応じた前期比ラベルを返す
function getPrevPeriodLabel(period: Period, chartView: 'daily' | 'weekly' | 'monthly'): string {
  if (chartView === 'daily') {
    if (period === 'today') return '前日比';
    if (period === 'yesterday') return '前日比';
    return '前期比（日別）';
  }
  if (chartView === 'weekly') {
    if (period === 'this_week') return '前週比';
    if (period === 'last_week') return '前々週比';
    return '前期比（週別）';
  }
  if (chartView === 'monthly') {
    if (period === 'month') return '前月比';
    if (period === 'last_month') return '前々月比';
    return '前期比（月別）';
  }
  return '前期比';
}

function fmtMoney(n: number) { return `¥${Math.floor(n).toLocaleString()}`; }
function fmtPct(n: number) { return `${n.toFixed(2)}%`; }
function fmtScore(n: number) { return n.toFixed(2); }

// ============================================================
// 小コンポーネント
// ============================================================
function PeriodSelector({ value, onChange }: { value: Period; onChange: (v: Period) => void }) {
  return (
    <div className="space-y-2">
      {PERIOD_GROUPS.map(group => (
        <div key={group.label}>
          <p className="text-xs text-gray-400 mb-1">{group.label}</p>
          <div className="flex gap-1 flex-wrap">
            {group.periods.map(p => (
              <button
                key={p}
                onClick={() => onChange(p)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  value === p ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >{PERIOD_LABELS[p]}</button>
            ))}
          </div>
        </div>
      ))}
      <div>
        <p className="text-xs text-gray-400 mb-1">カスタム</p>
        <button
          onClick={() => onChange('custom')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            value === 'custom' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >📅 期間指定</button>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, diff, color = 'blue' }: {
  label: string; value: string; sub?: string;
  diff?: { text: string; positive: boolean } | null;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'gray';
}) {
  const bg = { blue: 'border-blue-100 bg-blue-50', green: 'border-green-100 bg-green-50',
    orange: 'border-orange-100 bg-orange-50', purple: 'border-purple-100 bg-purple-50',
    red: 'border-red-100 bg-red-50', gray: 'border-gray-200 bg-gray-50' }[color];
  const txt = { blue: 'text-blue-700', green: 'text-green-700', orange: 'text-orange-700',
    purple: 'text-purple-700', red: 'text-red-600', gray: 'text-gray-700' }[color];
  return (
    <div className={`rounded-2xl border p-4 ${bg}`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-extrabold ${txt}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {diff && (
        <p className={`text-xs font-bold mt-1 ${diff.positive ? 'text-green-600' : 'text-red-500'}`}>
          {diff.positive ? '▲' : '▼'} {diff.text}
        </p>
      )}
    </div>
  );
}

function CopyButton({ text, label = 'コピー' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${copied ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
    >{copied ? '✓ コピー済み' : `📋 ${label}`}</button>
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

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ============================================================
// メインコンポーネント
// ============================================================
export function AffiliateDashboardNew() {
  const navigate = useNavigate();
  const [affiliate, setAffiliate] = useState<AffiliateInfo | null>(null);
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [kpiPrev, setKpiPrev] = useState<KPI | null>(null);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [productStats, setProductStats] = useState<ProductStats[]>([]);
  const [radarScore, setRadarScore] = useState<RadarScore | null>(null);
  const [ranking, setRanking] = useState<RankingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'graph' | 'products' | 'ranking' | 'radar'>('overview');
  const [chartView, setChartView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedProduct, setSelectedProduct] = useState<ProductStats | null>(null);
  const [productDetailTab, setProductDetailTab] = useState<'info' | 'materials' | 'faq'>('info');

  function getToken() { return localStorage.getItem('affiliate_session_token') || ''; }

  const loadData = useCallback(async (p: Period, cs?: string, ce?: string) => {
    const token = getToken();
    if (!token) { navigate('/affiliate/login'); return; }
    const { start, end } = getPeriodRange(p, cs, ce);
    setLoading(true);
    try {
      const params = new URLSearchParams({ period: p, start, end });
      if (p === 'custom' && cs) params.set('start', cs);
      if (p === 'custom' && ce) params.set('end', ce);
      const res = await fetch(
        `/.netlify/functions/affiliate-api/dashboard/analytics?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status === 401) { navigate('/affiliate/login'); return; }
      if (res.ok) {
        const d = await res.json();
        setAffiliate(d.affiliate);
        setKpi(d.kpi);
        setKpiPrev(d.kpi_prev);
        setDailyData(d.daily_data || generateDemoDaily(start, end));
        setWeeklyData(d.weekly_data || []);
        setMonthlyData(d.monthly_data || []);
        setProductStats((d.product_stats || []).filter((ps: ProductStats) => ps.can_refer));
        setRadarScore(d.radar_score || generateDemoRadar());
        setRanking(d.ranking || null);
      }
    } catch {
      // デモデータフォールバック
      setAffiliate({ id: 'demo', name: 'デモユーザー', email: 'demo@example.com', affiliate_code: 'DEMO001', status: 'active', start_course_purchased: true });
      setKpi(generateDemoKpi());
      setDailyData(generateDemoDaily(start, end));
      setWeeklyData(generateDemoWeekly());
      setMonthlyData(generateDemoMonthly());
      setProductStats(generateDemoProducts());
      setRadarScore(generateDemoRadar());
      setRanking({ my_rank: 5, total: 23, diff_above: 1200, diff_below: 800, diff_from_top: 45000 });
    } finally { setLoading(false); }
  }, [navigate]);

  useEffect(() => { loadData(period, customStart, customEnd); }, [period, loadData]);

  // デモデータ生成
  function generateDemoKpi(): KPI {
    return { clicks: 342, conversions: 12, conversion_rate: 3.51, revenue: 357600,
      commission: 107280, unconfirmed_commission: 59640, confirmed_commission: 47640,
      paid_commission: 89400, cancels: 1, refunds: 0 };
  }
  function generateDemoDaily(start: string, end: string): DailyData[] {
    const result: DailyData[] = [];
    let d = new Date(start);
    const e = new Date(end);
    while (d <= e) {
      const conv = Math.random() < 0.3 ? Math.floor(Math.random() * 2 + 1) : 0;
      result.push({
        date: format(d, 'MM/dd'),
        clicks: Math.floor(Math.random() * 20 + 5),
        conversions: conv,
        revenue: conv * Math.floor(Math.random() * 20000 + 29800),
        commission: conv > 0 ? Math.floor(Math.random() * 10000 + 5000) : 0,
      });
      d = new Date(d.getTime() + 86400000);
    }
    return result;
  }
  function generateDemoWeekly(): WeeklyData[] {
    return Array.from({ length: 8 }, (_, i) => {
      const conv = Math.floor(Math.random() * 5 + 1);
      return { week: `W${48 - i}`, clicks: Math.floor(Math.random() * 100 + 30), conversions: conv, commission: conv * 8900, revenue: conv * 29800 };
    }).reverse();
  }
  function generateDemoMonthly(): MonthlyData[] {
    return Array.from({ length: 6 }, (_, i) => {
      const month = new Date(); month.setMonth(month.getMonth() - (5 - i));
      const conv = Math.floor(Math.random() * 15 + 3);
      return { month: format(month, 'yyyy-MM'), clicks: Math.floor(Math.random() * 400 + 100), conversions: conv, commission: conv * 9500, revenue: conv * 29800 };
    });
  }
  function generateDemoProducts(): ProductStats[] {
    return [
      { product_id: 'p1', product_name: 'AI副業1時間化スタート講座', lp_url: '/start-course',
        clicks: 220, conversions: 8, conversion_rate: 3.64, revenue: 238400, commission: 71520,
        can_refer: true, commission_type: 'percent', commission_percent: 30,
        commission_trigger: 'purchase', commission_confirm_timing: '30d_after_purchase',
        commission_on_refund: 'cancel', commission_on_cancel: 'cancel', refund_period_days: 14,
        short_description: '副業迷子から抜け出す設計講座', sns_post_example: '【副業迷子の方へ】\n副業を頑張っているのに売上が出ない原因、実は"設計不足"かもしれません。\nAIを使って自分専用の収益化ロードマップを作る「AI副業1時間化スタート講座」を紹介します。\n#副業 #AI副業 #PR',
        pr_notation_example: '※この投稿は広告です（#PR）', prohibited_expressions: '・誇大表現（絶対稼げる等）\n・実績のでっち上げ', faq: 'Q. 初心者でも大丈夫ですか？\nA. はい。副業初心者向けの講座です。', selling_points: '段階価格で今が一番安い点・AIを使った設計手法が軸' },
      { product_id: 'p2', product_name: 'AIアフィリエイト実践講座', lp_url: '/affiliate-course',
        clicks: 122, conversions: 4, conversion_rate: 3.28, revenue: 119200, commission: 23840,
        can_refer: true, commission_type: 'percent', commission_percent: 20,
        commission_trigger: 'purchase', commission_confirm_timing: '30d_after_purchase',
        commission_on_refund: 'cancel', commission_on_cancel: 'cancel', refund_period_days: 14 },
    ];
  }
  function generateDemoRadar(): RadarScore {
    return { acquisition: 68.50, conversion: 72.30, retention: 85.10, product_knowledge: 63.80, improvement: 55.20,
      diagnosis_type: 'growing', diagnosis_comment: '直近の数値が上昇トレンドです。この勢いを維持するのが重要です。',
      recommended_action: 'うまくいっている投稿パターンを分析して、同じ型で量を増やしてください。' };
  }

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    if (p !== 'custom') loadData(p);
    // 週別・月別ビューの自動切替
    if (['this_week', 'last_week', '7d', '14d'].includes(p)) setChartView('daily');
    if (['month', 'last_month', 'this_year'].includes(p)) setChartView('weekly');
    if (['all'].includes(p)) setChartView('monthly');
  };
  const handleCustomApply = () => {
    if (customStart && customEnd) loadData('custom', customStart, customEnd);
  };

  const referrableProducts = productStats.filter(p => p.can_refer);
  const diagnosisInfo = radarScore ? (DIAGNOSIS_TYPES[radarScore.diagnosis_type] || DIAGNOSIS_TYPES.normal) : null;

  // ラダーデータ整形
  const radarData = radarScore ? [
    { subject: '集客力', value: radarScore.acquisition, fullMark: 100 },
    { subject: '成約力', value: radarScore.conversion, fullMark: 100 },
    { subject: '継続力', value: radarScore.retention, fullMark: 100 },
    { subject: '商品理解力', value: radarScore.product_knowledge, fullMark: 100 },
    { subject: '改善力', value: radarScore.improvement, fullMark: 100 },
  ] : [];

  const TABS = [
    { key: 'overview', label: 'KPI概要', icon: '📊' },
    { key: 'graph', label: 'グラフ分析', icon: '📈' },
    { key: 'products', label: '商品別', icon: '📦' },
    { key: 'radar', label: '診断', icon: '🎯' },
    { key: 'ranking', label: 'ランキング', icon: '🏆' },
  ] as const;

  if (loading && !affiliate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // 商品詳細モーダル
  // ============================================================
  if (selectedProduct) {
    const refUrl = `${SITE_URL}${selectedProduct.affiliate_lp_url || selectedProduct.lp_url}?ref=${affiliate?.affiliate_code}`;
    const commDisplay = selectedProduct.commission_type === 'percent'
      ? `${selectedProduct.commission_percent}%（¥${Math.floor((selectedProduct.revenue / Math.max(selectedProduct.conversions, 1)) * (selectedProduct.commission_percent || 0) / 100).toLocaleString()}相当）`
      : `¥${(selectedProduct.commission_fixed || 0).toLocaleString()}`;
    const confirmMap: Record<string, string> = {
      immediate: '即時', '14d_after_purchase': '購入から14日後',
      '30d_after_purchase': '購入から30日後', '60d_after_purchase': '購入から60日後', manual: '手動確定',
    };
    const refundMap: Record<string, string> = { cancel: '報酬取り消し', keep: '報酬維持', partial: '一部取り消し' };
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button onClick={() => setSelectedProduct(null)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
              ← 戻る
            </button>
            <span className="font-bold text-gray-900 truncate">{selectedProduct.product_name}</span>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {/* 商品概要 */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white rounded-2xl p-5">
            <h1 className="text-lg font-bold mb-2">{selectedProduct.product_name}</h1>
            {selectedProduct.short_description && <p className="text-blue-200 text-sm mb-3">{selectedProduct.short_description}</p>}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-300">報酬額</p>
                <p className="text-2xl font-extrabold text-yellow-300">{commDisplay}</p>
              </div>
              <div className="text-right text-sm">
                <p className="text-blue-300 text-xs">成約率</p>
                <p className="font-bold">{fmtPct(selectedProduct.conversion_rate)}</p>
              </div>
            </div>
          </div>

          {/* タブ */}
          <div className="flex gap-2">
            {(['info', 'materials', 'faq'] as const).map(t => (
              <button key={t} onClick={() => setProductDetailTab(t)}
                className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${productDetailTab === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {t === 'info' ? '📌 紹介情報' : t === 'materials' ? '📝 素材' : '❓ FAQ'}
              </button>
            ))}
          </div>

          {/* 紹介情報タブ */}
          {productDetailTab === 'info' && (
            <div className="space-y-4">
              {selectedProduct.long_description && (
                <SectionCard title="商品説明" icon="📦">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedProduct.long_description}</p>
                </SectionCard>
              )}
              <SectionCard title="あなた専用の紹介URL" icon="🔗">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 mb-3">
                  <code className="text-xs text-blue-700 font-mono break-all">{refUrl}</code>
                </div>
                <CopyButton text={refUrl} label="URLをコピー" />
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                  <p className="font-bold mb-1">PR表記</p>
                  <p className="leading-relaxed">{selectedProduct.pr_notation_example || '「#PR」「#広告」等の表記が必要です。すべての媒体で表記してください。'}</p>
                </div>
              </SectionCard>
              <SectionCard title="報酬条件" icon="💰">
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between"><dt className="text-gray-500">報酬額</dt><dd className="font-bold text-green-700">{commDisplay}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">発生条件</dt><dd className="font-medium">{selectedProduct.commission_trigger === 'purchase' ? '購入完了時' : selectedProduct.commission_trigger === 'confirmed' ? '確定後' : 'クリック時'}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">確定タイミング</dt><dd className="font-medium">{confirmMap[selectedProduct.commission_confirm_timing || ''] || selectedProduct.commission_confirm_timing}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">返金時</dt><dd className={`font-medium ${selectedProduct.commission_on_refund === 'cancel' ? 'text-red-600' : 'text-green-600'}`}>{refundMap[selectedProduct.commission_on_refund || 'cancel']}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">キャンセル時</dt><dd className={`font-medium ${selectedProduct.commission_on_cancel === 'cancel' ? 'text-red-600' : 'text-green-600'}`}>{refundMap[selectedProduct.commission_on_cancel || 'cancel']}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">返金可能期間</dt><dd className="font-medium">{selectedProduct.refund_period_days || 14}日以内</dd></div>
                </dl>
              </SectionCard>
              {selectedProduct.selling_points && (
                <SectionCard title="紹介してほしいポイント" icon="💡">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedProduct.selling_points}</p>
                </SectionCard>
              )}
              {selectedProduct.discouraged_expressions && (
                <SectionCard title="紹介してほしくない表現" icon="⚠️">
                  <p className="text-sm text-yellow-700 whitespace-pre-wrap leading-relaxed bg-yellow-50 rounded-xl p-3">{selectedProduct.discouraged_expressions}</p>
                </SectionCard>
              )}
              {selectedProduct.prohibited_expressions && (
                <SectionCard title="禁止表現" icon="🚫">
                  <p className="text-sm text-red-700 whitespace-pre-wrap leading-relaxed bg-red-50 rounded-xl p-3">{selectedProduct.prohibited_expressions}</p>
                </SectionCard>
              )}
            </div>
          )}

          {/* 素材タブ */}
          {productDetailTab === 'materials' && (
            <div className="space-y-4">
              {selectedProduct.sns_post_example && (
                <SectionCard title="SNS投稿例" icon="📣">
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 mb-2">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedProduct.sns_post_example}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <CopyButton text={selectedProduct.sns_post_example} label="投稿例をコピー" />
                    <CopyButton text={selectedProduct.sns_post_example.replace(/\[紹介URL\]/g, refUrl)} label="URL挿入済みでコピー" />
                  </div>
                </SectionCard>
              )}
              {selectedProduct.line_intro_text && (
                <SectionCard title="LINE紹介文" icon="💬">
                  <div className="bg-green-50 rounded-xl p-3 border border-green-200 mb-2">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedProduct.line_intro_text}</p>
                  </div>
                  <CopyButton text={selectedProduct.line_intro_text} label="LINE文をコピー" />
                </SectionCard>
              )}
              {!selectedProduct.sns_post_example && !selectedProduct.line_intro_text && (
                <div className="text-center py-12 text-gray-400"><p className="text-4xl mb-3">📝</p><p className="text-sm">紹介素材はまだ準備されていません</p></div>
              )}
            </div>
          )}

          {/* FAQタブ */}
          {productDetailTab === 'faq' && (
            <div className="space-y-4">
              {selectedProduct.faq ? (
                <SectionCard title="よくある質問" icon="❓">
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedProduct.faq}</div>
                </SectionCard>
              ) : (
                <div className="text-center py-12 text-gray-400"><p className="text-4xl mb-3">❓</p><p className="text-sm">FAQはまだ準備されていません</p></div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ============================================================
  // メインダッシュボード
  // ============================================================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0">🐱</div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-none">紹介者ダッシュボード</p>
              <p className="text-xs text-gray-400 truncate">{affiliate?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* LINE友だち追加ボタン */}
            <a
              href="https://lin.ee/nxWg5F3"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 bg-[#06C755] hover:bg-[#05a847] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.064-.021.134-.031.196-.031.211 0 .391.09.51.25l2.444 3.317V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
              </svg>
              LINE
            </a>
            <button onClick={() => { localStorage.removeItem('affiliate_session_token'); navigate('/affiliate/login'); }}
              className="text-xs text-gray-400 hover:text-gray-700">ログアウト</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* 期間フィルター */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">期間フィルター</p>
          <PeriodSelector value={period} onChange={handlePeriodChange} />
          {period === 'custom' && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-gray-400 text-sm">〜</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={handleCustomApply}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700">適用</button>
            </div>
          )}
        </div>

        {/* 紹介URL（自分専用） */}
        {affiliate && referrableProducts.length > 0 && (
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-5 text-white">
            <p className="text-orange-100 text-xs font-semibold mb-3">🔗 あなたの専用紹介URL</p>
            <div className="space-y-2">
              {referrableProducts.map(p => {
                const url = `${SITE_URL}${p.affiliate_lp_url || p.lp_url}?ref=${affiliate.affiliate_code}`;
                return (
                  <div key={p.product_id} className="bg-white/15 rounded-xl p-3">
                    <p className="text-xs text-orange-100 mb-1.5 font-medium">{p.product_name}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono flex-1 min-w-0 truncate bg-white/20 px-2 py-1 rounded-lg">{url}</code>
                      <CopyButton text={url} label="コピー" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* タブ */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg transition-all ${activeTab === tab.key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <span>{tab.icon}</span><span>{tab.label}</span>
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-8 text-gray-400 text-sm">読み込み中...</div>}

        {/* ==============================
            KPI概要タブ
            ============================== */}
        {!loading && activeTab === 'overview' && kpi && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="クリック数" value={kpi.clicks.toLocaleString()} diff={diffLabel(kpi.clicks, kpiPrev?.clicks)} color="blue" />
              <KpiCard label="成約数" value={kpi.conversions.toLocaleString()} diff={diffLabel(kpi.conversions, kpiPrev?.conversions)} color="green" />
              <KpiCard label="成約率" value={fmtPct(kpi.conversion_rate)} diff={diffLabel(kpi.conversion_rate, kpiPrev?.conversion_rate, true)} color="purple" />
              <KpiCard label="売上金額" value={fmtMoney(kpi.revenue)} diff={diffLabel(kpi.revenue, kpiPrev?.revenue)} color="orange" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="発生報酬" value={fmtMoney(kpi.commission)} diff={diffLabel(kpi.commission, kpiPrev?.commission)} color="green" />
              <KpiCard label="未確定報酬" value={fmtMoney(kpi.unconfirmed_commission)} color="orange" sub="保留中" />
              <KpiCard label="確定報酬" value={fmtMoney(kpi.confirmed_commission)} color="blue" />
              <KpiCard label="支払済み報酬" value={fmtMoney(kpi.paid_commission)} color="gray" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="キャンセル数" value={kpi.cancels.toLocaleString()} color="red" />
              <KpiCard label="返金数" value={kpi.refunds.toLocaleString()} color="red" />
            </div>

            {/* 診断バナー */}
            {diagnosisInfo && (
              <div className={`rounded-2xl p-4 border ${diagnosisInfo.color}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{diagnosisInfo.emoji}</span>
                  <span className="font-bold text-sm">{diagnosisInfo.label}</span>
                </div>
                <p className="text-xs leading-relaxed mb-2">{diagnosisInfo.comment}</p>
                <div className="bg-white/60 rounded-xl p-3">
                  <p className="text-xs font-bold mb-1">🔥 今週のおすすめアクション</p>
                  <p className="text-xs leading-relaxed">{diagnosisInfo.action}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==============================
            グラフ分析タブ
            ============================== */}
        {!loading && activeTab === 'graph' && (
          <div className="space-y-5">
            {/* 集計単位切り替え */}
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map(v => (
                <button key={v} onClick={() => setChartView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    chartView === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {v === 'daily' ? '日別' : v === 'weekly' ? '週別' : '月別'}
                </button>
              ))}
            </div>

            {/* クリック数 vs 成約数 */}
            <SectionCard title={`${chartView === 'daily' ? '日別' : chartView === 'weekly' ? '週別' : '月別'}クリック数 vs 成約数`} icon="📈">
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={chartView === 'daily' ? dailyData : chartView === 'weekly' ? weeklyData : monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey={chartView === 'daily' ? 'date' : chartView === 'weekly' ? 'week' : 'month'} tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Area yAxisId="left" type="monotone" dataKey="clicks" fill="#dbeafe" stroke="#3b82f6" name="クリック数" />
                  <Bar yAxisId="right" dataKey="conversions" fill="#10b981" name="成約数" />
                </ComposedChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* 報酬額 */}
            <SectionCard title={`${chartView === 'daily' ? '日別' : chartView === 'weekly' ? '週別' : '月別'}報酬額`} icon="💰">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartView === 'daily' ? dailyData : chartView === 'weekly' ? weeklyData : monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey={chartView === 'daily' ? 'date' : chartView === 'weekly' ? 'week' : 'month'} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `¥${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => fmtMoney(v)} />
                  <Bar dataKey="commission" fill="#f59e0b" name="報酬額" />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* 前期比サマリー */}
            {kpi && kpiPrev && (
              <SectionCard title={`前期比較（${getPrevPeriodLabel(period, chartView)}）`} icon="📊">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'クリック数', curr: kpi.clicks, prev: kpiPrev.clicks },
                    { label: '成約数', curr: kpi.conversions, prev: kpiPrev.conversions },
                    { label: '報酬額', curr: kpi.commission, prev: kpiPrev.commission, money: true },
                    { label: '売上', curr: kpi.revenue, prev: kpiPrev.revenue, money: true },
                    { label: '成約率', curr: kpi.conversion_rate, prev: kpiPrev.conversion_rate, rate: true },
                    { label: 'キャンセル', curr: kpi.cancels, prev: kpiPrev.cancels },
                  ].map(({ label, curr, prev, money, rate }) => {
                    const d = diffLabel(curr, prev, rate);
                    return (
                      <div key={label} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="font-bold text-sm">{money ? fmtMoney(curr) : rate ? fmtPct(curr) : curr.toLocaleString()}</p>
                        {d && <p className={`text-xs font-bold ${d.positive ? 'text-green-600' : 'text-red-500'}`}>{d.positive ? '▲' : '▼'} {d.text}</p>}
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {/* 商品別成約数 */}
            <SectionCard title="商品別成約数" icon="📦">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={productStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="product_name" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="conversions" fill="#3b82f6" name="成約数" />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* 商品別報酬額 */}
            <SectionCard title="商品別報酬額" icon="💴">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={productStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `¥${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="product_name" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip formatter={(v: any) => fmtMoney(v)} />
                  <Bar dataKey="commission" fill="#10b981" name="報酬額" />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>
        )}

        {/* ==============================
            商品別タブ
            ============================== */}
        {!loading && activeTab === 'products' && (
          <div className="space-y-3">
            {referrableProducts.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
                <p className="text-4xl mb-3">🔒</p><p>紹介可能な商品がありません</p>
              </div>
            )}
            {referrableProducts.map(p => {
              const refUrl = `${SITE_URL}${p.affiliate_lp_url || p.lp_url}?ref=${affiliate?.affiliate_code}`;
              return (
                <div key={p.product_id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{p.product_name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        報酬: {p.commission_type === 'percent' ? `${p.commission_percent}%` : `¥${(p.commission_fixed || 0).toLocaleString()}`}
                      </p>
                    </div>
                    <button onClick={() => { setSelectedProduct(p); setProductDetailTab('info'); }}
                      className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                      詳細 →
                    </button>
                  </div>
                  {/* 個別KPI */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-blue-50 rounded-xl p-2.5 text-center">
                      <p className="text-xs text-gray-500">クリック</p>
                      <p className="text-lg font-bold text-blue-700">{p.clicks.toLocaleString()}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-2.5 text-center">
                      <p className="text-xs text-gray-500">成約</p>
                      <p className="text-lg font-bold text-green-700">{p.conversions}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-2.5 text-center">
                      <p className="text-xs text-gray-500">成約率</p>
                      <p className="text-lg font-bold text-purple-700">{fmtPct(p.conversion_rate)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-orange-50 rounded-xl p-2.5 text-center">
                      <p className="text-xs text-gray-500">売上金額</p>
                      <p className="font-bold text-orange-700">{fmtMoney(p.revenue)}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-2.5 text-center">
                      <p className="text-xs text-gray-500">発生報酬</p>
                      <p className="font-bold text-green-700">{fmtMoney(p.commission)}</p>
                    </div>
                  </div>
                  {/* 紹介URL */}
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">専用紹介URL</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono text-blue-700 flex-1 min-w-0 truncate">{refUrl}</code>
                      <CopyButton text={refUrl} label="コピー" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ==============================
            診断タブ（レーダーチャート）
            ============================== */}
        {!loading && activeTab === 'radar' && radarScore && (
          <div className="space-y-4">
            {/* レーダーチャート */}
            <SectionCard title="パフォーマンス診断（5項目）" icon="🎯">
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar name="スコア" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                  <Tooltip formatter={(v: any) => fmtScore(Number(v))} />
                </RadarChart>
              </ResponsiveContainer>
              {/* スコア一覧 */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                {[
                  { label: '集客力', value: radarScore.acquisition, desc: 'クリック数・リーチ力' },
                  { label: '成約力', value: radarScore.conversion, desc: '成約率・クロージング' },
                  { label: '継続力', value: radarScore.retention, desc: '活動継続・定期投稿' },
                  { label: '商品理解力', value: radarScore.product_knowledge, desc: '主力商品への集中度' },
                  { label: '改善力', value: radarScore.improvement, desc: '前期比改善トレンド' },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-xs font-bold text-gray-700">{item.label}</p>
                      <p className="text-sm font-extrabold text-blue-700">{fmtScore(item.value)}</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${item.value}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* 診断タイプ */}
            {diagnosisInfo && (
              <div className={`rounded-2xl p-5 border ${diagnosisInfo.color}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{diagnosisInfo.emoji}</span>
                  <div>
                    <p className="text-xs opacity-70">あなたの診断タイプ</p>
                    <p className="font-extrabold text-lg">{diagnosisInfo.label}</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mb-3">{diagnosisInfo.comment}</p>
                <div className="bg-white/60 rounded-xl p-4">
                  <p className="text-sm font-bold mb-2">🔥 今週のおすすめアクション</p>
                  <p className="text-sm leading-relaxed">{diagnosisInfo.action}</p>
                </div>
              </div>
            )}

            {/* 全診断タイプ一覧 */}
            <SectionCard title="診断タイプ一覧" icon="📋">
              <div className="space-y-2">
                {Object.entries(DIAGNOSIS_TYPES).map(([key, t]) => (
                  <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${radarScore?.diagnosis_type === key ? t.color + ' ring-2 ring-current/30' : 'bg-gray-50 text-gray-500'}`}>
                    <span>{t.emoji}</span>
                    <span className="text-sm font-medium">{t.label}</span>
                    {radarScore?.diagnosis_type === key && <span className="ml-auto text-xs font-bold">← 現在</span>}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}

        {/* ==============================
            ランキングタブ
            ============================== */}
        {!loading && activeTab === 'ranking' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
              <p className="font-bold mb-1">🏆 ランキング（プライバシー保護）</p>
              <p className="text-xs">他の紹介者の名前・詳細は表示されません。自分の順位と差分のみ確認できます。</p>
            </div>

            {ranking ? (
              <div className="space-y-3">
                {/* 自分の順位 */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
                  <p className="text-gray-500 text-sm mb-2">今月の順位</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-6xl font-extrabold text-blue-700">{ranking.my_rank}</span>
                    <span className="text-2xl text-gray-400">位</span>
                    <span className="text-gray-400 text-sm ml-1">/ {ranking.total}人中</span>
                  </div>
                </div>

                {/* 差分 */}
                <div className="grid grid-cols-1 gap-3">
                  {ranking.diff_above !== null && (
                    <div className="bg-white rounded-2xl border border-green-200 p-4">
                      <p className="text-xs text-gray-500 mb-1">1つ上の順位との差</p>
                      <p className="text-xl font-bold text-green-600">
                        ▲ {fmtMoney(ranking.diff_above)} の差
                      </p>
                      <p className="text-xs text-gray-400 mt-1">この報酬額を上回ると順位が上がります</p>
                    </div>
                  )}
                  {ranking.diff_below !== null && (
                    <div className="bg-white rounded-2xl border border-orange-200 p-4">
                      <p className="text-xs text-gray-500 mb-1">1つ下の順位との差</p>
                      <p className="text-xl font-bold text-orange-600">
                        ▼ {fmtMoney(ranking.diff_below)} の差
                      </p>
                      <p className="text-xs text-gray-400 mt-1">リードしている差分です</p>
                    </div>
                  )}
                  <div className="bg-white rounded-2xl border border-blue-200 p-4">
                    <p className="text-xs text-gray-500 mb-1">1位との差</p>
                    <p className="text-xl font-bold text-blue-600">
                      {ranking.my_rank === 1 ? '🥇 あなたが1位です！' : `▲ ${fmtMoney(ranking.diff_from_top)} の差`}
                    </p>
                    {ranking.my_rank !== 1 && <p className="text-xs text-gray-400 mt-1">1位に必要な追加報酬</p>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
                <p className="text-4xl mb-3">🏆</p><p className="text-sm">ランキングデータがありません</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
