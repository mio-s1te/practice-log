// src/pages/affiliate/AffiliateLogin.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function AffiliateLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // トークン自動検証
    const token = searchParams.get('token');
    if (token) {
      verifyToken(token);
    }
    // 既存セッションチェック
    const existingToken = localStorage.getItem('affiliate_session_token');
    if (existingToken) {
      navigate('/affiliate/dashboard');
    }
  }, []);

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
        localStorage.setItem('affiliate_session_token', data.session_token);
        localStorage.setItem('affiliate_id', data.affiliate_id);
        localStorage.setItem('affiliate_name', data.name);
        navigate('/affiliate/dashboard');
      } else {
        setError('ログインリンクが無効または期限切れです。再度メールを送信してください。');
      }
    } catch {
      setError('ネットワークエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/affiliate-api/login/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        setError('メールの送信に失敗しました。');
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
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">紹介者ログイン</h1>
            <p className="text-gray-500 text-sm mt-1">アフィリエイトダッシュボード</p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900">メールを送信しました</p>
              <p className="text-sm text-gray-600">
                <strong>{email}</strong> にログインリンクを送信しました。
                メールのリンクをクリックしてログインしてください。
              </p>
              <p className="text-xs text-gray-400">リンクの有効期限は30分です</p>
              <button
                onClick={() => setSent(false)}
                className="text-sm text-blue-600 hover:underline"
              >
                メールを再送する
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendLink} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">登録済みのメールアドレス</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="your@email.com"
                  required
                />
              </div>
              
              {error && (
                <div className="bg-red-50 text-red-700 px-3 py-2 rounded-xl text-sm">{error}</div>
              )}

              <button type="submit" disabled={loading} className="w-full btn-primary py-3">
                ログインリンクを送信
              </button>

              <p className="text-xs text-gray-500 text-center">
                メールアドレスにログインリンクを送信します。<br />
                パスワードは不要です。
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
