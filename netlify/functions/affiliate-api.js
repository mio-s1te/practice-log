// netlify/functions/affiliate-api.js
// 紹介者API

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

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

    // ★ パスワードログイン
    if (path === '/login/password' && method === 'POST') {
      const { email, password } = JSON.parse(event.body || '{}');
      return await loginWithPassword(email, password, headers);
    }

    // セッション延長
    if (path === '/session/extend' && method === 'POST') {
      const sessionToken = getSessionToken(event);
      return await extendSession(sessionToken, headers);
    }

    // ======================================================
    // アフィリエイター登録フロー（認証不要）
    // ======================================================

    // 購入確認（affiliate_enabled な全商品を動的に参照）
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

      // ============================================================
      // affiliate_enabled = true の全商品を動的に取得
      // → どれか1つでも購入済みなら申請可能
      // ============================================================
      const { data: affiliateProducts } = await supabase
        .from('products')
        .select('id, name')
        .eq('affiliate_enabled', true)
        .eq('status', 'active');

      const affiliateProductIds = (affiliateProducts || []).map(p => p.id);

      if (affiliateProductIds.length === 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ verified: false }),
        };
      }

      // このメールで購入済みの対象商品を全取得
      const { data: purchases } = await supabase
        .from('purchases')
        .select('id, buyer_line_display_name, product_id, status')
        .eq('buyer_email', email)
        .in('product_id', affiliateProductIds)
        .eq('status', 'completed')
        .order('purchased_at', { ascending: false });

      if (!purchases || purchases.length === 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ verified: false }),
        };
      }

      // 代表購入（最初の1件）
      const repPurchase = purchases[0];

      // 購入済み商品IDセット
      const purchasedProductIds = purchases.map(p => p.product_id);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          verified: true,
          purchase_id: repPurchase.id,
          buyer_name: repPurchase.buyer_line_display_name || '',
          purchased_product_ids: purchasedProductIds,
          // 後方互換（フロントが has_start_course を参照している場合用）
          has_start_course: purchasedProductIds.includes('a0000000-0000-0000-0000-000000000001'),
          has_affiliate_course: purchasedProductIds.includes('a0000000-0000-0000-0000-000000000002'),
          start_course_purchase_id: purchases.find(p => p.product_id === 'a0000000-0000-0000-0000-000000000001')?.id || null,
          affiliate_course_purchase_id: purchases.find(p => p.product_id === 'a0000000-0000-0000-0000-000000000002')?.id || null,
        }),
      };
    }

    // 登録申請送信
    if (path === '/register/submit' && method === 'POST') {
      const {
        email, name, sns_url, promotion_channel, motivation,
        agreed_to_rules,
      } = JSON.parse(event.body || '{}');

      if (!email || !name || !promotion_channel || !motivation || !agreed_to_rules) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: '必須項目が不足しています' }) };
      }

      // ============================================================
      // affiliate_enabled = true の全商品を動的に取得して購入を再確認
      // ============================================================
      const { data: affiliateProducts } = await supabase
        .from('products')
        .select('id, name')
        .eq('affiliate_enabled', true)
        .eq('status', 'active');

      const affiliateProductIds = (affiliateProducts || []).map(p => p.id);

      const { data: purchases } = await supabase
        .from('purchases')
        .select('id, product_id')
        .eq('buyer_email', email)
        .in('product_id', affiliateProductIds)
        .eq('status', 'completed');

      const purchasedProductIds = (purchases || []).map(p => p.product_id);
      // ユニーク化（同一商品の重複購入対策）
      const uniquePurchasedIds = [...new Set(purchasedProductIds)];

      if (uniquePurchasedIds.length === 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: '対象講座の購入が確認できませんでした' }) };
      }

      // 後方互換フラグ
      const hasStart     = uniquePurchasedIds.includes('a0000000-0000-0000-0000-000000000001');
      const hasAffiliate = uniquePurchasedIds.includes('a0000000-0000-0000-0000-000000000002');

      // affiliate_registrations に記録（審査不要・自動承認）
      const { data: reg, error: regErr } = await supabase
        .from('affiliate_registrations')
        .insert({
          name,
          email,
          sns_url: sns_url || null,
          promotion_channel,
          motivation,
          agreed_to_rules: true,
          start_course_purchase_id: purchases?.find(p => p.product_id === 'a0000000-0000-0000-0000-000000000001')?.id || null,
          start_course_verified: hasStart,
          status: 'approved', // 自動承認
        })
        .select()
        .single();

      if (regErr) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: regErr.message }) };
      }

      // affiliates テーブルに active で直接作成（即時ログイン可能）
      const affiliateCode = generateAffiliateCode(name);
      const { data: newAffiliate, error: affiliateErr } = await supabase
        .from('affiliates')
        .insert({
          name,
          email,
          affiliate_code: affiliateCode,
          status: 'active',
          approved_at: new Date().toISOString(),
          sns_url: sns_url || null,
          promotion_channel,
          start_course_purchased: hasStart,
          notes: `自動承認 registration_id:${reg.id}`,
        })
        .select()
        .single();

      if (affiliateErr) {
        await supabase
          .from('affiliate_registrations')
          .update({ status: 'pending' })
          .eq('id', reg.id);
        return { statusCode: 400, headers, body: JSON.stringify({ error: affiliateErr.message }) };
      }

      // ============================================================
      // 購入済みの全商品に product_affiliate_permissions を自動登録
      // ・購入した商品 → 必ず紹介を許可（is_explicitly_granted: true）
      // ・その他の商品 → 管理者が個別 or デフォルトルールで制御
      // ============================================================
      const permInserts = uniquePurchasedIds.map(productId => {
        const productName = (affiliateProducts || []).find(p => p.id === productId)?.name || productId;
        return {
          product_id: productId,
          affiliate_id: newAffiliate.id,
          access_level: 'requires_purchase',
          is_explicitly_granted: true,
          granted_by: 'auto_registration',
          granted_at: new Date().toISOString(),
          notes: `${productName}購入による自動許可`,
        };
      });

      if (permInserts.length > 0) {
        await supabase
          .from('product_affiliate_permissions')
          .upsert(permInserts, { onConflict: 'product_id,affiliate_id' });
      }

      // 購入済み商品名リスト（レスポンス用）
      const grantedProductNames = uniquePurchasedIds.map(id =>
        (affiliateProducts || []).find(p => p.id === id)?.name || id
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          id: reg.id,
          affiliate_id: newAffiliate.id,
          affiliate_code: affiliateCode,
          granted_products: grantedProductNames,
        }),
      };
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

    // ======================================================
    // 分析ダッシュボード（新：期間フィルター付き）
    // ======================================================
    if (path === '/dashboard/analytics' && method === 'GET') {
      const params = event.queryStringParameters || {};
      return await getDashboardAnalytics(affiliate, params, headers);
    }

    // 商品詳細（紹介権限チェック付き）
    if (path.match(/^\/products\/[^/]+$/) && method === 'GET') {
      const productId = path.split('/')[2];
      return await getProductDetail(affiliate, productId, headers);
    }

    // ★ 自分のパスワード変更（ログイン中のアフィリエイター本人）
    if (path === '/account/password' && method === 'POST') {
      const { current_password, new_password } = JSON.parse(event.body || '{}');
      return await changePassword(affiliate, current_password, new_password, headers);
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

// ============================================================
// ★ パスワードログイン
// ============================================================
async function loginWithPassword(email, password, headers) {
  if (!email || !password) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'メールアドレスとパスワードを入力してください' }) };
  }

  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id, name, email, status, password_hash, affiliate_code')
    .eq('email', email.toLowerCase().trim())
    .single();

  // セキュリティ：存在しない場合も同じエラーを返す
  if (!affiliate || !affiliate.password_hash) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'メールアドレスまたはパスワードが正しくありません' }) };
  }

  if (affiliate.status === 'suspended') {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'アカウントが停止されています' }) };
  }

  const match = await bcrypt.compare(password, affiliate.password_hash);
  if (!match) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'メールアドレスまたはパスワードが正しくありません' }) };
  }

  // セッション発行
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

// ============================================================
// ★ 自分のパスワード変更（ログイン中の本人）
// ============================================================
async function changePassword(affiliate, currentPassword, newPassword, headers) {
  if (!newPassword || newPassword.length < 8) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'パスワードは8文字以上にしてください' }) };
  }

  // 現在のパスワードが設定されている場合は照合
  if (affiliate.password_hash) {
    if (!currentPassword) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '現在のパスワードを入力してください' }) };
    }
    const match = await bcrypt.compare(currentPassword, affiliate.password_hash);
    if (!match) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '現在のパスワードが正しくありません' }) };
    }
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await supabase
    .from('affiliates')
    .update({ password_hash: hash })
    .eq('id', affiliate.id);

  return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
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

// ======================================================
// getDashboardAnalytics: 期間フィルター付き分析ダッシュボード
// ======================================================
async function getDashboardAnalytics(affiliate, params, headers) {
  const affiliateId = affiliate.id;
  const now = new Date();

  // 期間計算ヘルパー
  function getPeriodDates(period, customStart, customEnd) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    switch (period) {
      case 'today': {
        return { start: today, end: todayEnd };
      }
      case 'yesterday': {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        const yEnd = new Date(y);
        yEnd.setHours(23, 59, 59, 999);
        return { start: y, end: yEnd };
      }
      case '7d': {
        const s = new Date(today);
        s.setDate(s.getDate() - 6);
        return { start: s, end: todayEnd };
      }
      case '14d': {
        const s = new Date(today);
        s.setDate(s.getDate() - 13);
        return { start: s, end: todayEnd };
      }
      case '30d': {
        const s = new Date(today);
        s.setDate(s.getDate() - 29);
        return { start: s, end: todayEnd };
      }
      case 'this_week': {
        const dow = today.getDay();
        const s = new Date(today);
        s.setDate(s.getDate() - dow);
        return { start: s, end: todayEnd };
      }
      case 'last_week': {
        const dow = today.getDay();
        const e = new Date(today);
        e.setDate(e.getDate() - dow - 1);
        e.setHours(23, 59, 59, 999);
        const s = new Date(e);
        s.setDate(s.getDate() - 6);
        s.setHours(0, 0, 0, 0);
        return { start: s, end: e };
      }
      case 'month': {
        const s = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: s, end: todayEnd };
      }
      case 'last_month': {
        const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const e = new Date(today.getFullYear(), today.getMonth(), 0);
        e.setHours(23, 59, 59, 999);
        return { start: s, end: e };
      }
      case 'this_year': {
        const s = new Date(today.getFullYear(), 0, 1);
        return { start: s, end: todayEnd };
      }
      case 'all': {
        return { start: new Date('2020-01-01'), end: todayEnd };
      }
      case 'custom': {
        if (customStart && customEnd) {
          return {
            start: new Date(customStart),
            end: new Date(customEnd + 'T23:59:59'),
          };
        }
        // fallthrough to 30d
        const s = new Date(today);
        s.setDate(s.getDate() - 29);
        return { start: s, end: todayEnd };
      }
      default: {
        const s = new Date(today);
        s.setDate(s.getDate() - 29);
        return { start: s, end: todayEnd };
      }
    }
  }

  // 前の期間計算
  function getPrevPeriodDates(period, currentStart, currentEnd) {
    const diff = currentEnd - currentStart;
    return {
      start: new Date(currentStart - diff - 1000),
      end: new Date(currentStart - 1000),
    };
  }

  const period = params.period || '30d';
  const { start: periodStart, end: periodEnd } = getPeriodDates(
    period,
    params.start,
    params.end
  );
  const { start: prevStart, end: prevEnd } = getPrevPeriodDates(period, periodStart, periodEnd);

  const startISO = periodStart.toISOString();
  const endISO = periodEnd.toISOString();
  const prevStartISO = prevStart.toISOString();
  const prevEndISO = prevEnd.toISOString();

  // ---- 並列データ取得 ----
  const [
    clicksRes,
    prevClicksRes,
    purchasesRes,
    prevPurchasesRes,
    commissionsRes,
    prevCommissionsRes,
    productsRes,
    dailyStatsRes,
    rankingRes,
  ] = await Promise.all([
    // クリック（期間内）
    supabase
      .from('clicks')
      .select('id, created_at, product_id')
      .eq('affiliate_id', affiliateId)
      .gte('created_at', startISO)
      .lte('created_at', endISO),
    // クリック（前期間）
    supabase
      .from('clicks')
      .select('id')
      .eq('affiliate_id', affiliateId)
      .gte('created_at', prevStartISO)
      .lte('created_at', prevEndISO),
    // 購入（期間内）
    supabase
      .from('purchases')
      .select('id, amount_total, commission_amount, commission_status, purchased_at, product_id, product_name, status')
      .eq('affiliate_id', affiliateId)
      .gte('purchased_at', startISO)
      .lte('purchased_at', endISO),
    // 購入（前期間）
    supabase
      .from('purchases')
      .select('id, amount_total, commission_amount, commission_status, status')
      .eq('affiliate_id', affiliateId)
      .gte('purchased_at', prevStartISO)
      .lte('purchased_at', prevEndISO),
    // 報酬（期間内）
    supabase
      .from('commissions')
      .select('id, amount, status, created_at, purchase_id')
      .eq('affiliate_id', affiliateId)
      .gte('created_at', startISO)
      .lte('created_at', endISO),
    // 報酬（前期間）
    supabase
      .from('commissions')
      .select('id, amount, status')
      .eq('affiliate_id', affiliateId)
      .gte('created_at', prevStartISO)
      .lte('created_at', prevEndISO),
    // 商品一覧（アクティブ）
    supabase
      .from('products')
      .select('id, name, product_type, lp_url, price, status, commission_type, commission_percent, commission_fixed, commission_trigger, commission_confirm_timing, refund_period_days, revoke_commission_on_refund')
      .eq('status', 'active'),
    // デイリー統計（period内）
    supabase
      .from('affiliate_daily_stats')
      .select('stat_date, clicks, purchases, revenue, commission')
      .eq('affiliate_id', affiliateId)
      .gte('stat_date', periodStart.toISOString().split('T')[0])
      .lte('stat_date', periodEnd.toISOString().split('T')[0])
      .order('stat_date', { ascending: true }),
    // ランキング用（今月）
    supabase
      .from('commissions')
      .select('affiliate_id, amount')
      .gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString())
      .in('status', ['pending', 'approved', 'payable', 'paid']),
  ]);

  const clicks = clicksRes.data || [];
  const prevClicks = prevClicksRes.data || [];
  const purchases = purchasesRes.data || [];
  const prevPurchases = prevPurchasesRes.data || [];
  const commissions = commissionsRes.data || [];
  const prevCommissions = prevCommissionsRes.data || [];
  const products = productsRes.data || [];
  const dailyStats = dailyStatsRes.data || [];
  const allRankingComms = rankingRes.data || [];

  // ---- KPI計算 ----
  const validPurchases = purchases.filter(p => p.status === 'completed' || p.status === 'active');
  const cancelledPurchases = purchases.filter(p => p.status === 'cancelled');
  const refundedPurchases = purchases.filter(p => p.status === 'refunded');

  const prevValidPurchases = prevPurchases.filter(p => p.status === 'completed' || p.status === 'active');

  const kpi = {
    clicks: clicks.length,
    conversions: validPurchases.length,
    conversion_rate: clicks.length > 0 ? validPurchases.length / clicks.length : 0,
    revenue: validPurchases.reduce((s, p) => s + (p.amount_total || 0), 0),
    commission: commissions.reduce((s, c) => s + (c.amount || 0), 0),
    unconfirmed_commission: commissions.filter(c => c.status === 'pending').reduce((s, c) => s + (c.amount || 0), 0),
    confirmed_commission: commissions.filter(c => ['approved', 'payable'].includes(c.status)).reduce((s, c) => s + (c.amount || 0), 0),
    paid_commission: commissions.filter(c => c.status === 'paid').reduce((s, c) => s + (c.amount || 0), 0),
    cancels: cancelledPurchases.length,
    refunds: refundedPurchases.length,
  };

  const kpi_prev = {
    clicks: prevClicks.length,
    conversions: prevValidPurchases.length,
    conversion_rate: prevClicks.length > 0 ? prevValidPurchases.length / prevClicks.length : 0,
    revenue: prevValidPurchases.reduce((s, p) => s + (p.amount_total || 0), 0),
    commission: prevCommissions.reduce((s, c) => s + (c.amount || 0), 0),
    unconfirmed_commission: prevCommissions.filter(c => c.status === 'pending').reduce((s, c) => s + (c.amount || 0), 0),
    confirmed_commission: prevCommissions.filter(c => ['approved', 'payable'].includes(c.status)).reduce((s, c) => s + (c.amount || 0), 0),
    paid_commission: prevCommissions.filter(c => c.status === 'paid').reduce((s, c) => s + (c.amount || 0), 0),
    cancels: prevPurchases.filter(p => p.status === 'cancelled').length,
    refunds: prevPurchases.filter(p => p.status === 'refunded').length,
  };

  // ---- デイリーデータ生成（daily_stats補完） ----
  const statsMap = {};
  for (const s of dailyStats) {
    statsMap[s.stat_date] = s;
  }
  // クリックデータからも補完
  for (const c of clicks) {
    const date = c.created_at.split('T')[0];
    if (!statsMap[date]) statsMap[date] = { stat_date: date, clicks: 0, purchases: 0, revenue: 0, commission: 0 };
    statsMap[date].clicks = (statsMap[date].clicks || 0) + 1;
  }
  for (const p of validPurchases) {
    const date = p.purchased_at.split('T')[0];
    if (!statsMap[date]) statsMap[date] = { stat_date: date, clicks: 0, purchases: 0, revenue: 0, commission: 0 };
    statsMap[date].purchases = (statsMap[date].purchases || 0) + 1;
    statsMap[date].revenue = (statsMap[date].revenue || 0) + (p.amount_total || 0);
  }
  for (const c of commissions) {
    const date = c.created_at.split('T')[0];
    if (!statsMap[date]) statsMap[date] = { stat_date: date, clicks: 0, purchases: 0, revenue: 0, commission: 0 };
    statsMap[date].commission = (statsMap[date].commission || 0) + (c.amount || 0);
  }

  // 期間内の日付を全て生成
  const daily_data = [];
  const cursor = new Date(periodStart);
  cursor.setHours(0, 0, 0, 0);
  const endDate = new Date(periodEnd);
  endDate.setHours(0, 0, 0, 0);
  while (cursor <= endDate) {
    const dateStr = cursor.toISOString().split('T')[0];
    daily_data.push({
      date: dateStr,
      clicks: statsMap[dateStr]?.clicks || 0,
      conversions: statsMap[dateStr]?.purchases || 0,
      revenue: statsMap[dateStr]?.revenue || 0,
      commission: statsMap[dateStr]?.commission || 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  // ---- 週別データ生成 ----
  const weeklyMap = {};
  for (const d of daily_data) {
    const date = new Date(d.date);
    const year = date.getFullYear();
    const week = getWeekNumber(date);
    const key = `${year}-W${String(week).padStart(2, '0')}`;
    if (!weeklyMap[key]) weeklyMap[key] = { week: key, clicks: 0, conversions: 0, revenue: 0, commission: 0 };
    weeklyMap[key].clicks += d.clicks;
    weeklyMap[key].conversions += d.conversions;
    weeklyMap[key].revenue += d.revenue;
    weeklyMap[key].commission += d.commission;
  }
  const weekly_data = Object.values(weeklyMap).sort((a, b) => a.week.localeCompare(b.week));

  // ---- 月別データ生成 ----
  const monthlyMap = {};
  for (const d of daily_data) {
    const key = d.date.substring(0, 7);
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, clicks: 0, conversions: 0, revenue: 0, commission: 0 };
    monthlyMap[key].clicks += d.clicks;
    monthlyMap[key].conversions += d.conversions;
    monthlyMap[key].revenue += d.revenue;
    monthlyMap[key].commission += d.commission;
  }
  const monthly_data = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

  // ---- 商品別統計 ----
  const productStatsMap = {};
  for (const p of validPurchases) {
    const pid = p.product_id;
    if (!pid) continue;
    if (!productStatsMap[pid]) {
      productStatsMap[pid] = { product_id: pid, product_name: p.product_name || '', conversions: 0, revenue: 0, commission: 0, cancels: 0, refunds: 0 };
    }
    productStatsMap[pid].conversions++;
    productStatsMap[pid].revenue += p.amount_total || 0;
  }
  for (const p of cancelledPurchases) {
    const pid = p.product_id;
    if (!pid) continue;
    if (!productStatsMap[pid]) productStatsMap[pid] = { product_id: pid, product_name: p.product_name || '', conversions: 0, revenue: 0, commission: 0, cancels: 0, refunds: 0 };
    productStatsMap[pid].cancels++;
  }
  for (const p of refundedPurchases) {
    const pid = p.product_id;
    if (!pid) continue;
    if (!productStatsMap[pid]) productStatsMap[pid] = { product_id: pid, product_name: p.product_name || '', conversions: 0, revenue: 0, commission: 0, cancels: 0, refunds: 0 };
    productStatsMap[pid].refunds++;
  }
  for (const c of commissions) {
    // commission→purchaseのproduct_idはpurchasesテーブルから引く
    const purchase = purchases.find(p => p.id === c.purchase_id);
    if (purchase?.product_id) {
      const pid = purchase.product_id;
      if (productStatsMap[pid]) {
        productStatsMap[pid].commission += c.amount || 0;
      }
    }
  }

  // 権限チェック付き商品統計
  const product_stats = [];
  for (const product of products) {
    const canRefer = await checkProductPermission(affiliate, product);
    const stats = productStatsMap[product.id] || { conversions: 0, revenue: 0, commission: 0, cancels: 0, refunds: 0 };
    const clickCount = clicks.filter(c => c.product_id === product.id).length;

    product_stats.push({
      product_id: product.id,
      product_name: product.name,
      product_type: product.product_type,
      lp_url: product.lp_url,
      price: product.price,
      can_refer: canRefer,
      commission_type: product.commission_type,
      commission_percent: product.commission_percent,
      commission_fixed: product.commission_fixed,
      commission_trigger: product.commission_trigger,
      commission_confirm_timing: product.commission_confirm_timing,
      refund_period_days: product.refund_period_days,
      revoke_commission_on_refund: product.revoke_commission_on_refund,
      clicks: clickCount,
      conversions: stats.conversions,
      revenue: stats.revenue,
      commission: stats.commission,
      cancels: stats.cancels,
      refunds: stats.refunds,
      conversion_rate: clickCount > 0 ? stats.conversions / clickCount : 0,
    });
  }

  // ---- レーダースコア計算 ----
  const radar_score = calculateRadarScore(affiliate, kpi, product_stats, daily_data);

  // ---- ランキング計算（プライバシー保護）----
  const commByAffiliate = {};
  for (const c of allRankingComms) {
    commByAffiliate[c.affiliate_id] = (commByAffiliate[c.affiliate_id] || 0) + (c.amount || 0);
  }
  const sorted = Object.entries(commByAffiliate).sort((a, b) => b[1] - a[1]);
  const myAmount = commByAffiliate[affiliateId] || 0;
  const myRankIdx = sorted.findIndex(([id]) => id === affiliateId);
  const myRank = myRankIdx >= 0 ? myRankIdx + 1 : null;
  const totalAffiliates = sorted.length;
  const rankAboveDiff = myRank && myRank > 1 ? sorted[myRank - 2][1] - myAmount : 0;
  const rankBelowDiff = myRank && myRank < totalAffiliates ? myAmount - sorted[myRank][1] : 0;
  const rankTopDiff = myRank && myRank > 1 ? sorted[0][1] - myAmount : 0;

  const ranking = {
    my_rank: myRank,
    total: totalAffiliates,
    my_amount: myAmount,
    diff_above: rankAboveDiff,
    diff_below: rankBelowDiff,
    diff_from_top: rankTopDiff,
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      affiliate: {
        id: affiliate.id,
        name: affiliate.name,
        affiliate_code: affiliate.affiliate_code,
        status: affiliate.status,
      },
      period: { period, start: startISO, end: endISO },
      kpi,
      kpi_prev,
      daily_data,
      weekly_data,
      monthly_data,
      product_stats,
      radar_score,
      ranking,
    }),
  };
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

async function checkProductPermission(affiliate, product) {
  // デフォルト権限
  const { data: defaultPerm } = await supabase
    .from('product_affiliate_permissions')
    .select('access_level, required_product_id')
    .eq('product_id', product.id)
    .is('affiliate_id', null)
    .single();

  // 個別権限
  const { data: individualPerm } = await supabase
    .from('product_affiliate_permissions')
    .select('is_explicitly_granted, revoked_at')
    .eq('product_id', product.id)
    .eq('affiliate_id', affiliate.id)
    .single();

  if (individualPerm && individualPerm.is_explicitly_granted !== null && !individualPerm.revoked_at) {
    return individualPerm.is_explicitly_granted;
  }

  const accessLevel = defaultPerm?.access_level || 'none';
  if (accessLevel === 'open') return affiliate.status === 'active';
  if (accessLevel === 'approved_only') return affiliate.status === 'active' && !!affiliate.approved_at;
  if (accessLevel === 'requires_purchase') {
    const reqProductId = defaultPerm?.required_product_id || product.id;
    const { data: purchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('buyer_email', affiliate.email)
      .eq('product_id', reqProductId)
      .eq('status', 'completed')
      .limit(1)
      .single();
    return !!purchase;
  }
  return false;
}

function calculateRadarScore(affiliate, kpi, product_stats, daily_data) {
  // 集客力: クリック数ベース (100クリック=100点, 対数スケール)
  const clickScore = Math.min(100, kpi.clicks > 0 ? Math.log10(kpi.clicks + 1) * 40 : 0);

  // 成約力: 成約率ベース (5%=100点)
  const convRate = kpi.conversion_rate || 0;
  const convScore = Math.min(100, convRate * 2000);

  // 継続力: 活動日数（直近30日で何日活動したか）
  const activeDays = daily_data.filter(d => d.clicks > 0 || d.conversions > 0).length;
  const totalDays = daily_data.length || 1;
  const retentionScore = Math.min(100, (activeDays / Math.min(totalDays, 30)) * 100);

  // 商品理解力: 複数商品に渡って成果があるか
  const activeProducts = product_stats.filter(p => p.conversions > 0 || p.clicks > 0).length;
  const productKnowledgeScore = Math.min(100, activeProducts * 30 + (kpi.conversions > 0 ? 10 : 0));

  // 改善力: 前比と現在の成果から（暫定: 成約数×10 + クリック×0.5）
  const improvementScore = Math.min(100, kpi.conversions * 10 + kpi.clicks * 0.5);

  // スコアを0.00-100.00に整形
  const round2 = (v) => Math.round(v * 100) / 100;
  const acquisition = round2(clickScore);
  const conversion = round2(convScore);
  const retention = round2(retentionScore);
  const product_knowledge = round2(productKnowledgeScore);
  const improvement = round2(improvementScore);

  // 診断タイプ決定
  const avg = (acquisition + conversion + retention + product_knowledge + improvement) / 5;
  let diagnosis_type = 'normal';

  if (kpi.clicks < 10) {
    diagnosis_type = 'click_shortage';
  } else if (convRate < 0.01 && kpi.clicks >= 10) {
    diagnosis_type = 'low_conversion';
  } else if (kpi.conversions > 0 && activeProducts <= 1) {
    diagnosis_type = 'weak_main_product';
  } else if (avg >= 70) {
    diagnosis_type = 'balanced_excellent';
  } else if (avg >= 50 && improvementScore > 60) {
    diagnosis_type = 'growing';
  } else if (avg >= 40) {
    diagnosis_type = 'stable';
  } else {
    diagnosis_type = 'normal';
  }

  return {
    acquisition,
    conversion,
    retention,
    product_knowledge,
    improvement,
    diagnosis_type,
  };
}

// ======================================================
// getProductDetail: 商品詳細（紹介権限チェック付き）
// ======================================================
async function getProductDetail(affiliate, productId, headers) {
  // 商品取得
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('status', 'active')
    .single();

  if (productError || !product) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Product not found' }) };
  }

  // 権限チェック
  const canRefer = await checkProductPermission(affiliate, product);
  if (!canRefer) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'No referral permission for this product' }) };
  }

  // 紹介素材取得
  const { data: promoAssets } = await supabase
    .from('promo_assets')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // 紹介URL生成
  const referralUrl = `${process.env.SITE_URL || 'https://your-site.netlify.app'}${product.lp_url || '/'}?ref=${affiliate.affiliate_code}`;

  // 商品ごとのクリック数
  const { count: clickCount } = await supabase
    .from('clicks')
    .select('id', { count: 'exact' })
    .eq('affiliate_id', affiliate.id)
    .eq('product_id', productId);

  // 成約数
  const { data: conversions } = await supabase
    .from('purchases')
    .select('id, amount_total, commission_amount, commission_status, purchased_at')
    .eq('affiliate_id', affiliate.id)
    .eq('product_id', productId)
    .eq('status', 'completed');

  // 報酬合計
  const { data: commissions } = await supabase
    .from('commissions')
    .select('amount, status')
    .eq('affiliate_id', affiliate.id);

  const myCommissions = commissions || [];
  const totalCommission = myCommissions.reduce((s, c) => s + (c.amount || 0), 0);
  const confirmedCommission = myCommissions
    .filter(c => ['approved', 'payable', 'paid'].includes(c.status))
    .reduce((s, c) => s + (c.amount || 0), 0);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        product_type: product.product_type,
        lp_url: product.lp_url,
        price: product.price,
        status: product.status,
        // 報酬条件
        commission_type: product.commission_type,
        commission_percent: product.commission_percent,
        commission_fixed: product.commission_fixed,
        commission_trigger: product.commission_trigger,
        commission_confirm_timing: product.commission_confirm_timing,
        commission_hold_days: product.commission_hold_days,
        // キャンセル・返金
        refund_period_days: product.refund_period_days,
        refund_policy_text: product.refund_policy_text,
        cancel_policy_text: product.cancel_policy_text,
        revoke_commission_on_refund: product.revoke_commission_on_refund,
        revoke_commission_on_cancel: product.revoke_commission_on_cancel,
        // 紹介条件
        affiliate_enabled: product.affiliate_enabled,
        affiliate_access_level: product.affiliate_access_level,
        pr_notation_required: product.pr_notation_required,
        pr_notation_text: product.pr_notation_text,
        prohibited_expressions: product.prohibited_expressions,
      },
      promo_assets: promoAssets ? {
        short_description: promoAssets.short_description,
        long_description: promoAssets.long_description,
        selling_points: promoAssets.selling_points,
        sns_post_example: promoAssets.sns_post_example,
        line_intro_text: promoAssets.line_intro_text,
        story_text: promoAssets.story_text,
        pr_notation_example: promoAssets.pr_notation_example,
        prohibited_expressions: promoAssets.prohibited_expressions,
        discouraged_expressions: promoAssets.discouraged_expressions,
        faq: promoAssets.faq,
        target_audience: promoAssets.target_audience,
      } : null,
      referral_url: referralUrl,
      can_refer: canRefer,
      my_stats: {
        clicks: clickCount || 0,
        conversions: (conversions || []).length,
        revenue: (conversions || []).reduce((s, p) => s + (p.amount_total || 0), 0),
        total_commission: totalCommission,
        confirmed_commission: confirmedCommission,
      },
    }),
  };
}

// 紹介者コード生成
function generateAffiliateCode(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 8);
  const random = Math.random().toString(36).substring(2, 6);
  return `${base}_${random}`;
}
