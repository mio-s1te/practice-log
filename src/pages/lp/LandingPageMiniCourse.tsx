// src/pages/lp/LandingPageMiniCourse.tsx
// ※ このページは廃止済み。/mini-course は /affiliate-course へリダイレクト（App.tsx参照）
// LandingPageFreeGift のみ後方互換のためここに残す

import { useEffect, useState } from 'react';
import { initializeTracking } from '@/utils/tracking';

// ──────────────────────────────────────────────────────────
// 無料プレゼントLP（/free-gift）
// ──────────────────────────────────────────────────────────
export function LandingPageFreeGift() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    initializeTracking();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-green-800 to-teal-900 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-6xl mb-6">🎁</div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">
            無料プレゼント<br />
            <span className="text-yellow-400">AI副業スターターキット</span>
          </h1>
          <p className="text-green-200 mb-8 max-w-xl mx-auto">
            今すぐLINE友達追加で、AI副業を始めるための
            スターターキットを無料でプレゼントします。
          </p>
          {!submitted ? (
            <div className="bg-white/10 rounded-2xl p-6 max-w-sm mx-auto">
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="メールアドレス（任意）"
                  className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <a
                  href="https://lin.ee/sSD9W7a"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-green-400 hover:bg-green-300 text-green-900 font-extrabold py-4 rounded-2xl text-lg text-center transition-all"
                >
                  📱 LINEで無料プレゼントを受け取る
                </a>
              </form>
              <p className="text-xs text-green-300 mt-3">友達追加後、すぐにお届けします</p>
            </div>
          ) : (
            <div className="bg-white/10 rounded-2xl p-6 max-w-sm mx-auto">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-bold text-lg mb-2">ありがとうございます！</p>
              <p className="text-green-200 text-sm">LINEの友達追加ボタンをタップして、プレゼントを受け取ってください。</p>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">無料プレゼントの内容</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '📋', title: 'AI副業チェックリスト', desc: '今日からできる50のアクションリスト' },
              { icon: '🤖', title: 'AIプロンプト集', desc: '副業で使えるすぐ使えるプロンプト50選' },
              { icon: '📱', title: '集客LINE台本', desc: 'そのままコピーして使えるメッセージ集' },
            ].map(item => (
              <div key={item.title} className="bg-white rounded-2xl p-6 shadow-sm text-center">
                <span className="text-4xl block mb-3">{item.icon}</span>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-orange-500 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">さらに本格的に学びたい方へ</h2>
          <p className="text-orange-100 mb-6">AI副業1時間化スタート講座で、副業テーマから収益化まで一気に実現しましょう。</p>
          <a href="/start-course" className="inline-block bg-white text-orange-600 font-bold py-3 px-8 rounded-xl hover:bg-orange-50 transition-colors">
            スタート講座を見る →
          </a>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-8 px-4 text-center text-sm">
        <p>© 2026 みお</p>
        <div className="mt-2 flex justify-center gap-4 text-xs">
          <a href="/tokushoho" className="hover:text-white">特定商取引法</a>
          <a href="/privacy" className="hover:text-white">プライバシーポリシー</a>
          <a href="/contact" className="hover:text-white">お問い合わせ</a>
        </div>
      </footer>
    </div>
  );
}

// 後方互換エクスポート（LandingPageFreeGift.tsx から参照）
export { LandingPageFreeGift as LandingPageMiniCourse };
