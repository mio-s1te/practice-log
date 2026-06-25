// src/pages/practice-log/admin/AdminAchievements.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/practice-log/supabase';
import { PracticeLogLayout } from '@/components/practice-log/Layout';
import { Achievement, PublicOk } from '@/types/practice-log';

type AchievementWithProfile = Achievement & {
  profiles?: { name: string; discord_name?: string; generation?: string };
};

const PUBLIC_LABELS: Record<PublicOk, { label: string; bg: string; text: string }> = {
  'OK':      { label: '公開OK', bg: '#d1fae5', text: '#065f46' },
  '匿名ならOK': { label: '匿名なら可', bg: '#fef9c3', text: '#92400e' },
  'NG':      { label: '非公開', bg: '#f3f4f6', text: '#6b7280' },
};

export function AdminAchievements() {
  const [achievements, setAchievements] = useState<AchievementWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPublic, setFilterPublic] = useState<PublicOk | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMemo, setEditMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [range, setRange] = useState<30 | 90 | 365>(30);
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - range);
    const fromStr = fromDate.toISOString().split('T')[0];

    const { data } = await supabase
      .from('achievements')
      .select('*, profiles(name, discord_name, generation)')
      .gte('date', fromStr)
      .order('date', { ascending: false });

    if (data) setAchievements(data as AchievementWithProfile[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [range]);

  const filtered = filterPublic === 'all'
    ? achievements
    : achievements.filter(a => a.public_ok === filterPublic);

  const saveMemo = async (id: string) => {
    setSaving(true);
    await supabase.from('achievements').update({ admin_memo: editMemo }).eq('id', id);
    setSaving(false);
    setEditingId(null);
    await load();
  };

  // 公開OKの実績をコピー（SNS投稿用）
  const makeSnsText = (a: AchievementWithProfile): string => {
    const name = a.profiles?.discord_name
      ? `@${a.profiles.discord_name} さん`
      : a.public_ok === '匿名ならOK'
        ? '受講生さん'
        : (a.profiles?.name ?? '') + 'さん';
    return `🎉 ${name}の成果報告！\n\n${a.achievement_text}\n\n#みお革命 #アフィリエイト実践`;
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2500);
    });
  };

  const counts = {
    all: achievements.length,
    OK: achievements.filter(a => a.public_ok === 'OK').length,
    '匿名ならOK': achievements.filter(a => a.public_ok === '匿名ならOK').length,
    NG: achievements.filter(a => a.public_ok === 'NG').length,
  };

  const cardStyle = { background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,.05)', marginBottom: '12px' };

  return (
    <PracticeLogLayout>
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#1c1c1c', marginBottom: '4px' }}>⭐ 成果報告一覧</h1>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>メンバーの成果・公開設定・管理者メモ</p>

        {/* 期間フィルター */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, marginBottom: '14px' }}>
          {([30, 90, 365] as const).map(d => (
            <button key={d} onClick={() => setRange(d)}
              style={{
                padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer',
                background: range === d ? '#fef9c3' : '#f3f4f6',
                color: range === d ? '#92400e' : '#6b7280',
                outline: range === d ? '2px solid #fbbf24' : 'none',
              }}>
              過去{d === 365 ? '1年' : `${d}日`}
            </button>
          ))}
        </div>

        {/* 公開設定フィルター */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, marginBottom: '18px' }}>
          <button onClick={() => setFilterPublic('all')}
            style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', background: filterPublic === 'all' ? '#1c1c1c' : '#f3f4f6', color: filterPublic === 'all' ? '#fff' : '#6b7280' }}>
            全て ({counts.all})
          </button>
          {(['OK', '匿名ならOK', 'NG'] as PublicOk[]).map(p => {
            const pl = PUBLIC_LABELS[p];
            return (
              <button key={p} onClick={() => setFilterPublic(p)}
                style={{
                  padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: filterPublic === p ? pl.bg : '#f3f4f6',
                  color: filterPublic === p ? pl.text : '#6b7280',
                  outline: filterPublic === p ? `2px solid ${pl.text}` : 'none',
                }}>
                {pl.label} ({counts[p]})
              </button>
            );
          })}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>読み込み中...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ ...cardStyle, textAlign: 'center', color: '#9ca3af', padding: '40px' }}>
            この条件の成果報告はありません
          </div>
        )}

        {filtered.map(a => {
          const pl = a.public_ok ? PUBLIC_LABELS[a.public_ok] : { label: '未設定', bg: '#f3f4f6', text: '#6b7280' };
          const isEditing = editingId === a.id;
          const snsText = makeSnsText(a);
          const isCopied = copied === a.id;

          return (
            <div key={a.id} style={cardStyle}>
              {/* ヘッダー */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: '#1c1c1c' }}>{a.profiles?.name ?? '—'}</span>
                  {a.profiles?.discord_name && (
                    <span style={{ marginLeft: '6px', fontSize: '11px', color: '#6b7280' }}>@{a.profiles.discord_name}</span>
                  )}
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                    {a.date} · {a.profiles?.generation ?? '期生未設定'}
                  </p>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: pl.bg, color: pl.text }}>
                  {pl.label}
                </span>
              </div>

              {/* 成果内容 */}
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px', marginBottom: '10px' }}>
                <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7 }}>{a.achievement_text}</p>
              </div>

              {/* スクリーンショット */}
              {a.screenshot_url && (
                <a href={a.screenshot_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', fontSize: '12px', color: '#3b82f6', marginBottom: '8px' }}>
                  📸 スクリーンショットを見る
                </a>
              )}

              {/* 管理者メモ */}
              {isEditing ? (
                <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '10px', marginBottom: '8px' }}>
                  <textarea value={editMemo} onChange={e => setEditMemo(e.target.value)} placeholder="管理者メモ（内部用）" rows={2}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', marginBottom: '8px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => saveMemo(a.id)} disabled={saving}
                      style={{ flex: 1, padding: '7px', background: '#f97316', color: '#fff', fontWeight: 800, fontSize: '13px', borderRadius: '8px', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                      {saving ? '保存中...' : '保存'}
                    </button>
                    <button onClick={() => setEditingId(null)}
                      style={{ flex: 1, padding: '7px', background: '#e5e7eb', color: '#374151', fontWeight: 700, fontSize: '13px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {a.admin_memo && (
                    <p style={{ fontSize: '12px', color: '#6b7280', background: '#f9fafb', borderRadius: '8px', padding: '8px', marginBottom: '8px' }}>
                      📝 {a.admin_memo}
                    </p>
                  )}
                  <button onClick={() => { setEditingId(a.id); setEditMemo(a.admin_memo ?? ''); }}
                    style={{ background: 'none', border: '1.5px solid #e5e7eb', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', color: '#6b7280', cursor: 'pointer', fontWeight: 600 }}>
                    {a.admin_memo ? 'メモを編集' : '+ メモを追加'}
                  </button>
                </>
              )}

              {/* SNS投稿用コピー（公開OKのみ） */}
              {(a.public_ok === 'OK' || a.public_ok === '匿名ならOK') && (
                <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '10px', marginTop: '8px', border: '1px solid #bbf7d0' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', marginBottom: '4px' }}>SNS投稿用テキスト</p>
                  <p style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6, marginBottom: '8px', whiteSpace: 'pre-wrap' }}>{snsText}</p>
                  <button onClick={() => copyText(snsText, a.id)}
                    style={{ width: '100%', padding: '6px', background: isCopied ? '#d1fae5' : '#dcfce7', color: '#065f46', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: '1.5px solid #86efac', cursor: 'pointer' }}>
                    {isCopied ? '✅ コピー済み' : '📋 テキストをコピー'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PracticeLogLayout>
  );
}
