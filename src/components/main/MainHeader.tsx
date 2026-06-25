import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const PORTFOLIO_URL = 'https://mio-portfolio.pages.dev/';

export function MainHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'Concept', to: '/concept' },
    { label: 'Courses', to: '/courses' },
    { label: 'Profile', to: '/profile' },
    { label: 'Portfolio', to: PORTFOLIO_URL, external: true },
    { label: 'Contact', to: '/contact' },
  ];

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to.split('#')[0]) && to.split('#')[0] !== '/';
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white/80 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex flex-col leading-none">
            <span className="text-lg md:text-xl font-black tracking-widest text-gray-900" style={{ letterSpacing: '0.12em' }}>
              MIO
            </span>
            <span className="text-[10px] md:text-xs font-semibold tracking-widest text-amber-600 mt-[-2px]">
              AI LIFE DESIGN
            </span>
          </Link>

          {/* PC Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              link.external ? (
                <a
                  key={link.to}
                  href={link.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium tracking-wide transition-colors duration-200 hover:text-amber-600 text-gray-600"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm font-medium tracking-wide transition-colors duration-200 hover:text-amber-600 ${
                    isActive(link.to) ? 'text-amber-600 border-b border-amber-500' : 'text-gray-600'
                  }`}
                >
                  {link.label}
                </Link>
              )
            ))}
          </nav>

          {/* CTA & Hamburger */}
          <div className="flex items-center gap-3">
            <Link
              to="/contact"
              className="hidden md:inline-flex items-center px-5 py-2 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              お問い合わせ
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-gray-700"
              aria-label="メニュー"
            >
              <div className="w-6 flex flex-col gap-1.5">
                <span className={`block h-0.5 bg-gray-700 transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block h-0.5 bg-gray-700 transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 bg-gray-700 transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden transition-all duration-300 overflow-hidden ${menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-white border-t border-gray-100 px-5 py-5 flex flex-col gap-4">
          {navLinks.map((link) => (
            link.external ? (
              <a
                key={link.to}
                href={link.to}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-medium py-1 transition-colors hover:text-amber-600 text-gray-700"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.to}
                to={link.to}
                className={`text-base font-medium py-1 transition-colors hover:text-amber-600 ${
                  isActive(link.to) ? 'text-amber-600' : 'text-gray-700'
                }`}
              >
                {link.label}
              </Link>
            )
          ))}
          <Link
            to="/contact"
            className="mt-2 text-center py-3 rounded-full bg-gray-900 text-white text-sm font-medium"
          >
            お問い合わせ
          </Link>
        </div>
      </div>
    </header>
  );
}
