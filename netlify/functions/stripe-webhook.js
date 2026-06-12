// netlify/functions/stripe-webhook.js
// Stripe Webhook処理

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { addDays, parseISO } = require('date-fns');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const sig = event.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      endpointSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripeEvent.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(stripeEvent.data.object);
        break;

      case 'charge.refunded':
        await handleRefund(stripeEvent.data.object);
        break;

      case 'charge.dispute.created':
        await handleChargeback(stripeEvent.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (error) {
    console.error('Webhook processing error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Processing failed' }) };
  }
};

async function handleCheckoutCompleted(session) {
  const metadata = session.metadata || {};
  const {
    product_id,
    line_user_id,
    affiliate_id,
    affiliate_code,
    campaign_id,
    lead_id,
    click_id,
    attribution_event_id,
    product_name,
    campaign_name,
    affiliate_name,
  } = metadata;

  const amountTotal = session.amount_total || 0;

  // checkout_sessions更新
  await supabase
    .from('checkout_sessions')
    .update({ status: 'completed' })
    .eq('stripe_session_id', session.id);

  // 商品情報取得
  let productData = null;
  if (product_id) {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .single();
    productData = data;
  }

  // リード取得/更新
  let leadId = lead_id || null;
  const buyerEmail = session.customer_details?.email;
  
  if (line_user_id) {
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('line_user_id', line_user_id)
      .single();

    if (existingLead) {
      leadId = existingLead.id;
    } else if (!leadId) {
      const { data: newLead } = await supabase
        .from('leads')
        .insert({
          line_user_id,
          email: buyerEmail,
          registered_at: new Date().toISOString(),
        })
        .select()
        .single();
      leadId = newLead?.id;
    }
  }

  // リードの購入情報更新
  if (leadId) {
    const { data: currentLead } = await supabase
      .from('leads')
      .select('total_purchase_amount, purchase_count')
      .eq('id', leadId)
      .single();

    await supabase
      .from('leads')
      .update({
        purchased_at: new Date().toISOString(),
        email: buyerEmail || undefined,
        total_purchase_amount: (currentLead?.total_purchase_amount || 0) + amountTotal,
        purchase_count: (currentLead?.purchase_count || 0) + 1,
      })
      .eq('id', leadId);
  }

  // 購入経路判定
  let purchaseSource = 'organic';
  if (affiliate_id && affiliate_id !== '') {
    purchaseSource = 'affiliate';
  } else if (metadata.source === 'official_line') {
    purchaseSource = 'official_line';
  }

  // LINE表示名取得
  let buyerDisplayName = null;
  if (line_user_id) {
    const { data: lead } = await supabase
      .from('leads')
      .select('current_display_name')
      .eq('line_user_id', line_user_id)
      .single();
    buyerDisplayName = lead?.current_display_name;
  }

  // 紹介者情報取得
  let affiliateDisplayName = null;
  if (affiliate_id) {
    const { data: aff } = await supabase
      .from('affiliates')
      .select('line_display_name')
      .eq('id', affiliate_id)
      .single();
    affiliateDisplayName = aff?.line_display_name;
  }

  // 報酬計算
  let commissionAmount = 0;
  let shouldPayCommission = false;

  if (affiliate_id && affiliate_id !== '' && campaign_id && campaign_id !== '') {
    // キャンペーン情報取得
    const { data: campaign } = await supabase
      .from('affiliate_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaign && campaign.status === 'active') {
      // アトリビューション有効期限チェック
      if (attribution_event_id && attribution_event_id !== '') {
        const { data: attrEvent } = await supabase
          .from('attribution_events')
          .select('expires_at')
          .eq('id', attribution_event_id)
          .single();

        if (attrEvent && new Date(attrEvent.expires_at) > new Date()) {
          shouldPayCommission = true;
        }
      } else {
        // attribution_event_idがない場合でも、click_idがあれば有効とみなす
        if (click_id && click_id !== '') {
          shouldPayCommission = true;
        }
      }

      if (shouldPayCommission) {
        if (campaign.commission_type === 'fixed') {
          commissionAmount = campaign.commission_amount;
        } else if (campaign.commission_type === 'percent') {
          commissionAmount = Math.floor(amountTotal * campaign.commission_amount / 100);
        }
      }
    }
  }

  // purchasesテーブルに保存
  const { data: purchase, error: purchaseError } = await supabase
    .from('purchases')
    .insert({
      lead_id: leadId,
      line_user_id: line_user_id || null,
      buyer_line_user_id: line_user_id || null,
      buyer_line_display_name: buyerDisplayName,
      buyer_email: buyerEmail,
      product_id: product_id || null,
      product_name: product_name || productData?.name || 'Unknown',
      campaign_id: campaign_id || null,
      campaign_name: campaign_name || null,
      attribution_event_id: attribution_event_id || null,
      affiliate_id: affiliate_id || null,
      affiliate_name: affiliate_name || null,
      affiliate_code: affiliate_code || null,
      affiliate_line_display_name: affiliateDisplayName,
      purchase_source: purchaseSource,
      amount_total: amountTotal,
      commission_amount: commissionAmount,
      commission_status: shouldPayCommission ? 'pending' : 'cancelled',
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent,
      status: 'completed',
      purchased_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (purchaseError) {
    console.error('Purchase insert error:', purchaseError);
    throw purchaseError;
  }

  // product_accessesテーブルに保存
  if (product_id && productData) {
    let accessEndAt = null;

    if (productData.access_type === 'days_after_purchase' && productData.access_days) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + productData.access_days);
      accessEndAt = endDate.toISOString();
    } else if (productData.access_type === 'fixed_end_date' && productData.access_fixed_end_at) {
      accessEndAt = productData.access_fixed_end_at;
    }
    // lifetime の場合は null

    const supportEndAt = productData.support_days
      ? new Date(Date.now() + productData.support_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const bonusEndAt = productData.bonus_claim_days
      ? new Date(Date.now() + productData.bonus_claim_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    await supabase.from('product_accesses').insert({
      purchase_id: purchase.id,
      lead_id: leadId,
      user_email: buyerEmail,
      line_user_id: line_user_id || null,
      product_id,
      access_start_at: new Date().toISOString(),
      access_end_at: accessEndAt,
      access_status: 'active',
      support_start_at: new Date().toISOString(),
      support_end_at: supportEndAt,
      bonus_claim_end_at: bonusEndAt,
    });
  }

  // 報酬レコード作成
  if (shouldPayCommission && commissionAmount > 0 && affiliate_id) {
    const { data: commission } = await supabase
      .from('commissions')
      .insert({
        purchase_id: purchase.id,
        affiliate_id,
        campaign_id: campaign_id || null,
        amount: commissionAmount,
        status: 'pending',
      })
      .select()
      .single();

    // 紹介者に報酬発生通知
    await supabase.from('notifications').insert({
      recipient_type: 'affiliate',
      recipient_id: affiliate_id,
      type: 'commission_earned',
      title: '報酬が発生しました',
      body: `${product_name || '商品'}の購入で${commissionAmount.toLocaleString()}円の報酬が発生しました。`,
      related_type: 'commission',
      related_id: commission?.id,
    });
  }

  // 自動停止チェック
  if (campaign_id) {
    await checkAndAutoStopCampaign(campaign_id);
  }

  // デイリー統計更新
  if (affiliate_id && affiliate_id !== '') {
    const today = new Date().toISOString().split('T')[0];
    const { data: stat } = await supabase
      .from('affiliate_daily_stats')
      .select('id, purchases, revenue, commission')
      .eq('affiliate_id', affiliate_id)
      .eq('stat_date', today)
      .single();

    if (stat) {
      await supabase
        .from('affiliate_daily_stats')
        .update({
          purchases: (stat.purchases || 0) + 1,
          revenue: (stat.revenue || 0) + amountTotal,
          commission: (stat.commission || 0) + commissionAmount,
        })
        .eq('id', stat.id);
    } else {
      await supabase.from('affiliate_daily_stats').insert({
        affiliate_id,
        stat_date: today,
        purchases: 1,
        revenue: amountTotal,
        commission: commissionAmount,
      });
    }
  }

  // 管理者通知
  await supabase.from('notifications').insert({
    recipient_type: 'admin',
    recipient_id: 'admin',
    type: 'new_purchase',
    title: '新規購入',
    body: `${buyerDisplayName || buyerEmail || '不明'}が${product_name || '商品'}を購入しました。（${amountTotal.toLocaleString()}円）`,
    related_type: 'purchase',
    related_id: purchase.id,
  });

  console.log(`Purchase completed: ${purchase.id}, commission: ${commissionAmount}`);
}

async function handlePaymentFailed(paymentIntent) {
  // 決済失敗処理
  console.log('Payment failed:', paymentIntent.id);
}

async function handleRefund(charge) {
  // 返金処理
  const paymentIntentId = charge.payment_intent;
  
  const { data: purchase } = await supabase
    .from('purchases')
    .select('id, affiliate_id, commission_amount')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single();

  if (purchase) {
    await supabase
      .from('purchases')
      .update({ status: 'refunded', refunded_at: new Date().toISOString() })
      .eq('id', purchase.id);

    // 報酬をcancelledに変更
    await supabase
      .from('commissions')
      .update({ status: 'cancelled' })
      .eq('purchase_id', purchase.id)
      .in('status', ['pending', 'approved', 'payable']);

    // 不正チェック: 返金率計算 (5件以上で20%以上)
    if (purchase.affiliate_id) {
      const { count: totalPurchases } = await supabase
        .from('purchases')
        .select('id', { count: 'exact', head: true })
        .eq('affiliate_id', purchase.affiliate_id);

      const { count: refundCount } = await supabase
        .from('purchases')
        .select('id', { count: 'exact', head: true })
        .eq('affiliate_id', purchase.affiliate_id)
        .eq('status', 'refunded');

      if ((totalPurchases || 0) >= 5 && (refundCount || 0) / (totalPurchases || 1) > 0.2) {
        await supabase.from('suspicious_events').insert({
          event_type: 'high_refund_rate',
          description: `返金率が異常に高い: ${refundCount}/${totalPurchases}件`,
          affiliate_id: purchase.affiliate_id,
          severity: 'high',
        });
      }
    }
  }
}

async function handleChargeback(charge) {
  // チャージバック処理
  const paymentIntentId = charge.payment_intent;
  
  const { data: purchase } = await supabase
    .from('purchases')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single();

  if (purchase) {
    await supabase
      .from('purchases')
      .update({ status: 'chargeback', chargeback_at: new Date().toISOString() })
      .eq('id', purchase.id);

    await supabase
      .from('commissions')
      .update({ status: 'chargeback' })
      .eq('purchase_id', purchase.id);
  }
}

async function checkAndAutoStopCampaign(campaignId) {
  try {
    const { data: campaign } = await supabase
      .from('affiliate_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (!campaign || !campaign.auto_stop_enabled || !campaign.sales_limit) return;
    if (campaign.status !== 'active') return;

    // 有効販売数計算
    let validSales = 0;
    
    if (campaign.sales_count_type === 'total_product_sales') {
      const { count } = await supabase
        .from('purchases')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', campaign.product_id)
        .eq('status', 'completed');
      validSales = count || 0;
    } else if (campaign.sales_count_type === 'affiliate_sales_only') {
      const { count } = await supabase
        .from('purchases')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('purchase_source', 'affiliate')
        .eq('status', 'completed');
      validSales = count || 0;
    } else {
      const { count } = await supabase
        .from('purchases')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('status', 'completed');
      validSales = count || 0;
    }

    if (validSales >= campaign.sales_limit) {
      // 自動停止
      await supabase
        .from('affiliate_campaigns')
        .update({
          status: 'ended',
          stop_reason: `販売上限(${campaign.sales_limit}部)に到達しました。(${validSales}部)`,
          current_sales: validSales,
        })
        .eq('id', campaignId);

      // 管理者通知
      await supabase.from('notifications').insert({
        recipient_type: 'admin',
        recipient_id: 'admin',
        type: 'campaign_auto_stopped',
        title: 'アフィリエイト案件が自動停止されました',
        body: `${campaign.name} が${campaign.sales_limit}部到達により自動停止されました。`,
        related_type: 'campaign',
        related_id: campaignId,
      });

      // 参加紹介者全員にお知らせ
      const { data: campaignAffiliates } = await supabase
        .from('campaign_affiliates')
        .select('affiliate_id')
        .eq('campaign_id', campaignId)
        .eq('status', 'active');

      if (campaignAffiliates && campaignAffiliates.length > 0) {
        const notifInserts = campaignAffiliates.map(ca => ({
          recipient_type: 'affiliate',
          recipient_id: ca.affiliate_id,
          type: 'campaign_ended',
          title: '案件が終了しました',
          body: `${campaign.name} は販売上限に達したため終了しました。`,
          related_type: 'campaign',
          related_id: campaignId,
        }));

        await supabase.from('notifications').insert(notifInserts);
      }
    } else {
      // 現在の販売数を更新
      await supabase
        .from('affiliate_campaigns')
        .update({ current_sales: validSales })
        .eq('id', campaignId);

      // 残り10%以下の通知
      if (campaign.sales_limit && validSales >= campaign.sales_limit * 0.9) {
        const remaining = campaign.sales_limit - validSales;
        await supabase.from('notifications').insert({
          recipient_type: 'admin',
          recipient_id: 'admin',
          type: 'campaign_low_remaining',
          title: '案件の残り枠が少なくなっています',
          body: `${campaign.name}: 残り${remaining}枠 (上限${campaign.sales_limit}枠)`,
          related_type: 'campaign',
          related_id: campaignId,
        });
      }
    }
  } catch (error) {
    console.error('Auto stop check error:', error);
  }
}
