// src/pages/admin/AdminLeads.tsx
// 顧客管理: 無料セミナーLINE / 購入者LINE 分離表示 + 顧客詳細モーダル
import { useState, useEffect, useCallback } from 'react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/LoadingSpinner';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

type LineFilter = 'all' | 'seminar_only' | 'buyer_only' | 'both';

interface LeadDetail {
  id: string;
  // 無料セミナーLINE
  line_user_id?: string;
  seminar_line_user_id?: string;
  seminar_line_display_name?: string;
  display_name?: string;
  current_display_name?: string;
  // 購入者LINE
  buyer_line_user_id?: string;
  buyer_line_display_name?: string;
  buyer_line_registered_at?: string;
  // 購入情報
  email?: string;
  purchase_count: number;
  total_purchase_amount: number;
  purchased_at?: string;
  // 講座受取
  course_delivery_status?: string;
  course_received_at?: string;
  // その他
  registered_at?: string;
  seminar_viewed_at?: string;
  first_source?: string;
  suspicious_flag: boolean;
  created_at: string;
}

function getBuyerLineStatus(lead: LeadDetail) {
  if (!lead.buyer_line_user_id) return 'not_registered';
  return 'registered';
}

function getCourseStatus(lead: LeadDetail) {
  return lead.course_delivery_status || 'pending';
}

export function AdminLeads() {
  const [leads, setLeads] = useState<LeadDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lineFilter, setLineFilter] = useState<LineFilter>('all');
  const [detailLead, setDetailLead] = useState<LeadDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-api/leads?limit=200');
      if (res.ok) {
        setLeads(await res.json());
      } else {
        setDemoData();
      }
    } catch {
      setDemoData();
    } finally {
      setLoading(false);
    }
  };

  const setDemoData = () => {
    setLeads([
      {
        id: '1',
        line_user_id: 'U_seminar_001',
        seminar_line_user_id: 'U_seminar_001',
        seminar_line_display_name: '田中 一郎',
        current_display_name: '田中 一郎',
        buyer_line_user_id: 'U_buyer_001',
        buyer_line_display_name: '田中 一郎（購入者）',
        buyer_line_registered_at: new Date().toISOString(),
        email: 'tanaka@example.com',
        purchase_count: 1,
        total_purchase_amount: 29800,
        purchased_at: new Date().toISOString(),
        course_delivery_status: 'delivered',
        course_received_at: new Date().toISOString(),
        registered_at: new Date(Date.now() - 7 * 86400000).toISOString(),
        first_source: 'liff',
        suspicious_flag: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        line_user_id: 'U_seminar_002',
        seminar_line_user_id: 'U_seminar_002',
        seminar_line_display_name: '佐藤 花子',
        current_display_name: '佐藤 花子',
        buyer_line_user_id: undefined,
        email: 'sato@example.com',
        purchase_count: 1,
        total_purchase_amount: 29800,
        purchased_at: new Date().toISOString(),
        course_delivery_status: 'pending',
        registered_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        first_source: 'liff',
        suspicious_flag: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '3',
        line_user_id: 'U_seminar_003',
        seminar_line_user_id: 'U_seminar_003',
        seminar_line_display_name: '鈴木 次郎',
        current_display_name: '鈴木 次郎',
        purchase_count: 0,
        total_purchase_amount: 0,
        registered_at: new Date(Date.now() - 1 * 86400000).toISOString(),
        first_source: 'liff',
        suspicious_flag: false,
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const openDetail = useCallback(async (lead: LeadDetail) => {
    setDetailLead(lead);
    setDetailOpen(true);
    setPurchasesLoading(true);
    try {
      const res = await fetch(`/api/admin-api/leads/${lead.id}/purchases`);
      if (res.ok) {
        setPurchases(await res.json());
      } else {
        setPurchases([]);
      }
    } catch {
      setPurchases([]);
    } finally {
      setPurchasesLoading(false);
    }
  }, []);

  // フィルタリング
  const filtered = leads.filter(lead => {
    // 検索
    const searchLower = search.toLowerCase();
    const nameMatch =
      (lead.current_display_name || lead.display_name || '').toLowerCase().includes(searchLower) ||
      (lead.seminar_line_display_name || '').toLowerCase().includes(searchLower) ||
      (lead.buyer_line_display_name || '').toLowerCase().includes(searchLower) ||
      (lead.email || '').toLowerCase().includes(searchLower) ||
      (lead.seminar_line_user_id || '').includes(searchLower) ||
      (lead.buyer_line_user_id || '').includes(searchLower);

    if (!nameMatch) return false;

    // LINEフィルタ
    switch (lineFilter) {
      case 'seminar_only':
        return !!lead.seminar_line_user_id && !lead.buyer_line_user_id;
      case 'buyer_only':
        return !!lead.buyer_line_user_id;
      case 'both':
        return !!lead.seminar_line_user_id && !!lead.buyer_line_user_id;
      default:
        return true;
    }
  });

  // 統計
  const totalLeads = leads.length;
  const seminarLineCount = leads.filter(l => !!l.seminar_line_user_id).length;
  const buyerLineCount = leads.filter(l => !!l.buyer_line_user_id).length;
  const purchasedCount = leads.filter(l => l.purchase_count > 0).length;
  const courseDeliveredCount = leads.filter(l => l.course_delivery_status === 'delivered').length;

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">👥 顧客管理</h1>
        <button onClick={fetchLeads} className="btn-secondary text-sm">🔄 更新</button>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: '総登録者', value: totalLeads, icon: '👤', color: 'bg-gray-50' },
          { label: '無料セミナーLINE', value: seminarLineCount, icon: '💬', color: 'bg-blue-50' },
          { label: '購入者LINE登録', value: buyerLineCount, icon: '🎓', color: 'bg-green-50' },
          { label: '購入者数', value: purchasedCount, icon: '💰', color: 'bg-yellow-50' },
          { label: '講座受取済', value: courseDeliveredCount, icon: '✅', color: 'bg-emerald-50' },
        ].map(kpi => (
          <div key={kpi.label} className={`${kpi.color} rounded-xl p-3 text-center`}>
            <p className="text-2xl">{kpi.icon}</p>
            <p className="text-xl font-bold text-gray-800">{kpi.value}</p>
            <p className="text-xs text-gray-500">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="名前・メール・LINE IDで検索"
          className="input-field flex-1 min-w-48"
        />
        <div className="flex gap-1">
          {([
            ['all', 'すべて'],
            ['seminar_only', '無料LINEのみ'],
            ['buyer_only', '購入者LINE登録済'],
            ['both', '両方登録'],
          ] as [LineFilter, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setLineFilter(val)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                lineFilter === val
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* テーブル */}
      <div className="table-container">
        <table className="table">
          <thead className="table-header">
            <tr>
              <th className="table-th">顧客名</th>
              <th className="table-th">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
                  無料セミナーLINE
                </span>
              </th>
              <th className="table-th">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                  購入者LINE
                </span>
              </th>
              <th className="table-th">購入</th>
              <th className="table-th">講座受取</th>
              <th className="table-th">登録日</th>
              <th className="table-th">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(lead => {
              const buyerStatus = getBuyerLineStatus(lead);
              const courseStatus = getCourseStatus(lead);
              return (
                <tr key={lead.id} className="table-row">
                  {/* 顧客名 */}
                  <td className="table-td">
                    <div>
                      <p className="font-medium text-gray-900">
                        {lead.current_display_name || lead.display_name || '未設定'}
                      </p>
                      {lead.email && (
                        <p className="text-xs text-gray-400">{lead.email}</p>
                      )}
                      {lead.suspicious_flag && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">不審</span>
                      )}
                    </div>
                  </td>

                  {/* 無料セミナーLINE */}
                  <td className="table-td">
                    {lead.seminar_line_user_id ? (
                      <div>
                        <p className="text-sm font-medium text-blue-700">
                          {lead.seminar_line_display_name || lead.current_display_name || '—'}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">
                          {(lead.seminar_line_user_id || '').substring(0, 12)}...
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">未登録</span>
                    )}
                  </td>

                  {/* 購入者LINE */}
                  <td className="table-td">
                    {buyerStatus === 'registered' ? (
                      <div>
                        <p className="text-sm font-medium text-green-700">
                          {lead.buyer_line_display_name || '—'}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">
                          {(lead.buyer_line_user_id || '').substring(0, 12)}...
                        </p>
                        {lead.buyer_line_registered_at && (
                          <p className="text-xs text-gray-400">
                            {new Date(lead.buyer_line_registered_at).toLocaleDateString('ja-JP')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        lead.purchase_count > 0
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {lead.purchase_count > 0 ? '未登録（購入者）' : '未購入'}
                      </span>
                    )}
                  </td>

                  {/* 購入情報 */}
                  <td className="table-td">
                    {lead.purchase_count > 0 ? (
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {lead.purchase_count}件
                        </p>
                        <p className="text-xs text-gray-500">
                          ¥{lead.total_purchase_amount.toLocaleString()}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">未購入</span>
                    )}
                  </td>

                  {/* 講座受取 */}
                  <td className="table-td">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      courseStatus === 'delivered'
                        ? 'bg-green-100 text-green-700'
                        : courseStatus === 'failed'
                        ? 'bg-red-100 text-red-600'
                        : lead.purchase_count > 0
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {courseStatus === 'delivered' ? '✅ 受取済'
                        : courseStatus === 'failed' ? '❌ 失敗'
                        : lead.purchase_count > 0 ? '⏳ 未受取'
                        : '—'}
                    </span>
                  </td>

                  {/* 登録日 */}
                  <td className="table-td text-xs text-gray-500">
                    {lead.registered_at
                      ? new Date(lead.registered_at).toLocaleDateString('ja-JP')
                      : '—'}
                  </td>

                  {/* 操作 */}
                  <td className="table-td">
                    <button
                      onClick={() => openDetail(lead)}
                      className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      詳細
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-2">👥</p>
            <p>該当する顧客が見つかりません</p>
          </div>
        )}
      </div>

      {/* ============================================================
          顧客詳細モーダル
          ============================================================ */}
      <Modal
        isOpen={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailLead(null); }}
        title="顧客詳細"
      >
        {detailLead && (
          <div className="space-y-5">
            {/* 基本情報 */}
            <section>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">基本情報</h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">顧客名</span>
                  <span className="font-medium">{detailLead.current_display_name || detailLead.display_name || '未設定'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">メールアドレス</span>
                  <span className="font-medium">{detailLead.email || '未設定'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">流入元</span>
                  <span className="font-medium">{detailLead.first_source || '不明'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">登録日時</span>
                  <span className="font-medium">
                    {detailLead.registered_at
                      ? new Date(detailLead.registered_at).toLocaleString('ja-JP')
                      : '—'}
                  </span>
                </div>
              </div>
            </section>

            {/* 無料セミナーLINE */}
            <section>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
                無料セミナーLINE
              </h3>
              <div className="bg-blue-50 rounded-xl p-4 space-y-2 text-sm border border-blue-100">
                <div className="flex justify-between">
                  <span className="text-gray-500">LINE userId</span>
                  <span className="font-mono text-xs text-gray-700">
                    {detailLead.seminar_line_user_id || detailLead.line_user_id || '未登録'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">表示名</span>
                  <span className="font-medium text-blue-700">
                    {detailLead.seminar_line_display_name || detailLead.current_display_name || '未設定'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">登録状況</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    (detailLead.seminar_line_user_id || detailLead.line_user_id)
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {(detailLead.seminar_line_user_id || detailLead.line_user_id) ? '✅ 登録済' : '未登録'}
                  </span>
                </div>
                {detailLead.seminar_viewed_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">セミナー視聴日</span>
                    <span className="text-xs">
                      {new Date(detailLead.seminar_viewed_at).toLocaleString('ja-JP')}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* 購入者LINE */}
            <section>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                購入者LINE
              </h3>
              <div className={`rounded-xl p-4 space-y-2 text-sm border ${
                detailLead.buyer_line_user_id
                  ? 'bg-green-50 border-green-100'
                  : detailLead.purchase_count > 0
                  ? 'bg-yellow-50 border-yellow-100'
                  : 'bg-gray-50 border-gray-100'
              }`}>
                <div className="flex justify-between">
                  <span className="text-gray-500">LINE userId</span>
                  <span className="font-mono text-xs text-gray-700">
                    {detailLead.buyer_line_user_id || '未登録'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">表示名</span>
                  <span className={`font-medium ${detailLead.buyer_line_user_id ? 'text-green-700' : 'text-gray-400'}`}>
                    {detailLead.buyer_line_display_name || '未登録'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">登録状況</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    detailLead.buyer_line_user_id
                      ? 'bg-green-100 text-green-700'
                      : detailLead.purchase_count > 0
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {detailLead.buyer_line_user_id
                      ? '✅ 登録済'
                      : detailLead.purchase_count > 0
                      ? '⚠ 購入者・未登録'
                      : '未購入'}
                  </span>
                </div>
                {detailLead.buyer_line_registered_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">登録日時</span>
                    <span className="text-xs">
                      {new Date(detailLead.buyer_line_registered_at).toLocaleString('ja-JP')}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* 購入商品・購入日時 */}
            <section>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">購入情報</h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">購入件数</span>
                  <span className="font-medium">{detailLead.purchase_count}件</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">累計購入金額</span>
                  <span className="font-medium text-blue-700">¥{detailLead.total_purchase_amount.toLocaleString()}</span>
                </div>
                {detailLead.purchased_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">最終購入日時</span>
                    <span className="text-xs">{new Date(detailLead.purchased_at).toLocaleString('ja-JP')}</span>
                  </div>
                )}
              </div>

              {/* 購入商品一覧 */}
              {purchasesLoading ? (
                <LoadingSpinner size="sm" />
              ) : purchases.length > 0 ? (
                <div className="space-y-2">
                  {purchases.map((p: any) => (
                    <div key={p.id} className="border border-gray-200 rounded-xl p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">{p.product_name}</span>
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                        <span>¥{(p.amount_total || 0).toLocaleString()}</span>
                        <span>{new Date(p.purchased_at).toLocaleString('ja-JP')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-2">購入履歴なし</p>
              )}
            </section>

            {/* 講座受取状況 */}
            <section>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">講座受取状況</h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">受取状況</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    detailLead.course_delivery_status === 'delivered'
                      ? 'bg-green-100 text-green-700'
                      : detailLead.course_delivery_status === 'failed'
                      ? 'bg-red-100 text-red-600'
                      : detailLead.purchase_count > 0
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {detailLead.course_delivery_status === 'delivered' ? '✅ 受取済'
                      : detailLead.course_delivery_status === 'failed' ? '❌ 失敗'
                      : detailLead.purchase_count > 0 ? '⏳ 未受取'
                      : '— 未購入'}
                  </span>
                </div>
                {detailLead.course_received_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">受取日時</span>
                    <span className="text-xs">
                      {new Date(detailLead.course_received_at).toLocaleString('ja-JP')}
                    </span>
                  </div>
                )}
                {detailLead.purchase_count > 0 && !detailLead.buyer_line_user_id && (
                  <div className="bg-yellow-100 text-yellow-800 rounded-lg p-2 text-xs mt-2">
                    ⚠ 購入者LINE未登録のため、講座URLを受け取れていない可能性があります。
                    フォローアップを検討してください。
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </Modal>
    </div>
  );
}
