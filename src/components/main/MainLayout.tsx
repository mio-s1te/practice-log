import { ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MainHeader } from './MainHeader';
import { MainFooter } from './MainFooter';

interface Props {
  children: ReactNode;
}

export function MainLayout({ children }: Props) {
  const { pathname } = useLocation();

  // ページ遷移時にスクロールをトップへ
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MainHeader />
      <main className="flex-1 pt-16 md:pt-20">
        {children}
      </main>
      <MainFooter />
    </div>
  );
}
