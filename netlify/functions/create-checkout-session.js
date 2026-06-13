// netlify/functions/create-checkout-session.js
// Stripe Checkout Session作成

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws } }
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
      lead_id,
    } = body;

    // --------------------------------------------------------
    // 追跡情報: フロントから受け取った値をletで保持
    // 後続の「自動復元ブロック」で上書きされる可能性がある
    // --------------------------------------------------------
    let click_id     = body.click_id     || null;
    let affiliate_id = body.affiliate_id || null;
    let affiliate_code = body.affiliate_code || null;
    let campaign_id  = body.campaign_id  || null;

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

    // ============================================================
    // 【追跡情報の自動復元】
    //
    // 優先順位:
    //   1. フロントから affiliate_id が渡されている → そのまま使用
    //   2. フロントから affiliate_code が渡されている → DBでIDに解決
    //   3. line_user_id + product_id で attribution_events を検索
    //      → LINE経由・クロスデバイス・後日購入を全て補足
    //   4. click_id がある → attribution_events を click_id で検索
    //
    // 商品別追跡: product_id を条件に加えることで
    //   「A商品はBさん経由、C商品は直接」を正確に分離する
    // ============================================================

    // Step1: affiliate_code → affiliate_id 解決
    if (!affiliate_id && affiliate_code) {
      const { data: affByCode } = await supabase
        .from('affiliates')
        .select('id')
        .eq('affiliate_code', affiliate_code)
        .eq('status', 'active')
        .single();
      if (affByCode) {
        affiliate_id = affByCode.id;
        console.log(`[tracking] affiliate_code "${affiliate_code}" → affiliate_id "${affiliate_id}"`);
      }
    }

    // Step2: line_user_id + product_id で attribution_events を検索
    //   affiliate_id がまだない場合 or click_id がない場合に復元を試みる
    if (line_user_id && (!affiliate_id || !click_id)) {
      const attrQuery = supabase
        .from('attribution_events')
        .select('id, affiliate_id, affiliate_code, campaign_id, click_id, expires_at')
        .eq('line_user_id', line_user_id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      // 商品IDが指定されていれば商品別に絞る（複数商品の混在を防ぐ）
      // product_idが一致するものを優先し、なければ商品指定なしのものを使う
      const { data: attrEventsForProduct } = await attrQuery
        .eq('product_id', product_id)
        .limit(1);

      const { data: attrEventsAny } = await supabase
        .from('attribution_events')
        .select('id, affiliate_id, affiliate_code, campaign_id, click_id, expires_at')
        .eq('line_user_id', line_user_id)
        .is('product_id', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      // 商品別 → 商品指定なし の優先順位で復元
      const bestAttrEvent =
        (attrEventsForProduct && attrEventsForProduct.length > 0 ? attrEventsForProduct[0] : null) ||
        (attrEventsAny && attrEventsAny.length > 0 ? attrEventsAny[0] : null);

      if (bestAttrEvent) {
        if (!affiliate_id && bestAttrEvent.affiliate_id) {
          affiliate_id   = bestAttrEvent.affiliate_id;
          affiliate_code = bestAttrEvent.affiliate_code || affiliate_code;
          campaign_id    = campaign_id || bestAttrEvent.campaign_id;
          click_id       = click_id   || bestAttrEvent.click_id;
          console.log(`[tracking] Restored from attribution_events (line_user_id): affiliate_id="${affiliate_id}", product="${product_id}"`);
        } else if (!click_id && bestAttrEvent.click_id) {
          click_id    = bestAttrEvent.click_id;
          campaign_id = campaign_id || bestAttrEvent.campaign_id;
          console.log(`[tracking] Restored click_id from attribution_events: click_id="${click_id}"`);
        }
      }
    }

    // Step3: click_id はあるが affiliate_id がない → clicks テーブルから復元
    if (click_id && !affiliate_id) {
      const { data: clickRecord } = await supabase
        .from('clicks')
        .select('affiliate_id, affiliate_code, campaign_id')
        .eq('id', click_id)
        .single();
      if (clickRecord?.affiliate_id) {
        affiliate_id   = clickRecord.affiliate_id;
        affiliate_code = clickRecord.affiliate_code || affiliate_code;
        campaign_id    = campaign_id || clickRecord.campaign_id;
        console.log(`[tracking] Restored from clicks table: affiliate_id="${affiliate_id}", click_id="${click_id}"`);
      }
    }

    // --------------------------------------------------------
    // 段階価格設定: 有効累計販売数に基づく価格tier判定
    // --------------------------------------------------------
    const { currentPriceForCheckout, currentStripePriceIdForCheckout, currentTierForCheckout } =
      await resolveCurrentPriceTier(product);

    // キャンペーン確認（案件停止チェック + 紹介権限チェック）
    let campaignName = null;
    let affiliateName = null;
    let finalAffiliateCode = affiliate_code;
    let affiliateAccessDenied = false;   // 紹介権限なしフラグ

    if (campaign_id) {
      const { data: campaign } = await supabase
        .from('affiliate_campaigns')
        .select('id, name, status, commission_type, commission_amount, access_type, required_affiliate_tags')
        .eq('id', campaign_id)
        .single();

      if (campaign) {
        campaignName = campaign.name;
        if (campaign.status === 'ended' || campaign.status === 'paused') {
          // 停止中案件経由の購入：報酬は発生しない
          console.log(`Campaign ${campaign_id} is ${campaign.status}, no commission`);
        }

        // ── 紹介権限チェック ──────────────────────────────────────
        if (affiliate_id && affiliate_id !== '') {
          const hasAccess = await checkAffiliateCampaignAccess(affiliate_id, campaign_id, campaign);
          if (!hasAccess) {
            // 権限なし: affiliate情報をクリアして直接購入として扱う
            // (購入は許可するが affiliate_id は記録しない)
            affiliateAccessDenied = true;
            console.log(`[create-checkout] affiliate ${affiliate_id} has NO access to campaign ${campaign_id}. Treating as direct purchase.`);
          }
        }
      }
    }

    if (affiliate_id) {
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id, name, affiliate_code, status')
        .eq('id', affiliate_id)
        .single();
      
      if (affiliate && !affiliateAccessDenied) {
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
      // 紹介権限なしの場合は affiliate 情報を記録しない (報酬0円の直接購入として処理)
      affiliate_id: (affiliate_id && !affiliateAccessDenied) ? affiliate_id : '',
      affiliate_code: (!affiliateAccessDenied && finalAffiliateCode) ? finalAffiliateCode : '',
      campaign_id: (campaign_id && !affiliateAccessDenied) ? campaign_id : '',
      lead_id: lead_id || '',
      click_id: click_id || '',
      attribution_event_id: (!affiliateAccessDenied && attributionEventId) ? attributionEventId : '',
      product_name: product.name,
      campaign_name: (!affiliateAccessDenied && campaignName) ? campaignName : '',
      affiliate_name: (!affiliateAccessDenied && affiliateName) ? affiliateName : '',
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
      campaign_id: (!affiliateAccessDenied && campaign_id) ? campaign_id : null,
      affiliate_id: (!affiliateAccessDenied && affiliate_id) ? affiliate_id : null,
      affiliate_code: (!affiliateAccessDenied && finalAffiliateCode) ? finalAffiliateCode : null,
      click_id: click_id || null,
      attribution_event_id: (!affiliateAccessDenied) ? attributionEventId : null,
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

// --------------------------------------------------------
// 紹介権限チェックヘルパー (checkout時用)
// campaignオブジェクトを渡すことで余分なDB呼び出しを省く
// --------------------------------------------------------
async function checkAffiliateCampaignAccess(affiliateId, campaignId, campaign) {
  try {
    if (!campaign) return false;
    if (campaign.status !== 'active') return false;

    // public: 全員OK
    if (!campaign.access_type || campaign.access_type === 'public') return true;

    // tag_based
    if (campaign.access_type === 'tag_based') {
      const requiredTags = campaign.required_affiliate_tags || [];
      if (requiredTags.length === 0) return true;

      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('tags')
        .eq('id', affiliateId)
        .single();

      if (!affiliate) return false;
      const affiliateTags = affiliate.tags || [];
      return requiredTags.every(tag => affiliateTags.includes(tag));
    }

    // approved_only / specific_affiliates
    if (campaign.access_type === 'approved_only' || campaign.access_type === 'specific_affiliates') {
      const { data: access } = await supabase
        .from('affiliate_campaign_access')
        .select('id, access_status')
        .eq('campaign_id', campaignId)
        .eq('affiliate_id', affiliateId)
        .eq('access_status', 'approved')
        .single();
      return !!access;
    }

    return false;
  } catch (error) {
    console.error('checkAffiliateCampaignAccess (checkout) error:', error);
    return false;
  }
}
