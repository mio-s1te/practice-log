// src/pages/affiliate/AffiliateDashboardNew.tsx
// アフィリエイターダッシュボード（新要件版）
// - 紹介URL（商品ごと、権限あるものだけ表示）
// - クリック数・成約数・報酬
// - 未払い報酬・支払済み報酬
// - PR表記ルール

import { useState, useEffect } from 'react';

const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin;

interface AffiliateInfo {
  id: string;
  name: string;
  email: string;
  affiliate_code: string;
  status: string;
  start_course_purchased: boolean;
  approved_at: string | null;
}

interface ProductPermission {
  product_id: string;
  product_name: string;
  product_type: string;
  lp_url: string;
  can_refer: boolean;
  access_level: string;
}

interface Stats {
  total_clicks: number;
  total_conversions: number;
  this_month_clicks: number;
  this_month_conversions: number;
  total_commission: number;
  unpaid_commission: number;
  paid_commission: number;
  this_month_commission: number;
  conversion_rate: number;
}

interface RecentConversion {
  id: string;
  product_name: string;
  amount: number;
  commission_amount: number;
  commission_status: string;
  purchased_at: string;
}

function StatCard({
  label, value, sub, color = 'blue'
}: {
  label: string;
  value: string;
  sub?: string;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  };
  return (
    <div className={`rounded-2xl border p-4 ${colorMap[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-extrabold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
        copied
          ? 'bg-green-500 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {copied ? '✓ コピー済み' : 'コピー'}
    </button>
  );
}

const statusLabel: Record<string, { label: string; color: string }> = {
  pending: { label: '審査中', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: '承認済み', color: 'bg-green-100 text-green-700' },
  payable: { label: '支払い待ち', color: 'bg-blue-100 text-blue-700' },
  paid: { label: '支払済み', color: 'bg-gray-100 text-gray-600' },
  rejected: { label: '却下', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'キャンセル', color: 'bg-gray-100 text-gray-500' },
};

export function AffiliateDashboardNew() {
  const [affiliate, setAffiliate] = useState<AffiliateInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [permissions, setPermissions] = useState<ProductPermission[]>([]);
  const [recentConversions, setRecentConversions] = useState<RecentConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'urls' | 'conversions' | 'rules'>('overview');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    const token = localStorage.getItem('affiliate_session_token');
    if (!token) {
      window.location.href = '/affiliate/login';
      return;
    }
    try {
      const res = await fetch('/.netlify/functions/affiliate-api/dashboard/v2', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('affiliate_session_token');
        window.location.href = '/affiliate/login';
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setAffiliate(data.affiliate);
        setStats(data.stats);
        setPermissions(data.product_permissions || []);
        setRecentConversions(data.recent_conversions || []);
      }
    } catch {
      // エラー時は何もしない
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('affiliate_session_token');
    localStorage.removeItem('affiliate_id');
    localStorage.removeItem('affiliate_name');
    window.location.href = '/affiliate/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  const referrableProducts = permissions.filter((p) => p.can_refer);
  const lockedProducts = permissions.filter((p) => !p.can_refer);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">マイページ</p>
              <p className="text-xs text-gray-500">{affiliate?.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            ログアウト
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* アフィリエイターコード */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">あなたの紹介コード</p>
            <p className="text-xl font-extrabold text-blue-700 font-mono tracking-wider">
              {affiliate?.affiliate_code}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              affiliate?.status === 'active'
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {affiliate?.status === 'active' ? '✓ 承認済み' : '審査中'}
            </span>
            {affiliate?.start_course_purchased && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                スタート講座受講済み
              </span>
            )}
          </div>
        </div>

        {/* タブ */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {(
            [
              { key: 'overview', label: '概要' },
              { key: 'urls', label: '紹介URL' },
              { key: 'conversions', label: '成約履歴' },
              { key: 'rules', label: 'PR表記ルール' },
            ] as { key: typeof activeTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 概要タブ */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="累計クリック数"
                value={stats.total_clicks.toLocaleString()}
                sub="今月: " color="blue"
              />
              <StatCard
                label="累計成約数"
                value={stats.total_conversions.toLocaleString()}
                sub={`今月: ${stats.this_month_conversions}`}
                color="green"
              />
              <StatCard
                label="累計報酬"
                value={`¥${stats.total_commission.toLocaleString()}`}
                color="purple"
              />
              <StatCard
                label="未払い報酬"
                value={`¥${stats.unpaid_commission.toLocaleString()}`}
                color="orange"
              />
            </div>

            {/* 今月の成績 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4 text-sm">今月の成績</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-blue-700">{stats.this_month_clicks}</p>
                  <p className="text-xs text-gray-500 mt-0.5">クリック</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-green-700">{stats.this_month_conversions}</p>
                  <p className="text-xs text-gray-500 mt-0.5">成約</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-orange-700">
                    ¥{stats.this_month_commission.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">報酬</p>
                </div>
              </div>
              {stats.this_month_clicks > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">転換率</span>
                    <span className="font-bold text-gray-900">
                      {((stats.this_month_conversions / stats.this_month_clicks) * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 報酬状況 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4 text-sm">報酬状況</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-600">累計報酬（税前）</span>
                  <span className="font-bold text-gray-900">¥{stats.total_commission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-600">未払い報酬</span>
                  <span className="font-bold text-orange-600">¥{stats.unpaid_commission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">支払済み報酬</span>
                  <span className="font-bold text-green-600">¥{stats.paid_commission.toLocaleString()}</span>
                </div>
              </div>
              {stats.unpaid_commission > 0 && (
                <div className="mt-4 bg-orange-50 rounded-xl p-3 text-xs text-orange-700">
                  💰 未払い報酬 ¥{stats.unpaid_commission.toLocaleString()} は毎月末に振込申請手続きが可能です
                </div>
              )}
            </div>
          </div>
        )}

        {/* 紹介URLタブ */}
        {activeTab === 'urls' && (
          <div className="space-y-4">
            {referrableProducts.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
                <p className="text-4xl mb-3">🔒</p>
                <p className="font-semibold text-gray-600 mb-1">紹介可能な商品がありません</p>
                <p className="text-sm">承認が完了するか、必要な条件を満たすと紹介URLが表示されます。</p>
              </div>
            )}

            {referrableProducts.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">紹介可能な商品</h3>
                <div className="space-y-3">
                  {referrableProducts.map((product) => {
                    const referralUrl = `${SITE_URL}${product.lp_url}?ref=${affiliate?.affiliate_code}`;
                    return (
                      <div key={product.product_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{product.product_name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                              product.product_type === 'start_course'
                                ? 'bg-purple-100 text-purple-700'
                                : product.product_type === 'affiliate_course'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {product.product_type === 'start_course' ? 'スタート講座' :
                               product.product_type === 'affiliate_course' ? 'アフィリエイト講座' : 'その他'}
                            </span>
                          </div>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                            紹介可能
                          </span>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500 mb-1">紹介URL</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-mono text-gray-800 flex-1 break-all">{referralUrl}</p>
                            <CopyButton text={referralUrl} />
                          </div>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <a
                            href={product.lp_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            販売ページを確認 →
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {lockedProducts.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-400 mb-3">紹介権限なし（条件未達）</h3>
                <div className="space-y-2">
                  {lockedProducts.map((product) => (
                    <div key={product.product_id} className="bg-white rounded-xl border border-gray-100 p-4 opacity-60">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-600">{product.product_name}</p>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          🔒 権限なし
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {product.access_level === 'approved_only'
                          ? 'スタート講座購入 + 管理者承認が必要です'
                          : product.access_level === 'requires_purchase'
                          ? 'この商品の購入が必要です'
                          : '現在紹介権限がありません'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 成約履歴タブ */}
        {activeTab === 'conversions' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">成約履歴</h3>
            </div>
            {recentConversions.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <p className="text-3xl mb-2">📊</p>
                <p className="text-sm">まだ成約がありません</p>
                <p className="text-xs mt-1">紹介URLをSNSや媒体で拡散して最初の成約を目指しましょう！</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentConversions.map((conv) => {
                  const st = statusLabel[conv.commission_status] || { label: conv.commission_status, color: 'bg-gray-100 text-gray-500' };
                  return (
                    <div key={conv.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{conv.product_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(conv.purchased_at).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-700">+¥{conv.commission_amount.toLocaleString()}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                          {st.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PR表記ルールタブ */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <h3 className="font-bold text-red-800 mb-3 text-sm">⚠️ 必ず守ってください</h3>
              <ul className="space-y-2 text-sm text-red-700">
                <li className="flex items-start gap-2">
                  <span className="font-bold flex-shrink-0">•</span>
                  SNS投稿・ブログ記事・動画等、すべての紹介コンテンツで「PR」「広告」「アフィリエイト」等の表記が義務です
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold flex-shrink-0">•</span>
                  「必ず稼げる」「絶対に成功する」等の断定的な表現は禁止です
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold flex-shrink-0">•</span>
                  虚偽の情報・誇大広告による紹介は法令違反となり、登録取り消しになります
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4 text-sm">PR表記の例文</h3>
              <div className="space-y-3">
                {[
                  {
                    media: 'Twitter / X',
                    example: '※ この投稿はPRを含みます。私自身が受講して良かったAIアフィリエイト講座をご紹介しています。',
                  },
                  {
                    media: 'Instagram',
                    example: '#PR #広告\nこの投稿はアフィリエイト広告を含みます。',
                  },
                  {
                    media: 'ブログ・note',
                    example: '※ 本記事はアフィリエイト広告を含みます。紹介しているリンクから購入いただくと、私に紹介報酬が支払われます。',
                  },
                ].map((item) => (
                  <div key={item.media} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-gray-600 mb-2">{item.media}</p>
                    <div className="flex items-start gap-2">
                      <p className="text-xs text-gray-700 flex-1 whitespace-pre-line">{item.example}</p>
                      <CopyButton text={item.example} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 rounded-2xl p-5">
              <h3 className="font-bold text-blue-800 mb-3 text-sm">📋 推奨する紹介方法</h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li>✓ 実際に受講した体験談・感想を正直に伝える</li>
                <li>✓ 具体的にどんな人に役立つか伝える</li>
                <li>✓ メリット・デメリットを公平に伝える</li>
                <li>✓ 紹介URLは自分のコードが付いたものを使用する</li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-2xl p-5 text-xs text-gray-500">
              <p className="font-semibold text-gray-600 mb-2">参考法令</p>
              <p>景品表示法第5条、消費者庁「ステルスマーケティング規制」に基づき、広告・宣伝であることを明示する義務があります。違反した場合、個人の責任が問われる場合があります。</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
