// src/pages/practice-log/admin/AdminDashboard.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/practice-log/supabase';
import { PracticeLogLayout } from '@/components/practice-log/Layout';
import { Profile, Checkin } from '@/types/practice-log';

export function AdminDashboard() {
  const today = new Date().toISOString().split('T')[0];
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [p, c] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'member'),
        supabase.from('checkins').select('*, profiles(name,generation)').order('date', { ascending: false }).limit(500),
      ]);
      if (p.data) setProfiles(p.data as Profile[]);
      if (c.data) setCheckins(c.data as Checkin[]);
      setLoading(false);
    };
    load();
  }, []);

  const activeMembers = profiles.filter(p => p.status === 'active');
  const todayCheckins = checkins.filter(c => c.date === today);
  const todayUserIds = new Set(todayCheckins.map(c => c.user_id));
  const notReported = activeMembers.filter(p => !todayUserIds.has(p.id));

  const threeDaysAgo = new Date(); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const sevenDaysAgo = new Date(); sevenDaysAgo.getDate() - 7;

  const getLastCheckin = (userId: string) => {
    const uc = checkins.filter(c => c.user_id === userId).sort((a, b) => b.date.localeCompare(a.date));
    return uc[0]?.date ?? null;
  };

  const unreported3 = activeMembers.filter(p => {
    const last = getLastCheckin(p.id);
    if (!last) return true;
    const diff = (new Date(today).getTime() - new Date(last).getTime()) / 86400000;
    return diff >= 3;
  });

  const unreported7 = activeMembers.filter(p => {
    const last = getLastCheckin(p.id);
    if (!last) return true;
    const diff = (new Date(today).getTime() - new Date(last).getTime()) / 86400000;
    return diff >= 7;
  });

  const questionCount = checkins.filter(c => c.has_question && c.date === today).length;
  const encourageCount = checkins.filter(c => c.mood === '励ましがほしい' && c.date === today).length;

  const statCards = [
    { label: '参加者数', value: activeMembers.length, emoji: '👥', color: '#8b5cf6', to: '/practice-log/admin/members' },
    { label: '今日の報告', value: todayCheckins.length, emoji: '✅', color: '#22c55e', to: '/practice-log/admin/members' },
    { label: '今日の未報告', value: notReported.length, emoji: '⚠️', color: '#f59e0b', to: '/practice-log/admin/unreported' },
    { label: '3日以上未報告', value: unreported3.length, emoji: '🔴', color: '#ef4444', to: '/practice-log/admin/unreported' },
    { label: '7日以上未報告', value: unreported7.length, emoji: '❗', color: '#dc2626', to: '/practice-log/admin/unreported' },
    { label: '今日の質問', value: questionCount, emoji: '❓', color: '#3b82f6', to: '/practice-log/admin/questions' },
    { label: '励まし希望', value: encourageCount, emoji: '💛', color: '#f97316', to: '/practice-log/admin/encourage' },
  ];

  if (loading) return (
    <PracticeLogLayout>
      <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>読み込み中...</div>
    </PracticeLogLayout>
  );

  return (
    <PracticeLogLayout>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#1c1c1c', marginBottom: '6px' }}>📊 管理者ダッシュボード</h1>
        <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '20px' }}>{today.replace(/-/g, '/')} 時点</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {statCards.map(s => (
            <Link key={s.label} to={s.to} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,.05)', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>{s.emoji}</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{s.label}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* 管理ナビ */}
        <div style={{ background: '#fff', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
          <p style={{ fontWeight: 800, fontSize: '14px', color: '#374151', marginBottom: '14px' }}>管理メニュー</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { to: '/practice-log/admin/members', emoji: '👥', label: 'メンバー管理' },
              { to: '/practice-log/admin/unreported', emoji: '⚠️', label: '未報告者一覧' },
              { to: '/practice-log/admin/questions', emoji: '❓', label: '質問一覧' },
              { to: '/practice-log/admin/encourage', emoji: '💛', label: '励まし希望一覧' },
              { to: '/practice-log/admin/stuck', emoji: '🔍', label: 'つまずき分析' },
              { to: '/practice-log/admin/achievements', emoji: '⭐', label: '成果報告一覧' },
            ].map(item => (
              <Link key={item.to} to={item.to} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 14px', borderRadius: '12px', background: '#fdf8f3',
                textDecoration: 'none', color: '#374151', fontWeight: 600, fontSize: '14px',
              }}>
                <span style={{ fontSize: '18px' }}>{item.emoji}</span>
                <span>{item.label}</span>
                <span style={{ marginLeft: 'auto', color: '#9ca3af' }}>›</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PracticeLogLayout>
  );
}
