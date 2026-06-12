// netlify/functions/record-seminar-view.js
// セミナー視聴記録API

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
      line_user_id,
      display_name,
      affiliate_id,
      affiliate_code,
      campaign_id,
      product_id,
      click_id,
      source,
    } = body;

    if (!line_user_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'line_user_id required' }),
      };
    }

    // リード取得
    const { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('line_user_id', line_user_id)
      .single();

    const now = new Date().toISOString();

    // セミナー視聴記録 (upsert: 同じline_user_idが存在する場合は更新)
    await supabase.from('seminar_views').upsert({
      lead_id: lead?.id || null,
      line_user_id,
      display_name,
      affiliate_id: affiliate_id || null,
      affiliate_code,
      campaign_id: campaign_id || null,
      product_id: product_id || null,
      click_id: click_id || null,
      source,
      user_agent: event.headers['user-agent'] || '',
      seminar_viewed_at: now,
      updated_at: now,
    }, { onConflict: 'line_user_id' });

    // leadsのseminar_viewed_at更新
    if (lead?.id) {
      await supabase
        .from('leads')
        .update({ seminar_viewed_at: now })
        .eq('id', lead.id);
    }

    // アトリビューションイベント保存（セミナー視聴）
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('attribution_events').insert({
      lead_id: lead?.id || null,
      line_user_id,
      affiliate_id: affiliate_id || null,
      affiliate_code,
      campaign_id: campaign_id || null,
      product_id: product_id || null,
      click_id: click_id || null,
      source,
      medium: 'liff',
      event_type: 'seminar_view',
      expires_at: expiresAt,
    });

    // デイリー統計更新
    if (affiliate_id) {
      const today = new Date().toISOString().split('T')[0];
      const { data: stat } = await supabase
        .from('affiliate_daily_stats')
        .select('id, seminar_views')
        .eq('affiliate_id', affiliate_id)
        .eq('stat_date', today)
        .single();

      if (stat) {
        await supabase
          .from('affiliate_daily_stats')
          .update({ seminar_views: (stat.seminar_views || 0) + 1 })
          .eq('id', stat.id);
      } else {
        await supabase.from('affiliate_daily_stats').insert({
          affiliate_id,
          stat_date: today,
          seminar_views: 1,
        });
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Record seminar view error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
