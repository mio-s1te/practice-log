// src/pages/affiliate/AffiliateLogin.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function AffiliateLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // アイドルタイムアウトによる自動ログアウト通知
  const isIdleLogout = searchParams.get('reason') === 'idle';

  useEffect(() => {
    // トークン自動検証（Magic Linkからのアクセス）
    const token = searchParams.get('token');
    if (token) {
      verifyToken(token);
      return;
    }
    // 既存セッションチェック
    const existingToken = localStorage.getItem('affiliate_session_token');
    if (existingToken) {
      navigate('/affiliate/dashboard');
    }
  }, []);

  // Magic Link 検証（既存フロー維持）
  const verifyToken = async (token: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/affiliate-api/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        const data = await res.json();
        saveSession(data);
        navigate('/affiliate/dashboard');
      } else {
        setError('ログインリンクが無効または期限切れです。パスワードでログインしてください。');
      }
    } catch {
      setError('ネットワークエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  const saveSession = (data: { session_token: string; affiliate_id: string; name: string }) => {
    localStorage.setItem('affiliate_session_token', data.session_token);
    localStorage.setItem('affiliate_id', data.affiliate_id);
    localStorage.setItem('affiliate_name', data.name);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/affiliate-api/login/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (res.ok) {
        saveSession(data);
        navigate('/affiliate/dashboard');
      } else {
        setError(data.error || 'ログインに失敗しました');
      }
    } catch {
      setError('ネットワークエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">認証中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">

          {/* ヘッダー */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
              🐱
            </div>
            <h1 className="text-2xl font-bold text-gray-900">紹介者ログイン</h1>
            <p className="text-gray-500 text-sm mt-1">みおアフィリエイト パートナーダッシュボード</p>
          </div>

          {/* アイドルタイムアウト通知 */}
          {isIdleLogout && (
            <div className="mb-5 flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
              <span className="text-lg leading-none mt-0.5">⏰</span>
              <span>15分間操作がなかったため、自動的にログアウトしました。再度ログインしてください。</span>
            </div>
          )}

          {/* ログインフォーム */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">購入時のメールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="講座購入時に使ったメールアドレス"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="パスワードを入力"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 px-3 py-2 rounded-xl text-sm">{error}</div>
            )}

            <button type="submit" disabled={loading} className="w-full btn-primary py-3">
              ログイン
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            パスワードがわからない場合は管理者にお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  );
}
