// netlify/functions/admin-api.js
// 管理者API (CRUD操作)

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());

// 管理者認証チェック
function checkAdminAuth(headers) {
  const authHeader = headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '');
  // 簡易チェック: 実際はJWT検証
  return token === process.env.ADMIN_SECRET_TOKEN;
}

exports.handler = async (event) => {
  // CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: '',
    };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  const path = event.path.replace('/api/admin-api', '').replace('/.netlify/functions/admin-api', '');
  const method = event.httpMethod;
  const params = event.queryStringParameters || {};

  try {
    // ダッシュボード統計
    if (path === '/dashboard' && method === 'GET') {
      return await getDashboardStats(headers);
    }

    // 商品一覧
    if (path === '/products' && method === 'GET') {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // 商品作成
    if (path === '/products' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { data, error } = await supabase.from('products').insert(body).select().single();
      if (error) throw error;
      return { statusCode: 201, headers, body: JSON.stringify(data) };
    }

    // 商品更新
    if (path.startsWith('/products/') && method === 'PUT') {
      const id = path.split('/')[2];
      const body = JSON.parse(event.body || '{}');
      delete body.id;
      const { data, error } = await supabase.from('products').update(body).eq('id', id).select().single();
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // キャンペーン一覧
    if (path === '/campaigns' && method === 'GET') {
      const { data, error } = await supabase
        .from('affiliate_campaigns')
        .select(`*, product:products(id, name, price)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // キャンペーン作成
    if (path === '/campaigns' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { data, error } = await supabase.from('affiliate_campaigns').insert(body).select().single();
      if (error) throw error;
      return { statusCode: 201, headers, body: JSON.stringify(data) };
    }

    // キャンペーン更新
    if (path.startsWith('/campaigns/') && method === 'PUT') {
      const id = path.split('/')[2];
      const body = JSON.parse(event.body || '{}');
      
      // 報酬条件変更履歴
      if (body.commission_amount !== undefined || body.commission_type !== undefined) {
        const { data: existing } = await supabase
          .from('affiliate_campaigns')
          .select('commission_type, commission_amount')
          .eq('id', id)
          .single();
        
        if (existing && (existing.commission_amount !== body.commission_amount || existing.commission_type !== body.commission_type)) {
          await supabase.from('commission_rate_history').insert({
            campaign_id: id,
            old_commission_type: existing.commission_type,
            old_commission_amount: existing.commission_amount,
            new_commission_type: body.commission_type || existing.commission_type,
            new_commission_amount: body.commission_amount !== undefined ? body.commission_amount : existing.commission_amount,
            changed_by: params.admin_email || 'admin',
            change_reason: body.change_reason || '',
          });
        }
      }

      delete body.id;
      delete body.change_reason;
      const { data, error } = await supabase.from('affiliate_campaigns').update(body).eq('id', id).select().single();
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // 紹介者一覧
    if (path === '/affiliates' && method === 'GET') {
      const { data, error } = await supabase
        .from('affiliates')
        .select(`
          *,
          scores:affiliate_scores(overall_score, diagnosis_type),
          tags:affiliate_tag_assignments(tag:affiliate_tags(id, name, color))
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // 紹介者作成
    if (path === '/affiliates' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      
      // 紹介者コード自動生成
      if (!body.affiliate_code) {
        body.affiliate_code = generateAffiliateCode(body.name);
      }
      
      const { data, error } = await supabase.from('affiliates').insert(body).select().single();
      if (error) throw error;
      return { statusCode: 201, headers, body: JSON.stringify(data) };
    }

    // 紹介者更新
    if (path.startsWith('/affiliates/') && method === 'PUT') {
      const id = path.split('/')[2];
      const body = JSON.parse(event.body || '{}');
      delete body.id;
      const { data, error } = await supabase.from('affiliates').update(body).eq('id', id).select().single();
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // 購入一覧
    if (path === '/purchases' && method === 'GET') {
      const query = supabase
        .from('purchases')
        .select('*')
        .order('purchased_at', { ascending: false });
      
      if (params.product_id) query.eq('product_id', params.product_id);
      if (params.campaign_id) query.eq('campaign_id', params.campaign_id);
      if (params.affiliate_id) query.eq('affiliate_id', params.affiliate_id);
      if (params.status) query.eq('status', params.status);
      
      const { data, error } = await query.limit(params.limit || 100);
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // 報酬一覧
    if (path === '/commissions' && method === 'GET') {
      const { data, error } = await supabase
        .from('commissions')
        .select(`
          *,
          purchase:purchases(product_name, amount_total, purchased_at, buyer_line_display_name),
          affiliate:affiliates(name, affiliate_code)
        `)
        .order('created_at', { ascending: false })
        .limit(params.limit || 100);
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // 報酬承認
    if (path.startsWith('/commissions/') && path.endsWith('/approve') && method === 'POST') {
      const id = path.split('/')[2];
      const body = JSON.parse(event.body || '{}');
      
      const { data, error } = await supabase
        .from('commissions')
        .update({
          status: 'approved',
          approved_by: body.approved_by || 'admin',
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // 紹介者通知
      await supabase.from('notifications').insert({
        recipient_type: 'affiliate',
        recipient_id: data.affiliate_id,
        type: 'commission_approved',
        title: '報酬が承認されました',
        body: `${data.amount.toLocaleString()}円の報酬が承認されました。`,
        related_type: 'commission',
        related_id: id,
      });

      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // お知らせ一覧
    if (path === '/announcements' && method === 'GET') {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // お知らせ作成
    if (path === '/announcements' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { data, error } = await supabase.from('announcements').insert(body).select().single();
      if (error) throw error;
      return { statusCode: 201, headers, body: JSON.stringify(data) };
    }

    // 顧客一覧
    if (path === '/leads' && method === 'GET') {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(params.limit || 100);
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // 不正疑い一覧
    if (path === '/suspicious' && method === 'GET') {
      const { data, error } = await supabase
        .from('suspicious_events')
        .select(`
          *,
          affiliate:affiliates(name, affiliate_code)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // ランキング
    if (path === '/ranking' && method === 'GET') {
      return await getRanking(params, headers);
    }

    // CSV出力
    if (path.startsWith('/csv/') && method === 'GET') {
      return await exportCsv(path.split('/')[2], params, headers);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found', path }),
    };
  } catch (error) {
    console.error('Admin API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message }),
    };
  }
};

async function getDashboardStats(headers) {
  const [
    { data: purchases },
    { data: commissions },
    { data: campaigns },
    { data: suspicious },
    { data: clicks },
    { data: leads },
    { data: seminarViews },
  ] = await Promise.all([
    supabase.from('purchases').select('amount_total, status, purchased_at, affiliate_id'),
    supabase.from('commissions').select('amount, status'),
    supabase.from('affiliate_campaigns').select('id, status'),
    supabase.from('suspicious_events').select('id, status').eq('status', 'open'),
    supabase.from('clicks').select('id', { count: 'exact', head: true }),
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('seminar_views').select('id', { count: 'exact', head: true }),
  ]);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const completedPurchases = (purchases || []).filter(p => p.status === 'completed');
  const thisMonthPurchases = completedPurchases.filter(p => p.purchased_at >= thisMonthStart);

  const stats = {
    totalRevenue: completedPurchases.reduce((s, p) => s + p.amount_total, 0),
    totalSales: completedPurchases.length,
    monthlyRevenue: thisMonthPurchases.reduce((s, p) => s + p.amount_total, 0),
    monthlySales: thisMonthPurchases.length,
    totalClicks: clicks?.length || 0,
    totalLineRegistrations: leads?.length || 0,
    totalSeminarViews: seminarViews?.length || 0,
    totalPurchases: completedPurchases.length,
    pendingCommissions: (commissions || []).filter(c => c.status === 'pending' || c.status === 'approved' || c.status === 'payable').reduce((s, c) => s + c.amount, 0),
    paidCommissions: (commissions || []).filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0),
    activeCampaigns: (campaigns || []).filter(c => c.status === 'active').length,
    pausedCampaigns: (campaigns || []).filter(c => c.status === 'paused').length,
    suspiciousCount: (suspicious || []).length,
  };

  return { statusCode: 200, headers, body: JSON.stringify(stats) };
}

async function getRanking(params, headers) {
  const criteria = params.criteria || 'commission_amount';
  
  let query;
  
  if (criteria === 'commission_amount') {
    const { data } = await supabase.rpc('get_affiliate_ranking_by_commission');
    if (data) return { statusCode: 200, headers, body: JSON.stringify(data) };
  }

  // フォールバック
  const { data } = await supabase
    .from('affiliates')
    .select(`
      id, name, affiliate_code, status,
      commissions(amount, status)
    `)
    .eq('status', 'active');

  const ranked = (data || [])
    .map(a => ({
      ...a,
      total_commission: a.commissions
        .filter((c) => c.status !== 'cancelled' && c.status !== 'rejected')
        .reduce((s, c) => s + c.amount, 0),
    }))
    .sort((a, b) => b.total_commission - a.total_commission)
    .map((a, i) => ({ ...a, rank: i + 1 }));

  return { statusCode: 200, headers, body: JSON.stringify(ranked) };
}

async function exportCsv(type, params, headers) {
  let data = [];
  let filename = `${type}_export.csv`;

  switch (type) {
    case 'purchases': {
      const { data: purchases } = await supabase
        .from('purchases')
        .select('*')
        .order('purchased_at', { ascending: false });
      data = purchases || [];
      filename = 'purchases_export.csv';
      break;
    }
    case 'commissions': {
      const { data: commissions } = await supabase
        .from('commissions')
        .select(`*, affiliate:affiliates(name, affiliate_code), purchase:purchases(product_name, purchased_at)`)
        .order('created_at', { ascending: false });
      data = commissions || [];
      filename = 'commissions_export.csv';
      break;
    }
    case 'affiliates': {
      const { data: affiliates } = await supabase
        .from('affiliates')
        .select('*')
        .order('created_at', { ascending: false });
      data = affiliates || [];
      filename = 'affiliates_export.csv';
      break;
    }
    case 'leads': {
      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      data = leads || [];
      filename = 'leads_export.csv';
      break;
    }
    case 'clicks': {
      const { data: clicks } = await supabase
        .from('clicks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10000);
      data = clicks || [];
      filename = 'clicks_export.csv';
      break;
    }
  }

  if (!data.length) {
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Disposition': `attachment; filename="${filename}"` },
      body: 'No data',
    };
  }

  // CSV生成
  const keys = Object.keys(data[0]);
  const csvRows = [
    keys.join(','),
    ...data.map(row =>
      keys.map(key => {
        const val = row[key];
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    ),
  ];

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Access-Control-Allow-Origin': '*',
    },
    body: '\ufeff' + csvRows.join('\n'), // BOM付き
  };
}

function generateAffiliateCode(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 8);
  const random = Math.random().toString(36).substring(2, 6);
  return `${base}_${random}`;
}
