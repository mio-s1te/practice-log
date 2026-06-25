import { Link } from 'react-router-dom';

export function MainFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-14 md:py-16">
        <div className="grid md:grid-cols-3 gap-10 mb-10">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <span className="text-xl font-black tracking-widest text-white" style={{ letterSpacing: '0.12em' }}>MIO</span>
              <span className="block text-xs font-semibold tracking-widest text-amber-500 mt-0.5">AI LIFE DESIGN</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-500">
              AI・SNS・収益化を通して、<br />
              自分の人生を自分で動かせる人を増やす。
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-4">Navigation</p>
            <ul className="space-y-2.5">
              {[
                { label: 'Home', to: '/' },
                { label: 'Concept', to: '/concept' },
                { label: 'Profile', to: '/profile' },
                { label: 'Courses', to: '/courses' },
                { label: 'Contact', to: '/contact' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-gray-400 hover:text-amber-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a href="https://mio-affiliate.netlify.app/" target="_blank" rel="noopener noreferrer"
                  className="text-sm text-amber-400 hover:text-amber-300 transition-colors font-bold">
                  💰 アフィリエイター登録
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-4">Legal</p>
            <ul className="space-y-2.5">
              {[
                { label: '特定商取引法に基づく表記', to: '/legal/tokushoho' },
                { label: 'プライバシーポリシー', to: '/legal/privacy' },
                { label: '利用規約', to: '/legal/terms' },
                { label: '免責事項', to: '/legal/disclaimer' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-gray-400 hover:text-amber-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-6 space-y-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            本サイトの講座・教材・サービスは、成果や収益を保証するものではありません。
            アフィリエイトリンクを使用する場合があります。
          </p>
          <p className="text-xs text-gray-600">
            © {year} MIO AI LIFE DESIGN. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
