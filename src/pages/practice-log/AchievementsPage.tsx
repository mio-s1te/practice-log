// src/pages/practice-log/AchievementsPage.tsx
import { useEffect, useState, FormEvent } from 'react';
import { supabase } from '@/lib/practice-log/supabase';
import { usePracticeLogAuth } from '@/hooks/practice-log/useAuth';
import { PracticeLogLayout } from '@/components/practice-log/Layout';
import { Achievement, PublicOk } from '@/types/practice-log';

export function AchievementsPage() {
  const { user } = usePracticeLogAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState('');
  const [publicOk, setPublicOk] = useState<PublicOk>('OK');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('achievements').select('*').eq('user_id', user.id).order('date', { ascending: false });
    if (data) setAchievements(data as Achievement[]);
  };

  useEffect(() => { load(); }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !text.trim()) return;
    setSubmitting(true);
    await supabase.from('achievements').insert({ user_id: user.id, achievement_text: text, public_ok: publicOk });
    setText(''); setPublicOk('OK'); setShowForm(false);
    await load();
    setSubmitting(false);
  };

  return (
    <PracticeLogLayout>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#1c1c1c' }}>⭐ 成果報告</h1>
          <button onClick={() => setShowForm(!showForm)} style={{
            background: 'linear-gradient(135deg,#f97316,#fb923c)', color: '#fff',
            fontWeight: 800, fontSize: '13px', padding: '8px 16px',
            borderRadius: '10px', border: 'none', cursor: 'pointer',
          }}>+ 成果を追加</button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>成果内容 *</label>
            <textarea
              value={text} onChange={e => setText(e.target.value)} required rows={3}
              placeholder="例：初クリックが出た！LP完成した！など"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box', marginBottom: '12px', resize: 'vertical', fontFamily: 'inherit' }}
            />
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>外部掲載</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['OK', '匿名ならOK', 'NG'] as PublicOk[]).map(v => (
                <button key={v} type="button" onClick={() => setPublicOk(v)} style={{
                  flex: 1, padding: '9px 4px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                  border: publicOk === v ? '2px solid #f97316' : '1.5px solid #e5e7eb',
                  background: publicOk === v ? '#fff7ed' : '#fafafa',
                  color: publicOk === v ? '#ea580c' : '#6b7280', cursor: 'pointer',
                }}>{v}</button>
              ))}
            </div>
            <button type="submit" disabled={submitting} style={{
              width: '100%', padding: '13px', background: submitting ? '#d1d5db' : 'linear-gradient(135deg,#f97316,#fb923c)',
              color: '#fff', fontWeight: 900, fontSize: '15px', borderRadius: '12px', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
            }}>{submitting ? '送信中...' : '成果を記録する'}</button>
          </form>
        )}

        {achievements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>⭐</div>
            <p>まだ成果がありません。小さなことから記録しよう！</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {achievements.map(a => (
              <div key={a.id} style={{ background: '#fff', borderRadius: '16px', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#9ca3af' }}>{a.date}</span>
                  <span style={{ fontSize: '11px', background: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>{a.public_ok}</span>
                </div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#1c1c1c', lineHeight: 1.65 }}>⭐ {a.achievement_text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PracticeLogLayout>
  );
}
