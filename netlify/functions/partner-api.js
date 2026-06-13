// netlify/functions/partner-api.js
// パートナー（product_owner）専用 API
//
// 認証: partner_token (app_usersのsession_token)
// ルーティング:
//   POST /partner-api/login          ログイン
//   POST /partner-api/logout         ログアウト
//   GET  /partner-api/me             自分の情報
//   GET  /partner-api/products       自分の商品一覧
//   GET  /partner-api/products/:id/stats      商品統計
//   GET  /partner-api/products/:id/purchases  購入者一覧
//   GET  /partner-api/products/:id/affiliates 紹介者別成果
//   GET  /partner-api/products/:id/campaigns  キャンペーン別成果
//   GET  /partner-api/products/:id/csv/:type  CSV出力
//   GET  /partner-api/requests       自分の申請一覧
//   POST /partner-api/requests       申請作成
//   PUT  /partner-api/requests/:id/cancel  申請キャンセル
//   GET  /partner-api/materials      紹介素材一覧（自商品）
//   GET  /partner-api/notices        購入者向けお知らせ履歴

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function ok(data, status = 200) {
  return { statusCode: status, headers: CORS_HEADERS, body: JSON.stringify(data) };
}
function err(msg, status = 400) {
  return { statusCode: status, headers: CORS_HEADERS, body: JSON.stringify({ error: msg }) };
}

// ============================================================
// メインハンドラ
// ============================================================
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  const path = event.path.replace('/.netlify/functions/partner-api', '').replace('/api/partner-api', '');
  const method = event.httpMethod;
  const params = event.queryStringParameters || {};

  // ---- ログイン（認証不要） ----
  if (path === '/login' && method === 'POST') {
    return handleLogin(event);
  }

  // ---- それ以外は認証必須 ----
  const user = await authenticate(event);
  if (!user) return err('Unauthorized', 401);

  try {
    // ログアウト
    if (path === '/logout' && method === 'POST') {
      await supabase.from('app_users').update({ session_token: null, session_expires_at: null }).eq('id', user.id);
      return ok({ success: true });
    }

    // 自分の情報
    if (path === '/me' && method === 'GET') {
      return handleMe(user);
    }

    // 自分の商品一覧
    if (path === '/products' && method === 'GET') {
      return handleProducts(user);
    }

    // 商品詳細系
    const productStatsMatch = path.match(/^\/products\/([^/]+)\/stats$/);
    if (productStatsMatch && method === 'GET') {
      return handleProductStats(user, productStatsMatch[1]);
    }

    const productPurchasesMatch = path.match(/^\/products\/([^/]+)\/purchases$/);
    if (productPurchasesMatch && method === 'GET') {
      return handleProductPurchases(user, productPurchasesMatch[1], params);
    }

    const productAffiliatesMatch = path.match(/^\/products\/([^/]+)\/affiliates$/);
    if (productAffiliatesMatch && method === 'GET') {
      return handleProductAffiliates(user, productAffiliatesMatch[1]);
    }

    const productCampaignsMatch = path.match(/^\/products\/([^/]+)\/campaigns$/);
    if (productCampaignsMatch && method === 'GET') {
      return handleProductCampaigns(user, productCampaignsMatch[1]);
    }

    const csvMatch = path.match(/^\/products\/([^/]+)\/csv\/(.+)$/);
    if (csvMatch && method === 'GET') {
      return handleCsvExport(user, csvMatch[1], csvMatch[2]);
    }

    // 申請
    if (path === '/requests' && method === 'GET') {
      return handleGetRequests(user, params);
    }
    if (path === '/requests' && method === 'POST') {
      return handleCreateRequest(user, event);
    }
    const cancelMatch = path.match(/^\/requests\/([^/]+)\/cancel$/);
    if (cancelMatch && method === 'PUT') {
      return handleCancelRequest(user, cancelMatch[1]);
    }

    // 紹介素材
    if (path === '/materials' && method === 'GET') {
      return handleMaterials(user, params);
    }

    // お知らせ履歴
    if (path === '/notices' && method === 'GET') {
      return handleNotices(user, params);
    }

    return err('Not Found', 404);
  } catch (e) {
    console.error('partner-api error:', e);
    return err('Internal server error', 500);
  }
};

// ============================================================
// 認証
// ============================================================
async function authenticate(event) {
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;

  const { data: user } = await supabase
    .from('app_users')
    .select('id,email,role,display_name,is_active,session_token,session_expires_at')
    .eq('session_token', token)
    .eq('role', 'product_owner')
    .eq('is_active', true)
    .single();

  if (!user) return null;
  if (user.session_expires_at && new Date(user.session_expires_at) < new Date()) return null;
  return user;
}

// ============================================================
// ログイン
// ============================================================
async function handleLogin(event) {
  const { email, password } = JSON.parse(event.body || '{}');
  if (!email || !password) return err('email and password required');

  const { data: user } = await supabase
    .from('app_users')
    .select('id,email,role,display_name,is_active,password_hash')
    .eq('email', email.toLowerCase().trim())
    .eq('role', 'product_owner')
    .single();

  if (!user || !user.is_active) {
    return err('メールアドレスまたはパスワードが正しくありません', 401);
  }

  // パスワード検証（bcryptなどは使わずシンプルにSHA256ハッシュで比較）
  // 本番では bcrypt を推奨。ここでは環境変数ベースの簡易認証
  const expectedHash = hashPassword(password);
  if (user.password_hash !== expectedHash) {
    // 環境変数 PARTNER_MASTER_PASSWORD でのフォールバック認証（初期設定用）
    const masterPass = process.env.PARTNER_MASTER_PASSWORD;
    if (!masterPass || password !== masterPass) {
      return err('メールアドレスまたはパスワードが正しくありません', 401);
    }
  }

  // セッショントークン発行（24時間）
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await supabase.from('app_users').update({
    session_token: sessionToken,
    session_expires_at: expiresAt,
    last_login_at: new Date().toISOString(),
  }).eq('id', user.id);

  // ============================================================
  // 担当商品一覧を取得
  // ① product_owners に紐づいた商品（管理者が手動で紐づけたもの）
  // ② アフィリエイター紹介実績がある商品（紹介を始めたら自動表示）
  //    ※ パートナーのメールアドレスとアフィリエイターのメールアドレスが一致する場合
  // ============================================================
  const { data: ownedProducts } = await supabase
    .from('product_owners')
    .select('product_id, permission_level, status, products(id,name,price,status)')
    .eq('user_id', user.id)
    .eq('status', 'active');

  // 紹介実績がある商品（affiliatesテーブルとcommissionsテーブルから）
  const { data: affiliateRecord } = await supabase
    .from('affiliates')
    .select('id')
    .eq('email', user.email)
    .eq('status', 'active')
    .single();

  let referredProductIds = new Set((ownedProducts || []).map(p => p.product_id));
  const referredProducts = [];

  if (affiliateRecord) {
    // このアフィリエイターが紹介した購入の商品を取得
    const { data: referredPurchases } = await supabase
      .from('purchases')
      .select('product_id, products(id,name,price,status)')
      .eq('affiliate_id', affiliateRecord.id)
      .eq('status', 'completed')
      .not('product_id', 'is', null);

    for (const p of (referredPurchases || [])) {
      if (!referredProductIds.has(p.product_id) && p.products) {
        referredProductIds.add(p.product_id);
        referredProducts.push({
          product_id: p.product_id,
          permission_level: 'viewer',  // 紹介実績ベースはviewerのみ
          source: 'affiliate_activity', // 紹介実績由来
          product: p.products,
        });
      }
    }
  }

  const allProducts = [
    ...(ownedProducts || []).map(p => ({
      product_id: p.product_id,
      permission_level: p.permission_level,
      source: 'assigned',  // 管理者が手動紐づけ
      product: p.products,
    })),
    ...referredProducts,
  ];

  return ok({
    token: sessionToken,
    expires_at: expiresAt,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      display_name: user.display_name,
    },
    products: allProducts,
    has_products: allProducts.length > 0,
  });
}

function hashPassword(plain) {
  return crypto.createHash('sha256').update(plain + (process.env.PASSWORD_SALT || 'salt_change_me')).digest('hex');
}

// ============================================================
// 自分の情報
// ============================================================
async function handleMe(user) {
  const { data: owned } = await supabase
    .from('product_owners')
    .select(`
      id, product_id, permission_level, status,
      products(id, name, description, price, status, lp_url),
      product_owner_permissions(*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');

  // 紹介実績がある商品も追加
  const { data: affiliateRecord } = await supabase
    .from('affiliates')
    .select('id')
    .eq('email', user.email)
    .eq('status', 'active')
    .single();

  const assignedIds = new Set((owned || []).map(o => o.product_id));
  const referredProducts = [];

  if (affiliateRecord) {
    const { data: referredPurchases } = await supabase
      .from('purchases')
      .select('product_id, products(id,name,description,price,status,lp_url)')
      .eq('affiliate_id', affiliateRecord.id)
      .eq('status', 'completed')
      .not('product_id', 'is', null);

    for (const p of (referredPurchases || [])) {
      if (!assignedIds.has(p.product_id) && p.products) {
        assignedIds.add(p.product_id);
        referredProducts.push({
          product_id: p.product_id,
          permission_level: 'viewer',
          source: 'affiliate_activity',
          products: p.products,
        });
      }
    }
  }

  return ok({ user, products: [...(owned || []).map(o => ({ ...o, source: 'assigned' })), ...referredProducts] });
}

// ============================================================
// 商品一覧
// ============================================================
async function handleProducts(user) {
  const { data: owned } = await supabase
    .from('product_owners')
    .select(`
      id, product_id, permission_level,
      products(id, name, description, price, stripe_price_id, status, lp_url, created_at)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');

  return ok({ products: owned || [] });
}

// ============================================================
// 商品統計（ダッシュボード）
// ============================================================
async function handleProductStats(user, productId) {
  // 権限チェック
  if (!await hasProductAccess(user.id, productId)) return err('Forbidden', 403);

  const now = new Date().toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // 商品情報
  const { data: product } = await supabase
    .from('products')
    .select('id,name,price,status,lp_url')
    .eq('id', productId)
    .single();

  // 全購入（statusのカウント）
  const { data: purchaseSummary } = await supabase
    .from('purchases')
    .select('id,status,amount_total,purchase_source,purchased_at')
    .eq('product_id', productId);

  const completed = (purchaseSummary || []).filter(p => p.status === 'completed');
  const refunded  = (purchaseSummary || []).filter(p => p.status === 'refunded');
  const affiliateSales = completed.filter(p => p.purchase_source === 'affiliate');
  const directSales    = completed.filter(p => p.purchase_source !== 'affiliate');

  const totalRevenue   = completed.reduce((s, p) => s + (p.amount_total || 0), 0);
  const refundCount    = refunded.length;

  // クリック数（30日）
  const { count: clickCount } = await supabase
    .from('clicks')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)
    .gte('created_at', thirtyDaysAgo);

  // LINE登録数（このproductに紐づくattribution_events）
  const { count: lineRegistrations } = await supabase
    .from('attribution_events')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)
    .eq('event_type', 'line_register');

  // セミナー視聴数
  const { count: seminarViews } = await supabase
    .from('seminar_views')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId);

  // 現在の段階価格情報
  const { data: priceTiers } = await supabase
    .from('price_tiers')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('min_valid_sales_count');

  // 購入率（LINE登録からの転換率）
  const conversionRate = lineRegistrations && lineRegistrations > 0
    ? ((completed.length / lineRegistrations) * 100).toFixed(1)
    : '0.0';

  // 有効販売数（完了のみ）
  const validSalesCount = completed.length;

  return ok({
    product,
    stats: {
      total_sales: completed.length,
      valid_sales_count: validSalesCount,
      refund_count: refundCount,
      total_revenue: totalRevenue,
      affiliate_sales: affiliateSales.length,
      direct_sales: directSales.length,
      click_count_30d: clickCount || 0,
      line_registrations: lineRegistrations || 0,
      seminar_views: seminarViews || 0,
      conversion_rate: conversionRate,
    },
    price_tiers: priceTiers || [],
  });
}

// ============================================================
// 購入者一覧
// ============================================================
async function handleProductPurchases(user, productId, params) {
  if (!await hasProductAccess(user.id, productId)) return err('Forbidden', 403);

  // 顧客閲覧権限チェック
  const perm = await getPermissions(user.id, productId);
  if (!perm?.can_view_customers) return err('顧客情報の閲覧権限がありません', 403);

  const limit = parseInt(params.limit) || 50;
  const offset = parseInt(params.offset) || 0;

  const { data, count } = await supabase
    .from('purchases')
    .select(`
      id,
      product_name,
      amount_total,
      status,
      purchase_source,
      purchased_at,
      buyer_email,
      affiliate_name,
      campaign_name,
      commission_status,
      access_verified
    `, { count: 'exact' })
    .eq('product_id', productId)
    .order('purchased_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return ok({ purchases: data || [], total: count || 0, limit, offset });
}

// ============================================================
// 紹介者別成果
// ============================================================
async function handleProductAffiliates(user, productId) {
  if (!await hasProductAccess(user.id, productId)) return err('Forbidden', 403);

  const perm = await getPermissions(user.id, productId);
  if (!perm?.can_view_affiliates) return err('紹介者情報の閲覧権限がありません', 403);

  const { data } = await supabase
    .from('purchases')
    .select('affiliate_id, affiliate_name, affiliate_code, campaign_name, amount_total, status, purchased_at')
    .eq('product_id', productId)
    .eq('status', 'completed')
    .not('affiliate_id', 'is', null);

  // 紹介者別に集計
  const byAffiliate = {};
  for (const p of data || []) {
    const key = p.affiliate_id;
    if (!byAffiliate[key]) {
      byAffiliate[key] = {
        affiliate_id: p.affiliate_id,
        affiliate_name: p.affiliate_name,
        affiliate_code: p.affiliate_code,
        sales_count: 0,
        total_amount: 0,
        campaigns: new Set(),
      };
    }
    byAffiliate[key].sales_count++;
    byAffiliate[key].total_amount += p.amount_total || 0;
    if (p.campaign_name) byAffiliate[key].campaigns.add(p.campaign_name);
  }

  const result = Object.values(byAffiliate).map(a => ({
    ...a,
    campaigns: Array.from(a.campaigns),
  })).sort((a, b) => b.sales_count - a.sales_count);

  return ok({ affiliates: result });
}

// ============================================================
// キャンペーン別成果
// ============================================================
async function handleProductCampaigns(user, productId) {
  if (!await hasProductAccess(user.id, productId)) return err('Forbidden', 403);

  const { data: campaigns } = await supabase
    .from('affiliate_campaigns')
    .select('id,name,status,commission_type,commission_amount,current_sales,starts_at,ends_at')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  // 各キャンペーンの購入数・売上を取得
  const enriched = await Promise.all((campaigns || []).map(async c => {
    const { data: purchases } = await supabase
      .from('purchases')
      .select('id,amount_total,status,purchase_source')
      .eq('campaign_id', c.id);

    const completed = (purchases || []).filter(p => p.status === 'completed');
    return {
      ...c,
      completed_sales: completed.length,
      total_revenue: completed.reduce((s, p) => s + (p.amount_total || 0), 0),
    };
  }));

  return ok({ campaigns: enriched });
}

// ============================================================
// CSV出力
// ============================================================
async function handleCsvExport(user, productId, csvType) {
  if (!await hasProductAccess(user.id, productId)) return err('Forbidden', 403);

  const perm = await getPermissions(user.id, productId);
  if (!perm?.can_export_csv) return err('CSV出力権限がありません', 403);

  const allowedTypes = ['purchases', 'sales', 'affiliates', 'daily_sales', 'campaigns'];
  if (!allowedTypes.includes(csvType)) return err('Invalid CSV type');

  let csvData = '';
  const now = new Date().toISOString().slice(0, 10);

  if (csvType === 'purchases') {
    const { data } = await supabase
      .from('purchases')
      .select('id,product_name,amount_total,status,purchase_source,purchased_at,buyer_email,affiliate_name,campaign_name,access_verified')
      .eq('product_id', productId)
      .order('purchased_at', { ascending: false });

    csvData = 'ID,商品名,金額,ステータス,購入元,購入日時,メール,紹介者,キャンペーン,権限確認済\n';
    for (const p of data || []) {
      csvData += `${p.id},${escape(p.product_name)},${p.amount_total},${p.status},${p.purchase_source},${p.purchased_at},${p.buyer_email || ''},${p.affiliate_name || ''},${p.campaign_name || ''},${p.access_verified}\n`;
    }
  } else if (csvType === 'daily_sales') {
    const { data } = await supabase
      .from('purchases')
      .select('amount_total,status,purchased_at')
      .eq('product_id', productId)
      .eq('status', 'completed')
      .order('purchased_at');

    // 日別集計
    const daily = {};
    for (const p of data || []) {
      const day = p.purchased_at?.slice(0, 10) || 'unknown';
      if (!daily[day]) daily[day] = { count: 0, amount: 0 };
      daily[day].count++;
      daily[day].amount += p.amount_total || 0;
    }

    csvData = '日付,件数,売上合計\n';
    for (const [day, v] of Object.entries(daily)) {
      csvData += `${day},${v.count},${v.amount}\n`;
    }
  } else if (csvType === 'affiliates') {
    const { data } = await supabase
      .from('purchases')
      .select('affiliate_id,affiliate_name,affiliate_code,amount_total,status')
      .eq('product_id', productId)
      .eq('status', 'completed')
      .not('affiliate_id', 'is', null);

    const byAffiliate = {};
    for (const p of data || []) {
      if (!byAffiliate[p.affiliate_id]) {
        byAffiliate[p.affiliate_id] = { name: p.affiliate_name, code: p.affiliate_code, count: 0, amount: 0 };
      }
      byAffiliate[p.affiliate_id].count++;
      byAffiliate[p.affiliate_id].amount += p.amount_total || 0;
    }

    csvData = '紹介者名,コード,販売数,売上合計\n';
    for (const v of Object.values(byAffiliate)) {
      csvData += `${escape(v.name)},${v.code},${v.count},${v.amount}\n`;
    }
  } else if (csvType === 'campaigns') {
    const { data } = await supabase
      .from('affiliate_campaigns')
      .select('id,name,status,commission_type,commission_amount')
      .eq('product_id', productId);

    csvData = 'キャンペーン名,ステータス,報酬タイプ,報酬額,販売数,売上合計\n';
    for (const c of data || []) {
      const { data: ps } = await supabase
        .from('purchases')
        .select('amount_total')
        .eq('campaign_id', c.id)
        .eq('status', 'completed');
      const cnt = (ps || []).length;
      const amt = (ps || []).reduce((s, p) => s + (p.amount_total || 0), 0);
      csvData += `${escape(c.name)},${c.status},${c.commission_type},${c.commission_amount},${cnt},${amt}\n`;
    }
  } else {
    // sales summary
    const { data } = await supabase
      .from('purchases')
      .select('id,amount_total,status,purchased_at,purchase_source')
      .eq('product_id', productId)
      .order('purchased_at', { ascending: false });

    csvData = 'ID,金額,ステータス,購入日時,購入元\n';
    for (const p of data || []) {
      csvData += `${p.id},${p.amount_total},${p.status},${p.purchased_at},${p.purchase_source}\n`;
    }
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="product_${productId}_${csvType}_${now}.csv"`,
      'Access-Control-Allow-Origin': '*',
    },
    body: '\uFEFF' + csvData, // BOM付きUTF-8
  };
}

function escape(v) {
  if (!v) return '';
  return `"${String(v).replace(/"/g, '""')}"`;
}

// ============================================================
// 申請一覧取得
// ============================================================
async function handleGetRequests(user, params) {
  const query = supabase
    .from('partner_requests')
    .select(`
      id, product_id, request_type, status, request_data,
      rejection_reason, reviewed_at, created_at, updated_at,
      products(name)
    `)
    .eq('requester_id', user.id)
    .order('created_at', { ascending: false });

  if (params.status) query.eq('status', params.status);

  const { data } = await query;
  return ok({ requests: data || [] });
}

// ============================================================
// 申請作成
// ============================================================
async function handleCreateRequest(user, event) {
  const body = JSON.parse(event.body || '{}');
  const { product_id, request_type, request_data } = body;

  if (!product_id || !request_type) return err('product_id and request_type required');

  if (!await hasProductAccess(user.id, product_id)) return err('Forbidden', 403);

  // permission_levelチェック
  const { data: po } = await supabase
    .from('product_owners')
    .select('permission_level')
    .eq('user_id', user.id)
    .eq('product_id', product_id)
    .eq('status', 'active')
    .single();

  if (!po) return err('Forbidden', 403);

  // viewerは申請不可
  if (po.permission_level === 'viewer') {
    return err('閲覧権限のみのアカウントは申請できません', 403);
  }

  // managerは商品説明・素材のみ申請可
  const managerAllowed = ['product_description_change', 'material_add'];
  if (po.permission_level === 'manager' && !managerAllowed.includes(request_type)) {
    return err('このアカウントでは申請できないリクエスト種別です', 403);
  }

  // 同じ種別でpendingが既にある場合は申請不可
  const { data: existing } = await supabase
    .from('partner_requests')
    .select('id')
    .eq('requester_id', user.id)
    .eq('product_id', product_id)
    .eq('request_type', request_type)
    .eq('status', 'pending')
    .limit(1)
    .single();

  if (existing) {
    return err('同じ種別の申請がすでに審査中です。承認または却下をお待ちください。');
  }

  const { data: newReq, error } = await supabase
    .from('partner_requests')
    .insert({
      requester_id: user.id,
      product_id,
      request_type,
      request_data: request_data || {},
    })
    .select()
    .single();

  if (error) return err(error.message);

  // 管理者通知
  await supabase.from('notifications').insert({
    recipient_type: 'admin',
    recipient_id: 'admin',
    type: 'partner_request_created',
    title: `パートナー申請: ${request_type}`,
    body: `${user.display_name || user.email} から「${request_type}」の申請が届きました。`,
    related_type: 'partner_request',
    related_id: newReq.id,
  });

  return ok({ request: newReq }, 201);
}

// ============================================================
// 申請キャンセル
// ============================================================
async function handleCancelRequest(user, requestId) {
  const { data: req } = await supabase
    .from('partner_requests')
    .select('id,requester_id,status')
    .eq('id', requestId)
    .single();

  if (!req) return err('Not found', 404);
  if (req.requester_id !== user.id) return err('Forbidden', 403);
  if (req.status !== 'pending') return err('pendingステータスの申請のみキャンセルできます');

  const { data: updated } = await supabase
    .from('partner_requests')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single();

  return ok({ request: updated });
}

// ============================================================
// 紹介素材
// ============================================================
async function handleMaterials(user, params) {
  // 自分の商品に紐づく案件のIDを取得
  const { data: owned } = await supabase
    .from('product_owners')
    .select('product_id')
    .eq('user_id', user.id)
    .eq('status', 'active');

  const productIds = (owned || []).map(o => o.product_id);
  if (productIds.length === 0) return ok({ materials: [] });

  const { data: campaigns } = await supabase
    .from('affiliate_campaigns')
    .select('id,name,product_id,products(name)')
    .in('product_id', productIds)
    .neq('status', 'ended');

  return ok({ campaigns: campaigns || [] });
}

// ============================================================
// お知らせ履歴（購入者向け配信済み）
// ============================================================
async function handleNotices(user, params) {
  const { data: owned } = await supabase
    .from('product_owners')
    .select('product_id')
    .eq('user_id', user.id)
    .eq('status', 'active');

  const productIds = (owned || []).map(o => o.product_id);
  if (productIds.length === 0) return ok({ notices: [] });

  const { data: notices } = await supabase
    .from('announcements')
    .select('id,title,body,type,published_at,created_by,is_published,target_product_id')
    .in('target_product_id', productIds)
    .order('published_at', { ascending: false })
    .limit(50);

  return ok({ notices: notices || [] });
}

// ============================================================
// ユーティリティ
// ============================================================
async function hasProductAccess(userId, productId) {
  // ① 管理者が手動で紐づけた場合
  const { data: assigned } = await supabase
    .from('product_owners')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .eq('status', 'active')
    .single();

  if (assigned) return true;

  // ② アフィリエイター紹介実績がある場合（同メールのアフィリエイターとして）
  const { data: appUser } = await supabase
    .from('app_users')
    .select('email')
    .eq('id', userId)
    .single();

  if (appUser?.email) {
    const { data: affiliateRecord } = await supabase
      .from('affiliates')
      .select('id')
      .eq('email', appUser.email)
      .eq('status', 'active')
      .single();

    if (affiliateRecord) {
      const { data: referredPurchase } = await supabase
        .from('purchases')
        .select('id')
        .eq('affiliate_id', affiliateRecord.id)
        .eq('product_id', productId)
        .eq('status', 'completed')
        .limit(1)
        .single();

      if (referredPurchase) return true;
    }
  }

  return false;
}

async function getPermissions(userId, productId) {
  const { data: po } = await supabase
    .from('product_owners')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .eq('status', 'active')
    .single();

  if (!po) return null;

  const { data: perm } = await supabase
    .from('product_owner_permissions')
    .select('*')
    .eq('product_owner_id', po.id)
    .single();

  // デフォルト権限（permissionsレコードがない場合）
  return perm || {
    can_view_sales: true,
    can_view_customers: false,
    can_view_affiliates: true,
    can_export_csv: false,
    can_edit_product_description: false,
    can_submit_campaign_request: true,
    can_submit_price_request: false,
    can_submit_notice_request: false,
  };
}
