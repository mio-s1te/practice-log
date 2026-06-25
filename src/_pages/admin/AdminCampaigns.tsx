// src/pages/admin/AdminCampaigns.tsx
import { useState, useEffect } from 'react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/LoadingSpinner';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<any>({});
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        fetch('/api/admin-api/campaigns'),
        fetch('/api/admin-api/products'),
      ]);
      if (cRes.ok) setCampaigns(await cRes.json());
      else setDemoCampaigns();
      if (pRes.ok) setProducts(await pRes.json());
    } catch { setDemoCampaigns(); }
    finally { setLoading(false); }
  };

  const setDemoCampaigns = () => {
    setCampaigns([{
      id: 'demo-c1', name: 'スタート講座1,000部突破キャンペーン',
      status: 'active', commission_type: 'fixed', commission_amount: 10000,
      sales_limit: 1000, current_sales: 100, sales_count_type: 'total_product_sales',
      auto_stop_enabled: true, attribution_rule: 'same_campaign_only',
      product: { name: 'AI副業1時間化スタート講座' },
      created_at: new Date().toISOString(),
    }]);
  };

  const handleSave = async () => {
    try {
      const url = editCampaign.id ? `/api/admin-api/campaigns/${editCampaign.id}` : '/api/admin-api/campaigns';
      const method = editCampaign.id ? 'PUT' : 'POST';
      // 新規作成時のデフォルト値を確実に設定
      const payload = {
        access_type: 'public',
        status: 'active',
        commission_type: 'fixed',
        attribution_rule: 'same_campaign_only',
        auto_stop_enabled: false,
        ...editCampaign,
      };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) { await fetchData(); setModalOpen(false); }
      else {
        const err = await res.json().catch(() => ({}));
        alert('保存に失敗しました: ' + (err.message || err.error || res.status));
      }
    } catch (e: any) { alert('エラー: ' + e.message); }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">🎯 案件管理</h1>
        <button onClick={() => { setEditCampaign({}); setModalOpen(true); }} className="btn-primary">
          + 案件追加
        </button>
      </div>

      {campaigns.map(campaign => (
        <div key={campaign.id} className="card">
          <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{campaign.name}</h3>
              <p className="text-sm text-gray-500">{campaign.product?.name}</p>
            </div>
            <StatusBadge status={campaign.status} />
          </div>

          {/* 販売進捗バー */}
          {campaign.sales_limit && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>販売進捗: {campaign.current_sales} / {campaign.sales_limit}部</span>
                <span>{((campaign.current_sales / campaign.sales_limit) * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all"
                  style={{ width: `${Math.min((campaign.current_sales / campaign.sales_limit) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">残り{Math.max(0, campaign.sales_limit - campaign.current_sales)}部</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">紹介報酬</p>
              <p className="font-bold text-green-700">
                {campaign.commission_type === 'fixed'
                  ? `¥${campaign.commission_amount.toLocaleString()}`
                  : `${campaign.commission_amount}%`}
              </p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">カウント方式</p>
              <p className="font-bold text-blue-700 text-sm">
                {campaign.sales_count_type === 'total_product_sales' ? '総販売数' :
                 campaign.sales_count_type === 'affiliate_sales_only' ? 'アフィリエイトのみ' : 'キャンペーンのみ'}
              </p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">報酬ルール</p>
              <p className="font-bold text-purple-700 text-sm">
                {campaign.attribution_rule === 'same_campaign_only' ? '同一キャンペーンのみ' : campaign.attribution_rule}
              </p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">自動停止</p>
              <p className="font-bold text-yellow-700">{campaign.auto_stop_enabled ? '有効' : '無効'}</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setEditCampaign(campaign); setModalOpen(true); }}
              className="btn-secondary text-sm py-1.5"
            >
              編集
            </button>
            <button
              onClick={async () => {
                const newStatus = campaign.status === 'active' ? 'paused' : 'active';
                await fetch(`/api/admin-api/campaigns/${campaign.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: newStatus }),
                });
                fetchData();
              }}
              className={`text-sm py-1.5 px-4 rounded-xl font-semibold transition-colors ${
                campaign.status === 'active'
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {campaign.status === 'active' ? '一時停止' : '再開'}
            </button>
          </div>
        </div>
      ))}

      {/* 案件編集モーダル */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editCampaign.id ? '案件編集' : '案件追加'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">案件名 *</label>
            <input
              type="text"
              value={editCampaign.name || ''}
              onChange={e => setEditCampaign((p: any) => ({ ...p, name: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">対象商品</label>
            <select
              value={editCampaign.product_id || ''}
              onChange={e => setEditCampaign((p: any) => ({ ...p, product_id: e.target.value }))}
              className="select-field"
            >
              <option value="">選択してください</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">報酬タイプ</label>
              <select
                value={editCampaign.commission_type || 'fixed'}
                onChange={e => setEditCampaign((p: any) => ({ ...p, commission_type: e.target.value }))}
                className="select-field"
              >
                <option value="fixed">固定額</option>
                <option value="percent">パーセント</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                報酬額 ({editCampaign.commission_type === 'percent' ? '%' : '円'})
              </label>
              <input
                type="number"
                value={editCampaign.commission_amount || 0}
                onChange={e => setEditCampaign((p: any) => ({ ...p, commission_amount: parseInt(e.target.value) }))}
                className="input-field"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">販売上限数</label>
              <input
                type="number"
                value={editCampaign.sales_limit || ''}
                onChange={e => setEditCampaign((p: any) => ({ ...p, sales_limit: parseInt(e.target.value) || null }))}
                className="input-field"
                placeholder="なしの場合は空欄"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">販売カウント方式</label>
              <select
                value={editCampaign.sales_count_type || 'total_product_sales'}
                onChange={e => setEditCampaign((p: any) => ({ ...p, sales_count_type: e.target.value }))}
                className="select-field"
              >
                <option value="total_product_sales">総販売数</option>
                <option value="affiliate_sales_only">アフィリエイトのみ</option>
                <option value="campaign_sales_only">キャンペーンのみ</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">報酬ルール</label>
            <select
              value={editCampaign.attribution_rule || 'same_campaign_only'}
              onChange={e => setEditCampaign((p: any) => ({ ...p, attribution_rule: e.target.value }))}
              className="select-field"
            >
              <option value="same_campaign_only">同一キャンペーンのみ</option>
              <option value="first_touch">ファーストタッチ</option>
              <option value="last_touch">ラストタッチ</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto_stop"
              checked={editCampaign.auto_stop_enabled !== false}
              onChange={e => setEditCampaign((p: any) => ({ ...p, auto_stop_enabled: e.target.checked }))}
            />
            <label htmlFor="auto_stop" className="text-sm text-gray-700">自動停止を有効にする</label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">アクセスタイプ</label>
            <select
              value={editCampaign.access_type || 'public'}
              onChange={e => setEditCampaign((p: any) => ({ ...p, access_type: e.target.value }))}
              className="select-field"
            >
              <option value="public">公開（全員アクセス可）</option>
              <option value="tag_based">タグ限定</option>
              <option value="approved_only">承認済みのみ</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">※「公開」にすると全紹介者が案件を確認できます</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
            <select
              value={editCampaign.status || 'active'}
              onChange={e => setEditCampaign((p: any) => ({ ...p, status: e.target.value }))}
              className="select-field"
            >
              <option value="active">稼働中</option>
              <option value="paused">一時停止</option>
              <option value="ended">終了</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">案件説明</label>
            <textarea
              value={editCampaign.description || ''}
              onChange={e => setEditCampaign((p: any) => ({ ...p, description: e.target.value }))}
              className="input-field h-24 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">キャンセル</button>
            <button onClick={handleSave} className="btn-primary flex-1">保存</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
