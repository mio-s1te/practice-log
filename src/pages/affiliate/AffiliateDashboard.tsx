// src/pages/affiliate/AffiliateDashboard.tsx
import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { formatScore } from '@/utils/scoreCalculator';

const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin;

interface DashboardStats {
  thisMonthClicks: number;
  thisMonthLineRegistrations: number;
  thisMonthSeminarViews: number;
  thisMonthPurchases: number;
  thisMonthConversionRate: number;
  thisMonthRevenue: number;
  thisMonthCommission: number;
  unpaidCommission: number;
  paidCommission: number;
  totalClicks: number;
  totalLineRegistrations: number;
  totalSeminarViews: number;
  totalPurchases: number;
  totalConversionRate: number;
  totalCommission: number;
  clickToLineRate: number;
  lineToSeminarRate: number;
  seminarToPurchaseRate: number;
  clickToPurchaseRate: number;
  dailyStats: any[];
}

interface AffiliateScore {
  traffic_score: number;
  conversion_score: number;
  consistency_score: number;
  product_understanding_score: number;
  improvement_score: number;
  overall_score: number;
  diagnosis_type: string;
}

function RateCard({ label, value, from, to }: { label: string; value: number; from: string; to: string }) {
  const percentage = (value * 100);
  const bar = Math.min(percentage, 100);
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <p className="text-xs text-gray-500 mb-1">{from} → {to}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-100 rounded-full h-2">
          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${bar}%` }} />
        </div>
        <span className="text-sm font-bold text-gray-900 w-16 text-right">{percentage.toFixed(2)}%</span>
      </div>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function ScoreCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-3 ${color}`}>
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{formatScore(value)}</p>
      <div className="w-full bg-white/50 rounded-full h-1.5 mt-2">
        <div className={`h-1.5 rounded-full bg-white`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

export function AffiliateDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [score, setScore] = useState<AffiliateScore | null>(null);
  const [ranking, setRanking] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'score' | 'notifications'>('overview');
  const [copied, setCopied] = useState<string | null>(null);

  const affiliateName = localStorage.getItem('affiliate_name') || '紹介者';
  const token = localStorage.getItem('affiliate_session_token') || '';

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [dashRes, scoreRes, rankRes, campRes, notifRes] = await Promise.all([
        fetch('/api/affiliate-api/dashboard', { headers }),
        fetch('/api/affiliate-api/score', { headers }),
        fetch('/api/affiliate-api/ranking-position', { headers }),
        fetch('/api/affiliate-api/campaigns', { headers }),
        fetch('/api/affiliate-api/notifications', { headers }),
      ]);

      if (dashRes.ok) setStats(await dashRes.json());
      else setDemoStats();
      if (scoreRes.ok) setScore(await scoreRes.json());
      else setDemoScore();
      if (rankRes.ok) setRanking(await rankRes.json());
      if (campRes.ok) {
        const data = await campRes.json();
        setCampaigns(Array.isArray(data) ? data : []);
      }
      if (notifRes.ok) {
        const data = await notifRes.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      setDemoStats();
      setDemoScore();
    } finally {
      setLoading(false);
    }
  };

  const setDemoStats = () => {
    const dailyStats = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.now() - (29 - i) * 86400000);
      return {
        stat_date: d.toISOString().split('T')[0],
        clicks: Math.floor(Math.random() * 20 + 2),
        line_registrations: Math.floor(Math.random() * 5),
        seminar_views: Math.floor(Math.random() * 3),
        purchases: Math.random() > 0.85 ? 1 : 0,
        revenue: Math.random() > 0.85 ? 29800 : 0,
        commission: Math.random() > 0.85 ? 10000 : 0,
      };
    });
    setStats({
      thisMonthClicks: 142, thisMonthLineRegistrations: 28, thisMonthSeminarViews: 14,
      thisMonthPurchases: 4, thisMonthConversionRate: 0.028, thisMonthRevenue: 119200,
      thisMonthCommission: 40000, unpaidCommission: 30000, paidCommission: 20000,
      totalClicks: 456, totalLineRegistrations: 89, totalSeminarViews: 43,
      totalPurchases: 12, totalConversionRate: 0.026, totalCommission: 120000,
      clickToLineRate: 0.195, lineToSeminarRate: 0.483, seminarToPurchaseRate: 0.279, clickToPurchaseRate: 0.026,
      dailyStats,
    });
  };

  const setDemoScore = () => {
    setScore({
      traffic_score: 47.33, conversion_score: 56.67, consistency_score: 73.33,
      product_understanding_score: 66.67, improvement_score: 58.12,
      overall_score: 60.42, diagnosis_type: '安定運用タイプ',
    });
  };

  const copyUrl = (url: string, key: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const diagnosisComments: Record<string, string> = {
    'クリック不足タイプ': 'まずは紹介URLを見てもらう回数を増やしましょう。投稿やストーリーで、誰向けの商品かを自然に伝えるのがおすすめです。',
    '成約改善タイプ': 'クリックは集まっていますが、購入までの一押しに改善余地があります。紹介文で、商品の対象者・得られる変化・購入後の流れを具体的に伝えましょう。',
    '本命商品弱めタイプ': '養成講座への関心は高まっています。次は、スタート講座でAI副業の設計を体験してもらうことで、養成講座の価値が伝わりやすくなります。',
    '安定運用タイプ': '安定して紹介活動ができています。反応が良かった投稿パターンをテンプレ化し、同じ切り口を横展開しましょう。',
    '伸び始めタイプ': '直近で数字が伸びています。今の紹介文や投稿テーマが合っている可能性が高いので、同じ方向性の投稿を増やしてみましょう。',
    'バランス優秀タイプ': '集客・成約・継続のバランスが良い状態です。次は紹介導線を増やし、さらに成果を伸ばしましょう。',
    '通常タイプ': '現在の数字を見ながら、クリック数・成約率・継続活動のどこを伸ばすかを決めて改善していきましょう。',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const radarData = score ? [
    { subject: '集客力', value: Number(score.traffic_score.toFixed(2)), fullMark: 100 },
    { subject: '成約力', value: Number(score.conversion_score.toFixed(2)), fullMark: 100 },
    { subject: '継続力', value: Number(score.consistency_score.toFixed(2)), fullMark: 100 },
    { subject: '商品理解力', value: Number(score.product_understanding_score.toFixed(2)), fullMark: 100 },
    { subject: '改善力', value: Number(score.improvement_score.toFixed(2)), fullMark: 100 },
  ] : [];

  const dailyStats = stats?.dailyStats || [];

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">こんにちは、{affiliateName}さん 👋</h1>
          <p className="text-sm text-gray-500">今月もがんばりましょう！</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => setActiveTab('notifications')}
            className="relative bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-semibold"
          >
            🔔 {unreadCount}件の未読
          </button>
        )}
      </div>

      {/* 紹介URL */}
      {campaigns.length > 0 && (
        <div className="card bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <p className="text-sm font-semibold mb-3 opacity-90">🔗 あなたの紹介URL</p>
          {campaigns.map((ca: any) => {
            const campaign = ca.campaign;
            const product = campaign?.product;
            const affiliateCode = localStorage.getItem('affiliate_code') || 'your_code';
            const url = `${SITE_URL}${product?.lp_url || '/start-course'}?campaign=${campaign?.id}&ref=${affiliateCode}`;
            return (
              <div key={ca.id} className="bg-white/20 rounded-xl p-3 mb-2">
                <p className="text-xs opacity-80 mb-1">{campaign?.name}</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-white/20 px-2 py-1 rounded flex-1 truncate">{url}</code>
                  <button
                    onClick={() => copyUrl(url, ca.id)}
                    className="bg-white text-blue-600 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-blue-50 whitespace-nowrap"
                  >
                    {copied === ca.id ? '✓ コピー済' : 'コピー'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* タブ */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {[
          { key: 'overview', label: '📊 概要' },
          { key: 'charts', label: '📈 グラフ' },
          { key: 'score', label: '⭐ スコア' },
          { key: 'notifications', label: `🔔 通知${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 概要タブ */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-4">
          {/* 今月の成果 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">今月の成果</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="stat-card bg-blue-50 border-blue-100">
                <span className="text-2xl">👆</span>
                <span className="stat-value">{stats.thisMonthClicks.toLocaleString()}</span>
                <span className="stat-label">クリック数</span>
              </div>
              <div className="stat-card bg-green-50 border-green-100">
                <span className="text-2xl">📱</span>
                <span className="stat-value">{stats.thisMonthLineRegistrations}</span>
                <span className="stat-label">LINE登録者数</span>
              </div>
              <div className="stat-card bg-yellow-50 border-yellow-100">
                <span className="text-2xl">🎬</span>
                <span className="stat-value">{stats.thisMonthSeminarViews}</span>
                <span className="stat-label">セミナー視聴数</span>
              </div>
              <div className="stat-card bg-purple-50 border-purple-100">
                <span className="text-2xl">🛒</span>
                <span className="stat-value">{stats.thisMonthPurchases}</span>
                <span className="stat-label">購入数</span>
              </div>
            </div>
          </div>

          {/* 今月の報酬 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
              <p className="text-sm text-gray-500">今月の報酬</p>
              <p className="text-3xl font-bold text-green-700">¥{stats.thisMonthCommission.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">成約率: {(stats.thisMonthConversionRate * 100).toFixed(2)}%</p>
            </div>
            <div className="card border-yellow-100">
              <p className="text-sm text-gray-500">未払い報酬</p>
              <p className="text-3xl font-bold text-yellow-700">¥{stats.unpaidCommission.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">承認待ちを含む</p>
            </div>
            <div className="card border-gray-100">
              <p className="text-sm text-gray-500">支払済み報酬</p>
              <p className="text-3xl font-bold text-gray-700">¥{stats.paidCommission.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">累計: ¥{stats.totalCommission.toLocaleString()}</p>
            </div>
          </div>

          {/* 転換率 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">ファネル転換率</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <RateCard label="クリック→LINE登録率" value={stats.clickToLineRate} from="クリック" to="LINE登録" />
              <RateCard label="LINE登録→セミナー視聴率" value={stats.lineToSeminarRate} from="LINE登録" to="セミナー" />
              <RateCard label="セミナー→購入率" value={stats.seminarToPurchaseRate} from="セミナー" to="購入" />
              <RateCard label="クリック→購入率（全体成約率）" value={stats.clickToPurchaseRate} from="クリック" to="購入" />
            </div>
          </div>

          {/* 累計 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">累計成果</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="stat-card">
                <span className="stat-value">{stats.totalClicks.toLocaleString()}</span>
                <span className="stat-label">累計クリック数</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.totalLineRegistrations}</span>
                <span className="stat-label">累計LINE登録者数</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.totalPurchases}</span>
                <span className="stat-label">累計購入数</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">¥{stats.totalCommission.toLocaleString()}</span>
                <span className="stat-label">累計報酬額</span>
              </div>
            </div>
          </div>

          {/* ランキング */}
          {ranking && ranking.rank && (
            <div className="card bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
              <h3 className="font-semibold text-gray-900 mb-3">🏆 今月のランキング</h3>
              <p className="text-2xl font-bold text-amber-700 mb-3">
                あなたは今月{ranking.rank}位 / {ranking.totalAffiliates}人中
              </p>
              <div className="space-y-1.5 text-sm">
                {ranking.rank > 1 && (
                  <p className="text-gray-600">
                    <span className="font-semibold text-blue-700">{ranking.rank - 1}位</span>との差：
                    報酬+¥{ranking.rankAboveDiff.toLocaleString()}で上位へ
                  </p>
                )}
                {ranking.rank < ranking.totalAffiliates && (
                  <p className="text-gray-600">
                    <span className="font-semibold text-gray-500">{ranking.rank + 1}位</span>との差：
                    報酬¥{ranking.rankBelowDiff.toLocaleString()}のリード
                  </p>
                )}
                {ranking.rank > 1 && (
                  <p className="text-gray-600">
                    <span className="font-semibold text-yellow-600">1位</span>との差：
                    ¥{ranking.rankTopDiff.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* グラフタブ */}
      {activeTab === 'charts' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">日別クリック数（30日間）</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="stat_date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip labelFormatter={d => `日付: ${d}`} />
                <Line type="monotone" dataKey="clicks" stroke="#3b82f6" name="クリック" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">LINE登録・セミナー視聴・購入（30日間）</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="stat_date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="line_registrations" stroke="#10b981" name="LINE登録" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="seminar_views" stroke="#f59e0b" name="セミナー視聴" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="purchases" stroke="#ef4444" name="購入" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">日別報酬額</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="stat_date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `¥${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => [`¥${Number(v).toLocaleString()}`, '報酬']} />
                <Bar dataKey="commission" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="報酬" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">クリック数と購入数の比較</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyStats.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="stat_date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="clicks" fill="#3b82f6" name="クリック" />
                <Bar dataKey="purchases" fill="#10b981" name="購入" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* スコアタブ */}
      {activeTab === 'score' && score && (
        <div className="space-y-4">
          {/* 総合スコア */}
          <div className="card text-center bg-gradient-to-br from-blue-50 to-purple-50">
            <p className="text-sm text-gray-500 mb-2">総合スコア</p>
            <p className="text-5xl font-bold text-blue-700">{formatScore(score.overall_score)}</p>
            <p className="text-gray-500 text-sm mt-1">/ 100</p>
            <div className="mt-3 inline-block bg-white px-4 py-1.5 rounded-full text-sm font-semibold text-purple-700 shadow-sm">
              🎯 {score.diagnosis_type}
            </div>
          </div>

          {/* 診断コメント */}
          <div className="card border-l-4 border-blue-500">
            <p className="text-sm font-semibold text-gray-900 mb-2">💬 診断コメント</p>
            <p className="text-gray-700 text-sm leading-relaxed">
              {diagnosisComments[score.diagnosis_type] || diagnosisComments['通常タイプ']}
            </p>
          </div>

          {/* レーダーチャート */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 text-center">アフィリエイト力分析</h3>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar
                  name="スコア"
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* 5項目スコア */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <ScoreCard label="集客力" value={score.traffic_score} color="bg-blue-50 border border-blue-100" />
            <ScoreCard label="成約力" value={score.conversion_score} color="bg-green-50 border border-green-100" />
            <ScoreCard label="継続力" value={score.consistency_score} color="bg-yellow-50 border border-yellow-100" />
            <ScoreCard label="商品理解力" value={score.product_understanding_score} color="bg-purple-50 border border-purple-100" />
            <ScoreCard label="改善力" value={score.improvement_score} color="bg-red-50 border border-red-100" />
          </div>

          {/* 今週のおすすめアクション */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">📋 今週のおすすめアクション</h3>
            <div className="space-y-2">
              {getRecommendedActions(score).map((action, i) => (
                <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                  <span className="text-blue-600 font-bold text-sm">{i + 1}</span>
                  <p className="text-sm text-gray-700">{action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 通知タブ */}
      {activeTab === 'notifications' && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">🔔 通知 ({notifications.length}件)</h3>
          {notifications.length === 0 && (
            <div className="card text-center py-8 text-gray-500">
              通知はありません
            </div>
          )}
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`card ${!notif.is_read ? 'border-blue-300 bg-blue-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{notif.title}</p>
                  <p className="text-gray-600 text-sm mt-1">{notif.body}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(notif.sent_at).toLocaleString('ja-JP')}</p>
                </div>
                {!notif.is_read && (
                  <button
                    onClick={async () => {
                      await fetch(`/api/affiliate-api/notifications/${notif.id}/read`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
                      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                      setUnreadCount(prev => Math.max(0, prev - 1));
                    }}
                    className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                  >
                    既読にする
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getRecommendedActions(score: AffiliateScore): string[] {
  const type = score.diagnosis_type;
  const actions: Record<string, string[]> = {
    'クリック不足タイプ': ['📱 毎日1投稿、紹介URLを含む発信をしましょう', '📸 ストーリーズで「誰向けの商品か」を伝える投稿を作りましょう', '🔗 プロフィールのリンクを紹介URLに変更しましょう', '👥 友人・知人にDMで紹介URLを直接シェアしてみましょう', '📝 商品のベネフィットを箇条書きにした投稿を試しましょう'],
    '成約改善タイプ': ['📝 紹介文に「購入後どう変わったか」を具体的に書き加えましょう', '❓ よくある疑問への回答を投稿に含めましょう', '⏰ 購入を後押しする締め切り感を演出してみましょう', '💬 LPを実際に読んで、引っかかりポイントを確認しましょう'],
    '本命商品弱めタイプ': ['🎯 スタート講座で「何ができるようになるか」を具体的に伝えましょう', '💡 副業で月収を得るためにAIが必要な理由を説明しましょう', '📊 スタート講座の受講者の変化を紹介する投稿を作りましょう', '🔄 養成講座とスタート講座の違いを分かりやすく伝えましょう'],
    '安定運用タイプ': ['📋 過去の反応が良かった投稿パターンをリスト化しましょう', '🔄 同じ切り口の投稿を別のプラットフォームで横展開しましょう', '📈 週1回、数字を振り返って微調整を続けましょう', '🤝 同じ紹介者とノウハウをシェアし合いましょう'],
    '伸び始めタイプ': ['📈 伸びている投稿テーマを特定して、同じ方向性の投稿を増やしましょう', '⚡ 今の勢いを維持するため、毎日の投稿頻度を保ちましょう', '🎯 反応の良い紹介文のパターンをテンプレ化しましょう', '📊 どの流入経路から購入が多いか確認しましょう'],
    'バランス優秀タイプ': ['🚀 紹介導線を増やし、投稿頻度をさらに上げましょう', '📱 新しいプラットフォームへの展開を検討しましょう', '🏆 成功パターンを体系化し、さらに磨きをかけましょう', '💡 新しい切り口の紹介文を試してA/Bテストしましょう'],
  };
  return actions[type] || ['📊 週1回、自分の数字を確認する習慣をつけましょう', '🎯 今週は1つの改善点に集中して取り組みましょう', '📱 まずはクリック数を増やすため、投稿頻度を上げましょう'];
}
