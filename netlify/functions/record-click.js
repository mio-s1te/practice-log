// netlify/functions/record-click.js
// クリック記録API

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { ref, campaign_id, product_id, landing_page, referrer, user_agent } = body;

    if (!ref) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'ref parameter required' }),
      };
    }

    // 紹介者確認
    const { data: affiliate, error: affError } = await supabase
      .from('affiliates')
      .select('id, affiliate_code, status')
      .eq('affiliate_code', ref)
      .single();

    if (affError || !affiliate) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Affiliate not found' }),
      };
    }

    if (affiliate.status === 'suspended') {
      // suspendedでもクリックは記録するがsuspicious_flagを立てる
      const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
      const ipHash = crypto.createHash('sha256').update(ip + 'salt').digest('hex').substring(0, 16);

      await supabase.from('clicks').insert({
        affiliate_id: affiliate.id,
        affiliate_code: ref,
        campaign_id: campaign_id || null,
        product_id: product_id || null,
        landing_page,
        referrer,
        user_agent,
        ip_hash: ipHash,
        suspicious_flag: true,
        suspicious_reason: 'suspended_affiliate_click',
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ click_id: null, suspicious: true }),
      };
    }

    // キャンペーン有効確認
    if (campaign_id) {
      const { data: campaign } = await supabase
        .from('affiliate_campaigns')
        .select('id, status')
        .eq('id', campaign_id)
        .single();

      if (campaign && campaign.status === 'ended') {
        // 停止中案件へのアクセス
        const { data: suspEvent } = await supabase.from('suspicious_events').insert({
          event_type: 'stopped_campaign_access',
          description: `停止中案件へのアクセス: campaign_id=${campaign_id}`,
          related_type: 'campaign',
          related_id: campaign_id,
          affiliate_id: affiliate.id,
          severity: 'low',
        }).select().single();
        
        console.log('suspicious event created:', suspEvent?.id);
      }
    }

    // IPハッシュ生成
    const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    const ipHash = crypto.createHash('sha256').update(ip + 'salt').digest('hex').substring(0, 16);

    // 不正チェック: 同じIPから短時間に大量クリック
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentClicks } = await supabase
      .from('clicks')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', oneHourAgo);

    const isSuspicious = (recentClicks || 0) >= 10;

    // クリック記録
    const { data: click, error: clickError } = await supabase
      .from('clicks')
      .insert({
        affiliate_id: affiliate.id,
        affiliate_code: ref,
        campaign_id: campaign_id || null,
        product_id: product_id || null,
        landing_page,
        referrer,
        user_agent,
        ip_hash: ipHash,
        suspicious_flag: isSuspicious,
        suspicious_reason: isSuspicious ? 'high_frequency_click' : null,
      })
      .select()
      .single();

    if (clickError) {
      console.error('Click insert error:', clickError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to record click' }),
      };
    }

    // 不正疑い記録
    if (isSuspicious) {
      await supabase.from('suspicious_events').insert({
        event_type: 'high_frequency_click',
        description: `同一IPから1時間以内に${(recentClicks || 0) + 1}クリック`,
        related_type: 'click',
        related_id: click.id,
        affiliate_id: affiliate.id,
        ip_hash: ipHash,
        user_agent,
        severity: 'medium',
      });
    }

    // デイリー統計更新
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('affiliate_daily_stats').upsert({
      affiliate_id: affiliate.id,
      stat_date: today,
      clicks: 1,
    }, {
      onConflict: 'affiliate_id,stat_date',
      ignoreDuplicates: false,
    }).then(async () => {
      // UPSERTでincrementを行う別クエリ
      await supabase.rpc('increment_daily_stat', {
        p_affiliate_id: affiliate.id,
        p_stat_date: today,
        p_field: 'clicks',
      }).catch(() => {
        // RPCが存在しない場合は無視
      });
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        click_id: click.id,
        affiliate_id: affiliate.id,
        affiliate_code: ref,
      }),
    };
  } catch (error) {
    console.error('Record click error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
