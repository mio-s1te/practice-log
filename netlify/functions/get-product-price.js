// netlify/functions/get-product-price.js
// 商品の現在価格・段階価格情報を返すAPI
// GET /.netlify/functions/get-product-price?product_id=xxx

const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws } }
);

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const { product_id } = event.queryStringParameters || {};

  if (!product_id) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'product_id is required' }),
    };
  }

  try {
    // 商品情報取得
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, price, stripe_price_id, status')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Product not found' }),
      };
    }

    // 有効累計販売数を取得
    // 有効条件: status = 'completed' のみ（返金・キャンセル・チャージバック除外）
    const { count: validSalesCount } = await supabase
      .from('purchases')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', product_id)
      .eq('status', 'completed');

    const salesCount = validSalesCount || 0;

    // 全 price_tiers を取得
    const { data: allTiers, error: tiersError } = await supabase
      .from('price_tiers')
      .select('*')
      .eq('product_id', product_id)
      .eq('is_active', true)
      .order('min_valid_sales_count', { ascending: true });

    if (tiersError) {
      console.error('Price tiers fetch error:', tiersError);
    }

    const tiers = allTiers || [];

    // price_tiers が設定されていない場合は商品のデフォルト価格を返す
    if (tiers.length === 0) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          product_id,
          product_name: product.name,
          current_price: product.price,
          current_stripe_price_id: product.stripe_price_id || null,
          current_tier: null,
          next_tier: null,
          valid_sales_count: salesCount,
          remaining_until_next_tier: null,
          all_tiers: [],
          has_price_tiers: false,
        }),
      };
    }

    // 現在適用中の tier を判定
    const currentTier = findCurrentTier(tiers, salesCount);

    // 次の tier を判定
    const nextTier = findNextTier(tiers, currentTier);

    // 次のtierまでの残り部数
    const remainingUntilNextTier =
      nextTier && currentTier?.max_valid_sales_count != null
        ? currentTier.max_valid_sales_count - salesCount
        : null;

    // 現在価格 (tierがあればtierの価格、なければ商品デフォルト価格)
    const currentPrice = currentTier ? currentTier.price : product.price;
    const currentStripePriceId = currentTier
      ? currentTier.stripe_price_id
      : product.stripe_price_id || null;

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        product_id,
        product_name: product.name,
        current_price: currentPrice,
        current_stripe_price_id: currentStripePriceId,
        current_tier: currentTier || null,
        next_tier: nextTier || null,
        valid_sales_count: salesCount,
        remaining_until_next_tier: remainingUntilNextTier,
        all_tiers: tiers,
        has_price_tiers: true,
      }),
    };
  } catch (error) {
    console.error('get-product-price error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
};

/**
 * 現在適用中の tier を返す
 * @param {Array} tiers - is_active=trueのtier一覧 (min_valid_sales_count昇順)
 * @param {number} salesCount - 現在の有効販売数
 */
function findCurrentTier(tiers, salesCount) {
  // 該当する全tierのうち、min_valid_sales_count が最大のものを採用
  const matching = tiers.filter(
    (t) =>
      t.min_valid_sales_count <= salesCount &&
      (t.max_valid_sales_count === null || t.max_valid_sales_count >= salesCount)
  );

  if (matching.length === 0) return null;

  // min_valid_sales_count が最大のものを返す (最も具体的なtier)
  return matching.reduce((prev, curr) =>
    curr.min_valid_sales_count > prev.min_valid_sales_count ? curr : prev
  );
}

/**
 * 次の tier を返す
 * @param {Array} tiers - is_active=trueのtier一覧
 * @param {Object|null} currentTier - 現在適用中のtier
 */
function findNextTier(tiers, currentTier) {
  if (!currentTier) return null;

  // 現在tierに上限なし = 最終tier = 次はない
  if (currentTier.max_valid_sales_count === null) return null;

  // 現在tierのmax+1をminとするtierを探す
  const nextMin = currentTier.max_valid_sales_count + 1;
  const next = tiers.find((t) => t.min_valid_sales_count === nextMin);

  return next || null;
}
