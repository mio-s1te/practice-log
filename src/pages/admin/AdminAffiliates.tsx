// src/pages/admin/AdminAffiliates.tsx
import { useState, useEffect } from 'react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/LoadingSpinner';

export function AdminAffiliates() {
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editAffiliate, setEditAffiliate] = useState<any>({});
  // パスワード設定モーダル
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwTarget, setPwTarget] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  // 管理者トークン取得
  const getAdminToken = () => sessionStorage.getItem('admin_token') || '';
  const adminHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAdminToken()}`,
  });

  useEffect(() => {
    fetchAffiliates();
  }, []);

  const fetchAffiliates = async () => {
    try {
      const res = await fetch('/api/admin-api/affiliates', {
        headers: { 'Authorization': `Bearer ${getAdminToken()}` },
      });
      if (res.ok) setAffiliates(await res.json());
      else setDemoData();
    } catch { setDemoData(); }
    finally { setLoading(false); }
  };

  const setDemoData = () => {
    setAffiliates([
      { id: '1', name: '山田太郎', email: 'yamada@example.com', affiliate_code: 'yamada_abc1',
        status: 'active', line_display_name: '山田 太郎', registered_at: new Date().toISOString(),
        tags: ['優良紹介者'], scores: [{ overall_score: 78.5, diagnosis_type: '安定運用タイプ' }] },
      { id: '2', name: '鈴木花子', email: 'suzuki@example.com', affiliate_code: 'suzuki_xyz2',
        status: 'pending', line_display_name: '鈴木 花子', registered_at: new Date().toISOString(),
        tags: ['初心者'], scores: [{ overall_score: 32.1, diagnosis_type: 'クリック不足タイプ' }] },
    ]);
  };

  const filtered = affiliates.filter(a =>
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase()) ||
    a.affiliate_code?.includes(search)
  );

  const handleSetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      setPwError('パスワードは8文字以上にしてください');
      return;
    }
    setPwLoading(true);
    setPwError('');
    try {
      const res = await fetch(`/api/admin-api/affiliates/${pwTarget.id}/set-password`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        setPwSuccess(true);
        setTimeout(() => {
          setPwModalOpen(false);
          setPwSuccess(false);
          setNewPassword('');
          setPwTarget(null);
        }, 1500);
      } else {
        const d = await res.json();
        setPwError(d.error || '設定に失敗しました');
      }
    } catch {
      setPwError('ネットワークエラーが発生しました');
    } finally {
      setPwLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const url = editAffiliate.id ? `/api/admin-api/affiliates/${editAffiliate.id}` : '/api/admin-api/affiliates';
      const method = editAffiliate.id ? 'PUT' : 'POST';
      await fetch(url, {
        method,
        headers: adminHeaders(),
        body: JSON.stringify(editAffiliate),
      });
      await fetchAffiliates();
      setModalOpen(false);
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">👥 紹介者管理</h1>
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="名前・メール・コードで検索"
            className="input-field w-64"
          />
          <button onClick={() => { setEditAffiliate({}); setModalOpen(true); }} className="btn-primary">
            + 紹介者追加
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead className="table-header">
            <tr>
              <th className="table-th">紹介者名</th>
              <th className="table-th">コード</th>
              <th className="table-th">ステータス</th>
              <th className="table-th">LINE表示名</th>
              <th className="table-th">総合スコア</th>
              <th className="table-th">診断タイプ</th>
              <th className="table-th">タグ</th>
              <th className="table-th">登録日</th>
              <th className="table-th">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(affiliate => (
              <tr key={affiliate.id} className="table-row">
                <td className="table-td">
                  <div>
                    <p className="font-medium">{affiliate.name}</p>
                    <p className="text-xs text-gray-500">{affiliate.email}</p>
                  </div>
                </td>
                <td className="table-td">
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{affiliate.affiliate_code}</code>
                </td>
                <td className="table-td">
                  <StatusBadge status={affiliate.status} />
                  {affiliate.suspicious_flag && (
                    <span className="ml-1 badge bg-red-100 text-red-700">⚠️ 疑い</span>
                  )}
                </td>
                <td className="table-td text-sm text-gray-600">{affiliate.line_display_name || '-'}</td>
                <td className="table-td">
                  {affiliate.scores?.[0] ? (
                    <span className="font-semibold text-blue-600">
                      {Number(affiliate.scores[0].overall_score).toFixed(2)}
                    </span>
                  ) : '-'}
                </td>
                <td className="table-td">
                  {affiliate.scores?.[0]?.diagnosis_type ? (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-lg">
                      {affiliate.scores[0].diagnosis_type}
                    </span>
                  ) : '-'}
                </td>
                <td className="table-td">
                  <div className="flex flex-wrap gap-1">
                    {(affiliate.tags || []).map((tag: string) => (
                      <span key={tag} className="badge badge-blue text-xs">{tag}</span>
                    ))}
                  </div>
                </td>
                <td className="table-td text-xs text-gray-500">
                  {new Date(affiliate.registered_at).toLocaleDateString('ja-JP')}
                </td>
                <td className="table-td">
                  <div className="flex gap-1 flex-wrap">
                    <button
                      onClick={() => { setEditAffiliate(affiliate); setModalOpen(true); }}
                      className="text-xs btn-secondary py-1 px-2"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => { setPwTarget(affiliate); setNewPassword(''); setPwError(''); setPwSuccess(false); setPwModalOpen(true); }}
                      className="text-xs py-1 px-2 rounded-xl font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      PW設定
                    </button>
                    <button
                      onClick={async () => {
                        const newStatus = affiliate.status === 'suspended' ? 'active' : 'suspended';
                        await fetch(`/api/admin-api/affiliates/${affiliate.id}`, {
                          method: 'PUT',
                          headers: adminHeaders(),
                          body: JSON.stringify({ status: newStatus }),
                        });
                        fetchAffiliates();
                      }}
                      className={`text-xs py-1 px-2 rounded-xl font-semibold ${
                        affiliate.status === 'suspended'
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {affiliate.status === 'suspended' ? '再開' : '停止'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 紹介者編集モーダル */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editAffiliate.id ? '紹介者編集' : '紹介者追加'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">名前 *</label>
              <input
                type="text"
                value={editAffiliate.name || ''}
                onChange={e => setEditAffiliate((p: any) => ({ ...p, name: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メール *</label>
              <input
                type="email"
                value={editAffiliate.email || ''}
                onChange={e => setEditAffiliate((p: any) => ({ ...p, email: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">紹介者コード</label>
            <input
              type="text"
              value={editAffiliate.affiliate_code || ''}
              onChange={e => setEditAffiliate((p: any) => ({ ...p, affiliate_code: e.target.value }))}
              className="input-field"
              placeholder="自動生成される場合は空欄"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
            <select
              value={editAffiliate.status || 'pending'}
              onChange={e => setEditAffiliate((p: any) => ({ ...p, status: e.target.value }))}
              className="select-field"
            >
              <option value="pending">審査中</option>
              <option value="active">有効</option>
              <option value="suspended">停止</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">管理者メモ</label>
            <textarea
              value={editAffiliate.notes || ''}
              onChange={e => setEditAffiliate((p: any) => ({ ...p, notes: e.target.value }))}
              className="input-field h-20 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">キャンセル</button>
            <button onClick={handleSave} className="btn-primary flex-1">保存</button>
          </div>
        </div>
      </Modal>

      {/* パスワード設定モーダル */}
      <Modal isOpen={pwModalOpen} onClose={() => { setPwModalOpen(false); setNewPassword(''); setPwError(''); setPwSuccess(false); }} title="パスワード設定">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{pwTarget?.name}</span>（{pwTarget?.email}）のログインパスワードを設定します。
          </p>
          {pwSuccess ? (
            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm font-medium">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              パスワードを設定しました
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">新しいパスワード <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="input-field font-mono"
                  placeholder="8文字以上"
                  autoComplete="new-password"
                />
                <p className="text-xs text-gray-400 mt-1">設定後、アフィリエイターにパスワードをお知らせください</p>
              </div>
              {pwError && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-xl text-sm">{pwError}</div>}
              <div className="flex gap-2">
                <button onClick={() => { setPwModalOpen(false); setNewPassword(''); setPwError(''); }} className="btn-secondary flex-1">キャンセル</button>
                <button onClick={handleSetPassword} disabled={pwLoading} className="btn-primary flex-1">
                  {pwLoading ? '設定中...' : '設定する'}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

// src/pages/admin/AdminLeads.tsx
export function AdminLeads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin-api/leads')
      .then(r => r.ok ? r.json() : demoLeads())
      .then(data => { setLeads(Array.isArray(data) ? data : demoLeads()); setLoading(false); })
      .catch(() => { setLeads(demoLeads()); setLoading(false); });
  }, []);

  const demoLeads = () => [
    { id: '1', current_display_name: '田中 一郎', email: 'tanaka@example.com', line_user_id: 'U123', purchase_count: 2, total_purchase_amount: 34600, registered_at: new Date().toISOString() },
    { id: '2', current_display_name: '佐藤 次郎', email: 'sato@example.com', line_user_id: 'U456', purchase_count: 1, total_purchase_amount: 29800, registered_at: new Date().toISOString() },
  ];

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">👤 顧客管理</h1>
      <div className="table-container">
        <table className="table">
          <thead className="table-header">
            <tr>
              <th className="table-th">LINE表示名</th>
              <th className="table-th">メール</th>
              <th className="table-th">LINE userId</th>
              <th className="table-th">購入回数</th>
              <th className="table-th">累計購入額</th>
              <th className="table-th">登録日</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.map(lead => (
              <tr key={lead.id} className="table-row">
                <td className="table-td font-medium">{lead.current_display_name || '-'}</td>
                <td className="table-td text-gray-600">{lead.email || '-'}</td>
                <td className="table-td"><code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{lead.line_user_id ? `${lead.line_user_id.substring(0, 8)}...` : '-'}</code></td>
                <td className="table-td">{lead.purchase_count}回</td>
                <td className="table-td font-semibold text-green-600">¥{(lead.total_purchase_amount || 0).toLocaleString()}</td>
                <td className="table-td text-xs text-gray-500">{lead.registered_at ? new Date(lead.registered_at).toLocaleDateString('ja-JP') : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// src/pages/admin/AdminPurchases.tsx
export function AdminPurchases() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin-api/purchases')
      .then(r => r.ok ? r.json() : demoPurchases())
      .then(data => { setPurchases(Array.isArray(data) ? data : demoPurchases()); setLoading(false); })
      .catch(() => { setPurchases(demoPurchases()); setLoading(false); });
  }, []);

  const demoPurchases = () => [
    { id: 'p1', buyer_line_display_name: '田中 一郎', buyer_email: 'tanaka@example.com', product_name: 'AI副業1時間化スタート講座', campaign_name: 'スタート講座1,000部突破キャンペーン', purchase_source: 'affiliate', affiliate_name: '山田太郎', affiliate_code: 'yamada_abc1', amount_total: 29800, commission_amount: 10000, commission_status: 'pending', status: 'completed', purchased_at: new Date().toISOString() },
  ];

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">🛒 購入管理</h1>
      <div className="table-container">
        <table className="table">
          <thead className="table-header">
            <tr>
              {['購入者', '商品名', 'キャンペーン', '購入経路', '紹介者', '購入金額', '報酬額', '報酬状況', '購入日'].map(h => (
                <th key={h} className="table-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {purchases.map(p => (
              <tr key={p.id} className="table-row">
                <td className="table-td">
                  <p className="font-medium">{p.buyer_line_display_name || '-'}</p>
                  <p className="text-xs text-gray-500">{p.buyer_email || '-'}</p>
                </td>
                <td className="table-td text-sm">{p.product_name}</td>
                <td className="table-td text-xs text-gray-600">{p.campaign_name || '-'}</td>
                <td className="table-td">
                  <span className={`badge ${p.purchase_source === 'affiliate' ? 'badge-blue' : 'badge-gray'}`}>
                    {p.purchase_source === 'affiliate' ? 'アフィリエイト' : p.purchase_source === 'official_line' ? '公式LINE' : '直接'}
                  </span>
                </td>
                <td className="table-td">
                  {p.affiliate_name ? (
                    <div>
                      <p className="text-sm font-medium">{p.affiliate_name}</p>
                      <p className="text-xs text-gray-500">{p.affiliate_code}</p>
                    </div>
                  ) : '-'}
                </td>
                <td className="table-td font-semibold">¥{(p.amount_total || 0).toLocaleString()}</td>
                <td className="table-td text-green-600">¥{(p.commission_amount || 0).toLocaleString()}</td>
                <td className="table-td"><StatusBadge status={p.commission_status} /></td>
                <td className="table-td text-xs">{new Date(p.purchased_at).toLocaleDateString('ja-JP')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// src/pages/admin/AdminCommissions.tsx
export function AdminCommissions() {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin-api/commissions')
      .then(r => r.ok ? r.json() : demoCommissions())
      .then(data => { setCommissions(Array.isArray(data) ? data : demoCommissions()); setLoading(false); })
      .catch(() => { setCommissions(demoCommissions()); setLoading(false); });
  }, []);

  const demoCommissions = () => [
    { id: 'c1', affiliate: { name: '山田太郎', affiliate_code: 'yamada_abc1' }, purchase: { product_name: 'AI副業スタート講座', purchased_at: new Date().toISOString(), amount_total: 29800 }, amount: 10000, status: 'pending', created_at: new Date().toISOString() },
  ];

  const handleApprove = async (id: string) => {
    await fetch(`/api/admin-api/commissions/${id}/approve`, { method: 'POST' });
    fetch('/api/admin-api/commissions').then(r => r.ok ? r.json() : demoCommissions()).then(setCommissions);
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">💰 報酬管理</h1>
      <div className="table-container">
        <table className="table">
          <thead className="table-header">
            <tr>
              {['紹介者', '商品名', '購入金額', '報酬額', 'ステータス', '発生日', '操作'].map(h => (
                <th key={h} className="table-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {commissions.map((c: any) => (
              <tr key={c.id} className="table-row">
                <td className="table-td">
                  <p className="font-medium">{c.affiliate?.name}</p>
                  <p className="text-xs text-gray-500">{c.affiliate?.affiliate_code}</p>
                </td>
                <td className="table-td text-sm">{c.purchase?.product_name}</td>
                <td className="table-td">¥{(c.purchase?.amount_total || 0).toLocaleString()}</td>
                <td className="table-td font-bold text-green-600">¥{c.amount.toLocaleString()}</td>
                <td className="table-td"><StatusBadge status={c.status} /></td>
                <td className="table-td text-xs">{new Date(c.created_at).toLocaleDateString('ja-JP')}</td>
                <td className="table-td">
                  {c.status === 'pending' && (
                    <button onClick={() => handleApprove(c.id)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200">
                      承認
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// src/pages/admin/AdminSuspicious.tsx
export function AdminSuspicious() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin-api/suspicious')
      .then(r => r.ok ? r.json() : demoEvents())
      .then(data => { setEvents(Array.isArray(data) ? data : demoEvents()); setLoading(false); })
      .catch(() => { setEvents(demoEvents()); setLoading(false); });
  }, []);

  const demoEvents = () => [
    { id: 'e1', event_type: 'high_frequency_click', description: '同一IPから1時間以内に15クリック', severity: 'medium', status: 'open', affiliate: { name: '不明' }, created_at: new Date().toISOString() },
  ];

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">⚠️ 不正チェック</h1>
      <div className="grid gap-3">
        {events.map(ev => (
          <div key={ev.id} className={`card border-l-4 ${ev.severity === 'high' ? 'border-red-500' : ev.severity === 'medium' ? 'border-yellow-500' : 'border-gray-300'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">{ev.description}</p>
                <p className="text-xs text-gray-500 mt-1">{ev.event_type} | {new Date(ev.created_at).toLocaleString('ja-JP')}</p>
              </div>
              <span className={`badge ${ev.severity === 'high' ? 'badge-red' : ev.severity === 'medium' ? 'badge-yellow' : 'badge-gray'}`}>
                {ev.severity === 'high' ? '高' : ev.severity === 'medium' ? '中' : '低'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// src/pages/admin/AdminAnnouncements.tsx
export function AdminAnnouncements() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>({ title: '', body: '', type: 'info', target_type: 'all_affiliates', is_published: true });
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin-api/announcements')
      .then(r => r.ok ? r.json() : [])
      .then(data => setAnnouncements(Array.isArray(data) ? data : []))
      .catch(() => setAnnouncements([]));
  }, []);

  const handleSave = async () => {
    const res = await fetch('/api/admin-api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await fetch('/api/admin-api/announcements').then(r => r.json());
      setAnnouncements(data);
      setModalOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">📢 お知らせ管理</h1>
        <button onClick={() => setModalOpen(true)} className="btn-primary">+ お知らせ作成</button>
      </div>
      <div className="space-y-3">
        {announcements.map((a: any) => (
          <div key={a.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{a.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{a.body}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(a.published_at).toLocaleDateString('ja-JP')}</p>
              </div>
              <span className={`badge ${a.is_published ? 'badge-green' : 'badge-gray'}`}>
                {a.is_published ? '公開中' : '非公開'}
              </span>
            </div>
          </div>
        ))}
        {announcements.length === 0 && <p className="text-gray-500 text-center py-8">お知らせがありません</p>}
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="お知らせ作成">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
            <input type="text" value={form.title} onChange={e => setForm((p: any) => ({ ...p, title: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">本文</label>
            <textarea value={form.body} onChange={e => setForm((p: any) => ({ ...p, body: e.target.value }))} className="input-field h-32 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">種類</label>
            <select value={form.type} onChange={e => setForm((p: any) => ({ ...p, type: e.target.value }))} className="select-field">
              <option value="new_product">新商品追加</option>
              <option value="new_campaign">新案件開始</option>
              <option value="campaign_paused">案件一時停止</option>
              <option value="campaign_ended">案件終了</option>
              <option value="commission_change">報酬条件変更</option>
              <option value="rule_change">ルール変更</option>
              <option value="maintenance">メンテナンス</option>
              <option value="important">重要なお知らせ</option>
              <option value="personal">個別連絡</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">配信対象</label>
            <select value={form.target_type} onChange={e => setForm((p: any) => ({ ...p, target_type: e.target.value }))} className="select-field">
              <option value="all_affiliates">全紹介者</option>
              <option value="active_affiliates">有効な紹介者のみ</option>
              <option value="pending_affiliates">審査中の紹介者のみ</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">キャンセル</button>
            <button onClick={handleSave} className="btn-primary flex-1">送信</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// src/pages/admin/AdminRanking.tsx
export function AdminRanking() {
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin-api/ranking')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setRanking(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setRanking([]); setLoading(false); });
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">🏆 紹介者ランキング</h1>
      <div className="card overflow-hidden">
        <table className="table">
          <thead className="table-header">
            <tr>
              <th className="table-th">順位</th>
              <th className="table-th">紹介者名</th>
              <th className="table-th">コード</th>
              <th className="table-th">今月報酬</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ranking.map((r: any) => (
              <tr key={r.id} className={`table-row ${r.rank <= 3 ? 'bg-yellow-50' : ''}`}>
                <td className="table-td font-bold text-xl">
                  {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `${r.rank}位`}
                </td>
                <td className="table-td font-semibold">{r.name}</td>
                <td className="table-td"><code className="text-xs">{r.affiliate_code}</code></td>
                <td className="table-td font-bold text-green-600">¥{(r.total_commission || 0).toLocaleString()}</td>
              </tr>
            ))}
            {ranking.length === 0 && (
              <tr><td colSpan={4} className="table-td text-center text-gray-500 py-8">データがありません</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// src/pages/admin/AdminCsvExport.tsx
export function AdminCsvExport() {
  const exportCsv = async (type: string) => {
    const res = await fetch(`/api/admin-api/csv/${type}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export.csv`;
      a.click();
    }
  };

  const csvTypes = [
    { key: 'purchases', label: '購入一覧', icon: '🛒' },
    { key: 'commissions', label: '報酬一覧', icon: '💰' },
    { key: 'affiliates', label: '紹介者一覧', icon: '👥' },
    { key: 'leads', label: '顧客一覧', icon: '👤' },
    { key: 'clicks', label: 'クリック一覧', icon: '👆' },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">📥 CSV出力</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {csvTypes.map(type => (
          <button
            key={type.key}
            onClick={() => exportCsv(type.key)}
            className="card card-hover text-center py-8 hover:border-blue-300 hover:bg-blue-50 transition-all"
          >
            <div className="text-4xl mb-3">{type.icon}</div>
            <p className="font-semibold text-gray-900">{type.label}</p>
            <p className="text-xs text-blue-600 mt-1">CSV出力 →</p>
          </button>
        ))}
      </div>
    </div>
  );
}
