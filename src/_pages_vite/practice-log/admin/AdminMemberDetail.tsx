// src/pages/practice-log/admin/AdminMemberDetail.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/practice-log/supabase';
import { usePracticeLogAuth } from '@/hooks/practice-log/useAuth';
import { PracticeLogLayout } from '@/components/practice-log/Layout';
import { Profile, Checkin, Achievement, UserBadge, StaffNote } from '@/types/practice-log';

export function AdminMemberDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile: myProfile } = usePracticeLogAuth();
  const [member, setMember] = useState<Profile | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [notes, setNotes] = useState<StaffNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [followupDate, setFollowupDate] = useState('');
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const load = async () => {
    if (!id) return;
    const [m, c, a, b, n] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('checkins').select('*').eq('user_id', id).order('date', { ascending: false }).limit(60),
      supabase.from('achievements').select('*').eq('user_id', id).order('date', { ascending: false }),
      supabase.from('user_badges').select('*, badges(*)').eq('user_id', id),
      supabase.from('staff_notes').select('*, staff:staff_id(name)').eq('user_id', id).order('created_at', { ascending: false }),
    ]);
    if (m.data) setMember(m.data as Profile);
    if (c.data) setCheckins(c.data as Checkin[]);
    if (a.data) setAchievements(a.data as Achievement[]);
    if (b.data) setBadges(b.data as UserBadge[]);
    if (n.data) setNotes(n.data as StaffNote[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const addNote = async () => {
    if (!id || !myProfile || !newNote.trim()) return;
    await supabase.from('staff_notes').insert({
      user_id: id, staff_id: myProfile.id,
      note: newNote, next_followup_date: followupDate || null,
    });
    setNewNote(''); setFollowupDate('');
    await load();
  };

  if (loading || !member) return (
    <PracticeLogLayout><div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>読み込み中...</div></PracticeLogLayout>
  );

  const streak = (() => {
    const dates = checkins.map(c => c.date).sort().reverse();
    let s = 0; let cur = new Date();
    const todayDone = dates.includes(today);
    if (!todayDone) cur.setDate(cur.getDate() - 1);
    for (let i = 0; i < 60; i++) {
      const d = cur.toISOString().split('T')[0];
      if (dates.includes(d)) { s++; cur.setDate(cur.getDate() - 1); } else break;
    }
    return s;
  })();

  const cardStyle = { background: '#fff', borderRadius: '16px', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,.05)', marginBottom: '14px' };

  return (
    <PracticeLogLayout>
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#1c1c1c', marginBottom: '4px' }}>{member.name}</h1>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '20px' }}>{member.email} · {member.generation ?? '期生未設定'}</p>

        {/* 基本情報 */}
        <div style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { label: '権限', value: member.role },
              { label: 'ステータス', value: member.status },
              { label: '現在地', value: member.current_stage ?? '-' },
              { label: 'Discord', value: member.discord_name ?? '-' },
              { label: '開始日', value: member.start_date ?? '-' },
              { label: '終了日', value: member.end_date ?? '-' },
              { label: '連続報告', value: `${streak}日` },
              { label: '報告数', value: `${checkins.length}回` },
            ].map(item => (
              <div key={item.label}>
                <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 700 }}>{item.label}</p>
                <p style={{ fontSize: '14px', fontWeight: 800, color: '#1c1c1c' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 最近のチェックイン */}
        <div style={cardStyle}>
          <p style={{ fontWeight: 800, fontSize: '14px', marginBottom: '12px' }}>📋 最近の報告（最新5件）</p>
          {checkins.slice(0, 5).map(c => (
            <div key={c.id} style={{ borderLeft: '3px solid #fed7aa', paddingLeft: '12px', marginBottom: '10px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#92400e' }}>{c.date} · {c.category}</p>
              {c.done_text && <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{c.done_text}</p>}
              {c.stuck_text && <p style={{ fontSize: '12px', color: '#f59e0b' }}>つまずき: {c.stuck_text}</p>}
              {c.has_question && <p style={{ fontSize: '12px', color: '#3b82f6' }}>❓ {c.question_text}</p>}
            </div>
          ))}
        </div>

        {/* 成果 */}
        {achievements.length > 0 && (
          <div style={cardStyle}>
            <p style={{ fontWeight: 800, fontSize: '14px', marginBottom: '12px' }}>⭐ 成果報告</p>
            {achievements.map(a => (
              <div key={a.id} style={{ borderLeft: '3px solid #fbbf24', paddingLeft: '12px', marginBottom: '8px' }}>
                <p style={{ fontSize: '13px', color: '#374151' }}>{a.achievement_text}</p>
                <p style={{ fontSize: '11px', color: '#9ca3af' }}>{a.date}</p>
              </div>
            ))}
          </div>
        )}

        {/* バッジ */}
        {badges.length > 0 && (
          <div style={cardStyle}>
            <p style={{ fontWeight: 800, fontSize: '14px', marginBottom: '12px' }}>🏅 獲得バッジ</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {badges.map(ub => (
                <span key={ub.id} style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '5px 10px', fontSize: '12px', color: '#92400e', fontWeight: 700 }}>
                  {(ub.badges as any)?.emoji} {(ub.badges as any)?.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 運営メモ */}
        <div style={cardStyle}>
          <p style={{ fontWeight: 800, fontSize: '14px', marginBottom: '12px' }}>📝 運営メモ</p>
          <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="メモを入力..." rows={3}
            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '13px', marginBottom: '8px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input type="date" value={followupDate} onChange={e => setFollowupDate(e.target.value)}
              style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px' }} />
            <button onClick={addNote} style={{ padding: '8px 16px', background: '#f97316', color: '#fff', fontWeight: 800, fontSize: '13px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>メモ追加</button>
          </div>
          {notes.map(n => (
            <div key={n.id} style={{ borderLeft: '3px solid #d1d5db', paddingLeft: '12px', marginBottom: '10px' }}>
              <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.65 }}>{n.note}</p>
              <p style={{ fontSize: '11px', color: '#9ca3af' }}>
                {new Date(n.created_at).toLocaleDateString('ja-JP')} · {(n.staff as any)?.name ?? 'スタッフ'}
                {n.next_followup_date && ` · 次回: ${n.next_followup_date}`}
              </p>
            </div>
          ))}
        </div>
      </div>
    </PracticeLogLayout>
  );
}
