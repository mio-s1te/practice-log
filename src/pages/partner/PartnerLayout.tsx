// src/pages/partner/PartnerLayout.tsx
import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';

const menuItems = [
  { path: '/partner/dashboard', icon: '📊', label: 'ダッシュボード' },
  { path: '/partner/purchases', icon: '🛒', label: '購入者一覧' },
  { path: '/partner/affiliates', icon: '👥', label: '紹介者成果' },
  { path: '/partner/campaigns', icon: '🎯', label: 'キャンペーン成果' },
  { path: '/partner/requests', icon: '📝', label: '申請管理' },
  { path: '/partner/notices', icon: '📢', label: 'お知らせ履歴' },
  { path: '/partner/csv', icon: '📥', label: 'CSV出力' },
];

export function PartnerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = sessionStorage.getItem('partner_token');
    if (!token) {
      navigate('/partner/login');
      return;
    }
    const u = sessionStorage.getItem('partner_user');
    if (u) setUser(JSON.parse(u));
  }, [navigate]);

  const handleLogout = () => {
    fetch('/.netlify/functions/partner-api/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionStorage.getItem('partner_token')}` },
    }).catch(() => {});
    sessionStorage.removeItem('partner_token');
    sessionStorage.removeItem('partner_email');
    sessionStorage.removeItem('partner_user');
    sessionStorage.removeItem('partner_products');
    navigate('/partner/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* サイドバー */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300
        lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* ロゴ */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">P</div>
              <div>
                <p className="font-bold text-gray-900 text-sm">パートナー画面</p>
                <p className="text-xs text-gray-500 truncate max-w-[140px]">{user?.display_name || user?.email}</p>
              </div>
            </div>
          </div>

          {/* メニュー */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {menuItems.map(item => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                      location.pathname === item.path
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* ログアウト */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-400 mb-3 px-1">
              ⚠️ 価格・報酬変更は申請制です
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              ログアウト
            </button>
          </div>
        </div>
      </aside>

      {/* オーバーレイ */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-sm text-gray-500">パートナー管理画面</span>
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 text-xs font-bold">P</span>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
