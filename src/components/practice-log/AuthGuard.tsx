// src/components/practice-log/AuthGuard.tsx
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePracticeLogAuth } from '@/hooks/practice-log/useAuth';
import { Role } from '@/types/practice-log';

interface Props {
  children: ReactNode;
  requiredRole?: Role;
}

export function AuthGuard({ children, requiredRole }: Props) {
  const { user, profile, loading } = usePracticeLogAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fdf8f3' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🐱</div>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/practice-log/login" replace />;

  if (requiredRole === 'admin' && profile?.role !== 'admin') {
    return <Navigate to="/practice-log/dashboard" replace />;
  }

  if (requiredRole === 'staff' && !['staff', 'admin'].includes(profile?.role ?? '')) {
    return <Navigate to="/practice-log/dashboard" replace />;
  }

  return <>{children}</>;
}
