// src/pages/lp/LiffSeminar.tsx
// LINE LIFF セミナーページ

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTrackingData } from '@/utils/tracking';

declare global {
  interface Window {
    liff: any;
  }
}

export function LiffSeminar() {
  const [searchParams] = useSearchParams();
  const [liffReady, setLiffReady] = useState(false);
  const [lineVerified, setLineVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');
  const [lineUserName, setLineUserName] = useState('');

  const campaignId = searchParams.get('campaign');
  const ref = searchParams.get('ref');
  const clickId = searchParams.get('click_id');
  const productId = searchParams.get('product_id') || 'a0000000-0000-0000-0000-000000000001';

  useEffect(() => {
    initializeLiff();
  }, []);

  const initializeLiff = async () => {
    try {
      // LIFF SDK読み込み
      const liffId = import.meta.env.VITE_LINE_LIFF_ID;
      if (!liffId) {
        console.warn('LIFF ID not set, running in demo mode');
        setLoading(false);
        return;
      }

      // LIFF SDKスクリプト動的読み込み
      if (!window.liff) {
        await new Promise<void>((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      await window.liff.init({ liffId });
      setLiffReady(true);

      if (!window.liff.isLoggedIn()) {
        window.liff.login();
        return;
      }

      // LINEユーザー情報取得
      const idToken = window.liff.getIDToken();
      const accessToken = window.liff.getAccessToken();
      
      const tracking = getTrackingData();
      
      // サーバー側でトークン検証
      const verifyRes = await fetch('/api/verify-line-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_token: idToken,
          access_token: accessToken,
          affiliate_code: ref || tracking.ref,
          campaign_id: campaignId || tracking.campaignId,
          product_id: productId,
          click_id: clickId || tracking.clickId,
          source: searchParams.get('source') || 'liff',
        }),
      });

      if (verifyRes.ok) {
        const data = await verifyRes.json();
        localStorage.setItem('line_user_id', data.line_user_id);
        localStorage.setItem('lead_id', data.lead_id);
        setLineUserName(data.display_name);
        setLineVerified(true);

        // セミナー視聴記録
        await fetch('/api/record-seminar-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            line_user_id: data.line_user_id,
            display_name: data.display_name,
            affiliate_id: null, // affiliate_codeからサーバー側で取得
            affiliate_code: ref || tracking.ref,
            campaign_id: campaignId || tracking.campaignId,
            product_id: productId,
            click_id: clickId || tracking.clickId,
            source: 'liff',
          }),
        });
      } else {
        setError('LINE認証に失敗しました。ブラウザを閉じて、LINEから再度アクセスしてください。');
      }
    } catch (e) {
      console.error('LIFF init error:', e);
      setError('LIFFの初期化に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    setCheckoutLoading(true);
    try {
      const tracking = getTrackingData();
      const lineUserId = localStorage.getItem('line_user_id');
      const leadId = localStorage.getItem('lead_id');

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          line_user_id: lineUserId,
          click_id: clickId || tracking.clickId,
          affiliate_code: ref || tracking.ref || null,  // affiliate_codeを渡す → サーバー側で解決
          affiliate_id: null,
          campaign_id: campaignId || tracking.campaignId,
          lead_id: leadId,
        }),
      });

      if (res.ok) {
        const { url } = await res.json();
        if (window.liff?.isInClient()) {
          window.liff.openWindow({ url, external: true });
        } else {
          window.location.href = url;
        }
      } else {
        setError('決済の開始に失敗しました。もう一度お試しください。');
      }
    } catch {
      setError('エラーが発生しました。');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6" />
          <p className="text-gray-600 font-medium">LINE認証中...</p>
          <p className="text-gray-400 text-sm mt-2">しばらくお待ちください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="font-bold">無料セミナー</h1>
          {lineVerified && (
            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
              ✅ {lineUserName}さん
            </span>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
            {error}
          </div>
        )}

        {/* セミナー動画エリア */}
        <div className="bg-gray-900 rounded-2xl aspect-video flex items-center justify-center mb-6 overflow-hidden">
          <div className="text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="font-bold text-lg">AI副業1時間化セミナー</p>
            <p className="text-white/70 text-sm">ここに動画プレーヤーが表示されます</p>
          </div>
        </div>

        {/* セミナー内容 */}
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-bold text-gray-900">セミナー内容</h2>
          {[
            '✅ AIで副業テーマを決める方法',
            '✅ 最初の商品を1時間で作る手順',
            '✅ SNSで集客する自動化の仕組み',
            '✅ アフィリエイトで稼ぐ実践的な方法',
            '✅ 月収10万円を達成するロードマップ',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              <span className="text-sm font-medium text-gray-700">{item}</span>
            </div>
          ))}
        </div>

        {/* 購入ボタン */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-6 text-center">
          <p className="text-sm opacity-80 mb-2">セミナー限定特別オファー</p>
          <p className="text-4xl font-extrabold mb-1">¥29,800</p>
          <p className="text-sm opacity-70 mb-6">（税込・一括払い）</p>
          
          {!lineVerified ? (
            <div className="bg-white/20 rounded-xl p-4">
              <p className="text-sm">購入するにはLINEログインが必要です。<br />LINEからこのページを開いてください。</p>
            </div>
          ) : (
            <button
              onClick={handlePurchase}
              disabled={checkoutLoading}
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-extrabold py-4 rounded-2xl text-lg transition-all disabled:opacity-50"
            >
              {checkoutLoading ? '処理中...' : '今すぐ購入してスタートする'}
            </button>
          )}
          
          <p className="text-xs opacity-60 mt-3">Stripe安全決済 | 質問無制限180日サポート</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// src/pages/lp/PurchaseComplete.tsx
// 購入完了ページ
// ① purchase_code（start_xxx）を表示・コピー
// ② 購入者専用LINEへの登録案内
// ============================================================
export function PurchaseComplete() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const buyerLineAddUrl = (import.meta as any).env?.VITE_LINE_BUYER_ADD_URL || '#';

  // 購入コード取得状態
  const [purchaseCode, setPurchaseCode] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // session_id → purchase_code をAPIから取得
  useEffect(() => {
    if (!sessionId) {
      setCodeLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/affiliate-api/purchase/get-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stripe_session_id: sessionId }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.found) setPurchaseCode(data.purchase_code);
        }
      } catch (e) {
        console.error('purchase code fetch error:', e);
      } finally {
        setCodeLoading(false);
      }
    })();
  }, [sessionId]);

  // クリップボードコピー
  const handleCopy = () => {
    if (!purchaseCode) return;
    navigator.clipboard.writeText(purchaseCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">

          {/* 完了アイコン */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
            ご購入ありがとうございます！
          </h1>
          <p className="text-sm text-gray-500 mb-6">講座の受け取りは以下の手順で進めてください</p>

          {/* ======================================================
              STEP 1: 購入コード表示（最重要）
              ====================================================== */}
          <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-2xl p-5 mb-5 text-left">
            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">STEP 1</p>
            <p className="font-extrabold text-lg mb-3">購入コードをコピーする</p>

            {codeLoading ? (
              <div className="bg-white/20 rounded-xl p-4 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">取得中...</span>
              </div>
            ) : purchaseCode ? (
              <>
                {/* コードボックス */}
                <div className="bg-white rounded-xl p-4 mb-3 flex items-center justify-between gap-3">
                  <span className="font-mono font-bold text-orange-600 text-base tracking-wider select-all break-all">
                    {purchaseCode}
                  </span>
                  <button
                    onClick={handleCopy}
                    className={`flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                      copied
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    }`}
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        コピー済み
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        コピー
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs opacity-80">※ このコードは購入完了メールにも記載されています</p>
              </>
            ) : (
              <div className="bg-white/20 rounded-xl p-4">
                <p className="text-sm">購入コードは購入完了メールに記載されています。メールをご確認ください。</p>
              </div>
            )}
          </div>

          {/* ======================================================
              STEP 2: 購入者LINEに登録 → コードを送信
              ====================================================== */}
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-2xl p-5 mb-5 text-left">
            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">STEP 2</p>
            <p className="font-extrabold text-lg mb-3">購入者専用LINEに登録して送信</p>

            <div className="bg-white/10 rounded-xl p-4 mb-4 text-sm leading-relaxed">
              購入者専用LINEに登録後、コピーした
              <strong className="block mt-1 text-yellow-300 font-mono text-base">
                {purchaseCode ?? 'start_〇〇〇〇〇〇〇〇〇〇〇〇〇〇〇〇'}
              </strong>
              をそのまま送信してください。<br />
              <span className="text-green-200 text-xs mt-1 block">→ 講座URLとご案内が自動で届きます</span>
            </div>

            <a
              href={buyerLineAddUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-white text-green-700 font-extrabold py-4 rounded-xl text-center text-lg hover:bg-green-50 transition-colors shadow-lg"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.03 2 11c0 2.78 1.3 5.27 3.36 6.99L4.5 22l4.26-1.36C9.73 21.51 10.85 21.75 12 21.75 17.52 21.75 22 17.72 22 11s-4.48-9-10-9z"/>
                </svg>
                購入者専用LINEに登録する
              </span>
            </a>
          </div>

          {/* ステップ概要 */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-5 text-left">
            <h3 className="font-bold text-gray-700 mb-3 text-sm">📋 全体の流れ</h3>
            <ol className="space-y-2">
              {[
                { step: 1, text: '購入コードをコピー', done: !!purchaseCode },
                { step: 2, text: '購入者専用LINEに登録', done: false },
                { step: 3, text: 'コードを送信 → 講座URLが届く', done: false },
                { step: 4, text: '講座を受講・アフィリエイト参加（任意）', done: false },
              ].map((item) => (
                <li key={item.step} className="flex items-center gap-3">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    item.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {item.done ? '✓' : item.step}
                  </span>
                  <p className={`text-sm ${item.done ? 'text-green-700 font-semibold' : 'text-gray-600'}`}>
                    {item.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/* 困ったときは */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-5 text-left">
            <p className="text-xs font-semibold text-yellow-800 mb-1">⚠ うまくいかない場合</p>
            <p className="text-xs text-yellow-700">
              購入コードが不明な場合は、購入時のメールアドレスを添えてお問い合わせください。
            </p>
          </div>

          <a href="/" className="text-sm text-gray-400 hover:text-gray-600 underline">
            トップページへ戻る
          </a>
        </div>
      </div>
    </div>
  );
}
