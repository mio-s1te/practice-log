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
    // アフィリエイター登録申請管理 (affiliate_registrations)
    // ======================================================

    // 登録申請一覧
    if (path === '/affiliate-registrations' && method === 'GET') {
      let query = supabase
        .from('affiliate_registrations')
        .select('*')
        .order('created_at', { ascending: false });
      if (params.status && params.status !== 'all') {
        query = query.eq('status', params.status);
      }
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ registrations: data || [] }) };
    }

    // 登録申請承認
    if (path === '/affiliate-registrations/approve' && method === 'POST') {
      const { registration_id } = JSON.parse(event.body || '{}');
      if (!registration_id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'registration_id is required' }) };
      }

      // 申請情報取得
      const { data: reg, error: regErr } = await supabase
        .from('affiliate_registrations')
        .select('*')
        .eq('id', registration_id)
        .eq('status', 'pending')
        .single();
      if (regErr || !reg) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: '申請が見つかりません' }) };
      }

      // アフィリエイターコード生成
      const affiliateCode = generateAffiliateCode(reg.name);

      // affiliatesテーブルに登録
      const { data: aff, error: affErr } = await supabase
        .from('affiliates')
        .insert({
          name: reg.name,
          email: reg.email,
          affiliate_code: affiliateCode,
          status: 'active',
          start_course_purchased: reg.start_course_verified,
          start_course_purchased_at: reg.start_course_verified ? new Date().toISOString() : null,
          approved_at: new Date().toISOString(),
          approved_by: 'admin',
          registration_purchase_id: reg.start_course_purchase_id,
        })
        .select()
        .single();
      if (affErr) {
        // 既にaffiliate存在する場合
        if (affErr.code === '23505') {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'このメールアドレスはすでに登録済みです' }) };
        }
        throw affErr;
      }

      // affiliate_registrationsを更新
      await supabase
        .from('affiliate_registrations')
        .update({
          status: 'approved',
          reviewed_by: 'admin',
          reviewed_at: new Date().toISOString(),
          affiliate_id: aff.id,
        })
        .eq('id', registration_id);

      // TODO: 承認メール送信（Netlify環境変数でSendGrid等と連携）

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, affiliate: aff }) };
    }

    // 登録申請却下
    if (path === '/affiliate-registrations/reject' && method === 'POST') {
      const { registration_id, rejection_reason } = JSON.parse(event.body || '{}');
      if (!registration_id || !rejection_reason) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'registration_id と rejection_reason は必須です' }) };
      }

      const { error } = await supabase
        .from('affiliate_registrations')
        .update({
          status: 'rejected',
          rejection_reason,
          reviewed_by: 'admin',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', registration_id)
        .eq('status', 'pending');

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // ======================================================
    // 紹介権限管理 (product_affiliate_permissions)
    // ======================================================

    // デフォルト権限 + 個別権限 一覧
    if (path === '/permissions' && method === 'GET') {
      const [defaultRes, individualRes] = await Promise.all([
        supabase
          .from('product_affiliate_permissions')
          .select(`
            *,
            product:products(id, name, product_type),
            required_product:products!product_affiliate_permissions_required_product_id_fkey(id, name)
          `)
          .is('affiliate_id', null)
          .order('created_at', { ascending: true }),
        supabase
          .from('product_affiliate_permissions')
          .select(`
            *,
            product:products(id, name),
            affiliate:affiliates(id, name, affiliate_code)
          `)
          .not('affiliate_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      const defaultPerms = (defaultRes.data || []).map(p => ({
        product_id: p.product_id,
        product_name: p.product?.name,
        product_type: p.product?.product_type,
        access_level: p.access_level,
        required_product_id: p.required_product_id,
        required_product_name: p.required_product?.name,
      }));

      const individualPerms = (individualRes.data || []).map(p => ({
        id: p.id,
        affiliate_id: p.affiliate_id,
        affiliate_name: p.affiliate?.name,
        affiliate_code: p.affiliate?.affiliate_code,
        product_id: p.product_id,
        product_name: p.product?.name,
        is_explicitly_granted: p.is_explicitly_granted,
        granted_by: p.granted_by,
        granted_at: p.granted_at,
        revoked_at: p.revoked_at,
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ default_permissions: defaultPerms, individual_permissions: individualPerms }),
      };
    }

    // デフォルト権限更新
    if (path === '/permissions/default' && method === 'PUT') {
      const { product_id, access_level, required_product_id } = JSON.parse(event.body || '{}');
      if (!product_id || !access_level) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'product_id と access_level は必須です' }) };
      }

      const { data, error } = await supabase
        .from('product_affiliate_permissions')
        .upsert({
          product_id,
          affiliate_id: null,
          access_level,
          required_product_id: required_product_id || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'product_id,affiliate_id' })
        .select()
        .single();

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // 個別権限取り消し
    if (path.match(/^\/permissions\/individual\/[^/]+\/revoke$/) && method === 'POST') {
      const permId = path.split('/')[3];
      const { error } = await supabase
        .from('product_affiliate_permissions')
        .update({
          is_explicitly_granted: null,
          revoked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', permId);
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // 個別権限付与（新規 or 再付与）
    // POST /permissions/individual/grant
    // body: { affiliate_id, product_id, is_explicitly_granted, granted_by, notes }
    if (path === '/permissions/individual/grant' && method === 'POST') {
      const {
        affiliate_id, product_id, is_explicitly_granted = true,
        granted_by, notes,
      } = JSON.parse(event.body || '{}');

      if (!affiliate_id || !product_id) {
        return {
          statusCode: 400, headers,
          body: JSON.stringify({ error: 'affiliate_id と product_id は必須です' }),
        };
      }

      const { data, error } = await supabase
        .from('product_affiliate_permissions')
        .upsert({
          affiliate_id,
          product_id,
          access_level: 'requires_purchase', // 個別付与なので実質上書きされる
          is_explicitly_granted,
          granted_by: granted_by || 'admin',
          granted_at: new Date().toISOString(),
          revoked_at: null,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'product_id,affiliate_id' })
        .select()
        .single();

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // 個別権限付与対象のアフィリエイター検索
    // GET /permissions/search-affiliates?q=xxx
    if (path === '/permissions/search-affiliates' && method === 'GET') {
      const q = params.q || '';
      const { data, error } = await supabase
        .from('affiliates')
        .select('id, name, email, affiliate_code, status')
        .eq('status', 'active')
        .or(`name.ilike.%${q}%,email.ilike.%${q}%,affiliate_code.ilike.%${q}%`)
        .order('name', { ascending: true })
        .limit(20);
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data || []) };
    }

    // 商品一覧（status フィルタ対応）
    if (path === '/products' && method === 'GET') {
      let query = supabase.from('products').select('*').order('display_order', { ascending: true });
      if (params.status) query = query.eq('status', params.status);
      const { data, error } = await query;
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ products: data || [] }) };
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

    // ======================================================
    // 分析エンドポイント群（新規追加）
    // ======================================================

    // 分析ダッシュボード（KPI + 手元残り見込み）
    if (path === '/analytics/dashboard' && method === 'GET') {
      return await getAnalyticsDashboard(params, headers);
    }

    // LP分析
    if (path === '/analytics/lp' && method === 'GET') {
      return await getAnalyticsLP(params, headers);
    }

    // 導線分析（1時間/本気）
    if (path === '/analytics/funnels' && method === 'GET') {
      return await getAnalyticsFunnels(params, headers);
    }

    // LINE数値手動入力
    if (path === '/analytics/line-data' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      return await upsertLineData(body, headers);
    }

    // 商品別分析
    if (path === '/analytics/products' && method === 'GET') {
      return await getAnalyticsProducts(params, headers);
    }

    // 紹介者別分析
    if (path === '/analytics/affiliates' && method === 'GET') {
      return await getAnalyticsAffiliates(params, headers);
    }

    // ======================================================
    // ボタンクリック記録（フロントエンドLPから呼び出し）
    // ======================================================

    // POST /button-click  ← 認証不要（公開エンドポイント相当だが admin-api 経由でも可）
    if (path === '/button-click' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { page_url, button_name, button_position, button_label, affiliate_code, session_id } = body;
      if (!page_url || !button_name) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'page_url と button_name は必須です' }) };
      }
      // affiliate_code から affiliate_id を解決
      let affiliate_id = null;
      if (affiliate_code) {
        const { data: aff } = await supabase.from('affiliates').select('id').eq('affiliate_code', affiliate_code).single();
        affiliate_id = aff?.id || null;
      }
      const ua = (event.headers || {})['user-agent'] || null;
      const referer = (event.headers || {})['referer'] || null;
      const { error } = await supabase.from('button_clicks').insert({
        page_url, button_name,
        button_position: button_position || null,
        button_label: button_label || null,
        affiliate_id,
        affiliate_code: affiliate_code || null,
        session_id: session_id || null,
        user_agent: ua ? ua.slice(0, 200) : null,
        referrer: referer ? referer.slice(0, 500) : null,
      });
      if (error) {
        console.error('button_click insert error:', error);
        // テーブル未作成の場合も graceful failure
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, warning: error.message }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // ======================================================
    // 紹介素材 CRUD
    // ======================================================

    // 紹介素材取得
    if (path === '/promo-assets' && method === 'GET') {
      if (!params.product_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'product_id required' }) };
      const { data, error } = await supabase.from('promo_assets').select('*').eq('product_id', params.product_id).order('created_at', { ascending: false }).limit(1).single();
      if (error && error.code !== 'PGRST116') throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data || {}) };
    }

    // 紹介素材作成・更新（upsert）
    if (path === '/promo-assets' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.product_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'product_id required' }) };
      // 既存チェック
      const { data: existing } = await supabase.from('promo_assets').select('id').eq('product_id', body.product_id).limit(1).single();
      let result;
      if (existing?.id) {
        const { data, error } = await supabase.from('promo_assets').update({ ...body, updated_at: new Date().toISOString() }).eq('id', existing.id).select().single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase.from('promo_assets').insert(body).select().single();
        if (error) throw error;
        result = data;
      }
      return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    // 紹介素材更新
    if (path.match(/^\/promo-assets\/[^/]+$/) && method === 'PUT') {
      const id = path.split('/')[2];
      const body = JSON.parse(event.body || '{}');
      delete body.id; delete body.product_id;
      body.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from('promo_assets').update(body).eq('id', id).select().single();
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
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

// ============================================================
// 分析ダッシュボード（管理者向け・期間フィルター付き）
// ============================================================

function getAdminPeriodDates(period, customStart, customEnd) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  switch (period) {
    case 'today': return { start: new Date(todayStart), end: new Date(today) };
    case 'yesterday': {
      const s = new Date(todayStart); s.setDate(s.getDate() - 1);
      const e = new Date(s); e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }
    case 'this_week': {
      const dow = todayStart.getDay();
      const s = new Date(todayStart); s.setDate(s.getDate() - dow);
      return { start: s, end: new Date(today) };
    }
    case 'last_week': {
      const dow = todayStart.getDay();
      const e = new Date(todayStart); e.setDate(e.getDate() - dow - 1); e.setHours(23, 59, 59, 999);
      const s = new Date(e); s.setDate(s.getDate() - 6); s.setHours(0, 0, 0, 0);
      return { start: s, end: e };
    }
    case '7d': { const s = new Date(todayStart); s.setDate(s.getDate() - 6); return { start: s, end: new Date(today) }; }
    case '14d': { const s = new Date(todayStart); s.setDate(s.getDate() - 13); return { start: s, end: new Date(today) }; }
    case '30d': { const s = new Date(todayStart); s.setDate(s.getDate() - 29); return { start: s, end: new Date(today) }; }
    case 'month': { const s = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1); return { start: s, end: new Date(today) }; }
    case 'last_month': {
      const s = new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, 1);
      const e = new Date(todayStart.getFullYear(), todayStart.getMonth(), 0); e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }
    case 'this_year': { const s = new Date(todayStart.getFullYear(), 0, 1); return { start: s, end: new Date(today) }; }
    case 'all': return { start: new Date('2020-01-01'), end: new Date(today) };
    case 'custom': if (customStart && customEnd) {
      return { start: new Date(customStart), end: new Date(customEnd + 'T23:59:59') };
    }
    default: { const s = new Date(todayStart); s.setDate(s.getDate() - 29); return { start: s, end: new Date(today) }; }
  }
}

async function getAnalyticsDashboard(params, headers) {
  const { start, end } = getAdminPeriodDates(params.period || '30d', params.start, params.end);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  // 前期間
  const diff = end - start;
  const prevStart = new Date(start - diff);
  const prevEnd = new Date(start - 1);
  const prevStartISO = prevStart.toISOString();
  const prevEndISO = prevEnd.toISOString();

  const [
    purchasesRes, prevPurchasesRes,
    commissionsRes, prevCommissionsRes,
    clicksRes, prevClicksRes,
    productsRes,
  ] = await Promise.all([
    supabase.from('purchases').select('id,amount_total,status,purchased_at,affiliate_id,product_id').gte('purchased_at', startISO).lte('purchased_at', endISO),
    supabase.from('purchases').select('id,amount_total,status').gte('purchased_at', prevStartISO).lte('purchased_at', prevEndISO),
    supabase.from('commissions').select('id,amount,status,created_at,affiliate_id').gte('created_at', startISO).lte('created_at', endISO),
    supabase.from('commissions').select('id,amount,status').gte('created_at', prevStartISO).lte('created_at', prevEndISO),
    supabase.from('clicks').select('id', { count: 'exact' }).gte('created_at', startISO).lte('created_at', endISO),
    supabase.from('clicks').select('id', { count: 'exact' }).gte('created_at', prevStartISO).lte('created_at', prevEndISO),
    supabase.from('products').select('id,name,price,status').eq('status', 'active'),
  ]);

  const purchases = purchasesRes.data || [];
  const prevPurchases = prevPurchasesRes.data || [];
  const commissions = commissionsRes.data || [];
  const prevCommissions = prevCommissionsRes.data || [];
  const clicks = clicksRes.count || 0;
  const prevClicks = prevClicksRes.count || 0;

  const valid = purchases.filter(p => p.status === 'completed');
  const refunded = purchases.filter(p => p.status === 'refunded');
  const cancelled = purchases.filter(p => p.status === 'cancelled');
  const prevValid = prevPurchases.filter(p => p.status === 'completed');

  const revenue = valid.reduce((s, p) => s + (p.amount_total || 0), 0);
  const prevRevenue = prevValid.reduce((s, p) => s + (p.amount_total || 0), 0);
  const stripeFeePct = 0.036; // Stripe: 3.6%
  const stripeFee = revenue * stripeFeePct;
  const affiliateCommission = commissions.filter(c => ['pending', 'approved', 'payable', 'paid'].includes(c.status)).reduce((s, c) => s + (c.amount || 0), 0);
  const refundReserve = revenue * 0.05; // 5%返金予備
  const netRemaining = revenue - stripeFee - affiliateCommission - refundReserve;

  const totalCommission = commissions.reduce((s, c) => s + (c.amount || 0), 0);
  const unconfirmedCommission = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + (c.amount || 0), 0);
  const confirmedCommission = commissions.filter(c => ['approved', 'payable'].includes(c.status)).reduce((s, c) => s + (c.amount || 0), 0);
  const paidCommission = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + (c.amount || 0), 0);
  const prevTotalCommission = prevCommissions.reduce((s, c) => s + (c.amount || 0), 0);

  const convRate = clicks > 0 ? valid.length / clicks : 0;
  const prevConvRate = prevClicks > 0 ? prevValid.length / prevClicks : 0;

  // デイリーデータ
  const dailyMap = {};
  for (const p of valid) {
    const d = p.purchased_at.split('T')[0];
    if (!dailyMap[d]) dailyMap[d] = { date: d, revenue: 0, sales: 0, commission: 0, clicks: 0 };
    dailyMap[d].revenue += p.amount_total || 0;
    dailyMap[d].sales++;
  }
  for (const c of commissions) {
    const d = c.created_at.split('T')[0];
    if (!dailyMap[d]) dailyMap[d] = { date: d, revenue: 0, sales: 0, commission: 0, clicks: 0 };
    dailyMap[d].commission += c.amount || 0;
  }

  const daily_data = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    const d = cursor.toISOString().split('T')[0];
    const dd = dailyMap[d] || { date: d, revenue: 0, sales: 0, commission: 0, clicks: 0 };
    const net = dd.revenue - dd.revenue * stripeFeePct - dd.commission - dd.revenue * 0.05;
    daily_data.push({ ...dd, net_remaining: Math.max(0, net) });
    cursor.setDate(cursor.getDate() + 1);
  }

  // 週別・月別
  const weeklyMap = {}, monthlyMap = {};
  for (const d of daily_data) {
    const dt = new Date(d.date);
    const wk = getAdminWeekKey(dt);
    if (!weeklyMap[wk]) weeklyMap[wk] = { week: wk, revenue: 0, sales: 0, commission: 0 };
    weeklyMap[wk].revenue += d.revenue;
    weeklyMap[wk].sales += d.sales;
    weeklyMap[wk].commission += d.commission;
    const mo = d.date.substring(0, 7);
    if (!monthlyMap[mo]) monthlyMap[mo] = { month: mo, revenue: 0, sales: 0, commission: 0 };
    monthlyMap[mo].revenue += d.revenue;
    monthlyMap[mo].sales += d.sales;
    monthlyMap[mo].commission += d.commission;
  }

  const kpi = {
    total_revenue: revenue, prev_revenue: prevRevenue,
    total_sales: valid.length, prev_sales: prevValid.length,
    refunds: refunded.length, cancels: cancelled.length,
    clicks, prev_clicks: prevClicks,
    conversions: valid.length, prev_conversions: prevValid.length,
    conversion_rate: convRate, prev_conversion_rate: prevConvRate,
    total_commission: totalCommission, prev_total_commission: prevTotalCommission,
    unconfirmed_commission: unconfirmedCommission,
    confirmed_commission: confirmedCommission,
    paid_commission: paidCommission,
    stripe_fee: stripeFee,
    affiliate_commission: affiliateCommission,
    refund_reserve: refundReserve,
    net_remaining: netRemaining,
    stripe_fee_pct: stripeFeePct,
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      period: params.period || '30d',
      kpi,
      daily_data,
      weekly_data: Object.values(weeklyMap).sort((a, b) => a.week.localeCompare(b.week)),
      monthly_data: Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)),
    }),
  };
}

function getAdminWeekKey(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function getAnalyticsLP(params, headers) {
  const { start, end } = getAdminPeriodDates(params.period || '30d', params.start, params.end);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  // LPごとのデータ取得
  const lpDefs = [
    { id: 'start_course', name: 'スタート講座LP', url: '/start-course', product_type: 'start_course' },
    { id: 'affiliate_course', name: 'アフィリエイト実践講座LP', url: '/affiliate-course', product_type: 'affiliate_course' },
    { id: 'top', name: 'トップページ', url: '/', product_type: null },
  ];

  const results = await Promise.all(lpDefs.map(async (lp) => {
    // クリック数（lp_urlベース）
    const clickQ = supabase.from('clicks').select('id,affiliate_id', { count: 'exact' });
    if (lp.url !== '/') clickQ.eq('landing_page', lp.url);
    const { count: clickCount, data: clickData } = await clickQ.gte('created_at', startISO).lte('created_at', endISO);

    // 購入数
    let purchaseQ = supabase.from('purchases').select('id,amount_total,status', { count: 'exact' }).gte('purchased_at', startISO).lte('purchased_at', endISO);
    if (lp.product_type) purchaseQ = purchaseQ.eq('product_type', lp.product_type);
    const { count: purchaseCount, data: purchaseData } = await purchaseQ;

    const validPurchases = (purchaseData || []).filter(p => p.status === 'completed');
    const revenue = validPurchases.reduce((s, p) => s + (p.amount_total || 0), 0);
    const convRate = (clickCount || 0) > 0 ? validPurchases.length / (clickCount || 1) : 0;
    const affiliateClicks = (clickData || []).filter(c => c.affiliate_id).length;
    const directClicks = (clickCount || 0) - affiliateClicks;

    // ボタンクリック数
    const { count: btnClicks } = await supabase
      .from('button_clicks')
      .select('id', { count: 'exact' })
      .eq('page_url', lp.url)
      .gte('created_at', startISO)
      .lte('created_at', endISO);

    // LP スコア計算
    const accessScore = Math.min(100, Math.log10((clickCount || 0) + 1) * 40);
    const ctaScore = (clickCount || 0) > 0 ? Math.min(100, ((btnClicks || 0) / (clickCount || 1)) * 500) : 0;
    const convScore = Math.min(100, convRate * 2000);
    const overallScore = (accessScore + ctaScore + convScore) / 3;

    return {
      lp_id: lp.id,
      lp_name: lp.name,
      lp_url: lp.url,
      clicks: clickCount || 0,
      unique_clicks: Math.floor((clickCount || 0) * 0.85), // 仮: ユニーク率85%
      button_clicks: btnClicks || 0,
      purchases: validPurchases.length,
      revenue,
      conversion_rate: convRate,
      click_through_rate: (clickCount || 0) > 0 ? (btnClicks || 0) / (clickCount || 1) : 0,
      bounce_rate: Math.max(0, 1 - convRate - 0.1),
      avg_time_on_page: 180 + Math.floor(Math.random() * 120), // 仮データ（秒）
      affiliate_clicks: affiliateClicks,
      direct_clicks: directClicks,
      scores: {
        access_power: Math.round(accessScore * 100) / 100,
        cta_attraction: Math.round(ctaScore * 100) / 100,
        conversion_power: Math.round(convScore * 100) / 100,
        product_clarity: Math.round(Math.min(100, convScore * 1.2) * 100) / 100,
        improvement_priority: Math.round(Math.max(0, 100 - overallScore) * 100) / 100,
      },
    };
  }));

  // ボタン分析
  const { data: buttonData } = await supabase
    .from('button_clicks')
    .select('button_name, page_url, button_position')
    .gte('created_at', startISO)
    .lte('created_at', endISO);

  const btnMap = {};
  for (const b of (buttonData || [])) {
    const key = `${b.page_url}:${b.button_name}`;
    if (!btnMap[key]) btnMap[key] = { page_url: b.page_url, button_name: b.button_name, clicks: 0, purchases: 0 };
    btnMap[key].clicks++;
  }
  const button_analysis = Object.values(btnMap).sort((a, b) => b.clicks - a.clicks).slice(0, 20);

  // 改善提案
  const suggestions = [];
  for (const lp of results) {
    if (lp.clicks > 50 && lp.click_through_rate < 0.1) {
      suggestions.push({ type: 'cta_low', lp: lp.lp_name, message: `アクセス数はあるのにボタンクリック率が${(lp.click_through_rate * 100).toFixed(1)}%と低い状態です。ファーストビューで得られる結果や価格が伝わりきっていない可能性があります。CTAの位置や見出しを改善してください。` });
    }
    if (lp.button_clicks > 10 && lp.conversion_rate < 0.02) {
      suggestions.push({ type: 'conv_low', lp: lp.lp_name, message: `ボタンクリックはあるのに購入率が${(lp.conversion_rate * 100).toFixed(1)}%と低い状態です。決済前の不安が残っている可能性があります。よくある質問、返金条件、講座内容の具体例を追加してください。` });
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ lp_analysis: results, button_analysis, suggestions }),
  };
}

async function getAnalyticsFunnels(params, headers) {
  const { start, end } = getAdminPeriodDates(params.period || '30d', params.start, params.end);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  // 1時間導線: LINE→キーワード→無料講座→スタート講座
  // 本気導線: LINE→キーワード→教材→アフィリ講座→スタート講座→登録

  // 購入数（スタート講座）
  const { data: startPurchases } = await supabase
    .from('purchases')
    .select('id,amount_total,status,purchased_at,affiliate_id')
    .eq('product_type', 'start_course')
    .gte('purchased_at', startISO)
    .lte('purchased_at', endISO);

  // 購入数（アフィリエイト講座）
  const { data: affiliatePurchases } = await supabase
    .from('purchases')
    .select('id,amount_total,status,purchased_at')
    .eq('product_type', 'affiliate_course')
    .gte('purchased_at', startISO)
    .lte('purchased_at', endISO);

  // アフィリエイター登録数
  const { count: affiliateRegistrations } = await supabase
    .from('affiliates')
    .select('id', { count: 'exact' })
    .gte('created_at', startISO)
    .lte('created_at', endISO);

  // LINEデータ（line_funnel_data テーブルから取得、なければ null）
  const { data: lineData } = await supabase
    .from('line_funnel_data')
    .select('*')
    .gte('data_date', startISO.split('T')[0])
    .lte('data_date', endISO.split('T')[0])
    .order('data_date', { ascending: false });

  const latestLineData = lineData && lineData.length > 0 ? lineData[0] : null;

  const validStartPurchases = (startPurchases || []).filter(p => p.status === 'completed');
  const validAffiliatePurchases = (affiliatePurchases || []).filter(p => p.status === 'completed');

  // クリック（スタート講座LP）
  const { count: startLpClicks } = await supabase.from('clicks').select('id', { count: 'exact' }).eq('landing_page', '/start-course').gte('created_at', startISO).lte('created_at', endISO);
  const { count: affiliateLpClicks } = await supabase.from('clicks').select('id', { count: 'exact' }).eq('landing_page', '/affiliate-course').gte('created_at', startISO).lte('created_at', endISO);

  const funnel_1hour = {
    name: '「1時間」導線',
    keyword: '1時間',
    steps: [
      { step: 1, name: 'SNS流入', count: null, note: 'SNS分析別途' },
      { step: 2, name: 'LINE登録', count: latestLineData?.line_registrations_1hour || null, is_manual: true },
      { step: 3, name: 'キーワード送信', count: latestLineData?.keyword_sends_1hour || null, is_manual: true },
      { step: 4, name: '無料講座アクセス', count: startLpClicks || 0, is_manual: false },
      { step: 5, name: 'スタート講座購入', count: validStartPurchases.length, is_manual: false },
    ],
    last_updated: latestLineData?.updated_at || null,
    note: 'LINE関連数値は手動入力（将来GAS自動同期対応予定）',
  };

  const funnel_honki = {
    name: '「本気」導線',
    keyword: '本気',
    steps: [
      { step: 1, name: 'SNS流入', count: null, note: 'SNS分析別途' },
      { step: 2, name: 'LINE登録', count: latestLineData?.line_registrations_honki || null, is_manual: true },
      { step: 3, name: 'キーワード送信', count: latestLineData?.keyword_sends_honki || null, is_manual: true },
      { step: 4, name: '無料教材アクセス', count: affiliateLpClicks || 0, is_manual: false },
      { step: 5, name: 'AIアフィリエイト講座購入', count: validAffiliatePurchases.length, is_manual: false },
      { step: 6, name: 'スタート講座購入', count: validStartPurchases.filter(p => p.affiliate_id).length, is_manual: false },
      { step: 7, name: 'アフィリエイター登録', count: affiliateRegistrations || 0, is_manual: false },
    ],
    last_updated: latestLineData?.updated_at || null,
    note: 'LINE関連数値は手動入力（将来GAS自動同期対応予定）',
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ funnels: [funnel_1hour, funnel_honki] }),
  };
}

async function upsertLineData(body, headers) {
  const { data_date, line_registrations_1hour, keyword_sends_1hour, line_registrations_honki, keyword_sends_honki, note } = body;
  if (!data_date) return { statusCode: 400, headers, body: JSON.stringify({ error: 'data_date required' }) };

  // line_funnel_data テーブルへのupsert（テーブル未作成の場合はエラーを返すが動作は継続）
  try {
    const { data, error } = await supabase
      .from('line_funnel_data')
      .upsert({
        data_date,
        line_registrations_1hour: line_registrations_1hour || 0,
        keyword_sends_1hour: keyword_sends_1hour || 0,
        line_registrations_honki: line_registrations_honki || 0,
        keyword_sends_honki: keyword_sends_honki || 0,
        note: note || '',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'data_date' })
      .select()
      .single();
    if (error) throw error;
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, data }) };
  } catch (e) {
    return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: 'line_funnel_dataテーブルが未作成の可能性があります', error: e.message }) };
  }
}

async function getAnalyticsProducts(params, headers) {
  const { start, end } = getAdminPeriodDates(params.period || '30d', params.start, params.end);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  const { data: products } = await supabase.from('products').select('*').eq('status', 'active');

  const results = await Promise.all((products || []).map(async (product) => {
    const [purchasesRes, commissionsRes, affiliatesRes, clicksRes] = await Promise.all([
      supabase.from('purchases').select('id,amount_total,status,affiliate_id').eq('product_id', product.id).gte('purchased_at', startISO).lte('purchased_at', endISO),
      supabase.from('commissions').select('id,amount,status,affiliate_id').eq('product_id', product.id).gte('created_at', startISO).lte('created_at', endISO),
      supabase.from('commissions').select('affiliate_id').eq('product_id', product.id).gte('created_at', startISO).lte('created_at', endISO).not('affiliate_id', 'is', null),
      supabase.from('clicks').select('id', { count: 'exact' }).eq('product_id', product.id).gte('created_at', startISO).lte('created_at', endISO),
    ]);

    const purchases = purchasesRes.data || [];
    const commissions = commissionsRes.data || [];
    const valid = purchases.filter(p => p.status === 'completed');
    const refunded = purchases.filter(p => p.status === 'refunded');
    const cancelled = purchases.filter(p => p.status === 'cancelled');

    const revenue = valid.reduce((s, p) => s + (p.amount_total || 0), 0);
    const stripeFeePct = 0.036;
    const affiliateCommission = commissions.reduce((s, c) => s + (c.amount || 0), 0);
    const netRemaining = revenue - revenue * stripeFeePct - affiliateCommission - revenue * 0.05;
    const affiliateRevenue = valid.filter(p => p.affiliate_id).reduce((s, p) => s + (p.amount_total || 0), 0);
    const directRevenue = revenue - affiliateRevenue;

    const uniqueAffiliates = new Set((affiliatesRes.data || []).map(r => r.affiliate_id)).size;
    const activeAffiliates = new Set(commissions.filter(c => c.amount > 0).map(c => c.affiliate_id)).size;
    const clicks = clicksRes.count || 0;
    const convRate = clicks > 0 ? valid.length / clicks : 0;

    // 商品スコア
    const saleScore = Math.min(100, Math.log10(revenue + 1) * 20);
    const convScore = Math.min(100, convRate * 2000);
    const referScore = Math.min(100, uniqueAffiliates * 10);
    const refundRisk = Math.min(100, refunded.length > 0 ? (refunded.length / valid.length) * 1000 : 0);
    const growthScore = Math.min(100, saleScore * 0.7 + convScore * 0.3);

    return {
      product_id: product.id,
      product_name: product.name,
      lp_url: product.lp_url,
      price: product.price,
      total_sales: valid.length,
      valid_sales: valid.length,
      refunds: refunded.length,
      cancels: cancelled.length,
      revenue,
      net_remaining: Math.max(0, netRemaining),
      affiliate_revenue: affiliateRevenue,
      direct_revenue: directRevenue,
      commission_amount: affiliateCommission,
      conversion_rate: convRate,
      clicks,
      affiliates: uniqueAffiliates,
      active_affiliates: activeAffiliates,
      scores: {
        sale_power: Math.round(saleScore * 100) / 100,
        conversion: Math.round(convScore * 100) / 100,
        affiliate_friendliness: Math.round(referScore * 100) / 100,
        refund_risk: Math.round(refundRisk * 100) / 100,
        growth_potential: Math.round(growthScore * 100) / 100,
      },
    };
  }));

  // 改善提案
  const suggestions = [];
  for (const p of results) {
    if (p.clicks > 30 && p.conversion_rate < 0.02) {
      suggestions.push({ product: p.product_name, type: 'conv_low', message: `成約率が${(p.conversion_rate * 100).toFixed(1)}%と低い状態です。商品説明や紹介文の見直しを検討してください。` });
    }
    if (p.affiliates > 3 && p.active_affiliates < p.affiliates * 0.3) {
      suggestions.push({ product: p.product_name, type: 'affiliate_inactive', message: `登録紹介者${p.affiliates}人中、稼働中${p.active_affiliates}人と稼働率が低い状態です。紹介素材や研修コンテンツを充実させてください。` });
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ products: results, suggestions }),
  };
}

async function getAnalyticsAffiliates(params, headers) {
  const { start, end } = getAdminPeriodDates(params.period || '30d', params.start, params.end);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  const { data: affiliates } = await supabase
    .from('affiliates')
    .select('id,name,affiliate_code,status,approved_at,created_at,tags')
    .eq('status', 'active');

  const results = await Promise.all((affiliates || []).map(async (aff) => {
    const [clicksRes, purchasesRes, commissionsRes] = await Promise.all([
      supabase.from('clicks').select('id', { count: 'exact' }).eq('affiliate_id', aff.id).gte('created_at', startISO).lte('created_at', endISO),
      supabase.from('purchases').select('id,amount_total,status').eq('affiliate_id', aff.id).gte('purchased_at', startISO).lte('purchased_at', endISO),
      supabase.from('commissions').select('amount,status').eq('affiliate_id', aff.id).gte('created_at', startISO).lte('created_at', endISO),
    ]);

    const clicks = clicksRes.count || 0;
    const purchases = purchasesRes.data || [];
    const commissions = commissionsRes.data || [];
    const valid = purchases.filter(p => p.status === 'completed');
    const refunded = purchases.filter(p => p.status === 'refunded');
    const cancelled = purchases.filter(p => p.status === 'cancelled');
    const revenue = valid.reduce((s, p) => s + (p.amount_total || 0), 0);
    const commission = commissions.reduce((s, c) => s + (c.amount || 0), 0);
    const convRate = clicks > 0 ? valid.length / clicks : 0;

    // 不正疑い
    const { data: suspicious } = await supabase.from('suspicious_events').select('id').eq('affiliate_id', aff.id).eq('status', 'open').limit(1);
    const fraud_flag = (suspicious || []).length > 0;

    // 診断タイプ
    let diagnosis_type = 'normal';
    if (clicks < 10) diagnosis_type = 'click_shortage';
    else if (convRate < 0.01 && clicks >= 10) diagnosis_type = 'low_conversion';
    else if (convRate >= 0.03 && commission >= 30000) diagnosis_type = 'balanced_excellent';
    else if (valid.length > 0) diagnosis_type = 'stable';

    // スコア
    const score = Math.min(100, (clicks * 0.5 + valid.length * 10 + commission / 1000) / 3);

    return {
      affiliate_id: aff.id,
      affiliate_name: aff.name,
      affiliate_code: aff.affiliate_code,
      status: aff.status,
      clicks,
      conversions: valid.length,
      conversion_rate: convRate,
      revenue,
      commission,
      refunds: refunded.length,
      cancels: cancelled.length,
      diagnosis_type,
      score: Math.round(score * 100) / 100,
      fraud_flag,
    };
  }));

  // 改善提案
  const suggestions = [];
  for (const a of results) {
    if (a.clicks > 50 && a.conversion_rate < 0.01) {
      suggestions.push({ affiliate: a.affiliate_name, type: 'conv_low', message: `${a.affiliate_name}さんのクリック数は多いのに成約率が低い状態です。紹介文が広すぎる可能性があります。対象者を絞った紹介文テンプレートを渡してください。` });
    }
    if (a.fraud_flag) {
      suggestions.push({ affiliate: a.affiliate_name, type: 'fraud', message: `${a.affiliate_name}さんに不正疑いフラグが立っています。不審なクリックパターンを確認してください。` });
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ affiliates: results, suggestions }),
  };
}
