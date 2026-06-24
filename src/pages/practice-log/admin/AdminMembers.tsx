// src/pages/practice-log/admin/AdminMembers.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/practice-log/supabase';
import { PracticeLogLayout } from '@/components/practice-log/Layout';
import { Profile, Role, Status, Stage, STAGES } from '@/types/practice-log';

export function AdminMembers() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Profile>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const load = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    if (data) setMembers(data as Profile[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (id: string) => {
    await supabase.from('profiles').update({ ...editData, updated_at: new Date().toISOString() }).eq('id', id);
    setEditId(null);
    await load();
  };

  const filtered = filterStatus === 'all' ? members : members.filter(m => m.status === filterStatus);

  const statusColor: Record<string, string> = {
    active: '#22c55e', paused: '#f59e0b', graduated: '#8b5cf6', cancelled: '#9ca3af',
  };

  const roleLabel: Record<string, string> = { member: 'メンバー', staff: 'スタッフ', admin: '管理者' };

  return (
    <PracticeLogLayout>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#1c1c1c' }}>👥 メンバー管理</h1>
          <button onClick={() => setShowAdd(!showAdd)} style={{
            background: 'linear-gradient(135deg,#f97316,#fb923c)', color: '#fff',
            fontWeight: 800, fontSize: '13px', padding: '8px 14px',
            borderRadius: '10px', border: 'none', cursor: 'pointer',
          }}>+ 追加</button>
        </div>

        {/* フィルター */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {['all', 'active', 'paused', 'graduated', 'cancelled'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
              border: filterStatus === s ? '2px solid #f97316' : '1.5px solid #e5e7eb',
              background: filterStatus === s ? '#fff7ed' : '#fafafa',
              color: filterStatus === s ? '#ea580c' : '#6b7280', cursor: 'pointer',
            }}>{s === 'all' ? 'すべて' : s}</button>
          ))}
        </div>

        {/* 新規追加フォーム */}
        {showAdd && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
            <p style={{ fontWeight: 800, fontSize: '13px', marginBottom: '10px', color: '#374151' }}>新規メンバー追加（Supabase Auth側で先にアカウント作成後、profilesを更新してください）</p>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="名前" style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #e5e7eb', marginBottom: '8px', boxSizing: 'border-box', fontSize: '14px' }} />
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="メールアドレス" style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #e5e7eb', marginBottom: '8px', boxSizing: 'border-box', fontSize: '14px' }} />
            <p style={{ fontSize: '11px', color: '#9ca3af' }}>※ Supabase ダッシュボード → Authentication → Users からアカウントを作成してください</p>
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: 'center', color: '#9ca3af' }}>読み込み中...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(m => (
              <div key={m.id} style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
                {editId === m.id ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700 }}>名前</label>
                        <input value={editData.name ?? m.name} onChange={e => setEditData({ ...editData, name: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700 }}>期生</label>
                        <input value={editData.generation ?? m.generation ?? ''} onChange={e => setEditData({ ...editData, generation: e.target.value })}
                          placeholder="例：1期生" style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700 }}>権限</label>
                        <select value={editData.role ?? m.role} onChange={e => setEditData({ ...editData, role: e.target.value as Role })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px' }}>
                          <option value="member">member</option>
                          <option value="staff">staff</option>
                          <option value="admin">admin</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700 }}>ステータス</label>
                        <select value={editData.status ?? m.status} onChange={e => setEditData({ ...editData, status: e.target.value as Status })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px' }}>
                          <option value="active">active</option>
                          <option value="paused">paused</option>
                          <option value="graduated">graduated</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700 }}>現在地</label>
                        <select value={editData.current_stage ?? m.current_stage ?? '土台づくり中'} onChange={e => setEditData({ ...editData, current_stage: e.target.value as Stage })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px' }}>
                          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700 }}>Discord名</label>
                        <input value={editData.discord_name ?? m.discord_name ?? ''} onChange={e => setEditData({ ...editData, discord_name: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700 }}>開始日</label>
                        <input type="date" value={editData.start_date ?? m.start_date ?? ''} onChange={e => setEditData({ ...editData, start_date: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700 }}>終了日</label>
                        <input type="date" value={editData.end_date ?? m.end_date ?? ''} onChange={e => setEditData({ ...editData, end_date: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleSave(m.id)} style={{ flex: 1, padding: '10px', background: '#f97316', color: '#fff', fontWeight: 800, fontSize: '13px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>保存</button>
                      <button onClick={() => { setEditId(null); setEditData({}); }} style={{ flex: 1, padding: '10px', background: '#f3f4f6', color: '#374151', fontWeight: 700, fontSize: '13px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>キャンセル</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '15px', color: '#1c1c1c' }}>{m.name}</span>
                        {m.generation && <span style={{ marginLeft: '8px', fontSize: '11px', background: '#ede9fe', color: '#7c3aed', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>{m.generation}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: statusColor[m.status] ?? '#9ca3af' }}>● {m.status}</span>
                        <button onClick={() => { setEditId(m.id); setEditData({}); }} style={{ fontSize: '12px', background: '#f3f4f6', border: 'none', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', color: '#374151' }}>編集</button>
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>{m.email}</p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', background: '#fff7ed', color: '#92400e', padding: '2px 8px', borderRadius: '999px' }}>{roleLabel[m.role]}</span>
                      <span style={{ fontSize: '11px', background: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: '999px' }}>{m.current_stage ?? '未設定'}</span>
                      {m.start_date && <span style={{ fontSize: '11px', color: '#9ca3af' }}>開始: {m.start_date}</span>}
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <Link to={`/practice-log/admin/members/${m.id}`} style={{ fontSize: '12px', color: '#f97316', textDecoration: 'none', fontWeight: 700 }}>詳細を見る →</Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PracticeLogLayout>
  );
}
