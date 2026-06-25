// src/pages/practice-log/DashboardPage.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/practice-log/supabase';
import { usePracticeLogAuth } from '@/hooks/practice-log/useAuth';
import { PracticeLogLayout } from '@/components/practice-log/Layout';
import { Checkin, UserBadge, Achievement } from '@/types/practice-log';

export function DashboardPage() {
  const { user, profile } = usePracticeLogAuth();
  const today = new Date().toISOString().split('T')[0];

  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [c, b, a] = await Promise.all([
        supabase.from('checkins').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(60),
        supabase.from('user_badges').select('*, badges(*)').eq('user_id', user.id),
        supabase.from('achievements').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(5),
      ]);
      if (c.data) setCheckins(c.data as Checkin[]);
      if (b.data) setBadges(b.data as UserBadge[]);
      if (a.data) setAchievements(a.data as Achievement[]);
      setLoading(false);
    };
    load();
  }, [user]);

  // 統計計算
  const todayDone = checkins.some(c => c.date === today);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const monthCheckins = checkins.filter(c => c.date.startsWith(thisMonth));
  const reportRate = Math.round((monthCheckins.length / daysInMonth) * 100);

  // 連続報告日数
  const calcStreak = () => {
    const dates = checkins.map(c => c.date).sort().reverse();
    if (!dates.length) return 0;
    let streak = 0;
    let cur = new Date();
    // 今日未報告なら昨日から数える
    if (!todayDone) cur.setDate(cur.getDate() - 1);
    for (let i = 0; i < 60; i++) {
      const d = cur.toISOString().split('T')[0];
      if (dates.includes(d)) { streak++; cur.setDate(cur.getDate() - 1); }
      else break;
    }
    return streak;
  };
  const streak = calcStreak();

  const recentStuck = checkins.filter(c => c.stuck_text).slice(0, 3);
  const recentQuestions = checkins.filter(c => c.has_question && c.question_text).slice(0, 3);

  const cardStyle = {
    background: '#fff', borderRadius: '20px', padding: '20px',
    boxShadow: '0 2px 12px rgba(0,0,0,.05)', marginBottom: '16px',
  };

  if (loading) return (
    <PracticeLogLayout>
      <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>読み込み中...</div>
    </PracticeLogLayout>
  );

  return (
    <PracticeLogLayout>
      <div>
        {/* ウェルカム */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#1c1c1c', marginBottom: '4px' }}>
            おかえり、{profile?.name}さん 🐱
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '13px' }}>
            {today.replace(/-/g, '/')}
          </p>
        </div>

        {/* 今日のチェックイン */}
        {!todayDone ? (
          <Link to="/practice-log/checkin" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'linear-gradient(135deg,#f97316,#fb923c)',
              borderRadius: '20px', padding: '20px 24px',
              marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 4px 20px rgba(249,115,22,.3)',
            }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,.8)', fontSize: '12px', marginBottom: '4px' }}>今日まだ記録がありません</p>
                <p style={{ color: '#fff', fontSize: '18px', fontWeight: 900 }}>✏️ チェックインする →</p>
              </div>
              <span style={{ fontSize: '36px' }}>📝</span>
            </div>
          </Link>
        ) : (
          <div style={{
            background: '#f0fdf4', border: '1.5px solid #bbf7d0',
            borderRadius: '20px', padding: '16px 20px',
            marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <span style={{ fontSize: '28px' }}>✅</span>
            <div>
              <p style={{ fontWeight: 800, color: '#166534', fontSize: '15px' }}>今日のチェックイン完了！</p>
              <p style={{ color: '#4ade80', fontSize: '12px' }}>お疲れさまでした🐱</p>
            </div>
          </div>
        )}

        {/* 統計カード */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {[
            { label: '連続報告', value: `${streak}日`, emoji: '🔥', color: '#f97316' },
            { label: '今月の報告率', value: `${reportRate}%`, emoji: '📊', color: '#8b5cf6' },
            { label: '今月の報告数', value: `${monthCheckins.length}日`, emoji: '📅', color: '#06b6d4' },
            { label: '獲得バッジ', value: `${badges.length}個`, emoji: '🏅', color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,.04)', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>{s.emoji}</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 現在地 */}
        <div style={{ ...cardStyle, background: 'linear-gradient(135deg,#fff7ed,#fef3c7)' }}>
          <p style={{ fontSize: '12px', color: '#92400e', fontWeight: 700, marginBottom: '6px' }}>📍 現在地</p>
          <p style={{ fontSize: '20px', fontWeight: 900, color: '#1c1c1c' }}>
            {profile?.current_stage ?? '土台づくり中'}
          </p>
          <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
            {['土台づくり中','方向性整理中','導線設計中','発信実践中','反応確認中','改善中','成果検証中'].map((s, i) => {
              const stages = ['土台づくり中','方向性整理中','導線設計中','発信実践中','反応確認中','改善中','成果検証中'];
              const curIdx = stages.indexOf(profile?.current_stage ?? '土台づくり中');
              const isPast = i < curIdx;
              const isCur = i === curIdx;
              return (
                <span key={s} style={{
                  fontSize: '10px', padding: '3px 8px', borderRadius: '999px',
                  background: isCur ? '#f97316' : isPast ? '#fed7aa' : '#f3f4f6',
                  color: isCur ? '#fff' : isPast ? '#92400e' : '#9ca3af',
                  fontWeight: isCur ? 800 : 600,
                }}>{s}</span>
              );
            })}
          </div>
        </div>

        {/* 直近の成果 */}
        {achievements.length > 0 && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p style={{ fontWeight: 800, color: '#1c1c1c', fontSize: '14px' }}>⭐ 最近の成果</p>
              <Link to="/practice-log/achievements" style={{ fontSize: '12px', color: '#f97316', textDecoration: 'none' }}>すべて見る</Link>
            </div>
            {achievements.slice(0, 2).map(a => (
              <div key={a.id} style={{ borderLeft: '3px solid #fbbf24', paddingLeft: '12px', marginBottom: '10px' }}>
                <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{a.achievement_text}</p>
                <p style={{ fontSize: '11px', color: '#9ca3af' }}>{a.date}</p>
              </div>
            ))}
          </div>
        )}

        {/* 最近のつまずき */}
        {recentStuck.length > 0 && (
          <div style={cardStyle}>
            <p style={{ fontWeight: 800, color: '#1c1c1c', fontSize: '14px', marginBottom: '12px' }}>🤔 最近のつまずき</p>
            {recentStuck.map(c => (
              <div key={c.id} style={{ borderLeft: '3px solid #fca5a5', paddingLeft: '12px', marginBottom: '10px' }}>
                <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{c.stuck_text}</p>
                <p style={{ fontSize: '11px', color: '#9ca3af' }}>{c.date} · {c.category}</p>
              </div>
            ))}
          </div>
        )}

        {/* 最近の質問 */}
        {recentQuestions.length > 0 && (
          <div style={cardStyle}>
            <p style={{ fontWeight: 800, color: '#1c1c1c', fontSize: '14px', marginBottom: '12px' }}>❓ 最近の質問</p>
            {recentQuestions.map(c => (
              <div key={c.id} style={{ borderLeft: '3px solid #93c5fd', paddingLeft: '12px', marginBottom: '10px' }}>
                <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{c.question_text}</p>
                <p style={{ fontSize: '11px', color: '#9ca3af' }}>{c.date}</p>
              </div>
            ))}
          </div>
        )}

        {/* バッジ */}
        {badges.length > 0 && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p style={{ fontWeight: 800, color: '#1c1c1c', fontSize: '14px' }}>🏅 獲得バッジ</p>
              <Link to="/practice-log/badges" style={{ fontSize: '12px', color: '#f97316', textDecoration: 'none' }}>すべて見る</Link>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {badges.slice(0, 6).map(ub => (
                <div key={ub.id} style={{
                  background: '#fff7ed', border: '1px solid #fed7aa',
                  borderRadius: '10px', padding: '6px 10px', fontSize: '12px',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  <span>{(ub.badges as any)?.emoji}</span>
                  <span style={{ color: '#92400e', fontWeight: 700 }}>{(ub.badges as any)?.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* リンク群 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[
            { to: '/practice-log/calendar', emoji: '📅', label: '報告カレンダー' },
            { to: '/practice-log/history', emoji: '📋', label: '報告履歴' },
            { to: '/practice-log/achievements', emoji: '⭐', label: '成果報告' },
            { to: '/practice-log/badges', emoji: '🏅', label: 'バッジ一覧' },
          ].map(item => (
            <Link key={item.to} to={item.to} style={{
              background: '#fff', borderRadius: '14px', padding: '16px',
              textDecoration: 'none', textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,.04)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
            }}>
              <span style={{ fontSize: '24px' }}>{item.emoji}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </PracticeLogLayout>
  );
}
