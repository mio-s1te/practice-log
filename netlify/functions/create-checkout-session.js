// netlify/functions/create-checkout-session.js
// Stripe Checkout Session作成

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_URL = process.env.SITE_URL || 'https://localhost:3000';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      product_id,
      line_user_id,
      click_id,
      affiliate_id,
      affiliate_code,
      campaign_id,
      lead_id,
    } = body;

    if (!product_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'product_id required' }),
      };
    }

    // 商品情報取得
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Product not found' }),
      };
    }

    if (product.status !== 'active') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Product is not available' }),
      };
    }

    // --------------------------------------------------------
    // 段階価格設定: 有効累計販売数に基づく価格tier判定
    // --------------------------------------------------------
    const { currentPriceForCheckout, currentStripePriceIdForCheckout, currentTierForCheckout } =
      await resolveCurrentPriceTier(product);

    // キャンペーン確認（案件停止チェック）
    let campaignName = null;
    let affiliateName = null;
    let finalAffiliateCode = affiliate_code;

    if (campaign_id) {
      const { data: campaign } = await supabase
        .from('affiliate_campaigns')
        .select('id, name, status, commission_type, commission_amount')
        .eq('id', campaign_id)
        .single();

      if (campaign) {
        campaignName = campaign.name;
        if (campaign.status === 'ended' || campaign.status === 'paused') {
          // 停止中案件経由の購入：報酬は発生しない
          console.log(`Campaign ${campaign_id} is ${campaign.status}, no commission`);
        }
      }
    }

    if (affiliate_id) {
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id, name, affiliate_code, status')
        .eq('id', affiliate_id)
        .single();
      
      if (affiliate) {
        affiliateName = affiliate.name;
        if (!finalAffiliateCode) {
          finalAffiliateCode = affiliate.affiliate_code;
        }
      }
    }

    // 有効なアトリビューションイベント確認
    let attributionEventId = null;
    if (affiliate_id && campaign_id) {
      const { data: attrEvent } = await supabase
        .from('attribution_events')
        .select('id, expires_at')
        .eq('line_user_id', line_user_id)
        .eq('affiliate_id', affiliate_id)
        .eq('campaign_id', campaign_id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      attributionEventId = attrEvent?.id || null;
    }

    // Stripe Checkout Session metadata
    const metadata = {
      product_id: product_id || '',
      line_user_id: line_user_id || '',
      affiliate_id: affiliate_id || '',
      affiliate_code: finalAffiliateCode || '',
      campaign_id: campaign_id || '',
      lead_id: lead_id || '',
      click_id: click_id || '',
      attribution_event_id: attributionEventId || '',
      product_name: product.name,
      campaign_name: campaignName || '',
      affiliate_name: affiliateName || '',
      // 段階価格情報をmetadataに保存
      price_tier_id: currentTierForCheckout?.tier_id || '',
      price_tier_name: currentTierForCheckout?.tier_name || '',
    };

    // --------------------------------------------------------
    // Stripe Checkout Session作成
    // 段階価格が設定されている場合はtierのStripe Price IDを使用
    // --------------------------------------------------------
    let lineItems;
    if (currentStripePriceIdForCheckout) {
      // Stripe Price IDが設定されている (tier or 商品デフォルト)
      lineItems = [{ price: currentStripePriceIdForCheckout, quantity: 1 }];
    } else {
      // Stripe Price IDが未設定: price_dataでインライン指定
      lineItems = [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: product.name,
              description: product.description || '',
            },
            unit_amount: currentPriceForCheckout,
          },
          quantity: 1,
        },
      ];
    }

    const sessionParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      metadata,
      client_reference_id: lead_id || click_id || undefined,
      success_url: `${SITE_URL}/purchase-complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/cancel?product_id=${product_id}`,
      locale: 'ja',
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    // checkout_sessionsテーブルに保存
    await supabase.from('checkout_sessions').insert({
      stripe_session_id: session.id,
      lead_id: lead_id || null,
      line_user_id: line_user_id || null,
      product_id,
      campaign_id: campaign_id || null,
      affiliate_id: affiliate_id || null,
      affiliate_code: finalAffiliateCode || null,
      click_id: click_id || null,
      attribution_event_id: attributionEventId,
      amount_total: currentPriceForCheckout,
      status: 'pending',
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        url: session.url,
        session_id: session.id,
      }),
    };
  } catch (error) {
    console.error('Create checkout session error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create checkout session', details: error.message }),
    };
  }
};

// --------------------------------------------------------
// 価格tier判定ヘルパー
// 有効累計販売数を取得し、現在適用すべき price_tier を返す
// --------------------------------------------------------
async function resolveCurrentPriceTier(product) {
  try {
    // 商品の全 price_tiers を取得
    const { data: tiers } = await supabase
      .from('price_tiers')
      .select('*')
      .eq('product_id', product.id)
      .eq('is_active', true)
      .order('min_valid_sales_count', { ascending: true });

    if (!tiers || tiers.length === 0) {
      // price_tiers 未設定: 商品デフォルト価格を使用
      return {
        currentPriceForCheckout: product.price,
        currentStripePriceIdForCheckout: product.stripe_price_id || null,
        currentTierForCheckout: null,
      };
    }

    // 有効累計販売数を取得 (status='completed' のみ)
    const { count: salesCount } = await supabase
      .from('purchases')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', product.id)
      .eq('status', 'completed');

    const validSales = salesCount || 0;

    // 現在適用中のtierを判定
    const matchingTiers = tiers.filter(
      (t) =>
        t.min_valid_sales_count <= validSales &&
        (t.max_valid_sales_count === null || t.max_valid_sales_count >= validSales)
    );

    let currentTier = null;
    if (matchingTiers.length > 0) {
      // min_valid_sales_count が最大のものを採用
      currentTier = matchingTiers.reduce((prev, curr) =>
        curr.min_valid_sales_count > prev.min_valid_sales_count ? curr : prev
      );
    }

    if (!currentTier) {
      // 販売数が最小tierを下回る場合は最初のtierを使用
      currentTier = tiers[0];
    }

    console.log(
      `Price tier resolved: product=${product.id}, sales=${validSales}, tier=${currentTier.tier_name}, price=${currentTier.price}`
    );

    return {
      currentPriceForCheckout: currentTier.price,
      currentStripePriceIdForCheckout: currentTier.stripe_price_id || null,
      currentTierForCheckout: currentTier,
    };
  } catch (err) {
    console.error('resolveCurrentPriceTier error:', err);
    // エラー時はデフォルト価格にフォールバック
    return {
      currentPriceForCheckout: product.price,
      currentStripePriceIdForCheckout: product.stripe_price_id || null,
      currentTierForCheckout: null,
    };
  }
}
