// src/pages/admin/AdminAffiliateRegistrations.tsx
// アフィリエイター登録申請審査画面

import { useState, useEffect } from 'react';

interface Registration {
  id: string;
  name: string;
  email: string;
  sns_url: string | null;
  promotion_channel: string;
  motivation: string;
  agreed_to_rules: boolean;
  start_course_verified: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  affiliate_id: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: '審査中', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '承認済み', color: 'bg-green-100 text-green-800' },
  rejected: { label: '却下', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'キャンセル', color: 'bg-gray-100 text-gray-600' },
};

const channelLabel: Record<string, string> = {
  twitter_x: 'Twitter / X',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  blog: 'ブログ / note',
  line: 'LINE',
  other: 'その他',
};

export function AdminAffiliateRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [selected, setSelected] = useState<Registration | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    fetchRegistrations();
  }, [filterStatus]);

  const getAdminToken = () => sessionStorage.getItem('admin_token') || '';

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/.netlify/functions/admin-api/affiliate-registrations?status=${filterStatus}`,
        { headers: { Authorization: `Bearer ${getAdminToken()}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data.registrations || []);
      }
    } catch {
      // エラー
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('この申請を承認してアフィリエイター登録しますか？')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/.netlify/functions/admin-api/affiliate-registrations/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify({ registration_id: id }),
      });
      if (res.ok) {
        fetchRegistrations();
        setSelected(null);
        alert('承認しました。アフィリエイター登録が完了し、メールが送信されます。');
      } else {
        const data = await res.json();
        alert(`エラー: ${data.error}`);
      }
    } catch {
      alert('ネットワークエラーが発生しました。');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      alert('却下理由を入力してください。');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/.netlify/functions/admin-api/affiliate-registrations/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify({ registration_id: id, rejection_reason: rejectReason }),
      });
      if (res.ok) {
        fetchRegistrations();
        setSelected(null);
        setShowRejectForm(false);
        setRejectReason('');
      } else {
        const data = await res.json();
        alert(`エラー: ${data.error}`);
      }
    } catch {
      alert('ネットワークエラーが発生しました。');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = registrations.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">アフィリエイター登録申請</h1>
          <p className="text-sm text-gray-500 mt-0.5">講座購入者からの申請を確認します（購入済みは自動承認）</p>
        </div>
        {pendingCount > 0 && (
          <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
            審査待ち {pendingCount}件
          </span>
        )}
      </div>

      {/* フィルター */}
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected', 'cancelled', 'all'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              filterStatus === s
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s === 'pending' ? '審査中' : s === 'approved' ? '承認済み' : s === 'rejected' ? '却下' : s === 'cancelled' ? 'キャンセル' : '全て'}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* リスト */}
        <div className="lg:col-span-2 space-y-2">
          {loading ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">読み込み中...</p>
            </div>
          ) : registrations.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm">申請がありません</p>
            </div>
          ) : (
            registrations.map((reg) => (
              <button
                key={reg.id}
                onClick={() => { setSelected(reg); setShowRejectForm(false); setRejectReason(''); }}
                className={`w-full text-left bg-white border rounded-xl p-4 transition-all hover:shadow-sm ${
                  selected?.id === reg.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="font-semibold text-gray-900 text-sm">{reg.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig[reg.status]?.color}`}>
                    {statusConfig[reg.status]?.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{reg.email}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {channelLabel[reg.promotion_channel] || reg.promotion_channel}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  申請日: {new Date(reg.created_at).toLocaleDateString('ja-JP')}
                </p>
                {reg.start_course_verified && (
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded mt-1 inline-block">
                    ✓ 講座購入確認済み
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* 詳細 */}
        <div className="lg:col-span-3">
          {!selected ? (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
              <p className="text-4xl mb-3">👈</p>
              <p className="text-sm">申請を選択して詳細を確認してください</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                  <p className="text-sm text-gray-500">{selected.email}</p>
                </div>
                <span className={`text-sm px-3 py-1 rounded-full font-bold ${statusConfig[selected.status]?.color}`}>
                  {statusConfig[selected.status]?.label}
                </span>
              </div>

              {/* 購入確認 */}
              <div className={`flex items-center gap-3 rounded-xl p-3 ${
                selected.start_course_verified ? 'bg-green-50' : 'bg-yellow-50'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  selected.start_course_verified ? 'bg-green-500' : 'bg-yellow-400'
                }`}>
                  <span className="text-white text-sm">{selected.start_course_verified ? '✓' : '？'}</span>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${selected.start_course_verified ? 'text-green-800' : 'text-yellow-800'}`}>
                    スタート講座購入: {selected.start_course_verified ? '確認済み' : '未確認（アフィリエイト講座購入の可能性）'}
                  </p>
                  {!selected.start_course_verified && (
                    <p className="text-xs text-yellow-600 mt-0.5">アフィリエイト講座購入者でも申請可能です</p>
                  )}
                </div>
              </div>

              {/* 基本情報 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">紹介媒体</p>
                  <p className="text-sm font-semibold text-gray-900">{channelLabel[selected.promotion_channel] || selected.promotion_channel}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">申請日</p>
                  <p className="text-sm font-semibold text-gray-900">{new Date(selected.created_at).toLocaleDateString('ja-JP')}</p>
                </div>
              </div>

              {/* SNS URL */}
              {selected.sns_url && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">SNS・ブログURL</p>
                  <a
                    href={selected.sns_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {selected.sns_url}
                  </a>
                </div>
              )}

              {/* 動機 */}
              <div>
                <p className="text-xs text-gray-500 mb-2">紹介したい理由・動機</p>
                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 whitespace-pre-line">
                  {selected.motivation}
                </div>
              </div>

              {/* 審査情報（審査済みの場合） */}
              {selected.reviewed_at && (
                <div className={`rounded-xl p-3 ${selected.status === 'approved' ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className="text-xs font-semibold text-gray-600 mb-1">審査情報</p>
                  <p className="text-xs text-gray-500">
                    審査者: {selected.reviewed_by} / {new Date(selected.reviewed_at).toLocaleDateString('ja-JP')}
                  </p>
                  {selected.rejection_reason && (
                    <p className="text-xs text-red-700 mt-1">却下理由: {selected.rejection_reason}</p>
                  )}
                </div>
              )}

              {/* アクション（審査中の場合のみ） */}
              {selected.status === 'pending' && (
                <div>
                  {!showRejectForm ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(selected.id)}
                        disabled={actionLoading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                      >
                        {actionLoading ? '処理中...' : '✓ 承認する'}
                      </button>
                      <button
                        onClick={() => setShowRejectForm(true)}
                        className="flex-1 border border-red-300 text-red-600 hover:bg-red-50 font-bold py-3 rounded-xl transition-colors"
                      >
                        ✕ 却下する
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-gray-800">却下理由を入力してください</p>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="申請者に伝える却下理由を記入してください"
                        rows={3}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleReject(selected.id)}
                          disabled={actionLoading || !rejectReason.trim()}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50 text-sm"
                        >
                          却下を確定する
                        </button>
                        <button
                          onClick={() => { setShowRejectForm(false); setRejectReason(''); }}
                          className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 text-sm"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
