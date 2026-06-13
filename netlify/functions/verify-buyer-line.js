// netlify/functions/verify-buyer-line.js
// 購入者LINE LIFF用: IDトークン検証 + 購入者確認 + リード紐づけ
//
// 購入完了ページ（PurchaseComplete）から呼び出す
// Stripe session_id + LINE IDトークンを受け取り、
// 購入を確認した上でleadsテーブルに購入者LINE情報を紐づける

const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws } }
);

// 購入者LINE の LIFF チャンネルID
const BUYER_LINE_CHANNEL_ID = process.env.LINE_BUYER_CHANNEL_ID;

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      id_token,          // 購入者LINE LIFFのIDトークン
      access_token,      // 購入者LINE LIFFのアクセストークン
      stripe_session_id, // Stripeの決済セッションID (購入完了ページから渡す)
      lead_id,           // セミナーLINEで取得済みのlead_id
      buyer_email,       // 手動入力のメールアドレス（オプション）
    } = body;

    if (!id_token && !access_token) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'id_token or access_token required' }),
      };
    }

    // ----------------------------------------
    // 購入者LINE IDトークン / アクセストークン検証
    // ----------------------------------------
    let buyerLineUserId = null;
    let buyerDisplayName = null;

    if (id_token) {
      const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          id_token,
          client_id: BUYER_LINE_CHANNEL_ID,
        }),
      });

      if (!verifyRes.ok) {
        return {
          statusCode: 401,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Invalid buyer LINE ID token' }),
        };
      }

      const tokenData = await verifyRes.json();
      buyerLineUserId = tokenData.sub;
      buyerDisplayName = tokenData.name;
    } else if (access_token) {
      const profileRes = await fetch('https://api.line.me/v2/profile', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (!profileRes.ok) {
        return {
          statusCode: 401,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Invalid buyer LINE access token' }),
        };
      }

      const profile = await profileRes.json();
      buyerLineUserId = profile.userId;
      buyerDisplayName = profile.displayName;
    }

    if (!buyerLineUserId) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Could not get buyer LINE user ID' }),
      };
    }

    // ----------------------------------------
    // すでに購入者LINEが紐づいている場合はそのまま返す
    // ----------------------------------------
    const { data: alreadyLinked } = await supabase
      .from('leads')
      .select('id, buyer_line_user_id')
      .eq('buyer_line_user_id', buyerLineUserId)
      .single();

    if (alreadyLinked) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          already_linked: true,
          lead_id: alreadyLinked.id,
          buyer_line_user_id: buyerLineUserId,
          buyer_display_name: buyerDisplayName,
          message: 'すでに紐づき済みです',
        }),
      };
    }

    // ----------------------------------------
    // 購入者確認 (優先順位: stripe_session_id > lead_id > buyer_email)
    // ----------------------------------------
    let foundLeadId = null;
    let foundPurchaseId = null;
    let verifiedBy = null;
    let verifiedValue = null;

    // 1. Stripe Session IDで確認
    if (stripe_session_id) {
      const { data: session } = await supabase
        .from('checkout_sessions')
        .select('id, lead_id, status')
        .eq('stripe_session_id', stripe_session_id)
        .eq('status', 'completed')
        .single();

      if (session?.lead_id) {
        foundLeadId = session.lead_id;
        verifiedBy = 'stripe_session_id';
        verifiedValue = stripe_session_id;
      }

      // checkout_sessionsにlead_idがない場合はpurchasesを検索
      if (!foundLeadId) {
        const { data: purchase } = await supabase
          .from('purchases')
          .select('id, lead_id')
          .eq('stripe_session_id', stripe_session_id)
          .eq('status', 'completed')
          .single();

        if (purchase) {
          foundLeadId = purchase.lead_id;
          foundPurchaseId = purchase.id;
          verifiedBy = 'stripe_session_id';
          verifiedValue = stripe_session_id;
        }
      }
    }

    // 2. lead_id が渡されている場合 (セミナーLINEで取得済み)
    if (!foundLeadId && lead_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('id, purchase_count')
        .eq('id', lead_id)
        .gt('purchase_count', 0)
        .single();

      if (lead) {
        foundLeadId = lead.id;
        verifiedBy = 'lead_id';
        verifiedValue = lead_id;
      }
    }

    // 3. メールアドレスで確認
    if (!foundLeadId && buyer_email) {
      const { data: purchase } = await supabase
        .from('purchases')
        .select('id, lead_id, buyer_email')
        .ilike('buyer_email', buyer_email.trim())
        .eq('status', 'completed')
        .order('purchased_at', { ascending: false })
        .limit(1)
        .single();

      if (purchase) {
        foundLeadId = purchase.lead_id;
        foundPurchaseId = purchase.id;
        verifiedBy = 'email';
        verifiedValue = buyer_email;
      }
    }

    if (!foundLeadId) {
      // 購入確認取れず
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          verified: false,
          buyer_line_user_id: buyerLineUserId,
          message: '購入確認が取れませんでした。決済時のメールアドレスを入力してください。',
        }),
      };
    }

    // ----------------------------------------
    // 購入者LINE情報をleadsテーブルに紐づけ
    // ----------------------------------------
    await supabase
      .from('leads')
      .update({
        buyer_line_user_id: buyerLineUserId,
        buyer_line_display_name: buyerDisplayName,
        buyer_line_registered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', foundLeadId);

    // 確認記録
    await supabase.from('buyer_line_verifications').insert({
      lead_id: foundLeadId,
      buyer_line_user_id: buyerLineUserId,
      buyer_line_display_name: buyerDisplayName,
      verified_by: verifiedBy,
      verified_value: verifiedValue,
      purchase_id: foundPurchaseId,
      status: 'verified',
    });

    // 管理者通知
    await supabase.from('notifications').insert({
      recipient_type: 'admin',
      recipient_id: 'admin',
      type: 'buyer_line_registered',
      title: '購入者LINEに新規登録がありました',
      body: `${buyerDisplayName}さんが購入者専用LINEに登録しました。`,
      related_type: 'lead',
      related_id: foundLeadId,
    });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        verified: true,
        lead_id: foundLeadId,
        buyer_line_user_id: buyerLineUserId,
        buyer_display_name: buyerDisplayName,
        verified_by: verifiedBy,
        message: '購入を確認し、購入者LINEに登録しました。',
      }),
    };
  } catch (error) {
    console.error('verify-buyer-line error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
};
