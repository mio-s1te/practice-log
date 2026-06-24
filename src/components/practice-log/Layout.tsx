// src/components/practice-log/Layout.tsx
import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePracticeLogAuth } from '@/hooks/practice-log/useAuth';

interface Props { children: ReactNode; }

export function PracticeLogLayout({ children }: Props) {
  const { profile, signOut } = usePracticeLogAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'staff';

  const memberNav = [
    { to: '/practice-log/dashboard', label: '🏠 ホーム' },
    { to: '/practice-log/checkin',   label: '✏️ チェックイン' },
    { to: '/practice-log/calendar',  label: '📅 カレンダー' },
    { to: '/practice-log/history',   label: '📋 履歴' },
    { to: '/practice-log/achievements', label: '⭐ 成果' },
    { to: '/practice-log/badges',    label: '🏅 バッジ' },
  ];

  const adminNav = [
    { to: '/practice-log/admin',              label: '📊 全体' },
    { to: '/practice-log/admin/members',      label: '👥 メンバー' },
    { to: '/practice-log/admin/questions',    label: '❓ 質問' },
    { to: '/practice-log/admin/unreported',   label: '⚠️ 未報告' },
    { to: '/practice-log/admin/encourage',    label: '💛 励まし' },
    { to: '/practice-log/admin/stuck',        label: '🔍 つまずき' },
    { to: '/practice-log/admin/achievements', label: '⭐ 成果' },
  ];

  const nav = isAdmin ? adminNav : memberNav;

  const handleSignOut = async () => {
    await signOut();
    navigate('/practice-log/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fdf8f3', fontFamily: "'Hiragino Sans','Noto Sans JP',sans-serif" }}>

      {/* ヘッダー */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #f3e8d8',
        padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 1px 8px rgba(0,0,0,.04)',
      }}>
        <Link to="/practice-log/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🐱</span>
          <span style={{ fontWeight: 900, fontSize: '15px', color: '#1c1c1c' }}>みお革命 実践ログ</span>
          {isAdmin && (
            <span style={{ fontSize: '11px', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
              {profile?.role === 'admin' ? 'ADMIN' : 'STAFF'}
            </span>
          )}
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>{profile?.name}</span>
          <button onClick={handleSignOut} style={{
            fontSize: '12px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
          }}>ログアウト</button>
        </div>
      </header>

      {/* ボトムナビ（スマホ） */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #f3e8d8',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        padding: '8px 0 env(safe-area-inset-bottom)',
        zIndex: 50, boxShadow: '0 -1px 8px rgba(0,0,0,.04)',
      }}>
        {nav.slice(0, 5).map(item => {
          const active = location.pathname === item.to;
          return (
            <Link key={item.to} to={item.to} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
              textDecoration: 'none', padding: '4px 8px', minWidth: '52px',
              color: active ? '#f97316' : '#9ca3af',
              fontWeight: active ? 800 : 400,
            }}>
              <span style={{ fontSize: '20px' }}>{item.label.split(' ')[0]}</span>
              <span style={{ fontSize: '10px' }}>{item.label.split(' ')[1]}</span>
            </Link>
          );
        })}
      </nav>

      {/* メインコンテンツ */}
      <main style={{ paddingBottom: '80px', maxWidth: '640px', margin: '0 auto', padding: '20px 16px 100px' }}>
        {children}
      </main>
    </div>
  );
}
