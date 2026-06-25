// src/pages/practice-log/CalendarPage.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/practice-log/supabase';
import { usePracticeLogAuth } from '@/hooks/practice-log/useAuth';
import { PracticeLogLayout } from '@/components/practice-log/Layout';
import { Checkin, STAMP_MAP } from '@/types/practice-log';

export function CalendarPage() {
  const { user } = usePracticeLogAuth();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth()); // 0-indexed

  useEffect(() => {
    if (!user) return;
    supabase.from('checkins').select('*').eq('user_id', user.id)
      .then(({ data }) => { if (data) setCheckins(data as Checkin[]); });
  }, [user]);

  const getStamp = (date: string) => {
    const c = checkins.find(ch => ch.date === date);
    if (!c) return null;
    if (c.mood === '励ましがほしい') return STAMP_MAP.encourage;
    if (c.has_question) return STAMP_MAP.question;
    if (c.category === '今日はできなかった') return STAMP_MAP.comeback;
    return STAMP_MAP.default;
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const monthCheckins = checkins.filter(c => c.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`));

  return (
    <PracticeLogLayout>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#1c1c1c', marginBottom: '20px' }}>📅 報告カレンダー</h1>

        {/* 月ナビ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <button onClick={prevMonth} style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '16px' }}>‹</button>
          <span style={{ fontWeight: 800, fontSize: '17px', color: '#1c1c1c' }}>{year}年 {month + 1}月</span>
          <button onClick={nextMonth} style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '16px' }}>›</button>
        </div>

        {/* カレンダー */}
        <div style={{ background: '#fff', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,.05)', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px', marginBottom: '8px' }}>
            {['日','月','火','水','木','金','土'].map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: '12px', fontWeight: 700, color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#9ca3af', padding: '4px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px' }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const stamp = getStamp(dateStr);
              const isToday = dateStr === today;
              return (
                <div key={d} style={{
                  textAlign: 'center', padding: '6px 2px', borderRadius: '10px',
                  background: isToday ? '#fff7ed' : 'transparent',
                  border: isToday ? '2px solid #f97316' : '2px solid transparent',
                }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>{d}</div>
                  <div style={{ fontSize: '18px', lineHeight: 1 }}>{stamp ?? <span style={{ color: '#e5e7eb', fontSize: '14px' }}>·</span>}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 凡例 */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,.04)', marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>スタンプの意味</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {[
              { stamp: '✅', label: '通常報告' },
              { stamp: '❓', label: '質問した日' },
              { stamp: '💛', label: '励まし希望' },
              { stamp: '🌱', label: '休んで戻ってきた日' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '16px' }}>{item.stamp}</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 月の統計 */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
          <p style={{ fontSize: '13px', fontWeight: 800, color: '#1c1c1c', marginBottom: '10px' }}>📊 {month + 1}月の記録</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#f97316' }}>{monthCheckins.length}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>報告日数</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#8b5cf6' }}>{monthCheckins.filter(c => c.has_question).length}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>質問日数</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#06b6d4' }}>{Math.round((monthCheckins.length / daysInMonth) * 100)}%</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>報告率</div>
            </div>
          </div>
        </div>
      </div>
    </PracticeLogLayout>
  );
}
