// src/pages/affiliate/AffiliateRegister.tsx
// アフィリエイター（紹介者）登録ページ
// 条件: スタート講座購入済み + 購入メールアドレスで照合 → 自動承認

import { useState } from 'react';
import { Link } from 'react-router-dom';

type Step = 'verify' | 'form' | 'submitted';

interface VerifyResult {
  verified: boolean;
  purchase_id: string;
  buyer_name: string;
  already_registered: boolean;
  registration_status?: string;
  has_start_course?: boolean;
  has_affiliate_course?: boolean;
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
    password: '',
    passwordConfirm: '',
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
        setError('いずれかの講座の購入が確認できませんでした。購入時のメールアドレスをご確認ください。');
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
    if (form.password.length < 8) {
      setError('パスワードは8文字以上で入力してください。');
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setError('パスワードが一致しません。');
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
          password: form.password,
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">登録済みです</h2>
          <p className="text-gray-600 text-sm mb-4">
            このメールアドレスはすでに登録されています。<br />
            現在のステータス:{' '}
            <span className="font-bold text-orange-700">{statusLabel[status] || status}</span>
          </p>
          {(status === 'approved' || status === 'active') && (
            <Link
              to="/affiliate/login"
              className="inline-block bg-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors"
            >
              ログインする
            </Link>
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">登録完了！</h2>
          <p className="text-gray-600 text-sm mb-6">
            <strong>{email}</strong> で紹介者登録が完了しました。<br />
            今すぐダッシュボードにログインして活動を開始できます。
          </p>
          <div className="bg-green-50 rounded-xl p-4 mb-6 text-left text-sm text-green-800">
            <p className="font-semibold mb-2">🎉 登録完了後の流れ</p>
            <ol className="space-y-1 text-xs">
              <li>1. 下のボタンからログイン画面へ</li>
              <li>2. 登録メールアドレス＋設定したパスワードでログイン</li>
              <li>3. 紹介URLを確認して活動スタート</li>
              <li>4. 紹介経由の購入で報酬が発生します</li>
            </ol>
          </div>
          <Link
            to="/affiliate/login"
            className="inline-block w-full bg-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors mb-3"
          >
            ダッシュボードにログインする →
          </Link>
          <Link
            to="/"
            className="block text-sm text-gray-500 hover:underline text-center"
          >
            トップページに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        {/* タイトル */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">紹介者登録</h1>
          <p className="text-gray-500 text-sm mt-1">紹介制度に参加して報酬を獲得しましょう</p>
        </div>

        {/* 条件説明 */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 text-sm">
          <p className="font-semibold text-orange-800 mb-2">✅ 登録条件</p>
          <ul className="text-orange-700 space-y-1 text-xs">
            <li>✓ AI副業1時間化スタート講座 または プロAIアフィリエイター養成講座の購入者</li>
            <li>✓ 購入時のメールアドレスで照合後、即時登録完了</li>
            <li>✓ 登録完了後すぐに紹介URLが発行されます</li>
          </ul>
        </div>

        {/* ステッパー */}
        <div className="flex items-center mb-8">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
              ${step === 'verify' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'}`}>
              {step === 'verify' ? '1' : '✓'}
            </div>
            <span className="text-sm font-medium text-gray-700">購入確認</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-200 mx-3" />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
              ${step === 'form' ? 'bg-orange-500 text-white' : step === 'submitted' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {step === 'submitted' ? '✓' : '2'}
            </div>
            <span className="text-sm font-medium text-gray-700">登録情報入力</span>
          </div>
        </div>

        {/* Step1: 購入メール確認 */}
        {step === 'verify' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">講座の購入確認</h2>
            <p className="text-gray-500 text-sm mb-6">
              スタート講座 または 養成講座の購入時に使用したメールアドレスを入力してください。
              購入記録と照合して確認します。
            </p>
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  購入時のメールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="講座購入時に使ったメールアドレス"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  required
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                  {error.includes('確認できません') && (
                    <div className="mt-2 text-xs space-y-1">
                      <Link to="/start-course" className="block text-red-600 underline font-semibold">
                        AI副業1時間化スタート講座はこちら
                      </Link>
                      <Link to="/affiliate-course" className="block text-red-600 underline font-semibold">
                        プロAIアフィリエイター養成講座はこちら
                      </Link>
                    </div>
                  )}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? '確認中...' : '購入を確認する'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-100 text-center space-y-1">
              <p className="text-xs text-gray-500">講座をまだお持ちでない方は</p>
              <Link to="/start-course" className="block text-sm text-orange-500 font-semibold hover:underline">
                AI副業1時間化スタート講座を購入する →
              </Link>
              <Link to="/affiliate-course" className="block text-sm text-orange-500 font-semibold hover:underline">
                プロAIアフィリエイター養成講座を購入する →
              </Link>
            </div>
          </div>
        )}

        {/* Step2: 登録フォーム */}
        {step === 'form' && verifyResult && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            {/* 購入確認完了 */}
            <div className="bg-green-50 rounded-xl p-3 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">講座の購入を確認しました</p>
                  <p className="text-xs text-green-600">{email}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 ml-11">
                {verifyResult?.has_start_course && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ スタート講座</span>
                )}
                {verifyResult?.has_affiliate_course && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">✓ アフィリエイト講座</span>
                )}
              </div>
            </div>

            <h2 className="text-lg font-bold text-gray-900 mb-1">登録情報を入力</h2>
            <p className="text-gray-500 text-sm mb-6">
              お名前とパスワードを設定してください。送信後すぐに登録完了となります。
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* お名前 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  お名前（活動名） <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例：田中太郎"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  required
                />
              </div>

              {/* パスワード設定 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ログインパスワード（新規設定） <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="8文字以上で設定してください"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  minLength={8}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">ダッシュボードログイン時に使用します（8文字以上）</p>
              </div>

              {/* パスワード確認 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード（確認） <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={form.passwordConfirm}
                  onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                  placeholder="もう一度入力してください"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  minLength={8}
                  required
                />
                {form.passwordConfirm && form.password !== form.passwordConfirm && (
                  <p className="text-xs text-red-500 mt-1">パスワードが一致しません</p>
                )}
                {form.passwordConfirm && form.password === form.passwordConfirm && form.password.length >= 8 && (
                  <p className="text-xs text-green-600 mt-1">✓ パスワードが一致しています</p>
                )}
              </div>

              {/* 規約同意 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-800 mb-3">確認事項</p>
                <ul className="text-xs text-gray-600 space-y-2 mb-4">
                  <li>• アフィリエイト活動においてPR表記を必ず行うこと</li>
                  <li>• 虚偽・誇大表現による紹介を行わないこと</li>
                  <li>• 承認された商品のみを紹介URLで紹介すること</li>
                  <li>• 規約違反が確認された場合、登録が取り消される場合があること</li>
                  <li>• 報酬は翌月末払いとなること</li>
                </ul>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.agreed}
                    onChange={(e) => setForm({ ...form, agreed: e.target.checked })}
                    className="mt-0.5 w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm text-gray-700">
                    上記の確認事項と
                    <a href="#" className="text-orange-500 underline mx-1">利用規約</a>
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
                  className="flex-2 flex-grow bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm"
                >
                  {loading ? '登録中...' : '今すぐ登録する'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
