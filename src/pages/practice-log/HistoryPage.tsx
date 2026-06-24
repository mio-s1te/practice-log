// src/pages/practice-log/HistoryPage.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/practice-log/supabase';
import { usePracticeLogAuth } from '@/hooks/practice-log/useAuth';
import { PracticeLogLayout } from '@/components/practice-log/Layout';
import { Checkin } from '@/types/practice-log';

export function HistoryPage() {
  const { user } = usePracticeLogAuth();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('checkins').select('*').eq('user_id', user.id)
      .order('date', { ascending: false })
      .then(({ data }) => { if (data) setCheckins(data as Checkin[]); setLoading(false); });
  }, [user]);

  const moodColor: Record<string, string> = {
    '順調': '#22c55e', '少し止まった': '#f59e0b',
    '質問したい': '#3b82f6', '励ましがほしい': '#f97316', '個別相談が必要かも': '#ef4444',
  };

  return (
    <PracticeLogLayout>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#1c1c1c', marginBottom: '20px' }}>📋 報告履歴</h1>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#9ca3af' }}>読み込み中...</p>
        ) : checkins.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📝</div>
            <p>まだ記録がありません</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {checkins.map(c => (
              <div key={c.id} style={{ background: '#fff', borderRadius: '16px', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#374151' }}>{c.date.replace(/-/g, '/')}</span>
                    <span style={{ marginLeft: '8px', fontSize: '12px', background: '#fff7ed', color: '#ea580c', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>{c.category}</span>
                  </div>
                  {c.mood && (
                    <span style={{ fontSize: '11px', fontWeight: 700, color: moodColor[c.mood] ?? '#6b7280' }}>{c.mood}</span>
                  )}
                </div>
                {c.section && <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>📍 {c.section}</p>}
                {c.done_text && (
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#22c55e' }}>✅ できたこと</span>
                    <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.65, marginTop: '2px' }}>{c.done_text}</p>
                  </div>
                )}
                {c.stuck_text && (
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b' }}>🤔 つまずき</span>
                    <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.65, marginTop: '2px' }}>{c.stuck_text}</p>
                  </div>
                )}
                {c.has_question && c.question_text && (
                  <div style={{ marginBottom: '8px', background: '#eff6ff', borderRadius: '8px', padding: '8px 12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6' }}>❓ 質問</span>
                    <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.65, marginTop: '2px' }}>{c.question_text}</p>
                  </div>
                )}
                {c.next_text && (
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#8b5cf6' }}>📌 明日やること</span>
                    <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.65, marginTop: '2px' }}>{c.next_text}</p>
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
