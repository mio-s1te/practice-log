// src/pages/practice-log/LoginPage.tsx
import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePracticeLogAuth } from '@/hooks/practice-log/useAuth';

export function PracticeLogLogin() {
  const { signIn } = usePracticeLogAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません');
      return;
    }
    navigate('/practice-log/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fdf8f3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Hiragino Sans','Noto Sans JP',sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* ロゴ */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🐱</div>
          <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#1c1c1c', marginBottom: '4px' }}>
            みお革命 実践ログ
          </h1>
          <p style={{ fontSize: '13px', color: '#9ca3af' }}>
            毎日の実践を記録し、成長を見える化する
          </p>
        </div>

        {/* カード */}
        <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#1c1c1c', marginBottom: '24px', textAlign: 'center' }}>
            ログイン
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="example@mail.com"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '12px',
                  border: '1.5px solid #e5e7eb', fontSize: '15px',
                  outline: 'none', boxSizing: 'border-box',
                  background: '#fafafa',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '12px',
                  border: '1.5px solid #e5e7eb', fontSize: '15px',
                  outline: 'none', boxSizing: 'border-box',
                  background: '#fafafa',
                }}
              />
            </div>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '10px', padding: '10px 14px',
                fontSize: '13px', color: '#dc2626', marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? '#d1d5db' : 'linear-gradient(135deg,#f97316,#fb923c)',
                color: '#fff', fontWeight: 900, fontSize: '16px',
                borderRadius: '14px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(249,115,22,.35)',
                transition: 'all .2s',
              }}
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '20px' }}>
            ※ アカウントはみおから発行されます
          </p>
        </div>
      </div>
    </div>
  );
}
