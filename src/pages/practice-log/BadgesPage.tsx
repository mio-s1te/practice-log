// src/pages/practice-log/BadgesPage.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/practice-log/supabase';
import { usePracticeLogAuth } from '@/hooks/practice-log/useAuth';
import { PracticeLogLayout } from '@/components/practice-log/Layout';
import { Badge, UserBadge } from '@/types/practice-log';

export function BadgesPage() {
  const { user } = usePracticeLogAuth();
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('badges').select('*').order('created_at'),
      supabase.from('user_badges').select('*').eq('user_id', user.id),
    ]).then(([b, ub]) => {
      if (b.data) setAllBadges(b.data as Badge[]);
      if (ub.data) setUserBadges(ub.data as UserBadge[]);
    });
  }, [user]);

  const earned = new Set(userBadges.map(ub => ub.badge_id));

  return (
    <PracticeLogLayout>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#1c1c1c', marginBottom: '6px' }}>🏅 バッジ一覧</h1>
        <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '24px' }}>
          {userBadges.length} / {allBadges.length} 個獲得
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {allBadges.map(b => {
            const got = earned.has(b.id);
            const ub = userBadges.find(u => u.badge_id === b.id);
            return (
              <div key={b.id} style={{
                background: got ? '#fff' : '#f9fafb',
                borderRadius: '16px', padding: '16px 14px', textAlign: 'center',
                boxShadow: got ? '0 2px 12px rgba(0,0,0,.07)' : 'none',
                border: got ? '1.5px solid #fed7aa' : '1.5px solid #f3f4f6',
                opacity: got ? 1 : 0.5,
              }}>
                <div style={{ fontSize: '32px', marginBottom: '6px', filter: got ? 'none' : 'grayscale(1)' }}>
                  {b.emoji ?? '🏅'}
                </div>
                <p style={{ fontSize: '13px', fontWeight: 800, color: got ? '#1c1c1c' : '#9ca3af', marginBottom: '4px' }}>
                  {b.name}
                </p>
                <p style={{ fontSize: '11px', color: '#9ca3af', lineHeight: 1.5 }}>{b.description}</p>
                {got && ub && (
                  <p style={{ fontSize: '10px', color: '#f97316', marginTop: '6px', fontWeight: 700 }}>
                    {new Date(ub.awarded_at).toLocaleDateString('ja-JP')} 獲得
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PracticeLogLayout>
  );
}
