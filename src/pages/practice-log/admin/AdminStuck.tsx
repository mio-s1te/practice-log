// src/pages/practice-log/admin/AdminStuck.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/practice-log/supabase';
import { PracticeLogLayout } from '@/components/practice-log/Layout';
import { Checkin, CheckinCategory, CHECKIN_CATEGORIES } from '@/types/practice-log';

type CheckinWithProfile = Checkin & {
  profiles?: { name: string; discord_name?: string; generation?: string };
};

type StuckGroup = {
  keyword: string;
  count: number;
  items: CheckinWithProfile[];
};

export function AdminStuck() {
  const [checkins, setCheckins] = useState<CheckinWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<7 | 14 | 30>(14);
  const [filterCategory, setFilterCategory] = useState<CheckinCategory | 'all'>('all');
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'keyword' | 'list'>('list');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - range);
      const fromStr = fromDate.toISOString().split('T')[0];

      const { data } = await supabase
        .from('checkins')
        .select('*, profiles(name, discord_name, generation)')
        .not('stuck_text', 'is', null)
        .neq('stuck_text', '')
        .gte('date', fromStr)
        .order('date', { ascending: false });

      if (data) setCheckins(data as CheckinWithProfile[]);
      setLoading(false);
    };
    load();
  }, [range]);

  const filtered = filterCategory === 'all'
    ? checkins
    : checkins.filter(c => c.category === filterCategory);

  // キーワード頻度分析（簡易: 形態素解析なしで頻出単語を抽出）
  const keywords = [
    'LINE', 'note', 'アフィリエイト', '案件', '投稿', '導線', '画像', 'プレゼント',
    'ブログ', 'インスタ', 'Twitter', 'X（旧Twitter）', 'ハッシュタグ', 'フォロワー',
    'セールス', 'LP', 'メルマガ', 'ステップ', '分析', 'やり方', 'わからない', '時間',
  ];

  const keywordGroups: StuckGroup[] = keywords
    .map(kw => ({
      keyword: kw,
      count: filtered.filter(c => c.stuck_text?.includes(kw)).length,
      items: filtered.filter(c => c.stuck_text?.includes(kw)),
    }))
    .filter(g => g.count > 0)
    .sort((a, b) => b.count - a.count);

  // カテゴリ別集計
  const categoryCounts = CHECKIN_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = checkins.filter(c => c.category === cat && c.stuck_text).length;
    return acc;
  }, {} as Record<string, number>);

  const cardStyle = { background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,.05)', marginBottom: '12px' };

  return (
    <PracticeLogLayout>
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#1c1c1c', marginBottom: '4px' }}>🔍 つまずき分析</h1>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>メンバーがつまずいている箇所をまとめて確認</p>

        {/* コントロール */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, marginBottom: '14px' }}>
          {([7, 14, 30] as const).map(d => (
            <button key={d} onClick={() => setRange(d)}
              style={{
                padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer',
                background: range === d ? '#fee2e2' : '#f3f4f6',
                color: range === d ? '#b91c1c' : '#6b7280',
                outline: range === d ? '2px solid #f87171' : 'none',
              }}>
              過去{d}日
            </button>
          ))}
          <button onClick={() => setViewMode(viewMode === 'list' ? 'keyword' : 'list')}
            style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}>
            {viewMode === 'list' ? '🔑 キーワード分析' : '📋 一覧表示'}
          </button>
        </div>

        {/* カテゴリフィルター */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const, marginBottom: '16px' }}>
          <button onClick={() => setFilterCategory('all')}
            style={{ padding: '4px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer', background: filterCategory === 'all' ? '#1c1c1c' : '#f3f4f6', color: filterCategory === 'all' ? '#fff' : '#6b7280' }}>
            全て ({filtered.length})
          </button>
          {CHECKIN_CATEGORIES.filter(cat => categoryCounts[cat] > 0).map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              style={{ padding: '4px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer', background: filterCategory === cat ? '#fff7ed' : '#f3f4f6', color: filterCategory === cat ? '#c2410c' : '#6b7280', outline: filterCategory === cat ? '1.5px solid #fed7aa' : 'none' }}>
              {cat} ({categoryCounts[cat]})
            </button>
          ))}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>読み込み中...</div>}

        {!loading && viewMode === 'keyword' && (
          <>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>よく出てくるキーワード（頻度順）</p>
            {keywordGroups.length === 0 && (
              <div style={{ ...cardStyle, textAlign: 'center', color: '#9ca3af', padding: '30px' }}>キーワードの一致なし</div>
            )}
            {keywordGroups.map(g => (
              <div key={g.keyword} style={cardStyle}>
                <button onClick={() => setExpandedKeyword(expandedKeyword === g.keyword ? null : g.keyword)}
                  style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' as const }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '14px', color: '#1c1c1c' }}>「{g.keyword}」</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: '99px', padding: '2px 10px', fontSize: '12px', fontWeight: 800 }}>
                        {g.count}件
                      </span>
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>{expandedKeyword === g.keyword ? '▲' : '▼'}</span>
                    </div>
                  </div>
                </button>
                {expandedKeyword === g.keyword && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid #f3f4f6', paddingTop: '12px' }}>
                    {g.items.map(item => (
                      <div key={item.id} style={{ borderLeft: '3px solid #fca5a5', paddingLeft: '10px', marginBottom: '8px' }}>
                        <p style={{ fontSize: '11px', color: '#9ca3af' }}>{item.date} · {item.profiles?.name}</p>
                        <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{item.stuck_text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {!loading && viewMode === 'list' && (
          <>
            {filtered.length === 0 && (
              <div style={{ ...cardStyle, textAlign: 'center', color: '#9ca3af', padding: '40px' }}>
                この期間・カテゴリのつまずきはありません
              </div>
            )}
            {filtered.map(c => (
              <div key={c.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '14px', color: '#1c1c1c' }}>{c.profiles?.name ?? '—'}</span>
                    {c.profiles?.discord_name && (
                      <span style={{ marginLeft: '5px', fontSize: '11px', color: '#9ca3af' }}>@{c.profiles.discord_name}</span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', background: '#fff7ed', color: '#c2410c', borderRadius: '8px', padding: '2px 8px', fontWeight: 700 }}>{c.category}</span>
                </div>
                <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px' }}>{c.date} · {c.profiles?.generation ?? '—'}</p>

                <div style={{ background: '#fff1f2', borderRadius: '8px', padding: '8px 10px', marginBottom: '6px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#e11d48', marginBottom: '2px' }}>🟠 つまずき</p>
                  <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.65 }}>{c.stuck_text}</p>
                </div>

                {c.done_text && (
                  <p style={{ fontSize: '12px', color: '#16a34a' }}>✅ {c.done_text}</p>
                )}
                {c.has_question && c.question_text && (
                  <p style={{ fontSize: '12px', color: '#3b82f6', marginTop: '4px' }}>❓ {c.question_text}</p>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </PracticeLogLayout>
  );
}
