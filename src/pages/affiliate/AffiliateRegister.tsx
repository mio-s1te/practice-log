// src/pages/affiliate/AffiliateRegister.tsx
// アフィリエイター登録ページ
// 条件: スタート講座購入済み + 購入メールアドレスで照合 + 管理者承認

import { useState } from 'react';
import { Link } from 'react-router-dom';

type Step = 'verify' | 'form' | 'submitted';

interface VerifyResult {
  verified: boolean;
  purchase_id: string;
  buyer_name: string;
  already_registered: boolean;
  registration_status?: string;
}

export function AffiliateRegister() {
  const [step, setStep] = useState<Step>('verify');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step1: 購入確認
  const [email, setEmail] = useState('');
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  // Step2: 登録フォーム
  const [form, setForm] = useState({
    name: '',
    sns_url: '',
    promotion_channel: '',
    motivation: '',
    agreed: false,
  });

  // Step1: メールで購入確認
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/.netlify/functions/affiliate-api/register/verify-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '確認に失敗しました。');
        return;
      }
      setVerifyResult(data);
      if (data.already_registered) {
        setError('');
      } else if (data.verified) {
        setForm((f) => ({ ...f, name: data.buyer_name || '' }));
        setStep('form');
      } else {
        setError('スタート講座の購入が確認できませんでした。購入時のメールアドレスをご確認ください。');
      }
    } catch {
      setError('ネットワークエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  // Step2: 申請送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agreed) {
      setError('利用規約・PR表記ルールへの同意が必要です。');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/.netlify/functions/affiliate-api/register/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: form.name,
          sns_url: form.sns_url,
          promotion_channel: form.promotion_channel,
          motivation: form.motivation,
          agreed_to_rules: form.agreed,
          start_course_purchase_id: verifyResult?.purchase_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '申請に失敗しました。');
        return;
      }
      setStep('submitted');
    } catch {
      setError('ネットワークエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  // 既に登録済みの場合の表示
  if (verifyResult?.already_registered) {
    const statusLabel: Record<string, string> = {
      pending: '審査中',
      approved: '承認済み',
      rejected: '却下',
      cancelled: 'キャンセル',
    };
    const status = verifyResult.registration_status || 'pending';
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">登録申請済みです</h2>
          <p className="text-gray-600 text-sm mb-4">
            このメールアドレスはすでに登録申請されています。<br />
            現在のステータス:{' '}
            <span className="font-bold text-blue-700">{statusLabel[status] || status}</span>
          </p>
          {status === 'approved' && (
            <Link
              to="/affiliate/login"
              className="inline-block bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
            >
              ログインする
            </Link>
          )}
          {status === 'pending' && (
            <p className="text-sm text-gray-500">
              管理者が審査中です。承認されるとメールでご連絡します。
            </p>
          )}
        </div>
      </div>
    );
  }

  // Step: submitted
  if (step === 'submitted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">申請を受け付けました</h2>
          <p className="text-gray-600 text-sm mb-6">
            <strong>{email}</strong> で登録申請を受け付けました。<br />
            管理者が内容を確認し、通常2〜3営業日以内に<br />
            メールにてご連絡いたします。
          </p>
          <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left text-sm text-blue-800">
            <p className="font-semibold mb-2">📋 申請後の流れ</p>
            <ol className="space-y-1 text-xs">
              <li>1. 管理者が申請内容を確認（2〜3営業日）</li>
              <li>2. 承認メールが届く</li>
              <li>3. メール内のリンクからログイン</li>
              <li>4. 紹介URLを確認して活動スタート</li>
            </ol>
          </div>
          <Link
            to="/"
            className="text-sm text-blue-600 hover:underline"
          >
            トップページに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        {/* タイトル */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">アフィリエイター登録</h1>
          <p className="text-gray-500 text-sm mt-1">紹介制度に参加して報酬を獲得しましょう</p>
        </div>

        {/* 条件説明 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm">
          <p className="font-semibold text-amber-800 mb-2">⚠️ 登録条件</p>
          <ul className="text-amber-700 space-y-1 text-xs">
            <li>✓ AI副業1時間化スタート講座の購入者であること</li>
            <li>✓ 管理者による審査・承認が必要です</li>
            <li>✓ 承認後に紹介URLが発行されます</li>
          </ul>
        </div>

        {/* ステッパー */}
        <div className="flex items-center mb-8">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
              ${step === 'verify' ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'}`}>
              {step === 'verify' ? '1' : '✓'}
            </div>
            <span className="text-sm font-medium text-gray-700">購入確認</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-200 mx-3" />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
              ${step === 'form' ? 'bg-blue-600 text-white' : step === 'submitted' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {step === 'submitted' ? '✓' : '2'}
            </div>
            <span className="text-sm font-medium text-gray-700">申請情報入力</span>
          </div>
        </div>

        {/* Step1: 購入メール確認 */}
        {step === 'verify' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">スタート講座の購入確認</h2>
            <p className="text-gray-500 text-sm mb-6">
              スタート講座購入時に使用したメールアドレスを入力してください。
              購入記録と照合して確認します。
            </p>
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="スタート講座購入時のメールアドレス"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                  {error.includes('確認できません') && (
                    <div className="mt-2 text-xs">
                      <Link to="/start-course" className="text-red-600 underline font-semibold">
                        スタート講座はこちら
                      </Link>
                    </div>
                  )}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? '確認中...' : '購入を確認する'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500">
                スタート講座をまだお持ちでない方は
              </p>
              <Link to="/start-course" className="text-sm text-blue-600 font-semibold hover:underline">
                AI副業1時間化スタート講座を購入する →
              </Link>
            </div>
          </div>
        )}

        {/* Step2: 登録フォーム */}
        {step === 'form' && verifyResult && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            {/* 購入確認完了 */}
            <div className="flex items-center gap-3 bg-green-50 rounded-xl p-3 mb-6">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800">スタート講座の購入を確認しました</p>
                <p className="text-xs text-green-600">{email}</p>
              </div>
            </div>

            <h2 className="text-lg font-bold text-gray-900 mb-1">申請情報を入力</h2>
            <p className="text-gray-500 text-sm mb-6">
              以下の情報をご記入ください。管理者が審査後、承認メールをお送りします。
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  お名前（活動名） <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例：田中太郎"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SNS・ブログURL
                </label>
                <input
                  type="url"
                  value={form.sns_url}
                  onChange={(e) => setForm({ ...form, sns_url: e.target.value })}
                  placeholder="例：https://twitter.com/yourname"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">主な発信媒体があればご記入ください</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  主な紹介媒体 <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.promotion_channel}
                  onChange={(e) => setForm({ ...form, promotion_channel: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">選択してください</option>
                  <option value="twitter_x">Twitter / X</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                  <option value="blog">ブログ / note</option>
                  <option value="line">LINE</option>
                  <option value="other">その他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  紹介したい理由・動機 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.motivation}
                  onChange={(e) => setForm({ ...form, motivation: e.target.value })}
                  placeholder="なぜ紹介したいのか、どのように紹介する予定かをご記入ください"
                  rows={4}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
              </div>

              {/* 規約同意 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-800 mb-3">確認事項</p>
                <ul className="text-xs text-gray-600 space-y-2 mb-4">
                  <li>• アフィリエイト活動においてPR表記を必ず行うこと</li>
                  <li>• 虚偽・誇大表現による紹介を行わないこと</li>
                  <li>• 承認された商品のみを紹介URLで紹介すること</li>
                  <li>• 規約違反が確認された場合、登録が取り消される場合があること</li>
                </ul>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.agreed}
                    onChange={(e) => setForm({ ...form, agreed: e.target.checked })}
                    className="mt-0.5 w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">
                    上記の確認事項と
                    <a href="#" className="text-blue-600 underline mx-1">利用規約</a>
                    に同意します
                  </span>
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('verify')}
                  className="flex-1 border border-gray-300 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
                >
                  戻る
                </button>
                <button
                  type="submit"
                  disabled={loading || !form.agreed}
                  className="flex-2 flex-grow bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm"
                >
                  {loading ? '送信中...' : '登録申請を送信する'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
