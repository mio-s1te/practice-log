// src/pages/admin/AdminDashboard.tsx
import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface DashboardStats {
  totalRevenue: number;
  totalSales: number;
  monthlyRevenue: number;
  monthlySales: number;
  totalClicks: number;
  totalLineRegistrations: number;
  totalSeminarViews: number;
  totalPurchases: number;
  pendingCommissions: number;
  paidCommissions: number;
  activeCampaigns: number;
  pausedCampaigns: number;
  suspiciousCount: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function StatCard({ label, value, sub, color = 'blue' }: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  const colorClass = {
    blue: 'from-blue-50 to-blue-100 border-blue-200',
    green: 'from-green-50 to-green-100 border-green-200',
    yellow: 'from-yellow-50 to-yellow-100 border-yellow-200',
    red: 'from-red-50 to-red-100 border-red-200',
    purple: 'from-purple-50 to-purple-100 border-purple-200',
  }[color] || 'from-blue-50 to-blue-100 border-blue-200';

  return (
    <div className={`bg-gradient-to-br ${colorClass} border rounded-2xl p-4`}>
      <p className="text-sm text-gray-600 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    generateDemoData();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin-api/dashboard');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        // デモデータ
        setStats({
          totalRevenue: 2980000,
          totalSales: 100,
          monthlyRevenue: 596000,
          monthlySales: 20,
          totalClicks: 3450,
          totalLineRegistrations: 856,
          totalSeminarViews: 412,
          totalPurchases: 100,
          pendingCommissions: 280000,
          paidCommissions: 450000,
          activeCampaigns: 2,
          pausedCampaigns: 0,
          suspiciousCount: 3,
        });
      }
    } catch {
      setStats({
        totalRevenue: 2980000,
        totalSales: 100,
        monthlyRevenue: 596000,
        monthlySales: 20,
        totalClicks: 3450,
        totalLineRegistrations: 856,
        totalSeminarViews: 412,
        totalPurchases: 100,
        pendingCommissions: 280000,
        paidCommissions: 450000,
        activeCampaigns: 2,
        pausedCampaigns: 0,
        suspiciousCount: 3,
      });
    } finally {
      setLoading(false);
    }
  };

  const generateDemoData = () => {
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      data.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        clicks: Math.floor(Math.random() * 150 + 50),
        lineRegs: Math.floor(Math.random() * 40 + 10),
        seminarViews: Math.floor(Math.random() * 20 + 5),
        sales: Math.floor(Math.random() * 5),
        revenue: Math.floor(Math.random() * 150000 + 30000),
      });
    }
    setDailyData(data);
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (!stats) return null;

  const conversionRate = stats.totalClicks > 0
    ? ((stats.totalPurchases / stats.totalClicks) * 100).toFixed(2)
    : '0.00';

  // 売上予測
  const last7Sales = dailyData.slice(-7).reduce((s, d) => s + d.sales, 0) / 7;
  const salesLimit = 1000;
  const currentSales = stats.totalSales;
  const remainingSales = salesLimit - currentSales;
  const daysToLimit = last7Sales > 0 ? Math.ceil(remainingSales / last7Sales) : null;

  const productSalesData = [
    { name: 'AI副業スタート講座', value: 85 },
    { name: 'ミニ講座', value: 12 },
    { name: 'その他', value: 3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">📊 ダッシュボード</h1>
        <span className="text-sm text-gray-500">{new Date().toLocaleDateString('ja-JP')}</span>
      </div>

      {/* 売上予測バナー */}
      {daysToLimit && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-blue-800 font-medium">
            📈 直近7日平均販売数は1日{last7Sales.toFixed(1)}部です。
            1,000部到達予測はあと<strong>{daysToLimit}日</strong>です。
            （現在{currentSales}部 / 上限{salesLimit}部）
          </p>
        </div>
      )}

      {/* KPIカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="総売上"
          value={`¥${stats.totalRevenue.toLocaleString()}`}
          sub={`今月: ¥${stats.monthlyRevenue.toLocaleString()}`}
          color="blue"
        />
        <StatCard
          label="総販売数"
          value={`${stats.totalSales}部`}
          sub={`今月: ${stats.monthlySales}部`}
          color="green"
        />
        <StatCard
          label="総クリック数"
          value={stats.totalClicks.toLocaleString()}
          color="purple"
        />
        <StatCard
          label="全体成約率"
          value={`${conversionRate}%`}
          sub={`${stats.totalPurchases}件 / ${stats.totalClicks}クリック`}
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="LINE登録者数"
          value={stats.totalLineRegistrations.toLocaleString()}
          color="green"
        />
        <StatCard
          label="セミナー視聴数"
          value={stats.totalSeminarViews.toLocaleString()}
          color="blue"
        />
        <StatCard
          label="未払い報酬"
          value={`¥${stats.pendingCommissions.toLocaleString()}`}
          color="yellow"
        />
        <StatCard
          label="支払済み報酬"
          value={`¥${stats.paidCommissions.toLocaleString()}`}
          color="green"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="稼働中案件"
          value={`${stats.activeCampaigns}件`}
          color="green"
        />
        <StatCard
          label="停止中案件"
          value={`${stats.pausedCampaigns}件`}
          color="yellow"
        />
        <StatCard
          label="不正疑い件数"
          value={`${stats.suspiciousCount}件`}
          color={stats.suspiciousCount > 0 ? 'red' : 'green'}
        />
        <StatCard
          label="1,000部達成率"
          value={`${((currentSales / salesLimit) * 100).toFixed(1)}%`}
          sub={`残り${Math.max(0, remainingSales)}部`}
          color="blue"
        />
      </div>

      {/* グラフ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 日別売上グラフ */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">日別売上</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `¥${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [`¥${Number(v).toLocaleString()}`, '売上']} />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 日別クリック・LINE登録 */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">クリック数・LINE登録数</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailyData.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="clicks" stroke="#3b82f6" name="クリック" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="lineRegs" stroke="#10b981" name="LINE登録" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="seminarViews" stroke="#f59e0b" name="セミナー視聴" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 商品別売上 */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">商品別販売数</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={productSalesData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {productSalesData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 日別販売数 */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">日別販売数</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} name="販売数" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
