// src/pages/practice-log/admin/AdminQuestions.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/practice-log/supabase';
import { usePracticeLogAuth } from '@/hooks/practice-log/useAuth';
import { PracticeLogLayout } from '@/components/practice-log/Layout';
import { Checkin, QuestionStatus, QUESTION_STATUSES } from '@/types/practice-log';

type CheckinWithQuestion = Checkin & {
  profiles?: { name: string; discord_name?: string };
  question_statuses?: { id: string; status: QuestionStatus; memo?: string; staff_id?: string }[];
};

const STATUS_COLOR: Record<QuestionStatus, { bg: string; text: string }> = {
  '未対応':         { bg: '#fee2e2', text: '#b91c1c' },
  '対応中':         { bg: '#fef9c3', text: '#92400e' },
  'Discordで回答済み': { bg: '#d1fae5', text: '#065f46' },
  '個別回答済み':   { bg: '#dbeafe', text: '#1e40af' },
  'FAQ化済み':      { bg: '#ede9fe', text: '#5b21b6' },
  '個別相談へ案内': { bg: '#fce7f3', text: '#9d174d' },
};

export function AdminQuestions() {
  const { profile } = usePracticeLogAuth();
  const [checkins, setCheckins] = useState<CheckinWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<QuestionStatus | 'all'>('未対応');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<QuestionStatus>('未対応');
  const [editMemo, setEditMemo] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('checkins')
      .select('*, profiles(name, discord_name), question_statuses(id, status, memo, staff_id)')
      .eq('has_question', true)
      .order('date', { ascending: false });

    if (data) setCheckins(data as CheckinWithQuestion[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getStatus = (c: CheckinWithQuestion): QuestionStatus => {
    if (!c.question_statuses || c.question_statuses.length === 0) return '未対応';
    return c.question_statuses[c.question_statuses.length - 1].status;
  };

  const getMemo = (c: CheckinWithQuestion): string => {
    if (!c.question_statuses || c.question_statuses.length === 0) return '';
    return c.question_statuses[c.question_statuses.length - 1].memo ?? '';
  };

  const startEdit = (c: CheckinWithQuestion) => {
    setEditingId(c.id);
    setEditStatus(getStatus(c));
    setEditMemo(getMemo(c));
  };

  const saveStatus = async (checkin: CheckinWithQuestion) => {
    if (!profile) return;
    setSaving(true);
    const existing = checkin.question_statuses?.[checkin.question_statuses.length - 1];
    if (existing) {
      await supabase.from('question_statuses').update({
        status: editStatus, memo: editMemo, staff_id: profile.id,
      }).eq('id', existing.id);
    } else {
      await supabase.from('question_statuses').insert({
        checkin_id: checkin.id, status: editStatus, memo: editMemo, staff_id: profile.id,
      });
    }
    setSaving(false);
    setEditingId(null);
    await load();
  };

  const filtered = filterStatus === 'all'
    ? checkins
    : checkins.filter(c => getStatus(c) === filterStatus);

  const counts = QUESTION_STATUSES.reduce((acc, s) => {
    acc[s] = checkins.filter(c => getStatus(c) === s).length;
    return acc;
  }, {} as Record<QuestionStatus, number>);

  const cardStyle = { background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,.05)', marginBottom: '12px' };

  return (
    <PracticeLogLayout>
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#1c1c1c', marginBottom: '4px' }}>❓ 質問一覧</h1>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '20px' }}>メンバーからの質問・対応ステータス管理</p>

        {/* 集計バッジ */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {QUESTION_STATUSES.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{
                padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer',
                background: filterStatus === s ? STATUS_COLOR[s].bg : '#f3f4f6',
                color: filterStatus === s ? STATUS_COLOR[s].text : '#6b7280',
                outline: filterStatus === s ? `2px solid ${STATUS_COLOR[s].text}` : 'none',
              }}>
              {s}
              <span style={{ marginLeft: '4px', background: 'rgba(0,0,0,.1)', borderRadius: '99px', padding: '1px 6px' }}>{counts[s]}</span>
            </button>
          ))}
          <button onClick={() => setFilterStatus('all')}
            style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', background: filterStatus === 'all' ? '#1c1c1c' : '#f3f4f6', color: filterStatus === 'all' ? '#fff' : '#6b7280' }}>
            全て <span style={{ marginLeft: '4px', background: 'rgba(255,255,255,.2)', borderRadius: '99px', padding: '1px 6px' }}>{checkins.length}</span>
          </button>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>読み込み中...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ ...cardStyle, textAlign: 'center', color: '#9ca3af', padding: '40px' }}>該当する質問はありません</div>
        )}

        {filtered.map(c => {
          const currentStatus = getStatus(c);
          const sc = STATUS_COLOR[currentStatus];
          const isEditing = editingId === c.id;

          return (
            <div key={c.id} style={cardStyle}>
              {/* ヘッダー行 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: '#1c1c1c' }}>{c.profiles?.name ?? '—'}</span>
                  {c.profiles?.discord_name && (
                    <span style={{ marginLeft: '6px', fontSize: '11px', color: '#6b7280' }}>@{c.profiles.discord_name}</span>
                  )}
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{c.date} · {c.category}</p>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: sc.bg, color: sc.text }}>
                  {currentStatus}
                </span>
              </div>

              {/* 質問内容 */}
              <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7, background: '#fffbeb', borderRadius: '10px', padding: '10px', marginBottom: '8px' }}>
                ❓ {c.question_text}
              </p>

              {/* つまずき（参考情報） */}
              {c.stuck_text && (
                <p style={{ fontSize: '12px', color: '#d97706', marginBottom: '8px' }}>つまずき: {c.stuck_text}</p>
              )}

              {/* メモ表示 */}
              {getMemo(c) && !isEditing && (
                <p style={{ fontSize: '12px', color: '#6b7280', background: '#f9fafb', borderRadius: '8px', padding: '8px', marginBottom: '8px' }}>
                  📝 {getMemo(c)}
                </p>
              )}

              {/* 編集フォーム */}
              {isEditing ? (
                <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '12px', marginTop: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>ステータス変更</label>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value as QuestionStatus)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', marginBottom: '8px', background: '#fff' }}>
                    {QUESTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <textarea value={editMemo} onChange={e => setEditMemo(e.target.value)} placeholder="対応メモ（任意）" rows={2}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', marginBottom: '8px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => saveStatus(c)} disabled={saving}
                      style={{ flex: 1, padding: '8px', background: '#f97316', color: '#fff', fontWeight: 800, fontSize: '13px', borderRadius: '10px', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                      {saving ? '保存中...' : '保存'}
                    </button>
                    <button onClick={() => setEditingId(null)}
                      style={{ flex: 1, padding: '8px', background: '#e5e7eb', color: '#374151', fontWeight: 700, fontSize: '13px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => startEdit(c)}
                  style={{ width: '100%', padding: '8px', background: '#fff7ed', color: '#c2410c', fontWeight: 700, fontSize: '13px', borderRadius: '10px', border: '1.5px solid #fed7aa', cursor: 'pointer', marginTop: '4px' }}>
                  対応ステータスを更新
                </button>
              )}
            </div>
          );
        })}
      </div>
    </PracticeLogLayout>
  );
}
