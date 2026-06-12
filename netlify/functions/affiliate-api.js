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

    // ======================================================
    // アフィリエイター登録フロー（認証不要）
    // ======================================================

    // スタート講座購入確認
    if (path === '/register/verify-purchase' && method === 'POST') {
      const { email } = JSON.parse(event.body || '{}');
      if (!email) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'メールアドレスは必須です' }) };
      }

      // すでに申請済みチェック
      const { data: existingReg } = await supabase
        .from('affiliate_registrations')
        .select('id, status')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingReg) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            already_registered: true,
            registration_status: existingReg.status,
          }),
        };
      }

      // すでにアフィリエイター登録済みチェック
      const { data: existingAffiliate } = await supabase
        .from('affiliates')
        .select('id, status')
        .eq('email', email)
        .single();

      if (existingAffiliate) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            already_registered: true,
            registration_status: existingAffiliate.status === 'active' ? 'approved' : existingAffiliate.status,
          }),
        };
      }

      // スタート講座購入チェック（購入者メールで照合）
      const START_COURSE_PRODUCT_ID = 'a0000000-0000-0000-0000-000000000001';
      const { data: purchase } = await supabase
        .from('purchases')
        .select('id, buyer_email, buyer_line_display_name, status')
        .eq('buyer_email', email)
        .eq('product_id', START_COURSE_PRODUCT_ID)
        .eq('status', 'completed')
        .order('purchased_at', { ascending: false })
        .limit(1)
        .single();

      if (!purchase) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ verified: false }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          verified: true,
          purchase_id: purchase.id,
          buyer_name: purchase.buyer_line_display_name || '',
        }),
      };
    }

    // 登録申請送信
    if (path === '/register/submit' && method === 'POST') {
      const {
        email, name, sns_url, promotion_channel, motivation,
        agreed_to_rules, start_course_purchase_id,
      } = JSON.parse(event.body || '{}');

      if (!email || !name || !promotion_channel || !motivation || !agreed_to_rules) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: '必須項目が不足しています' }) };
      }

      // 再度購入確認
      const START_COURSE_PRODUCT_ID = 'a0000000-0000-0000-0000-000000000001';
      const { data: purchase } = await supabase
        .from('purchases')
        .select('id')
        .eq('id', start_course_purchase_id)
        .eq('buyer_email', email)
        .eq('product_id', START_COURSE_PRODUCT_ID)
        .eq('status', 'completed')
        .single();

      const { data: reg, error: regErr } = await supabase
        .from('affiliate_registrations')
        .insert({
          name,
          email,
          sns_url: sns_url || null,
          promotion_channel,
          motivation,
          agreed_to_rules: true,
          start_course_purchase_id: purchase?.id || null,
          start_course_verified: !!purchase,
          status: 'pending',
        })
        .select()
        .single();

      if (regErr) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: regErr.message }) };
      }

      return { statusCode: 201, headers, body: JSON.stringify({ success: true, id: reg.id }) };
    }

    // 新ダッシュボードv2（商品ごとの紹介権限付き）
    if (path === '/dashboard/v2' && method === 'GET') {
      const sessionToken = getSessionToken(event);
      const affiliate = await getAffiliateFromSession(sessionToken);
      if (!affiliate) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
      }
      return await getDashboardV2(affiliate, headers);
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

    // 参加案件一覧（紹介権限チェック付き）
    if (path === '/campaigns' && method === 'GET') {
      return await getAccessibleCampaigns(affiliate, headers);
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

    // 紹介申請 一覧取得
    if (path === '/campaign-applications' && method === 'GET') {
      return await getCampaignApplications(affiliate, headers);
    }

    // 紹介申請 新規作成
    if (path === '/campaign-applications' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      return await submitCampaignApplication(affiliate, body, headers);
    }

    // 紹介申請 キャンセル
    if (path.match(/^\/campaign-applications\/[^/]+\/cancel$/) && method === 'POST') {
      const applicationId = path.split('/')[2];
      return await cancelCampaignApplication(affiliate, applicationId, headers);
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

// ============================================================
// 紹介権限チェック付き案件一覧取得
// - publicキャンペーン: 全員に表示
// - tag_based: 紹介者が必要タグを持っていれば表示
// - approved_only / specific_affiliates: affiliate_campaign_accessがapprovedなら表示
// - allow_application=true で権限なしの場合は「申請可能」として返す
// ============================================================
async function getAccessibleCampaigns(affiliate, headers) {
  // 全アクティブキャンペーンを取得
  const { data: allCampaigns, error } = await supabase
    .from('affiliate_campaigns')
    .select(`
      *,
      product:products(id, name, price, lp_url)
    `)
    .eq('status', 'active');

  if (error) throw error;

  // 紹介者のタグ取得
  const { data: affiliateData } = await supabase
    .from('affiliates')
    .select('tags')
    .eq('id', affiliate.id)
    .single();
  const affiliateTags = affiliateData?.tags || [];

  // 承認済みアクセス一覧取得
  const { data: accessList } = await supabase
    .from('affiliate_campaign_access')
    .select('campaign_id, access_status')
    .eq('affiliate_id', affiliate.id)
    .eq('access_status', 'approved');
  const approvedCampaignIds = new Set((accessList || []).map(a => a.campaign_id));

  // 申請中一覧取得（重複申請防止）
  const { data: pendingApps } = await supabase
    .from('affiliate_campaign_applications')
    .select('campaign_id, status')
    .eq('affiliate_id', affiliate.id)
    .in('status', ['pending', 'approved']);
  const pendingCampaignIds = new Set((pendingApps || []).map(a => a.campaign_id));

  // campaign_affiliates (参加中案件)
  const { data: joinedCampaigns } = await supabase
    .from('campaign_affiliates')
    .select('campaign_id')
    .eq('affiliate_id', affiliate.id)
    .eq('status', 'active');
  const joinedCampaignIds = new Set((joinedCampaigns || []).map(c => c.campaign_id));

  const accessible = [];
  const applicableOnly = [];  // 申請のみ可能

  for (const campaign of (allCampaigns || [])) {
    const accessType = campaign.access_type || 'public';
    let hasAccess = false;

    if (accessType === 'public') {
      hasAccess = true;
    } else if (accessType === 'tag_based') {
      const requiredTags = campaign.required_affiliate_tags || [];
      hasAccess = requiredTags.length === 0 || requiredTags.every(t => affiliateTags.includes(t));
    } else if (accessType === 'approved_only' || accessType === 'specific_affiliates') {
      hasAccess = approvedCampaignIds.has(campaign.id);
    }

    if (hasAccess) {
      accessible.push({
        ...campaign,
        is_joined: joinedCampaignIds.has(campaign.id),
        can_apply: false,
        has_pending_application: false,
      });
    } else if (campaign.allow_application) {
      // アクセス権はないが申請可能
      applicableOnly.push({
        ...campaign,
        is_joined: false,
        can_apply: true,
        has_pending_application: pendingCampaignIds.has(campaign.id),
        // 紹介URLは表示しない
        affiliate_url: null,
      });
    }
    // それ以外(権限なし・申請不可)は表示しない
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      accessible_campaigns: accessible,
      applicable_campaigns: applicableOnly,
    }),
  };
}

// ============================================================
// 紹介申請一覧
// ============================================================
async function getCampaignApplications(affiliate, headers) {
  const { data, error } = await supabase
    .from('affiliate_campaign_applications')
    .select(`
      *,
      campaign:affiliate_campaigns(id, name, product:products(id, name))
    `)
    .eq('affiliate_id', affiliate.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return { statusCode: 200, headers, body: JSON.stringify(data || []) };
}

// ============================================================
// 紹介申請 送信
// ============================================================
async function submitCampaignApplication(affiliate, body, headers) {
  const {
    campaign_id,
    application_reason,
    promotion_channel,
    target_audience,
    past_results,
    agreed_to_rules,
    agreed_no_prohibited,
  } = body;

  if (!campaign_id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'campaign_id required' }) };
  }
  if (!agreed_to_rules || !agreed_no_prohibited) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Both agreement fields are required' }) };
  }

  // キャンペーンが申請可能か確認
  const { data: campaign } = await supabase
    .from('affiliate_campaigns')
    .select('id, name, status, allow_application, access_type')
    .eq('id', campaign_id)
    .single();

  if (!campaign) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Campaign not found' }) };
  }
  if (!campaign.allow_application) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'This campaign does not accept applications' }) };
  }

  // 重複申請チェック
  const { data: existing } = await supabase
    .from('affiliate_campaign_applications')
    .select('id, status')
    .eq('campaign_id', campaign_id)
    .eq('affiliate_id', affiliate.id)
    .in('status', ['pending', 'approved'])
    .single();

  if (existing) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({ error: 'Application already exists', status: existing.status }),
    };
  }

  const { data: application, error } = await supabase
    .from('affiliate_campaign_applications')
    .insert({
      campaign_id,
      affiliate_id: affiliate.id,
      application_reason: application_reason || '',
      promotion_channel: promotion_channel || '',
      target_audience: target_audience || '',
      past_results: past_results || '',
      agreed_to_rules: !!agreed_to_rules,
      agreed_no_prohibited: !!agreed_no_prohibited,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;

  // 管理者への通知
  await supabase.from('notifications').insert({
    recipient_type: 'admin',
    recipient_id: 'admin',
    type: 'campaign_application',
    title: '紹介申請が届きました',
    body: `${affiliate.name}さんが「${campaign.name}」の紹介を申請しました。`,
    related_type: 'campaign_application',
    related_id: application.id,
  });

  return { statusCode: 201, headers, body: JSON.stringify(application) };
}

// ============================================================
// 紹介申請 キャンセル
// ============================================================
async function cancelCampaignApplication(affiliate, applicationId, headers) {
  const { data: application } = await supabase
    .from('affiliate_campaign_applications')
    .select('id, affiliate_id, status')
    .eq('id', applicationId)
    .single();

  if (!application) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Application not found' }) };
  }
  if (application.affiliate_id !== affiliate.id) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) };
  }
  if (application.status !== 'pending') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Only pending applications can be cancelled' }) };
  }

  await supabase
    .from('affiliate_campaign_applications')
    .update({ status: 'cancelled' })
    .eq('id', applicationId);

  return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
}


// ======================================================
// getDashboardV2: 新要件対応ダッシュボード
// 商品ごとの紹介権限チェック付き
// ======================================================
async function getDashboardV2(affiliate, headers) {
  const affiliateId = affiliate.id;

  // 統計情報取得
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    clicksRes,
    thisMonthClicksRes,
    commissionsRes,
    thisMonthCommissionsRes,
    unpaidRes,
    paidRes,
    recentConversionsRes,
    productsRes,
  ] = await Promise.all([
    supabase.from('clicks').select('id', { count: 'exact' }).eq('affiliate_id', affiliateId),
    supabase.from('clicks').select('id', { count: 'exact' }).eq('affiliate_id', affiliateId).gte('created_at', firstDayOfMonth),
    supabase.from('commissions').select('amount, status').eq('affiliate_id', affiliateId),
    supabase.from('commissions').select('amount').eq('affiliate_id', affiliateId).gte('created_at', firstDayOfMonth).in('status', ['pending', 'approved', 'payable', 'paid']),
    supabase.from('commissions').select('amount').eq('affiliate_id', affiliateId).in('status', ['approved', 'payable']),
    supabase.from('commissions').select('amount').eq('affiliate_id', affiliateId).eq('status', 'paid'),
    supabase
      .from('purchases')
      .select('id, product_name, amount_total, commission_amount, commission_status, purchased_at')
      .eq('affiliate_id', affiliateId)
      .order('purchased_at', { ascending: false })
      .limit(20),
    supabase.from('products').select('id, name, product_type, lp_url, price, status').eq('status', 'active'),
  ]);

  const totalClicks = clicksRes.count || 0;
  const thisMonthClicks = thisMonthClicksRes.count || 0;

  const allCommissions = commissionsRes.data || [];
  const totalConversions = allCommissions.filter(c => ['approved', 'payable', 'paid'].includes(c.status)).length;
  const totalCommission = allCommissions.reduce((sum, c) => sum + (c.amount || 0), 0);

  const thisMonthConversions = thisMonthCommissionsRes.data?.length || 0;
  const thisMonthCommission = (thisMonthCommissionsRes.data || []).reduce((sum, c) => sum + (c.amount || 0), 0);

  const unpaidCommission = (unpaidRes.data || []).reduce((sum, c) => sum + (c.amount || 0), 0);
  const paidCommission = (paidRes.data || []).reduce((sum, c) => sum + (c.amount || 0), 0);

  // 商品ごとの紹介権限チェック
  const products = productsRes.data || [];
  const productPermissions = [];

  for (const product of products) {
    // デフォルト権限取得
    const { data: defaultPerm } = await supabase
      .from('product_affiliate_permissions')
      .select('access_level, required_product_id')
      .eq('product_id', product.id)
      .is('affiliate_id', null)
      .single();

    // 個別権限取得
    const { data: individualPerm } = await supabase
      .from('product_affiliate_permissions')
      .select('is_explicitly_granted, revoked_at')
      .eq('product_id', product.id)
      .eq('affiliate_id', affiliateId)
      .single();

    let canRefer = false;
    const accessLevel = defaultPerm?.access_level || 'none';

    // 個別権限が明示的に設定されている場合
    if (individualPerm && individualPerm.is_explicitly_granted !== null && !individualPerm.revoked_at) {
      canRefer = individualPerm.is_explicitly_granted;
    } else {
      // デフォルト権限で判定
      if (accessLevel === 'open') {
        canRefer = affiliate.status === 'active';
      } else if (accessLevel === 'approved_only') {
        canRefer = affiliate.status === 'active' && affiliate.start_course_purchased && !!affiliate.approved_at;
      } else if (accessLevel === 'requires_purchase') {
        // 必要な商品を購入済みか確認
        const reqProductId = defaultPerm?.required_product_id || product.id;
        const { data: purchase } = await supabase
          .from('purchases')
          .select('id')
          .eq('buyer_email', affiliate.email)
          .eq('product_id', reqProductId)
          .eq('status', 'completed')
          .limit(1)
          .single();
        canRefer = !!purchase;
      }
    }

    productPermissions.push({
      product_id: product.id,
      product_name: product.name,
      product_type: product.product_type,
      lp_url: product.lp_url || `/${product.product_type?.replace('_', '-') || 'product'}`,
      can_refer: canRefer,
      access_level: accessLevel,
    });
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      affiliate: {
        id: affiliate.id,
        name: affiliate.name,
        email: affiliate.email,
        affiliate_code: affiliate.affiliate_code,
        status: affiliate.status,
        start_course_purchased: affiliate.start_course_purchased,
        approved_at: affiliate.approved_at,
      },
      stats: {
        total_clicks: totalClicks,
        this_month_clicks: thisMonthClicks,
        total_conversions: totalConversions,
        this_month_conversions: thisMonthConversions,
        total_commission: totalCommission,
        this_month_commission: thisMonthCommission,
        unpaid_commission: unpaidCommission,
        paid_commission: paidCommission,
        conversion_rate: totalClicks > 0 ? totalConversions / totalClicks : 0,
      },
      product_permissions: productPermissions,
      recent_conversions: recentConversionsRes.data || [],
    }),
  };
}
