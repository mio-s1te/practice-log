// netlify/functions/affiliate-api.js
// 紹介者API

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// セッション有効期限 (秒)
const SESSION_EXPIRE_DAYS = 30;
const SESSION_ABSOLUTE_EXPIRE_DAYS = 90;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      },
      body: '',
    };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  const path = event.path.replace('/.netlify/functions/affiliate-api', '');
  const method = event.httpMethod;

  try {
    // ログイン (メールリンク送信)
    if (path === '/login/request' && method === 'POST') {
      const { email } = JSON.parse(event.body || '{}');
      return await requestLoginLink(email, headers);
    }

    // ログイン確認 (トークン確認)
    if (path === '/login/verify' && method === 'POST') {
      const { token } = JSON.parse(event.body || '{}');
      return await verifyLoginToken(token, headers);
    }

    // セッション延長
    if (path === '/session/extend' && method === 'POST') {
      const sessionToken = getSessionToken(event);
      return await extendSession(sessionToken, headers);
    }

    // 認証が必要なエンドポイント
    const sessionToken = getSessionToken(event);
    const affiliate = await getAffiliateFromSession(sessionToken);
    
    if (!affiliate) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // ダッシュボード統計
    if (path === '/dashboard' && method === 'GET') {
      return await getDashboard(affiliate, headers);
    }

    // 通知一覧
    if (path === '/notifications' && method === 'GET') {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_type', 'affiliate')
        .eq('recipient_id', affiliate.id)
        .order('sent_at', { ascending: false })
        .limit(50);
      
      const unreadCount = (data || []).filter(n => !n.is_read).length;
      return { statusCode: 200, headers, body: JSON.stringify({ notifications: data, unreadCount }) };
    }

    // 通知既読
    if (path.startsWith('/notifications/') && path.endsWith('/read') && method === 'POST') {
      const id = path.split('/')[2];
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('recipient_id', affiliate.id);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // お知らせ一覧
    if (path === '/announcements' && method === 'GET') {
      return await getAnnouncements(affiliate, headers);
    }

    // お知らせ既読
    if (path.startsWith('/announcements/') && path.endsWith('/read') && method === 'POST') {
      const id = path.split('/')[2];
      await supabase.from('announcement_reads').upsert({
        announcement_id: id,
        affiliate_id: affiliate.id,
        read_at: new Date().toISOString(),
      }, { onConflict: 'announcement_id,affiliate_id' });
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // プロフィール取得
    if (path === '/profile' && method === 'GET') {
      return { statusCode: 200, headers, body: JSON.stringify(affiliate) };
    }

    // 振込先更新（要再認証）
    if (path === '/payout-account' && method === 'PUT') {
      const { reauth_token, payout_account, payout_method } = JSON.parse(event.body || '{}');
      // 本番では再認証チェック
      const { data, error } = await supabase
        .from('affiliates')
        .update({ payout_account, payout_method })
        .eq('id', affiliate.id)
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // 参加案件一覧
    if (path === '/campaigns' && method === 'GET') {
      const { data, error } = await supabase
        .from('campaign_affiliates')
        .select(`
          *,
          campaign:affiliate_campaigns(
            *,
            product:products(id, name, price, lp_url)
          )
        `)
        .eq('affiliate_id', affiliate.id)
        .eq('status', 'active');
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // 紹介素材
    if (path.startsWith('/promo-assets/') && method === 'GET') {
      const campaignId = path.split('/')[2];
      const { data, error } = await supabase
        .from('promo_assets')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // 購入履歴
    if (path === '/purchases' && method === 'GET') {
      const { data, error } = await supabase
        .from('purchases')
        .select('id, product_name, amount_total, commission_amount, commission_status, purchased_at, buyer_line_display_name')
        .eq('affiliate_id', affiliate.id)
        .order('purchased_at', { ascending: false });
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // 報酬一覧
    if (path === '/commissions' && method === 'GET') {
      const { data, error } = await supabase
        .from('commissions')
        .select(`
          *,
          purchase:purchases(product_name, purchased_at, amount_total)
        `)
        .eq('affiliate_id', affiliate.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // スコア
    if (path === '/score' && method === 'GET') {
      const { data, error } = await supabase
        .from('affiliate_scores')
        .select('*')
        .eq('affiliate_id', affiliate.id)
        .single();
      return { statusCode: 200, headers, body: JSON.stringify(data || {}) };
    }

    // デイリー統計
    if (path === '/daily-stats' && method === 'GET') {
      const params = event.queryStringParameters || {};
      const days = parseInt(params.days || '30');
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('affiliate_daily_stats')
        .select('*')
        .eq('affiliate_id', affiliate.id)
        .gte('stat_date', startDate)
        .order('stat_date', { ascending: true });
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // ランキング位置
    if (path === '/ranking-position' && method === 'GET') {
      return await getRankingPosition(affiliate, headers);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    console.error('Affiliate API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

function getSessionToken(event) {
  const authHeader = event.headers['authorization'] || '';
  return authHeader.replace('Bearer ', '').trim();
}

async function getAffiliateFromSession(token) {
  if (!token) return null;
  
  const now = new Date().toISOString();
  const { data } = await supabase
    .from('affiliates')
    .select('*')
    .eq('session_token', token)
    .gt('session_expires_at', now)
    .gt('session_absolute_expires_at', now)
    .single();
  
  return data;
}

async function requestLoginLink(email, headers) {
  if (!email) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email required' }) };
  }

  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id, name, email')
    .eq('email', email)
    .single();

  if (!affiliate) {
    // セキュリティ: 存在しないメールでも成功を返す
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'ログインリンクを送信しました（登録済みの場合）' }),
    };
  }

  // ワンタイムトークン生成
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30分

  await supabase
    .from('affiliates')
    .update({
      session_token: `otp_${token}`,
      session_expires_at: expiresAt,
    })
    .eq('id', affiliate.id);

  // 実際のメール送信はメールサービスを使用
  // ここではコンソールに出力（本番はメール送信）
  const loginUrl = `${process.env.SITE_URL}/affiliate/login?token=${token}`;
  console.log(`Login link for ${email}: ${loginUrl}`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'ログインリンクを送信しました' }),
  };
}

async function verifyLoginToken(token, headers) {
  if (!token) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token required' }) };
  }

  const now = new Date().toISOString();
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('*')
    .eq('session_token', `otp_${token}`)
    .gt('session_expires_at', now)
    .single();

  if (!affiliate) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

  // セッショントークン発行
  const sessionToken = crypto.randomBytes(48).toString('hex');
  const sessionExpiresAt = new Date(Date.now() + SESSION_EXPIRE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const absoluteExpiresAt = new Date(Date.now() + SESSION_ABSOLUTE_EXPIRE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from('affiliates')
    .update({
      session_token: sessionToken,
      session_expires_at: sessionExpiresAt,
      session_absolute_expires_at: absoluteExpiresAt,
      last_login_at: new Date().toISOString(),
    })
    .eq('id', affiliate.id);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      session_token: sessionToken,
      affiliate_id: affiliate.id,
      name: affiliate.name,
      affiliate_code: affiliate.affiliate_code,
    }),
  };
}

async function extendSession(token, headers) {
  if (!token) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'No session' }) };
  }

  const now = new Date().toISOString();
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id, session_absolute_expires_at')
    .eq('session_token', token)
    .gt('session_expires_at', now)
    .single();

  if (!affiliate) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid session' }) };
  }

  // 絶対期限チェック
  if (new Date(affiliate.session_absolute_expires_at) <= new Date()) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session absolutely expired' }) };
  }

  const newExpiry = new Date(Date.now() + SESSION_EXPIRE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('affiliates')
    .update({ session_expires_at: newExpiry })
    .eq('id', affiliate.id);

  return { statusCode: 200, headers, body: JSON.stringify({ extended: true }) };
}

async function getDashboard(affiliate, headers) {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [
    { data: dailyStats },
    { data: commissions },
    { data: purchases },
    { data: lineRegs },
    { data: semViews },
  ] = await Promise.all([
    supabase
      .from('affiliate_daily_stats')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .gte('stat_date', thirtyDaysAgo)
      .order('stat_date', { ascending: true }),
    supabase
      .from('commissions')
      .select('amount, status, created_at')
      .eq('affiliate_id', affiliate.id),
    supabase
      .from('purchases')
      .select('amount_total, purchased_at')
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'completed'),
    supabase
      .from('attribution_events')
      .select('id, created_at')
      .eq('affiliate_id', affiliate.id)
      .eq('event_type', 'line_register'),
    supabase
      .from('seminar_views')
      .select('id, seminar_viewed_at')
      .eq('affiliate_id', affiliate.id),
  ]);

  const stats = dailyStats || [];
  const allCommissions = commissions || [];
  const allPurchases = purchases || [];

  // 今月統計
  const thisMonthStats = stats.filter(s => s.stat_date >= thisMonthStart.split('T')[0]);
  
  const thisMonthClicks = thisMonthStats.reduce((s, d) => s + d.clicks, 0);
  const thisMonthLineRegs = thisMonthStats.reduce((s, d) => s + d.line_registrations, 0);
  const thisMonthSemViews = thisMonthStats.reduce((s, d) => s + d.seminar_views, 0);
  const thisMonthPurchases = thisMonthStats.reduce((s, d) => s + d.purchases, 0);
  const thisMonthRevenue = thisMonthStats.reduce((s, d) => s + d.revenue, 0);
  const thisMonthCommission = thisMonthStats.reduce((s, d) => s + d.commission, 0);

  // 累計
  const totalClicks = stats.reduce((s, d) => s + d.clicks, 0);
  const totalLineRegs = (lineRegs || []).length;
  const totalSemViews = (semViews || []).length;
  const totalPurchases = allPurchases.length;
  const totalRevenue = allPurchases.reduce((s, p) => s + p.amount_total, 0);

  // 報酬
  const unpaidCommission = allCommissions
    .filter(c => ['pending', 'approved', 'payable'].includes(c.status))
    .reduce((s, c) => s + c.amount, 0);
  const paidCommission = allCommissions
    .filter(c => c.status === 'paid')
    .reduce((s, c) => s + c.amount, 0);
  const totalCommission = allCommissions
    .filter(c => !['cancelled', 'rejected', 'chargeback'].includes(c.status))
    .reduce((s, c) => s + c.amount, 0);

  // 成約率
  const thisMonthConversionRate = thisMonthClicks > 0 ? thisMonthPurchases / thisMonthClicks : 0;
  const totalConversionRate = totalClicks > 0 ? totalPurchases / totalClicks : 0;
  const clickToLineRate = totalClicks > 0 ? totalLineRegs / totalClicks : 0;
  const lineToSeminarRate = totalLineRegs > 0 ? totalSemViews / totalLineRegs : 0;
  const seminarToPurchaseRate = totalSemViews > 0 ? totalPurchases / totalSemViews : 0;
  const clickToPurchaseRate = totalClicks > 0 ? totalPurchases / totalClicks : 0;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      thisMonthClicks,
      thisMonthLineRegistrations: thisMonthLineRegs,
      thisMonthSeminarViews: thisMonthSemViews,
      thisMonthPurchases,
      thisMonthConversionRate,
      thisMonthRevenue,
      thisMonthCommission,
      unpaidCommission,
      paidCommission,
      totalClicks,
      totalLineRegistrations: totalLineRegs,
      totalSeminarViews: totalSemViews,
      totalPurchases,
      totalConversionRate,
      totalCommission,
      clickToLineRate,
      lineToSeminarRate,
      seminarToPurchaseRate,
      clickToPurchaseRate,
      dailyStats: stats,
    }),
  };
}

async function getAnnouncements(affiliate, headers) {
  const { data: announcements } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_published', true)
    .or(`target_type.eq.all_affiliates,target_type.eq.active_affiliates`)
    .order('published_at', { ascending: false });

  const { data: reads } = await supabase
    .from('announcement_reads')
    .select('announcement_id')
    .eq('affiliate_id', affiliate.id);

  const readIds = new Set((reads || []).map(r => r.announcement_id));

  const result = (announcements || []).map(a => ({
    ...a,
    is_read: readIds.has(a.id),
  }));

  const unreadCount = result.filter(a => !a.is_read).length;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ announcements: result, unreadCount }),
  };
}

async function getRankingPosition(affiliate, headers) {
  // 今月の報酬でランキング計算
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: allCommissions } = await supabase
    .from('commissions')
    .select('affiliate_id, amount')
    .gte('created_at', thisMonthStart)
    .in('status', ['pending', 'approved', 'payable', 'paid']);

  if (!allCommissions || allCommissions.length === 0) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ rank: null, totalAffiliates: 0 }),
    };
  }

  // 紹介者ごとの報酬集計
  const commByAffiliate = {};
  for (const c of allCommissions) {
    commByAffiliate[c.affiliate_id] = (commByAffiliate[c.affiliate_id] || 0) + c.amount;
  }

  const sorted = Object.entries(commByAffiliate)
    .sort((a, b) => b[1] - a[1]);
  
  const myAmount = commByAffiliate[affiliate.id] || 0;
  const myRank = sorted.findIndex(([id]) => id === affiliate.id) + 1;
  const totalAffiliates = sorted.length;

  const rankAboveDiff = myRank > 1 ? sorted[myRank - 2][1] - myAmount : 0;
  const rankBelowDiff = myRank < totalAffiliates ? myAmount - sorted[myRank][1] : 0;
  const rankTopDiff = myRank > 1 ? sorted[0][1] - myAmount : 0;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      rank: myRank || null,
      totalAffiliates,
      myAmount,
      rankAboveDiff,
      rankBelowDiff,
      rankTopDiff,
    }),
  };
}
