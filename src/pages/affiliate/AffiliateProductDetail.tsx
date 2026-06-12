// src/pages/affiliate/AffiliateProductDetail.tsx
// アフィリエイター用 商品詳細ページ
// - 紹介権限のある商品のみ表示
// - 自分専用紹介URL・報酬条件・紹介素材・禁止表現・FAQ を表示

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin;

// ============================================================
// 型定義
// ============================================================
interface ProductDetail {
  permission_id: string;
  product_id: string;
  product_name: string;
  product_description: string;
  product_price: number;
  product_status: string;
  product_lp_url: string;
  affiliate_lp_url: string;
  can_refer: boolean;
  access_level: string;
  commission_type: string;
  commission_fixed: number | null;
  commission_percent: number | null;
  commission_trigger: string;
  commission_confirm_timing: string;
  commission_on_refund: string;
  commission_on_cancel: string;
  commission_on_chargeback: string;
  refund_period_days: number;
  revoke_commission_on_refund: boolean;
  commission_hold_days: number;
  short_description: string | null;
  long_description: string | null;
  sns_post_example: string | null;
  line_intro_text: string | null;
  story_text: string | null;
  pr_notation_example: string | null;
  prohibited_expressions: string | null;
  faq: string | null;
  selling_points: string | null;
  discouraged_expressions: string | null;
  affiliate_code: string;
}

// ============================================================
// 小コンポーネント
// ============================================================
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
        copied ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {copied ? '✓ コピー済み' : `📋 ${label || 'コピー'}`}
    </button>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span>{icon}</span>
        <span>{title}</span>
      </h2>
      {children}
    </div>
  );
}

function CommissionLabel(timing: string) {
  const map: Record<string, string> = {
    immediate: '即時確定',
    '14d_after_purchase': '購入から14日後',
    '30d_after_purchase': '購入から30日後',
    '60d_after_purchase': '購入から60日後',
    manual: '手動確定',
  };
  return map[timing] || timing;
}

function CommissionRefundLabel(val: string) {
  const map: Record<string, string> = {
    cancel: '報酬取り消し',
    keep: '報酬維持',
    partial: '一部取り消し',
    clawback: '報酬回収',
  };
  return map[val] || val;
}

// ============================================================
// メインコンポーネント
// ============================================================
export function AffiliateProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'commission' | 'materials' | 'faq'>('overview');

  function getToken() {
    return sessionStorage.getItem('affiliate_token') || '';
  }

  useEffect(() => {
    if (!productId) { setError('商品IDが指定されていません'); setLoading(false); return; }
    const token = getToken();
    if (!token) { navigate('/affiliate/login'); return; }

    fetch(`/.netlify/functions/affiliate-api/products/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async res => {
        if (res.status === 401) { navigate('/affiliate/login'); return; }
        if (res.status === 403) { setError('この商品の詳細を閲覧する権限がありません。'); setLoading(false); return; }
        if (res.status === 404) { setError('商品が見つかりません。'); setLoading(false); return; }
        if (!res.ok) { setError('データの取得に失敗しました。'); setLoading(false); return; }
        const data = await res.json();
        setDetail(data);
      })
      .catch(() => setError('通信エラーが発生しました。'))
      .finally(() => setLoading(false));
  }, [productId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <p className="text-5xl mb-4">🔒</p>
        <p className="text-gray-700 font-bold mb-2">{error || '商品が見つかりません'}</p>
        <p className="text-gray-500 text-sm mb-6">紹介権限のある商品のみ表示されます。</p>
        <button onClick={() => navigate('/affiliate/dashboard')} className="btn-secondary">← ダッシュボードに戻る</button>
      </div>
    );
  }

  // 紹介URL
  const referralUrl = `${SITE_URL}${detail.affiliate_lp_url || detail.product_lp_url}?ref=${detail.affiliate_code}`;

  // 報酬額の表示
  const commissionDisplay =
    detail.commission_type === 'percent'
      ? `${detail.commission_percent}%（¥${Math.floor(detail.product_price * (detail.commission_percent || 0) / 100).toLocaleString()}）`
      : detail.commission_type === 'fixed'
      ? `¥${(detail.commission_fixed || 0).toLocaleString()}`
      : '報酬なし';

  const TABS = [
    { key: 'overview', label: '概要・紹介URL', icon: '🔗' },
    { key: 'commission', label: '報酬条件', icon: '💰' },
    { key: 'materials', label: '紹介素材', icon: '📝' },
    { key: 'faq', label: 'FAQ', icon: '❓' },
  ] as const;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/affiliate/dashboard')} className="text-gray-400 hover:text-gray-700 text-sm flex items-center gap-1">
          ← 戻る
        </button>
      </div>

      {/* 商品ヘッダーカード */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white rounded-2xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-blue-200 text-xs mb-1">紹介可能な商品</p>
            <h1 className="text-xl font-bold mb-1">{detail.product_name}</h1>
            <p className="text-blue-200 text-sm">
              現在価格: <span className="font-bold text-white text-lg">¥{detail.product_price.toLocaleString()}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs mb-1">あなたの報酬</p>
            <p className="text-2xl font-extrabold text-yellow-300">{commissionDisplay}</p>
          </div>
        </div>
      </div>

      {/* タブナビ */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              activeTab === tab.key ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ==============================
          タブ: 概要・紹介URL
          ============================== */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* 商品説明 */}
          <Section title="商品説明" icon="📦">
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{detail.product_description}</p>
            {detail.product_lp_url && (
              <a href={detail.product_lp_url} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1 mt-3 text-blue-600 text-sm hover:underline">
                販売ページを確認 ↗
              </a>
            )}
          </Section>

          {/* 自分専用紹介URL */}
          <Section title="あなた専用の紹介URL" icon="🔗">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1.5">この URLをシェアすることで成果が計測されます</p>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-sm text-blue-700 font-mono bg-blue-50 px-3 py-2 rounded-lg flex-1 min-w-0 overflow-x-auto whitespace-nowrap">
                  {referralUrl}
                </code>
                <CopyButton text={referralUrl} label="URLをコピー" />
              </div>
            </div>
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              <p className="font-bold mb-1">PR表記について</p>
              <p className="leading-relaxed">
                {detail.pr_notation_example || '広告・アフィリエイトリンクを使用する場合は「#PR」「#広告」等のPR表記が必要です。\nSNS・ブログ・LINEなどすべての媒体で表記してください。'}
              </p>
            </div>
          </Section>

          {/* 紹介用LPとアフィリエイトコード */}
          <Section title="紹介情報" icon="📌">
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-500">アフィリエイトコード</dt>
                <dd className="flex items-center gap-2">
                  <code className="text-sm font-mono font-bold text-gray-900">{detail.affiliate_code}</code>
                  <CopyButton text={detail.affiliate_code} label="コード" />
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-500">紹介用LP</dt>
                <dd>
                  <a href={detail.affiliate_lp_url || detail.product_lp_url} target="_blank" rel="noopener noreferrer"
                     className="text-blue-600 text-sm hover:underline">
                    {detail.affiliate_lp_url || detail.product_lp_url} ↗
                  </a>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-500">アクセスレベル</dt>
                <dd className="text-sm text-gray-700">{detail.access_level}</dd>
              </div>
            </dl>
          </Section>
        </div>
      )}

      {/* ==============================
          タブ: 報酬条件
          ============================== */}
      {activeTab === 'commission' && (
        <div className="space-y-4">
          <Section title="報酬額" icon="💰">
            <div className="text-center py-4">
              <p className="text-4xl font-extrabold text-green-600">{commissionDisplay}</p>
              <p className="text-sm text-gray-500 mt-1">
                {detail.commission_type === 'percent' ? `商品価格¥${detail.product_price.toLocaleString()}の${detail.commission_percent}%` : '固定報酬'}
              </p>
            </div>
          </Section>

          <Section title="報酬発生・確定タイミング" icon="⏱️">
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">報酬発生条件</dt>
                <dd className="text-sm font-medium text-gray-800">
                  {detail.commission_trigger === 'purchase' ? '購入完了時' : detail.commission_trigger === 'confirmed' ? '報酬確定後' : 'クリック時'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">報酬確定タイミング</dt>
                <dd className="text-sm font-medium text-gray-800">{CommissionLabel(detail.commission_confirm_timing)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">報酬確定前の保留期間</dt>
                <dd className="text-sm font-medium text-gray-800">購入から{detail.commission_hold_days}日間</dd>
              </div>
            </dl>
          </Section>

          <Section title="返金・キャンセル時の扱い" icon="↩️">
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-500">返金可能期間</dt>
                <dd className="text-sm font-medium text-gray-800">{detail.refund_period_days}日以内</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-500">返金時</dt>
                <dd className={`text-sm font-medium ${detail.commission_on_refund === 'cancel' ? 'text-red-600' : 'text-green-600'}`}>
                  {CommissionRefundLabel(detail.commission_on_refund)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-500">キャンセル時</dt>
                <dd className={`text-sm font-medium ${detail.commission_on_cancel === 'cancel' ? 'text-red-600' : 'text-green-600'}`}>
                  {CommissionRefundLabel(detail.commission_on_cancel)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-500">チャージバック時</dt>
                <dd className={`text-sm font-medium ${detail.commission_on_chargeback !== 'keep' ? 'text-red-600' : 'text-green-600'}`}>
                  {CommissionRefundLabel(detail.commission_on_chargeback)}
                </dd>
              </div>
            </dl>
            {detail.revoke_commission_on_refund && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                ⚠ 返金が発生した場合、報酬は取り消しになります。
              </div>
            )}
          </Section>

          {/* PR表記ルール */}
          <Section title="PR表記ルール" icon="📢">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <p className="font-bold mb-2">必須のPR表記</p>
              <p className="text-xs leading-relaxed whitespace-pre-wrap">
                {detail.pr_notation_example || '広告・アフィリエイトリンクを使用する際は「#PR」「#広告」等の明示が必要です。\n全ての媒体（SNS・ブログ・LINE等）で表記してください。'}
              </p>
            </div>
            {detail.prohibited_expressions && (
              <div className="mt-3">
                <p className="text-sm font-medium text-red-600 mb-2">🚫 禁止表現</p>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs text-red-700 leading-relaxed whitespace-pre-wrap">{detail.prohibited_expressions}</p>
                </div>
              </div>
            )}
            {detail.discouraged_expressions && (
              <div className="mt-3">
                <p className="text-sm font-medium text-yellow-600 mb-2">⚠ 推奨しない表現</p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <p className="text-xs text-yellow-700 leading-relaxed whitespace-pre-wrap">{detail.discouraged_expressions}</p>
                </div>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ==============================
          タブ: 紹介素材
          ============================== */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          {detail.selling_points && (
            <Section title="紹介してほしいポイント" icon="💡">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{detail.selling_points}</p>
            </Section>
          )}

          {detail.short_description && (
            <Section title="短文紹介文（SNS向け）" icon="📱">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 mb-2">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{detail.short_description}</p>
              </div>
              <CopyButton text={detail.short_description} label="テキストをコピー" />
            </Section>
          )}

          {detail.sns_post_example && (
            <Section title="SNS投稿例" icon="📣">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 mb-2">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{detail.sns_post_example}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <CopyButton text={detail.sns_post_example} label="投稿例をコピー" />
                <CopyButton
                  text={detail.sns_post_example.replace(/\[紹介URL\]/g, referralUrl)}
                  label="URL挿入済みでコピー"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">「[紹介URL]」の部分があなたの紹介URLに置き換わります</p>
            </Section>
          )}

          {detail.line_intro_text && (
            <Section title="LINE紹介文テンプレート" icon="💬">
              <div className="bg-green-50 rounded-xl p-3 border border-green-200 mb-2">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{detail.line_intro_text}</p>
              </div>
              <div className="flex gap-2">
                <CopyButton text={detail.line_intro_text} label="LINE文をコピー" />
                <CopyButton
                  text={detail.line_intro_text.replace(/\[紹介URL\]/g, referralUrl)}
                  label="URL挿入済みでコピー"
                />
              </div>
            </Section>
          )}

          {detail.story_text && (
            <Section title="ストーリー文（Instagram等）" icon="📸">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 mb-2">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{detail.story_text}</p>
              </div>
              <CopyButton text={detail.story_text} label="ストーリー文をコピー" />
            </Section>
          )}

          {detail.long_description && (
            <Section title="長文紹介文（ブログ・LP向け）" icon="📄">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 mb-2 max-h-60 overflow-y-auto">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{detail.long_description}</p>
              </div>
              <CopyButton text={detail.long_description} label="長文をコピー" />
            </Section>
          )}

          {/* 素材がない場合 */}
          {!detail.short_description && !detail.sns_post_example && !detail.line_intro_text && !detail.long_description && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">📝</p>
              <p className="text-sm">紹介素材はまだ準備されていません</p>
              <p className="text-xs mt-1">管理者が素材を追加するとここに表示されます</p>
            </div>
          )}
        </div>
      )}

      {/* ==============================
          タブ: FAQ
          ============================== */}
      {activeTab === 'faq' && (
        <div className="space-y-4">
          {detail.faq ? (
            <Section title="よくある質問（Q&A）" icon="❓">
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{detail.faq}</div>
            </Section>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">❓</p>
              <p className="text-sm">FAQはまだ準備されていません</p>
            </div>
          )}

          {/* PR表記・禁止表現の確認カード */}
          <Section title="紹介ルールの確認" icon="📋">
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-800 mb-1">必須: PR表記</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  {detail.pr_notation_example || '「#PR」「#広告」等の表記が必要です。すべての媒体で表記してください。'}
                </p>
              </div>
              {detail.prohibited_expressions && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-red-700 mb-1">禁止: 以下の表現は使用しないでください</p>
                  <p className="text-xs text-red-600 leading-relaxed whitespace-pre-wrap">{detail.prohibited_expressions}</p>
                </div>
              )}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
