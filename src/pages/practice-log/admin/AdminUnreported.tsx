// src/pages/practice-log/admin/AdminUnreported.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/practice-log/supabase';
import { PracticeLogLayout } from '@/components/practice-log/Layout';
import { Profile } from '@/types/practice-log';

type MemberWithLastCheckin = Profile & {
  lastDate: string | null;
  daysSince: number;
};

function getDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split('T')[0];
}

function daysBetween(dateStr: string): number {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

const FILTERS = [
  { label: '今日未報告', days: 1, color: '#d1fae5', textColor: '#065f46' },
  { label: '3日以上', days: 3, color: '#fef9c3', textColor: '#92400e' },
  { label: '7日以上', days: 7, color: '#fee2e2', textColor: '#b91c1c' },
  { label: '14日以上', days: 14, color: '#fce7f3', textColor: '#9d174d' },
];

export function AdminUnreported() {
  const [members, setMembers] = useState<MemberWithLastCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDays, setFilterDays] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // アクティブメンバー取得
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'active')
        .eq('role', 'member')
        .order('name');

      if (!profiles) { setLoading(false); return; }

      // 各メンバーの最終チェックイン日を取得
      const memberIds = profiles.map(p => p.id);
      const { data: recentCheckins } = await supabase
        .from('checkins')
        .select('user_id, date')
        .in('user_id', memberIds)
        .gte('date', getDateStr(30))
        .order('date', { ascending: false });

      // 各メンバーの最終日を集計
      const lastDateMap: Record<string, string> = {};
      recentCheckins?.forEach(c => {
        if (!lastDateMap[c.user_id] || c.date > lastDateMap[c.user_id]) {
          lastDateMap[c.user_id] = c.date;
        }
      });

      const result: MemberWithLastCheckin[] = profiles.map(p => {
        const lastDate = lastDateMap[p.id] ?? null;
        const daysSince = lastDate ? daysBetween(lastDate) : 999;
        return { ...p, lastDate, daysSince };
      });

      setMembers(result);
      setLoading(false);
    };

    load();
  }, []);

  const filtered = members
    .filter(m => m.daysSince >= filterDays)
    .sort((a, b) => b.daysSince - a.daysSince);

  const today = new Date().toISOString().split('T')[0];

  const cardStyle = { background: '#fff', borderRadius: '14px', padding: '14px 16px', boxShadow: '0 2px 6px rgba(0,0,0,.05)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' as const, alignItems: 'center' as const };

  return (
    <PracticeLogLayout>
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#1c1c1c', marginBottom: '4px' }}>📭 未報告者一覧</h1>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>アクティブメンバーの報告状況</p>

        {/* フィルタータブ */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' as const }}>
          {FILTERS.map(f => (
            <button key={f.days} onClick={() => setFilterDays(f.days)}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer',
                background: filterDays === f.days ? f.color : '#f3f4f6',
                color: filterDays === f.days ? f.textColor : '#6b7280',
                outline: filterDays === f.days ? `2px solid ${f.textColor}` : 'none',
              }}>
              {f.label}
              <span style={{ marginLeft: '5px', background: 'rgba(0,0,0,.1)', borderRadius: '99px', padding: '1px 6px' }}>
                {members.filter(m => m.daysSince >= f.days).length}
              </span>
            </button>
          ))}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>読み込み中...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#9ca3af', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
            🎉 {filterDays === 1 ? '全員が今日報告済みです！' : `${filterDays}日以上未報告のメンバーはいません`}
          </div>
        )}

        {/* ヘッダー */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 700 }}>名前 / 期生</span>
            <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 700 }}>最終報告 / 経過</span>
          </div>
        )}

        {filtered.map(m => {
          const urgencyColor =
            m.daysSince >= 14 ? '#b91c1c' :
            m.daysSince >= 7 ? '#d97706' :
            m.daysSince >= 3 ? '#92400e' : '#374151';

          return (
            <div key={m.id} style={cardStyle}>
              <div>
                <p style={{ fontWeight: 800, fontSize: '14px', color: '#1c1c1c' }}>{m.name}</p>
                <p style={{ fontSize: '11px', color: '#9ca3af' }}>
                  {m.generation ?? '期生未設定'}
                  {m.discord_name && ` · @${m.discord_name}`}
                </p>
              </div>
              <div style={{ textAlign: 'right' as const }}>
                <p style={{ fontSize: '13px', fontWeight: 800, color: urgencyColor }}>
                  {m.daysSince === 999 ? '報告なし' : `${m.daysSince}日経過`}
                </p>
                <p style={{ fontSize: '11px', color: '#9ca3af' }}>
                  {m.lastDate ? m.lastDate : '—'}
                </p>
              </div>
            </div>
          );
        })}

        {/* アクティブ全体サマリー */}
        {!loading && (
          <div style={{ background: '#fff7ed', borderRadius: '14px', padding: '14px 16px', marginTop: '20px', border: '1px solid #fed7aa' }}>
            <p style={{ fontSize: '13px', fontWeight: 800, color: '#92400e', marginBottom: '8px' }}>📊 本日の報告状況</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' as const }}>
              <div>
                <p style={{ fontSize: '22px', fontWeight: 900, color: '#f97316' }}>
                  {members.filter(m => m.lastDate === today).length}
                </p>
                <p style={{ fontSize: '11px', color: '#9ca3af' }}>本日報告</p>
              </div>
              <div>
                <p style={{ fontSize: '22px', fontWeight: 900, color: '#d97706' }}>
                  {members.filter(m => m.daysSince >= 1).length}
                </p>
                <p style={{ fontSize: '11px', color: '#9ca3af' }}>未報告</p>
              </div>
              <div>
                <p style={{ fontSize: '22px', fontWeight: 900, color: '#374151' }}>{members.length}</p>
                <p style={{ fontSize: '11px', color: '#9ca3af' }}>アクティブ計</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </PracticeLogLayout>
  );
}
