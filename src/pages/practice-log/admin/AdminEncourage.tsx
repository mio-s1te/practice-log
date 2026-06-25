// src/pages/practice-log/admin/AdminEncourage.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/practice-log/supabase';
import { PracticeLogLayout } from '@/components/practice-log/Layout';
import { Checkin } from '@/types/practice-log';

type CheckinWithProfile = Checkin & {
  profiles?: { name: string; discord_name?: string; generation?: string };
};

export function AdminEncourage() {
  const [checkins, setCheckins] = useState<CheckinWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<7 | 14 | 30>(7);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - range);
      const fromStr = fromDate.toISOString().split('T')[0];

      const { data } = await supabase
        .from('checkins')
        .select('*, profiles(name, discord_name, generation)')
        .eq('mood', '励ましがほしい')
        .gte('date', fromStr)
        .order('date', { ascending: false });

      if (data) setCheckins(data as CheckinWithProfile[]);
      setLoading(false);
    };
    load();
  }, [range]);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  // Discord向け励ましテンプレート生成
  const makeEncourageText = (c: CheckinWithProfile): string => {
    const name = c.profiles?.discord_name ? `@${c.profiles.discord_name}` : c.profiles?.name ?? '';
    const done = c.done_text ? `「${c.done_text}」` : '';
    const stuck = c.stuck_text ? `\nつまずき：${c.stuck_text}` : '';
    return `${name} さん、${done}できているの素晴らしいです！${stuck}\n一緒に頑張っていきましょう！💪`;
  };

  // 同一メンバーの励まし回数を集計
  const memberCounts = checkins.reduce((acc, c) => {
    const uid = c.user_id;
    acc[uid] = (acc[uid] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const cardStyle = { background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,.05)', marginBottom: '12px' };

  return (
    <PracticeLogLayout>
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#1c1c1c', marginBottom: '4px' }}>💛 励まし希望一覧</h1>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>気分「励ましがほしい」と報告したメンバー</p>

        {/* 期間フィルター */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
          {([7, 14, 30] as const).map(d => (
            <button key={d} onClick={() => setRange(d)}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer',
                background: range === d ? '#fef9c3' : '#f3f4f6',
                color: range === d ? '#92400e' : '#6b7280',
                outline: range === d ? '2px solid #d97706' : 'none',
              }}>
              過去{d}日
            </button>
          ))}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>読み込み中...</div>}

        {!loading && checkins.length === 0 && (
          <div style={{ ...cardStyle, textAlign: 'center', color: '#9ca3af', padding: '40px' }}>
            💛 過去{range}日間の励まし希望はありません
          </div>
        )}

        {/* サマリー */}
        {!loading && checkins.length > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#92400e', fontWeight: 700 }}>
              📊 過去{range}日：{checkins.length}件 / {Object.keys(memberCounts).length}名
            </p>
            {/* 複数回の人をハイライト */}
            {Object.entries(memberCounts).filter(([, n]) => n >= 2).map(([uid, n]) => {
              const c = checkins.find(c => c.user_id === uid);
              return (
                <p key={uid} style={{ fontSize: '12px', color: '#d97706', marginTop: '4px' }}>
                  ⚠️ {c?.profiles?.name} さんが{n}回
                </p>
              );
            })}
          </div>
        )}

        {checkins.map(c => {
          const encourage = makeEncourageText(c);
          const isCopied = copied === c.id;

          return (
            <div key={c.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: '#1c1c1c' }}>{c.profiles?.name ?? '—'}</span>
                  {c.profiles?.discord_name && (
                    <span style={{ marginLeft: '6px', fontSize: '11px', color: '#6b7280' }}>@{c.profiles.discord_name}</span>
                  )}
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                    {c.date} · {c.category} · {c.profiles?.generation ?? '期生未設定'}
                  </p>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: '#fef9c3', color: '#92400e' }}>
                  💛 励まし希望
                </span>
              </div>

              {c.done_text && (
                <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '8px 10px', marginBottom: '6px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', marginBottom: '2px' }}>できたこと</p>
                  <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{c.done_text}</p>
                </div>
              )}

              {c.stuck_text && (
                <div style={{ background: '#fff7ed', borderRadius: '8px', padding: '8px 10px', marginBottom: '6px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', marginBottom: '2px' }}>つまずき</p>
                  <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{c.stuck_text}</p>
                </div>
              )}

              {/* Discord向けコピー */}
              <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '10px', marginTop: '8px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', marginBottom: '4px' }}>Discord送信用テキスト</p>
                <p style={{ fontSize: '12px', color: '#374151', lineHeight: 1.7, marginBottom: '8px', whiteSpace: 'pre-wrap' }}>{encourage}</p>
                <button onClick={() => copyText(encourage, c.id)}
                  style={{ width: '100%', padding: '7px', background: isCopied ? '#d1fae5' : '#fef9c3', color: isCopied ? '#065f46' : '#92400e', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: isCopied ? '1.5px solid #6ee7b7' : '1.5px solid #fde68a', cursor: 'pointer' }}>
                  {isCopied ? '✅ コピー済み' : '📋 テキストをコピー'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </PracticeLogLayout>
  );
}
