// netlify/functions/stripe-webhook.js
// Stripe Webhook処理

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const { addDays, parseISO } = require('date-fns');

// ============================================================
// 購入コード生成
// スタート講座: start_XXXXXXXXXXXXXXXX
// 養成講座:     affi_grow_XXXXXXXXXXXXXXXX
// 用途: LINE凍結時のメール連絡・スプレッドシート台帳管理
// ============================================================
const AFFILIATE_COURSE_PRODUCT_ID = 'a0000000-0000-0000-0000-000000000003';
const TEST_PRODUCT_ID = 'prod_UiLVzdaB4s6Dnz';

function generatePurchaseCode(productId) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; // 紛らわしい文字(0,O,1,I,l)を除外
  let prefix;
  if (productId === AFFILIATE_COURSE_PRODUCT_ID) {
    prefix = 'affi_grow_';
  } else if (productId === TEST_PRODUCT_ID) {
    prefix = 'test_';
  } else {
    prefix = 'start_';
  }
  let code = prefix;
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================================
// GASへ購入者情報を送信（スプレッドシート記録用）
// 環境変数: GAS_PURCHASE_SYNC_URL, GAS_PURCHASE_SYNC_SECRET
// ============================================================
async function syncPurchaseToSpreadsheet(payload) {
  const gasUrl = process.env.GAS_PURCHASE_SYNC_URL;
  const gasSecret = process.env.GAS_PURCHASE_SYNC_SECRET;

  if (!gasUrl) {
    console.log('[purchase-sync] GAS_PURCHASE_SYNC_URL not set, skipping spreadsheet sync');
    return;
  }

  try {
    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(gasSecret ? { 'x-purchase-sync-secret': gasSecret } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      console.log('[purchase-sync] Spreadsheet sync succeeded');
    } else {
      const text = await res.text();
      console.error('[purchase-sync] Spreadsheet sync failed:', res.status, text);
    }
  } catch (e) {
    // スプシ同期の失敗は購入処理全体を止めない
    console.error('[purchase-sync] Spreadsheet sync error:', e.message);
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws } }
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const sig = event.headers['stripe-signature'];

  let stripeEvent;

  // テスト用・本番用シークレットを両方試みる
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_TEST,
  ].filter(Boolean);

  let lastError;
  for (const secret of secrets) {
    try {
      stripeEvent = stripe.webhooks.constructEvent(event.body, sig, secret);
      break; // 成功したらループを抜ける
    } catch (err) {
      lastError = err;
    }
  }

  if (!stripeEvent) {
    console.error('Webhook signature verification failed:', lastError?.message);
    return { statusCode: 400, body: `Webhook Error: ${lastError?.message}` };
  }

  // ============================================================
  // 重複処理防止（冪等性チェック）
  // 同じStripe Event IDが既に処理済みかどうかをSupabaseで確認
  // ============================================================
  const stripeEventId = stripeEvent.id;
  try {
    const { data: existingEvent } = await supabase
      .from('processed_stripe_events')
      .select('id')
      .eq('stripe_event_id', stripeEventId)
      .single();

    if (existingEvent) {
      console.log(`[stripe-webhook] Already processed event: ${stripeEventId} — skipping`);
      return { statusCode: 200, body: JSON.stringify({ received: true, skipped: true }) };
    }

    // 処理済みとして記録
    await supabase
      .from('processed_stripe_events')
      .insert({ stripe_event_id: stripeEventId, processed_at: new Date().toISOString() });
  } catch (e) {
    // テーブルが存在しない場合などはスキップして処理を続行
    console.warn('[stripe-webhook] processed_stripe_events check failed (skipping):', e.message);
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

  // Stripe Product IDを取得（line_itemsから）
  let stripeProductId = null;
  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
    stripeProductId = lineItems?.data?.[0]?.price?.product || null;
  } catch (e) {
    console.warn('[stripe-webhook] Failed to get line items:', e.message);
  }

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
  let accessVerified = true;      // デフォルト: 権限あり (直接購入など)
  let noAccessReason = null;

  if (affiliate_id && affiliate_id !== '' && campaign_id && campaign_id !== '') {
    // ── 紹介権限チェック ──────────────────────────────────────────
    const hasAccess = await checkAffiliateCampaignAccess(affiliate_id, campaign_id);
    if (!hasAccess) {
      accessVerified = false;
      noAccessReason = 'affiliate_campaign_access: no valid access';
      console.log(`[stripe-webhook] affiliate ${affiliate_id} has NO access to campaign ${campaign_id}. Commission set to 0.`);
    } else {
      // 紹介権限あり → 通常の報酬計算
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
  } else if (!affiliate_id || affiliate_id === '') {
    // 直接購入: access_verified=true のまま
    accessVerified = true;
  }

  // 購入コード生成（講座によってプレフィックスが変わる）
  const purchaseCode = generatePurchaseCode(product_id || stripeProductId);

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
      access_verified: accessVerified,
      no_access_reason: noAccessReason,
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent,
      purchase_code: purchaseCode,
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

  // 価格tier切り替えチェック (購入完了後に実行)
  if (product_id) {
    await checkAndSwitchPriceTier(product_id, purchase.id);
  }

  // ============================================================
  // 既存アフィリエイターが新しい講座を購入した場合、
  // product_affiliate_permissions に自動付与
  // （affiliate_enabled = true の商品のみ対象）
  // ============================================================
  if (buyerEmail && product_id) {
    try {
      // 購入した商品がアフィリエイト対象か確認
      const { data: boughtProduct } = await supabase
        .from('products')
        .select('id, name, affiliate_enabled')
        .eq('id', product_id)
        .eq('affiliate_enabled', true)
        .single();

      if (boughtProduct) {
        // 購入者がアフィリエイター登録済みか確認
        const { data: existingAffiliate } = await supabase
          .from('affiliates')
          .select('id')
          .eq('email', buyerEmail)
          .eq('status', 'active')
          .single();

        if (existingAffiliate) {
          // 権限を自動付与（既に存在する場合はupsertで上書き）
          await supabase
            .from('product_affiliate_permissions')
            .upsert({
              product_id,
              affiliate_id: existingAffiliate.id,
              access_level: 'requires_purchase',
              is_explicitly_granted: true,
              granted_by: 'auto_purchase',
              granted_at: new Date().toISOString(),
              revoked_at: null,
              notes: `${boughtProduct.name}購入による自動権限付与`,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'product_id,affiliate_id' });

          console.log(`[stripe-webhook] auto-granted affiliate permission: affiliate=${existingAffiliate.id}, product=${product_id}`);
        }
      }
    } catch (e) {
      // 権限付与失敗は購入処理全体を止めない
      console.error('[stripe-webhook] auto-grant permission error:', e);
    }
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

  console.log(`Purchase completed: ${purchase.id}, commission: ${commissionAmount}, purchase_code: ${purchaseCode}`);

  // ============================================================
  // 購入完了メール送信
  // 購入者のメールアドレスに購入コード・合言葉・LINE URLを送る
  // ============================================================
  if (buyerEmail) {
    try {
      await sendPurchaseCompletedEmail({
        to: buyerEmail,
        productId: product_id,
        stripeProductId: stripeProductId,
        productName: product_name || productData?.name || '',
        purchaseCode: purchaseCode,
        amountTotal: amountTotal,
      });
    } catch (e) {
      // メール送信失敗は購入処理全体を止めない
      console.error('[stripe-webhook] sendPurchaseCompletedEmail error:', e);
    }
  }

  // ============================================================
  // Googleスプレッドシートへ購入者情報を同期
  // メール ↔ LINE 紐付け台帳として記録
  // LINE凍結時のメール連絡・アフィリ権限確認に利用
  // ============================================================
  await syncPurchaseToSpreadsheet({
    // 識別情報
    purchase_code:          purchaseCode,
    purchase_id:            purchase.id,
    // メール（LINE凍結時の連絡先）
    buyer_email:            buyerEmail || '',
    // LINE情報
    line_user_id:           line_user_id || '',
    line_display_name:      buyerDisplayName || '',
    // 商品情報
    product_id:             product_id || '',
    product_name:           product_name || productData?.name || '',
    // 金額
    amount_total:           amountTotal,
    // 紹介者情報
    affiliate_code:         affiliate_code || '',
    affiliate_name:         affiliate_name || affiliateDisplayName || '',
    // 日時
    purchased_at:           new Date().toISOString(),
    // アフィリエイト権限（この購入で自動付与されたか）
    affiliate_permission_granted: !!(buyerEmail && product_id),
  });
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

// ============================================================
// 価格tier切り替えチェック
// 購入完了後に呼び出し、販売数が次のtierの閾値に達していれば
// 価格を切り替え、管理者・全紹介者へアプリ内通知を送る
// ============================================================
async function checkAndSwitchPriceTier(productId, purchaseId) {
  try {
    // 商品の全 price_tiers を取得 (active のみ、昇順)
    const { data: tiers } = await supabase
      .from('price_tiers')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('min_valid_sales_count', { ascending: true });

    if (!tiers || tiers.length <= 1) return; // 1段階しかない場合は何もしない

    // 現在の有効累計販売数 (status='completed' のみ)
    const { count: salesCount } = await supabase
      .from('purchases')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('status', 'completed');

    const validSales = salesCount || 0;

    // 現在適用すべき tier を判定
    const matchingTiers = tiers.filter(
      (t) =>
        t.min_valid_sales_count <= validSales &&
        (t.max_valid_sales_count === null || t.max_valid_sales_count >= validSales)
    );

    if (matchingTiers.length === 0) return;

    const newTier = matchingTiers.reduce((prev, curr) =>
      curr.min_valid_sales_count > prev.min_valid_sales_count ? curr : prev
    );

    // 商品の現在価格を確認
    const { data: product } = await supabase
      .from('products')
      .select('id, name, price, stripe_price_id')
      .eq('id', productId)
      .single();

    if (!product) return;

    // 価格が変わっていない場合は何もしない
    if (product.price === newTier.price) return;

    // ======================================================
    // 価格切り替え: products テーブルを更新
    // ======================================================
    const oldPrice = product.price;
    const oldStripePriceId = product.stripe_price_id || null;
    const newPrice = newTier.price;
    const newStripePriceId = newTier.stripe_price_id || null;

    await supabase
      .from('products')
      .update({
        price: newPrice,
        stripe_price_id: newStripePriceId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    // ======================================================
    // price_change_history に履歴保存
    // ======================================================
    await supabase.from('price_change_history').insert({
      product_id: productId,
      old_price: oldPrice,
      new_price: newPrice,
      old_stripe_price_id: oldStripePriceId,
      new_stripe_price_id: newStripePriceId,
      trigger_type: 'sales_count',
      trigger_sales_count: validSales,
      changed_by: 'system',
      memo: `${newTier.tier_name}へ自動切り替え (${validSales}部到達)`,
    });

    // ======================================================
    // 通知メッセージ生成
    // ======================================================
    const priceChangeTitle = `${product.name}の価格が変更されました`;
    const priceChangeBody = `${product.name}が${validSales.toLocaleString()}部を突破したため、価格が${oldPrice.toLocaleString()}円から${newPrice.toLocaleString()}円に切り替わりました。`;

    // 管理者通知
    await supabase.from('notifications').insert({
      recipient_type: 'admin',
      recipient_id: 'admin',
      type: 'price_tier_changed',
      title: priceChangeTitle,
      body: priceChangeBody,
      related_type: 'product',
      related_id: productId,
    });

    // 全紹介者への通知
    // active な全紹介者を取得して通知
    const { data: allAffiliates } = await supabase
      .from('affiliates')
      .select('id')
      .eq('status', 'active');

    if (allAffiliates && allAffiliates.length > 0) {
      const affiliateNotifications = allAffiliates.map((aff) => ({
        recipient_type: 'affiliate',
        recipient_id: aff.id,
        type: 'price_tier_changed',
        title: priceChangeTitle,
        body: priceChangeBody,
        related_type: 'product',
        related_id: productId,
      }));

      // バルクインサート (50件ずつ分割)
      const chunkSize = 50;
      for (let i = 0; i < affiliateNotifications.length; i += chunkSize) {
        const chunk = affiliateNotifications.slice(i, i + chunkSize);
        await supabase.from('notifications').insert(chunk);
      }
    }

    console.log(
      `Price tier switched: product=${productId}, ${oldPrice}円→${newPrice}円, sales=${validSales}`
    );
  } catch (error) {
    console.error('checkAndSwitchPriceTier error:', error);
    // 価格切り替えエラーは購入処理全体を失敗させない
  }
}

// ============================================================
// 紹介権限チェック
// affiliate_id + campaign_id の組み合わせが有効かチェックする
// check_affiliate_campaign_access() PostgreSQL関数を呼び出す
// ============================================================
async function checkAffiliateCampaignAccess(affiliateId, campaignId) {
  try {
    // まずキャンペーンの access_type を確認
    const { data: campaign } = await supabase
      .from('affiliate_campaigns')
      .select('id, access_type, required_affiliate_tags, status')
      .eq('id', campaignId)
      .single();

    if (!campaign) {
      console.log(`[checkAffiliateCampaignAccess] campaign ${campaignId} not found`);
      return false;
    }

    if (campaign.status !== 'active') {
      console.log(`[checkAffiliateCampaignAccess] campaign ${campaignId} is not active`);
      return false;
    }

    // public: 全員OK
    if (campaign.access_type === 'public') {
      return true;
    }

    // tag_based: required_affiliate_tags を紹介者が持っているか確認
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
      const hasAllTags = requiredTags.every(tag => affiliateTags.includes(tag));
      if (!hasAllTags) {
        console.log(`[checkAffiliateCampaignAccess] affiliate ${affiliateId} missing required tags. Required: ${requiredTags.join(', ')}, Has: ${affiliateTags.join(', ')}`);
      }
      return hasAllTags;
    }

    // approved_only / specific_affiliates: affiliate_campaign_access テーブルを確認
    if (campaign.access_type === 'approved_only' || campaign.access_type === 'specific_affiliates') {
      const { data: access } = await supabase
        .from('affiliate_campaign_access')
        .select('id, access_status')
        .eq('campaign_id', campaignId)
        .eq('affiliate_id', affiliateId)
        .eq('access_status', 'approved')
        .single();

      if (!access) {
        console.log(`[checkAffiliateCampaignAccess] affiliate ${affiliateId} not approved for campaign ${campaignId}`);
      }
      return !!access;
    }

    // 不明な access_type はデフォルトで拒否
    return false;
  } catch (error) {
    console.error('checkAffiliateCampaignAccess error:', error);
    // エラー時は安全側に倒して false を返す
    return false;
  }
}

// ============================================================
// 購入完了メール送信
// 購入した講座に応じた合言葉・LINE URLを含むメールを送る
// ============================================================

// 講座別の設定
const COURSE_LINE_URL = 'https://lin.ee/yh1BNGJ';

const COURSE_CONFIG = {
  'a0000000-0000-0000-0000-000000000001': {
    keyword: '1時間化スタート',
    label:   'AI副業1時間化スタート講座',
  },
  'a0000000-0000-0000-0000-000000000003': {
    keyword: '本気でプロアフィリエイター',
    label:   'プロAIアフィリエイター養成講座',
  },
  // テスト用商品
  'prod_UiLVzdaB4s6Dnz': {
    keyword: 'テスト',
    label:   'テスト',
  },
};

async function sendPurchaseCompletedEmail({ to, productId, stripeProductId, productName, purchaseCode, amountTotal }) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL    = process.env.FROM_EMAIL || 'noreply@mio-ai.com';

  if (!RESEND_API_KEY) {
    console.log(`[sendPurchaseCompletedEmail] RESEND_API_KEY not set. Skip sending to: ${to}`);
    return;
  }

  // Supabase product_id → Stripe product_id の順で設定を検索
  const config  = COURSE_CONFIG[productId] || COURSE_CONFIG[stripeProductId];
  const keyword = config?.keyword  || '—';
  const label   = config?.label    || productName || '講座';

  const subject = `【購入完了】${label} — ご購入ありがとうございます`;

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#fffaf5;font-family:'Hiragino Sans','Noto Sans JP',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffaf5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- ヘッダー -->
          <tr>
            <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 32px 24px;text-align:center;">
              <p style="margin:0 0 8px;color:#fff3e0;font-size:13px;letter-spacing:1px;">PURCHASE COMPLETE</p>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:900;line-height:1.4;">
                ご購入ありがとうございます！🎉
              </h1>
              <p style="margin:8px 0 0;color:#fed7aa;font-size:14px;">${label}</p>
            </td>
          </tr>

          <!-- 本文 -->
          <tr>
            <td style="padding:32px;">

              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.8;">
                この度は <strong>${label}</strong> をご購入いただき、本当にありがとうございます！<br>
                一緒に頑張っていきましょう。応援しています！
              </p>

              <!-- 購入コード -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 6px;font-size:12px;color:#9a3412;font-weight:700;letter-spacing:1px;">🔑 購入コード</p>
                    <p style="margin:0;font-size:22px;font-weight:900;color:#ea580c;letter-spacing:2px;font-family:monospace;">${purchaseCode}</p>
                    <p style="margin:6px 0 0;font-size:12px;color:#92400e;">このコードは購入確認に使用します。大切に保管してください。</p>
                  </td>
                </tr>
              </table>

              <!-- 講座受け取り手順 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#166534;">📚 講座の受け取り方</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;height:28px;background:#22c55e;border-radius:50%;text-align:center;vertical-align:middle;">
                                <span style="color:#fff;font-size:13px;font-weight:900;">1</span>
                              </td>
                              <td style="padding-left:12px;font-size:14px;color:#374151;">下記の公式LINEを友だち追加</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;height:28px;background:#22c55e;border-radius:50%;text-align:center;vertical-align:middle;">
                                <span style="color:#fff;font-size:13px;font-weight:900;">2</span>
                              </td>
                              <td style="padding-left:12px;font-size:14px;color:#374151;">
                                合言葉と購入コードを送ってください：<br>
                                <strong style="color:#15803d;font-size:15px;">「${keyword}」＋ 購入コード</strong>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;height:28px;background:#22c55e;border-radius:50%;text-align:center;vertical-align:middle;">
                                <span style="color:#fff;font-size:13px;font-weight:900;">3</span>
                              </td>
                              <td style="padding-left:12px;font-size:14px;color:#374151;">購入確認後に講座URLをお届けします</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- LINE ボタン -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${COURSE_LINE_URL}"
                      style="display:inline-block;background:#06c755;color:#ffffff;font-size:16px;font-weight:900;text-decoration:none;padding:16px 48px;border-radius:50px;letter-spacing:0.5px;">
                      📲 公式LINEを友だち追加する
                    </a>
                  </td>
                </tr>

              </table>

              <!-- 注意書き -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;">購入金額: ¥${amountTotal.toLocaleString()}（税込）</p>
                    <p style="margin:0;font-size:12px;color:#6b7280;">このメールに心当たりがない場合はお問い合わせください。</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- フッター -->
          <tr>
            <td style="background:#1f2937;padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 みお ｜ AI副業サポート</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `
【購入完了】${label}

この度はご購入いただきありがとうございます！
一緒に頑張っていきましょう。応援しています！

■ 購入コード
${purchaseCode}

■ 講座の受け取り方
1. 公式LINEを友だち追加してください
   ${COURSE_LINE_URL}

2. 合言葉「${keyword}」＋ 購入コードを送ってください

3. 購入確認後に講座URLをお届けします

購入金額: ¥${amountTotal.toLocaleString()}（税込）

© 2026 みお
`.trim();

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html, text }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`[sendPurchaseCompletedEmail] Resend error ${res.status}:`, err);
    } else {
      const data = await res.json();
      console.log(`[sendPurchaseCompletedEmail] Sent to ${to}, id: ${data.id}`);
    }
  } catch (e) {
    console.error('[sendPurchaseCompletedEmail] fetch error:', e);
  }
}
