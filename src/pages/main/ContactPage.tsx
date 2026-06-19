import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/main/MainLayout';
import { FadeIn } from '@/components/main/FadeIn';

const CONTACT_LINE = 'https://lin.ee/sSD9W7a';
const CONTACT_EMAIL = 'TODO_REPLACE_CONTACT_EMAIL';

export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', type: '', message: '', agree: false });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: フォーム送信実装（メール or API）
    const subject = encodeURIComponent(`【お問い合わせ】${form.type || 'その他'}`);
    const body = encodeURIComponent(`お名前：${form.name}\nメール：${form.email}\n種別：${form.type}\n\n${form.message}`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <MainLayout>
      {/* ヘッダー */}
      <section className="bg-[#fdfaf6] pt-12 pb-12 md:pt-16">
        <div className="max-w-4xl mx-auto px-5 md:px-8 text-center">
          <FadeIn>
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-600 uppercase mb-3">Contact</p>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">お問い合わせ</h1>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed">
              講座に関するご質問、提携・紹介制度に関するご相談、<br className="hidden md:block" />
              SNS導線設計・AI活用・講座づくりに関するご相談は、<br className="hidden md:block" />
              以下よりお問い合わせください。
            </p>
          </FadeIn>
        </div>
      </section>

      {/* フォーム & LINE */}
      <section className="py-14 md:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-5 md:px-8 grid md:grid-cols-2 gap-10 items-start">
          {/* みおちゃん & LINE */}
          <FadeIn>
            <div className="flex flex-col items-center md:items-start">
              <img src="/images/mio_wave.png" alt="みお" className="w-48 md:w-56 drop-shadow-xl mb-8" />
              <div className="w-full space-y-4">
                <h3 className="font-bold text-gray-900 text-lg">LINEでのお問い合わせ</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  LINEでの問い合わせも受け付けています。お気軽にご連絡ください。
                </p>
                <a
                  href={CONTACT_LINE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-6 rounded-full bg-[#06C755] text-white font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.145 2 11.243c0 3.218 1.637 6.085 4.2 7.938V22l3.812-2.098c1.016.28 2.093.431 3.205.431 5.523 0 10-4.145 10-9.243C23.217 6.145 18.523 2 12 2z" />
                  </svg>
                  LINEで問い合わせる
                </a>
              </div>
            </div>
          </FadeIn>

          {/* フォーム */}
          <FadeIn delay={100}>
            {submitted ? (
              <div className="bg-green-50 rounded-3xl p-10 text-center">
                <p className="text-4xl mb-4">✅</p>
                <p className="text-gray-800 font-bold text-lg mb-2">送信しました</p>
                <p className="text-gray-600 text-sm">メールクライアントが開かれます。送信を完了してください。</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-[#fdfaf6] rounded-3xl p-7 md:p-8 space-y-5">
                {/* お名前 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    お名前 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="山田 太郎"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                {/* メール */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    メールアドレス <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="example@email.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                {/* 種別 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">お問い合わせ種別</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-amber-400 transition-colors"
                  >
                    <option value="">選択してください</option>
                    <option value="講座について">講座について</option>
                    <option value="購入について">購入について</option>
                    <option value="提携・紹介について">提携・紹介について</option>
                    <option value="お仕事の相談">お仕事の相談</option>
                    <option value="その他">その他</option>
                  </select>
                </div>

                {/* メッセージ */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    お問い合わせ内容 <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="お気軽にご相談ください。"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-amber-400 transition-colors resize-none"
                  />
                </div>

                {/* 同意チェック */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="agree"
                    required
                    checked={form.agree}
                    onChange={(e) => setForm({ ...form, agree: e.target.checked })}
                    className="mt-0.5 accent-amber-500"
                  />
                  <label htmlFor="agree" className="text-xs text-gray-600 leading-relaxed">
                    <Link to="/legal/privacy" className="underline hover:text-amber-600">プライバシーポリシー</Link>に同意の上、送信します。
                    <span className="text-red-400"> *</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-full bg-gray-900 text-white font-bold text-sm hover:bg-gray-700 transition-colors"
                >
                  送信する
                </button>
              </form>
            )}
          </FadeIn>
        </div>
      </section>
    </MainLayout>
  );
}
