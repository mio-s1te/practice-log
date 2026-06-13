// src/pages/affiliate/AffiliateLayout.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';

const menuItems = [
  { path: '/affiliate/dashboard', icon: '📊', label: 'ダッシュボード' },
  { path: '/affiliate/profile', icon: '👤', label: 'プロフィール' },
  { path: '/affiliate/materials', icon: '📝', label: '紹介素材' },
];

// アイドルタイムアウト：15分
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
// サーバーセッション延長：10分ごと（アクティブ中のみ）
const SESSION_EXTEND_INTERVAL_MS = 10 * 60 * 1000;

export function AffiliateLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showIdleWarning, setShowIdleWarning] = useState(false);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const extendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ログアウト処理（アイドル・手動共通）
  const handleLogout = useCallback((reason?: 'idle') => {
    localStorage.removeItem('affiliate_session_token');
    localStorage.removeItem('affiliate_id');
    localStorage.removeItem('affiliate_name');
    if (reason === 'idle') {
      navigate('/affiliate/login?reason=idle');
    } else {
      navigate('/affiliate/login');
    }
  }, [navigate]);

  // サーバー側セッション延長
  const extendSession = useCallback(() => {
    const token = localStorage.getItem('affiliate_session_token');
    if (!token) return;
    fetch('/api/affiliate-api/session/extend', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }, []);

  // アイドルタイマーリセット
  const resetIdleTimer = useCallback(() => {
    // 警告を非表示
    setShowIdleWarning(false);

    // 既存タイマークリア
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    // 残り1分（14分後）に警告表示
    warningTimerRef.current = setTimeout(() => {
      setShowIdleWarning(true);
    }, IDLE_TIMEOUT_MS - 60 * 1000);

    // 15分後にログアウト
    idleTimerRef.current = setTimeout(() => {
      handleLogout('idle');
    }, IDLE_TIMEOUT_MS);
  }, [handleLogout]);

  // アイドル検知イベント登録 & セッション延長インターバル
  useEffect(() => {
    const token = localStorage.getItem('affiliate_session_token');
    if (!token) { navigate('/affiliate/login'); return; }

    // 初回タイマー開始
    resetIdleTimer();

    // アクティビティイベント
    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'pointerdown'];
    events.forEach(ev => window.addEventListener(ev, resetIdleTimer, { passive: true }));

    // サーバーセッション延長インターバル
    extendIntervalRef.current = setInterval(extendSession, SESSION_EXTEND_INTERVAL_MS);

    return () => {
      events.forEach(ev => window.removeEventListener(ev, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (extendIntervalRef.current) clearInterval(extendIntervalRef.current);
    };
  }, [navigate, resetIdleTimer, extendSession]);

  // 未読通知取得
  useEffect(() => {
    const token = localStorage.getItem('affiliate_session_token');
    if (!token) return;
    fetch('/api/affiliate-api/notifications', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : { unreadCount: 0 })
      .then(data => setUnreadCount(data.unreadCount || 0))
      .catch(() => {});
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* アイドルタイムアウト警告モーダル */}
      {showIdleWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full text-center">
            <div className="text-4xl mb-3">⏰</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">まもなく自動ログアウトします</h3>
            <p className="text-sm text-gray-500 mb-5">
              操作がない状態が続いています。<br />
              <span className="font-semibold text-orange-600">1分後</span>に自動的にログアウトします。
            </p>
            <button
              onClick={resetIdleTimer}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              続けて使用する
            </button>
          </div>
        </div>
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">M</div>
              <div>
                <p className="font-bold text-gray-900 text-sm">紹介者ダッシュボード</p>
                <p className="text-xs text-gray-500">Affiliate Portal</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {menuItems.map(item => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${location.pathname === item.path ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                    {item.path === '/affiliate/dashboard' && unreadCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="p-4 border-t">
            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              ログアウト
            </button>
          </div>
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
          <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
