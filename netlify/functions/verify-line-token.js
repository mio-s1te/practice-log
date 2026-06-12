// netlify/functions/verify-line-token.js
// LINE IDトークン検証 & LINE登録者保存

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;

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
      id_token,
      access_token,
      affiliate_code,
      campaign_id,
      product_id,
      click_id,
      source,
    } = body;

    if (!id_token && !access_token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'id_token or access_token required' }),
      };
    }

    let lineUserId = null;
    let displayName = null;

    // IDトークン検証 (サーバー側で必ず検証)
    if (id_token) {
      try {
        const verifyResponse = await fetch('https://api.line.me/oauth2/v2.1/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            id_token,
            client_id: LINE_CHANNEL_ID,
          }),
        });

        if (!verifyResponse.ok) {
          throw new Error('LINE ID token verification failed');
        }

        const tokenData = await verifyResponse.json();
        lineUserId = tokenData.sub;
        displayName = tokenData.name;
      } catch (e) {
        console.error('ID token verify error:', e);
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Invalid LINE ID token' }),
        };
      }
    } else if (access_token) {
      // アクセストークンでプロフィール取得
      try {
        const profileResponse = await fetch('https://api.line.me/v2/profile', {
          headers: { Authorization: `Bearer ${access_token}` },
        });

        if (!profileResponse.ok) {
          throw new Error('LINE profile fetch failed');
        }

        const profile = await profileResponse.json();
        lineUserId = profile.userId;
        displayName = profile.displayName;
      } catch (e) {
        console.error('Access token verify error:', e);
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Invalid LINE access token' }),
        };
      }
    }

    if (!lineUserId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Could not verify LINE user' }),
      };
    }

    // アフィリエイト情報取得
    let affiliateId = null;
    if (affiliate_code) {
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id')
        .eq('affiliate_code', affiliate_code)
        .eq('status', 'active')
        .single();
      affiliateId = affiliate?.id || null;
    }

    // リードの作成または更新
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, first_source, first_campaign_id, first_affiliate_id')
      .eq('line_user_id', lineUserId)
      .single();

    let leadId;
    const now = new Date().toISOString();

    if (existingLead) {
      // 更新（current_display_nameとlatest情報のみ更新）
      const { data: updatedLead } = await supabase
        .from('leads')
        .update({
          current_display_name: displayName,
          latest_source: source || 'liff',
          latest_campaign_id: campaign_id || null,
          latest_affiliate_id: affiliateId,
          updated_at: now,
        })
        .eq('id', existingLead.id)
        .select()
        .single();
      leadId = updatedLead?.id || existingLead.id;
    } else {
      // 新規作成
      const { data: newLead } = await supabase
        .from('leads')
        .insert({
          line_user_id: lineUserId,
          display_name: displayName,
          current_display_name: displayName,
          first_source: source || 'liff',
          first_campaign_id: campaign_id || null,
          first_affiliate_id: affiliateId,
          latest_source: source || 'liff',
          latest_campaign_id: campaign_id || null,
          latest_affiliate_id: affiliateId,
          registered_at: now,
        })
        .select()
        .single();
      leadId = newLead?.id;
    }

    // アトリビューションイベント保存（LINE登録）
    // 注意: LINE userIdと紹介者を固定で紐づけない
    // 報酬判定は購入ごと、商品ごと、キャンペーンごとに行う
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('attribution_events').insert({
      lead_id: leadId,
      line_user_id: lineUserId,
      affiliate_id: affiliateId,
      affiliate_code,
      campaign_id: campaign_id || null,
      product_id: product_id || null,
      click_id: click_id || null,
      source: source || 'liff',
      medium: 'line',
      event_type: 'line_register',
      expires_at: expiresAt,
    });

    // デイリー統計更新（紹介者のLINE登録数）
    if (affiliateId) {
      const today = new Date().toISOString().split('T')[0];
      // RPC呼び出しでインクリメント（RPCが存在しない場合は直接INSERT/UPDATE）
      await supabase
        .from('affiliate_daily_stats')
        .select('id, line_registrations')
        .eq('affiliate_id', affiliateId)
        .eq('stat_date', today)
        .single()
        .then(async ({ data: stat }) => {
          if (stat) {
            await supabase
              .from('affiliate_daily_stats')
              .update({ line_registrations: (stat.line_registrations || 0) + 1 })
              .eq('id', stat.id);
          } else {
            await supabase.from('affiliate_daily_stats').insert({
              affiliate_id: affiliateId,
              stat_date: today,
              line_registrations: 1,
            });
          }
        });
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        lead_id: leadId,
        line_user_id: lineUserId,
        display_name: displayName,
      }),
    };
  } catch (error) {
    console.error('Verify LINE token error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
