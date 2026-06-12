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
    };

    // Stripe Checkout Session作成
    const sessionParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        product.stripe_price_id
          ? {
              price: product.stripe_price_id,
              quantity: 1,
            }
          : {
              price_data: {
                currency: 'jpy',
                product_data: {
                  name: product.name,
                  description: product.description || '',
                },
                unit_amount: product.price,
              },
              quantity: 1,
            },
      ],
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
      amount_total: product.price,
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
