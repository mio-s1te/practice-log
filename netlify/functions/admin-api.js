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

    // 顧客一覧（2LINE対応フィールド含む）
    if (path === '/leads' && method === 'GET') {
      const query = supabase
        .from('leads')
        .select(`
          id, line_user_id, seminar_line_user_id, seminar_line_display_name,
          buyer_line_user_id, buyer_line_display_name, buyer_line_registered_at,
          display_name, current_display_name, email,
          purchase_count, total_purchase_amount, purchased_at,
          course_delivery_status, course_received_at,
          registered_at, seminar_viewed_at, first_source,
          suspicious_flag, created_at, updated_at
        `)
        .order('created_at', { ascending: false })
        .limit(parseInt(params.limit) || 100);

      // LINEフィルタ
      if (params.line_filter === 'buyer_only') {
        query.not('buyer_line_user_id', 'is', null);
      } else if (params.line_filter === 'seminar_only') {
        query.not('seminar_line_user_id', 'is', null).is('buyer_line_user_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // 顧客の購入履歴取得
    if (path.match(/^\/leads\/[^/]+\/purchases$/) && method === 'GET') {
      const leadId = path.split('/')[2];
      const { data, error } = await supabase
        .from('purchases')
        .select('id, product_name, amount_total, status, purchased_at, stripe_session_id, commission_status')
        .eq('lead_id', leadId)
        .order('purchased_at', { ascending: false });
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data || []) };
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

    // ======================================================
    // 段階価格設定 (price_tiers) CRUD
    // ======================================================

    // 商品の price_tiers 一覧取得
    // GET /price-tiers?product_id=xxx
    if (path === '/price-tiers' && method === 'GET') {
      if (!params.product_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'product_id is required' }),
        };
      }
      const { data, error } = await supabase
        .from('price_tiers')
        .select('*')
        .eq('product_id', params.product_id)
        .order('min_valid_sales_count', { ascending: true });
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // price_tier 作成
    // POST /price-tiers
    if (path === '/price-tiers' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { data, error } = await supabase
        .from('price_tiers')
        .insert(body)
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 201, headers, body: JSON.stringify(data) };
    }

    // price_tier 更新
    // PUT /price-tiers/:tier_id
    if (path.startsWith('/price-tiers/') && method === 'PUT') {
      const tierId = path.split('/')[2];
      const body = JSON.parse(event.body || '{}');
      delete body.tier_id;
      delete body.product_id; // product_idは変更不可
      const { data, error } = await supabase
        .from('price_tiers')
        .update(body)
        .eq('tier_id', tierId)
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // price_tier 削除 (論理削除: is_active=false)
    // DELETE /price-tiers/:tier_id
    if (path.startsWith('/price-tiers/') && method === 'DELETE') {
      const tierId = path.split('/')[2];
      const { data, error } = await supabase
        .from('price_tiers')
        .update({ is_active: false })
        .eq('tier_id', tierId)
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // price_change_history 一覧取得
    // GET /price-change-history?product_id=xxx
    if (path === '/price-change-history' && method === 'GET') {
      const query = supabase
        .from('price_change_history')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(params.limit || 50);

      if (params.product_id) {
        query.eq('product_id', params.product_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // 手動価格切り替え
    // POST /price-tiers/switch-manually
    if (path === '/price-tiers/switch-manually' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { product_id, new_tier_id, changed_by, memo } = body;

      if (!product_id || !new_tier_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'product_id and new_tier_id are required' }),
        };
      }

      // 新しいtierを取得
      const { data: newTier } = await supabase
        .from('price_tiers')
        .select('*')
        .eq('tier_id', new_tier_id)
        .eq('product_id', product_id)
        .single();

      if (!newTier) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Price tier not found' }),
        };
      }

      // 現在の商品価格を取得
      const { data: product } = await supabase
        .from('products')
        .select('price, stripe_price_id')
        .eq('id', product_id)
        .single();

      if (!product) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Product not found' }),
        };
      }

      // 有効販売数
      const { count: salesCount } = await supabase
        .from('purchases')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', product_id)
        .eq('status', 'completed');

      // 商品価格を更新
      await supabase
        .from('products')
        .update({
          price: newTier.price,
          stripe_price_id: newTier.stripe_price_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product_id);

      // 履歴保存
      const { data: history } = await supabase
        .from('price_change_history')
        .insert({
          product_id,
          old_price: product.price,
          new_price: newTier.price,
          old_stripe_price_id: product.stripe_price_id || null,
          new_stripe_price_id: newTier.stripe_price_id || null,
          trigger_type: 'manual',
          trigger_sales_count: salesCount || 0,
          changed_by: changed_by || 'admin',
          memo: memo || `手動で${newTier.tier_name}に切り替え`,
        })
        .select()
        .single();

      // 管理者通知
      const { data: prod } = await supabase
        .from('products')
        .select('name')
        .eq('id', product_id)
        .single();
      const productName = prod?.name || '商品';
      const notifBody = `${productName}の価格が${product.price.toLocaleString()}円から${newTier.price.toLocaleString()}円に手動変更されました。(${changed_by || 'admin'})`;

      await supabase.from('notifications').insert({
        recipient_type: 'admin',
        recipient_id: 'admin',
        type: 'price_tier_changed',
        title: `${productName}の価格が変更されました`,
        body: notifBody,
        related_type: 'product',
        related_id: product_id,
      });

      return { statusCode: 200, headers, body: JSON.stringify(history) };
    }

    // ============================================================
    // ロール・パートナー管理
    // ============================================================

    // app_users 一覧（product_owner）
    if (path === '/app-users' && method === 'GET') {
      const query = supabase
        .from('app_users')
        .select('id,email,role,display_name,is_active,last_login_at,created_at')
        .order('created_at', { ascending: false });
      if (params.role) query.eq('role', params.role);
      const { data, error } = await query;
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // app_users 作成（product_ownerアカウント発行）
    if (path === '/app-users' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const crypto = require('crypto');
      const SALT = process.env.PASSWORD_SALT || 'salt_change_me';
      // パスワードが渡された場合はハッシュ化
      if (body.password) {
        body.password_hash = crypto.createHash('sha256').update(body.password + SALT).digest('hex');
        delete body.password;
      }
      body.role = body.role || 'product_owner';
      const { data, error } = await supabase.from('app_users').insert(body).select('id,email,role,display_name,is_active,created_at').single();
      if (error) throw error;
      return { statusCode: 201, headers, body: JSON.stringify(data) };
    }

    // app_users 更新（is_active切替・パスワード変更）
    if (path.match(/^\/app-users\/[^/]+$/) && method === 'PUT') {
      const id = path.split('/')[2];
      const body = JSON.parse(event.body || '{}');
      const crypto = require('crypto');
      const SALT = process.env.PASSWORD_SALT || 'salt_change_me';
      if (body.password) {
        body.password_hash = crypto.createHash('sha256').update(body.password + SALT).digest('hex');
        delete body.password;
      }
      delete body.id;
      body.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from('app_users').update(body).eq('id', id).select('id,email,role,display_name,is_active').single();
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // product_owners 一覧（product_id or user_id でフィルタ）
    if (path === '/product-owners' && method === 'GET') {
      const query = supabase
        .from('product_owners')
        .select(`
          id, user_id, product_id, permission_level, status, created_at,
          app_users(id,email,display_name),
          products(id,name,price),
          product_owner_permissions(*)
        `)
        .order('created_at', { ascending: false });
      if (params.product_id) query.eq('product_id', params.product_id);
      if (params.user_id)    query.eq('user_id', params.user_id);
      const { data, error } = await query;
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // product_owners 作成（商品とユーザーを紐づけ）
    if (path === '/product-owners' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { permissions, ...ownerData } = body;
      const { data: po, error } = await supabase.from('product_owners').insert(ownerData).select().single();
      if (error) throw error;
      // 権限レコードも同時作成
      if (po && permissions) {
        await supabase.from('product_owner_permissions').insert({ product_owner_id: po.id, ...permissions });
      }
      return { statusCode: 201, headers, body: JSON.stringify(po) };
    }

    // product_owners 更新（権限レベル・ステータス）
    if (path.match(/^\/product-owners\/[^/]+$/) && method === 'PUT') {
      const id = path.split('/')[2];
      const body = JSON.parse(event.body || '{}');
      const { permissions, ...ownerData } = body;
      delete ownerData.id;
      ownerData.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from('product_owners').update(ownerData).eq('id', id).select().single();
      if (error) throw error;
      // 細粒度権限更新
      if (permissions) {
        await supabase.from('product_owner_permissions').upsert({ product_owner_id: id, ...permissions, updated_at: new Date().toISOString() }, { onConflict: 'product_owner_id' });
      }
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // ============================================================
    // パートナー申請管理（super_admin/admin が処理）
    // ============================================================

    // 申請一覧
    if (path === '/partner-requests' && method === 'GET') {
      const query = supabase
        .from('partner_requests')
        .select(`
          id, product_id, request_type, status, request_data,
          rejection_reason, reviewed_by, reviewed_at, created_at, updated_at,
          requester:app_users(id,email,display_name),
          products(id,name)
        `)
        .order('created_at', { ascending: false });
      if (params.status) query.eq('status', params.status);
      if (params.product_id) query.eq('product_id', params.product_id);
      const { data, error } = await query;
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // 申請承認
    if (path.match(/^\/partner-requests\/[^/]+\/approve$/) && method === 'POST') {
      const reqId = path.split('/')[2];
      const body = JSON.parse(event.body || '{}');

      const { data: req } = await supabase.from('partner_requests').select('*').eq('id', reqId).single();
      if (!req) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
      if (req.status !== 'pending') return { statusCode: 400, headers, body: JSON.stringify({ error: 'pendingの申請のみ承認できます' }) };

      // 承認者のuser_idを取得
      const { data: reviewer } = await supabase.from('app_users').select('id').eq('email', body.admin_email || '').single();

      const { data: updated } = await supabase
        .from('partner_requests')
        .update({ status: 'approved', reviewed_by: reviewer?.id, reviewed_at: new Date().toISOString() })
        .eq('id', reqId)
        .select().single();

      // 申請種別ごとに実際の処理を反映
      await applyPartnerRequest(req, body.admin_email);

      // 申請者通知
      await supabase.from('notifications').insert({
        recipient_type: 'admin', recipient_id: req.requester_id,
        type: 'partner_request_approved',
        title: `申請が承認されました: ${req.request_type}`,
        body: '申請が承認されました。内容が反映されています。',
        related_type: 'partner_request', related_id: reqId,
      });

      return { statusCode: 200, headers, body: JSON.stringify(updated) };
    }

    // 申請却下
    if (path.match(/^\/partner-requests\/[^/]+\/reject$/) && method === 'POST') {
      const reqId = path.split('/')[2];
      const body = JSON.parse(event.body || '{}');
      if (!body.rejection_reason) return { statusCode: 400, headers, body: JSON.stringify({ error: 'rejection_reason required' }) };

      const { data: req } = await supabase.from('partner_requests').select('*').eq('id', reqId).single();
      if (!req) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };

      const { data: reviewer } = await supabase.from('app_users').select('id').eq('email', body.admin_email || '').single();

      const { data: updated } = await supabase
        .from('partner_requests')
        .update({ status: 'rejected', rejection_reason: body.rejection_reason, reviewed_by: reviewer?.id, reviewed_at: new Date().toISOString() })
        .eq('id', reqId).select().single();

      await supabase.from('notifications').insert({
        recipient_type: 'admin', recipient_id: req.requester_id,
        type: 'partner_request_rejected',
        title: `申請が却下されました: ${req.request_type}`,
        body: `却下理由: ${body.rejection_reason}`,
        related_type: 'partner_request', related_id: reqId,
      });

      return { statusCode: 200, headers, body: JSON.stringify(updated) };
    }

    // ============================================================
    // キャンペーン紹介権限管理
    // ============================================================

    // campaign_access 一覧
    if (path === '/campaign-access' && method === 'GET') {
      const query = supabase
        .from('affiliate_campaign_access')
        .select(`
          id, campaign_id, affiliate_id, access_status, granted_by, granted_at, revoked_at, revoke_reason, created_at,
          affiliate:affiliates(id,name,affiliate_code,tags)
        `)
        .order('created_at', { ascending: false });
      if (params.campaign_id) query.eq('campaign_id', params.campaign_id);
      if (params.affiliate_id) query.eq('affiliate_id', params.affiliate_id);
      if (params.access_status) query.eq('access_status', params.access_status);
      const { data, error } = await query;
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // campaign_access 一括付与（specific_affiliates用）
    if (path === '/campaign-access' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { campaign_id, affiliate_ids, granted_by } = body;
      if (!campaign_id || !affiliate_ids?.length) return { statusCode: 400, headers, body: JSON.stringify({ error: 'campaign_id and affiliate_ids required' }) };

      const inserts = affiliate_ids.map(aid => ({
        campaign_id, affiliate_id: aid, access_status: 'approved', granted_by: granted_by || 'admin', granted_at: new Date().toISOString()
      }));
      const { error } = await supabase.from('affiliate_campaign_access').upsert(inserts, { onConflict: 'campaign_id,affiliate_id' });
      if (error) throw error;
      return { statusCode: 201, headers, body: JSON.stringify({ success: true, count: affiliate_ids.length }) };
    }

    // campaign_access 取消
    if (path.match(/^\/campaign-access\/[^/]+\/revoke$/) && method === 'POST') {
      const id = path.split('/')[2];
      const body = JSON.parse(event.body || '{}');
      const { data, error } = await supabase
        .from('affiliate_campaign_access')
        .update({ access_status: 'revoked', revoked_at: new Date().toISOString(), revoke_reason: body.revoke_reason || '' })
        .eq('id', id).select().single();
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // ============================================================
    // 紹介申請管理
    // ============================================================

    // 申請一覧
    if (path === '/campaign-applications' && method === 'GET') {
      const query = supabase
        .from('affiliate_campaign_applications')
        .select(`
          id, campaign_id, affiliate_id, application_reason, promotion_channel, target_audience,
          past_results, agreed_to_rules, agreed_no_prohibited, status, reviewed_by, reviewed_at, rejection_reason, created_at,
          affiliate:affiliates(id,name,email,affiliate_code,tags),
          campaign:affiliate_campaigns(id,name,product_id,products(name))
        `)
        .order('created_at', { ascending: false });
      if (params.status) query.eq('status', params.status);
      if (params.campaign_id) query.eq('campaign_id', params.campaign_id);
      const { data, error } = await query;
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // 申請承認
    if (path.match(/^\/campaign-applications\/[^/]+\/approve$/) && method === 'POST') {
      const appId = path.split('/')[2];
      const body = JSON.parse(event.body || '{}');

      const { data: application } = await supabase.from('affiliate_campaign_applications').select('*').eq('id', appId).single();
      if (!application) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };

      await supabase.from('affiliate_campaign_applications').update({
        status: 'approved', reviewed_by: body.admin_email, reviewed_at: new Date().toISOString()
      }).eq('id', appId);

      // affiliate_campaign_access にapprovedとして登録
      await supabase.from('affiliate_campaign_access').upsert({
        campaign_id: application.campaign_id,
        affiliate_id: application.affiliate_id,
        access_status: 'approved',
        granted_by: body.admin_email || 'admin',
        granted_at: new Date().toISOString(),
      }, { onConflict: 'campaign_id,affiliate_id' });

      // 紹介者通知
      await supabase.from('notifications').insert({
        recipient_type: 'affiliate', recipient_id: application.affiliate_id,
        type: 'campaign_application_approved',
        title: '紹介申請が承認されました',
        body: '紹介申請が承認されました。紹介URLをご利用いただけます。',
        related_type: 'campaign', related_id: application.campaign_id,
      });

      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // 申請却下
    if (path.match(/^\/campaign-applications\/[^/]+\/reject$/) && method === 'POST') {
      const appId = path.split('/')[2];
      const body = JSON.parse(event.body || '{}');
      if (!body.rejection_reason) return { statusCode: 400, headers, body: JSON.stringify({ error: 'rejection_reason required' }) };

      const { data: application } = await supabase.from('affiliate_campaign_applications').select('*').eq('id', appId).single();

      await supabase.from('affiliate_campaign_applications').update({
        status: 'rejected', rejection_reason: body.rejection_reason,
        reviewed_by: body.admin_email, reviewed_at: new Date().toISOString()
      }).eq('id', appId);

      await supabase.from('notifications').insert({
        recipient_type: 'affiliate', recipient_id: application?.affiliate_id,
        type: 'campaign_application_rejected',
        title: '紹介申請が却下されました',
        body: `却下理由: ${body.rejection_reason}`,
        related_type: 'campaign', related_id: application?.campaign_id,
      });

      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
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

// パートナー申請を承認後に実際のデータに反映
async function applyPartnerRequest(req, adminEmail) {
  const { request_type, product_id, request_data } = req;

  switch (request_type) {
    case 'product_description_change':
      if (request_data.description) {
        await supabase.from('products').update({ description: request_data.description, updated_at: new Date().toISOString() }).eq('id', product_id);
      }
      break;

    case 'price_change':
      // 価格変更は price_change_history に記録してproductsを更新
      if (request_data.new_price) {
        const { data: prod } = await supabase.from('products').select('price,stripe_price_id').eq('id', product_id).single();
        await supabase.from('price_change_history').insert({
          product_id,
          old_price: prod?.price,
          new_price: request_data.new_price,
          old_stripe_price_id: prod?.stripe_price_id,
          new_stripe_price_id: request_data.new_stripe_price_id || prod?.stripe_price_id,
          trigger_type: 'manual',
          changed_by: adminEmail || 'admin',
          memo: `パートナー申請承認: ${request_data.reason || ''}`,
        });
        await supabase.from('products').update({ price: request_data.new_price, updated_at: new Date().toISOString() }).eq('id', product_id);
      }
      break;

    case 'campaign_start':
      if (request_data.campaign_id) {
        await supabase.from('affiliate_campaigns').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', request_data.campaign_id);
      }
      break;

    case 'campaign_stop':
      if (request_data.campaign_id) {
        await supabase.from('affiliate_campaigns').update({ status: 'paused', stop_reason: request_data.reason || 'パートナー申請による停止', updated_at: new Date().toISOString() }).eq('id', request_data.campaign_id);
      }
      break;

    case 'notice_delivery':
      // お知らせ配信: announcementsに登録
      if (request_data.title && request_data.body) {
        await supabase.from('announcements').insert({
          title: request_data.title,
          body: request_data.body,
          type: request_data.type || 'important',
          target_type: 'product_affiliates',
          target_product_id: product_id,
          is_published: true,
          created_by: adminEmail || 'admin',
        });
      }
      break;

    // material_add, commission_change は管理者が手動で対応するため自動反映なし
    default:
      break;
  }
}
