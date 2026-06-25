// src/pages/lp/Contact.tsx
import { useState } from 'react';

export function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('form-name', 'contact');
      formData.append('name', name);
      formData.append('email', email);
      formData.append('message', message);

      const res = await fetch('/', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        setError('送信に失敗しました。時間をおいて再度お試しください。');
      }
    } catch {
      setError('通信エラーが発生しました。時間をおいて再度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ヘッダー */}
      <header className="bg-gray-900 border-b border-gray-800 py-4 px-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <a href="/" className="text-gray-400 hover:text-white text-sm">← トップへ戻る</a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-2">お問い合わせ</h1>
        <p className="text-gray-400 text-sm mb-8">
          ご質問・ご不明な点はこちらからお気軽にお問い合わせください。<br />
          通常2〜3営業日以内にご返信いたします。
        </p>

        {submitted ? (
          <div className="bg-green-900/40 border border-green-600 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-xl font-bold text-green-400 mb-2">送信が完了しました</h2>
            <p className="text-gray-300 text-sm">
              お問い合わせいただきありがとうございます。<br />
              2〜3営業日以内にご返信いたします。
            </p>
            <a
              href="/"
              className="inline-block mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold transition-colors"
            >
              トップに戻る
            </a>
          </div>
        ) : (
          <form
            name="contact"
            method="POST"
            data-netlify="true"
            onSubmit={handleSubmit}
            className="bg-gray-900 rounded-2xl p-6 space-y-5"
          >
            {/* Netlify Forms用の隠しフィールド */}
            <input type="hidden" name="form-name" value="contact" />

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                お名前 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="例：田中 みお"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                メールアドレス <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="例：example@gmail.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                お問い合わせ内容 <span className="text-red-400">*</span>
              </label>
              <textarea
                name="message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={6}
                placeholder="お問い合わせ内容をご記入ください"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-900/40 border border-red-600 rounded-xl px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !name || !email || !message}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold text-sm transition-colors"
            >
              {submitting ? '送信中...' : '送信する'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              ご入力いただいた情報はお問い合わせへの返信のみに使用します
            </p>
          </form>
        )}
      </main>

      {/* フッター */}
      <footer className="bg-gray-900 border-t border-gray-800 py-6 px-4 text-center text-xs text-gray-500 mt-12">
        <div className="flex justify-center gap-4 mb-2">
          <a href="/tokushoho" className="hover:text-gray-300">特定商取引法に基づく表記</a>
          <a href="/privacy" className="hover:text-gray-300">プライバシーポリシー</a>
        </div>
        <p>© 2026 みお</p>
      </footer>
    </div>
  );
}
