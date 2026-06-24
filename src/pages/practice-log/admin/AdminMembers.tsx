// src/pages/practice-log/admin/AdminMembers.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/practice-log/supabase';
import { usePracticeLogAuth } from '@/hooks/practice-log/useAuth';
import { PracticeLogLayout } from '@/components/practice-log/Layout';
import { Profile, Role, Status, Stage, STAGES } from '@/types/practice-log';

export function AdminMembers() {
  const { profile: myProfile } = usePracticeLogAuth();
  const isAdmin = myProfile?.role === 'admin';
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Profile>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // 招待フォーム
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteGeneration, setInviteGeneration] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const load = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    if (data) setMembers(data as Profile[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // 招待メール送信
  const handleInvite = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setInviteResult({ ok: false, msg: '名前とメールアドレスを入力してください' });
      return;
    }
    setInviting(true);
    setInviteResult(null);

    // signUp で招待（確認メールが届く）
    const { error: signUpError } = await supabase.auth.signUp({
      email: inviteEmail,
      password: Math.random().toString(36).slice(-8) + 'Aa1!',
      options: {
        data: { name: inviteName },
        emailRedirectTo: 'https://mio-mainsite.netlify.app/practice-log/login',
      },
    });

    if (signUpError) {
      setInviteResult({ ok: false, msg: `エラー: ${signUpError.message}` });
      setInviting(false);
      return;
    }

    // profiles テーブルに追加情報を更新（少し待ってから）
    await new Promise(r => setTimeout(r, 1500));
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', inviteEmail)
      .single();

    if (profileData) {
      await supabase.from('profiles').update({
        name: inviteName,
        generation: inviteGeneration || null,
        start_date: new Date().toISOString().split('T')[0],
      }).eq('id', profileData.id);
    }

    setInviteResult({ ok: true, msg: `${inviteName} さんに確認メールを送信しました！メールのリンクからパスワードを設定してもらってください。` });
    setInviteName('');
    setInviteEmail('');
    setInviteGeneration('');
    setInviting(false);
    await load();
  };

  const handleSave = async (id: string) => {
    await supabase.from('profiles').update({ ...editData, updated_at: new Date().toISOString() }).eq('id', id);
    setEditId(null);
    await load();
  };

  const filtered = filterStatus === 'all' ? members : members.filter(m => m.status === filterStatus);

  const statusColor: Record<string, string> = {
    active: '#22c55e', paused: '#f59e0b', graduated: '#8b5cf6', cancelled: '#9ca3af',
  };
  const statusLabel: Record<string, string> = {
    active: '受講中', paused: '一時停止', graduated: '卒業', cancelled: '解約',
  };
  const roleLabel: Record<string, string> = { member: 'メンバー', staff: 'スタッフ', admin: '管理者' };

  return (
    <PracticeLogLayout>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#1c1c1c' }}>👥 メンバー管理</h1>
          {isAdmin && (
            <button onClick={() => { setShowAdd(!showAdd); setInviteResult(null); }} style={{
              background: showAdd ? '#f3f4f6' : 'linear-gradient(135deg,#f97316,#fb923c)',
              color: showAdd ? '#374151' : '#fff',
              fontWeight: 800, fontSize: '13px', padding: '8px 14px',
              borderRadius: '10px', border: 'none', cursor: 'pointer',
            }}>{showAdd ? '✕ 閉じる' : '+ メンバー招待'}</button>
          )}
        </div>

        {/* 招待フォーム（adminのみ） */}
        {isAdmin && showAdd && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '18px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(0,0,0,.08)', border: '1.5px solid #fed7aa' }}>
            <p style={{ fontWeight: 800, fontSize: '14px', color: '#92400e', marginBottom: '6px' }}>📨 メンバーを招待</p>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '14px', lineHeight: 1.6 }}>
              メンバーのメールアドレスに確認メールが届きます。メールのリンクからパスワードを設定してログインできます。
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  名前 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="例：田中みお"
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  メールアドレス <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="例：tanaka@example.com"
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  期生（任意）
                </label>
                <input
                  value={inviteGeneration}
                  onChange={e => setInviteGeneration(e.target.value)}
                  placeholder="例：1期生"
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {inviteResult && (
              <div style={{
                padding: '10px 14px', borderRadius: '10px', marginBottom: '12px',
                fontSize: '13px', fontWeight: 700, lineHeight: 1.6,
                background: inviteResult.ok ? '#d1fae5' : '#fee2e2',
                color: inviteResult.ok ? '#065f46' : '#b91c1c',
              }}>
                {inviteResult.ok ? '✅ ' : '❌ '}{inviteResult.msg}
              </div>
            )}

            <button
              onClick={handleInvite}
              disabled={inviting}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
                cursor: inviting ? 'not-allowed' : 'pointer',
                background: inviting ? '#f3f4f6' : 'linear-gradient(135deg,#f97316,#fb923c)',
                color: inviting ? '#9ca3af' : '#fff',
                fontWeight: 800, fontSize: '14px',
              }}>
              {inviting ? '送信中...' : '📨 招待メールを送信する'}
            </button>
          </div>
        )}

        {/* フィルター */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {['all', 'active', 'paused', 'graduated', 'cancelled'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
              border: filterStatus === s ? '2px solid #f97316' : '1.5px solid #e5e7eb',
              background: filterStatus === s ? '#fff7ed' : '#fafafa',
              color: filterStatus === s ? '#ea580c' : '#6b7280', cursor: 'pointer',
            }}>
              {s === 'all'
                ? `すべて(${members.length})`
                : `${statusLabel[s]}(${members.filter(m => m.status === s).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>読み込み中...</p>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#9ca3af', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
            該当するメンバーはいません
          </div>
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

                      {/* 権限・ステータス変更はadminのみ */}
                      {isAdmin ? (
                        <>
                          <div>
                            <label style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700 }}>権限</label>
                            <select value={editData.role ?? m.role} onChange={e => setEditData({ ...editData, role: e.target.value as Role })}
                              style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px' }}>
                              <option value="member">member（メンバー）</option>
                              <option value="staff">staff（スタッフ）</option>
                              <option value="admin">admin（管理者）</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700 }}>ステータス</label>
                            <select value={editData.status ?? m.status} onChange={e => setEditData({ ...editData, status: e.target.value as Status })}
                              style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px' }}>
                              <option value="active">active（受講中）</option>
                              <option value="paused">paused（一時停止）</option>
                              <option value="graduated">graduated（卒業）</option>
                              <option value="cancelled">cancelled（解約）</option>
                            </select>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700 }}>権限</label>
                            <p style={{ fontSize: '13px', fontWeight: 700, color: '#374151', padding: '8px 0' }}>{roleLabel[m.role]}（変更不可）</p>
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700 }}>ステータス</label>
                            <p style={{ fontSize: '13px', fontWeight: 700, color: '#374151', padding: '8px 0' }}>{statusLabel[m.status]}（変更不可）</p>
                          </div>
                        </>
                      )}

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
                        <span style={{ fontSize: '11px', fontWeight: 700, color: statusColor[m.status] ?? '#9ca3af' }}>● {statusLabel[m.status] ?? m.status}</span>
                        <button onClick={() => { setEditId(m.id); setEditData({}); }} style={{ fontSize: '12px', background: '#f3f4f6', border: 'none', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', color: '#374151' }}>編集</button>
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>{m.email}</p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', background: '#fff7ed', color: '#92400e', padding: '2px 8px', borderRadius: '999px' }}>{roleLabel[m.role]}</span>
                      <span style={{ fontSize: '11px', background: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: '999px' }}>{m.current_stage ?? '未設定'}</span>
                      {m.discord_name && <span style={{ fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '999px' }}>@{m.discord_name}</span>}
                      {m.start_date && <span style={{ fontSize: '11px', color: '#9ca3af' }}>開始: {m.start_date}</span>}
                    </div>
                    <div style={{ marginTop: '10px' }}>
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
